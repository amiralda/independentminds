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

// rewards_catalog is per family (parent_id), with title / is_active; the UI
// keeps name / enabled. reward_redemptions uses requested_at / approved_at and
// status 'pending' | 'approved' | 'redeemed' (fulfilled = 'redeemed').
export interface CatalogReward {
  id: string;
  parent_id: string;
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
  reward_id: string | null;
  reward_title: string | null;
  points_spent: number;
  status: "pending" | "approved" | "redeemed";
  created_at: string;
  fulfilled_at: string | null;
}

interface CatalogRow {
  id: string;
  parent_id: string;
  title: string;
  description: string | null;
  point_cost: number;
  icon: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface RedemptionRow {
  id: string;
  student_id: string;
  reward_id: string | null;
  reward_title: string | null;
  points_spent: number | null;
  status: string | null;
  requested_at: string;
  approved_at: string | null;
}

const toCatalogReward = (r: CatalogRow): CatalogReward => ({
  id: r.id,
  parent_id: r.parent_id,
  name: r.title,
  description: r.description,
  point_cost: r.point_cost,
  icon: r.icon || "🎁",
  enabled: r.is_active !== false,
  created_at: r.created_at,
});

const toRedemption = (r: RedemptionRow): Redemption => ({
  id: r.id,
  student_id: r.student_id,
  reward_id: r.reward_id,
  reward_title: r.reward_title,
  points_spent: r.points_spent ?? 0,
  status: (r.status as Redemption["status"]) || "pending",
  created_at: r.requested_at,
  fulfilled_at: r.approved_at,
});

/** The family (students.parent_id) a student belongs to; the catalog is per family. */
export function useStudentFamilyId(studentId: string | null) {
  return useQuery({
    queryKey: ["student_family", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("parent_id").eq("id", studentId!).maybeSingle();
      if (error) throw error;
      return (data?.parent_id as string | null) ?? null;
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
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
      return (data || []).reduce((sum, r) => sum + (r as any).points, 0) as number;
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
        .select("id, student_id, points, reason, source, reference_id, awarded_at")
        .eq("student_id", studentId)
        .order("awarded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      // reward_points' timestamp column is awarded_at.
      return (data || []).map((r: any) => ({ ...r, source: r.source || "", created_at: r.awarded_at })) as PointTransaction[];
    },
    enabled: !!studentId,
  });
}

function useCatalog(studentId: string | null, activeOnly: boolean) {
  const { data: familyId } = useStudentFamilyId(studentId);
  return useQuery({
    queryKey: [activeOnly ? "rewards_catalog" : "rewards_catalog_all", studentId, familyId],
    queryFn: async () => {
      let q = supabase
        .from("rewards_catalog")
        .select("id, parent_id, title, description, point_cost, icon, is_active, created_at")
        .eq("parent_id", familyId!);
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q.order("point_cost");
      if (error) throw error;
      return ((data || []) as unknown as CatalogRow[]).map(toCatalogReward);
    },
    enabled: !!studentId && !!familyId,
  });
}

export function useRewardsCatalog(studentId: string | null) {
  return useCatalog(studentId, true);
}

export function useAllRewardsCatalog(studentId: string | null) {
  return useCatalog(studentId, false);
}

export function useRedemptions(studentId: string | null) {
  return useQuery({
    queryKey: ["redemptions", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("reward_redemptions")
        .select("id, student_id, reward_id, reward_title, points_spent, status, requested_at, approved_at")
        .eq("student_id", studentId)
        .order("requested_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return ((data || []) as unknown as RedemptionRow[]).map(toRedemption);
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

/** Server-side redemption: price, balance check and debit all happen in redeem_reward(). */
export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { student_id: string; reward_id: string }) => {
      const { data, error } = await supabase.rpc("redeem_reward" as never, {
        _student_id: params.student_id,
        _reward_id: params.reward_id,
      } as never);
      if (error) throw new Error(error.message);
      return data as unknown as { redemption_id: string; points_spent: number; balance: number };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["points_balance"] });
      qc.invalidateQueries({ queryKey: ["points_history"] });
      qc.invalidateQueries({ queryKey: ["redemptions"] });
    },
  });
}

/** i18n key for a redeem_reward() error (the RPC raises short codes). */
export function redeemErrorKey(message: string | undefined): string {
  if (message?.includes("insufficient_points")) return "rewards.notEnough";
  if (message?.includes("reward_unavailable")) return "rewards.unavailable";
  return "rewards.redeemFailed";
}

export const POINT_VALUES = {
  BLOCK_COMPLETED: 10,
  CHECK_IN: 15,
  PERFECT_DAY: 50,      // All blocks done
  STREAK_3_DAYS: 30,
  STREAK_7_DAYS: 100,
  HIGH_RATING: 5,       // Self-rating 5/5
} as const;
