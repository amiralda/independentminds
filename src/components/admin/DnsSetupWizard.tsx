import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, RefreshCw, Copy, AlertTriangle } from "lucide-react";

const EXPECTED_A = "185.158.133.1";
const EXPECTED_TXT_PREFIX = "lovable_verify=";

type DohAnswer = { data: string };
type DohResponse = { Status: number; Answer?: DohAnswer[] };

async function doh(host: string, type: string): Promise<DohResponse> {
  const r = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`,
    { headers: { accept: "application/dns-json" } }
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

type StepState = "idle" | "checking" | "ok" | "fail";

interface StepResult {
  state: StepState;
  message: string;
  detail?: string;
}

interface Props {
  domain: string;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded bg-muted px-2 py-1.5 font-mono text-xs">
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="flex-1 break-all">{value}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label={`Copy ${label}`}
      >
        {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

function StatusBadge({ state }: { state: StepState }) {
  if (state === "ok")
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
      </Badge>
    );
  if (state === "fail")
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" /> Not yet
      </Badge>
    );
  if (state === "checking")
    return (
      <Badge variant="secondary">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Checking
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Circle className="h-3 w-3 mr-1" /> Not checked
    </Badge>
  );
}

export function DnsSetupWizard({ domain }: Props) {
  const [ns, setNs] = useState<StepResult>({ state: "idle", message: "" });
  const [aRoot, setARoot] = useState<StepResult>({ state: "idle", message: "" });
  const [aWww, setAWww] = useState<StepResult>({ state: "idle", message: "" });
  const [txt, setTxt] = useState<StepResult>({ state: "idle", message: "" });
  const [running, setRunning] = useState(false);

  const runAll = useCallback(async () => {
    setRunning(true);
    setNs({ state: "checking", message: "" });
    setARoot({ state: "checking", message: "" });
    setAWww({ state: "checking", message: "" });
    setTxt({ state: "checking", message: "" });

    // Step 1: NS delegation
    try {
      const r = await doh(domain, "NS");
      if (r.Status === 3) {
        setNs({ state: "fail", message: "NXDOMAIN — no nameservers delegated at the registry.", detail: "Fix this at your registrar first. Nothing downstream will work until the domain resolves." });
      } else if ((r.Answer ?? []).length === 0) {
        setNs({ state: "fail", message: "No NS records returned.", detail: "Add nameservers at your registrar." });
      } else {
        setNs({ state: "ok", message: `${r.Answer!.length} nameserver(s) delegated.`, detail: r.Answer!.map((a) => a.data).join(", ") });
      }
    } catch (e) {
      setNs({ state: "fail", message: "Lookup failed.", detail: e instanceof Error ? e.message : String(e) });
    }

    // Step 2: A root
    try {
      const r = await doh(domain, "A");
      const vals = (r.Answer ?? []).map((a) => a.data);
      if (r.Status === 3 || vals.length === 0) {
        setARoot({ state: "fail", message: "No A record found for the root domain.", detail: `Add A @ → ${EXPECTED_A}` });
      } else if (!vals.includes(EXPECTED_A)) {
        setARoot({ state: "fail", message: "A record does not match expected value.", detail: `Got: ${vals.join(", ")} — expected ${EXPECTED_A}` });
      } else {
        setARoot({ state: "ok", message: `Points to ${EXPECTED_A}.` });
      }
    } catch (e) {
      setARoot({ state: "fail", message: "Lookup failed.", detail: e instanceof Error ? e.message : String(e) });
    }

    // Step 3: A www
    try {
      const r = await doh(`www.${domain}`, "A");
      const vals = (r.Answer ?? []).map((a) => a.data);
      if (r.Status === 3 || vals.length === 0) {
        setAWww({ state: "fail", message: "No A record for www subdomain.", detail: `Add A www → ${EXPECTED_A}` });
      } else if (!vals.includes(EXPECTED_A)) {
        setAWww({ state: "fail", message: "www does not point to expected value.", detail: `Got: ${vals.join(", ")} — expected ${EXPECTED_A}` });
      } else {
        setAWww({ state: "ok", message: `www points to ${EXPECTED_A}.` });
      }
    } catch (e) {
      setAWww({ state: "fail", message: "Lookup failed.", detail: e instanceof Error ? e.message : String(e) });
    }

    // Step 4: TXT verify
    try {
      const r = await doh(`_lovable.${domain}`, "TXT");
      const vals = (r.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, ""));
      const match = vals.find((v) => v.startsWith(EXPECTED_TXT_PREFIX));
      if (!match) {
        setTxt({ state: "fail", message: "No _lovable TXT verification record found.", detail: `Add TXT _lovable → lovable_verify=… (value shown in Lovable → Project Settings → Domains).` });
      } else {
        setTxt({ state: "ok", message: "Verification TXT record present.", detail: match });
      }
    } catch (e) {
      setTxt({ state: "fail", message: "Lookup failed.", detail: e instanceof Error ? e.message : String(e) });
    }

    setRunning(false);
  }, [domain]);

  useEffect(() => {
    runAll();
  }, [runAll]);

  const allOk = ns.state === "ok" && aRoot.state === "ok" && aWww.state === "ok" && txt.state === "ok";

  const steps = [
    {
      n: 1,
      title: "Delegate the domain to nameservers",
      result: ns,
      body: (
        <>
          <p className="text-sm text-muted-foreground">
            Log in to the registrar where <span className="font-mono">{domain}</span> was purchased and confirm the domain has active nameservers.
            If the registration expired or was deleted, renew or re-register it — nothing below will work until this passes.
          </p>
        </>
      ),
    },
    {
      n: 2,
      title: "Add A record for the root domain",
      result: aRoot,
      body: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            At your DNS provider, create or update the root A record:
          </p>
          <CopyRow label="Type" value="A" />
          <CopyRow label="Name" value="@" />
          <CopyRow label="Value" value={EXPECTED_A} />
        </div>
      ),
    },
    {
      n: 3,
      title: "Add A record for www",
      result: aWww,
      body: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Add a second A record so <span className="font-mono">www.{domain}</span> resolves too:
          </p>
          <CopyRow label="Type" value="A" />
          <CopyRow label="Name" value="www" />
          <CopyRow label="Value" value={EXPECTED_A} />
        </div>
      ),
    },
    {
      n: 4,
      title: "Add Lovable verification TXT",
      result: txt,
      body: (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Copy the exact TXT value from Lovable → Project Settings → Domains and add:
          </p>
          <CopyRow label="Type" value="TXT" />
          <CopyRow label="Name" value="_lovable" />
          <CopyRow label="Value" value="lovable_verify=…" />
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="text-lg flex items-center gap-2">
          Guided setup
          {allOk && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              <CheckCircle2 className="h-3 w-3 mr-1" /> All checks passing
            </Badge>
          )}
        </CardTitle>
        <Button onClick={runAll} disabled={running} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
          Re-check
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {allOk && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            All DNS records are correctly configured for <span className="font-mono">{domain}</span>. Lovable's verification and SSL provisioning should complete automatically within a few minutes.
          </div>
        )}
        {steps.map((s) => (
          <div
            key={s.n}
            className={`rounded-md border p-4 ${
              s.result.state === "ok"
                ? "border-emerald-500/40 bg-emerald-500/5"
                : s.result.state === "fail"
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    s.result.state === "ok"
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {s.result.state === "ok" ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                </div>
                <div>
                  <div className="font-medium">{s.title}</div>
                  {s.result.message && (
                    <div
                      className={`text-xs mt-0.5 ${
                        s.result.state === "fail" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                      }`}
                    >
                      {s.result.message}
                    </div>
                  )}
                </div>
              </div>
              <StatusBadge state={s.result.state} />
            </div>
            <div className="mt-3 pl-10 space-y-2">
              {s.body}
              {s.result.detail && (
                <div className="text-xs font-mono text-muted-foreground break-all rounded bg-muted/50 px-2 py-1.5">
                  {s.result.detail}
                </div>
              )}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          DNS changes propagate in minutes on most providers but can take up to 72 hours. Click Re-check after saving records at your DNS provider.
        </p>
      </CardContent>
    </Card>
  );
}
