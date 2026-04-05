import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, X, ThumbsUp, Bug, Lightbulb, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const EMOJIS = [
  { score: 1, emoji: '😞', label: 'Very bad' },
  { score: 2, emoji: '😐', label: 'Bad' },
  { score: 3, emoji: '🙂', label: 'Okay' },
  { score: 4, emoji: '😊', label: 'Good' },
  { score: 5, emoji: '🤩', label: 'Amazing' },
];

const CATEGORIES = [
  'Schedule', 'AI Tutor', 'Notifications',
  'Rewards', 'Reports', 'Other',
];

export function FeedbackWidget() {
  const { user, profile } = useAuth();
  const { isBetaTester } = useBetaTester();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [bugText, setBugText] = useState('');
  const [featureText, setFeatureText] = useState('');
  const [category, setCategory] = useState('Other');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const userRole = profile?.role || 'parent';

  const submitFeedback = async (
    type: string,
    data: { rating?: number; message?: string; category?: string; screenshotFile?: File | null },
  ) => {
    setSubmitting(true);
    try {
      let screenshotUrl: string | null = null;

      if (data.screenshotFile) {
        const ext = data.screenshotFile.name.split('.').pop() || 'png';
        const path = `user-feedback/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('beta-screenshots')
          .upload(path, data.screenshotFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from('beta-screenshots')
            .getPublicUrl(path);
          screenshotUrl = urlData?.publicUrl || null;
        }
      }

      await supabase.from('user_feedback' as any).insert({
        user_id: user.id,
        user_role: userRole,
        is_beta_tester: isBetaTester,
        feedback_type: type,
        rating: data.rating ?? null,
        message: data.message || null,
        category: data.category || null,
        page_path: window.location.pathname,
        screenshot_url: screenshotUrl,
        status: 'new',
      } as any);

      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
        setRating(0);
        setComment('');
        setBugText('');
        setFeatureText('');
        setCategory('Other');
        setScreenshotFile(null);
      }, 1500);
    } catch {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="feedback-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-4 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1D9E75' }}
            aria-label="Give feedback"
          >
            <MessageCircle size={20} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="feedback-widget"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h4 className="text-sm font-medium">Share Feedback</h4>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close feedback"
              >
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 text-center"
              >
                <p className="text-sm font-medium" style={{ color: '#1D9E75' }}>
                  Thank you! 🎉
                </p>
              </motion.div>
            ) : (
              <Tabs defaultValue="rate" className="p-3">
                <TabsList className="w-full">
                  <TabsTrigger value="rate" className="flex-1 text-xs">
                    <ThumbsUp size={12} className="mr-1" />
                    Rate
                  </TabsTrigger>
                  <TabsTrigger value="bug" className="flex-1 text-xs">
                    <Bug size={12} className="mr-1" />
                    Problem
                  </TabsTrigger>
                  <TabsTrigger value="feature" className="flex-1 text-xs">
                    <Lightbulb size={12} className="mr-1" />
                    Suggest
                  </TabsTrigger>
                </TabsList>

                {/* Rating tab */}
                <TabsContent value="rate" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground text-center">
                    How is your experience today?
                  </p>
                  <div className="flex gap-2 justify-center">
                    {EMOJIS.map((e) => (
                      <button
                        key={e.score}
                        onClick={() => setRating(e.score)}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          rating === e.score ? 'scale-125' : 'opacity-50'
                        }`}
                        aria-label={e.label}
                      >
                        {e.emoji}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 200))}
                    placeholder="Any comments? (optional)"
                    className="text-sm h-16"
                    maxLength={200}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={rating === 0 || submitting}
                    onClick={() => submitFeedback('rating', { rating, message: comment })}
                  >
                    {submitting ? 'Sending...' : 'Submit'}
                  </Button>
                </TabsContent>

                {/* Bug report tab */}
                <TabsContent value="bug" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground text-center">
                    What went wrong?
                  </p>
                  <Textarea
                    value={bugText}
                    onChange={(e) => setBugText(e.target.value.slice(0, 500))}
                    placeholder="Describe the issue..."
                    className="text-sm h-20"
                    maxLength={500}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Upload size={12} />
                      {screenshotFile ? screenshotFile.name.slice(0, 20) : 'Screenshot (optional)'}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!bugText.trim() || submitting}
                    onClick={() =>
                      submitFeedback('bug', {
                        message: bugText,
                        screenshotFile,
                      })
                    }
                  >
                    {submitting ? 'Sending...' : 'Report Problem'}
                  </Button>
                </TabsContent>

                {/* Feature request tab */}
                <TabsContent value="feature" className="space-y-3 mt-3">
                  <p className="text-xs text-muted-foreground text-center">
                    What would make IME better?
                  </p>
                  <Textarea
                    value={featureText}
                    onChange={(e) => setFeatureText(e.target.value.slice(0, 500))}
                    placeholder="Your suggestion..."
                    className="text-sm h-20"
                    maxLength={500}
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm rounded-md border border-input bg-background px-3 py-1.5"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!featureText.trim() || submitting}
                    onClick={() =>
                      submitFeedback('feature', {
                        message: featureText,
                        category,
                      })
                    }
                  >
                    {submitting ? 'Sending...' : 'Send Suggestion'}
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
