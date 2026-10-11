import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import AdminWelcomeEmail, { summarizeSends, type WelcomeSend } from "./AdminWelcomeEmail";

const db = vi.hoisted(() => ({
  versions: [] as { language: string; title: string; content: string }[],
  sends: [] as unknown[],
  updates: [] as { values: unknown; language: unknown }[],
  updateResult: null as null | { data: unknown; error: unknown },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ profile: null }) }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: async () => ({ data: table === "welcome_emails" ? db.versions : db.sends, error: null }),
      update: (values: unknown) => ({
        eq: (_col: string, language: unknown) => ({
          select: async () => {
            db.updates.push({ values, language });
            return db.updateResult ?? { data: [{ language }], error: null };
          },
        }),
      }),
    }),
  },
}));

const renderAt = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/admin/welcome-email${search}`]}>
      <I18nProvider>
        <AdminWelcomeEmail />
      </I18nProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
  db.versions = [
    { language: "EN", title: "Welcome!", content: "Hello **parent**" },
    { language: "FR", title: "Bienvenue !", content: "Bonjour" },
  ];
  db.sends = [
    { status: "existing", trigger: "backfill", language: "EN", created_at: "2026-09-28T18:00:00Z" },
    { status: "sent", trigger: "parent_signup", language: "FR", created_at: "2026-10-01T10:00:00Z" },
    { status: "sent", trigger: "co_guardian_accepted", language: "EN", created_at: "2026-10-05T10:00:00Z" },
    { status: "failed", trigger: "parent_signup", language: "EN", created_at: "2026-10-06T10:00:00Z" },
  ];
  db.updates = [];
  db.updateResult = null;
});

describe("summarizeSends", () => {
  it("counts every status, sent per language, and the latest sent date", () => {
    const s = summarizeSends(db.sends as WelcomeSend[]);
    expect(s.byStatus).toEqual({ sent: 2, failed: 1, suppressed: 0, sending: 0, existing: 1 });
    expect(s.sentByLang).toEqual({ EN: 1, FR: 1 });
    expect(s.lastSent).toBe("2026-10-05T10:00:00Z");
    expect(s.total).toBe(4);
  });

  it("has no last date when nothing was sent", () => {
    expect(summarizeSends([]).lastSent).toBeNull();
  });
});

describe("AdminWelcomeEmail page", () => {
  it("shows the EN version, the live warning and read-only statistics", async () => {
    renderAt();
    expect(await screen.findByDisplayValue("Welcome!")).toBeInTheDocument();
    expect(screen.getByTestId("welcome-live-warning")).toBeInTheDocument();
    expect(within(screen.getByTestId("welcome-stat-sent")).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByTestId("welcome-stat-failed")).getByText("1")).toBeInTheDocument();
    expect(screen.getByTestId("welcome-sent-by-lang")).toHaveTextContent("EN 1 · FR 1");
  });

  it("opens the language from ?lang=", async () => {
    renderAt("?lang=fr");
    expect(await screen.findByDisplayValue("Bienvenue !")).toBeInTheDocument();
  });

  it("Save is disabled until something changes", async () => {
    renderAt();
    await screen.findByDisplayValue("Welcome!");
    expect(screen.getByRole("button", { name: /Save changes/ })).toBeDisabled();
  });

  it("asks for confirmation and writes nothing until it is confirmed", async () => {
    renderAt();
    fireEvent.change(await screen.findByDisplayValue("Welcome!"), { target: { value: "Welcome to IME!" } });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));

    expect(await screen.findByText("Save the welcome email (EN)?")).toBeInTheDocument();
    expect(db.updates).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Save the welcome email (EN)?")).not.toBeInTheDocument());
    expect(db.updates).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Save and use now" }));
    await waitFor(() => expect(db.updates).toHaveLength(1));
    // Only title + content (the columns admins may update), only this language.
    expect(db.updates[0]).toEqual({ values: { title: "Welcome to IME!", content: "Hello **parent**" }, language: "EN" });
  });

  it("reports a refused update (0 rows) as a failure and keeps the dialog open", async () => {
    const { toast } = await import("sonner");
    db.updateResult = { data: [], error: null };
    renderAt();
    fireEvent.change(await screen.findByDisplayValue("Hello **parent**"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Save and use now" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not save: 0/1"));
    expect(screen.getByText("Save the welcome email (EN)?")).toBeInTheDocument();
  });

  it("previews with the real template and the newsletter sender, without sending", async () => {
    renderAt();
    await screen.findByDisplayValue("Welcome!");
    fireEvent.click(screen.getByTestId("email-preview-open"));
    const meta = await screen.findByTestId("email-preview-meta");
    expect(meta).toHaveTextContent("hello@independentmindsedu.org");
    expect(meta).toHaveTextContent("Welcome!");
    expect(screen.getByTestId("email-preview-frame").getAttribute("srcdoc")).toMatch(/<strong[^>]*>parent<\/strong>/);
    expect(db.updates).toEqual([]);
  });
});
