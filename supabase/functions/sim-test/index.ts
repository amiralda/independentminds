import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { action } = await req.json();
  const NUM = 20;
  const TODAY = new Date().toISOString().split("T")[0];
  const results: any = { steps: {}, errors: [], users: [] };

  if (action === "run") {
    // STEP 0: Create 20 auth users + profiles
    const users: { idx: number; uid: string; studentId: string }[] = [];
    let profileOk = 0, profileFail = 0;

    for (let i = 1; i <= NUM; i++) {
      const email = `sim-parent-${String(i).padStart(2, "0")}@test.independentmindsedu.com`;
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: "SimTest2026!",
        email_confirm: true,
        user_metadata: {
          display_name: `Sim Parent ${String(i).padStart(2, "0")}`,
          adult_confirmed: true,
          adult_confirmed_at: new Date().toISOString(),
        },
      });
      if (error) {
        results.errors.push(`User ${i}: ${error.message}`);
        profileFail++;
        continue;
      }
      const uid = data.user.id;
      const sid = `SIM-${String(i).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      users.push({ idx: i, uid, studentId: sid });
      profileOk++;
    }
    results.steps.auth_users = { ok: profileOk, fail: profileFail };
    results.users = users.map(u => ({ idx: u.idx, uid: u.uid, studentId: u.studentId }));

    // STEP 1: Create students
    let studentOk = 0;
    for (const u of users) {
      const { error } = await supabase.from("students").insert({
        student_id: u.studentId,
        display_name: `Sim Child ${String(u.idx).padStart(2, "0")}`,
        parent_id: u.uid,
        language_pref: "EN",
        grade_level: 7,
      });
      if (error) results.errors.push(`Student ${u.idx}: ${error.message}`);
      else studentOk++;
    }
    results.steps.students = { ok: studentOk };

    // STEP 2: 5 daily plan blocks
    const subjects = ["Math", "Reading", "Science", "History", "Art"];
    const times = [["08:00","08:45"],["09:00","09:45"],["10:00","10:45"],["11:00","11:45"],["13:00","13:45"]];
    let blockOk = 0;
    for (const u of users) {
      const rows = subjects.map((subj, j) => ({
        student_id: u.studentId,
        plan_date: TODAY,
        subject: subj,
        start_time: times[j][0],
        end_time: times[j][1],
        block_order: j + 1,
        status: "Planned",
      }));
      const { error } = await supabase.from("daily_plan").insert(rows);
      if (error) results.errors.push(`Blocks ${u.idx}: ${error.message}`);
      else blockOk += 5;
    }
    results.steps.daily_plan_created = { ok: blockOk };

    // STEP 3 & 8: Complete blocks based on user group
    let blocksCompleted = 0;
    for (const u of users) {
      let n = 0;
      if (u.idx <= 5) n = 5;
      else if (u.idx <= 10) n = 3;
      else if (u.idx <= 15) n = 1;

      if (n > 0) {
        const { data: planRows } = await supabase
          .from("daily_plan")
          .select("id")
          .eq("student_id", u.studentId)
          .eq("plan_date", TODAY)
          .eq("status", "Planned")
          .limit(n);

        if (planRows) {
          for (const row of planRows) {
            await supabase.from("daily_plan").update({
              status: "Done",
              actual_start: new Date().toISOString(),
              actual_end: new Date(Date.now() + 45 * 60000).toISOString(),
            }).eq("id", row.id);
            blocksCompleted++;
          }
        }

        // Award block points
        const pointRows = Array.from({ length: n }, () => ({
          student_id: u.studentId, points: 10, reason: "Block completed", source: "block",
        }));
        await supabase.from("reward_points").insert(pointRows);

        // Perfect day bonus
        if (n === 5) {
          await supabase.from("reward_points").insert({
            student_id: u.studentId, points: 25, reason: "Perfect day bonus", source: "system",
          });
        }
      }
    }
    results.steps.blocks_completed = { ok: blocksCompleted };

    // STEP 4: Check-ins
    let checkinOk = 0;
    for (const u of users) {
      let mood: string, focus: string, blocksDone: number;
      if (u.idx <= 5) { mood = "😊"; focus = "focused"; blocksDone = 5; }
      else if (u.idx <= 10) { mood = "😐"; focus = "okay"; blocksDone = 3; }
      else if (u.idx <= 15) { mood = "😰"; focus = "struggling"; blocksDone = 1; }
      else { mood = "😐"; focus = "distracted"; blocksDone = 0; }

      const { error } = await supabase.from("check_ins").insert({
        student_id: u.studentId, mood, focus, blocks_done: blocksDone, need_help: false, comment: "Simulation check-in",
      });
      if (!error) checkinOk++;
      else results.errors.push(`Checkin ${u.idx}: ${error.message}`);

      // Award check-in points
      await supabase.from("reward_points").insert({
        student_id: u.studentId, points: 15, reason: "Check-in completed", source: "check_in",
      });
    }
    results.steps.check_ins = { ok: checkinOk };

    // STEP 6: Rewards catalog + redemption
    let rewardOk = 0, redeemOk = 0;
    for (const u of users) {
      const { data: reward, error } = await supabase.from("rewards_catalog").insert({
        student_id: u.studentId, name: "Movie Night", point_cost: 20, enabled: true, icon: "🎬",
      }).select("id").single();
      if (!error) rewardOk++;
      else { results.errors.push(`Reward ${u.idx}: ${error.message}`); continue; }

      // Users 1-10 have enough points to redeem
      if (u.idx <= 10 && reward) {
        await supabase.from("reward_points").insert({
          student_id: u.studentId, points: -20, reason: "Reward redeemed: Movie Night", source: "redemption",
        });
        await supabase.from("reward_redemptions").insert({
          student_id: u.studentId, reward_id: reward.id, points_spent: 20, status: "pending",
        });
        redeemOk++;
      }
    }
    results.steps.rewards = { catalogCreated: rewardOk, redeemed: redeemOk };

    // STEP 7: SOS for users 1-5
    let sosOk = 0;
    for (const u of users.filter(u => u.idx <= 5)) {
      await supabase.from("check_ins").insert({
        student_id: u.studentId, mood: "😰", focus: "struggling", blocks_done: 0, need_help: true, comment: "SOS: Need help urgently",
      });
      const { error } = await supabase.from("inbox_messages").insert({
        parent_id: u.uid, student_id: u.studentId, message_type: "sos", title: "SOS Alert",
        body: `Sim Child ${String(u.idx).padStart(2, "0")} needs help!`, is_read: false,
      });
      if (!error) sosOk++;
      else results.errors.push(`SOS ${u.idx}: ${error.message}`);
    }
    results.steps.sos = { ok: sosOk };

    // VERIFICATION
    const v: any = {};
    const { count: sc } = await supabase.from("students").select("*", { count: "exact", head: true }).like("display_name", "Sim Child%");
    v.students = sc;
    const { data: sids } = await supabase.from("students").select("student_id").like("display_name", "Sim Child%");
    const simIds = sids?.map(s => s.student_id) || [];

    const { count: doneBlocks } = await supabase.from("daily_plan").select("*", { count: "exact", head: true }).eq("status", "Done").in("student_id", simIds);
    v.blocks_done = doneBlocks;

    const { count: cic } = await supabase.from("check_ins").select("*", { count: "exact", head: true }).in("student_id", simIds);
    v.check_ins = cic;

    const { count: rpc } = await supabase.from("reward_points").select("*", { count: "exact", head: true }).in("student_id", simIds);
    v.reward_point_rows = rpc;

    const { data: totalPts } = await supabase.from("reward_points").select("points").in("student_id", simIds);
    v.total_points = totalPts?.reduce((sum, r) => sum + r.points, 0) || 0;

    const { count: sosUnread } = await supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("message_type", "sos").eq("is_read", false).in("student_id", simIds);
    v.sos_unread = sosUnread;

    results.verification = v;
    return new Response(JSON.stringify(results, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "cleanup") {
    // Find and delete all sim users
    const { data: profiles } = await supabase.from("profiles").select("id").like("display_name", "Sim Parent%");
    const uids = profiles?.map(p => p.id) || [];
    let deleted = 0;
    for (const uid of uids) {
      const { error } = await supabase.auth.admin.deleteUser(uid);
      if (!error) deleted++;
      else results.errors.push(`Delete ${uid}: ${error.message}`);
    }
    // Cascade should clean up profiles. Clean students manually
    const { data: sids } = await supabase.from("students").select("student_id").like("display_name", "Sim Child%");
    const simIds = sids?.map(s => s.student_id) || [];
    if (simIds.length) {
      await supabase.from("daily_plan").delete().in("student_id", simIds);
      await supabase.from("check_ins").delete().in("student_id", simIds);
      await supabase.from("reward_points").delete().in("student_id", simIds);
      await supabase.from("reward_redemptions").delete().in("student_id", simIds);
      await supabase.from("rewards_catalog").delete().in("student_id", simIds);
      await supabase.from("inbox_messages").delete().in("student_id", simIds);
      await supabase.from("students").delete().in("student_id", simIds);
    }
    results.cleanup = { users_deleted: deleted, students_cleaned: simIds.length };
    return new Response(JSON.stringify(results, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
});
