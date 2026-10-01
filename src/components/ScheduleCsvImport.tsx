// Bulk schedule import for parents.
//
// Two paths behind one button:
//   1. The file parses deterministically (recognised columns) -> instant, free.
//   2. It does not -> the extract-schedule Edge Function (AI) reads it, which
//      handles PDFs, images, odd spreadsheets and free text.
// Either way the parent sees every row in a preview and confirms before
// anything is written. Nothing is inserted from this component without that
// confirmation.

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, Download, Sparkles, Loader2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  parseScheduleCsv, toDbRows, buildTemplateCsv,
  type ParseResult, type ParsedRow, type ExistingBlock,
} from "@/lib/scheduleCsv";

/** t() has no params, so fill {{placeholders}} here (project convention). */
function fillParams(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.split(`{{${k}}}`).join(String(v)),
    text,
  );
}

const TEXT_EXT = /\.(csv|tsv|txt)$/i;

interface Props {
  studentId: string;
  /** Subjects the parent normally uses; an unknown one is only a warning. */
  knownSubjects?: string[];
  /** Blocks already on the schedule, so duplicates can be flagged. */
  existing?: ExistingBlock[];
  /** Called after a successful insert so the caller can refetch. */
  onImported?: (count: number) => void;
}

export function ScheduleCsvImport({ studentId, knownSubjects, existing, onImported }: Props) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [dayFirst, setDayFirst] = useState(false);
  const [source, setSource] = useState<"csv" | "ai">("csv");
  const [busy, setBusy] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const reset = () => {
    setFileName(""); setRawText(null); setResult(null);
    setDayFirst(false); setSource("csv"); setBusy(false); setInserting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runCsv = (text: string, useDayFirst: boolean): ParseResult =>
    parseScheduleCsv(text, { today, knownSubjects, existing, dayFirst: useDayFirst });

  /** Ask the AI function to read a file the deterministic parser could not. */
  const runAi = async (file: File): Promise<ParseResult | null> => {
    const isText = TEXT_EXT.test(file.name);
    let content: string;
    if (isText) {
      content = await file.text();
    } else {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      // Chunked to avoid blowing the argument limit on large files.
      for (let i = 0; i < buf.length; i += 8192) {
        binary += String.fromCharCode(...buf.subarray(i, i + 8192));
      }
      content = btoa(binary);
    }

    const { data, error } = await supabase.functions.invoke("extract-schedule", {
      body: {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        content,
        isBase64: !isText,
        startDate: today,
      },
    });

    if (error) {
      toast.error(t("scheduleCsv.aiFailed"));
      return null;
    }
    const schedule = Array.isArray(data?.schedule) ? data.schedule : [];
    if (schedule.length === 0) {
      toast.error(t("scheduleCsv.aiEmpty"));
      return null;
    }

    // Re-run the AI output through the same validator, so the preview, the
    // messages and the insert path are identical for both sources.
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\r\n]/.test(s) ? `"${s.split('"').join('""')}"` : s;
    };
    const csv = ["date,subject,start_time,end_time,notes"]
      .concat(schedule.map((r: Record<string, unknown>) =>
        [r.date, r.subject, r.start_time, r.end_time, r.notes].map(esc).join(",")))
      .join("\r\n");

    setRawText(csv);
    return runCsv(csv, false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setFileName(file.name);

    try {
      if (TEXT_EXT.test(file.name)) {
        const text = await file.text();
        const parsed = runCsv(text, false);
        if (parsed.fatal.length === 0) {
          setRawText(text);
          setResult(parsed);
          setSource("csv");
          setOpen(true);
          return;
        }
        // Columns were not recognised: let the AI try the same file.
        toast.info(t("scheduleCsv.fallingBackToAi"));
      }
      const aiResult = await runAi(file);
      if (aiResult) {
        setResult(aiResult);
        setSource("ai");
        setOpen(true);
      } else {
        reset();
      }
    } catch {
      toast.error(t("scheduleCsv.readFailed"));
      reset();
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleDayFirst = (next: boolean) => {
    setDayFirst(next);
    if (rawText) setResult(runCsv(rawText, next));
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv(today)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ime-schedule-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmImport = async () => {
    if (!result) return;
    const rows = toDbRows(result.rows, studentId);
    if (rows.length === 0) return;

    setInserting(true);
    const { error } = await supabase.from("daily_plan").insert(rows);
    setInserting(false);

    if (error) {
      toast.error(`${t("scheduleCsv.insertFailed")} ${error.message}`);
      return;
    }
    toast.success(fillParams(t("scheduleCsv.imported"), { count: rows.length }));
    onImported?.(rows.length);
    setOpen(false);
    reset();
  };

  const importable = result ? result.validCount + result.warningCount : 0;

  const rowIcon = (r: ParsedRow) => {
    if (r.severity === "error") return <XCircle className="h-4 w-4 text-destructive" aria-hidden />;
    if (r.severity === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden />;
    return <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden />;
  };

  const rowClass = (r: ParsedRow) =>
    r.severity === "error" ? "bg-destructive/10"
      : r.severity === "warning" ? "bg-yellow-500/10"
        : "";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => fileInputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden /> : <Upload className="h-4 w-4 mr-1" aria-hidden />}
          {t("schedule.bulkUpload")}
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-1" aria-hidden />
          {t("scheduleCsv.downloadTemplate")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt,.pdf,.png,.jpg,.jpeg,.webp,.xlsx"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); reset(); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("scheduleCsv.previewTitle")}</DialogTitle>
          </DialogHeader>

          {result && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {fileName}
                {source === "ai" && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {t("scheduleCsv.readByAi")}
                  </span>
                )}
              </p>

              <p className="text-sm font-medium">
                {fillParams(t("scheduleCsv.summary"), {
                  valid: result.validCount,
                  warnings: result.warningCount,
                  errors: result.errorCount,
                })}
              </p>

              {result.ambiguousDateCount > 0 && (
                <div className="flex items-start gap-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600 shrink-0" aria-hidden />
                  <div className="space-y-2">
                    <p className="text-sm">
                      {fillParams(t("scheduleCsv.ambiguousDates"), { count: result.ambiguousDateCount })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Switch id="day-first" checked={dayFirst} onCheckedChange={toggleDayFirst} />
                      <Label htmlFor="day-first" className="text-sm">{t("scheduleCsv.dayFirst")}</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-h-[45vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead className="w-14">{t("scheduleCsv.col.line")}</TableHead>
                      <TableHead>{t("scheduleCsv.col.date")}</TableHead>
                      <TableHead>{t("scheduleCsv.col.subject")}</TableHead>
                      <TableHead>{t("scheduleCsv.col.time")}</TableHead>
                      <TableHead>{t("scheduleCsv.col.problems")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((r) => (
                      <TableRow key={r.line} className={rowClass(r)}>
                        <TableCell>{rowIcon(r)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.line}</TableCell>
                        <TableCell className="text-sm">{r.date || "—"}</TableCell>
                        <TableCell className="text-sm">{r.subject || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {r.start_time && r.end_time ? `${r.start_time}–${r.end_time}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.messages.length === 0
                            ? "—"
                            : r.messages.map((m, i) => (
                              <div key={i}>{fillParams(t(m.key), m.params)}</div>
                            ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {result.errorCount > 0 && (
                <p className="text-xs text-muted-foreground">{t("scheduleCsv.errorsSkipped")}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }} disabled={inserting}>
              {t("action.cancel")}
            </Button>
            <Button onClick={confirmImport} disabled={importable === 0 || inserting}>
              {inserting && <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden />}
              {fillParams(t("scheduleCsv.importN"), { count: importable })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
