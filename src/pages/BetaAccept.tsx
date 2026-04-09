import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.svg';

export default function BetaAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needsAuth'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [testerType, setTesterType] = useState('');
  const acceptedRef = useRef(false);

  const acceptInvite = useCallback(async () => {
    if (!token || acceptedRef.current) return;
    acceptedRef.current = true;
    setStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('accept-beta-invite', {
        body: { token },
      });
      if (error) {
        setStatus('error');
        setErrorMsg(data?.error || error.message);
        acceptedRef.current = false;
        return;
      }
      if (data?.error) {
        setStatus('error');
        setErrorMsg(data.error);
        acceptedRef.current = false;
        return;
      }
      setTesterType(data?.tester_type ?? '');
      setStatus('success');
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      acceptedRef.current = false;
    }
  }, [token, navigate]);

  // Listen for SIGNED_IN event (fires after Google OAuth redirect)
  useEffect(() => {
    if (!token) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession && token) {
          acceptInvite();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [token, acceptInvite]);

  // Handle case where user is already logged in on mount
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setStatus('error');
      setErrorMsg('No invite token provided.');
      return;
    }
    if (!session) {
      setStatus('needsAuth');
      return;
    }
    acceptInvite();
  }, [token, session, authLoading, acceptInvite]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="Independent Minds" className="w-16 h-16 mx-auto" />
        <h1 className="font-display text-2xl font-medium">
          {t('beta.welcome_title')}
        </h1>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted-foreground">Processing invite...</p>
          </div>
        )}

        {status === 'needsAuth' && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t('beta.welcome_subtitle')}
            </p>
            <p className="text-sm text-muted-foreground">
              Please sign in or create an account to accept this invitation.
            </p>
            <Link to={`/login?redirect=${encodeURIComponent(`/beta/accept?token=${token}`)}`}>
              <Button className="w-full">Sign In / Create Account</Button>
            </Link>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle size={48} className="mx-auto text-primary" />
            <p className="text-lg font-medium">{t('beta.invite_accept')}</p>
            {testerType && (
              <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-600">
                {testerType}
              </span>
            )}
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <XCircle size={48} className="mx-auto text-destructive" />
            <p className="text-lg font-medium">{t('beta.invite_expired')}</p>
            <p className="text-muted-foreground">{errorMsg}</p>
            <Link to="/beta">
              <Button variant="outline">{t('beta.request_submit')}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
