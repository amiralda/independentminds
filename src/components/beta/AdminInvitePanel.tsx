import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { buildAppUrl } from '@/lib/siteUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X, Link, Loader2, Mail, MessageSquare,
  Phone, Send, ExternalLink, Check,
} from 'lucide-react';
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

type Channel = 'email' | 'sms' | 'whatsapp' | 'telegram';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

const NOTE_TEMPLATES: Record<string, string> = {
  parent:
    "Welcome! We'd love your feedback on managing your child's daily schedule and tracking progress.",
  student:
    'Hey! Try logging lessons, earning points, and chatting with Mr A.',
  co_guardian:
    "You've been invited to help monitor a student's learning journey.",
  educator:
    'We value your professional perspective on our homeschool tools.',
};

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

export function AdminInvitePanel({
  open,
  onClose,
  prefill,
}: AdminInvitePanelProps) {
  const { t, lang } = useI18n();
  const [name, setName] = useState(prefill?.name ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [testerType, setTesterType] = useState(
    prefill?.tester_type ?? 'parent',
  );
  const [language, setLanguage] = useState(prefill?.language ?? lang);
  const [notes, setNotes] = useState(
    NOTE_TEMPLATES[prefill?.tester_type ?? 'parent'] || '',
  );
  const [channels, setChannels] = useState<Set<Channel>>(new Set());
  const [copyOnly, setCopyOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 });
  const [previewTab, setPreviewTab] = useState<Channel>('email');

  // Reset form when prefill changes
  useEffect(() => {
    if (prefill) {
      setName(prefill.name ?? '');
      setEmail(prefill.email ?? '');
      setTesterType(prefill.tester_type ?? 'parent');
      setLanguage(prefill.language ?? lang);
      setNotes(
        NOTE_TEMPLATES[prefill.tester_type ?? 'parent'] || '',
      );
    }
  }, [prefill, lang]);

  if (!open) return null;

  const needsPhone =
    channels.has('sms') || channels.has('whatsapp');
  const needsEmail = channels.has('email');

  const toggleChannel = (ch: Channel) => {
    if (copyOnly) return;
    const next = new Set(channels);
    if (next.has(ch)) next.delete(ch);
    else next.add(ch);
    setChannels(next);
    setCopyOnly(false);
  };

  const toggleCopyOnly = () => {
    if (copyOnly) {
      setCopyOnly(false);
    } else {
      setCopyOnly(true);
      setChannels(new Set());
    }
  };

  const validatePhone = (val: string) => {
    if (!val) {
      setPhoneError('');
      return;
    }
    if (!E164_REGEX.test(val)) {
      setPhoneError(t('invite_panel.error_invalid_phone'));
    } else {
      setPhoneError('');
    }
  };

  const canSubmit =
    name &&
    !sending &&
    (copyOnly || channels.size > 0) &&
    (!needsEmail || email) &&
    (!needsPhone || (phone && !phoneError)) &&
    (!channels.has('email') || email);

  // Message previews
  const inviteUrlPreview = buildAppUrl('/beta/accept?token=...');
  const notesShort = (notes || '').slice(0, 80);

  const previews: Record<Channel, string> = {
    email: `Hi ${name || '...'},\nYou're invited to test as a ${testerType}.\n${notes ? notes + '\n' : ''}Accept: ${inviteUrlPreview}\nExpires in 14 days.`,
    sms: `Invited to test Independent Minds EDU! ${notesShort} ${inviteUrlPreview}`,
    whatsapp: `Hi ${name || '...'}! Invited to test *Independent Minds EDU*.\n${notes ? notes + '\n' : ''}Accept: ${inviteUrlPreview}\nExpires 14 days`,
    telegram: `Hi ${name || '...'}! Invited to test **Independent Minds EDU**.\n${notes ? notes + '\n' : ''}[Accept invitation](${inviteUrlPreview})\nExpires 14 days`,
  };

  const activeChannels = copyOnly
    ? []
    : (Array.from(channels) as Channel[]);
  const previewChannels = activeChannels.length > 0 ? activeChannels : (['email'] as Channel[]);

  const generateHexToken = (bytes = 32): string => {
    const arr = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCopyOnly = async () => {
    setSending(true);
    setInviteUrl('');
    try {
      const token = generateHexToken(32);
      const inviteEmail =
        email || `${name.toLowerCase().replace(/\s+/g, '.')}@pending`;

      const { data: invite, error: insertErr } = await supabase
        .from('beta_invites')
        .insert({
          email: inviteEmail,
          tester_type: testerType,
          language,
          notes: notes || null,
          token,
          status: 'pending',
        })
        .select('id, token')
        .single();

      if (insertErr) throw insertErr;

      const url = buildAppUrl(`/beta/accept?token=${invite.token}`);
      const msgParam = notes
        ? `&msg=${encodeURIComponent(notes.slice(0, 200))}`
        : '';
      const fullUrl = url + msgParam;

      await navigator.clipboard.writeText(fullUrl);
      setInviteUrl(fullUrl);

      // Log as 'copied' in beta_invite_logs
      await supabase.from('beta_invite_logs').insert({
        invite_id: invite.id,
        channel: 'copy',
        status: 'copied',
      } as any);

      toast.success(t('invite_panel.success_copy'));
    } catch (err: unknown) {
      toast.error(err.message || 'Failed to create invite');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!canSubmit) return;

    // Copy-only: handle entirely client-side
    if (copyOnly) {
      return handleCopyOnly();
    }

    if (channels.size === 0) {
      toast.error(t('invite_panel.error_no_channel'));
      return;
    }
    if (needsPhone && !phone) {
      toast.error(t('invite_panel.error_phone_required'));
      return;
    }

    setSending(true);
    setInviteUrl('');
    setTelegramDeepLink('');
    try {
      const { data, error } = await supabase.functions.invoke(
        'send-beta-invite',
        {
          body: {
            name,
            email: email || undefined,
            phone: phone || undefined,
            tester_type: testerType,
            language,
            notes: notes || undefined,
            channels: Array.from(channels),
            copy_only: false,
          },
        },
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.invite_url) {
        setInviteUrl(data.invite_url);
      }
      if (data?.telegram_deep_link) {
        setTelegramDeepLink(data.telegram_deep_link);
      }

      const failed = data?.channels_failed ?? [];
      const sent = data?.channels_sent ?? [];
      if (failed.length > 0 && sent.length > 0) {
        toast.warning(
          `Sent via ${sent.join(', ')}. ${failed.join(', ')} failed.`,
        );
      } else if (failed.length > 0) {
        toast.error(`Failed: ${failed.join(', ')}`);
      } else {
        toast.success(
          t('invite_panel.success').replace('{{name}}', name),
        );
        setTimeout(onClose, 2000);
      }
    } catch (err: unknown) {
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
    const total = Math.min(emails.length, 20);
    setBulkProgress({ sent: 0, total });

    for (const em of emails.slice(0, 20)) {
      try {
        await supabase.functions.invoke('send-beta-invite', {
          body: {
            name: em.split('@')[0],
            email: em,
            tester_type: testerType,
            language,
            channels: ['email'],
            copy_only: false,
          },
        });
        sent++;
      } catch {
        failed++;
      }
      setBulkProgress({ sent: sent + failed, total });
    }
    toast.success(`${sent} invites sent. ${failed} failed.`);
    setBulkSending(false);
    setBulkEmails('');
  };

  const validBulkCount = bulkEmails
    .split('\n')
    .filter((e) => e.trim().includes('@')).length;

  const ChannelButton = ({
    ch,
    icon: Icon,
    label,
  }: {
    ch: Channel;
    icon: React.ElementType;
    label: string;
  }) => {
    const active = channels.has(ch);
    return (
      <button
        type="button"
        onClick={() => toggleChannel(ch)}
        disabled={copyOnly}
        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
          active
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:bg-muted'
        } ${copyOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon size={16} />
        <span>{label}</span>
        {active && <Check size={14} className="ml-auto" />}
      </button>
    );
  };

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-full bg-background border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-medium">{t('invite_panel.title')}</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t('common.close')}
        >
          <X size={18} />
        </button>
      </div>

      <Tabs defaultValue="single" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="single" className="flex-1">
            Single
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1">
            {t('invite_panel.bulk_title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="flex-1 p-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{t('invite_panel.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marie Joseph"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label>{t('invite_panel.email')}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Phone — visible when SMS or WhatsApp selected */}
          {needsPhone && (
            <div className="space-y-1.5">
              <Label>{t('invite_panel.phone')}</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => validatePhone(phone)}
                placeholder="+15091234567"
                className={phoneError ? 'border-destructive' : ''}
              />
              {phoneError ? (
                <p className="text-xs text-destructive">{phoneError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('invite_panel.phone_hint')}
                </p>
              )}
            </div>
          )}

          {/* Tester type */}
          <div className="space-y-1.5">
            <Label>{t('invite_panel.tester_type')}</Label>
            <select
              value={testerType}
              onChange={(e) => {
                const newType = e.target.value;
                setTesterType(newType);
                setNotes(NOTE_TEMPLATES[newType] || '');
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="parent">Parent</option>
              <option value="student">Student</option>
              <option value="co_guardian">Co-guardian</option>
              <option value="educator">Educator</option>
            </select>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label>{t('invite_panel.language')}</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{t('invite_panel.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 300))}
              className="h-16"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/300
            </p>
          </div>

          {/* Channel picker */}
          <div className="space-y-2">
            <Label>{t('invite_panel.send_via')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <ChannelButton
                ch="email"
                icon={Mail}
                label={t('invite_panel.channel_email')}
              />
              <ChannelButton
                ch="sms"
                icon={MessageSquare}
                label={t('invite_panel.channel_sms')}
              />
              <ChannelButton
                ch="whatsapp"
                icon={Phone}
                label={t('invite_panel.channel_whatsapp')}
              />
              <ChannelButton
                ch="telegram"
                icon={Send}
                label={t('invite_panel.channel_telegram')}
              />
            </div>
            <button
              type="button"
              onClick={toggleCopyOnly}
              className={`w-full flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                copyOnly
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <Link size={16} />
              {t('invite_panel.channel_copy')}
              {copyOnly && <Check size={14} className="ml-auto" />}
            </button>
            {channels.has('telegram') && (
              <p className="text-xs text-muted-foreground">
                {t('invite_panel.telegram_hint')}
              </p>
            )}
          </div>

          {/* Message preview */}
          {(activeChannels.length > 0 || copyOnly) && (
            <div className="space-y-2">
              <Label>{t('invite_panel.preview_title')}</Label>
              {activeChannels.length > 1 && (
                <div className="flex gap-1">
                  {activeChannels.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setPreviewTab(ch)}
                      className={`rounded px-2 py-1 text-xs ${
                        previewTab === ch
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-sans">
                  {previews[
                    activeChannels.includes(previewTab)
                      ? previewTab
                      : previewChannels[0]
                  ]}
                </pre>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {t('invite_panel.expires_in')}
          </p>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSend}
            disabled={!canSubmit}
            data-feature="beta-invite-send"
          >
            {sending ? (
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                {t('invite_panel.sending')}
              </>
            ) : copyOnly ? (
              <>
                <Link size={14} className="mr-2" />
                {t('invite_panel.channel_copy')}
              </>
            ) : (
              t('invite_panel.send_btn')
            )}
          </Button>

          {/* Invite URL after success */}
          {inviteUrl && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/50">
              <p className="text-sm font-medium">Invite link</p>
              <Input value={inviteUrl} readOnly className="text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success(t('invite_panel.copied'));
                }}
              >
                {t('invite_panel.copied')}
              </Button>
            </div>
          )}

          {/* Telegram deep link card */}
          {telegramDeepLink && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">
                Share this Telegram link
              </p>
              <Input
                value={telegramDeepLink}
                readOnly
                className="text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(telegramDeepLink);
                    toast.success(t('invite_panel.copied'));
                  }}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(telegramDeepLink, '_blank')
                  }
                >
                  <ExternalLink size={12} className="mr-1" />
                  Open in Telegram
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('invite_panel.telegram_hint')}
              </p>
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
              <>
                <Loader2 size={14} className="animate-spin mr-2" />
                Sending {bulkProgress.sent} of {bulkProgress.total}...
              </>
            ) : (
              t('invite_panel.bulk_send').replace(
                '{{count}}',
                String(validBulkCount),
              )
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
