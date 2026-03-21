import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import StatCard from "@/components/admin/StatCard";
import { Users, UserCheck, GitMerge, Shield } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [mergeRequests, setMergeRequests] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [stats, setStats] = useState({ parents: 0, admins: 0, pendingMerges: 0 });
  const tick = useAutoRefresh();

  useEffect(() => {
    const load = async () => {
      const [profilesRes, mergesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("merge_requests").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("user_roles").select("*"),
      ]);
      const p = profilesRes.data || [];
      const r = rolesRes.data || [];
      const m = mergesRes.data || [];

      setProfiles(p);
      setRoles(r);
      setMergeRequests(m);
      setStats({
        parents: p.filter((x: any) => x.role === "parent").length,
        admins: r.filter((x: any) => x.role === "admin").length,
        pendingMerges: m.filter((x: any) => x.status === "pending").length,
      });
    };
    load();
  }, []);

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

  const getUserRole = (userId: string) => {
    const r = roles.find((x: any) => x.user_id === userId);
    return r?.role || "—";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-white">User Management</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Parent Accounts" value={stats.parents} icon={Users} color="text-blue-400" />
        <StatCard label="Admin Users" value={stats.admins} icon={Shield} color="text-emerald-400" />
        <StatCard label="Pending Merges" value={stats.pendingMerges} icon={GitMerge} color="text-amber-400" />
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
    </div>
  );
}
