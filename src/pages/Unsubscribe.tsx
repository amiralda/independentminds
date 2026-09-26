import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { fromDbLang } from "@/lib/languagePref";
import logo from "@/assets/logo.svg";

type State = "confirm" | "working" | "unsubscribed" | "already_used" | "invalid" | "error";

/**
 * Public page behind the newsletter "Unsubscribe" link (no login).
 * Opening the link never unsubscribes by itself (mail scanners open links);
 * the person confirms with the button, which POSTs the single-use token to
 * the `unsubscribe` edge function.
 */
export default function Unsubscribe() {
  const { t, setLang } = useI18n();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>(/^[A-Za-z0-9_-]{20,100}$/.test(token) ? "confirm" : "invalid");

  // Show the page in the language the email was sent in.
  useEffect(() => {
    const l = fromDbLang(params.get("lang"));
    if (l) setLang(l);
  }, [params, setLang]);

  const confirm = async () => {
    setState("working");
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      setState(["unsubscribed", "already_used", "invalid"].includes(body.status) ? body.status : "error");
    } catch {
      setState("error");
    }
  };

  const message: Record<Exclude<State, "confirm" | "working">, { icon: JSX.Element; text: string }> = {
    unsubscribed: { icon: <CheckCircle2 className="h-10 w-10 text-emerald-600" />, text: t("unsubscribe.done") },
    already_used: { icon: <CheckCircle2 className="h-10 w-10 text-emerald-600" />, text: t("unsubscribe.alreadyUsed") },
    invalid: { icon: <XCircle className="h-10 w-10 text-destructive" />, text: t("unsubscribe.invalid") },
    error: { icon: <XCircle className="h-10 w-10 text-destructive" />, text: t("unsubscribe.error") },
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 text-center space-y-5 shadow-sm" data-testid="unsubscribe-card" data-state={state}>
        <img src={logo} alt="Independent Minds EDU" className="w-12 h-12 mx-auto" />
        <h1 className="text-xl font-display font-semibold">{t("unsubscribe.title")}</h1>
        {state === "confirm" || state === "working" ? (
          <>
            <MailX className="h-10 w-10 mx-auto text-muted-foreground" />
            <p>{t("unsubscribe.question")}</p>
            <Button onClick={confirm} disabled={state === "working"} className="w-full" data-testid="unsubscribe-confirm">
              {state === "working" && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("unsubscribe.confirm")}
            </Button>
          </>
        ) : (
          <>
            <div className="flex justify-center">{message[state].icon}</div>
            <p data-testid="unsubscribe-result">{message[state].text}</p>
          </>
        )}
        <p className="text-xs text-muted-foreground">{t("unsubscribe.note")}</p>
        <a href="/" className="text-sm underline text-primary">{t("unsubscribe.home")}</a>
      </div>
    </main>
  );
}
