import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import React from "react";

// Mock supabase client
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
    from: () => ({
      select: mockSelect,
      update: () => ({
        eq: mockUpdate,
      }),
    }),
  },
}));

function TestConsumer() {
  const { user, profile, loading, session } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.id ?? "none"}</span>
      <span data-testid="role">{profile?.role ?? "none"}</span>
      <span data-testid="session">{session ? "active" : "none"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("provides null user when no session exists", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(screen.getByTestId("session").textContent).toBe("none");
  });

  it("starts in loading state", () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");
  });

  it("clears state on sign-out event", async () => {
    let authCallback: any;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Simulate sign out
    authCallback("SIGNED_OUT", null);

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("none");
      expect(screen.getByTestId("role").textContent).toBe("none");
    });
  });

  it("signs out if profile is not found (prevents metadata spoofing)", async () => {
    const mockSession = {
      user: { id: "test-user-id", email: "test@example.com" },
      access_token: "token",
    };

    let authCallback: any;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });
    mockSelect.mockReturnValue({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { message: "Not found" } }),
      }),
    });
    mockSignOut.mockResolvedValue({});

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Trigger auth state
    authCallback("SIGNED_IN", mockSession);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("default context values are safe (no role escalation)", () => {
    const { user, profile, session, loading } = useAuth();
    expect(user).toBeNull();
    expect(profile).toBeNull();
    expect(session).toBeNull();
    expect(loading).toBe(true);
  });
});
