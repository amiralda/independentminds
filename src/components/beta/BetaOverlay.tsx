import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBetaTester } from '@/hooks/useBetaTester';
import { BetaFeedbackWidget } from './BetaFeedbackWidget';
import { BetaTaskPanel } from './BetaTaskPanel';
import { BetaPostSessionSurvey } from './BetaPostSessionSurvey';
import { initBetaTracker, trackPageView, stopBetaTracker } from '@/lib/betaTracker';

export function BetaOverlay() {
  const { isBetaTester, loading } = useBetaTester();
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (loading || !isBetaTester) return;
    initBetaTracker();
    return () => stopBetaTracker();
  }, [isBetaTester, loading]);

  useEffect(() => {
    if (!isBetaTester) return;
    trackPageView(location.pathname);
  }, [location.pathname, isBetaTester]);

  if (loading || !isBetaTester) return null;

  return (
    <>
      <BetaFeedbackWidget />
      <BetaTaskPanel
        open={taskPanelOpen}
        onClose={() => setTaskPanelOpen((o) => !o)}
      />
      <BetaPostSessionSurvey />
    </>
  );
}
