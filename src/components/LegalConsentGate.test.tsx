// The consent gate that brings pre-existing accounts onto the published legal
// text. These tests pin the three properties that make it worth having:
// students are never asked, it cannot be dismissed, and it never covers the
// documents it is asking people to read.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { LEGAL_VERSIONS } from "@/config/legalVersions";

const state = vi.hoisted(() => ({
  role: "parent" as "parent" | "student",
  userId: "u1" as string | null,
  consentRows: [] as { document: string; version: string }[],
  rpcCalls: [] as { name: string; args: unknown }[],
  rpcError: null as { message: string } | null,
  signOutCalls: 0,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: async () => ({ data: state.consentRows, error: null }),
      }),
    }),
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args });
      return { data: null, error: state.rpcError };
    },
    auth: { signOut: async () => { state.signOutCalls++; } },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: state.userId ? { id: state.userId } : null,
    profile: state.userId ? { role: state.role, displayName: "T", languagePref: "en", onboardingComplete: true } : null,
    loading: false,
  }),
}));

import { LegalConsentGate } from "./LegalConsentGate";

globalThis.ResizeObserver ??= class {
  observe() {} unobserve() {} disconnect() {}
} as unknown as typeof ResizeObserver;

const renderGate = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <LegalConsentGate />
      </I18nProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  state.role = "parent";
  state.userId = "u1";
  state.consentRows = [];
  state.rpcCalls = [];
  state.rpcError = null;
  state.signOutCalls = 0;
});

describe("LegalConsentGate", () => {
  it("asks an adult with no consent on record", async () => {
    renderGate();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("NEVER asks a student — they are minors and their parent consents", async () => {
    // The strongest rule here. A child's click is not consent, and the database
    // refuses it too (accept_legal_documents raises IM002 for students).
    state.role = "student";
    renderGate();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("does not ask a signed-out visitor", async () => {
    state.userId = null;
    renderGate();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("stays closed once both current versions are on record", async () => {
    state.consentRows = [
      { document: "terms", version: LEGAL_VERSIONS.terms },
      { document: "privacy", version: LEGAL_VERSIONS.privacy },
    ];
    renderGate();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("re-opens when only one of the two documents is on record", async () => {
    state.consentRows = [{ document: "terms", version: LEGAL_VERSIONS.terms }];
    renderGate();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("re-opens for an old version, so a bumped version re-asks by itself", async () => {
    state.consentRows = [
      { document: "terms", version: "0.9" },
      { document: "privacy", version: "0.9" },
    ];
    renderGate();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("never covers the documents it is asking people to read", async () => {
    // The checkbox links to /terms in a new tab. If the gate rendered there,
    // the user would be told to read something they cannot see.
    for (const path of ["/terms", "/privacy", "/refund"]) {
      const { unmount } = renderGate(path);
      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      unmount();
    }
  });

  it("keeps the accept button disabled until the box is ticked", async () => {
    renderGate();
    await screen.findByRole("alertdialog");
    const accept = screen.getByRole("button", { name: /accept and continue/i });
    expect(accept).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(accept).not.toBeDisabled();
  });

  it("records both documents at the current versions on accept", async () => {
    renderGate();
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /accept and continue/i }));

    await waitFor(() => expect(state.rpcCalls).toHaveLength(1));
    expect(state.rpcCalls[0].name).toBe("accept_legal_documents");
    expect(state.rpcCalls[0].args).toEqual({
      p_terms_version: LEGAL_VERSIONS.terms,
      p_privacy_version: LEGAL_VERSIONS.privacy,
    });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("stays open when recording fails, rather than pretending it worked", async () => {
    state.rpcError = { message: "boom" };
    renderGate();
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /accept and continue/i }));

    await waitFor(() => expect(state.rpcCalls).toHaveLength(1));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("offers a way out instead of trapping the user", async () => {
    // Terms 4.5 and Refund 1.7 promise a family's records are not held
    // hostage. Someone who will not accept must still be able to leave.
    renderGate();
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => expect(state.signOutCalls).toBe(1));
  });
});
