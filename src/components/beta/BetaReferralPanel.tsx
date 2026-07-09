import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { useBetaTester } from '@/hooks/useBetaTester';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';
import { buildAppUrl } from '@/lib/siteUrl';

export function BetaReferralPanel() {
  const { t } = useI18n();
  const { tester } = useBetaTester();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!tester) return;

    const fetchReferralData = async () => {
      // Get referral code
      const { data: testerData } = await (supabase as unknown)
        .from('beta_testers')
        .select('referral_code')
        .eq('id', tester.id)
        .maybeSingle();

      if (testerData?.referral_code) {
        setReferralCode(testerData.referral_code);
      }

      // Get referral count
      const { count } = await (supabase as unknown)
        .from('beta_referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_tester_id', tester.id)
        .eq('status', 'awarded');

      setReferralCount(count ?? 0);
    };

    fetchReferralData();
  }, [tester]);

  if (!tester || !referralCode) return null;

  const referralUrl = buildAppUrl(`/beta?ref=${referralCode}`);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success(t('beta.referral_copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift size={18} className="text-primary" />
          {t('beta.referral_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('beta.referral_desc')}
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('beta.referral_link')}</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralUrl}
              className="text-xs font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              aria-label={t('beta.referral_copied')}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Users size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">{t('beta.referral_count')}:</span>
          <span className="font-medium">{referralCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
