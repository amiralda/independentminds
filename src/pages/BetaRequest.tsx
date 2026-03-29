import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LanguageToggle } from '@/components/LanguageToggle';
import { CheckCircle, Loader2, Users } from 'lucide-react';
import logo from '@/assets/logo.svg';

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

  // Look up referrer display info
  useEffect(() => {
    if (!referralCode) return;
    const lookupReferrer = async () => {
      const { data } = await supabase
        .from('beta_testers')
        .select('user_id')
        .eq('referral_code' as any, referralCode)
        .maybeSingle();
      const row = data as { user_id: string } | null;
      if (row?.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', row.user_id)
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
    } as any);
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-between items-center">
          <img src={logo} alt="Independent Minds" className="w-12 h-12" />
          <LanguageToggle />
        </div>

        <h1 className="font-display text-2xl font-medium">{t('beta.request_title')}</h1>

        {referrerName && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <Users size={16} className="text-primary shrink-0" />
            <span>{t('beta.referred_by_label')}: <strong>{referrerName}</strong></span>
          </div>
        )}

        {submitted ? (
          <div className="text-center space-y-4 py-8">
            <CheckCircle size={48} className="mx-auto text-primary" />
            <p className="text-lg font-medium">{t('beta.request_thanks')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('beta.request_name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>{t('beta.request_email')}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>{t('beta.request_type')}</Label>
              <select
                value={testerType}
                onChange={(e) => setTesterType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="parent">Parent</option>
                <option value="student">Student</option>
                <option value="co_guardian">Co-guardian</option>
                <option value="educator">Educator</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('beta.request_motivation')}</Label>
              <Textarea
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                className="h-24"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting || !name || !email}
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin mr-2" />
              ) : null}
              {t('beta.request_submit')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
