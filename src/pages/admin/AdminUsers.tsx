import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { Users, UserCheck, GitMerge, Shield } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<unknown[]>([]);
  const [mergeRequests, setMergeRequests] = useState<unknown[]>([]);
  const [roles, setRoles] = useState<unknown[]>([]);
  const [coGuardians, setCoGuardians] = useState<unknown[]>([]);
  const [managerRequests, setManagerRequests] = useState<unknown[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ parents: 0, admins: 0, pendingMerges: 0, coGuardianCount: 0 });
  const tick = useAutoRefresh();

  useEffect(() => {
    const load = async () => {
      const [profilesRes, mergesRes, rolesRes, guardiansRes, managerReqRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("merge_requests").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("user_roles").select("*"),
        supabase.from("co_guardians").select("*"),
        supabase.from("manager_requests" as any).select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      const p = profilesRes.data || [];
      const r = rolesRes.data || [];
      const m = mergesRes.data || [];
      const g = guardiansRes.data || [];
      const mr = managerReqRes.data || [];

      setProfiles(p);
      setRoles(r);
      setMergeRequests(m);
      setCoGuardians(g);
      setManagerRequests(mr);
      setStats({
        parents: p.filter((x: unknown) => x.role === "parent").length,
        admins: r.filter((x: unknown) => x.role === "admin").length,
        pendingMerges: m.filter((x: unknown) => x.status === "pending").length,
        coGuardianCount: g.length,
      });
    };
    load();
  }, [tick]);

  const handleMerge = async (id: string, action: "approved" | "denied") => {
    const { error } = await supabase
      .from("merge_requests")
      .update({ status: action, resolved_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Merge request ${action}`);
      setMergeRequests((prev) => prev.map((m) => (m.id === id ? { ...m, status: action } : m)));
    }
  };

  const handleManagerRequest = async (id: string, decision: "approved" | "rejected") => {
    setReviewingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("review-manager-request", {
        body: { request_id: id, decision },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Manager request ${decision}`);
      setManagerRequests((prev) => prev.map((r: unknown) => (r.id === id ? { ...r, status: decision } : r)));
    } catch (err: unknown) {
      toast.error(err.message || "Failed to review request");
    } finally {
      setReviewingId(null);
    }
  };

  const getUserRole = (userId: string) => {
    const r = roles.find((x: unknown) => x.user_id === userId);
    return r?.role || "—";
  };

  const permSummary = (g: unknown) => {
    if (g.is_full_access) return "Full Access";
    const perms: string[] = [];
    if (g.can_view_progress) perms.push("View");
    if (g.can_receive_sos) perms.push("SOS");
    if (g.can_approve_rewards) perms.push("Rewards");
    if (g.can_edit_lessons) perms.push("Lessons");
    return perms.join(", ") || "View only";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">User Management</h1>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard label="Parent Accounts" value={stats.parents} icon={Users} color="text-blue-400" />
        <StatCard label="Admin Users" value={stats.admins} icon={Shield} color="text-emerald-400" />
        <StatCard label="Pending Merges" value={stats.pendingMerges} icon={GitMerge} color="text-amber-400" />
        <StatCard label="Co-Guardians" value={stats.coGuardianCount} icon={UserCheck} color="text-purple-400" />
      </div>

      {/* Profiles Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">All Accounts</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Name</TableHead>
              <TableHead className="text-white/60">Role</TableHead>
              <TableHead className="text-white/60">Admin</TableHead>
              <TableHead className="text-white/60">Last Active</TableHead>
              <TableHead className="text-white/60">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white font-medium">{p.display_name}</TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">{p.role}</span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    getUserRole(p.id) === "admin" ? "bg-emerald-500/20 text-emerald-400" : "text-white/30"
                  }`}>{getUserRole(p.id)}</span>
                </TableCell>
                <TableCell className="text-white/50 text-xs">
                  {p.last_active_at ? new Date(p.last_active_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-white/50 text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Co-Guardians Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Co-Guardians</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Guardian ID</TableHead>
              <TableHead className="text-white/60">Student ID</TableHead>
              <TableHead className="text-white/60">Permissions</TableHead>
              <TableHead className="text-white/60">Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coGuardians.map((g: unknown) => (
              <TableRow key={g.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/70 text-xs font-mono">{g.guardian_id?.slice(0, 8)}…</TableCell>
                <TableCell className="text-white/70 text-xs">{g.student_id}</TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                    {permSummary(g)}
                  </span>
                </TableCell>
                <TableCell className="text-white/50 text-xs">
                  {new Date(g.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {coGuardians.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center text-white/40 py-8">No co-guardians</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Merge Requests */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Merge Requests</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">Source Email</TableHead>
              <TableHead className="text-white/60">Target Email</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mergeRequests.map((m) => (
              <TableRow key={m.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/70 text-xs">{m.source_email}</TableCell>
                <TableCell className="text-white/70 text-xs">{m.target_email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    m.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                    m.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>{m.status}</span>
                </TableCell>
                <TableCell>
                  {m.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleMerge(m.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleMerge(m.id, "denied")}>Deny</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {mergeRequests.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center text-white/40 py-8">No merge requests</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Manager Access Requests */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Manager Access Requests</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white/60">User</TableHead>
              <TableHead className="text-white/60">Organization</TableHead>
              <TableHead className="text-white/60">Reason</TableHead>
              <TableHead className="text-white/60">Families</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managerRequests.map((r: unknown) => (
              <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white/70 text-xs font-mono">{r.user_id?.slice(0, 8)}…</TableCell>
                <TableCell className="text-white/70 text-xs">{r.organization_name || "—"}</TableCell>
                <TableCell className="text-white/70 text-xs max-w-xs truncate" title={r.reason}>{r.reason || "—"}</TableCell>
                <TableCell className="text-white/70 text-xs">{r.expected_families_count ?? "—"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    r.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                    r.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>{r.status}</span>
                </TableCell>
                <TableCell>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="outline"
                        className="text-xs h-7 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        disabled={reviewingId === r.id}
                        onClick={() => handleManagerRequest(r.id, "approved")}
                      >Approve</Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        disabled={reviewingId === r.id}
                        onClick={() => handleManagerRequest(r.id, "rejected")}
                      >Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {managerRequests.length === 0 && (
              <TableRow className="border-white/10">
                <TableCell colSpan={6} className="text-center text-white/40 py-8">No manager access requests</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}