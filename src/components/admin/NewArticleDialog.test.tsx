import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { formatNewsletterDate } from "@/lib/newsletter";
import { NewArticleDialog } from "./NewArticleDialog";

type Body = { action: string; language?: string; campaign?: string };

const fn = vi.hoisted(() => ({
  calls: [] as Body[],
  failing: new Set<string>(), // "draft" or a language code
  hold: null as null | Promise<void>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: async (_name: string, { body }: { body: Body }) => {
        fn.calls.push(body);
        if (fn.hold) await fn.hold;
        const key = body.action === "draft" ? "draft" : body.language!;
        if (fn.failing.has(key)) {
          return { data: null, error: { context: new Response(JSON.stringify({ error: `Generation failed: ${key} down` }), { status: 500 }) } };
        }
        return body.action === "draft"
          ? { data: { campaign: (body as Body).campaign, title: "Daily routines", content: "## Why\n\nBody" }, error: null }
          : { data: { campaign: body.campaign, language: body.language }, error: null };
      },
    },
  },
}));

function Detail() {
  return <div data-testid="detail-page">{useParams().campaign}</div>;
}

const renderDialog = () =>
  render(
    <MemoryRouter initialEntries={["/admin/newsletter"]}>
      <I18nProvider>
        <Routes>
          <Route path="/admin/newsletter" element={<NewArticleDialog />} />
          <Route path="/admin/newsletter/:campaign" element={<Detail />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );

const SAT = "2099-01-03";
const TUE = "2098-12-30";

async function fillForm(date = SAT) {
  renderDialog();
  fireEvent.click(screen.getByTestId("new-article-open"));
  fireEvent.change(await screen.findByLabelText("Topic"), { target: { value: "Daily Routines at Home!" } });
  fireEvent.change(screen.getByLabelText("Publication date"), { target: { value: date } });
}

beforeEach(() => {
  try { localStorage.clear(); } catch { /* ignore */ }
  fn.calls = [];
  fn.failing = new Set();
  fn.hold = null;
});

describe("NewArticleDialog form", () => {
  it("fills the campaign from the topic and enables Generate on a future Saturday", async () => {
    await fillForm();
    expect(screen.getByLabelText("Campaign name")).toHaveValue("daily-routines-at-home-2099-01");
    expect(screen.getByTestId("gen-submit")).toBeEnabled();
  });

  it("a Tuesday is refused and the nearest Saturday is offered", async () => {
    await fillForm(TUE);
    expect(screen.getByTestId("gen-submit")).toBeDisabled();
    const hint = screen.getByTestId("gen-date-hint");
    expect(hint).toHaveTextContent(formatNewsletterDate("2098-12-27")!);
    fireEvent.click(within(hint).getByRole("button", { name: "Use this date" }));
    expect(screen.getByLabelText("Publication date")).toHaveValue("2098-12-27");
    expect(screen.getByTestId("gen-submit")).toBeEnabled();
  });

  it("an edited campaign is kept and must be valid", async () => {
    await fillForm();
    fireEvent.change(screen.getByLabelText("Campaign name"), { target: { value: "Bad Name" } });
    expect(screen.getByTestId("gen-submit")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Campaign name"), { target: { value: "my-issue" } });
    fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Another topic" } });
    expect(screen.getByLabelText("Campaign name")).toHaveValue("my-issue");
    expect(screen.getByTestId("gen-submit")).toBeEnabled();
  });
});

describe("NewArticleDialog progress", () => {
  it("drafts EN, translates the 9 languages one by one, then opens the article", async () => {
    await fillForm();
    fireEvent.click(screen.getByTestId("gen-submit"));
    expect(await screen.findByTestId("detail-page")).toHaveTextContent("daily-routines-at-home-2099-01");
    expect(fn.calls.map((c) => c.action === "draft" ? "draft" : c.language)).toEqual(
      ["draft", "HT", "FR", "ES", "PT", "AR", "ZH", "DE", "JA", "RU"],
    );
    expect(fn.calls[0]).toEqual({ action: "draft", topic: "Daily Routines at Home!", scheduled_for: SAT, campaign: "daily-routines-at-home-2099-01" });
  });

  it("a failed language shows ✗ + Retry for that language only; the others are kept", async () => {
    fn.failing.add("DE");
    await fillForm();
    fireEvent.click(screen.getByTestId("gen-submit"));
    const progress = await screen.findByTestId("gen-progress");
    await waitFor(() => expect(progress.querySelector('[data-lang="RU"]')).toHaveAttribute("data-state", "ok"));
    expect(screen.getByTestId("gen-english-preview")).toHaveTextContent("Daily routines");
    expect(progress.querySelector('[data-lang="DE"]')).toHaveAttribute("data-state", "error");
    expect(progress.querySelector('[data-lang="DE"]')).toHaveTextContent("DE down");
    expect(progress.querySelectorAll('[data-state="ok"]')).toHaveLength(9); // EN + 8
    expect(screen.queryByTestId("gen-retry-FR")).toBeNull();

    fn.failing.clear();
    fn.calls = [];
    fireEvent.click(screen.getByTestId("gen-retry-DE"));
    expect(await screen.findByTestId("detail-page")).toBeInTheDocument();
    expect(fn.calls).toEqual([{ action: "translate", campaign: "daily-routines-at-home-2099-01", language: "DE" }]);
  });

  it("a failed English draft shows the error and nothing is translated", async () => {
    fn.failing.add("draft");
    await fillForm();
    fireEvent.click(screen.getByTestId("gen-submit"));
    await waitFor(() => expect(screen.getByTestId("gen-progress").querySelector('[data-lang="EN"]')).toHaveAttribute("data-state", "error"));
    expect(fn.calls).toHaveLength(1);
    expect(screen.getByTestId("gen-submit")).toBeEnabled(); // can try again
  });

  it("does not close while generating and warns instead", async () => {
    let release!: () => void;
    fn.hold = new Promise<void>((r) => { release = r; });
    await fillForm();
    fireEvent.click(screen.getByTestId("gen-submit"));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(await screen.findByTestId("gen-working-warning")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fn.hold = null;
    release();
    expect(await screen.findByTestId("detail-page")).toBeInTheDocument();
  });
});
