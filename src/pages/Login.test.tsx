import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { I18nProvider } from "@/lib/i18n";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: vi.fn(),
    },
  },
}));

import Login from "./Login";

// The sign-up form's Radix checkbox needs ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const renderLogin = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <I18nProvider>
          <Login />
        </I18nProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );

// Google sign-in is hidden until handle_new_user accepts OAuth signups AND the
// app gates them behind the adult confirmation (see docs/ACTIVITY_LOG.md).
describe("Login page — Google sign-in hidden", () => {
  it("sign-in mode shows no Google button and no 'Or continue with' divider", () => {
    renderLogin();
    expect(screen.queryByRole("button", { name: /google/i })).toBeNull();
    expect(screen.queryByText(/or continue with/i)).toBeNull();
    // The email/password form is still there.
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("sign-up mode shows no Google button either", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
    expect(screen.queryByRole("button", { name: /google/i })).toBeNull();
    expect(screen.queryByText(/or continue with/i)).toBeNull();
  });
});
