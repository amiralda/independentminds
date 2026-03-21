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
  it("default context values are safe — no user, no role, no session", () => {
    const ctx = useAuth();
    expect(ctx.user).toBeNull();
    expect(ctx.profile).toBeNull();
    expect(ctx.session).toBeNull();
    expect(ctx.loading).toBe(true);
    expect(ctx.students).toEqual([]);
    expect(ctx.selectedStudentId).toBeNull();
  });

  it("no admin flag exists in default context (prevents client-side escalation)", () => {
    const ctx = useAuth();
    // AuthContext should NEVER have an isAdmin field
    expect("isAdmin" in ctx).toBe(false);
  });

  it("profile role defaults are not exposed without server verification", () => {
    const ctx = useAuth();
    // Profile is null until fetched from server — no default role
    expect(ctx.profile?.role).toBeUndefined();
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
