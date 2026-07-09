import { supabase } from '@/integrations/supabase/client';

const eventQueue: unknown[] = [];
let sessionId: string | null = null;
let flushTimer: number | null = null;
let pageCount = 0;
let eventCount = 0;
let sessionStart = 0;
let lastClickTime = 0;
let lastClickTarget = '';
let rapidClickCount = 0;

function getSessionId(): string {
  if (sessionId) return sessionId;
  const stored = sessionStorage.getItem('beta_session_id');
  if (stored) {
    sessionId = stored;
    return stored;
  }
  sessionId = crypto.randomUUID();
  sessionStorage.setItem('beta_session_id', sessionId);
  return sessionId;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

function enqueue(event: unknown) {
  eventQueue.push({
    ...event,
    session_id: getSessionId(),
  });
  eventCount++;
}

async function flush(final = false) {
  if (eventQueue.length === 0 && !final) return;

  const events = eventQueue.splice(0, 50);
  const sessionData = {
    session_id: getSessionId(),
    device_type: getDeviceType(),
    browser: getBrowser(),
    language: navigator.language?.slice(0, 2) ?? 'en',
    page_count: pageCount,
    event_count: eventCount,
    duration_seconds: Math.floor((Date.now() - sessionStart) / 1000),
    ended: final,
  };

  try {
    await supabase.functions.invoke('beta-track', {
      body: { events, session_data: sessionData },
    });
  } catch {
    // Silently fail — don't disrupt user experience
  }
}

function handlePageView(path: string) {
  pageCount++;
  enqueue({
    event_type: 'page_view',
    page_path: path,
  });
}

function handleFeatureClick(e: Event) {
  const target = e.target as HTMLElement;
  const feature = target.closest('[data-feature]');
  if (feature) {
    enqueue({
      event_type: 'feature_click',
      feature_name: (feature as HTMLElement).dataset.feature,
      element_selector: feature.tagName.toLowerCase(),
      page_path: window.location.pathname,
    });
  }

  // Rage click detection
  const now = Date.now();
  const selector = target.tagName + '.' + target.className.split(' ')[0];
  if (selector === lastClickTarget && now - lastClickTime < 400) {
    rapidClickCount++;
    if (rapidClickCount >= 3) {
      enqueue({
        event_type: 'rage_click',
        element_selector: selector,
        page_path: window.location.pathname,
      });
      rapidClickCount = 0;
    }
  } else {
    rapidClickCount = 1;
    lastClickTarget = selector;
  }
  lastClickTime = now;
}

function handleError(event: ErrorEvent) {
  enqueue({
    event_type: 'error',
    page_path: window.location.pathname,
    metadata: {
      message: event.message?.slice(0, 200),
      stack: event.error?.stack?.slice(0, 500) ?? null,
    },
  });
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason;
  enqueue({
    event_type: 'error',
    page_path: window.location.pathname,
    metadata: {
      message: String(reason)?.slice(0, 200),
      stack: reason?.stack?.slice(0, 500) ?? null,
    },
  });
}

export function initBetaTracker() {
  sessionStart = Date.now();
  const sid = getSessionId();

  // Session start event
  enqueue({
    event_type: 'session_start',
    page_path: window.location.pathname,
    metadata: {
      device_type: getDeviceType(),
      browser: getBrowser(),
      language: navigator.language,
    },
  });

  // Initial page view
  handlePageView(window.location.pathname);

  // Click listener for feature tracking + rage clicks
  document.addEventListener('click', handleFeatureClick, true);

  // Error listeners
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Flush every 30 seconds
  flushTimer = window.setInterval(() => flush(), 30_000);

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    enqueue({
      event_type: 'session_end',
      page_path: window.location.pathname,
      duration_ms: Date.now() - sessionStart,
    });
    // Use sendBeacon for reliable delivery
    const body = JSON.stringify({
      events: eventQueue.splice(0, 50),
      session_data: {
        session_id: sid,
        device_type: getDeviceType(),
        browser: getBrowser(),
        language: navigator.language?.slice(0, 2),
        page_count: pageCount,
        event_count: eventCount,
        duration_seconds: Math.floor((Date.now() - sessionStart) / 1000),
        ended: true,
      },
    });
    navigator.sendBeacon?.(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beta-track`,
      new Blob([body], { type: 'application/json' }),
    );
  });
}

export function trackPageView(path: string) {
  handlePageView(path);
}

export function stopBetaTracker() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  document.removeEventListener('click', handleFeatureClick, true);
  window.removeEventListener('error', handleError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  flush(true);
}
