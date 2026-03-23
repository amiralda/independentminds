import { useBetaTester } from '@/hooks/useBetaTester';
import { useI18n } from '@/lib/i18n';
import { FlaskConical } from 'lucide-react';

interface BetaBadgeProps {
  onClick?: () => void;
}

export function BetaBadge({ onClick }: BetaBadgeProps) {
  const { tester, isBetaTester } = useBetaTester();
  const { t } = useI18n();

  if (!isBetaTester || !tester) return null;

  const pending = (tester.tasks_total ?? 0) - (tester.tasks_completed ?? 0);

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/25 transition-colors"
      data-feature="beta-badge"
    >
      <FlaskConical size={12} />
      {t('beta.badge')}
      {pending > 0 && (
        <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
          {pending}
        </span>
      )}
    </button>
  );
}
