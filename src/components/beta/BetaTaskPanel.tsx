import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Minus, ChevronLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskCompletion {
  id: string;
  task_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  task: {
    title_key: string;
    description_key: string;
    feature_area: string;
    is_required: boolean;
  };
}

interface BetaTaskPanelProps {
  open: boolean;
  onClose: () => void;
}

export function BetaTaskPanel({ open, onClose }: BetaTaskPanelProps) {
  const { tester } = useBetaTester();
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TaskCompletion[]>([]);

  useEffect(() => {
    if (!tester) return;
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('beta_task_completions')
        .select('id, task_id, status, started_at, completed_at, task:beta_tasks(title_key, description_key, feature_area, is_required)')
        .eq('tester_id', tester.id)
        .order('task:beta_tasks(task_order)' as any);
      if (data) setTasks(data as any);
    };
    fetchTasks();
  }, [tester?.id]);

  const updateTask = async (id: string, status: string) => {
    const now = new Date().toISOString();
    const update: any = { status };
    if (status === 'completed') update.completed_at = now;
    if (status === 'pending') update.started_at = now;

    await supabase.from('beta_task_completions').update(update).eq('id', id);
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...update } : t)),
    );
  };

  if (!tester) return null;

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  if (!open) {
    return (
      <button
        onClick={onClose}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 rounded-l-lg bg-amber-500 px-2 py-3 text-white shadow-lg hover:bg-amber-600 transition-colors"
        data-feature="beta-task-toggle"
      >
        <ChevronLeft size={16} />
        <span className="text-xs font-medium">{completed}/{total}</span>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-80 bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium text-sm">{t('beta.your_tasks')}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      <div className="p-4">
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {t('beta.tasks_progress').replace('{{done}}', String(completed)).replace('{{total}}', String(total))}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {tasks.map((tc) => {
          const titleKey = tc.task?.title_key;
          const title = titleKey ? t(titleKey) : 'Task';

          return (
            <div
              key={tc.id}
              className="rounded-lg border border-border p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                {tc.status === 'completed' ? (
                  <CheckCircle size={16} className="text-primary mt-0.5 shrink-0" />
                ) : tc.status === 'skipped' ? (
                  <Minus size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                ) : (
                  <Circle size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">
                    {tc.task?.feature_area}
                  </p>
                </div>
              </div>

              {tc.status !== 'completed' && tc.status !== 'skipped' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => updateTask(tc.id, 'completed')}
                    data-feature="beta-task-complete"
                  >
                    {t('beta.task_done')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-muted-foreground"
                    onClick={() => updateTask(tc.id, 'skipped')}
                  >
                    {t('beta.task_skip')}
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium">{t('beta.free_explore')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('beta.free_explore_desc')}
          </p>
        </div>
      </div>
    </div>
  );
}
