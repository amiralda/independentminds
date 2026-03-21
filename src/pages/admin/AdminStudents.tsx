import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface StudentRow {
  student_id: string;
  display_name: string;
  grade_level: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const tick = useAutoRefresh();

  useEffect(() => {
    supabase
      .from("students")
      .select("student_id, display_name, grade_level, parent_id, created_at, updated_at")
      .order("display_name")
      .then(({ data }) => setStudents((data as StudentRow[]) || []));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">All Students</h1>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Name</TableHead>
              <TableHead className="text-white/60">Grade</TableHead>
              <TableHead className="text-white/60">Student ID</TableHead>
              <TableHead className="text-white/60">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow key={s.student_id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white font-medium">{s.display_name}</TableCell>
                <TableCell className="text-white/70">{s.grade_level}</TableCell>
                <TableCell className="text-white/50 text-xs font-mono">{s.student_id.slice(0, 8)}…</TableCell>
                <TableCell className="text-white/50 text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
            {students.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center text-white/40 py-8">No students found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
