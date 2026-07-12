import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Link } from "react-router-dom";
import { ArrowLeft, Receipt } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function RefundPolicy() {
  const { t } = useI18n();

  const sections = [
    {
      title: t("refund.section.overview.title"),
      content: [t("refund.section.overview.body")],
    },
    {
      title: t("refund.section.firstPayment.title"),
      content: [t("refund.section.firstPayment.body")],
    },
    {
      title: t("refund.section.cancellation.title"),
      content: [t("refund.section.cancellation.body")],
    },
    {
      title: t("refund.section.contact.title"),
      content: [t("refund.section.contact.body")],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t("refund.title")} — Independent Minds EDU`}
        description={t("refund.description")}
        path="/refund"
      />
      <header className="sticky top-0 z-50 bg-primary shadow-md">
        <div className="container py-3 flex items-center justify-between">
          <Link to="/login" className="text-primary-foreground/70 hover:text-primary-foreground p-1" aria-label="Back to login">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-lg font-bold text-primary-foreground">
            {t("refund.title")}
          </h1>
          <LanguageToggle variant="dark" />
        </div>
      </header>

      <main id="main-content" className="container max-w-2xl py-8 px-4 space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <Receipt size={28} className="text-primary" />
          <div>
            <h2 className="font-display text-2xl font-bold" style={{ color: "#1A365D" }}>
              {t("refund.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("refund.lastUpdated")}
            </p>
          </div>
        </div>

        {sections.map((section, index) => (
          <section key={section.title} className="space-y-3">
            <h3 className="font-display text-lg font-semibold" style={{ color: "#1A365D" }}>
              {index + 1}. {section.title}
            </h3>
            <div className="text-sm text-foreground/80 leading-relaxed space-y-2">
              {section.content.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          <p>Independent Minds EDU — Built with Love by KòdLabo</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:underline" style={{ color: "#D4A017" }}>
              {t("privacy.title")}
            </Link>
            <Link to="/terms" className="hover:underline" style={{ color: "#D4A017" }}>
              {t("terms.title")}
            </Link>
            <Link to="/login" className="hover:underline" style={{ color: "#D4A017" }}>
              Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}