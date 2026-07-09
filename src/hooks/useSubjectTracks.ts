import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubjectTrack {
  id: string;
  student_id: string;
  name: string;
  category: string;
  daily_target: number;
  unit_type: string;
  icon: string;
  color: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  student_id: string;
  track_id: string;
  log_date: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  notes: string | null;
  score: number | null;
  created_at: string;
}

export function useSubjectTracks(studentId: string | null) {
  return useQuery({
    queryKey: ["subject_tracks", studentId],
    queryFn: async (): Promise<SubjectTrack[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("subject_tracks")
        .select("*")
        .eq("student_id", studentId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as unknown as SubjectTrack[]) || [];
    },
    enabled: !!studentId,
  });
}

export function useActivityLogs(studentId: string | null, date?: string) {
  const logDate = date || new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["activity_logs", studentId, logDate],
    queryFn: async (): Promise<ActivityLog[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("student_id", studentId)
        .eq("log_date", logDate)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as ActivityLog[]) || [];
    },
    enabled: !!studentId,
  });
}

export function useAllActivityLogs(studentId: string | null) {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["activity_logs_all", studentId, today],
    queryFn: async (): Promise<ActivityLog[]> => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("student_id", studentId)
        .eq("log_date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as ActivityLog[]) || [];
    },
    enabled: !!studentId,
  });
}

export function useTrackMutations(studentId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subject_tracks"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs"] });
    queryClient.invalidateQueries({ queryKey: ["activity_logs_all"] });
  };

  const addTrack = useMutation({
    mutationFn: async (track: Omit<SubjectTrack, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("subject_tracks").insert(track as unknown);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateTrack = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubjectTrack> & { id: string }) => {
      const { error } = await supabase
        .from("subject_tracks")
        .update(updates as unknown)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subject_tracks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const logActivity = useMutation({
    mutationFn: async (log: { track_id: string; status?: string; notes?: string; score?: number }) => {
      const { error } = await supabase.from("activity_logs").insert({
        student_id: studentId,
        track_id: log.track_id,
        status: log.status || "Done",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        notes: log.notes || null,
        score: log.score || null,
      } as unknown);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const undoActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activity_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const overrideActivity = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; notes?: string; score?: number }) => {
      const { error } = await supabase
        .from("activity_logs")
        .update(updates as unknown)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { addTrack, updateTrack, deleteTrack, logActivity, undoActivity, overrideActivity };
}
