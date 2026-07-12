import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_BY_KEY, type PlanKey } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";

export default function Billing() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subscription = useSubscription();
  const [loadingPortal, setLoadingPortal] = useState(false);

  const { data: rawSubscription } = useQuery({
    queryKey: ["subscription-details", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions" as any)
        .select("current_period_end, trial_ends_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { current_period_end: string | null; trial_ends_at: string | null } | null;
    },
  });

  const plan = subscription.planKey ? PLAN_BY_KEY[subscription.planKey as PlanKey] : null;

  const stateNotice = useMemo(() => {
    const state = searchParams.get("state");
    if (state === "success") {
      return { type: "success" as const, message: t("billing.checkoutSuccess") };
    }
    if (state === "cancel") {
      return { type: "warning" as const, message: t("billing.checkoutCanceled") };
    }
    return null;
  }, [searchParams, t]);

  const openPortal = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session");
      if (error) throw error;
      if (data?.url) {
        window.location.assign(data.url as string);
        return;
      }
      throw new Error("Missing portal URL");
    } catch (error: unknown) {
      console.error("billing portal:", error);
      toast.error(t("billing.portalFailed"));
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Billing — Independent Minds EDU"
        description="Manage your Independent Minds EDU subscription and billing settings."
        path="/billing"
      />

      <section className="container max-w-3xl py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">{t("billing.pageTitle")}</h1>
          <p className="text-muted-foreground">{t("billing.pageSubtitle")}</p>
        </div>

        {stateNotice && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              stateNotice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {stateNotice.message}
          </div>
        )}

        {subscription.isPastDue && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm flex items-start gap-2">
            <TriangleAlert size={16} className="mt-0.5" />
            <div>
              <p className="font-semibold">{t("billing.paymentIssueTitle")}</p>
              <p>{t("billing.paymentIssueBody")}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("billing.currentPlan")}</p>
              <p className="font-semibold">{plan?.name || t("billing.noPlan")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("billing.status")}</p>
              <p className="font-semibold capitalize">{subscription.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("billing.renewalDate")}</p>
              <p className="font-semibold">
                {rawSubscription?.current_period_end
                  ? new Date(rawSubscription.current_period_end).toLocaleDateString()
                  : t("billing.notAvailable")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("billing.trialEnds")}</p>
              <p className="font-semibold">
                {rawSubscription?.trial_ends_at
                  ? new Date(rawSubscription.trial_ends_at).toLocaleDateString()
                  : t("billing.notAvailable")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={openPortal} disabled={loadingPortal} className="font-display">
              {loadingPortal ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {t("billing.loadingPortal")}
                </>
              ) : (
                t("billing.manageBilling")
              )}
            </Button>
            <Button asChild variant="outline" className="font-display">
              <Link to="/pricing">{t("pricing.openPricing")}</Link>
            </Button>
          </div>
        </div>

        {subscription.isActive && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5" />
            <p>{t("billing.activePlanNotice")}</p>
          </div>
        )}
      </section>
    </div>
  );
}