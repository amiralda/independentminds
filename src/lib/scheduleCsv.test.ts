import { describe, it, expect } from "vitest";
import {
  parseCsv,
  detectSeparator,
  detectColumns,
  normalizeHeader,
  parseFlexibleDate,
  parseFlexibleTime,
  parseScheduleCsv,
  toDbRows,
  buildTemplateCsv,
  isAmbiguousNumericDate,
  MAX_ROWS,
} from "./scheduleCsv";

const TODAY = "2026-10-01";

describe("parseCsv", () => {
  it("parses a plain comma file", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("keeps commas inside quoted fields", () => {
    const rows = parseCsv('date,notes\n2026-10-05,"Reading, then writing"');
    expect(rows[1]).toEqual(["2026-10-05", "Reading, then writing"]);
  });

  it('unescapes "" inside a quoted field', () => {
    const rows = parseCsv('a\n"He said ""hi"""');
    expect(rows[1]).toEqual(['He said "hi"']);
  });

  it("keeps newlines inside quoted fields", () => {
    const rows = parseCsv('a,b\n1,"line1\nline2"');
    expect(rows[1]).toEqual(["1", "line1\nline2"]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("strips a UTF-8 BOM", () => {
    expect(parseCsv("\uFEFFdate,subject\n2026-10-05,Math")[0]).toEqual(["date", "subject"]);
  });

  it("drops blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("detects a semicolon separator (Excel in FR/HT locales)", () => {
    expect(detectSeparator("date;subject;start_time")).toBe(";");
    expect(parseCsv("date;subject\n2026-10-05;Math")[1]).toEqual(["2026-10-05", "Math"]);
  });

  it("detects a tab separator", () => {
    expect(parseCsv("date\tsubject\n2026-10-05\tMath")[1]).toEqual(["2026-10-05", "Math"]);
  });

  it("does not count separators that are inside quotes", () => {
    expect(detectSeparator('date,"a;b;c;d;e",subject')).toBe(",");
  });

  it("returns nothing for empty input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("   \n  ")).toEqual([]);
  });
});

describe("normalizeHeader", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalizeHeader("Start Time")).toBe("starttime");
    expect(normalizeHeader("start_time")).toBe("starttime");
    expect(normalizeHeader("Matyè")).toBe("matye");
    expect(normalizeHeader("Début")).toBe("debut");
  });
});

describe("detectColumns", () => {
  it("recognises the documented header", () => {
    expect(detectColumns(["plan_date", "subject", "start_time", "end_time", "notes"]))
      .toEqual(["date", "subject", "start_time", "end_time", "notes"]);
  });

  it("recognises synonyms in other languages and shapes", () => {
    expect(detectColumns(["Dat", "Matyè", "Kòmanse", "Fini", "Nòt"]))
      .toEqual(["date", "subject", "start_time", "end_time", "notes"]);
    expect(detectColumns(["Date", "Course", "From", "To", "Teacher"]))
      .toEqual(["date", "subject", "start_time", "end_time", "notes"]);
  });

  it("ignores columns it does not know", () => {
    expect(detectColumns(["date", "subject", "room_code_xyz"]))
      .toEqual(["date", "subject", undefined]);
  });

  it("works in any column order", () => {
    expect(detectColumns(["subject", "notes", "date"]))
      .toEqual(["subject", "notes", "date"]);
  });

  it("treats a second time-ish column as end_time", () => {
    expect(detectColumns(["date", "subject", "time", "time"]))
      .toEqual(["date", "subject", "start_time", "end_time"]);
  });

  it("ignores a duplicated column instead of overwriting", () => {
    expect(detectColumns(["date", "subject", "subject"]))
      .toEqual(["date", "subject", undefined]);
  });
});

