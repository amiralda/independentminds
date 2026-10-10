import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import NotificationPreferences from "./NotificationPreferences";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const TOKEN = "cd".repeat(32);
let fetchMock: ReturnType<typeof vi.fn>;

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

const renderAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/notifications${search}`]}>
      <I18nProvider>
        <NotificationPreferences />
      </I18nProvider>
    </MemoryRouter>,
  );

const bodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)));

beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
  fetchMock = vi.fn(() => reply(200, { status: "ok", email: "j•••@gmail.com", prefs: [] }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("NotificationPreferences page", () => {
  it("shows the invalid state for a malformed token without calling the endpoint", async () => {
    renderAt("?token=nope");
    expect(await screen.findByTestId("notif-prefs-invalid")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opening the page only READS (a POST with the token and nothing else)", async () => {
    renderAt(`?token=${TOKEN}&category=daily_report&lang=en`);
    expect(await screen.findByText("For j•••@gmail.com")).toBeInTheDocument();
    expect(bodies()).toEqual([{ token: TOKEN }]);
    // the category from the email is highlighted first
    expect(screen.getByText("The email you came from")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^pref-row-/).map((el) => el.dataset.testid)).toEqual([
      "pref-row-daily_report", "pref-row-all", "pref-row-morning_reminder", "pref-row-checkin_reminder", "pref-row-weekly_badge",
    ]);
  });

  it("Stop sends a POST for that category and re-renders from the reply", async () => {
    renderAt(`?token=${TOKEN}&category=daily_report`);
    await screen.findByTestId("pref-row-daily_report");
    fetchMock.mockImplementationOnce(() =>
      reply(200, { status: "ok", email: "j•••@gmail.com", prefs: [{ category: "daily_report", state: "off", paused_until: null }] }),
    );
    fireEvent.click(screen.getByTestId("pref-stop-daily_report"));
    await waitFor(() => expect(screen.getByTestId("pref-row-daily_report").dataset.state).toBe("off"));
    expect(bodies()[1]).toEqual({ token: TOKEN, category: "daily_report", state: "off" });
    expect(screen.getByTestId("pref-on-daily_report")).toBeInTheDocument();
  });

  it("shows a pause as 'resumes <date>' and the master-switch note when 'all' is off", async () => {
    fetchMock.mockImplementation(() =>
      reply(200, {
        status: "ok",
        email: "j•••@gmail.com",
        prefs: [
          { category: "all", state: "off", paused_until: null },
          { category: "weekly_badge", state: "paused", paused_until: "2999-01-04" },
        ],
      }),
    );
    renderAt(`?token=${TOKEN}`);
    expect(await screen.findByTestId("notif-prefs-master-note")).toBeInTheDocument();
    expect(screen.getByTestId("pref-row-weekly_badge")).toHaveTextContent(/Paused — resumes .*January 4/);
    expect(screen.getByTestId("pref-row-weekly_badge")).not.toHaveTextContent(/until/i);
  });

  it("a 404 from the endpoint shows the invalid state; a network failure shows retry", async () => {
    fetchMock.mockImplementationOnce(() => reply(404, { status: "invalid" }));
    const { unmount } = renderAt(`?token=${TOKEN}`);
    expect(await screen.findByTestId("notif-prefs-invalid")).toBeInTheDocument();
    unmount();

    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("offline")));
    renderAt(`?token=${TOKEN}`);
    expect(await screen.findByTestId("notif-prefs-error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("For j•••@gmail.com")).toBeInTheDocument();
  });
});
