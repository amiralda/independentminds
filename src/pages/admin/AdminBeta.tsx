import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildAppUrl } from '@/lib/siteUrl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import StatCard from '@/components/admin/StatCard';
import { AdminInvitePanel } from '@/components/beta/AdminInvitePanel';
import { toast } from 'sonner';
import {
  Users, CheckCircle, MessageSquare, BarChart3,
  Bug, Activity, Plus, Copy, RotateCcw, XCircle, AlertTriangle, Bell, Mail,
} from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function AdminBeta() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [prefill, setPrefill] = useState<unknown>(null);

  // Overview data
  const [config, setConfig] = useState<unknown>(null);
  const [stats, setStats] = useState({
    activeToday: 0, tasksThisWeek: 0, avgNps: 0,
    bugReports: 0, feedbackToday: 0,
  });

  // Badge counts
  const [errorBadge, setErrorBadge] = useState(0);
  const [bugBadge, setBugBadge] = useState(0);

  // Table data
  const [testers, setTesters] = useState<unknown[]>([]);
  const [invites, setInvites] = useState<unknown[]>([]);
  const [requests, setRequests] = useState<unknown[]>([]);
  const [feedback, setFeedback] = useState<unknown[]>([]);
  const [sessions, setSessions] = useState<unknown[]>([]);

  const fetchAll = useCallback(async () => {
    const [
      { data: cfg },
      { data: tst },
      { data: inv },
      { data: req },
      { data: fb },
      { data: ses },
      { data: adminNotifs },
    ] = await Promise.all([
      supabase.from('beta_config').select('*').eq('id', 1).single(),
      supabase.from('beta_testers').select('*').order('joined_at', { ascending: false }),
      supabase.from('beta_invites').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_sessions').select('*').order('started_at', { ascending: false }),
      supabase.from('admin_notifications' as unknown).select('notification_type, is_read, created_at').in('notification_type', ['beta_error', 'bug_report']).eq('is_read', false) as unknown,
    ]);
    setConfig(cfg);
    setTesters(tst ?? []);
    setInvites(inv ?? []);
    setRequests(req ?? []);
    setFeedback(fb ?? []);
    setSessions(ses ?? []);

    // Badge counts
    const notifs = adminNotifs ?? [];
    const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();
    setErrorBadge(notifs.filter((n: unknown) => n.notification_type === 'beta_error' && n.created_at >= oneDayAgo).length);
    setBugBadge(notifs.filter((n: unknown) => n.notification_type === 'bug_report').length);

    // Compute stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const activeToday = (tst ?? []).filter(
      (t: unknown) => t.last_active_at && t.last_active_at >= todayStart,
    ).length;
    const npsItems = (fb ?? []).filter(
      (f: unknown) => f.feedback_type === 'nps' && f.nps_score != null,
    );
    const avgNps = npsItems.length > 0
      ? Math.round(npsItems.reduce((s: number, f: unknown) => s + f.nps_score, 0) / npsItems.length * 10) / 10
      : 0;
    const bugReports = (fb ?? []).filter(
      (f: unknown) => f.feedback_type === 'bug_report',
    ).length;
    const feedbackToday = (fb ?? []).filter(
      (f: unknown) => f.created_at >= todayStart,
    ).length;

    setStats({ activeToday, tasksThisWeek: 0, avgNps, bugReports, feedbackToday });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const tick = useAutoRefresh(60_000);
  useEffect(() => { fetchAll(); }, [tick]);

  const switchPhase = async (newPhase: string) => {
    if (!confirm(`Switch beta phase to "${newPhase}"?`)) return;
    await supabase.from('beta_config').update({ phase: newPhase }).eq('id', 1);
    toast.success(`Phase switched to ${newPhase}`);
    fetchAll();
  };

  const approveRequest = async (id: string) => {
    const { error } = await supabase.functions.invoke('approve-beta-request', {
      body: { request_id: id },
    });
    if (error) { toast.error('Failed to approve'); return; }
    toast.success('Request approved');
    fetchAll();
  };

  const sendWelcomeEmails = async () => {
    const { data, error } = await supabase.functions.invoke('beta-notify', {
      body: { action: 'welcome_mission' },
    });
    if (error) { toast.error('Failed to send welcome emails'); return; }
    toast.success(`Welcome emails sent to ${data?.sent ?? 0} testers`);
  };

  const notifyBetaTesters = async () => {
    if (!confirm('Send update notification to all beta testers?')) return;
    const { data, error } = await supabase.functions.invoke('beta-notify', {
      body: { action: 'notify_update' },
    });
    if (error) { toast.error('Failed to send notifications'); return; }
    toast.success(`Update notification sent to ${data?.sent ?? 0} testers`);
  };

  const declineRequest = async (id: string) => {
    await supabase.from('beta_requests')
      .update({ status: 'declined', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    toast.success('Request declined');
    fetchAll();
  };

  const revokeInvite = async (id: string) => {
    if (!confirm('Revoke this invite?')) return;
    await supabase.from('beta_invites').update({ status: 'revoked' }).eq('id', id);
    toast.success('Invite revoked');
    fetchAll();
  };

  const copyInviteUrl = async (token: string) => {
    await navigator.clipboard.writeText(
      buildAppUrl(`/beta/accept?token=${token}`),
    );
    toast.success(t('invite_panel.copied'));
  };

  const resendInvite = (invite: unknown) => {
    setPrefill({
      name: invite.email?.split('@')[0],
      email: invite.email,
      tester_type: invite.tester_type,
      language: invite.language,
    });
    setInvitePanelOpen(true);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'accepted': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-amber-500/20 text-amber-400';
      case 'expired': return 'bg-white/10 text-white/50';
      case 'revoked': return 'bg-red-500/20 text-red-400';
      default: return 'bg-white/10 text-white/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Beta Testing</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="testers">Testers</TabsTrigger>
          <TabsTrigger value="invites">Invites</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="feedback" className="relative">
            Feedback
            {bugBadge > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                {bugBadge > 9 ? '9+' : bugBadge}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions" className="relative">
            Sessions
            {errorBadge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                {errorBadge > 9 ? '9+' : errorBadge}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Total Testers"
              value={`${config?.current_testers ?? 0} / ${config?.max_testers ?? 50}`}
              icon={Users}
            />
            <StatCard label="Active Today" value={stats.activeToday} icon={Activity} />
            <StatCard label="Avg NPS" value={stats.avgNps} icon={BarChart3} />
            <StatCard label="Bug Reports" value={stats.bugReports} icon={Bug} />
            <StatCard label="Feedback (24h)" value={stats.feedbackToday} icon={MessageSquare} />
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Current Phase</p>
                <span className={`inline-block mt-1 rounded-full px-3 py-1 text-xs font-medium ${
                  config?.phase === 'open' ? 'bg-green-500/15 text-green-400'
                    : config?.phase === 'closed' ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-white/10 text-white/50'
                }`}>
                  {config?.phase ?? 'unknown'}
                </span>
              </div>
              <div className="flex gap-2">
                {['closed', 'open', 'disabled'].filter((p) => p !== config?.phase).map((p) => (
                  <Button key={p} size="sm" variant="outline" onClick={() => switchPhase(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-sm text-white/60 font-medium">Actions</p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={sendWelcomeEmails}>
                <Mail size={14} className="mr-1" /> Send welcome emails
              </Button>
              <Button size="sm" variant="outline" onClick={notifyBetaTesters}>
                <Bell size={14} className="mr-1" /> Notify testers of update
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* TESTERS */}
        <TabsContent value="testers" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testers.map((t: unknown) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Badge variant="outline">{t.tester_type}</Badge>
                  </TableCell>
                  <TableCell>{t.tasks_completed}/{t.tasks_total}</TableCell>
                  <TableCell>{t.session_count}</TableCell>
                  <TableCell className="text-xs">
                    {t.last_active_at ? new Date(t.last_active_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(t.joined_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {testers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No testers yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* INVITES */}
        <TabsContent value="invites" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setPrefill(null); setInvitePanelOpen(true); }} data-feature="beta-invite-trigger">
              <Plus size={14} className="mr-1" /> Invite tester
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="font-medium text-white">Email</TableHead>
                <TableHead className="font-medium text-white">Type</TableHead>
                <TableHead className="font-medium text-white">Status</TableHead>
                <TableHead className="font-medium text-white">Expires</TableHead>
                <TableHead className="font-medium text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((inv: unknown) => (
                <TableRow key={inv.id} className="hover:bg-white/5 border-white/10">
                  <TableCell className="text-sm text-white">{inv.email}</TableCell>
                  <TableCell><Badge variant="outline" className="text-white border-white/30">{inv.tester_type}</Badge></TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-white/70">
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => resendInvite(inv)}>
                        <RotateCcw size={12} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyInviteUrl(inv.token)}>
                        <Copy size={12} />
                      </Button>
                      {inv.status === 'pending' && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => revokeInvite(inv.id)}>
                          <XCircle size={12} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* REQUESTS */}
        <TabsContent value="requests" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r: unknown) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-sm">{r.email}</TableCell>
                  <TableCell><Badge variant="outline">{r.tester_type}</Badge></TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => approveRequest(r.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => declineRequest(r.id)}>
                          Decline
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No requests
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* FEEDBACK */}
        <TabsContent value="feedback" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Rating/NPS</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.map((f: unknown) => (
                <TableRow key={f.id}>
                  <TableCell><Badge variant="outline">{f.feedback_type}</Badge></TableCell>
                  <TableCell>
                    {f.rating ? `${f.rating}★` : f.nps_score != null ? `NPS ${f.nps_score}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {f.comment?.slice(0, 80)}
                  </TableCell>
                  <TableCell className="text-xs">{f.page_path}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(f.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {feedback.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No feedback yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* SESSIONS */}
        <TabsContent value="sessions" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s: unknown) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs font-mono">
                    {s.session_id?.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{s.device_type ?? '—'}</TableCell>
                  <TableCell>{s.browser ?? '—'}</TableCell>
                  <TableCell>
                    {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : '—'}
                  </TableCell>
                  <TableCell>{s.page_count}</TableCell>
                  <TableCell>{s.event_count}</TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No sessions recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <AdminInvitePanel
        open={invitePanelOpen}
        onClose={() => { setInvitePanelOpen(false); fetchAll(); }}
        prefill={prefill}
      />
    </div>
  );
}
