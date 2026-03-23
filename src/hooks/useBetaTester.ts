import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BetaTester {
  id: string;
  tester_type: string;
  tasks_total: number;
  tasks_completed: number;
  tasks_abandoned: number;
  recording_consent: boolean;
  session_count: number;
}

export function useBetaTester() {
  const { session } = useAuth();
  const [tester, setTester] = useState<BetaTester | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setTester(null);
      setLoading(false);
      return;
    }

    const fetchTester = async () => {
      const { data } = await supabase
        .from('beta_testers')
        .select(
          'id, tester_type, tasks_total, tasks_completed, tasks_abandoned, recording_consent, session_count',
        )
        .eq('user_id', session.user.id)
        .maybeSingle();
      setTester(data as BetaTester | null);
      setLoading(false);
    };
    fetchTester();
  }, [session?.user?.id]);

  return { tester, isBetaTester: !!tester, loading };
}
