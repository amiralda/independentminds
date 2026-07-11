import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DigitalCheck {
  id: string;
  student_id: string;
  amount_points: number;
  currency_amount: number;
  currency_code: string;
  currency_symbol: string;
  check_number: string;
  memo: string | null;
  status: string;
  issued_at: string;
  redeemed_at: string | null;
}

export function useDigitalChecks(studentId: string | null) {
  return useQuery({
    queryKey: ['digital_checks', studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from('digital_checks')
        .select('*')
        .eq('student_id', studentId)
        .order('issued_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as any as DigitalCheck[];
    },
    enabled: !!studentId,
  });
}

function generateCheckNumber(): string {
  const prefix = 'IME';
  const num = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix}-${num}`;
}

export function useIssueCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      student_id: string;
      amount_points: number;
      currency_amount: number;
      currency_code: string;
      currency_symbol: string;
      memo?: string;
    }) => {
      const { error } = await supabase
        .from('digital_checks')
        .insert({
          student_id: params.student_id,
          amount_points: params.amount_points,
          currency_amount: params.currency_amount,
          currency_code: params.currency_code,
          currency_symbol: params.currency_symbol,
          check_number: generateCheckNumber(),
          memo: params.memo || null,
          status: 'issued',
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['digital_checks'] });
      qc.invalidateQueries({ queryKey: ['points_balance'] });
      qc.invalidateQueries({ queryKey: ['points_history'] });
    },
  });
}

export function useRequestCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      student_id: string;
      points: number;
      memo?: string;
    }) => {
      const { data, error } = await supabase.rpc('request_check', {
        _student_id: params.student_id,
        _points: params.points,
        _memo: params.memo || 'Education reward',
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['digital_checks'] });
      qc.invalidateQueries({ queryKey: ['points_balance'] });
      qc.invalidateQueries({ queryKey: ['points_history'] });
    },
  });
}
