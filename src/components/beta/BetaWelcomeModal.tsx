import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';

interface BetaTask {
  id: string;
  title_key: string;
  description_key: string;
  task_order: number;
}

export function BetaWelcomeModal() {
  const { tester } = useBetaTester();
  const { t } = useI18n();
  const [tasks, setTasks] = useState<BetaTask[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!tester) return;
    // Only show if first_login_shown is false
    if ((tester as unknown).first_login_shown) return;

    const fetchTasks = async () => {
      const { data } = await supabase
        .from('beta_tasks')
        .select('id, title_key, description_key, task_order')
        .eq('tester_type', tester.tester_type)
        .order('task_order', { ascending: true });
      if (data && data.length > 0) {
        setTasks(data);
        setShow(true);
      }
    };
    fetchTasks();
  }, [tester?.id, (tester as unknown)?.first_login_shown]);

  const handleStart = async () => {
    if (!tester) return;
    // Mark first_login_shown
    await supabase
      .from('beta_testers')
      .update({ first_login_shown: true } as unknown)
      .eq('id', tester.id);

    setShow(false);

    // Scroll to banner
    setTimeout(() => {
      const banner = document.querySelector('[data-beta-banner]');
      if (banner) {
        banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
        banner.classList.add('beta-banner-highlight');
        setTimeout(() => banner.classList.remove('beta-banner-highlight'), 2000);
      }
    }, 300);
  };

  if (!show || tasks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#1A365D' }}
        role="dialog"
        aria-modal="true"
        aria-label={t('beta.welcome_modal.title')}
      >
        {/* Header */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold text-white">
            {t('beta.welcome_modal.title')}
          </h2>
          <p className="text-white/70 text-sm mt-2">
            {t('beta.welcome_modal.subtitle')}
          </p>
        </div>

        {/* Task list */}
        <div className="px-4 pb-2 max-h-[50vh] overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 mb-2 rounded-lg p-3"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderLeft: '3px solid #BA7517',
              }}
            >
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: '#BA7517', color: 'white' }}
              >
                {String(task.task_order).padStart(2, '0')}
              </span>
              <span className="flex-1 text-white text-sm font-medium">
                {t(task.title_key)}
              </span>
              <span
                className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(186,117,23,0.3)', color: '#FBBF24' }}
              >
                25 pts
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3">
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>
              {t('beta.mission_banner.tasks_complete')
                .replace('{{done}}', '0')
                .replace('{{total}}', String(tasks.length))}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <div className="h-full w-0 rounded-full" style={{ background: '#1D9E75' }} />
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 pt-2">
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-colors"
            style={{ background: '#1D9E75', color: 'white' }}
          >
            {t('beta.welcome_modal.start_button')} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
