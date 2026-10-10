// Runs the real checkin-reminder, daily-report and weekly-badge handlers at a
// fixed instant and records the timestamp filters they send to the database,
// to prove the Haiti windows (not midnight UTC) reach the queries.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const PARENT = "11111111-1111-4111-8111-111111111111";

const state = vi.hoisted(() => ({ filters: [] as { table: string; op: string; col: string; val: unknown }[] }));

function table(name: string) {
  const rows: Record<string, unknown[]> = {
    students: [{ id: "s1", display_name: "Kid", parent_id: "11111111-1111-4111-8111-111111111111", language_pref: "en" }],
    subscriptions: [{ user_id: "11111111-1111-4111-8111-111111111111", status: "active", plan_key: "basic" }],
  };
  const result = { data: rows[name] ?? [], error: null };
  const b: Record<string, unknown> = {
    insert: async () => ({ error: null }),
    maybeSingle: async () => ({ data: (rows[name] ?? [])[0] ?? null, error: null }),
    then: (res: (v: unknown) => unknown) => res(result),
  };
  for (const op of ["select", "eq", "in", "order"]) b[op] = () => b;
  for (const op of ["gte", "lt", "lte"]) {
    b[op] = (col: string, val: unknown) => { state.filters.push({ table: name, op, col, val }); return b; };
  }
  return b;
}

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => ({
    from: table,
    // One recipient, so every handler reaches its timestamp queries.
    rpc: async () => ({ data: [{ user_id: "11111111-1111-4111-8111-111111111111", email: "p@x.test", kind: "parent", pref_token: "a".repeat(64), lang: "en" }], error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: "p@x.test" } } }) } },
  }),
}));

async function run(fn: string) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  vi.stubGlobal("Deno", {
    serve: (h: typeof handler) => { handler = h; },
    env: { get: (k: string) => ({ CRON_SECRET: "s", RESEND_API_KEY: "re", SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "k" })[k] },
  });
  vi.resetModules();
  await import(`../../../supabase/functions/${fn}/index.ts`);
  await handler!(new Request("http://x", { method: "POST", headers: { "x-cron-secret": "s" }, body: JSON.stringify({ only_parent_id: PARENT }) }));
  return state.filters;
}

const only = (table: string, col: string) =>
  state.filters.filter((f) => f.table === table && f.col === col).map((f) => `${f.op} ${f.val}`);

beforeEach(() => {
  state.filters = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "re_1" }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("check-in window (checkin-reminder, 14:00 UTC)", () => {
  it("summer: Haiti day 04:00Z..04:00Z, not 00:00Z..00:00Z", async () => {
    vi.setSystemTime(new Date("2026-07-15T14:00:00Z"));
    await run("checkin-reminder");
    expect(only("check_ins", "checked_in_at")).toEqual(["gte 2026-07-15T04:00:00.000Z", "lt 2026-07-16T04:00:00.000Z"]);
  });

  it("winter: Haiti day 05:00Z..05:00Z", async () => {
    vi.setSystemTime(new Date("2026-01-15T14:00:00Z"));
    await run("checkin-reminder");
    expect(only("check_ins", "checked_in_at")).toEqual(["gte 2026-01-15T05:00:00.000Z", "lt 2026-01-16T05:00:00.000Z"]);
  });
});

describe("daily report window (daily-report, 01:00 UTC = the previous evening in Haiti)", () => {
  it("summer: reports Jul 15 (Haiti), 04:00Z..04:00Z", async () => {
    vi.setSystemTime(new Date("2026-07-16T01:00:00Z"));
    await run("daily-report");
    expect(only("check_ins", "checked_in_at")).toEqual(["gte 2026-07-15T04:00:00.000Z", "lt 2026-07-16T04:00:00.000Z"]);
  });

  it("winter: reports Jan 15 (Haiti), 05:00Z..05:00Z", async () => {
    vi.setSystemTime(new Date("2026-01-16T01:00:00Z"));
    await run("daily-report");
    expect(only("check_ins", "checked_in_at")).toEqual(["gte 2026-01-15T05:00:00.000Z", "lt 2026-01-16T05:00:00.000Z"]);
  });
});

describe("weekly badge window (weekly-badge, Monday 02:00 UTC = Sunday night in Haiti)", () => {
  it("summer: planned_date Oct 5..11, points/achievements from Haiti Monday midnight", async () => {
    vi.setSystemTime(new Date("2026-10-12T02:00:00Z"));
    await run("weekly-badge");
    expect(only("daily_plan", "planned_date")).toEqual(["gte 2026-10-05", "lte 2026-10-11"]);
    expect(only("reward_points", "awarded_at")).toEqual(["gte 2026-10-05T04:00:00.000Z", "lt 2026-10-12T04:00:00.000Z"]);
    expect(only("achievements", "earned_at")).toEqual(["gte 2026-10-05T04:00:00.000Z", "lt 2026-10-12T04:00:00.000Z"]);
  });

  it("winter: points window 05:00Z..05:00Z", async () => {
    vi.setSystemTime(new Date("2026-01-12T02:00:00Z"));
    await run("weekly-badge");
    expect(only("reward_points", "awarded_at")).toEqual(["gte 2026-01-05T05:00:00.000Z", "lt 2026-01-12T05:00:00.000Z"]);
  });
});
