import { useState } from "react";
import { Mail } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
// Same template file the send jobs use (newsletter and welcome email): the
// preview is exactly the sent email.
import { renderNewsletterEmail, unsubscribePageUrl } from "../../../supabase/functions/_shared/newsletter-email";

/**
 * "Preview as email": renders the current title/content of the selected
 * language with the real newsletter template, in a sandboxed iframe (no
 * scripts; the admin app's CSS cannot leak in). Nothing is sent.
 */
export function EmailPreviewButton({
  title, markdown, lang, dirty, note,
}: { title: string; markdown: string; lang: Lang; dirty: boolean; note?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // Real recipients get their own single-use token; the preview shows the same
  // link with a placeholder token (it opens the page as "invalid link").
  const email = open ? renderNewsletterEmail({ title, markdown, language: lang, unsubscribeUrl: unsubscribePageUrl("preview", lang) }) : null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" data-testid="email-preview-open">
          <Mail className="h-4 w-4 me-1" /> {t("adminNews.previewEmail")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b space-y-1">
          <DialogTitle>{t("adminNews.previewEmail")}</DialogTitle>
          <DialogDescription>
            {note ?? t("adminNews.previewNote")}{dirty && <> <strong>{t("adminNews.previewUnsaved")}</strong></>}
          </DialogDescription>
        </DialogHeader>
        {email && (
          <>
            <div className="px-4 py-2 text-xs border-b bg-muted/40 space-y-0.5" data-testid="email-preview-meta">
              <div><span className="text-muted-foreground">{t("adminNews.previewFrom")}:</span> {email.from}</div>
              <div><span className="text-muted-foreground">{t("adminNews.previewSubject")}:</span> <strong dir="auto">{email.subject}</strong></div>
            </div>
            <iframe
              title={t("adminNews.previewEmail")}
              srcDoc={email.html}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              data-testid="email-preview-frame"
              className="w-full h-[70vh] bg-[#f4f4f5] border-0"
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
