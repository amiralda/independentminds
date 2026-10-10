// Runs the real `notification-preferences` handler against a fake Supabase
// client: GET never changes anything, POST paths, RFC 8058 one-click, and the
// single 404 for every kind of bad token.
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";

const TOKEN = "ab".repeat(32);

const state = vi.hoisted(() => ({
  calls: [] as Record<string, unknown>[],
  result: null as { data: unknown; error: { code: string; message: string } | null } | null,
}));

vi.mock("https://esm.sh/@supabase/supabase-js@2.49.4", () => ({
  createClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, ...args });
      return state.result!;
    },
  }),
}));

let handler: (req: Request) => Promise<Response>;
let mod: typeof import("../../../supabase/functions/notification-preferences/index");

beforeAll(async () => {
  vi.stubGlobal("Deno", {
    serve: (h: typeof handler) => {
      handler = h;
    },
    env: { get: (k: string) => ({ SUPABASE_URL: "http://x", SUPABASE_SERVICE_ROLE_KEY: "k" })[k] },
  });
  mod = await import("../../../supabase/functions/notification-preferences/index");
});

afterAll(() => vi.unstubAllGlobals());

beforeEach(() => {
  state.calls = [];
  state.result = { data: { email: "julna@gmail.com", prefs: [] }, error: null };
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const BASE = "https://fn.test/notification-preferences";
const post = (body: unknown, query = "") =>
  handler(new Request(`${BASE}${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

// A date `days` after today on the Haiti calendar.
const haitiPlus = (days: number) => {
  const [y, m, d] = mod.haitiToday().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

describe("GET", () => {
  it("redirects to the www page and never calls the database", async () => {
    const res = await handler(new Request(`${BASE}?token=${TOKEN}&category=daily_report&lang=ht`));
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      `https://www.independentmindsedu.org/notifications?token=${TOKEN}&lang=ht&category=daily_report`,
    );
    expect(state.calls).toEqual([]);
  });

  it("drops a malformed token/category/lang instead of forwarding it", async () => {
    const res = await handler(new Request(`${BASE}?token=<x>&category=evil&lang=zz`));
    expect(res.headers.get("Location")).toBe("https://www.independentmindsedu.org/notifications");
    expect(state.calls).toEqual([]);
  });
});

describe("POST", () => {
  it("reads without changing anything when no category is given", async () => {
    const res = await post({ token: TOKEN });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", email: "j•••@gmail.com", prefs: [] });
    expect(state.calls).toEqual([
      { fn: "apply_notification_token_action", p_token: TOKEN, p_category: null, p_state: null, p_paused_until: null },
    ]);
  });

  it("applies off / on for a category", async () => {
    await post({ token: TOKEN, category: "morning_reminder", state: "off" });
    expect(state.calls[0]).toMatchObject({ p_category: "morning_reminder", p_state: "off", p_paused_until: null });
  });

  it("accepts a pause that resumes between tomorrow and +90 days (Haiti)", async () => {
    const res = await post({ token: TOKEN, category: "daily_report", state: "paused", paused_until: haitiPlus(7) });
    expect(res.status).toBe(200);
    expect(state.calls[0]).toMatchObject({ p_state: "paused", p_paused_until: haitiPlus(7) });
  });

  it.each([
    ["today", () => haitiPlus(0)],
    ["+91 days", () => haitiPlus(91)],
    ["not a date", () => "soon"],
    ["impossible date", () => "2026-02-30"],
    ["missing", () => undefined],
  ])("rejects a pause resuming %s without calling the database", async (_label, date) => {
    const res = await post({ token: TOKEN, category: "daily_report", state: "paused", paused_until: date() });
    expect(res.status).toBe(400);
    expect(state.calls).toEqual([]);
  });

  it("rejects an unknown category or state", async () => {
    expect((await post({ token: TOKEN, category: "password_reset", state: "off" })).status).toBe(400);
    expect((await post({ token: TOKEN, category: "daily_report", state: "maybe" })).status).toBe(400);
    expect((await post({ token: TOKEN, category: "daily_report" })).status).toBe(400);
    expect(state.calls).toEqual([]);
  });

  it("returns the same 404 for a malformed, unknown or deleted token", async () => {
    const malformed = await post({ token: "short" });
    state.result = { data: null, error: { code: "28000", message: "invalid token" } };
    const unknown = await post({ token: TOKEN });
    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(await malformed.json()).toEqual({ status: "invalid" });
    expect(await unknown.json()).toEqual({ status: "invalid" });
  });

  it("maps database validation errors to 400 and anything else to 500", async () => {
    state.result = { data: null, error: { code: "22023", message: "invalid state" } };
    expect((await post({ token: TOKEN, category: "daily_report", state: "off" })).status).toBe(400);
    state.result = { data: null, error: { code: "XX000", message: "boom" } };
    expect((await post({ token: TOKEN })).status).toBe(500);
  });
});

describe("RFC 8058 one-click", () => {
  it("turns off THIS category only, from the header URL", async () => {
    const res = await handler(new Request(`${BASE}?token=${TOKEN}&category=weekly_badge`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    }));
    expect(res.status).toBe(200);
    expect(state.calls).toEqual([
      { fn: "apply_notification_token_action", p_token: TOKEN, p_category: "weekly_badge", p_state: "off", p_paused_until: null },
    ]);
  });

  it("refuses a one-click without a valid category", async () => {
    const res = await handler(new Request(`${BASE}?token=${TOKEN}&category=all-the-things`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    }));
    expect(res.status).toBe(400);
    expect(state.calls).toEqual([]);
  });
});

describe("helpers", () => {
  it("maskEmail keeps the first character and the domain", () => {
    expect(mod.maskEmail("julnadoraugustin@gmail.com")).toBe("j•••@gmail.com");
    expect(mod.maskEmail("x")).toBeNull();
    expect(mod.maskEmail(null)).toBeNull();
  });

  it("haitiToday uses the Haiti calendar, not UTC", () => {
    // 2026-10-10 02:00 UTC is still 2026-10-09 in Haiti (UTC-4/-5).
    expect(mod.haitiToday(new Date("2026-10-10T02:00:00Z"))).toBe("2026-10-09");
  });
});
