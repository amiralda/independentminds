import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

interface BetaRecordingConsentProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function BetaRecordingConsent({ onAccept, onDecline }: BetaRecordingConsentProps) {
  const { t } = useI18n();

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-card border rounded-xl p-4 shadow-lg space-y-3 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2">
        <Video size={18} className="text-primary" />
        <p className="text-sm font-medium">{t('beta.recording_notice')}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept} className="flex-1 text-xs">
          {t('beta.recording_ok')}
        </Button>
        <Button size="sm" variant="outline" onClick={onDecline} className="flex-1 text-xs">
          {t('beta.recording_opt_out')}
        </Button>
      </div>
    </div>
  );
}
