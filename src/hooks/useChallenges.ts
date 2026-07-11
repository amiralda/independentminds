import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Challenge {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  target_count: number;
  current_count: number;
  bonus_points: number;
  challenge_type: string;
  category_filter: string | null;
  subject_filter: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
  created_at: string;
}

export function useChallenges(studentId: string | null) {
  return useQuery({
    queryKey: ["challenges", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any as Challenge[];
    },
    enabled: !!studentId,
  });
}

export function useActiveChallenges(studentId: string | null) {
  return useQuery({
    queryKey: ["challenges_active", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("student_id", studentId)
        .eq("status", "active")
        .order("ends_at");
      if (error) throw error;
      return (data || []) as any as Challenge[];
    },
    enabled: !!studentId,
  });
}

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      student_id: string;
      title: string;
      description?: string;
      target_count: number;
      bonus_points: number;
      challenge_type?: string;
      category_filter?: string;
      subject_filter?: string;
      ends_at?: string;
    }) => {
      const { error } = await supabase.from("challenges").insert({
        student_id: params.student_id,
        title: params.title,
        description: params.description || null,
        target_count: params.target_count,
        bonus_points: params.bonus_points,
        challenge_type: params.challenge_type || "weekly",
        category_filter: params.category_filter || null,
        subject_filter: params.subject_filter || null,
        ends_at: params.ends_at || new Date(Date.now() + 7 * 86400000).toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["challenges_active"] });
    },
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["challenges_active"] });
    },
  });
}

/** Increment challenge progress and auto-complete if target met */
export async function incrementChallengeProgress(
  studentId: string,
  subject?: string,
  category?: string
) {
  // Get active challenges for this student
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "active");

  if (!challenges || challenges.length === 0) return;

  for (const ch of challenges as any as Challenge[]) {
    // Check filters
    if (ch.subject_filter && ch.subject_filter !== subject) continue;
    if (ch.category_filter && ch.category_filter !== category) continue;

    const newCount = ch.current_count + 1;
    const isComplete = newCount >= ch.target_count;

    await supabase
      .from("challenges")
      .update({
        current_count: newCount,
        status: isComplete ? "completed" : "active",
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", ch.id);

    // Award bonus points on completion
    if (isComplete) {
      await supabase.rpc("award_points", {
        _student_id: studentId,
        _points: ch.bonus_points,
        _reason: `🏆 Challenge Complete: ${ch.title}`,
        _source: "challenge_complete",
      });
    }
  }
}
