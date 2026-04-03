import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { action, batch } = await req.json();
  const respond = (d: any) => new Response(JSON.stringify(d, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Phase 1: Create auth users (batch 1=users 1-10, batch 2=users 11-20)
  if (action === "create_users") {
    const start = (batch - 1) * 10 + 1;
    const end = batch * 10;
    const users: any[] = [];
    for (let i = start; i <= end; i++) {
      const pad = String(i).padStart(2, "0");
      const { data, error } = await supabase.auth.admin.createUser({
        email: `sim-parent-${pad}@test.independentmindsedu.com`,
        password: "SimTest2026!",
        email_confirm: true,
        user_metadata: { display_name: `Sim Parent ${pad}`, adult_confirmed: true, adult_confirmed_at: new Date().toISOString() },
      });
      if (error) users.push({ idx: i, error: error.message });
      else users.push({ idx: i, uid: data.user.id });
    }
    return respond({ users });
  }

  // Phase 2: Create students + daily plans + complete blocks + check-ins + rewards + SOS
  if (action === "populate") {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").like("display_name", "Sim Parent%").order("display_name");
    if (!profiles?.length) return respond({ error: "No sim users found" });

    const TODAY = new Date().toISOString().split("T")[0];
    const subjects = ["Math", "Reading", "Science", "History", "Art"];
    const times = [["08:00","08:45"],["09:00","09:45"],["10:00","10:45"],["11:00","11:45"],["13:00","13:45"]];
    const results: any = { steps: {}, errors: [] };

    // Sort and assign index
    const sorted = profiles.sort((a, b) => a.display_name.localeCompare(b.display_name));
    const users = sorted.map((p, i) => ({
      idx: i + 1, uid: p.id,
      studentId: `SIM-${String(i + 1).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    }));

    // Students
    const studentRows = users.map(u => ({
      student_id: u.studentId, display_name: `Sim Child ${String(u.idx).padStart(2, "0")}`,
      parent_id: u.uid, language_pref: "EN", grade_level: 7,
    }));
    const { error: se } = await supabase.from("students").insert(studentRows);
    results.steps.students = se ? { error: se.message } : { ok: users.length };

    // Daily plans (batch insert)
    const planRows: any[] = [];
    for (const u of users) {
      subjects.forEach((subj, j) => {
        planRows.push({ student_id: u.studentId, plan_date: TODAY, subject: subj, start_time: times[j][0], end_time: times[j][1], block_order: j + 1, status: "Planned" });
      });
    }
    const { error: pe } = await supabase.from("daily_plan").insert(planRows);
    results.steps.daily_plans = pe ? { error: pe.message } : { ok: planRows.length };

    // Complete blocks per group
    let blocksCompleted = 0;
    const pointRows: any[] = [];
    for (const u of users) {
      let n = 0;
      if (u.idx <= 5) n = 5; else if (u.idx <= 10) n = 3; else if (u.idx <= 15) n = 1;
      if (n > 0) {
        const { data: plans } = await supabase.from("daily_plan").select("id").eq("student_id", u.studentId).eq("status", "Planned").limit(n);
        if (plans) {
          for (const p of plans) {
            await supabase.from("daily_plan").update({ status: "Done", actual_start: new Date().toISOString(), actual_end: new Date(Date.now() + 2700000).toISOString() }).eq("id", p.id);
            blocksCompleted++;
          }
        }
        for (let b = 0; b < n; b++) pointRows.push({ student_id: u.studentId, points: 10, reason: "Block completed", source: "block" });
        if (n === 5) pointRows.push({ student_id: u.studentId, points: 25, reason: "Perfect day bonus", source: "system" });
      }
    }
    results.steps.blocks_completed = blocksCompleted;

    // Check-ins
    const ciRows = users.map(u => {
      const [mood, focus, bd] = u.idx <= 5 ? ["😊","focused",5] : u.idx <= 10 ? ["😐","okay",3] : u.idx <= 15 ? ["😰","struggling",1] : ["😐","distracted",0];
      return { student_id: u.studentId, mood, focus, blocks_done: bd as number, need_help: false, comment: "Simulation check-in" };
    });
    await supabase.from("check_ins").insert(ciRows);
    users.forEach(u => pointRows.push({ student_id: u.studentId, points: 15, reason: "Check-in completed", source: "check_in" }));
    results.steps.check_ins = ciRows.length;

    // Rewards catalog
    const catRows = users.map(u => ({ student_id: u.studentId, name: "Movie Night", point_cost: 20, enabled: true, icon: "🎬" }));
    const { data: cats } = await supabase.from("rewards_catalog").insert(catRows).select("id, student_id");

    // Redemptions for users 1-10
    const redeemUsers = users.filter(u => u.idx <= 10);
    for (const u of redeemUsers) {
      const cat = cats?.find(c => c.student_id === u.studentId);
      if (cat) {
        pointRows.push({ student_id: u.studentId, points: -20, reason: "Reward redeemed: Movie Night", source: "redemption" });
        await supabase.from("reward_redemptions").insert({ student_id: u.studentId, reward_id: cat.id, points_spent: 20, status: "pending" });
      }
    }
    results.steps.redemptions = redeemUsers.length;

    // SOS for users 1-5
    const sosUsers = users.filter(u => u.idx <= 5);
    const sosCi = sosUsers.map(u => ({ student_id: u.studentId, mood: "😰", focus: "struggling", blocks_done: 0, need_help: true, comment: "SOS: Need help urgently" }));
    await supabase.from("check_ins").insert(sosCi);
    const sosInbox = sosUsers.map(u => ({
      parent_id: u.uid, student_id: u.studentId, message_type: "sos", title: "SOS Alert",
      body: `Sim Child ${String(u.idx).padStart(2, "0")} needs help!`, is_read: false,
    }));
    await supabase.from("inbox_messages").insert(sosInbox);
    results.steps.sos = sosUsers.length;

    // Insert all points
    await supabase.from("reward_points").insert(pointRows);
    results.steps.point_rows = pointRows.length;
    results.steps.total_points = pointRows.reduce((s, r) => s + r.points, 0);

    // Store user mapping for verification
    results.users = users;
    return respond(results);
  }

  // Phase 3: Verify
  if (action === "verify") {
    const { data: sids } = await supabase.from("students").select("student_id").like("display_name", "Sim Child%");
    const ids = sids?.map(s => s.student_id) || [];
    const v: any = { student_count: ids.length };

    if (ids.length) {
      const { count: bc } = await supabase.from("daily_plan").select("*", { count: "exact", head: true }).eq("status", "Done").in("student_id", ids);
      v.blocks_done = bc;
      const { count: ci } = await supabase.from("check_ins").select("*", { count: "exact", head: true }).in("student_id", ids);
      v.check_ins = ci;
      const { data: pts } = await supabase.from("reward_points").select("points").in("student_id", ids);
      v.point_rows = pts?.length;
      v.total_points = pts?.reduce((s, r) => s + r.points, 0);
      const { count: sos } = await supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("message_type", "sos").eq("is_read", false).in("student_id", ids);
      v.sos_unread = sos;
      const { count: rd } = await supabase.from("reward_redemptions").select("*", { count: "exact", head: true }).in("student_id", ids);
      v.redemptions = rd;
      // Per-group breakdown
      for (const grp of [{ label: "1-5 (perfect)", start: 1, end: 5 }, { label: "6-10 (partial)", start: 6, end: 10 }, { label: "11-15 (minimal)", start: 11, end: 15 }, { label: "16-20 (inactive)", start: 16, end: 20 }]) {
        const gids = ids.filter((_, i) => i + 1 >= grp.start && i + 1 <= grp.end);
        const { data: gp } = await supabase.from("reward_points").select("points").in("student_id", gids);
        v[`group_${grp.label}_points`] = gp?.reduce((s, r) => s + r.points, 0) || 0;
      }
    }
    return respond(v);
  }

  // Phase 4: Cleanup
  if (action === "cleanup") {
    const { data: profiles } = await supabase.from("profiles").select("id").like("display_name", "Sim Parent%");
    const uids = profiles?.map(p => p.id) || [];
    const { data: sids } = await supabase.from("students").select("student_id").like("display_name", "Sim Child%");
    const simIds = sids?.map(s => s.student_id) || [];

    if (simIds.length) {
      await supabase.from("inbox_messages").delete().in("student_id", simIds);
      await supabase.from("reward_redemptions").delete().in("student_id", simIds);
      await supabase.from("reward_points").delete().in("student_id", simIds);
      await supabase.from("rewards_catalog").delete().in("student_id", simIds);
      await supabase.from("check_ins").delete().in("student_id", simIds);
      await supabase.from("daily_plan").delete().in("student_id", simIds);
      await supabase.from("students").delete().in("student_id", simIds);
    }

    let deleted = 0;
    for (const uid of uids) {
      const { error } = await supabase.auth.admin.deleteUser(uid);
      if (!error) deleted++;
    }
    return respond({ users_deleted: deleted, students_cleaned: simIds.length });
  }

  return respond({ error: "Invalid action. Use: create_users, populate, verify, cleanup" });
});
