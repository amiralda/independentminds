import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, AlertTriangle, Loader2, Save, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ASSIGNABLE_PLAN_KEYS, PLAN_BY_KEY, type AssignablePlanKey } from "@/config/plans";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// One row per parent account (admin_list_parent_subscriptions), with or
// without a subscriptions row.
export interface ParentSubscriptionRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_co_guardian: boolean;
  plan_key: string | null;
  status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  has_stripe: boolean;
  manager_covered: boolean;
  last_change_at: string | null;
  last_change_by: string | null;
  last_change_action: string | null;
}

interface BillingEventRow {
  id: string;
  type: string;
  stripe_object_id: string | null;
  created_at: string;
}

type EditableStatus = "active" | "trialing";

interface Draft {
  plan: AssignablePlanKey;
  status: EditableStatus;
  endDate: string; // yyyy-mm-dd or ""
}

interface PendingChange {
  row: ParentSubscriptionRow;
  plan: string;
  status: string;
  endsAt: string | null;
  suspend: boolean;
}

const planName = (key: string | null) =>
  key ? PLAN_BY_KEY[key as AssignablePlanKey]?.name ?? key : "-";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "-");

// The chosen day ends at 23:59:59 local time.
export const endOfDayIso = (date: string) => new Date(`${date}T23:59:59`).toISOString();

const toDateInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const defaultDraft = (row: ParentSubscriptionRow): Draft => {
  const status: EditableStatus = row.status === "trialing" ? "trialing" : "active";
  return {
    plan: (ASSIGNABLE_PLAN_KEYS as string[]).includes(row.plan_key ?? "") ? (row.plan_key as AssignablePlanKey) : "basic",
    status,
    endDate: toDateInput(status === "trialing" ? row.trial_ends_at : row.current_period_end),
  };
};

const ACTION_LABEL: Record<string, string> = {
  admin_set: "set by admin",
  trial_auto: "automatic trial",
  expired: "expired",
};

