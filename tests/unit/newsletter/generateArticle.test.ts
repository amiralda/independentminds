// Runs the real `generate-article` handler against a fake Supabase client and
// a mocked gpt-4.1: admin gate, campaign/date validation, 409 on an existing
// campaign, skipped translations, pending_approval only, no row touched.
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  forbidden: [] as string[], // update / delete / upsert calls (must stay empty)
  isAdmin: true,
  user: { id: "admin-1" } as { id: string } | null,
}));

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: db.user }, error: db.user ? null : { message: "bad" } }) },
    from: (table: string) => {
      const filters: [string, unknown][] = [];
      const match = () => db.rows.filter((r) => filters.every(([k, v]) => r[k] === v));
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => {
          filters.push([k, v]);
          return q;
        },
        limit: async () => ({ data: match(), error: null }),
        maybeSingle: async () => {
          if (table === "user_roles") return { data: db.isAdmin ? { role: "admin" } : null, error: null };
          return { data: match()[0] ?? null, error: null };
        },
        insert: async (row: Row) => {
          if (db.rows.some((r) => r.campaign === row.campaign && r.language === row.language)) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          db.inserts.push(row);
          db.rows.push({ ...row });
          return { error: null };
        },
        update: () => { db.forbidden.push("update"); return q; },
        delete: () => { db.forbidden.push("delete"); return q; },
        upsert: () => { db.forbidden.push("upsert"); return q; },
      };
      return q;
    },
  }),
}));

let handler: (req: Request) => Promise<Response>;
const ai = { calls: [] as { system: string; user: string }[], fail: new Set<string>(), reply: null as null | { title: string; content: string } };

beforeAll(async () => {
  vi.stubGlobal("Deno", {
    serve: (h: typeof handler) => {
      handler = h;
    },
    env: {
      get: (k: string) =>
        ({
          SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "svc", SUPABASE_ANON_KEY: "anon",
          AI_GATEWAY_URL: "https://ai.test", AI_GATEWAY_API_KEY: "key",
        })[k],
    },
  });
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const system = body.messages[0].content as string;
    const user = body.messages[1].content as string;
    ai.calls.push({ system, user });
    const lang = /from English into (.+?)\.\n/.exec(system)?.[1] ?? "English";
    if ([...ai.fail].some((f) => lang.startsWith(f))) return new Response("boom", { status: 502 });
    const content = JSON.stringify(ai.reply ?? { title: `Title (${lang})`, content: `## Section\n\nBody in ${lang}` });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  });
  await import("../../../supabase/functions/generate-article/index");
});

afterAll(() => vi.unstubAllGlobals());

// A Saturday safely in the future, and the Tuesday before it.
const SAT = "2099-01-03";
const TUE = "2098-12-30";

beforeEach(() => {
  db.rows = [
    // Approved article that must stay untouched.
    { campaign: "homeschool-trends-2026-10", language: "EN", title: "Trends", content: "x", status: "approved", scheduled_for: "2026-10-17" },
    { campaign: "homeschool-trends-2026-10", language: "FR", title: "Tendances", content: "x", status: "approved", scheduled_for: "2026-10-17" },
  ];
  db.inserts = [];
  db.forbidden = [];
  db.isAdmin = true;
  db.user = { id: "admin-1" };
  ai.calls = [];
  ai.fail = new Set();
  ai.reply = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

const call = (body: unknown, auth = "Bearer token") =>
  handler(new Request("https://fn.test/generate-article", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  }));

const draft = (over: Record<string, unknown> = {}) =>
  call({ action: "draft", topic: "Building a daily routine", scheduled_for: SAT, campaign: "daily-routine-2099-01", ...over });

describe("auth", () => {
  it("401 without a token, 403 for a non-admin; nothing written", async () => {
    expect((await call({ action: "draft" }, "")).status).toBe(401);
    db.user = null;
    expect((await draft()).status).toBe(401);
    db.user = { id: "parent-1" };
    db.isAdmin = false;
    expect((await draft()).status).toBe(403);
    expect(db.inserts).toEqual([]);
    expect(ai.calls).toEqual([]);
  });
});

describe("draft", () => {
  it("writes the EN row as pending_approval with the date and returns it", async () => {
    const res = await draft();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ campaign: "daily-routine-2099-01", title: "Title (English)", content: "## Section\n\nBody in English" });
    expect(db.inserts).toEqual([{
      campaign: "daily-routine-2099-01", language: "EN", title: "Title (English)",
      content: "## Section\n\nBody in English", status: "pending_approval", scheduled_for: SAT,
    }]);
    expect(ai.calls[0].system).toContain("WHAT DOES NOT EXIST");
    expect(ai.calls[0].system).toMatch(/NEVER invent statistics/);
    expect(ai.calls[0].user).toContain("Building a daily routine");
  });

  it("409 on an existing campaign: no AI call, no row touched", async () => {
    const before = JSON.stringify(db.rows);
    const res = await draft({ campaign: "homeschool-trends-2026-10" });
    expect(res.status).toBe(409);
    expect(ai.calls).toEqual([]);
    expect(db.inserts).toEqual([]);
    expect(JSON.stringify(db.rows)).toBe(before);
    expect(db.forbidden).toEqual([]);
  });

  it("refuses a Tuesday and proposes the nearest Saturday", async () => {
    const res = await draft({ scheduled_for: TUE });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.reason).toBe("not_saturday");
    expect(body.suggestion).toBe("2098-12-27"); // Tuesday 30 → Saturday 27 is 3 days away, Saturday Jan 3 is 4
    expect(body.error).toContain("2098-12-27");
    expect(db.inserts).toEqual([]);
  });

  it("refuses a date in the past", async () => {
    const res = await draft({ scheduled_for: "2020-01-04" });
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe("past");
  });

  it("refuses an invalid campaign", async () => {
    for (const campaign of ["ab", "Has Caps", "x".repeat(61), "émoji-✓"]) {
      expect((await draft({ campaign })).status).toBe(400);
    }
    expect(db.inserts).toEqual([]);
  });

  it("drops a leading H1 the model may add", async () => {
    ai.reply = { title: "T", content: "# T\n\n## A\n\nb" };
    await draft();
    expect(db.inserts[0].content).toBe("## A\n\nb");
  });
});