describe("parseFlexibleDate", () => {
  it("accepts ISO", () => {
    expect(parseFlexibleDate("2026-10-05", 2026)).toBe("2026-10-05");
    expect(parseFlexibleDate("2026/10/05", 2026)).toBe("2026-10-05");
  });

  it("accepts US numeric order", () => {
    expect(parseFlexibleDate("10/05/2026", 2026)).toBe("2026-10-05");
    expect(parseFlexibleDate("10-5-26", 2026)).toBe("2026-10-05");
  });

  it("accepts written months, including FR/HT/ES names", () => {
    expect(parseFlexibleDate("5 Oct 2026", 2026)).toBe("2026-10-05");
    expect(parseFlexibleDate("Oct 5, 2026", 2026)).toBe("2026-10-05");
    expect(parseFlexibleDate("5 octobre 2026", 2026)).toBe("2026-10-05");
    expect(parseFlexibleDate("5 septanm 2026", 2026)).toBe("2026-09-05");
  });

  it("falls back to the anchor year when the year is missing", () => {
    expect(parseFlexibleDate("Oct 5", 2027)).toBe("2027-10-05");
  });

  it("rejects dates that do not exist", () => {
    expect(parseFlexibleDate("2026-13-45", 2026)).toBe("");
    expect(parseFlexibleDate("2026-02-30", 2026)).toBe("");
    expect(parseFlexibleDate("13/45/2026", 2026)).toBe("");
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(parseFlexibleDate("2028-02-29", 2028)).toBe("2028-02-29");
    expect(parseFlexibleDate("2026-02-29", 2026)).toBe("");
  });

  it("returns empty for junk and blanks", () => {
    expect(parseFlexibleDate("", 2026)).toBe("");
    expect(parseFlexibleDate("next monday", 2026)).toBe("");
  });
});

describe("parseFlexibleTime", () => {
  it("pads and normalises", () => {
    expect(parseFlexibleTime("8:00")).toBe("08:00");
    expect(parseFlexibleTime("08:00")).toBe("08:00");
    expect(parseFlexibleTime("8h30")).toBe("08:30");
    expect(parseFlexibleTime("0830")).toBe("08:30");
    expect(parseFlexibleTime("8")).toBe("08:00");
  });

  it("converts 12-hour times", () => {
    expect(parseFlexibleTime("1:30 PM")).toBe("13:30");
    expect(parseFlexibleTime("1:30pm")).toBe("13:30");
    expect(parseFlexibleTime("12:15 AM")).toBe("00:15");
    expect(parseFlexibleTime("12:15 PM")).toBe("12:15");
  });

  it("rejects impossible times", () => {
    expect(parseFlexibleTime("25:00")).toBe("");
    expect(parseFlexibleTime("08:99")).toBe("");
    expect(parseFlexibleTime("lunch")).toBe("");
    expect(parseFlexibleTime("")).toBe("");
  });
});

