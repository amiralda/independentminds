import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useI18n } from "@/lib/i18n";
import { badgeDef, badgeLabelKey } from "@/lib/badges";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface StudentRow {
  id: string;
  student_id: string | null;
  display_name: string;
  grade_level: number | null;
  parent_id: string | null;
  user_id: string | null;
  created_at: string;
}

interface RewardsRow {
  student_id: string;
  total_points: number;
  badges: string[];
}

// Admins list students only. "View as" is family-only (parent / Manager /
// co-guardian) and is denied to admins server-side by can_impersonate_student().
export default function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [rewards, setRewards] = useState<Record<string, RewardsRow>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const tick = useAutoRefresh();
  const { t } = useI18n();

  useEffect(() => {
    // students has no updated_at column -- selecting it made PostgREST return
    // 400 and the page silently showed "No students found".
    supabase
      .from("students")
      .select("id, student_id, display_name, grade_level, parent_id, user_id, created_at")
      .order("display_name")
      .then(({ data, error }) => {
        if (error) {
          console.error("AdminStudents load failed", error);
          setLoadError(error.message);
          return;
        }
        setLoadError(null);
        setStudents((data as unknown as StudentRow[]) || []);
      });
    // Totals + badge keys only, via an admin-only RPC (admins have no direct
    // read access to achievements).
    supabase.rpc("get_student_rewards_summary" as never).then(({ data, error }) => {
      if (error) {
        console.error("AdminStudents rewards load failed", error);
        return;
      }
      const byStudent: Record<string, RewardsRow> = {};
      for (const r of (data as unknown as RewardsRow[]) || []) byStudent[r.student_id] = r;
      setRewards(byStudent);
    });
  }, [tick]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">All Students</h1>
      {loadError && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-red-100 text-sm">
          Failed to load students: {loadError}
        </div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Name</TableHead>
              <TableHead className="text-white/60">Grade</TableHead>
              <TableHead className="text-white/60">Student ID</TableHead>
              <TableHead className="text-white/60">Login</TableHead>
              <TableHead className="text-white/60">Points</TableHead>
              <TableHead className="text-white/60">Badges</TableHead>
              <TableHead className="text-white/60">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white font-medium">{s.display_name}</TableCell>
                <TableCell className="text-white/70">{s.grade_level ?? "—"}</TableCell>
                <TableCell className="text-white/50 text-xs font-mono">{s.student_id ?? "—"}</TableCell>
                <TableCell className="text-white/50 text-xs">{s.user_id ? "Yes" : "—"}</TableCell>
                <TableCell className="text-white font-medium">{rewards[s.id]?.total_points ?? 0}</TableCell>
                <TableCell className="text-white/80 text-xs">
                  {rewards[s.id]?.badges.length
                    ? rewards[s.id].badges.map((b) => `${badgeDef(b)?.emoji ?? "🏅"} ${t(badgeLabelKey(b))}`).join("  ")
                    : "—"}
                </TableCell>
                <TableCell className="text-white/50 text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {!loadError && students.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={7} className="text-center text-white/40 py-8">No students found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
