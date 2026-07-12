import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionRow {
  user_id: string;
  plan_key: string;
  status: string;
  current_period_end: string | null;
  profiles?: {
    display_name: string | null;
    username: string | null;
  } | null;
}

interface BillingEventRow {
  id: string;
  type: string;
  stripe_object_id: string | null;
  created_at: string;
}

export default function AdminBilling() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-billing"],
    queryFn: async () => {
      const [subscriptionsRes, failuresRes] = await Promise.all([
        supabase
          .from("subscriptions" as any)
          .select("user_id, plan_key, status, current_period_end, profiles:user_id(display_name, username)")
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
              </tr>
            </thead>
            <tbody>
              {data?.subscriptions.map((row) => (
                <tr key={`${row.user_id}-${row.plan_key}`} className="border-t border-white/10 text-white/90">
                  <td className="px-4 py-2">{row.profiles?.display_name || row.profiles?.username || row.user_id}</td>
                  <td className="px-4 py-2 uppercase">{row.plan_key}</td>
                  <td className="px-4 py-2 capitalize">{row.status}</td>
                  <td className="px-4 py-2">{row.current_period_end ? new Date(row.current_period_end).toLocaleString() : "-"}</td>
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