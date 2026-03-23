import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function BetaPostSessionSurvey() {
  const { tester, isBetaTester } = useBetaTester();
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState(['', '', '', '', '']);

  useEffect(() => {
    if (!isBetaTester || !tester) return;

    // Check if all required tasks are completed
    const allDone =
      tester.tasks_total > 0 &&
      tester.tasks_completed >= tester.tasks_total;

    if (!allDone) return;

    // Check if survey already submitted
    const checkExisting = async () => {
      const { data } = await supabase
        .from('beta_feedback')
        .select('id')
        .eq('tester_id', tester.id)
        .eq('feedback_type', 'survey')
        .maybeSingle();
      if (!data) setShow(true);
    };
    checkExisting();
  }, [tester?.tasks_completed, tester?.tasks_total]);

  if (!show || submitted) return null;

  const questions = [
    t('beta.survey_q1'),
    t('beta.survey_q2'),
    t('beta.survey_q3'),
    t('beta.survey_q4'),
    t('beta.survey_q5'),
  ];

  const handleSubmit = async () => {
    if (!tester) return;
    await supabase.from('beta_feedback').insert({
      tester_id: tester.id,
      feedback_type: 'survey',
      comment: JSON.stringify(
        questions.reduce(
          (acc, q, i) => ({ ...acc, [q]: answers[i] }),
          {},
        ),
      ),
      page_path: window.location.pathname,
    } as any);
    setSubmitted(true);
    setTimeout(() => setShow(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">{t('beta.survey_title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('beta.exit_survey')}
          </p>
        </div>

        {questions.map((q, i) => (
          <div key={i} className="space-y-1.5">
            <label className="text-sm font-medium">{q}</label>
            <Textarea
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              className="h-20"
            />
          </div>
        ))}

        <div className="flex gap-3">
          <Button className="flex-1" onClick={handleSubmit} data-feature="beta-survey-submit">
            {t('beta.survey_submit')}
          </Button>
          <Button variant="ghost" onClick={() => setShow(false)}>
            {t('beta.exit_later')}
          </Button>
        </div>
      </div>
    </div>
  );
}