export default function AdminBilling() {
  const queryClient = useQueryClient();
  // Pending edits keyed by user_id; absent = unchanged.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-billing"],
    queryFn: async () => {
      const [parentsRes, failuresRes] = await Promise.all([
        supabase.rpc("admin_list_parent_subscriptions" as any),
        supabase
          .from("billing_events" as any)
          .select("id, type, stripe_object_id, created_at")
          .ilike("type", "%failed%")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (parentsRes.error) throw parentsRes.error;
      if (failuresRes.error) throw failuresRes.error;

      return {
        parents: (parentsRes.data ?? []) as ParentSubscriptionRow[],
        failures: (failuresRes.data ?? []) as unknown as BillingEventRow[],
      };
    },
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of data?.parents ?? []) {
      const key = row.status ?? "no subscription";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [data?.parents]);

  const draftFor = (row: ParentSubscriptionRow) => drafts[row.user_id] ?? defaultDraft(row);

  const updateDraft = (row: ParentSubscriptionRow, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [row.user_id]: { ...draftFor(row), ...patch } }));

  const askSave = (row: ParentSubscriptionRow) => {
    const d = draftFor(row);
    if (d.status === "trialing" && !d.endDate) {
      toast.error("A trial needs an end date");
      return;
    }
    setPending({ row, plan: d.plan, status: d.status, endsAt: d.endDate ? endOfDayIso(d.endDate) : null, suspend: false });
  };

  const askSuspend = (row: ParentSubscriptionRow) =>
    setPending({ row, plan: row.plan_key ?? "basic", status: "canceled", endsAt: null, suspend: true });

  // admin_set_subscription is an admin-only SECURITY DEFINER RPC: it upserts
  // the row (creating it if missing), never touches the Stripe columns, and
  // records who changed what in subscription_admin_changes.
  const confirmChange = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc("admin_set_subscription" as any, {
        p_user_id: pending.row.user_id,
        p_plan_key: pending.plan,
        p_status: pending.status,
        p_ends_at: pending.endsAt,
      } as any);
      if (rpcError) throw rpcError;
      toast.success(pending.suspend ? "Access suspended" : `Subscription saved: ${planName(pending.plan)} / ${pending.status}`);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[pending.row.user_id];
        return next;
      });
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-billing"] });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update subscription");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white flex items-center gap-3">
        <Loader2 className="animate-spin" size={18} />
        Loading billing data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-6 text-red-100">
        Failed to load billing data.
      </div>
    );
  }

  const who = (row: ParentSubscriptionRow) => row.display_name || row.email || row.user_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <CreditCard size={18} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Billing</h1>
          <p className="text-white/70 text-sm">Every parent account, its subscription, and payment failure events.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-white/60">{status}</p>
            <p className="text-2xl font-bold text-white">{count}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-white font-semibold">Parents</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60 bg-white/5">
              <tr>
                <th className="text-left px-4 py-2">Parent</th>
                <th className="text-left px-4 py-2">Plan</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Ends</th>
                <th className="text-left px-4 py-2">Last change</th>
                <th className="text-left px-4 py-2">Set subscription</th>
              </tr>
            </thead>
            <tbody>
              {data?.parents.map((row) => {
                const d = draftFor(row);
                const ends = row.status === "trialing" ? row.trial_ends_at : row.current_period_end;
                return (
                  <tr key={row.user_id} data-testid={`parent-row-${row.user_id}`} className="border-t border-white/10 text-white/90 align-top">
                    <td className="px-4 py-2">
                      <div className="font-medium">{row.display_name || "-"}</div>
                      <div className="text-xs text-white/60">{row.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {row.is_co_guardian && <span className="rounded bg-sky-500/20 px-1.5 text-[10px] text-sky-200">co-guardian</span>}
                        {row.has_stripe && <span className="rounded bg-violet-500/20 px-1.5 text-[10px] text-violet-200">Stripe</span>}
                        {row.manager_covered && <span className="rounded bg-emerald-500/20 px-1.5 text-[10px] text-emerald-200">Manager-covered</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">{planName(row.plan_key)}</td>
                    <td className="px-4 py-2 capitalize">{row.status ?? <span className="text-white/50">none</span>}</td>
                    <td className="px-4 py-2">{fmtDate(ends)}</td>
                    <td className="px-4 py-2 text-xs text-white/70">
                      {row.last_change_at ? (
                        <>
                          <div>{new Date(row.last_change_at).toLocaleString()}</div>
                          <div>{row.last_change_by ?? "system"} · {ACTION_LABEL[row.last_change_action ?? ""] ?? row.last_change_action}</div>
                        </>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Plan for ${who(row)}`}
                          value={d.plan}
                          onChange={(e) => updateDraft(row, { plan: e.target.value as AssignablePlanKey })}
                          className="rounded-md border border-white/20 bg-slate-900 px-2 py-1 text-white"
                        >
                          {ASSIGNABLE_PLAN_KEYS.map((key) => (
                            <option key={key} value={key}>{PLAN_BY_KEY[key].name}</option>
                          ))}
                        </select>
                        <select
                          aria-label={`Status for ${who(row)}`}
                          value={d.status}
                          onChange={(e) => updateDraft(row, { status: e.target.value as EditableStatus })}
                          className="rounded-md border border-white/20 bg-slate-900 px-2 py-1 text-white"
                        >
                          <option value="active">Active</option>
                          <option value="trialing">Trialing</option>
                        </select>
                        <input
                          type="date"
                          aria-label={`End date for ${who(row)}`}
                          value={d.endDate}
                          onChange={(e) => updateDraft(row, { endDate: e.target.value })}
                          className="rounded-md border border-white/20 bg-slate-900 px-2 py-1 text-white"
                        />
                        <button
                          type="button"
                          onClick={() => askSave(row)}
                          className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
                        >
                          <Save size={12} />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => askSuspend(row)}
                          disabled={!row.status || row.status === "canceled"}
                          className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-1 text-xs font-medium text-red-100 hover:bg-red-500/30 disabled:opacity-40"
                        >
                          <Ban size={12} />
                          Suspend
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-white font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-300" />
          Recent Billing Failures
        </div>
        <div className="divide-y divide-white/10">
          {(data?.failures ?? []).length === 0 && (
            <p className="px-4 py-3 text-sm text-white/60">No failure events recorded recently.</p>
          )}
          {(data?.failures ?? []).map((event) => (
            <div key={event.id} className="px-4 py-3 text-sm text-white/90">
              <div className="font-medium">{event.type}</div>
              <div className="text-white/60 text-xs">Object: {event.stripe_object_id || "-"}</div>
              <div className="text-white/60 text-xs">{new Date(event.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open && !saving) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.suspend ? "Suspend access?" : "Change subscription?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2" data-testid="confirm-summary">
                {pending && (
                  <>
                    <p>
                      <strong>{who(pending.row)}</strong>: {planName(pending.row.plan_key)} / {pending.row.status ?? "no subscription"}
                      {" → "}
                      {planName(pending.plan)} / {pending.status}
                      {pending.endsAt ? ` until ${fmtDate(pending.endsAt)}` : ""}
                    </p>
                    {pending.suspend && <p>Paid features stop immediately for this family.</p>}
                    {pending.row.has_stripe && (
                      <p className="text-amber-600">This account has a Stripe subscription. The next Stripe webhook may overwrite this change; the Stripe IDs are kept.</p>
                    )}
                    {pending.row.is_co_guardian && (
                      <p className="text-amber-600">This person is a co-guardian. Their own row takes priority over the family subscription they are covered by.</p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void confirmChange();
              }}
            >
              {saving && <Loader2 size={14} className="mr-1 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
