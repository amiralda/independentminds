import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import logo from '@/assets/logo.svg';

export default function Unsubscribe() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(d => setStatus(d.valid ? 'valid' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      setStatus(data?.success ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-xl border p-8 text-center space-y-4">
        <img src={logo} alt="Independent Minds EDU" className="w-12 h-12 mx-auto" />
        <h1 className="text-xl font-display font-bold">
          {status === 'done' ? 'Unsubscribed' : 'Unsubscribe'}
        </h1>
        {status === 'loading' && <p className="text-muted-foreground">Loading...</p>}
        {status === 'valid' && (
          <>
            <p className="text-muted-foreground">
              Click below to unsubscribe from email notifications.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="bg-destructive text-destructive-foreground px-6 py-2 rounded-lg font-medium"
            >
              Confirm Unsubscribe
            </button>
          </>
        )}
        {status === 'done' && (
          <p className="text-muted-foreground">
            You have been unsubscribed. You will no longer receive email notifications.
          </p>
        )}
        {status === 'invalid' && (
          <p className="text-muted-foreground">
            This unsubscribe link is invalid or has already been used.
          </p>
        )}
        {status === 'error' && (
          <p className="text-destructive">
            Something went wrong. Please try again later.
          </p>
        )}
      </div>
    </div>
  );
}
