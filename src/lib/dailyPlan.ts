// daily_plan's real columns: id, student_id, subject, title, planned_date,
// status ('planned' | 'started' | 'done'), actual_start, actual_end, created_at.
// The UI was written for a legacy shape (plan_date, start/end time, notes,
// block_order, "Planned"/"In Progress"/"Done"). This module is the one place
// that converts between the two. Start/end time and notes live in `title`
// as "Subject (08:00-08:50) — notes" (same format AddStudentFullForm writes).

export type DbPlanStatus = "planned" | "started" | "done";
export type UiPlanStatus = "Planned" | "In Progress" | "Done";

export interface DailyPlanDbRow {
  id: string;
  student_id: string | null;
  subject: string;
  title: string | null;
  planned_date: string;
  status: string | null;
  actual_start: string | null;
  actual_end: string | null;
  created_at: string | null;
}

export interface PlanBlock {
  id: string;
  student_id: string | null;
  subject: string;
  plan_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  block_order: number;
  status: UiPlanStatus;
  actual_start: string | null;
  actual_end: string | null;
}

export const PLAN_COLUMNS = "id, student_id, subject, title, planned_date, status, actual_start, actual_end, created_at";

const UI_BY_DB: Record<DbPlanStatus, UiPlanStatus> = { planned: "Planned", started: "In Progress", done: "Done" };

export function toUiStatus(status: string | null | undefined): UiPlanStatus {
  const s = (status || "planned").toLowerCase();
  if (s === "done") return "Done";
  if (s === "started" || s === "in progress") return "In Progress";
  return UI_BY_DB[s as DbPlanStatus] ?? "Planned";
}

export function toDbStatus(status: string | null | undefined): DbPlanStatus {
  const s = (status || "").toLowerCase();
  if (s === "done") return "done";
  if (s === "started" || s === "in progress") return "started";
  return "planned";
}

const TITLE_RE = /^(.*?) \((\d{1,2}:\d{2})-(\d{1,2}:\d{2})\)(?: — ([\s\S]*))?$/;

export function composeTitle(subject: string, startTime: string, endTime: string, notes?: string | null): string {
  const base = `${subject} (${startTime.slice(0, 5)}-${endTime.slice(0, 5)})`;
  return notes?.trim() ? `${base} — ${notes.trim()}` : base;
}

export function parseTitle(title: string | null): { start_time: string; end_time: string; notes: string | null } {
  const m = title ? TITLE_RE.exec(title) : null;
  if (!m) return { start_time: "", end_time: "", notes: title && title.trim() ? title : null };
  return { start_time: m[2].padStart(5, "0"), end_time: m[3].padStart(5, "0"), notes: m[4]?.trim() || null };
}

/** Rows -> UI blocks, ordered by start time then creation (block_order = position). */
export function toPlanBlocks(rows: DailyPlanDbRow[]): PlanBlock[] {
  return rows
    .map((r) => {
      const { start_time, end_time, notes } = parseTitle(r.title);
      return {
        id: r.id,
        student_id: r.student_id,
        subject: r.subject,
        plan_date: r.planned_date,
        start_time,
        end_time,
        notes,
        block_order: 0,
        status: toUiStatus(r.status),
        actual_start: r.actual_start,
        actual_end: r.actual_end,
        created: r.created_at || "",
      };
    })
    .sort((a, b) => a.plan_date.localeCompare(b.plan_date) || a.start_time.localeCompare(b.start_time) || a.created.localeCompare(b.created))
    .map(({ created: _created, ...b }, i, all) => ({
      ...b,
      block_order: all.slice(0, i).filter((x) => x.plan_date === b.plan_date).length + 1,
    }));
}

export function formatTimeRange(b: Pick<PlanBlock, "start_time" | "end_time">): string {
  return b.start_time && b.end_time ? `${b.start_time} – ${b.end_time}` : "";
}
