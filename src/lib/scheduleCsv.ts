// Flexible schedule import: turns a parent's file into daily_plan rows.
//
// Parents do not write files in one fixed shape, so this module does not ask
// them to. It reads real-world CSV (quotes, embedded commas/newlines, CRLF,
// BOM, comma/semicolon/tab separators), recognises column names by synonym in
// several languages, accepts several date and time formats, and reports every
// problem per row instead of failing the whole file on the first bad line.
//
// Anything it cannot recognise is handed to the extract-schedule Edge Function
// (AI) by the caller; this module only covers the deterministic path.

import { composeTitle } from "./dailyPlan";

export const MAX_ROWS = 500;
export const MAX_BYTES = 1024 * 1024; // 1 MB

/** Canonical fields we need out of whatever the parent's file calls them. */
export type CanonicalField = "date" | "subject" | "start_time" | "end_time" | "notes";

/**
 * Column-name synonyms, lowercased and stripped of punctuation/accents.
 * Order matters only for reporting; matching is exact against this set.
 */
const COLUMN_SYNONYMS: Record<CanonicalField, string[]> = {
  date: [
    "date", "plandate", "planneddate", "day", "dat", "jou", "datum",
    "fecha", "dia", "jour", "scheduledate", "when", "calendardate",
  ],
  subject: [
    "subject", "matyè", "matye", "matiere", "materia", "course", "class",
    "kou", "klas", "topic", "sijè", "sije", "asignatura", "fach", "lesson",
  ],
  start_time: [
    "starttime", "start", "from", "begin", "begintime", "koumanse", "kòmanse",
    "komanse", "debut", "début", "horadeinicio", "inicio", "timestart", "time",
  ],
  end_time: [
    "endtime", "end", "to", "finish", "finishtime", "fini", "fin",
    "horadefin", "termina", "timeend", "until",
  ],
  notes: [
    "notes", "note", "nòt", "not", "comment", "comments", "remarks",
    "detail", "details", "description", "teacher", "room", "pwofese",
    "observacion", "observaciones", "bemerkung",
  ],
};

/** Lowercase, strip accents, drop everything that is not a-z0-9. */
export function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Build reverse lookup once. Synonyms are normalized the same way as headers so
// "Start Time", "start_time" and "START-TIME" all land on start_time.
const FIELD_BY_HEADER = new Map<string, CanonicalField>();
for (const [field, synonyms] of Object.entries(COLUMN_SYNONYMS) as [CanonicalField, string[]][]) {
  for (const s of synonyms) {
    const key = normalizeHeader(s);
    if (!FIELD_BY_HEADER.has(key)) FIELD_BY_HEADER.set(key, field);
  }
}

/* ------------------------------------------------------------------ parsing */

/** Pick the separator by counting candidates outside quotes on the first line. */
export function detectSeparator(firstLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const sep of candidates) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        if (inQuotes && firstLine[i + 1] === '"') { i++; continue; }
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        count++;
      }
    }
    if (count > bestCount) { best = sep; bestCount = count; }
  }
  return best;
}

/**
 * RFC 4180 parser. Handles quoted fields, "" escapes, separators and newlines
 * inside quotes, CRLF, and a leading UTF-8 BOM. Blank lines are dropped.
 */
export function parseCsv(text: string, separator?: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  if (!clean.trim()) return [];

  const firstLineEnd = clean.search(/\r?\n/);
  const firstLine = firstLineEnd === -1 ? clean : clean.slice(0, firstLineEnd);
  const sep = separator ?? detectSeparator(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endField = () => { row.push(field); field = ""; };
  const endRow = () => {
    endField();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === sep) { endField(); continue; }
    if (ch === "\r") { if (clean[i + 1] === "\n") i++; endRow(); continue; }
    if (ch === "\n") { endRow(); continue; }
    field += ch;
  }
  if (field !== "" || row.length > 0) endRow();

  return rows.map((r) => r.map((c) => c.trim()));
}

/** Map a header row to canonical fields. Unknown headers map to undefined. */
export function detectColumns(headers: string[]): (CanonicalField | undefined)[] {
  const used = new Set<CanonicalField>();
  return headers.map((h) => {
    const field = FIELD_BY_HEADER.get(normalizeHeader(h));
    // "time" is a start_time synonym; if start_time is already taken treat a
    // second time-ish column as end_time rather than silently overwriting.
    if (field === "start_time" && used.has("start_time") && !used.has("end_time")) {
      used.add("end_time");
      return "end_time";
    }
    if (field && !used.has(field)) { used.add(field); return field; }
    if (field) return undefined; // duplicate column, ignore the later one
    return undefined;
  });
}

