import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, AlertTriangle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ASSIGNABLE_PLAN_KEYS, PLAN_BY_KEY } from "@/config/plans";

interface SubscriptionRow {
  user_id: string;
  plan_key: string;
  status: string;
  current_period_end: string | null;
  profiles?: {
    display_name: string | null;
  } | null;
}

interface BillingEventRow {
  id: string;
  type: string;
  stripe_object_id: string | null;
  created_at: string;
}

export default function AdminBilling() {
  const queryClient = useQueryClient();
  // Pending plan edits keyed by user_id; absent = unchanged.
  const [planDrafts, setPlanDrafts] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-billing"],
    queryFn: async () => {
      const [subscriptionsRes, failuresRes] = await Promise.all([
        supabase
          .from("subscriptions" as any)
          .select("user_id, plan_key, status, current_period_end, profiles:user_id(display_name)")
          .order("updated_at", { ascending: false }),
        supabase
          .from("billing_events" as any)
          .select("id, type, stripe_object_id, created_at")
          .ilike("type", "%failed%")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (subscriptionsRes.error) throw subscriptionsRes.error;
      if (failuresRes.error) throw failuresRes.error;

      return {
        subscriptions: (subscriptionsRes.data ?? []) as SubscriptionRow[],
        failures: (failuresRes.data ?? []) as BillingEventRow[],
      };
    },
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of data?.subscriptions ?? []) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }, [data?.subscriptions]);

  // admin_set_plan_key is an admin-only SECURITY DEFINER RPC that updates
  // subscriptions.plan_key only (admins have no direct UPDATE policy).
  const savePlan = async (userId: string) => {
    const planKey = planDrafts[userId];
    if (!planKey) return;
    setSavingUserId(userId);
    try {
      const { error: rpcError } = await supabase.rpc("admin_set_plan_key" as any, {
        p_user_id: userId,
        p_plan_key: planKey,
      } as any);
      if (rpcError) throw rpcError;
      toast.success(`Plan updated to ${PLAN_BY_KEY[planKey as keyof typeof PLAN_BY_KEY]?.name ?? planKey}`);
      setPlanDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-billing"] });
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to update plan");
    } finally {
      setSavingUserId(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
          <CreditCard size={18} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Billing</h1>
          <p className="text-white/70 text-sm">Subscriptions, status counts, and payment failure events.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-white/60">{status}</p>
            <p className="text-2xl font-bold text-white">{count}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-white font-semibold">Subscriptions</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60 bg-white/5">
              <tr>
                <th className="text-left px-4 py-2">User</th>
                <th className="text-left px-4 py-2">Plan</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Period End</th>
                <th className="text-left px-4 py-2">Change Plan</th>
              </tr>
            </thead>
            <tbody>
              {data?.subscriptions.map((row) => (
                <tr key={row.user_id} className="border-t border-white/10 text-white/90">
                  <td className="px-4 py-2">{row.profiles?.display_name || row.user_id}</td>
                  <td className="px-4 py-2 uppercase">{row.plan_key}</td>
                  <td className="px-4 py-2 capitalize">{row.status}</td>
                  <td className="px-4 py-2">{row.current_period_end ? new Date(row.current_period_end).toLocaleString() : "-"}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Plan for ${row.profiles?.display_name || row.user_id}`}
                        value={planDrafts[row.user_id] ?? row.plan_key ?? "basic"}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPlanDrafts((prev) => {
                            const next = { ...prev };
                            if (value === row.plan_key) delete next[row.user_id];
                            else next[row.user_id] = value;
                            return next;
                          });
                        }}
                        className="rounded-md border border-white/20 bg-slate-900 px-2 py-1 text-white"
                      >
                        {ASSIGNABLE_PLAN_KEYS.map((key) => (
                          <option key={key} value={key}>{PLAN_BY_KEY[key].name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => savePlan(row.user_id)}
                        disabled={!planDrafts[row.user_id] || savingUserId === row.user_id}
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 disabled:opacity-40"
                      >
                        {savingUserId === row.user_id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
    </div>
  );
}