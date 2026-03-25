import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, X, Star, Bug, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BetaFeedbackWidget() {
  const { tester, isBetaTester } = useBetaTester();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [bugWhat, setBugWhat] = useState('');
  const [bugExpected, setBugExpected] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [submitted, setSubmitted] = useState('');

  if (!isBetaTester || !tester) return null;

  const submitFeedback = async (type: string, data: any) => {
    await supabase.from('beta_feedback').insert({
      tester_id: tester.id,
      feedback_type: type,
      page_path: window.location.pathname,
      ...data,
    } as any);
    setSubmitted(type);
    setTimeout(() => {
      setSubmitted('');
      setOpen(false);
      setRating(0);
      setComment('');
      setNpsScore(null);
      setBugWhat('');
      setBugExpected('');
      setBugSteps('');
    }, 2000);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
            data-feature="beta-feedback-open"
          >
            <MessageSquare size={16} />
            {t('beta.feedback_btn')}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="widget"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 z-50 w-80 rounded-xl border border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h4 className="text-sm font-medium">{t('beta.widget_title')}</h4>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 text-center"
              >
                <p className="text-sm text-primary font-medium">{t('beta.nps_thanks')}</p>
              </motion.div>
            ) : (
              <Tabs defaultValue="widget" className="p-3">
                <TabsList className="w-full">
                  <TabsTrigger value="widget" className="flex-1 text-xs">
                    <Star size={12} className="mr-1" />
                    {t('beta.widget_rating')}
                  </TabsTrigger>
                  <TabsTrigger value="bug" className="flex-1 text-xs">
                    <Bug size={12} className="mr-1" />
                    Bug
                  </TabsTrigger>
                  <TabsTrigger value="nps" className="flex-1 text-xs">
                    <BarChart3 size={12} className="mr-1" />
                    NPS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="widget" className="space-y-3 mt-3">
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        className={`text-lg transition-transform ${n <= rating ? 'text-primary scale-110' : 'text-muted-foreground/30'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('beta.widget_comment')}
                    className="text-sm h-20"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={rating === 0}
                    onClick={() => submitFeedback('widget', { rating, comment })}
                    data-feature="beta-feedback-submit"
                  >
                    {t('beta.widget_submit')}
                  </Button>
                </TabsContent>

                <TabsContent value="bug" className="space-y-2 mt-3">
                  <Textarea
                    value={bugWhat}
                    onChange={(e) => setBugWhat(e.target.value)}
                    placeholder={t('beta.bug_desc')}
                    className="text-sm h-16"
                  />
                  <Textarea
                    value={bugExpected}
                    onChange={(e) => setBugExpected(e.target.value)}
                    placeholder={t('beta.bug_expected')}
                    className="text-sm h-16"
                  />
                  <Textarea
                    value={bugSteps}
                    onChange={(e) => setBugSteps(e.target.value)}
                    placeholder={t('beta.bug_steps')}
                    className="text-sm h-16"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!bugWhat}
                    onClick={() =>
                      submitFeedback('bug_report', {
                        comment: JSON.stringify({
                          what: bugWhat, expected: bugExpected, steps: bugSteps,
                        }),
                      })
                    }
                    data-feature="beta-bug-submit"
                  >
                    {t('beta.bug_submit')}
                  </Button>
                </TabsContent>

                <TabsContent value="nps" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground text-center">
                    {t('beta.nps_question')}
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setNpsScore(i)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          npsScore === i
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={npsScore === null}
                    onClick={() => submitFeedback('nps', { nps_score: npsScore, comment })}
                    data-feature="beta-nps-submit"
                  >
                    {t('beta.nps_submit')}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
