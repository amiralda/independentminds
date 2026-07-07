import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { DnsHistoryPanel } from "@/components/admin/DnsHistoryPanel";

const DEFAULT_DOMAIN = "independentmindsedu.com";
const EXPECTED_A = "185.158.133.1";

type DohAnswer = { name: string; type: number; TTL: number; data: string };
type DohResponse = {
  Status: number;
  Answer?: DohAnswer[];
  Authority?: DohAnswer[];
  Comment?: string;
};

type RecordResult = {
  label: string;
  host: string;
  type: string;
  status: number | null;
  answers: DohAnswer[];
  error?: string;
};

const RECORD_TYPES = [
  { label: "Root A", type: "A", sub: "" },
  { label: "www A", type: "A", sub: "www" },
  { label: "NS", type: "NS", sub: "" },
  { label: "SOA", type: "SOA", sub: "" },
  { label: "Lovable TXT", type: "TXT", sub: "_lovable" },
  { label: "MX", type: "MX", sub: "" },
];

async function query(host: string, type: string): Promise<DohResponse> {
  const r = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=${type}`,
    { headers: { accept: "application/dns-json" } }
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function statusLabel(status: number | null): { text: string; tone: "ok" | "warn" | "err" | "idle" } {
  if (status === null) return { text: "Pending", tone: "idle" };
  if (status === 0) return { text: "OK (NOERROR)", tone: "ok" };
  if (status === 3) return { text: "NXDOMAIN", tone: "err" };
  return { text: `Status ${status}`, tone: "warn" };
}

export default function AdminDnsStatus() {
  const [domain, setDomain] = useState(DEFAULT_DOMAIN);
  const [input, setInput] = useState(DEFAULT_DOMAIN);
  const [results, setResults] = useState<RecordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const run = useCallback(async (d: string) => {
    setLoading(true);
    const out: RecordResult[] = [];
    await Promise.all(
      RECORD_TYPES.map(async (r, i) => {
        const host = r.sub ? `${r.sub}.${d}` : d;
        try {
          const res = await query(host, r.type);
          out[i] = {
            label: r.label,
            host,
            type: r.type,
            status: res.Status,
            answers: res.Answer ?? [],
          };
        } catch (e) {
          out[i] = {
            label: r.label,
            host,
            type: r.type,
            status: null,
            answers: [],
            error: e instanceof Error ? e.message : "lookup failed",
          };
        }
      })
    );
    setResults(out);
    setCheckedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    run(domain);
  }, [domain, run]);

  const rootA = results.find((r) => r.label === "Root A");
  const ns = results.find((r) => r.label === "NS");
  const txt = results.find((r) => r.label === "Lovable TXT");

  const overallOk = rootA?.status === 0 && rootA.answers.some((a) => a.data === EXPECTED_A);
  const nxdomain = ns?.status === 3 || rootA?.status === 3;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-display font-semibold">DNS Status</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live DNS lookups via Google Public DNS (DoH). Checks whether the custom domain resolves
          and whether the expected Lovable records are in place.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-lg">
            Domain check
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : overallOk ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolving
              </Badge>
            ) : nxdomain ? (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" /> NXDOMAIN
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 mr-1" /> Misconfigured
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-64"
              placeholder="example.com"
            />
            <Button
              variant="secondary"
              onClick={() => setDomain(input.trim().toLowerCase())}
              disabled={loading || !input.trim()}
            >
              Check
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => run(domain)}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-1">
            <div>
              <span className="text-muted-foreground">Domain:</span>{" "}
              <span className="font-mono">{domain}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Expected A record:</span>{" "}
              <span className="font-mono">{EXPECTED_A}</span>
            </div>
            {checkedAt && (
              <div className="text-xs text-muted-foreground">
                Checked {checkedAt.toLocaleTimeString()}
              </div>
            )}
          </div>

          {nxdomain && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">
              The domain returns NXDOMAIN at the registry. This usually means the registration
              expired, was deleted, or has no nameservers delegated. Check the registrar first —
              A/TXT records cannot help until delegation is restored.
            </div>
          )}
          {!nxdomain && rootA && rootA.status === 0 && !overallOk && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
              Domain resolves, but the A record does not point to {EXPECTED_A}. Update the A record
              at your DNS provider.
            </div>
          )}
          {!nxdomain && !txt?.answers.length && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
              No <span className="font-mono">_lovable</span> TXT record detected. Lovable domain
              verification requires it.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((r) => {
          const s = statusLabel(r.status);
          return (
            <Card key={r.label}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{r.label}</span>
                  <Badge
                    variant={
                      s.tone === "ok"
                        ? "default"
                        : s.tone === "err"
                          ? "destructive"
                          : "secondary"
                    }
                    className={s.tone === "ok" ? "bg-emerald-600 hover:bg-emerald-600" : ""}
                  >
                    {s.text}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="text-xs text-muted-foreground font-mono">
                  {r.type} {r.host}
                </div>
                {r.error && <div className="text-destructive text-xs">{r.error}</div>}
                {r.answers.length > 0 ? (
                  <ul className="space-y-1">
                    {r.answers.map((a, i) => (
                      <li
                        key={i}
                        className="font-mono text-xs break-all rounded bg-muted px-2 py-1"
                      >
                        {a.data}
                        <span className="text-muted-foreground ml-2">TTL {a.TTL}s</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !r.error && (
                    <div className="text-xs text-muted-foreground italic">No records returned</div>
                  )
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DnsHistoryPanel domain={domain} />
    </div>
  );
}
