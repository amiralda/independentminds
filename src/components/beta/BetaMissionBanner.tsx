import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { Check, Star, Trophy, ArrowRight } from 'lucide-react';
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
  { level: 1, name: 'level_explorer', min: 0, max: 50, bg: '#E1F5EE', text: '#085041' },
  { level: 2, name: 'level_tester', min: 51, max: 200, bg: '#1D9E75', text: '#ffffff' },
  { level: 3, name: 'level_contributor', min: 201, max: 350, bg: '#EEEDFE', text: '#3C3489' },
  { level: 4, name: 'level_champion', min: 351, max: Infinity, bg: '#FAEEDA', text: '#633806' },
];

function getLevel(points: number) {
  if (points <= 50) return LEVELS[0];
  if (points <= 200) return LEVELS[1];
  if (points <= 350) return LEVELS[2];
  return LEVELS[3];
}

export function BetaMissionBanner() {
  const { tester } = useBetaTester();
  const { t } = useI18n();
  const [tasks, setTasks] = useState<BetaTask[]>([]);
  const [completions, setCompletions] = useState<BetaCompletion[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const confettiRef = useRef(false);

  useEffect(() => {
    if (!tester) return;
    const fetchData = async () => {
      const [tasksRes, completionsRes] = await Promise.all([
        supabase
          .from('beta_tasks')
          .select('id, title_key, description_key, feature_area, task_order, is_required')
          .eq('tester_type', tester.tester_type)
          .order('task_order', { ascending: true }),
        supabase
          .from('beta_task_completions')
          .select('task_id, status')
          .eq('tester_id', tester.id),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (completionsRes.data) setCompletions(completionsRes.data as BetaCompletion[]);
    };
    fetchData();
  }, [tester?.id, tester?.tester_type]);

  const completedIds = new Set(
    completions.filter(c => c.status === 'completed').map(c => c.task_id)
  );
  const completed = completedIds.size;
  const total = tasks.length;
  const remaining = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const points = completed * 25;
  const currentLevel = getLevel(points);
  const allComplete = remaining === 0;

  const nextTask = tasks.find(task => !completedIds.has(task.id));

  // Fire confetti on completion
  useEffect(() => {
    if (allComplete && total > 0 && !confettiRef.current) {
      confettiRef.current = true;
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
      script.onload = () => {
        (window as any).confetti?.({ particleCount: 150, spread: 70, origin: { y: 0.3 } });
      };
      document.head.appendChild(script);
    }
  }, [allComplete, total]);

  if (!tester || tasks.length === 0) return null;

  const handleStartTask = () => {
    const el = document.querySelector('[data-feature="beta-task-toggle"], [data-feature="beta-task-complete"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement).click?.();
    }
  };

  return (
    <div className="w-full mb-6 space-y-4">
      {/* SECTION 1 — MAIN BANNER */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: allComplete
          ? 'linear-gradient(135deg, #BA7517, #D4A030, #BA7517)'
          : '#1A365D'
        }}
      >
        <div className="p-4 sm:p-6 space-y-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: '#1D9E75' }}>
                {t('beta.mission_banner.title')}
              </span>
              <p className="text-white/80 text-xs mt-1">
                {allComplete ? t('beta.mission_banner.all_complete') : t('beta.mission_banner.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(186,117,23,0.3)', color: '#FBBF24' }}>
                <Star size={12} fill="currentColor" /> {points} pts
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(29,158,117,0.3)', color: '#5DCAA5' }}>
                Level {currentLevel.level} — {t(`beta.mission_banner.${currentLevel.name}`)}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {!allComplete && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/70">
                  {t('beta.mission_banner.tasks_complete').replace('{{done}}', String(completed)).replace('{{total}}', String(total))}
                </span>
                <span className="font-bold" style={{ color: '#FBBF24' }}>
                  {t('beta.mission_banner.tasks_left').replace('{{percent}}', String(percent)).replace('{{remaining}}', String(remaining))}
                </span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700 beta-progress-bar"
                  style={{
                    width: `${percent}%`,
                    background: allComplete
                      ? '#FBBF24'
                      : 'linear-gradient(90deg, #1D9E75, #5DCAA5)',
                  }}
                />
              </div>
            </div>
          )}

          {allComplete && (
            <div className="text-center py-2">
              <p className="text-white text-xl font-bold">🎉 {t('beta.mission_banner.all_complete')}</p>
              <button
                onClick={() => setShowFeedback(true)}
                className="mt-3 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                style={{ background: '#1A365D', color: 'white' }}
              >
                {t('beta.mission_banner.submit_feedback')} →
              </button>
            </div>
          )}

          {/* Task dots row */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
            {tasks.map((task, i) => {
              const isDone = completedIds.has(task.id);
              const isNext = nextTask?.id === task.id;
              return (
                <div key={task.id} className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      isDone
                        ? ''
                        : isNext
                        ? 'beta-dot-pulse'
                        : ''
                    }`}
                    style={{
                      background: isDone ? '#1D9E75' : isNext ? '#BA7517' : 'rgba(255,255,255,0.2)',
                      color: isDone || isNext ? 'white' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {isDone ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </div>
                  <span
                    className="text-[8px] sm:text-[9px] truncate max-w-[40px] sm:max-w-[56px] text-center"
                    style={{
                      color: isDone ? '#5DCAA5' : isNext ? '#FBBF24' : 'rgba(255,255,255,0.3)',
                      fontWeight: isNext ? 700 : 400,
                    }}
                  >
                    {isNext && '← '}{t(task.title_key)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Next task CTA */}
          {nextTask && !allComplete && (
            <div
              className="rounded-lg p-3 flex items-center justify-between gap-3"
              style={{
                background: 'rgba(186,117,23,0.2)',
                borderLeft: '3px solid #BA7517',
              }}
            >
              <p className="text-xs text-white/90">
                <span className="font-semibold" style={{ color: '#FBBF24' }}>
                  {t('beta.mission_banner.next_up')}:
                </span>{' '}
                {t(nextTask.title_key)}. {t('beta.mission_banner.earn_points').replace('{{points}}', '25')}
              </p>
              <button
                onClick={handleStartTask}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold flex-shrink-0 transition-colors"
                style={{ background: '#BA7517', color: 'white' }}
              >
                {t('beta.mission_banner.start_button')} <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2 — STAT CARDS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card border border-border p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#BA7517' }}>{points}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Beta Points earned</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 sm:p-4 text-center">
          <p className="text-lg sm:text-xl font-bold" style={{ color: '#1D9E75' }}>Level {currentLevel.level}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {t(`beta.mission_banner.${currentLevel.name}`)}
            {remaining > 0 && ` (${remaining} tasks away)`}
          </p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 sm:p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#7F77DD' }}>{remaining}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Tasks remaining</p>
        </div>
      </div>

      {/* SECTION 3 — LEVEL SYSTEM */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {LEVELS.map((lvl) => {
          const isCurrent = currentLevel.level === lvl.level;
          return (
            <div
              key={lvl.level}
              className={`rounded-xl p-3 text-center transition-all ${isCurrent ? 'beta-level-bounce ring-2 ring-offset-2' : ''}`}
              style={{
                background: lvl.bg,
                color: lvl.text,
                opacity: isCurrent ? 1 : 0.6,
                ringColor: isCurrent ? lvl.text : undefined,
              }}
            >
              <div className="flex items-center justify-center gap-1">
                {lvl.level === 4 && <Trophy size={14} />}
                <p className="text-sm font-bold">Level {lvl.level}</p>
              </div>
              <p className="text-xs font-medium mt-0.5">{t(`beta.mission_banner.${lvl.name}`)}</p>
              <p className="text-[10px] mt-0.5 opacity-70">
                {lvl.max === Infinity ? `${lvl.min}+ pts` : `${lvl.min}–${lvl.max} pts`}
              </p>
              {isCurrent && (
                <span className="text-[10px] font-bold mt-1 inline-block">← You</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Feedback widget triggered on completion */}
      {showFeedback && <BetaFeedbackWidget />}

      {/* CSS animations */}
      <style>{`
        .beta-progress-bar {
          position: relative;
          overflow: hidden;
          animation: betaPulse 2s ease-in-out infinite;
        }
        .beta-progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: betaShine 2s ease-in-out infinite;
        }
        @keyframes betaShine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes betaPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        .beta-dot-pulse {
          animation: dotPulse 1.5s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        .beta-level-bounce {
          animation: levelBounce 0.6s ease-out;
        }
        @keyframes levelBounce {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
