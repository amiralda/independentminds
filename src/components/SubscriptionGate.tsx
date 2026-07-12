import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CreditCard } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

interface SubscriptionGateProps {
  children: ReactNode;
  featureLabel: string;
}

export function SubscriptionGate({ children, featureLabel }: SubscriptionGateProps) {
  const { t } = useI18n();
  const subscription = useSubscription();

  const showPastDueBanner = subscription.isPastDue && subscription.isActive;

  if (!subscription.isActive) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold">
              {t("billing.gateLockedTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("billing.gateLockedBody")} {featureLabel}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="font-display">
            <Link to="/pricing">
              {t("billing.upgradeCta")}
              <ArrowUpRight size={14} className="ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="font-display">
            <Link to="/billing">{t("billing.manageBilling")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showPastDueBanner && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">{t("billing.paymentIssueTitle")}</p>
              <p className="text-sm">{t("billing.paymentIssueBody")}</p>
              <Link to="/billing" className="text-sm underline font-medium">
                {t("billing.updateBillingCta")}
              </Link>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
