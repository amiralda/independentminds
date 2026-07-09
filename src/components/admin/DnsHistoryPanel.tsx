import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface DnsHistoryRow {
  id: string;
  domain: string;
  status: string;
  previous_status: string | null;
  status_changed: boolean;
  a_records: string[];
  txt_records: string[];
  details: string | null;
  checked_at: string;
}

const STATUS_TONE: Record<string, string> = {
  ok: "bg-emerald-600 hover:bg-emerald-600 text-white",
  nxdomain: "bg-red-600 hover:bg-red-600 text-white",
  a_mismatch: "bg-amber-500 hover:bg-amber-500 text-white",
  txt_missing: "bg-amber-500 hover:bg-amber-500 text-white",
  degraded: "bg-orange-600 hover:bg-orange-600 text-white",
  unreachable: "bg-slate-500 hover:bg-slate-500 text-white",
};

function statusBadge(status: string) {
  return (
    <Badge className={STATUS_TONE[status] ?? "bg-slate-600 text-white"}>
      {status}
    </Badge>
  );
}

interface Props {
  domain: string;
}

export function DnsHistoryPanel({ domain }: Props) {
  const [rows, setRows] = useState<DnsHistoryRow[]>([]);
  const [changesOnly, setChangesOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstNx, setFirstNx] = useState<DnsHistoryRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("dns_monitor_history" as unknown)
      .select("*")
      .eq("domain", domain)
      .order("checked_at", { ascending: false })
      .limit(200);
    if (changesOnly) q = q.eq("status_changed", true);
    const { data } = (await q) as unknown;
    setRows((data as DnsHistoryRow[]) ?? []);

    const { data: nx } = (await supabase
      .from("dns_monitor_history" as unknown)
      .select("*")
      .eq("domain", domain)
      .eq("status", "nxdomain")
      .eq("status_changed", true)
      .order("checked_at", { ascending: true })
      .limit(1)) as unknown;
    setFirstNx(((nx as DnsHistoryRow[]) ?? [])[0] ?? null);
    setLoading(false);
  }, [domain, changesOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <CardTitle className="text-lg">Check History</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={changesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setChangesOnly((v) => !v)}
          >
            {changesOnly ? "Showing changes only" : "Show all checks"}
          </Button>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {firstNx && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm">
            <div className="font-medium text-red-700 dark:text-red-400">
              First NXDOMAIN detected
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(firstNx.checked_at), "PPpp")} ·{" "}
              {formatDistanceToNow(new Date(firstNx.checked_at), { addSuffix: true })}
            </div>
            {firstNx.previous_status && (
              <div className="text-xs mt-1">
                Transitioned from <span className="font-mono">{firstNx.previous_status}</span> →{" "}
                <span className="font-mono font-semibold">nxdomain</span>
              </div>
            )}
          </div>
        )}

        {rows.length === 0 && !loading && (
          <div className="text-sm text-muted-foreground italic">
            No history yet. The scheduled monitor runs every 15 minutes.
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className={`rounded-md border p-3 text-sm ${
                r.status_changed ? "border-amber-500/50 bg-amber-500/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.status_changed && r.previous_status ? (
                    <div className="flex items-center gap-1">
                      {statusBadge(r.previous_status)}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {statusBadge(r.status)}
                    </div>
                  ) : (
                    statusBadge(r.status)
                  )}
                  {r.status_changed && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      status change
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(r.checked_at), "MMM d, HH:mm:ss")} ·{" "}
                  {formatDistanceToNow(new Date(r.checked_at), { addSuffix: true })}
                </div>
              </div>
              {r.details && (
                <div className="text-xs text-muted-foreground mt-2">{r.details}</div>
              )}
              <div className="grid gap-1 mt-2 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground">A: </span>
                  {r.a_records.length ? r.a_records.join(", ") : "(none)"}
                </div>
                <div>
                  <span className="text-muted-foreground">TXT: </span>
                  {r.txt_records.length ? r.txt_records.join(", ") : "(none)"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
