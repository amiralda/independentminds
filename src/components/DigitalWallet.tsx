import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePointsBalance } from '@/hooks/useRewards';
import {
  useCurrencySettings,
  convertPointsToCurrency,
} from '@/hooks/useCurrencySettings';
import { useDigitalChecks, useIssueCheck } from '@/hooks/useDigitalChecks';
import { Button } from '@/components/ui/button';
import { Wallet, Receipt, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { DigitalCheckCard } from '@/components/DigitalCheckCard';

export function DigitalWallet() {
  const { lang, t } = useI18n();
  const { profile, selectedStudentId } = useAuth();
  const studentId =
    profile?.role === 'student' ? profile.studentId : selectedStudentId;
  const isParent = profile?.role === 'parent';

  const { data: balance = 0 } = usePointsBalance(studentId || null);
  const { data: currencySettings } = useCurrencySettings(studentId || null);
  const { data: checks = [] } = useDigitalChecks(studentId || null);
  const issueCheckMutation = useIssueCheck();

  const currency = convertPointsToCurrency(balance, currencySettings);

  const handleIssueCheck = () => {
    if (!studentId || !currencySettings || balance <= 0) return;
    const converted = convertPointsToCurrency(balance, currencySettings);
    issueCheckMutation.mutate(
      {
        student_id: studentId,
        amount_points: balance,
        currency_amount: parseFloat(converted.amount),
        currency_code: converted.code,
        currency_symbol: converted.symbol,
        memo: t('check.memo'),
      },
      {
        onSuccess: () => toast.success(t('wallet.checkIssued')),
      }
    );
  };

  if (!currencySettings) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-center">
      <Wallet size={24} className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t('currency.notConfigured')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Wallet Balance */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/10 border border-primary/20 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('wallet.title')}
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm text-muted-foreground">
                {currency.symbol}
              </span>
              <span className="font-display text-4xl font-bold text-foreground">
                {currency.amount}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {currency.code}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {balance} {t('wallet.points')} ×{' '}
              {currencySettings.points_per_unit}{' '}
              {t('currency.pts')}/{currency.symbol}1
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
            <Wallet size={28} className="text-primary" />
          </div>
        </div>

        {isParent && balance > 0 && (
          <Button
            size="sm"
            className="w-full mt-3 text-xs font-display"
            onClick={handleIssueCheck}
            disabled={issueCheckMutation.isPending}
          >
            <Receipt size={14} className="mr-1" />
            {t('wallet.issueCheck')}
          </Button>
        )}
      </div>

      {/* Digital Checks */}
      {checks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-sm flex items-center gap-1.5">
            <FileText size={14} className="text-primary" />
            {lang === 'HT' ? 'Chèk Dijital' : 'Digital Checks'}
          </h3>
          <div className="space-y-3">
            {checks.map(check => (
              <DigitalCheckCard key={check.id} check={check} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
