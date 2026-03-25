import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Link, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'ht', label: '🇭🇹 Kreyòl' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'ru', label: '🇷🇺 Русский' },
];

interface AdminInvitePanelProps {
  open: boolean;
  onClose: () => void;
  prefill?: {
    name?: string;
    email?: string;
    tester_type?: string;
    language?: string;
  };
}

export function AdminInvitePanel({ open, onClose, prefill }: AdminInvitePanelProps) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(prefill?.name ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [testerType, setTesterType] = useState(prefill?.tester_type ?? 'parent');
  const [language, setLanguage] = useState(prefill?.language ?? lang);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkSending, setBulkSending] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    if (!name || !email || !testerType) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-beta-invite', {
        body: {
          name, email,
          tester_type: testerType, language, notes: notes || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.invite_url) {
        await navigator.clipboard.writeText(data.invite_url);
        setInviteUrl(data.invite_url);
        toast.success(t('invite_panel.success_copy'));
      } else {
        toast.success(t('invite_panel.success').replace('{{name}}', name));
        setTimeout(onClose, 2000);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleBulkSend = async () => {
    const emails = bulkEmails
      .split('\n')
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));
    if (emails.length === 0) return;

    setBulkSending(true);
    let sent = 0;
    let failed = 0;
    for (const em of emails.slice(0, 20)) {
      try {
        await supabase.functions.invoke('send-beta-invite', {
          body: {
            name: em.split('@')[0],
            email: em,
            tester_type: testerType,
            language,
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }
    toast.success(`${sent} invites created. ${failed} failed.`);
    setBulkSending(false);
    setBulkEmails('');
  };

  const validBulkCount = bulkEmails
    .split('\n')
    .filter((e) => e.trim().includes('@')).length;

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-full bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">{t('invite_panel.title')}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label={t('common.close')}>
          <X size={18} />
        </button>
      </div>

      <Tabs defaultValue="single" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="single" className="flex-1">Single</TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1">{t('invite_panel.bulk_title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="flex-1 p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>{t('invite_panel.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marie Joseph" />
          </div>

          <div className="space-y-1.5">
            <Label>{t('invite_panel.email')}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('invite_panel.tester_type')}</Label>
            <select
              value={testerType}
              onChange={(e) => setTesterType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="parent">Parent</option>
              <option value="student">Student</option>
              <option value="co_guardian">Co-guardian</option>
              <option value="educator">Educator</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('invite_panel.language')}</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('invite_panel.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              className="h-16"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">{notes.length}/300</p>
          </div>

          <p className="text-xs text-muted-foreground">{t('invite_panel.expires_in')}</p>

          <Button
            className="w-full"
            onClick={handleSend}
            disabled={sending || !name || !email}
            data-feature="beta-invite-send"
          >
            {sending ? (
              <><Loader2 size={14} className="animate-spin mr-2" />{t('invite_panel.sending')}</>
            ) : (
              <><Link size={14} className="mr-2" />{t('invite_panel.channel_copy')}</>
            )}
          </Button>

          {inviteUrl && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/50">
              <p className="text-sm font-medium">{t('invite_panel.invite_link')}</p>
              <Input value={inviteUrl} readOnly className="text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success(t('invite_panel.copied'));
                }}
              >
                {t('invite_panel.copy_again')}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="flex-1 p-4 space-y-4">
          <Textarea
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder={t('invite_panel.bulk_placeholder')}
            className="h-32"
          />
          <p className="text-xs text-muted-foreground">
            {validBulkCount > 0
              ? `${validBulkCount} valid emails detected`
              : 'Paste emails above to count'}
          </p>

          <div className="space-y-1.5">
            <Label>{t('invite_panel.tester_type')}</Label>
            <select
              value={testerType}
              onChange={(e) => setTesterType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="parent">Parent</option>
              <option value="student">Student</option>
              <option value="co_guardian">Co-guardian</option>
              <option value="educator">Educator</option>
            </select>
          </div>

          <Button
            className="w-full"
            onClick={handleBulkSend}
            disabled={bulkSending || validBulkCount === 0}
          >
            {bulkSending ? (
              <><Loader2 size={14} className="animate-spin mr-2" />Sending...</>
            ) : (
              t('invite_panel.bulk_send').replace('{{count}}', String(validBulkCount))
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
