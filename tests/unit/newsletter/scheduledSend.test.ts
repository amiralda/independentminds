// Runs the real send-newsletter-campaign handler against a fake Supabase
// client + fake Resend: the weekly cron path (x-cron-secret) and the
// unchanged admin path. Records every DB write, RPC and email so each test can
// assert that a refused run wrote and sent NOTHING.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from "vitest";

type Row = { campaign: string; language: string; title: string; content: string; status: string; scheduled_for: string | null };

const state = vi.hoisted(() => ({
  drafts: [] as Row[],
  recipients: [] as { user_id: string; email: string; language: string }[],
  alreadySent: [] as string[],
  suppressed: [] as string[],
  isAdmin: false,
  user: null as { id: string } | null,
  writes: [] as { table: string; op: string; data: unknown; filters: Record<string, unknown> }[],
  rpcs: [] as string[],
  selects: [] as { table: string; filters: Record<string, unknown> }[],
}));

function builder(table: string) {
  const filters: Record<string, unknown> = {};
  let op: "select" | "update" = "select";
  let payload: unknown = null;
  const resolve = () => {
    if (op === "update") {
      state.writes.push({ table, op: "update", data: payload, filters: { ...filters } });
      return { data: null, error: null };
    }
    state.selects.push({ table, filters: { ...filters } });
    if (table === "email_newsletter_drafts") {
      const rows = state.drafts.filter((r) =>
        Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v));
      return { data: rows, error: null };
    }
    if (table === "newsletter_sends") return { data: state.alreadySent.map((user_id) => ({ user_id })), error: null };
    if (table === "suppressed_emails") return { data: state.suppressed.map((email) => ({ email })), error: null };
    return { data: [], error: null };
  };
  const b: Record<string, unknown> = {
    select: () => b,
    eq: (k: string, v: unknown) => { filters[k] = v; return b; },
    in: (k: string, v: unknown) => { filters[k] = v; return b; },
    update: (d: unknown) => { op = "update"; payload = d; return b; },
    upsert: async (d: unknown) => { state.writes.push({ table, op: "upsert", data: d, filters: {} }); return { error: null }; },
    insert: async (d: unknown) => { state.writes.push({ table, op: "insert", data: d, filters: {} }); return { error: null }; },
    then: (res: (v: unknown) => unknown) => res(resolve()),
  };
  return b;
}

vi.mock("https://esm.sh/@supabase/supabase-js@2.49.4", () => ({
  createClient: (_url: string, key: string) => {
    if (key === "anon-key") return { auth: { getUser: async () => ({ data: { user: state.user } }) } };
    return {
      from: builder,
      rpc: async (fn: string, args: Record<string, unknown>) => {
        state.rpcs.push(fn);
        if (fn === "has_role") return { data: state.isAdmin, error: null };
        if (fn === "newsletter_recipients") return { data: state.recipients, error: null };
        if (fn === "newsletter_unsubscribe_token") return { data: `tok-${args.p_user_id}`, error: null };
        return { data: null, error: { message: `unexpected rpc ${fn}` } };
      },
    };
  },
}));

let handler: (req: Request) => Promise<Response>;
let mod: typeof import("../../../supabase/functions/send-newsletter-campaign/index");
let emails: { to: string; from: string; idempotencyKey: string | null }[];

beforeAll(async () => {
  vi.stubGlobal("Deno", {
    serve: (h: typeof handler) => { handler = h; },
    env: {
      get: (k: string) => ({
        SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "service-key", SUPABASE_ANON_KEY: "anon-key",
        RESEND_API_KEY: "re_test", CRON_SECRET: "right-secret",
      })[k],
    },
  });
  mod = await import("../../../supabase/functions/send-newsletter-campaign/index");
});
afterAll(() => vi.unstubAllGlobals());

const CAMPAIGN = "co-guardians-2026-10";
const version = (language: string, status: string, scheduled_for: string | null = "2026-10-10"): Row =>
  ({ campaign: CAMPAIGN, language, title: `T-${language}`, content: "Hello", status, scheduled_for });