/* --------------------------------------------------------- dates and times */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, janvier: 1, janvye: 1, enero: 1,
  feb: 2, february: 2, fevrier: 2, fevriye: 2, febrero: 2,
  mar: 3, march: 3, mars: 3, mas: 3, marzo: 3,
  apr: 4, april: 4, avril: 4, avril_ht: 4, abril: 4,
  may: 5, mai: 5, me: 5, mayo: 5,
  jun: 6, june: 6, juin: 6, jen: 6, junio: 6,
  jul: 7, july: 7, juillet: 7, jiye: 7, julio: 7,
  aug: 8, august: 8, aout: 8, out: 8, agosto: 8,
  sep: 9, sept: 9, september: 9, septembre: 9, septanm: 9, septiembre: 9,
  oct: 10, october: 10, octobre: 10, oktob: 10, octubre: 10,
  nov: 11, november: 11, novembre: 11, novanm: 11, noviembre: 11,
  dec: 12, december: 12, decembre: 12, desanm: 12, diciembre: 12,
};

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * True when a numeric date could be read either way, e.g. 05/10/2026 is
 * May 10 in US order and 5 October in day-first order. The UI uses this to
 * offer the parent a day-first switch instead of silently guessing.
 */
export function isAmbiguousNumericDate(raw: string): boolean {
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec((raw || "").trim());
  if (!m) return false;
  const [a, b] = [+m[1], +m[2]];
  return a >= 1 && a <= 12 && b >= 1 && b <= 12 && a !== b;
}

/**
 * Accepts YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, MM-DD-YYYY, M/D/YY,
 * "5 Oct 2026", "Oct 5 2026", "Oct 5". A purely numeric date is read in US
 * MM/DD order unless dayFirst is set, which reads it as DD/MM (the order most
 * of the platform's languages use). A missing year falls back to fallbackYear.
 * Returns "" if unusable.
 */
export function parseFlexibleDate(raw: string, fallbackYear: number, dayFirst = false): string {
  const v = (raw || "").trim();
  if (!v) return "";

  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(v);
  if (m) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return isRealDate(y, mo, d) ? iso(y, mo, d) : "";
  }

  // MM/DD/YYYY (US) or DD/MM/YYYY when dayFirst is set
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(v);
  if (m) {
    let y = +m[3];
    if (y < 100) y += y < 70 ? 2000 : 1900;
    const first = +m[1];
    const second = +m[2];
    let mo = dayFirst ? second : first;
    let d = dayFirst ? first : second;
    // One order may be impossible (e.g. 25/12): fall back to the other rather
    // than rejecting a date the parent clearly meant.
    if (!isRealDate(y, mo, d) && isRealDate(y, d, mo)) { [mo, d] = [d, mo]; }
    return isRealDate(y, mo, d) ? iso(y, mo, d) : "";
  }

  // 5 Oct 2026 / 5 October / 5-Oct-2026
  m = /^(\d{1,2})[\s\-.]+([A-Za-zÀ-ÿ]+)\.?(?:[\s\-,.]+(\d{2}|\d{4}))?$/.exec(v);
  if (m) {
    const mo = MONTHS[normalizeHeader(m[2])];
    if (mo) {
      let y = m[3] ? +m[3] : fallbackYear;
      if (y < 100) y += y < 70 ? 2000 : 1900;
      const d = +m[1];
      return isRealDate(y, mo, d) ? iso(y, mo, d) : "";
    }
  }

  // Oct 5 2026 / October 5, 2026 / Oct 5
  m = /^([A-Za-zÀ-ÿ]+)\.?[\s\-.]+(\d{1,2})(?:[\s\-,.]+(\d{2}|\d{4}))?$/.exec(v);
  if (m) {
    const mo = MONTHS[normalizeHeader(m[1])];
    if (mo) {
      let y = m[3] ? +m[3] : fallbackYear;
      if (y < 100) y += y < 70 ? 2000 : 1900;
      const d = +m[2];
      return isRealDate(y, mo, d) ? iso(y, mo, d) : "";
    }
  }

  return "";
}

/**
 * Accepts HH:MM, H:MM, "1:30 PM", "1.30pm", "0830", "8h30". Returns HH:MM
 * on a 24-hour clock, or "" if unusable.
 */
