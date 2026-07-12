import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "none";

interface SubscriptionRow {
  status: Exclude<SubscriptionStatus, "none">;
  plan_key: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

interface UseSubscriptionResult {
  status: SubscriptionStatus;
  planKey: string | null;
  isActive: boolean;
  isPastDue: boolean;
  trialEndsAt: string | null;
}

const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

function withinPastDueGrace(currentPeriodEnd: string | null): boolean {
  if (!currentPeriodEnd) return false;

  const periodEndMs = new Date(currentPeriodEnd).getTime();
  if (!Number.isFinite(periodEndMs)) return false;

  return Date.now() <= periodEndMs + PAST_DUE_GRACE_MS;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("subscriptions" as any)
        .select("status, plan_key, current_period_end, trial_ends_at")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return (row ?? null) as SubscriptionRow | null;
    },
  });

  return useMemo(() => {
    if (!data) {
      return {
        status: "none",
        planKey: null,
        isActive: false,
        isPastDue: false,
        trialEndsAt: null,
      };
    }

    const status = data.status;
    const hasGrace = status === "past_due" && withinPastDueGrace(data.current_period_end);

    return {
      status,
      planKey: data.plan_key,
      isActive: status === "trialing" || status === "active" || hasGrace,
      isPastDue: status === "past_due",
      trialEndsAt: data.trial_ends_at,
    };
  }, [data]);
}