beforeEach(() => {
  state.drafts = [version("EN", "pending_approval"), version("HT", "pending_approval")];
  state.recipients = [
    { user_id: "u1", email: "parent1@test.dev", language: "en" },
    { user_id: "u2", email: "parent2@test.dev", language: "ht" },
  ];
  state.alreadySent = [];
  state.suppressed = [];
  state.isAdmin = false;
  state.user = null;
  state.writes = [];
  state.rpcs = [];
  state.selects = [];
  emails = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const h = init.headers as Record<string, string>;
    const b = JSON.parse(String(init.body));
    emails.push({ to: b.to[0], from: b.from, idempotencyKey: h["Idempotency-Key"] ?? null });
    return new Response(JSON.stringify({ id: `re_${emails.length}` }), { status: 200 });
  }));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Saturday 2026-10-10, 19:00 UTC = 15:00 in New York (EDT): the cron's slot.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T19:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const cron = (secret: string, body: unknown = {}) =>
  handler(new Request("http://fn", { method: "POST", headers: { "x-cron-secret": secret, "Content-Type": "application/json" }, body: JSON.stringify(body) }));
const admin = (body: unknown, bearer = "Bearer admin-jwt") =>
  handler(new Request("http://fn", { method: "POST", headers: { Authorization: bearer, "Content-Type": "application/json" }, body: JSON.stringify(body) }));

const nothingHappened = () => {
  expect(state.writes).toEqual([]);
  expect(emails).toEqual([]);
  expect(state.rpcs).not.toContain("newsletter_unsubscribe_token");
};

describe("(a) wrong cron secret", () => {
  it("is 401 and touches nothing", async () => {
    const res = await cron("wrong-secret");
    expect(res.status).toBe(401);
    expect(state.selects).toEqual([]);
    expect(state.rpcs).toEqual([]);
    nothingHappened();
  });

  it("never falls through to the admin path, even with a valid admin JWT", async () => {
    state.user = { id: "admin-1" };
    state.isAdmin = true;
    const res = await handler(new Request("http://fn", {
      method: "POST",
      headers: { "x-cron-secret": "wrong-secret", Authorization: "Bearer admin-jwt", "Content-Type": "application/json" },
      body: JSON.stringify({ campaign: CAMPAIGN, mode: "dry_run" }),
    }));
    expect(res.status).toBe(401);
    expect(state.rpcs).toEqual([]);
    nothingHappened();
  });

  it("an empty secret header is also 401", async () => {
    expect((await cron("")).status).toBe(401);
  });
});

describe("(b) right secret, no campaign for today", () => {
  it("200, 0 sent, reason, nothing written", async () => {
    vi.setSystemTime(new Date("2026-10-17T19:00:00Z")); // next Saturday: nothing scheduled
    const res = await cron("right-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ mode: "scheduled", date: "2026-10-17", sent: 0, reason: "no_campaign_today" });
    nothingHappened();
  });
});

describe("(c) right secret, campaign for today still pending_approval", () => {
  it("200, 0 sent, not_approved, nothing written", async () => {
    const res = await cron("right-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      date: "2026-10-10", sent: 0, reason: "not_approved", campaign: CAMPAIGN,
      statuses: ["EN:pending_approval", "HT:pending_approval"],
    });
    nothingHappened();
  });

  it("one version approved, one pending: still nothing", async () => {
    state.drafts = [version("EN", "approved"), version("HT", "pending_approval")];
    expect(await (await cron("right-secret")).json()).toMatchObject({ sent: 0, reason: "not_approved" });
    nothingHappened();
  });

  it("a version scheduled for another day: nothing (date_mismatch)", async () => {
    state.drafts = [version("EN", "approved"), version("HT", "approved", "2026-10-17")];
    expect(await (await cron("right-secret")).json()).toMatchObject({ sent: 0, reason: "date_mismatch" });
    nothingHappened();
  });

  it("two campaigns on the same date: nothing, error logged", async () => {
    state.drafts = [version("EN", "approved"), { ...version("EN", "approved"), campaign: "other-2026-10" }];
    const body = await (await cron("right-secret")).json();
    expect(body).toMatchObject({ sent: 0, reason: "multiple_campaigns" });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("2 campaigns on the same date"));
    nothingHappened();
  });

  it("already sent: nothing", async () => {
    state.drafts = [version("EN", "sent"), version("HT", "sent")];
    expect(await (await cron("right-secret")).json()).toMatchObject({ sent: 0, reason: "already_sent" });
    nothingHappened();
  });
});

