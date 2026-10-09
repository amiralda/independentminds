// Runs the real handlers of the four notification functions against a fake
// Supabase client + fake Resend, to check that every recipient returned by
// notify_recipients_for_parent() is emailed and logged with its recipient_id,
// that a failed lookup falls back to the parent alone, and that
// {"only_parent_id"} limits a manual run to one family.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const PARENT = "11111111-1111-4111-8111-111111111111";
const GUARDIAN = "22222222-2222-4222-8222-222222222222";
const OTHER_PARENT = "33333333-3333-4333-8333-333333333333";

interface FakeState {
  rpc: { data: unknown; error: { message: string } | null };
  rpcCalls: string[];
  logs: Record<string, unknown>[];
}

const state = vi.hoisted(() => ({ current: null as FakeState | null }));

// Chainable query builder: every filter returns the builder; awaiting it
// resolves to the table's rows, maybeSingle() to the first row.
function table(name: string) {
  const rows: Record<string, unknown[]> = {
    students: [
      { id: "s1", display_name: "Kid", parent_id: PARENT, language_pref: "en" },
      { id: "s2", display_name: "Other", parent_id: OTHER_PARENT, language_pref: "en" },
    ],
    subscriptions: [
      { user_id: PARENT, status: "active", plan_key: "basic" },
      { user_id: OTHER_PARENT, status: "active", plan_key: "basic" },
    ],
    daily_plan: [{ subject: "Math", title: "Fractions", status: "done" }],
  };
  const result = { data: rows[name] ?? [], error: null };
  const builder: Record<string, unknown> = {
    insert: async (row: Record<string, unknown>) => {
      if (name === "messages_log") state.current!.logs.push(row);
      return { data: null, error: null };
    },
    maybeSingle: async () => ({ data: (rows[name] ?? [])[0] ?? null, error: null }),
    then: (resolve: (v: typeof result) => unknown) => resolve(result),
  };
  for (const m of ["select", "eq", "in", "gte", "lt", "lte", "order"]) builder[m] = () => builder;
  return builder;
}

vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({
  createClient: () => ({
    from: table,
    rpc: async (fn: string, args: { p_parent_id: string }) => {
      state.current!.rpcCalls.push(`${fn}:${args.p_parent_id}`);
      return state.current!.rpc;
    },
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: { id, email: `${id.slice(0, 4)}@parent.test` } } }),
      },
    },
  }),
}));

const FUNCTIONS = [
  ["morning-reminder", "morning_reminder"],
  ["checkin-reminder", "checkin_reminder"],
  ["daily-report", "daily_report"],
  ["weekly-badge", "weekly_badge"],
] as const;

let sentTo: string[];

async function loadHandler(fn: string) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  vi.stubGlobal("Deno", {
    serve: (h: typeof handler) => {
      handler = h;
    },
    env: { get: (k: string) => ({ CRON_SECRET: "s3cret", RESEND_API_KEY: "re_test", SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "k" })[k] },
  });
  vi.resetModules();
  await import(`../../../supabase/functions/${fn}/index.ts`);
  return handler!;
}

const call = (handler: (req: Request) => Promise<Response>, body: unknown = {}) =>
  handler(new Request("http://x", { method: "POST", headers: { "x-cron-secret": "s3cret" }, body: JSON.stringify(body) }));

beforeEach(() => {
  sentTo = [];
  state.current = {
    rpc: {
      data: [
        { user_id: PARENT, email: "parent@family.test", kind: "parent" },
        { user_id: GUARDIAN, email: "guardian@family.test", kind: "co_guardian" },
      ],
      error: null,
    },
    rpcCalls: [],
    logs: [],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      sentTo.push(...(JSON.parse(String(init.body)).to as string[]));
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    }),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each(FUNCTIONS)("%s", (fn, messageType) => {
  it("emails the parent and every co-guardian, logging each recipient_id", async () => {
    const handler = await loadHandler(fn);
    const res = await call(handler, { only_parent_id: PARENT });
    const body = await res.json();

    expect(body.sent).toBe(2);
    expect(sentTo).toEqual(["parent@family.test", "guardian@family.test"]);
    expect(state.current!.logs).toEqual([
      { parent_id: PARENT, recipient_id: PARENT, channel: "email", message_type: messageType, status: "sent" },
      { parent_id: PARENT, recipient_id: GUARDIAN, channel: "email", message_type: messageType, status: "sent" },
    ]);
  });

  it("falls back to the parent alone when the recipient lookup fails", async () => {
    state.current!.rpc = { data: null, error: { message: "boom" } };
    const handler = await loadHandler(fn);
    const body = await (await call(handler, { only_parent_id: PARENT })).json();

    expect(body.sent).toBe(1);
    expect(sentTo).toEqual([`${PARENT.slice(0, 4)}@parent.test`]);
    expect(state.current!.logs).toHaveLength(1);
    expect(state.current!.logs[0]).toMatchObject({ parent_id: PARENT, recipient_id: PARENT, status: "sent" });
  });

  it("skips a family whose lookup returns nobody (deleted/banned)", async () => {
    state.current!.rpc = { data: [], error: null };
    const handler = await loadHandler(fn);
    const body = await (await call(handler, { only_parent_id: PARENT })).json();

    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(sentTo).toEqual([]);
  });

  it("only_parent_id limits a manual run to one family; '{}' (cron) covers all", async () => {
    const handler = await loadHandler(fn);
    await call(handler, { only_parent_id: PARENT });
    expect(state.current!.rpcCalls).toEqual([`notify_recipients_for_parent:${PARENT}`]);

    state.current!.rpcCalls = [];
    await call(handler, {});
    expect(state.current!.rpcCalls).toEqual([
      `notify_recipients_for_parent:${PARENT}`,
      `notify_recipients_for_parent:${OTHER_PARENT}`,
    ]);
  });

  it("ignores a malformed only_parent_id (runs for everyone, like the cron)", async () => {
    const handler = await loadHandler(fn);
    await call(handler, { only_parent_id: "not-a-uuid" });
    expect(state.current!.rpcCalls).toHaveLength(2);
  });

  it("still rejects calls without the cron secret", async () => {
    const handler = await loadHandler(fn);
    const res = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ only_parent_id: PARENT }) }));
    expect(res.status).toBe(401);
    expect(sentTo).toEqual([]);
  });
});
