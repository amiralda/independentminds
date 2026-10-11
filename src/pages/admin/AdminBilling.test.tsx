import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminBilling, { endOfDayIso, type ParentSubscriptionRow } from "./AdminBilling";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: mocks.toast }));

vi.mock("@/integrations/supabase/client", () => {
  const failures = { data: [], error: null };
  const q: Record<string, unknown> = { then: (res: (v: unknown) => unknown) => res(failures) };
  for (const op of ["select", "ilike", "order", "limit"]) q[op] = () => q;
  return { supabase: { rpc: mocks.rpc, from: () => q } };
});

const base: ParentSubscriptionRow = {
  user_id: "u-none",
  email: "none@x.test",
  display_name: "No Sub",
  is_co_guardian: false,
  plan_key: null,
  status: null,
  trial_ends_at: null,
  current_period_end: null,
  has_stripe: false,
  manager_covered: false,
  last_change_at: null,
  last_change_by: null,
  last_change_action: null,
};

const ROWS: ParentSubscriptionRow[] = [
  base,
  {
    ...base,
    user_id: "u-stripe",
    email: "stripe@x.test",
    display_name: "Stripe Payer",
    plan_key: "plus",
    status: "active",
    has_stripe: true,
    last_change_at: "2026-10-10T12:00:00Z",
    last_change_by: "admin@x.test",
    last_change_action: "admin_set",
  },
];

const setCalls = () => mocks.rpc.mock.calls.filter(([fn]) => fn === "admin_set_subscription").map(([, args]) => args);

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminBilling />
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(async (fn: string) =>
    fn === "admin_list_parent_subscriptions" ? { data: ROWS, error: null } : { data: {}, error: null },
  );
});

describe("AdminBilling", () => {
  it("lists every parent, including one with no subscription, with the last change", async () => {
    renderPage();
    const none = await screen.findByTestId("parent-row-u-none");
    expect(within(none).getByText("none")).toBeInTheDocument();
    const stripe = screen.getByTestId("parent-row-u-stripe");
    expect(within(stripe).getByText("Stripe")).toBeInTheDocument();
    expect(within(stripe).getByText(/admin@x\.test · set by admin/)).toBeInTheDocument();
  });

  it("asks for confirmation before saving, and saves only after Confirm", async () => {
    renderPage();
    await screen.findByTestId("parent-row-u-none");
    fireEvent.change(screen.getByLabelText("Plan for No Sub"), { target: { value: "pro" } });
    fireEvent.change(screen.getByLabelText("End date for No Sub"), { target: { value: "2026-12-31" } });
    fireEvent.click(within(screen.getByTestId("parent-row-u-none")).getByText("Save"));

    expect(await screen.findByText("Change subscription?")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-summary")).toHaveTextContent("No Sub: - / no subscription → Pro / active until");
    expect(setCalls()).toEqual([]);

    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(setCalls()).toHaveLength(1));
    expect(setCalls()[0]).toEqual({ p_user_id: "u-none", p_plan_key: "pro", p_status: "active", p_ends_at: endOfDayIso("2026-12-31") });
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalled());
  });

  it("Cancel closes the dialog without calling the RPC", async () => {
    renderPage();
    await screen.findByTestId("parent-row-u-none");
    fireEvent.click(within(screen.getByTestId("parent-row-u-none")).getByText("Save"));
    fireEvent.click(await screen.findByText("Cancel"));
    await waitFor(() => expect(screen.queryByText("Change subscription?")).not.toBeInTheDocument());
    expect(setCalls()).toEqual([]);
  });

  it("refuses a trial without an end date, before any dialog", async () => {
    renderPage();
    await screen.findByTestId("parent-row-u-none");
    fireEvent.change(screen.getByLabelText("Status for No Sub"), { target: { value: "trialing" } });
    fireEvent.click(within(screen.getByTestId("parent-row-u-none")).getByText("Save"));
    expect(mocks.toast.error).toHaveBeenCalledWith("A trial needs an end date");
    expect(screen.queryByText("Change subscription?")).not.toBeInTheDocument();
  });

  it("Suspend sends status canceled with the current plan and warns about Stripe", async () => {
    renderPage();
    await screen.findByTestId("parent-row-u-stripe");
    expect(within(screen.getByTestId("parent-row-u-none")).getByText("Suspend").closest("button")).toBeDisabled();
    fireEvent.click(within(screen.getByTestId("parent-row-u-stripe")).getByText("Suspend"));
    expect(await screen.findByText("Suspend access?")).toBeInTheDocument();
    expect(screen.getByText(/Stripe webhook may overwrite/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(setCalls()).toHaveLength(1));
    expect(setCalls()[0]).toEqual({ p_user_id: "u-stripe", p_plan_key: "plus", p_status: "canceled", p_ends_at: null });
  });

  it("shows the server error (e.g. 42501 forbidden) and keeps the dialog open", async () => {
    mocks.rpc.mockImplementation(async (fn: string) =>
      fn === "admin_list_parent_subscriptions" ? { data: ROWS, error: null } : { data: null, error: { message: "forbidden", code: "42501" } },
    );
    renderPage();
    await screen.findByTestId("parent-row-u-none");
    fireEvent.click(within(screen.getByTestId("parent-row-u-none")).getByText("Save"));
    fireEvent.click(await screen.findByText("Confirm"));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("forbidden"));
    expect(screen.getByText("Change subscription?")).toBeInTheDocument();
  });
});
