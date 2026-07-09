import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CurrencySettings {
  id: string;
  student_id: string;
  currency_code: string;
  currency_symbol: string;
  points_per_unit: number;
  created_at: string;
  updated_at: string;
}

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', nameHT: 'Dola Ameriken' },
  { code: 'HTG', symbol: 'G', name: 'Haitian Gourde', nameHT: 'Goud Ayisyen' },
  { code: 'EUR', symbol: '€', name: 'Euro', nameHT: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound', nameHT: 'Liv Britanik' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', nameHT: 'Dola Kanadyen' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', nameHT: 'Reyal Brezilyen' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', nameHT: 'Peso Meksiken' },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', nameHT: 'Peso Dominiken' },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', nameHT: 'Dola Jamayiken' },
  { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', nameHT: 'Dola Karayib Lès' },
] as const;

export function useCurrencySettings(studentId: string | null) {
  return useQuery({
    queryKey: ['currency_settings', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from('currency_settings')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return data as CurrencySettings | null;
    },
    enabled: !!studentId,
  });
}

export function convertPointsToCurrency(
  points: number,
  settings: CurrencySettings | null | undefined
): { amount: string; symbol: string; code: string } {
  if (!settings) return { amount: '0.00', symbol: '$', code: 'USD' };
  const amount = (points / settings.points_per_unit).toFixed(2);
  return { amount, symbol: settings.currency_symbol, code: settings.currency_code };
}

export function useSaveCurrencySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      student_id: string;
      currency_code: string;
      currency_symbol: string;
      points_per_unit: number;
    }) => {
      const { error } = await supabase
        .from('currency_settings')
        .upsert({
          student_id: params.student_id,
          currency_code: params.currency_code,
          currency_symbol: params.currency_symbol,
          points_per_unit: params.points_per_unit,
        } as unknown, { onConflict: 'student_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currency_settings'] });
    },
  });
}