describe("parseScheduleCsv", () => {
  const good = [
    "date,subject,start_time,end_time,notes",
    "2026-10-05,Math,08:00,08:50,Chapter 3",
    '2026-10-05,English,09:00,09:45,"Reading, then writing"',
  ].join("\n");

  it("accepts a clean file", () => {
    const r = parseScheduleCsv(good, { today: TODAY });
    expect(r.fatal).toEqual([]);
    expect(r.validCount).toBe(2);
    expect(r.errorCount).toBe(0);
    expect(r.rows[1].notes).toBe("Reading, then writing");
  });

  it("is fatal when date or subject column is absent", () => {
    const r = parseScheduleCsv("foo,bar\n1,2", { today: TODAY });
    expect(r.fatal[0].key).toBe("scheduleCsv.fatal.missingColumns");
    expect(r.rows).toEqual([]);
  });

  it("is fatal on an empty file", () => {
    expect(parseScheduleCsv("", { today: TODAY }).fatal[0].key).toBe("scheduleCsv.fatal.empty");
  });

  it("is fatal on a header with no data rows", () => {
    const r = parseScheduleCsv("date,subject", { today: TODAY });
    expect(r.fatal[0].key).toBe("scheduleCsv.fatal.noDataRows");
  });

  it("is fatal beyond the row limit", () => {
    const many = ["date,subject"].concat(
      Array.from({ length: MAX_ROWS + 1 }, (_, i) => `2026-10-05,Subject ${i}`),
    ).join("\n");
    expect(parseScheduleCsv(many, { today: TODAY }).fatal[0].key)
      .toBe("scheduleCsv.fatal.tooManyRows");
  });

  it("flags a bad date on its own line and keeps the good ones", () => {
    const csv = [
      "date,subject,start_time,end_time",
      "2026-10-05,Math,08:00,08:50",
      "2026-13-45,English,09:00,09:45",
      "2026-10-06,Science,10:00,10:50",
    ].join("\n");
    const r = parseScheduleCsv(csv, { today: TODAY });
    expect(r.fatal).toEqual([]);
    expect(r.validCount).toBe(2);
    expect(r.errorCount).toBe(1);
    const bad = r.rows.find((x) => x.severity === "error")!;
    expect(bad.line).toBe(3);
    expect(bad.messages[0].key).toBe("scheduleCsv.row.dateInvalid");
    expect(bad.messages[0].params?.value).toBe("2026-13-45");
  });

  it("collects every problem in a row, not just the first", () => {
    const csv = "date,subject,start_time,end_time\n2026-13-45,,99:99,08:00";
    const r = parseScheduleCsv(csv, { today: TODAY });
    const keys = r.rows[0].messages.map((m) => m.key);
    expect(keys).toContain("scheduleCsv.row.dateInvalid");
    expect(keys).toContain("scheduleCsv.row.subjectMissing");
    expect(keys).toContain("scheduleCsv.row.timeInvalid");
  });

  it("errors when the end time is not after the start time", () => {
    const csv = "date,subject,start_time,end_time\n2026-10-05,Math,10:00,09:00";
    const r = parseScheduleCsv(csv, { today: TODAY });
    expect(r.rows[0].severity).toBe("error");
    expect(r.rows[0].messages.map((m) => m.key)).toContain("scheduleCsv.row.endBeforeStart");
  });

  it("treats a task with no times as a warning, not an error", () => {
    const r = parseScheduleCsv("date,subject\n2026-10-05,Math", { today: TODAY });
    expect(r.rows[0].severity).toBe("warning");
    expect(r.rows[0].messages.map((m) => m.key)).toContain("scheduleCsv.row.noTimes");
    expect(r.errorCount).toBe(0);
  });

  it("warns about a past date without blocking it", () => {
    const r = parseScheduleCsv("date,subject,start_time,end_time\n2026-09-01,Math,08:00,08:50", { today: TODAY });
    expect(r.rows[0].severity).toBe("warning");
    expect(r.rows[0].messages.map((m) => m.key)).toContain("scheduleCsv.row.datePast");
  });

  it("warns about an unknown subject without blocking it", () => {
    const r = parseScheduleCsv(
      "date,subject,start_time,end_time\n2026-10-05,Underwater Basketry,08:00,08:50",
      { today: TODAY, knownSubjects: ["Math", "English"] },
    );
    expect(r.rows[0].severity).toBe("warning");
    expect(r.rows[0].messages.map((m) => m.key)).toContain("scheduleCsv.row.subjectUnknown");
  });

  it("warns about a duplicate inside the file", () => {
    const csv = [
      "date,subject,start_time,end_time",
      "2026-10-05,Math,08:00,08:50",
      "2026-10-05,Math,08:00,08:50",
    ].join("\n");
    const r = parseScheduleCsv(csv, { today: TODAY });
    expect(r.rows[1].messages.map((m) => m.key)).toContain("scheduleCsv.row.duplicateInFile");
  });

  it("warns about a block that already exists in the schedule", () => {
    const r = parseScheduleCsv(
      "date,subject,start_time,end_time\n2026-10-05,Math,08:00,08:50",
      { today: TODAY, existing: [{ date: "2026-10-05", subject: "math", start_time: "08:00" }] },
    );
    expect(r.rows[0].messages.map((m) => m.key)).toContain("scheduleCsv.row.duplicateExisting");
  });

  it("reads a semicolon file with reordered, differently named columns", () => {
    const csv = ["Matyè;Dat;Kòmanse;Fini", "Math;05/10/2026;8h00;8h50"].join("\r\n");
    const r = parseScheduleCsv(csv, { today: TODAY });
    expect(r.fatal).toEqual([]);
    // Default is US order, so 05/10 is 5 May.
    expect(r.rows[0]).toMatchObject({
      date: "2026-05-10", subject: "Math", start_time: "08:00", end_time: "08:50",
    });
  });

  it("reads the same file as day-first when asked", () => {
    const csv = ["Matyè;Dat;Kòmanse;Fini", "Math;05/10/2026;8h00;8h50"].join("\r\n");
    const r = parseScheduleCsv(csv, { today: TODAY, dayFirst: true });
    expect(r.rows[0].date).toBe("2026-10-05");
  });

  it("counts ambiguous numeric dates so the UI can offer the day-first switch", () => {
    const csv = [
      "date,subject",
      "05/10/2026,Math",     // ambiguous
      "25/12/2026,English",  // only day-first is possible
      "2026-10-05,Science",  // ISO, never ambiguous
    ].join("\n");
    const r = parseScheduleCsv(csv, { today: TODAY });
    expect(r.ambiguousDateCount).toBe(1);
  });

  it("recovers a date that is only valid in the other order", () => {
    // 25/12 cannot be MM/DD, so it is read as 25 December either way.
    const r = parseScheduleCsv("date,subject\n25/12/2026,Math", { today: TODAY });
    expect(r.rows[0].date).toBe("2026-12-25");
    expect(r.rows[0].severity).not.toBe("error");
  });

  it("reports the parent's own line numbers", () => {
    const csv = "date,subject\n2026-10-05,Math\n,English";
    const r = parseScheduleCsv(csv, { today: TODAY });
    expect(r.rows[0].line).toBe(2);
    expect(r.rows[1].line).toBe(3);
  });
});

