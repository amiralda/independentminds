import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanKey } from "@/config/plans";
import { useI18n } from "@/lib/i18n";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function Pricing() {
  const { t } = useI18n();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const sortedPlans = useMemo(
    () => [...PLANS].sort((a, b) => (a.key === "plus" ? -1 : b.key === "plus" ? 1 : a.key.localeCompare(b.key))),
    [],
  );

  const startCheckout = async (planKey: PlanKey) => {
    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan_key: planKey },
      });

      if (error) throw error;

      const sessionId = data?.sessionId as string | undefined;
      const redirectUrl = data?.url as string | undefined;

      if (sessionId && stripePromise) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error: redirectError } = await stripe.redirectToCheckout({ sessionId });
          if (redirectError) throw redirectError;
          return;
        }
      }

      if (redirectUrl) {
        window.location.assign(redirectUrl);
        return;
      }

      throw new Error("Unable to initialize checkout session");
    } catch (error: unknown) {
      console.error("pricing checkout:", error);
      toast.error(t("billing.checkoutFailed"));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Pricing — Independent Minds EDU"
        description="Choose the Independent Minds EDU plan that fits your homeschool workflow."
        path="/pricing"
      />

      <section className="container py-12 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-wide text-primary">
            <Sparkles size={14} />
            {t("pricing.trialBadge")}
          </p>
          <h1 className="font-display text-4xl font-bold">{t("pricing.title")}</h1>
          <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {sortedPlans.map((plan) => (
            <article
              key={plan.key}
              className={`rounded-2xl border p-6 bg-card shadow-sm flex flex-col ${plan.key === "plus" ? "border-primary ring-2 ring-primary/20" : ""}`}
            >
              <div className="space-y-1">
                <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                <p className="text-3xl font-bold">{plan.monthlyPrice}</p>
                <p className="text-xs text-muted-foreground">{plan.yearlyPriceHint}</p>
                <p className="text-sm text-muted-foreground">{plan.summary}</p>
              </div>

              <ul className="mt-5 space-y-2 flex-1">
                {plan.highlights.map((item) => (
                  <li key={item} className="text-sm flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-primary mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => startCheckout(plan.key)}
                className="mt-6 font-display"
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.key ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    {t("pricing.redirecting")}
                  </>
                ) : (
                  t("pricing.choosePlan")
                )}
              </Button>
            </article>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <Link className="underline" to="/billing">{t("billing.manageBilling")}</Link>
        </p>
      </section>
    </div>
  );
}