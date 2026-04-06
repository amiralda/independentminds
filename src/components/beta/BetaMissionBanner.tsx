import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { Check, Star, ArrowRight } from 'lucide-react';
import { BetaFeedbackWidget } from './BetaFeedbackWidget';

interface BetaTask {
  id: string;
  title_key: string;
  description_key: string;
  feature_area: string;
  task_order: number;
  is_required: boolean | null;
}

interface BetaCompletion {
  task_id: string;
  status: string;
}

const LEVELS = [
  { level: 1, name: 'level_explorer', min: 0, max: 50 },
  { level: 2, name: 'level_tester', min: 51, max: 200 },
  { level: 3, name: 'level_contributor', min: 201, max: 350 },
  { level: 4, name: 'level_champion', min: 351, max: Infinity },
];

function getLevel(points: number) {
  if (points <= 50) return LEVELS[0];
  if (points <= 200) return LEVELS[1];
  if (points <= 350) return LEVELS[2];
  return LEVELS[3];
}

/**
 * Maps task title_keys to navigation actions.
 * Returns { path, tab } where path is a route and tab is an
 * optional DadPanel tab to activate via custom event.
 */
const TASK_NAV_MAP: Record<string, { path?: string; tab?: string }> = {
  // Parent tasks
  'beta.task.complete_onboarding': { path: '/', tab: 'profile' },
  'beta.task.build_schedule': { path: '/', tab: 'schedule' },
  'beta.task.configure_notifications': { path: '/', tab: 'profile' },
  'beta.task.setup_rewards': { path: '/', tab: 'rewards' },
  'beta.task.invite_co_guardian': { path: '/', tab: 'guardians' },
  'beta.task.check_inbox': { path: '/', tab: 'inbox' },
  'beta.task.generate_weekly_report': { path: '/', tab: 'weekly' },
  // Student tasks
  'beta.task.view_dashboard': { path: '/' },
  'beta.task.log_lesson': { path: '/', tab: 'today' },
  'beta.task.chat_mr_a': { path: '/', tab: 'tutor' },
  'beta.task.submit_checkin': { path: '/', tab: 'checkin' },
  'beta.task.browse_rewards': { path: '/', tab: 'rewards' },
  // Co-guardian tasks
  'beta.task.accept_invitation': { path: '/accept-invite' },
  'beta.task.view_student_progress': { path: '/', tab: 'progress' },
  'beta.task.check_the_inbox': { path: '/', tab: 'inbox' },
};

