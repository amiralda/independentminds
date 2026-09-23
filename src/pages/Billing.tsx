import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { PLAN_BY_KEY, type AssignablePlanKey } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SEO } from "@/components/SEO";

export default function Billing() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subscription = useSubscription();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const queryClient = useQueryClient();
  const [managerForm, setManagerForm] = useState({ organization_name: "", reason: "", expected_families_count: "" });
  const [submittingManagerRequest, setSubmittingManagerRequest] = useState(false);

  const { data: isManager } = useQuery({
    queryKey: ["is-manager", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "manager")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const { data: latestManagerRequest } = useQuery({
    queryKey: ["manager-request", user?.id],
    enabled: !!user?.id && isManager === false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manager_requests" as any)
        .select("id, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string; created_at: string } | null;
    },
  });

  const submitManagerRequest = async () => {
    if (!user || !managerForm.reason.trim()) return;
    setSubmittingManagerRequest(true);
    try {
      const { error } = await supabase.from("manager_requests" as any).insert({
        user_id: user.id,
        organization_name: managerForm.organization_name.trim() || null,
        reason: managerForm.reason.trim(),
        expected_families_count: managerForm.expected_families_count
          ? parseInt(managerForm.expected_families_count, 10)
          : null,
      });
      if (error) throw error;
      toast.success(t("managerRequest.submitted"));
      setManagerForm({ organization_name: "", reason: "", expected_families_count: "" });
      queryClient.invalidateQueries({ queryKey: ["manager-request", user.id] });
    } catch (error: unknown) {
      console.error("manager request:", error);
      toast.error(t("managerRequest.error"));
    } finally {
      setSubmittingManagerRequest(false);
    }
  };

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

  const plan = subscription.planKey ? PLAN_BY_KEY[subscription.planKey as AssignablePlanKey] ?? null : null;

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

        {/* Request Manager Access */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-xl font-bold">{t("managerRequest.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("managerRequest.description")}</p>
          </div>

          {isManager ? (
            <p className="text-sm font-medium text-emerald-700">{t("managerRequest.alreadyManager")}</p>
          ) : latestManagerRequest?.status === "pending" ? (
            <p className="text-sm font-medium text-amber-700">{t("managerRequest.pending")}</p>
          ) : (
            <div className="space-y-3">
              {latestManagerRequest?.status === "rejected" && (
                <p className="text-sm text-muted-foreground">{t("managerRequest.rejectedNotice")}</p>
              )}
              <div>
                <label className="text-sm font-medium">{t("managerRequest.organizationLabel")}</label>
                <Input
                  className="mt-1"
                  value={managerForm.organization_name}
                  onChange={(e) => setManagerForm((f) => ({ ...f, organization_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("managerRequest.reasonLabel")}</label>
                <Textarea
                  className="mt-1"
                  value={managerForm.reason}
                  onChange={(e) => setManagerForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("managerRequest.familiesCountLabel")}</label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  value={managerForm.expected_families_count}
                  onChange={(e) => setManagerForm((f) => ({ ...f, expected_families_count: e.target.value }))}
                />
              </div>
              <Button
                onClick={submitManagerRequest}
                disabled={submittingManagerRequest || !managerForm.reason.trim()}
                className="font-display"
              >
                {submittingManagerRequest ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                {t("managerRequest.submit")}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}