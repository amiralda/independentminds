import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBetaTester } from '@/hooks/useBetaTester';
import { BetaFeedbackWidget } from './BetaFeedbackWidget';
import { BetaTaskPanel } from './BetaTaskPanel';
import { BetaPostSessionSurvey } from './BetaPostSessionSurvey';
import { BetaRecordingConsent } from './BetaRecordingConsent';
import { initBetaTracker, trackPageView, stopBetaTracker } from '@/lib/betaTracker';
import { startBetaRecording, stopBetaRecording } from '@/lib/betaRecorder';

export function BetaOverlay() {
  const { tester, isBetaTester, loading } = useBetaTester();
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (loading || !isBetaTester) return;
    initBetaTracker();
    return () => stopBetaTracker();
  }, [isBetaTester, loading]);

  // Check if we should show recording consent or start recording
  useEffect(() => {
    if (loading || !isBetaTester || !tester) return;

    const optedOut = localStorage.getItem('beta_recording_opted_out') === 'true';
    if (optedOut) return;

    if (tester.recording_consent) {
      // Already consented — start recording
      const sid = sessionStorage.getItem('beta_session_id');
      if (sid) {
        startBetaRecording(sid).then(ok => setRecordingActive(ok));
      }
    } else {
      // Show consent banner on first session
      const consentShown = sessionStorage.getItem('beta_consent_shown');
      if (!consentShown) {
        setShowConsentBanner(true);
        sessionStorage.setItem('beta_consent_shown', 'true');
      }
    }

    return () => {
      const sid = sessionStorage.getItem('beta_session_id');
      if (sid) stopBetaRecording(sid);
    };
  }, [isBetaTester, loading, tester]);

  useEffect(() => {
    if (!isBetaTester) return;
    trackPageView(location.pathname);
  }, [location.pathname, isBetaTester]);

  const handleConsentAccept = async () => {
    setShowConsentBanner(false);
    // Update recording_consent in DB
    if (tester) {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase
        .from('beta_testers')
        .update({ recording_consent: true })
        .eq('id', tester.id);
    }
    const sid = sessionStorage.getItem('beta_session_id');
    if (sid) {
      const ok = await startBetaRecording(sid);
      setRecordingActive(ok);
    }
  };

  const handleConsentDecline = () => {
    setShowConsentBanner(false);
    localStorage.setItem('beta_recording_opted_out', 'true');
  };

  if (loading || !isBetaTester) return null;

  return (
    <>
      <BetaFeedbackWidget />
      <BetaTaskPanel
        open={taskPanelOpen}
        onClose={() => setTaskPanelOpen((o) => !o)}
      />
      <BetaPostSessionSurvey />
      {showConsentBanner && (
        <BetaRecordingConsent
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      )}
    </>
  );
}
