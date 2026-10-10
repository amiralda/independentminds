import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BellOff, Loader2, Mail, PauseCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { fromDbLang } from "@/lib/languagePref";
import {
  PAUSE_OPTIONS,
  PREF_CATEGORIES,
  PREF_TOKEN_RE,
  addDays,
  effectiveState,
  formatResumeDate,
  haitiToday,
  isPrefCategory,
  type PrefKey,
  type PrefRow,
  type PrefState,
} from "@/lib/notificationPrefs";
import logo from "@/assets/logo.svg";

type Load = "loading" | "ready" | "invalid" | "error";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notification-preferences`;

/**
 * Public page behind the footer links of the family's automatic emails (no
 * login; the per-person token is the proof). Opening it never changes
 * anything — mail scanners open links — every change is a button that POSTs
 * to the `notification-preferences` edge function.
 */
export default function NotificationPreferences() {
  const { t, lang, setLang } = useI18n();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const fromCategory = isPrefCategory(params.get("category")) ? (params.get("category") as PrefKey) : null;

  const [load, setLoad] = useState<Load>(PREF_TOKEN_RE.test(token) ? "loading" : "invalid");
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<PrefRow[]>([]);
  const [busy, setBusy] = useState<PrefKey | null>(null);
  const today = haitiToday();

  // Show the page in the language the email was sent in.
  useEffect(() => {
    const l = fromDbLang(params.get("lang"));
    if (l) setLang(l);
  }, [params, setLang]);

  const call = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, data };
    },
    [token],
  );

  const refresh = useCallback(async () => {
    if (!PREF_TOKEN_RE.test(token)) return setLoad("invalid");
    setLoad("loading");
    try {
      const { status, data } = await call({});
      if (status === 404) return setLoad("invalid");
      if (status !== 200) return setLoad("error");
      setEmail(data.email ?? null);
      setRows(data.prefs ?? []);
      setLoad("ready");
    } catch {
      setLoad("error");
    }
  }, [call, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const change = async (category: PrefKey, state: PrefState, pausedUntil?: string) => {
    setBusy(category);
    try {
      const { status, data } = await call({ category, state, paused_until: pausedUntil });
      if (status === 404) return setLoad("invalid");
      if (status !== 200) throw new Error(String(status));
      setRows(data.prefs ?? []);
      toast.success(t("notifPrefs.saved"));
    } catch {
      toast.error(t("notifPrefs.saveError"));
    } finally {
      setBusy(null);
    }
  };

  const statusText = (key: PrefKey) => {
    const s = effectiveState(rows, key, today);
    if (s.state === "paused") return t("notifPrefs.state.paused").replace("{{date}}", formatResumeDate(s.resumes!, lang));
    return t(`notifPrefs.state.${s.state}`);
  };

  const Row = ({ k, highlight = false }: { k: PrefKey; highlight?: boolean }) => {
    const { state } = effectiveState(rows, k, today);
    const working = busy === k;
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "bg-card"}`}
        data-testid={`pref-row-${k}`}
        data-state={state}
      >
        <div className="min-w-0">
          <p className="font-medium text-sm">{t(`notifPrefs.cat.${k}`)}</p>
          <p className={`text-xs ${state === "on" ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}`}>{statusText(k)}</p>
        </div>
        <div className="flex items-center gap-2">
          {working && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {state === "on" ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!!busy} data-testid={`pref-pause-${k}`}>
                    <PauseCircle className="h-4 w-4 me-1" />
                    {t("notifPrefs.pause")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {PAUSE_OPTIONS.map((o) => (
                    <DropdownMenuItem key={o.key} onSelect={() => change(k, "paused", addDays(today, o.days))}>
                      {t(o.key)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={!!busy} onClick={() => change(k, "off")} data-testid={`pref-stop-${k}`}>
                <BellOff className="h-4 w-4 me-1" />
                {t("notifPrefs.stop")}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" disabled={!!busy} onClick={() => change(k, "on")} data-testid={`pref-on-${k}`}>
              {t("notifPrefs.turnOn")}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const masterBlocks = effectiveState(rows, "all", today).state !== "on";

  return (
    <main className="min-h-screen flex items-start sm:items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-xl rounded-xl border bg-background p-6 sm:p-8 space-y-5 shadow-sm" data-testid="notif-prefs-card" data-load={load}>
        <div className="text-center space-y-2">
          <img src={logo} alt="Independent Minds EDU" className="w-12 h-12 mx-auto" />
          <h1 className="text-xl font-display font-semibold">{t("notifPrefs.title")}</h1>
          {load === "ready" && email && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Mail className="h-4 w-4" />
              {t("notifPrefs.for").replace("{{email}}", email)}
            </p>
          )}
        </div>

        {load === "loading" && <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />}

        {load === "invalid" && (
          <div className="text-center space-y-4" data-testid="notif-prefs-invalid">
            <XCircle className="h-10 w-10 mx-auto text-destructive" />
            <p>{t("notifPrefs.invalid")}</p>
            <Button asChild className="w-full">
              <a href="/login">{t("notifPrefs.signIn")}</a>
            </Button>
          </div>
        )}

        {load === "error" && (
          <div className="text-center space-y-4" data-testid="notif-prefs-error">
            <XCircle className="h-10 w-10 mx-auto text-destructive" />
            <p>{t("notifPrefs.error")}</p>
            <Button onClick={refresh} className="w-full">{t("notifPrefs.retry")}</Button>
          </div>
        )}

        {load === "ready" && (
          <div className="space-y-4">
            {fromCategory && (
              <section className="space-y-2">
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("notifPrefs.fromEmail")}</h2>
                <Row k={fromCategory} highlight />
              </section>
            )}
            <section className="space-y-2">
              <Row k="all" />
              {masterBlocks && (
                <p className="text-xs text-amber-700 dark:text-amber-400 px-1" data-testid="notif-prefs-master-note">{t("notifPrefs.allBlocks")}</p>
              )}
              {PREF_CATEGORIES.filter((c) => c !== fromCategory).map((c) => (
                <Row key={c} k={c} />
              ))}
            </section>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">{t("notifPrefs.note")}</p>
        <p className="text-center">
          <a href="/" className="text-sm underline text-primary">{t("unsubscribe.home")}</a>
        </p>
      </div>
    </main>
  );
}
