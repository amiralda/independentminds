import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Bug, Activity, Plus, Copy, RotateCcw, XCircle,
} from 'lucide-react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function AdminBeta() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [invitePanelOpen, setInvitePanelOpen] = useState(false);
  const [prefill, setPrefill] = useState<any>(null);

  // Overview data
  const [config, setConfig] = useState<any>(null);
  const [stats, setStats] = useState({
    activeToday: 0, tasksThisWeek: 0, avgNps: 0,
    bugReports: 0, feedbackToday: 0,
  });

  // Table data
  const [testers, setTesters] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    const [
      { data: cfg },
      { data: tst },
      { data: inv },
      { data: req },
      { data: fb },
      { data: ses },
    ] = await Promise.all([
      supabase.from('beta_config').select('*').eq('id', 1).single(),
      supabase.from('beta_testers').select('*').order('joined_at', { ascending: false }),
      supabase.from('beta_invites').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_feedback').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_sessions').select('*').order('started_at', { ascending: false }),
    ]);
    setConfig(cfg);
    setTesters(tst ?? []);
    setInvites(inv ?? []);
    setRequests(req ?? []);
    setFeedback(fb ?? []);
    setSessions(ses ?? []);

    // Compute stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    const activeToday = (tst ?? []).filter(
      (t: any) => t.last_active_at && t.last_active_at >= todayStart,
    ).length;
    const npsItems = (fb ?? []).filter(
      (f: any) => f.feedback_type === 'nps' && f.nps_score != null,
    );
    const avgNps = npsItems.length > 0
      ? Math.round(npsItems.reduce((s: number, f: any) => s + f.nps_score, 0) / npsItems.length * 10) / 10
      : 0;
    const bugReports = (fb ?? []).filter(
      (f: any) => f.feedback_type === 'bug_report',
    ).length;
    const feedbackToday = (fb ?? []).filter(
      (f: any) => f.created_at >= todayStart,
    ).length;

    setStats({ activeToday, tasksThisWeek: 0, avgNps, bugReports, feedbackToday });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useAutoRefresh(fetchAll, 60_000);

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
      `https://independentmindsedu.com/beta/accept?token=${token}`,
    );
    toast.success(t('invite_panel.copied'));
  };

  const resendInvite = (invite: any) => {
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
      case 'accepted': return 'bg-green-500/15 text-green-600';
      case 'pending': return 'bg-amber-500/15 text-amber-600';
      case 'expired': return 'bg-muted text-muted-foreground';
      case 'revoked': return 'bg-destructive/15 text-destructive';
      default: return 'bg-muted text-muted-foreground';
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
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              title="Total Testers"
              value={`${config?.current_testers ?? 0} / ${config?.max_testers ?? 50}`}
              icon={<Users size={16} />}
            />
            <StatCard title="Active Today" value={stats.activeToday} icon={<Activity size={16} />} />
            <StatCard title="Avg NPS" value={stats.avgNps} icon={<BarChart3 size={16} />} />
            <StatCard title="Bug Reports" value={stats.bugReports} icon={<Bug size={16} />} />
            <StatCard title="Feedback (24h)" value={stats.feedbackToday} icon={<MessageSquare size={16} />} />
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
              {testers.map((t: any) => (
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
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="text-sm">{inv.email}</TableCell>
                  <TableCell><Badge variant="outline">{inv.tester_type}</Badge></TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
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
              {requests.map((r: any) => (
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
              {feedback.map((f: any) => (
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
              {sessions.map((s: any) => (
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
