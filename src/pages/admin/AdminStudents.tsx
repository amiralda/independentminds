import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useAuth, type StudentRecord } from "@/contexts/AuthContext";
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

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tick = useAutoRefresh();
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();

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
  }, [tick]);

  const viewAs = async (s: StudentRow) => {
    const record: StudentRecord = {
      id: s.id, student_id: s.student_id, display_name: s.display_name,
      grade_level: s.grade_level, parent_id: s.parent_id,
    };
    // Logged to impersonation_logs first; no log, no student view.
    const ok = await startImpersonation(record, "admin support");
    if (!ok) {
      toast.error("Could not record the view-as log — access not opened.");
      return;
    }
    navigate("/");
  };

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
              <TableHead className="text-white/60">Created</TableHead>
              <TableHead className="text-white/60"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white font-medium">{s.display_name}</TableCell>
                <TableCell className="text-white/70">{s.grade_level ?? "—"}</TableCell>
                <TableCell className="text-white/50 text-xs font-mono">{s.student_id ?? "—"}</TableCell>
                <TableCell className="text-white/50 text-xs">{s.user_id ? "Yes" : "—"}</TableCell>
                <TableCell className="text-white/50 text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => viewAs(s)}
                    className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white hover:bg-white/20"
                  >
                    <Eye size={12} /> View as
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {!loadError && students.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={6} className="text-center text-white/40 py-8">No students found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
