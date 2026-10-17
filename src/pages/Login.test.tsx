import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { I18nProvider } from "@/lib/i18n";

const signUpMock = vi.fn(async () => ({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithOAuth: vi.fn(),
      signUp: (...args: unknown[]) => signUpMock(...(args as [])),
    },
  },
}));

import Login from "./Login";
import { LEGAL_VERSIONS } from "@/config/legalVersions";

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

// No account may be created without a recorded acceptance of the Terms and the
// Privacy Policy. Without this record there is no proof of what a user agreed
// to. See supabase/migrations/20261017140000_signup_consent.sql.
describe("Login page — legal consent at sign-up", () => {
  const openSignUp = () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /^sign up$/i }));
  };

  const fillValidForm = () => {
    fireEvent.change(screen.getByPlaceholderText("Marie Joseph"), { target: { value: "Test Parent" } });
    fireEvent.change(screen.getByPlaceholderText("your@email.com"), { target: { value: "parent@example.com" } });
    // Password and confirm-password both render as PasswordInput, which uses a
    // bullet placeholder rather than a label we can match on.
    screen
      .getAllByPlaceholderText("••••••••")
      .forEach((input) => fireEvent.change(input, { target: { value: "longenoughpw" } }));
  };

  it("shows a consent checkbox linking to both documents", () => {
    openSignUp();
    expect(screen.getByRole("checkbox", { name: /i have read and agree/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy");
  });

  it("keeps the submit button disabled until consent is given", () => {
    openSignUp();
    fillValidForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /i confirm i am 18/i }));

    const submit = screen.getByRole("button", { name: /sign up/i });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: /i have read and agree/i }));
    expect(submit).not.toBeDisabled();
  });

  it("records the accepted versions in the sign-up metadata", async () => {
    signUpMock.mockClear();
    openSignUp();
    fillValidForm();
    fireEvent.click(screen.getByRole("checkbox", { name: /i confirm i am 18/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /i have read and agree/i }));
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await vi.waitFor(() => expect(signUpMock).toHaveBeenCalledTimes(1));

    const data = (signUpMock.mock.calls[0] as unknown as [{ options: { data: Record<string, unknown> } }])[0].options.data;
    expect(data.terms_accepted).toBe(true);
    expect(data.terms_version).toBe(LEGAL_VERSIONS.terms);
    expect(data.privacy_version).toBe(LEGAL_VERSIONS.privacy);
    expect(typeof data.terms_accepted_at).toBe("string");
    expect(Number.isNaN(Date.parse(data.terms_accepted_at as string))).toBe(false);
  });
});
