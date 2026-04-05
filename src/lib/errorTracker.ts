// Global error tracking for ALL authenticated users
import { supabase } from '@/integrations/supabase/client';

let initialized = false;
let errorQueue: ErrorPayload[] = [];
let flushTimer: number | null = null;

interface ErrorPayload {
  error_message: string;
  error_stack: string | null;
  page_path: string;
  browser: string;
  device_type: string;
  timestamp: string;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Other';
}

function enqueueError(message: string, stack?: string | null) {
  errorQueue.push({
    error_message: message.slice(0, 500),
    error_stack: stack?.slice(0, 500) ?? null,
    page_path: window.location.pathname,
    browser: getBrowser(),
    device_type: getDeviceType(),
    timestamp: new Date().toISOString(),
  });
}

async function flushErrors() {
  if (errorQueue.length === 0) return;

  const batch = errorQueue.splice(0, 10);

  try {
    await supabase.functions.invoke('track-error', {
      body: { errors: batch },
    });
  } catch {
    // Silently fail — don't disrupt user experience
  }
}

function handleError(event: ErrorEvent) {
  enqueueError(
    event.message || 'Unknown error',
    event.error?.stack,
  );
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason;
  enqueueError(
    String(reason?.message || reason).slice(0, 500),
    reason?.stack,
  );
}

export function initErrorTracker() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Flush every 30 seconds
  flushTimer = window.setInterval(() => flushErrors(), 30_000);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (errorQueue.length === 0) return;
    const body = JSON.stringify({ errors: errorQueue.splice(0, 10) });
    navigator.sendBeacon?.(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-error`,
      new Blob([body], { type: 'application/json' }),
    );
  });
}

export function stopErrorTracker() {
  if (!initialized) return;
  initialized = false;
  window.removeEventListener('error', handleError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushErrors();
}

// Manual error reporting (for React error boundaries)
export function reportError(error: Error, info?: string) {
  enqueueError(
    error.message || 'Component error',
    error.stack,
  );
  // Flush immediately for boundary errors
  flushErrors();
}