export function BetaMissionBanner() {
  const { tester } = useBetaTester();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<BetaTask[]>([]);
  const [completions, setCompletions] = useState<BetaCompletion[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!tester) return;
    const fetchData = async () => {
      const [tasksRes, completionsRes] = await Promise.all([
        supabase
          .from('beta_tasks')
          .select(
            'id, title_key, description_key, feature_area, task_order, is_required',
          )
          .eq('tester_type', tester.tester_type)
          .order('task_order', { ascending: true }),
        supabase
          .from('beta_task_completions')
          .select('task_id, status')
          .eq('tester_id', tester.id),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (completionsRes.data)
        setCompletions(completionsRes.data as BetaCompletion[]);
    };
    fetchData();
  }, [tester?.id, tester?.tester_type]);

  const completedIds = new Set(
    completions.filter((c) => c.status === 'completed').map((c) => c.task_id),
  );
  const completed = completedIds.size;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const points = completed * 25;
  const currentLevel = getLevel(points);
  const allComplete = total > 0 && completed === total;
  const nextTask = tasks.find((task) => !completedIds.has(task.id));

  const navigateToTask = (titleKey: string) => {
    const nav = TASK_NAV_MAP[titleKey];
    if (!nav) return;
    if (nav.tab) {
      window.dispatchEvent(
        new CustomEvent('beta-navigate-tab', { detail: { tab: nav.tab } }),
      );
    }
    if (nav.path) {
      navigate(nav.path);
    }
  };

  if (!tester || tasks.length === 0) return null;

  return (
    <div className="w-full mb-4" data-beta-banner>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: allComplete
            ? 'linear-gradient(135deg, #BA7517, #D4A030, #BA7517)'
            : '#1A365D',
        }}
      >
        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Single compact row — desktop */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Left: badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                style={{ background: '#1D9E75' }}
              >
                {t('beta.mission_banner.title')}
              </span>
              <span
                className="text-[10px] font-medium text-white/70"
              >
                L{currentLevel.level}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: '#FBBF24' }}>
                <Star size={10} fill="currentColor" /> {points}
              </span>
            </div>

            {/* Center: task dots + progress bar */}
            <div className="flex-1 min-w-0 space-y-1">
              {/* Task dots */}
              <div className="flex items-center gap-1 overflow-hidden">
                {tasks.map((task, i) => {
                  const isDone = completedIds.has(task.id);
                  const isNext = nextTask?.id === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 ${
                        isNext ? 'beta-dot-pulse' : ''
                      }`}
                      style={{
                        background: isDone
                          ? '#1D9E75'
                          : isNext
                          ? '#BA7517'
                          : 'rgba(255,255,255,0.15)',
                        color:
                          isDone || isNext
                            ? 'white'
                            : 'rgba(255,255,255,0.35)',
                      }}
                      title={t(task.title_key)}
                    >
                      {isDone ? <Check size={9} strokeWidth={3} /> : i + 1}
                    </div>
                  );
                })}
              </div>
              {/* Slim progress bar */}
              {!allComplete && (
                <div
                  className="relative h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${percent}%`,
                      background:
                        'linear-gradient(90deg, #1D9E75, #5DCAA5)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Right: next task CTA or completion */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {allComplete ? (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors"
                  style={{ background: '#1D9E75', color: 'white' }}
                >
                  🎉 {t('beta.mission_banner.submit_feedback')}
                </button>
              ) : nextTask ? (
                <>
                  <span className="text-[10px] text-white/60 truncate max-w-[140px]">
                    {t('beta.mission_banner.next_up')}: {t(nextTask.title_key)}
                  </span>
                  <button
                    onClick={() => navigateToTask(nextTask.title_key)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold flex-shrink-0 transition-colors"
                    style={{ background: '#BA7517', color: 'white' }}
                  >
                    {t('beta.mission_banner.start_button')}{' '}
                    <ArrowRight size={10} />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Mobile: 2-row layout */}
          <div className="sm:hidden space-y-2">
            {/* Row 1: badges + points */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                  style={{ background: '#1D9E75' }}
                >
                  {t('beta.mission_banner.title')}
                </span>
                <span className="text-[10px] font-medium text-white/70">
                  L{currentLevel.level}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: '#FBBF24' }}>
                  <Star size={10} fill="currentColor" /> {points}
                </span>
                <span className="text-[10px] text-white/50">
                  {completed}/{total}
                </span>
              </div>
            </div>

            {/* Row 2: progress bar + CTA */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {!allComplete ? (
                  <div
                    className="relative h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${percent}%`,
                        background:
                          'linear-gradient(90deg, #1D9E75, #5DCAA5)',
                      }}
                    />
                  </div>
                ) : (
                  <span className="text-[10px] text-white font-bold">
                    🎉 {t('beta.mission_banner.all_complete')}
                  </span>
                )}
              </div>
              {allComplete ? (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="px-2 py-1 rounded-md text-[10px] font-bold"
                  style={{ background: '#1D9E75', color: 'white' }}
                >
                  {t('beta.mission_banner.submit_feedback')}
                </button>
              ) : nextTask ? (
                <button
                  onClick={() => navigateToTask(nextTask.title_key)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold flex-shrink-0"
                  style={{ background: '#BA7517', color: 'white' }}
                >
                  {t('beta.mission_banner.start_button')}{' '}
                  <ArrowRight size={9} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {showFeedback && <BetaFeedbackWidget />}

      <style>{`
        .beta-dot-pulse {
          animation: dotPulse 1.5s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
