// Runs the real handlers of the four notification functions against a fake
// Supabase client + fake Resend, to check that every recipient returned by
// notify_recipients_for_parent() is emailed and logged with its recipient_id,
// that a failed lookup falls back to the parent alone, and that
// {"only_parent_id"} limits a manual run to one family. Also checks the
// per-recipient preferences footer + List-Unsubscribe (own token, own
// language) and that the RPC is asked for this function's category.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const PARENT = "11111111-1111-4111-8111-111111111111";
const GUARDIAN = "22222222-2222-4222-8222-222222222222";
const OTHER_PARENT = "33333333-3333-4333-8333-333333333333";
const PARENT_TOKEN = "a".repeat(64);
const GUARDIAN_TOKEN = "b".repeat(64);

interface FakeState {
  rpc: { data: unknown; error: { message: string } | null };
  rpcCalls: string[];
  rpcArgs: Record<string, unknown>[];
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
      state.current!.rpcArgs.push(args);
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
let sentBodies: { to: string[]; html: string; headers?: Record<string, string> }[];

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
  sentBodies = [];
  state.current = {
    rpc: {
      data: [
        { user_id: PARENT, email: "parent@family.test", kind: "parent", pref_token: PARENT_TOKEN, lang: "en" },
        { user_id: GUARDIAN, email: "guardian@family.test", kind: "co_guardian", pref_token: GUARDIAN_TOKEN, lang: "ht" },
      ],
      error: null,
    },
    rpcCalls: [],
    rpcArgs: [],
    logs: [],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      sentTo.push(...(body.to as string[]));
      sentBodies.push(body);
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

  it("asks the RPC for this function's category (paused/stopped people are filtered there)", async () => {
    const handler = await loadHandler(fn);
    await call(handler, { only_parent_id: PARENT });
    expect(state.current!.rpcArgs).toEqual([{ p_parent_id: PARENT, p_category: messageType }]);
  });

  it("gives each recipient their own footer link, language and List-Unsubscribe for this category", async () => {
    const handler = await loadHandler(fn);
    await call(handler, { only_parent_id: PARENT });
    const [toParent, toGuardian] = sentBodies;

    expect(toParent.html).toContain(`notifications?token=${PARENT_TOKEN}&amp;lang=en&amp;category=${messageType}`);
    expect(toParent.html).toContain("as the parent of Kid");
    expect(toParent.html).not.toContain(GUARDIAN_TOKEN);
    expect(toParent.headers).toEqual({
      "List-Unsubscribe": `<https://gyvjcwuwfwrwwwnuwlex.supabase.co/functions/v1/notification-preferences?token=${PARENT_TOKEN}&category=${messageType}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });

    expect(toGuardian.html).toContain(`notifications?token=${GUARDIAN_TOKEN}&amp;lang=ht&amp;category=${messageType}`);
    expect(toGuardian.html).toContain("ko-gadyen Kid");
    expect(toGuardian.html).not.toContain(PARENT_TOKEN);
    expect(toGuardian.headers?.["List-Unsubscribe"]).toContain(GUARDIAN_TOKEN);
  });

  it("on the parent-only fallback: no token, so no List-Unsubscribe and an account link instead", async () => {
    state.current!.rpc = { data: null, error: { message: "boom" } };
    const handler = await loadHandler(fn);
    await call(handler, { only_parent_id: PARENT });
    expect(sentBodies).toHaveLength(1);
    expect(sentBodies[0].headers).toBeUndefined();
    expect(sentBodies[0].html).not.toContain("/notifications");
    expect(sentBodies[0].html).toContain("https://www.independentmindsedu.org/login");
  });

  it("still rejects calls without the cron secret", async () => {
    const handler = await loadHandler(fn);
    const res = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ only_parent_id: PARENT }) }));
    expect(res.status).toBe(401);
    expect(sentTo).toEqual([]);
  });
});
