import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PointTransaction {
  id: string;
  student_id: string;
  points: number;
  reason: string;
  source: string;
  reference_id: string | null;
  created_at: string;
}

export interface CatalogReward {
  id: string;
  student_id: string;
  name: string;
  description: string | null;
  point_cost: number;
  icon: string;
  enabled: boolean;
  created_at: string;
}

export interface Redemption {
  id: string;
  student_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  created_at: string;
  fulfilled_at: string | null;
}

export function usePointsBalance(studentId: string | null) {
  return useQuery({
    queryKey: ["points_balance", studentId],
    queryFn: async () => {
      if (!studentId) return 0;
      const { data, error } = await supabase
        .from("reward_points")
        .select("points")
        .eq("student_id", studentId);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (r as unknown).points, 0) as number;
    },
    enabled: !!studentId,
  });
}

export function usePointsHistory(studentId: string | null) {
  return useQuery({
    queryKey: ["points_history", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("reward_points")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as PointTransaction[];
    },
    enabled: !!studentId,
  });
}

export function useRewardsCatalog(studentId: string | null) {
  return useQuery({
    queryKey: ["rewards_catalog", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("rewards_catalog")
        .select("*")
        .eq("student_id", studentId)
        .eq("enabled", true)
        .order("point_cost");
      if (error) throw error;
      return (data || []) as unknown as CatalogReward[];
    },
    enabled: !!studentId,
  });
}

export function useAllRewardsCatalog(studentId: string | null) {
  return useQuery({
    queryKey: ["rewards_catalog_all", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("rewards_catalog")
        .select("*")
        .eq("student_id", studentId)
        .order("point_cost");
      if (error) throw error;
      return (data || []) as unknown as CatalogReward[];
    },
    enabled: !!studentId,
  });
}

export function useRedemptions(studentId: string | null) {
  return useQuery({
    queryKey: ["redemptions", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as Redemption[];
    },
    enabled: !!studentId,
  });
}

export function useAwardPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { student_id: string; points: number; reason: string; source?: string; reference_id?: string }) => {
      const { error } = await supabase.rpc("award_points", {
        _student_id: params.student_id,
        _points: params.points,
        _reason: params.reason,
        _source: params.source || "system",
        _reference_id: params.reference_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points_balance"] });
      qc.invalidateQueries({ queryKey: ["points_history"] });
    },
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { student_id: string; reward_id: string; points_spent: number; reward_name: string }) => {
      const { error } = await supabase.rpc("redeem_reward", {
        _student_id: params.student_id,
        _reward_id: params.reward_id,
        _points_spent: params.points_spent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["points_balance"] });
      qc.invalidateQueries({ queryKey: ["points_history"] });
      qc.invalidateQueries({ queryKey: ["redemptions"] });
    },
  });
}

// Point values
export const POINT_VALUES = {
  BLOCK_COMPLETED: 10,
  CHECK_IN: 15,
  PERFECT_DAY: 50,      // All blocks done
  STREAK_3_DAYS: 30,
  STREAK_7_DAYS: 100,
  HIGH_RATING: 5,       // Self-rating 5/5
} as const;