describe("toDbRows", () => {
  it("keeps valid and warning rows and drops errors", () => {
    const csv = [
      "date,subject,start_time,end_time,notes",
      "2026-10-05,Math,08:00,08:50,Chapter 3",
      "2026-13-45,English,09:00,09:45,",
      "2026-10-06,Science,,,",
    ].join("\n");
    const r = parseScheduleCsv(csv, { today: TODAY });
    const rows = toDbRows(r.rows, "student-uuid");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      student_id: "student-uuid",
      planned_date: "2026-10-05",
      subject: "Math",
      title: "Math (08:00-08:50) — Chapter 3",
      status: "planned",
    });
  });

  it("writes a plain title when the task has no times", () => {
    const r = parseScheduleCsv("date,subject,notes\n2026-10-05,Math,Chapter 3", { today: TODAY });
    expect(toDbRows(r.rows, "s")[0].title).toBe("Math — Chapter 3");
  });

  it("writes just the subject when there are no times and no notes", () => {
    const r = parseScheduleCsv("date,subject\n2026-10-05,Math", { today: TODAY });
    expect(toDbRows(r.rows, "s")[0].title).toBe("Math");
  });

  it("always inserts as planned", () => {
    const r = parseScheduleCsv("date,subject\n2026-10-05,Math", { today: TODAY });
    expect(toDbRows(r.rows, "s").every((x) => x.status === "planned")).toBe(true);
  });
});

describe("isAmbiguousNumericDate", () => {
  it("flags numeric dates that read both ways", () => {
    expect(isAmbiguousNumericDate("05/10/2026")).toBe(true);
    expect(isAmbiguousNumericDate("1/2/26")).toBe(true);
  });

  it("does not flag what only one order allows", () => {
    expect(isAmbiguousNumericDate("25/12/2026")).toBe(false);
    expect(isAmbiguousNumericDate("05/05/2026")).toBe(false);
  });

  it("does not flag ISO or written months", () => {
    expect(isAmbiguousNumericDate("2026-10-05")).toBe(false);
    expect(isAmbiguousNumericDate("5 Oct 2026")).toBe(false);
    expect(isAmbiguousNumericDate("")).toBe(false);
  });
});

describe("buildTemplateCsv", () => {
  it("produces a file that passes its own validation", () => {
    const csv = buildTemplateCsv("2026-10-05");
    const r = parseScheduleCsv(csv, { today: "2026-10-01" });
    expect(r.fatal).toEqual([]);
    expect(r.errorCount).toBe(0);
    expect(r.rows).toHaveLength(3);
  });

  it("demonstrates quoting for a note that contains a comma", () => {
    expect(buildTemplateCsv("2026-10-05")).toContain('"Reading, then writing"');
    const r = parseScheduleCsv(buildTemplateCsv("2026-10-05"), { today: "2026-10-01" });
    expect(r.rows[1].notes).toBe("Reading, then writing");
  });
});
