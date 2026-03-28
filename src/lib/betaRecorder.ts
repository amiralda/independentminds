import { supabase } from '@/integrations/supabase/client';

let stopFn: (() => void) | null = null;
let recordedEvents: any[] = [];
let uploadTimer: number | null = null;

const RRWEB_CDN = 'https://unpkg.com/rrweb@2.0.0-alpha.11/dist/rrweb.umd.cjs.js';
const CHUNK_SIZE = 500; // events per chunk
const UPLOAD_INTERVAL = 60_000; // 1 minute

async function loadRrweb(): Promise<any> {
  if ((window as any).rrweb) return (window as any).rrweb;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = RRWEB_CDN;
    script.onload = () => resolve((window as any).rrweb);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function uploadChunk(sessionId: string, events: any[]) {
  if (events.length === 0) return;

  const blob = new Blob([JSON.stringify(events)], { type: 'application/json' });
  const timestamp = Date.now();
  const path = `${sessionId}/${timestamp}.json`;

  const { error } = await supabase.storage
    .from('beta-recordings')
    .upload(path, blob, { contentType: 'application/json', upsert: false });

  if (!error) {
    // Update session recording_url with the session folder path
    await supabase.functions.invoke('beta-track', {
      body: {
        events: [],
        session_data: {
          session_id: sessionId,
          recording_url: `beta-recordings/${sessionId}/`,
        },
      },
    });
  }
}

export async function startBetaRecording(sessionId: string): Promise<boolean> {
  try {
    const rrweb = await loadRrweb();
    if (!rrweb?.record) return false;

    recordedEvents = [];

    stopFn = rrweb.record({
      emit(event: any) {
        recordedEvents.push(event);
        if (recordedEvents.length >= CHUNK_SIZE) {
          const chunk = recordedEvents.splice(0, CHUNK_SIZE);
          uploadChunk(sessionId, chunk).catch(() => {});
        }
      },
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
      },
      blockSelector: '[data-rrweb-block]',
      maskTextSelector: 'input[type="password"], input[type="email"]',
    });

    // Periodic upload of remaining events
    uploadTimer = window.setInterval(() => {
      if (recordedEvents.length > 0) {
        const chunk = recordedEvents.splice(0, CHUNK_SIZE);
        uploadChunk(sessionId, chunk).catch(() => {});
      }
    }, UPLOAD_INTERVAL);

    return true;
  } catch {
    return false;
  }
}

export function stopBetaRecording(sessionId: string) {
  if (uploadTimer) {
    clearInterval(uploadTimer);
    uploadTimer = null;
  }
  if (stopFn) {
    stopFn();
    stopFn = null;
  }
  // Final upload
  if (recordedEvents.length > 0) {
    const chunk = recordedEvents.splice(0);
    uploadChunk(sessionId, chunk).catch(() => {});
  }
}