export function parseFlexibleTime(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";

  const ampm = /(a\.?m\.?|p\.?m\.?)\s*$/i.exec(v);
  const meridiem = ampm ? ampm[1].toLowerCase().replace(/\./g, "") : "";
  const core = (ampm ? v.slice(0, ampm.index) : v).trim();

  let h: number;
  let min: number;

  let m = /^(\d{1,2})\s*[:.hH]\s*(\d{2})$/.exec(core);
  if (m) { h = +m[1]; min = +m[2]; }
  else if ((m = /^(\d{1,2})$/.exec(core))) { h = +m[1]; min = 0; }
  else if ((m = /^(\d{3,4})$/.exec(core))) {
    const s = m[1].padStart(4, "0");
    h = +s.slice(0, 2); min = +s.slice(2);
  }
  else return "";

  if (meridiem === "pm" && h < 12) h += 12;
  if (meridiem === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return "";

  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/* ------------------------------------------------------------- validation */

export type RowSeverity = "valid" | "warning" | "error";

export interface ParsedRow {
  /** 1-based line number in the file as the parent sees it (header = line 1). */
  line: number;
  date: string;
  subject: string;
  start_time: string;
  end_time: string;
  notes: string;
  severity: RowSeverity;
  /** i18n keys plus params, so the UI renders them in the parent's language. */
  messages: { key: string; params?: Record<string, string | number> }[];
}

export interface ParseResult {
  rows: ParsedRow[];
  /** Fatal problems that stop the whole file (missing columns, too big...). */
  fatal: { key: string; params?: Record<string, string | number> }[];
  /** Which canonical field each column was recognised as. */
  mapping: { header: string; field: CanonicalField | undefined }[];
  validCount: number;
  warningCount: number;
  errorCount: number;
  /**
   * Numeric dates that would land on a different day in the other order.
   * When above zero the UI must offer the day-first switch.
   */
  ambiguousDateCount: number;
}

export interface ExistingBlock {
  date: string;
  subject: string;
  start_time: string;
}

export interface ParseOptions {
  /** Today, as YYYY-MM-DD. Used for the "date in the past" warning and year fallback. */
  today?: string;
  /** Blocks already in the schedule, to warn about duplicates. */
  existing?: ExistingBlock[];
  /** Known subject list; an unknown subject is a warning, never an error. */
  knownSubjects?: string[];
  /** Read numeric dates as DD/MM instead of MM/DD. */
  dayFirst?: boolean;
}

/**
 * Parse and validate a schedule file. Never throws on bad content: problems
 * come back as fatal entries or per-row messages.
 */
export function parseScheduleCsv(text: string, options: ParseOptions = {}): ParseResult {
  const today = options.today || new Date().toISOString().slice(0, 10);
  const fallbackYear = +today.slice(0, 4);
  const knownSubjects = (options.knownSubjects || []).map((s) => s.toLowerCase());
  const dayFirst = options.dayFirst === true;
  let ambiguousDateCount = 0;

  const empty: ParseResult = {
    rows: [], fatal: [], mapping: [], validCount: 0, warningCount: 0, errorCount: 0,
    ambiguousDateCount: 0,
  };

  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_BYTES) {
    return { ...empty, fatal: [{ key: "scheduleCsv.fatal.tooLarge", params: { max: "1 MB" } }] };
  }

  const grid = parseCsv(text);
  if (grid.length === 0) {
    return { ...empty, fatal: [{ key: "scheduleCsv.fatal.empty" }] };
  }

  const headers = grid[0];
  const fields = detectColumns(headers);
  const mapping = headers.map((h, i) => ({ header: h, field: fields[i] }));

  const missing: CanonicalField[] = [];
  if (!fields.includes("date")) missing.push("date");
  if (!fields.includes("subject")) missing.push("subject");
  if (missing.length > 0) {
    return {
      ...empty,
      mapping,
      fatal: [{
        key: "scheduleCsv.fatal.missingColumns",
        params: { columns: missing.join(", "), found: headers.join(", ") },
      }],
    };
  }

  const body = grid.slice(1);
  if (body.length === 0) {
    return { ...empty, mapping, fatal: [{ key: "scheduleCsv.fatal.noDataRows" }] };
  }
  if (body.length > MAX_ROWS) {
    return {
      ...empty, mapping,
      fatal: [{ key: "scheduleCsv.fatal.tooManyRows", params: { max: MAX_ROWS, found: body.length } }],
    };
  }

  const existingKeys = new Set(
    (options.existing || []).map((b) => `${b.date}|${b.subject.toLowerCase()}|${b.start_time}`),
  );
  const seenInFile = new Set<string>();
  const rows: ParsedRow[] = [];

  body.forEach((cells, idx) => {
    const get = (f: CanonicalField): string => {
      const col = fields.indexOf(f);
      return col === -1 ? "" : (cells[col] ?? "");
    };

    const line = idx + 2; // header is line 1
    const messages: ParsedRow["messages"] = [];
    let severity: RowSeverity = "valid";
    const fail = (key: string, params?: Record<string, string | number>) => {
      messages.push({ key, params });
      severity = "error";
    };
    const warn = (key: string, params?: Record<string, string | number>) => {
      messages.push({ key, params });
      if (severity !== "error") severity = "warning";
    };

    const rawDate = get("date");
    const date = parseFlexibleDate(rawDate, fallbackYear, dayFirst);
    if (isAmbiguousNumericDate(rawDate)) ambiguousDateCount++;
    if (!rawDate) fail("scheduleCsv.row.dateMissing");
    else if (!date) fail("scheduleCsv.row.dateInvalid", { value: rawDate });

    const subject = get("subject");
    if (!subject) fail("scheduleCsv.row.subjectMissing");
    else if (knownSubjects.length > 0 && !knownSubjects.includes(subject.toLowerCase())) {
      warn("scheduleCsv.row.subjectUnknown", { value: subject });
    }

    const rawStart = get("start_time");
    const rawEnd = get("end_time");
    const start_time = parseFlexibleTime(rawStart);
    const end_time = parseFlexibleTime(rawEnd);

    if (rawStart && !start_time) fail("scheduleCsv.row.timeInvalid", { value: rawStart });
    if (rawEnd && !end_time) fail("scheduleCsv.row.timeInvalid", { value: rawEnd });
    if (start_time && end_time && end_time <= start_time) {
      fail("scheduleCsv.row.endBeforeStart", { start: start_time, end: end_time });
    }
    // Times are optional: a task with no clock time is still a valid task.
    if (!rawStart && !rawEnd) warn("scheduleCsv.row.noTimes");
    else if (!start_time || !end_time) warn("scheduleCsv.row.onlyOneTime");

    if (date && date < today) warn("scheduleCsv.row.datePast", { value: date });

    const key = `${date}|${subject.toLowerCase()}|${start_time}`;
    if (date && subject) {
      if (seenInFile.has(key)) warn("scheduleCsv.row.duplicateInFile");
      else seenInFile.add(key);
      if (existingKeys.has(key)) warn("scheduleCsv.row.duplicateExisting");
    }

    rows.push({
      line, date, subject,
      start_time, end_time,
      notes: get("notes"),
      severity, messages,
    });
  });

  return {
    rows, fatal: [], mapping, ambiguousDateCount,
    validCount: rows.filter((r) => r.severity === "valid").length,
    warningCount: rows.filter((r) => r.severity === "warning").length,
    errorCount: rows.filter((r) => r.severity === "error").length,
  };
}

/* -------------------------------------------------------------- db + template */

export interface DbPlanInsert {
  student_id: string;
  planned_date: string;
  subject: string;
  title: string;
  status: "planned";
}

/**
 * Importable rows -> daily_plan inserts. Rows with severity "error" are
 * dropped; warnings are kept. Times live in the title (daily_plan has no time
 * columns); a task with no times keeps a plain "Subject — notes" title.
 */
export function toDbRows(rows: ParsedRow[], studentId: string): DbPlanInsert[] {
  return rows
    .filter((r) => r.severity !== "error")
    .map((r) => ({
      student_id: studentId,
      planned_date: r.date,
      subject: r.subject,
      title: r.start_time && r.end_time
        ? composeTitle(r.subject, r.start_time, r.end_time, r.notes)
        : (r.notes.trim() ? `${r.subject} — ${r.notes.trim()}` : r.subject),
      status: "planned" as const,
    }));
}

/** A template the parent can download, fill in and re-upload. */
export function buildTemplateCsv(startDate?: string): string {
  const base = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
    ? new Date(`${startDate}T00:00:00Z`)
    : new Date();
  const day = (offset: number) => {
    const d = new Date(base.getTime() + offset * 86400000);
    return d.toISOString().slice(0, 10);
  };
  return [
    "date,subject,start_time,end_time,notes",
    `${day(0)},Math,08:00,08:50,Chapter 3`,
    `${day(0)},English,09:00,09:45,"Reading, then writing"`,
    `${day(1)},Science,10:00,10:50,`,
  ].join("\r\n") + "\r\n";
}