describe("New York date via Intl", () => {
  it("Saturday 22:00 EDT (Sunday 02:00 UTC) is still the 10th in New York", async () => {
    vi.setSystemTime(new Date("2026-10-11T02:00:00Z"));
    expect(mod.newYorkToday()).toBe("2026-10-10");
    await cron("right-secret");
    expect(state.selects[0].filters).toEqual({ scheduled_for: "2026-10-10" });
  });

  it("follows DST: 04:30 UTC is the previous day in EDT, and the same day in EST", () => {
    expect(mod.newYorkToday(new Date("2026-10-10T03:30:00Z"))).toBe("2026-10-09"); // 23:30 EDT
    expect(mod.newYorkToday(new Date("2026-12-12T04:30:00Z"))).toBe("2026-12-11"); // 23:30 EST
    expect(mod.newYorkToday(new Date("2026-12-12T05:30:00Z"))).toBe("2026-12-12"); // 00:30 EST
  });
});

describe("scheduled send when everything is approved (the rest unchanged)", () => {
  it("sends once per person, skips already-sent and suppressed, Idempotency-Key, marks 'sent'", async () => {
    state.drafts = [version("EN", "approved"), version("HT", "approved")];
    state.recipients.push({ user_id: "u3", email: "done@test.dev", language: "en" }, { user_id: "u4", email: "gone@test.dev", language: "en" });
    state.alreadySent = ["u3"];
    state.suppressed = ["gone@test.dev"];

    const body = await (await cron("right-secret")).json();
    expect(body).toMatchObject({ mode: "send", trigger: "scheduled", campaign: CAMPAIGN, sent: 2, failed: 0, skipped_already_sent: 1, skipped_suppressed: 1, marked_sent: true });
    expect(emails).toEqual([
      { to: "parent1@test.dev", from: "Independent Minds Edu News <hello@independentmindsedu.org>", idempotencyKey: `newsletter/${CAMPAIGN}/u1` },
      { to: "parent2@test.dev", from: "Independent Minds Edu News <hello@independentmindsedu.org>", idempotencyKey: `newsletter/${CAMPAIGN}/u2` },
    ]);
    const upserts = state.writes.filter((w) => w.table === "newsletter_sends");
    expect(upserts).toHaveLength(2);
    expect(upserts.every((w) => (w.data as { sent_by: unknown }).sent_by === null)).toBe(true);
    expect(state.writes.at(-1)).toEqual({ table: "email_newsletter_drafts", op: "update", data: { status: "sent" }, filters: { campaign: CAMPAIGN } });
  });
});

describe("check_date (evaluation only)", () => {
  it("returns the dry-run plan and never sends or writes, even when approved", async () => {
    state.drafts = [version("EN", "approved"), version("HT", "approved")];
    const body = await (await cron("right-secret", { check_date: "2026-10-10" })).json();
    expect(body).toMatchObject({ mode: "dry_run", campaign: CAMPAIGN, recipients: 2 });
    nothingHappened();
  });

  it("reports the reason for a pending campaign on that date", async () => {
    vi.setSystemTime(new Date("2026-10-09T19:13:00Z"));
    const body = await (await cron("right-secret", { check_date: "2026-10-10" })).json();
    expect(body).toMatchObject({ evaluate_only: true, date: "2026-10-10", sent: 0, reason: "not_approved" });
    nothingHappened();
  });

  it("rejects a malformed date", async () => {
    expect((await cron("right-secret", { check_date: "tomorrow" })).status).toBe(400);
    nothingHappened();
  });
});

describe("(d) the manual admin path is unchanged", () => {
  it("dry_run works for an admin and writes nothing", async () => {
    state.user = { id: "admin-1" };
    state.isAdmin = true;
    const res = await admin({ campaign: CAMPAIGN, mode: "dry_run" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      mode: "dry_run", campaign: CAMPAIGN, approved: false, statuses: ["EN:pending_approval", "HT:pending_approval"],
      recipients: 2, by_language: { EN: 1, HT: 1 },
    });
    nothingHappened();
  });

  it("no token -> 401, not an admin -> 403", async () => {
    expect((await handler(new Request("http://fn", { method: "POST", body: "{}" }))).status).toBe(401);
    state.user = { id: "parent-1" };
    expect((await admin({ campaign: CAMPAIGN, mode: "dry_run" })).status).toBe(403);
    nothingHappened();
  });

  it("manual send still refuses unapproved campaigns and still needs confirm", async () => {
    state.user = { id: "admin-1" };
    state.isAdmin = true;
    expect((await admin({ campaign: CAMPAIGN, mode: "send", confirm: CAMPAIGN })).status).toBe(409);
    state.drafts = [version("EN", "approved"), version("HT", "approved")];
    expect((await admin({ campaign: CAMPAIGN, mode: "send" })).status).toBe(400);
    nothingHappened();
  });
});
