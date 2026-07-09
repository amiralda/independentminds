import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CheckCircle, Loader2, Users, Sparkles, BookOpen, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/logo.svg';
import { SEO } from '@/components/SEO';

export default function BetaRequest() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const [phase, setPhase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [testerType, setTesterType] = useState('parent');
  const [motivation, setMotivation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    const checkPhase = async () => {
      const { data } = await supabase
        .from('beta_config')
        .select('phase')
        .eq('id', 1)
        .maybeSingle();
      setPhase(data?.phase ?? 'closed');
      setLoading(false);
    };
    checkPhase();
  }, []);

  useEffect(() => {
    if (!referralCode) return;
    const lookupReferrer = async () => {
      const { data } = await (supabase as unknown)
        .from('beta_testers')
        .select('user_id')
        .eq('referral_code', referralCode)
        .maybeSingle();
      if (data?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', data.user_id)
          .maybeSingle();
        if (profile?.display_name) {
          setReferrerName(profile.display_name);
        }
      }
    };
    lookupReferrer();
  }, [referralCode]);

  useEffect(() => {
    if (!loading && phase !== 'open') {
      navigate('/login');
    }
  }, [phase, loading]);

  const handleSubmit = async () => {
    if (!name || !email || !testerType) return;
    setSubmitting(true);
    const { error } = await supabase.from('beta_requests').insert({
      name,
      email,
      tester_type: testerType,
      motivation: motivation || null,
      language: 'en',
      referred_by_code: referralCode || null,
    } as unknown);
    setSubmitting(false);
    if (!error) setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const features = [
    { icon: BookOpen, label: t('beta.feature_schedule') },
    { icon: Sparkles, label: t('beta.feature_ai') },
    { icon: Shield, label: t('beta.feature_privacy') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <SEO
        title="Beta program — Independent Minds EDU"
        description="Request access to the Independent Minds EDU beta program and help shape the next generation of multilingual homeschool tools."
        path="/beta"
      />
      {/* Hero strip */}
      <div className="bg-primary/10 border-b border-primary/15">
        <div className="max-w-lg mx-auto flex justify-between items-center px-5 py-3">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Independent Minds" className="w-9 h-9" />
            <span className="font-display text-sm font-medium text-foreground/80">
              Independent Minds EDU
            </span>
          </div>
          <LanguageToggle />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-lg w-full space-y-6"
        >
          {/* Title section */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-2">
              <Sparkles size={12} />
              Beta
            </div>
            <h1 className="font-display text-2xl font-medium text-foreground">
              {t('beta.request_title')}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {t('beta.request_subtitle')}
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {features.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                <Icon size={13} className="text-primary" />
                {label}
              </motion.div>
            ))}
          </div>

          {referrerName && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
            >
              <Users size={16} className="text-primary shrink-0" />
              <span>{t('beta.referred_by_label')}: <strong>{referrerName}</strong></span>
            </motion.div>
          )}

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center space-y-4 py-10"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle size={32} className="text-primary" />
              </div>
              <p className="text-lg font-display font-medium">{t('beta.request_thanks')}</p>
              <p className="text-sm text-muted-foreground">{t('beta.request_thanks_desc')}</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('beta.request_name')}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean-Pierre Augustin"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('beta.request_email')}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('beta.request_type')}</Label>
                <select
                  value={testerType}
                  onChange={(e) => setTesterType(e.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="parent">Parent</option>
                  <option value="student">Student</option>
                  <option value="co_guardian">Co-guardian</option>
                  <option value="educator">Educator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('beta.request_motivation')}</Label>
                <Textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  className="h-20 resize-none"
                  placeholder={t('beta.request_motivation_placeholder')}
                />
              </div>

              <Button
                className="w-full h-11 font-medium text-sm"
                onClick={handleSubmit}
                disabled={submitting || !name || !email}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Sparkles size={16} className="mr-2" />
                )}
                {t('beta.request_submit')}
              </Button>
            </motion.div>
          )}

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground/60">
            {t('beta.request_footer')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