describe("translate", () => {
  beforeEach(() => {
    db.rows.push({ campaign: "daily-routine-2099-01", language: "EN", title: "Routine", content: "## A\n\nb", status: "pending_approval", scheduled_for: SAT });
  });

  it("inserts the language as pending_approval with the EN date", async () => {
    const res = await call({ action: "translate", campaign: "daily-routine-2099-01", language: "HT" });
    expect(res.status).toBe(200);
    expect(db.inserts).toEqual([{
      campaign: "daily-routine-2099-01", language: "HT", title: "Title (Haitian Creole (Kreyòl Ayisyen))",
      content: "## Section\n\nBody in Haitian Creole (Kreyòl Ayisyen)", status: "pending_approval", scheduled_for: SAT,
    }]);
    expect(ai.calls[0].system).toContain("m ap, w ap, l ap");
    expect(JSON.parse(ai.calls[0].user)).toEqual({ title: "Routine", content: "## A\n\nb" });
  });

  it("a language that already exists → skipped, no second insert, no AI call", async () => {
    await call({ action: "translate", campaign: "daily-routine-2099-01", language: "FR" });
    ai.calls = [];
    const res = await call({ action: "translate", campaign: "daily-routine-2099-01", language: "FR" });
    expect(await res.json()).toEqual({ skipped: true });
    expect(db.inserts.filter((r) => r.language === "FR")).toHaveLength(1);
    expect(ai.calls).toEqual([]);
  });

  it("404 without the EN row", async () => {
    expect((await call({ action: "translate", campaign: "nothing-here", language: "ES" })).status).toBe(404);
  });

  it("never adds a language to an approved article", async () => {
    const res = await call({ action: "translate", campaign: "homeschool-trends-2026-10", language: "ES" });
    expect(res.status).toBe(409);
    expect(db.inserts).toEqual([]);
    expect(ai.calls).toEqual([]);
  });

  it("refuses EN or an unknown language", async () => {
    for (const language of ["EN", "XX", "ht"]) {
      expect((await call({ action: "translate", campaign: "daily-routine-2099-01", language })).status).toBe(400);
    }
  });

  it("one failing language does not affect the others", async () => {
    ai.fail.add("German");
    const results: Record<string, number> = {};
    for (const language of ["FR", "DE", "ES"]) {
      results[language] = (await call({ action: "translate", campaign: "daily-routine-2099-01", language })).status;
    }
    expect(results).toEqual({ FR: 200, DE: 500, ES: 200 });
    expect(db.inserts.map((r) => r.language)).toEqual(["FR", "ES"]);
  });

  it("every row created is pending_approval and nothing is updated or deleted", async () => {
    await draft({ campaign: "other-topic-2099-01" });
    for (const language of ["HT", "AR", "JA"]) await call({ action: "translate", campaign: "other-topic-2099-01", language });
    expect(db.inserts).toHaveLength(4);
    expect(db.inserts.every((r) => r.status === "pending_approval")).toBe(true);
    expect(db.forbidden).toEqual([]);
  });

  it("never logs the topic or the AI's text", async () => {
    ai.fail.add("English");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await draft({ campaign: "secret-topic-2099-01", topic: "SECRET-TOPIC-TEXT" });
    expect(JSON.stringify(err.mock.calls)).not.toContain("SECRET-TOPIC-TEXT");
    expect(JSON.stringify(err.mock.calls)).not.toContain("boom");
  });
});
