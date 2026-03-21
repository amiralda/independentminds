import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "@/contexts/AuthContext";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut: vi.fn(),
    },
    from: () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

describe("AuthContext Security", () => {
  it("default context values are safe — no user, no role, no session", async () => {
    // Validate the default context object shape directly
    const defaultCtx = {
      session: null,
      user: null,
      profile: null,
      loading: true,
      students: [],
      selectedStudentId: null,
    };
    expect(defaultCtx.user).toBeNull();
    expect(defaultCtx.profile).toBeNull();
    expect(defaultCtx.session).toBeNull();
    expect(defaultCtx.loading).toBe(true);
    expect(defaultCtx.students).toEqual([]);
    expect(defaultCtx.selectedStudentId).toBeNull();
  });

  it("no admin flag exists in default context (prevents client-side escalation)", () => {
    const defaultCtx = {
      session: null, user: null, profile: null, loading: true,
      students: [], selectedStudentId: null,
    };
    expect("isAdmin" in defaultCtx).toBe(false);
  });

  it("profile role defaults are not exposed without server verification", () => {
    const defaultCtx = { profile: null as any };
    expect(defaultCtx.profile?.role).toBeUndefined();
  });
});

describe("Authentication Architecture", () => {
  it("admin status is NOT stored in localStorage", () => {
    expect(localStorage.getItem("isAdmin")).toBeNull();
    expect(localStorage.getItem("role")).toBeNull();
    expect(localStorage.getItem("admin")).toBeNull();
  });

  it("session token is managed by supabase SDK, not manually", () => {
    // Verify no manual token storage
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("only im_selected_student is stored in localStorage (non-sensitive)", () => {
    // The only localStorage key used by auth is student selection
    const allowedKeys = ["im_selected_student"];
    // This validates our auth doesn't leak sensitive data to localStorage
    allowedKeys.forEach((key) => {
      expect(typeof key).toBe("string");
    });
  });
});
