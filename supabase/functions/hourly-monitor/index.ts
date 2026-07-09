import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time in Haiti timezone
    const nowUtc = new Date();
    const haitiFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Port-au-Prince",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Port-au-Prince",
    });
    const haitiTime = haitiFormatter.format(nowUtc); // e.g. "10:00"
    const haitiDate = dateFormatter.format(nowUtc);   // e.g. "2026-03-19"
    const currentHour = parseInt(haitiTime.split(":")[0]);
    const currentMinStr = `${String(currentHour).padStart(2, "0")}:00`;
    const nextHourStr = `${String(currentHour + 1).padStart(2, "0")}:00`;

    console.log(`[hourly-monitor] Running for ${haitiDate} at ${haitiTime} Haiti time`);

    // Get all students
    const { data: students } = await supabase
      .from("students")
      .select("student_id, display_name, parent_id, student_whatsapp, monitoring_enabled")
      .eq("monitoring_enabled", true);

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ message: "No students" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { student: string; status: string; actions: string[] }[] = [];

    for (const student of students) {
      const actions: string[] = [];
      const studentName = escapeHtml(student.display_name || student.student_id);

      // Get today's blocks for this student
      const { data: blocks } = await supabase
        .from("daily_plan")
        .select("id, block_order, start_time, end_time, subject, status")
        .eq("student_id", student.student_id)
        .eq("plan_date", haitiDate)
        .order("block_order");

      if (!blocks || blocks.length === 0) {
        results.push({ student: student.student_id, status: "no_blocks", actions });
        continue;
      }

      // Find blocks that should be active or already done by now
      // A block is "late" if its start_time <= current time AND status is still "Planned"
      const lateBlocks = blocks.filter(b => {
        const blockStart = b.start_time.slice(0, 5); // "HH:MM"
        const blockEnd = b.end_time.slice(0, 5);
        return blockStart <= haitiTime && blockEnd > currentMinStr && b.status === "Planned";
      });

      // Blocks that should have been done (end_time already passed) but aren't
      const missedBlocks = blocks.filter(b => {
        const blockEnd = b.end_time.slice(0, 5);
        return blockEnd <= haitiTime && b.status === "Planned";
      });

      // Currently active block (should be in progress right now)
      const activeBlock = blocks.find(b => {
        const blockStart = b.start_time.slice(0, 5);
        const blockEnd = b.end_time.slice(0, 5);
        return blockStart <= haitiTime && blockEnd > haitiTime;
      });

      // Upcoming block in next hour
      const upcomingBlock = blocks.find(b => {
        const blockStart = b.start_time.slice(0, 5);
        return blockStart >= haitiTime && blockStart < nextHourStr && b.status === "Planned";
      });

      // Resolve Telegram credentials
      let telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
      let telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID")!;

      if (student.parent_id) {
        const { data: ps } = await supabase
          .from("parent_settings")
          .select("telegram_bot_token, telegram_chat_id")
          .eq("user_id", student.parent_id)
          .single();
        if (ps?.telegram_bot_token && ps?.telegram_chat_id) {
          telegramToken = ps.telegram_bot_token;
          telegramChatId = ps.telegram_chat_id;
        }
      }

      const sendTelegram = async (message: string, logType: string) => {
        const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: telegramChatId, text: message, parse_mode: "HTML" }),
        });
        const data = await res.json();
        await supabase.from("messages_log").insert({
          recipient: telegramChatId,
          channel: "Telegram",
          type: logType,
          content: message,
          status: res.ok ? "Sent" : "Failed",
          provider_message_id: data.result?.message_id?.toString() || null,
        });
        return res.ok;
      };

      // === COMPLIANCE CHECK ===

      // 1. Late blocks (should have started but still "Planned")
      if (lateBlocks.length > 0) {
        const lateSubjects = lateBlocks.map(b => escapeHtml(b.subject)).join(", ");

        // Student nudge
        const studentMsg = `⏰ <b>Hey ${studentName}!</b>\n\nYou should be working on: <b>${lateSubjects}</b> right now but haven't started yet.\n\n🏃 Open the app and tap "Start Block" to get going!\n\n— <i>Independent Minds Monitor</i>`;
        await sendTelegram(studentMsg, "StudentNudge");
        actions.push(`nudge_late: ${lateSubjects}`);

        // Parent alert
        const parentMsg = `⚠️ <b>Lateness Alert</b>\n\n👤 ${studentName} has not started scheduled block(s):\n📚 <b>${lateSubjects}</b>\n🕐 Currently ${haitiTime} Haiti time\n\nBlock(s) should already be in progress.\n\n— <i>Independent Minds Monitor</i>`;
        await sendTelegram(parentMsg, "ParentLateAlert");
        actions.push("parent_alerted");
      }

      // 2. Missed blocks (time window passed, never started)
      if (missedBlocks.length > 0) {
        const missedSubjects = missedBlocks.map(b => escapeHtml(b.subject)).join(", ");

        // Auto-mark as Missed
        const missedIds = missedBlocks.map(b => b.id);
        await supabase
          .from("daily_plan")
          .update({ status: "Missed" })
          .in("id", missedIds);

        const parentMsg = `❌ <b>Missed Block(s)</b>\n\n👤 ${studentName} missed:\n📚 <b>${missedSubjects}</b>\n\nThese blocks have been auto-marked as "Missed".\n\n— <i>Independent Minds Monitor</i>`;
        await sendTelegram(parentMsg, "ParentMissedAlert");
        actions.push(`auto_missed: ${missedSubjects}`);
      }

      // === HOURLY CHECK-IN PROMPT ===
      // Send if there are blocks scheduled for the current hour or upcoming
      const hasScheduledWork = activeBlock || upcomingBlock;
      if (hasScheduledWork && lateBlocks.length === 0) {
        // Only send check-in if NOT already late (avoid double messaging)
        const doneCount = blocks.filter(b => b.status === "Done").length;
        const totalCount = blocks.length;
        const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

        let statusEmoji = "🟢";
        if (progress < 30) statusEmoji = "🔴";
        else if (progress < 60) statusEmoji = "🟡";

        const currentSubject = activeBlock
          ? escapeHtml(activeBlock.subject)
          : upcomingBlock
            ? escapeHtml(upcomingBlock.subject)
            : "—";

        const checkInMsg = `📋 <b>Hourly Check-In</b> (${haitiTime})\n\n${statusEmoji} Progress: <b>${doneCount}/${totalCount}</b> blocks (${progress}%)\n📚 Current/Next: <b>${currentSubject}</b>\n\n${progress >= 60 ? "Great pace! Keep it up! 💪" : progress >= 30 ? "You're getting there — stay focused! 🎯" : "Let's pick up the pace! You can do this! 🚀"}\n\n— <i>Independent Minds Monitor</i>`;
        await sendTelegram(checkInMsg, "HourlyCheckIn");
        actions.push("hourly_checkin_sent");
      }

      // === ON-TRACK CONFIRMATION ===
      // If student is doing well (active block is "In Progress" or "Done"), affirm
      if (activeBlock && (activeBlock.status === "In Progress" || activeBlock.status === "Done")) {
        const doneCount = blocks.filter(b => b.status === "Done").length;
        const onTrackMsg = `✅ <b>${studentName} is on track!</b>\n\n📚 Currently: <b>${escapeHtml(activeBlock.subject)}</b> (${activeBlock.status})\n📈 ${doneCount} blocks completed today\n\n— <i>Independent Minds Monitor</i>`;
        await sendTelegram(onTrackMsg, "OnTrackUpdate");
        actions.push("on_track_confirmed");
      }

      results.push({
        student: student.student_id,
        status: lateBlocks.length > 0 ? "late" : missedBlocks.length > 0 ? "missed" : "on_track",
        actions,
      });
    }

    console.log(`[hourly-monitor] Results:`, JSON.stringify(results));

    // ═══ SMART ALERT RULES ═══
    try {
      const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
      const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length > 0) {
        // RULE 1: Error spike — 5+ errors on same page in 1 hour
        const { data: recentErrors } = await supabase
          .from("platform_errors")
          .select("page_path")
          .gte("created_at", oneHourAgo);

        if (recentErrors) {
          const pageCounts: Record<string, number> = {};
          for (const e of recentErrors) {
            pageCounts[e.page_path || '/'] = (pageCounts[e.page_path || '/'] || 0) + 1;
          }
          for (const [page, count] of Object.entries(pageCounts)) {
            if (count >= 5) {
              for (const admin of admins) {
                const { data: existing } = await supabase.from("admin_notifications")
                  .select("id").eq("admin_id", admin.user_id)
                  .eq("notification_type", "error_spike").eq("is_read", false)
                  .gte("created_at", oneHourAgo).limit(1);
                if (existing && existing.length > 0) continue;
                await supabase.from("admin_notifications").insert({
                  admin_id: admin.user_id,
                  title: "Error Spike Detected",
                  body: `${count} errors on ${page} in the last hour. Possible critical bug.`,
                  notification_type: "error_spike",
                  is_read: false,
                  metadata: { page_path: page, error_count: count },
                });
              }
            }
          }
        }

        // RULE 2: Low rating — avg below 3.0 in last 24h
        const { data: ratings } = await supabase
          .from("user_feedback")
          .select("rating")
          .eq("feedback_type", "rating")
          .gte("created_at", oneDayAgo)
          .not("rating", "is", null);

        if (ratings && ratings.length >= 3) {
          const avg = ratings.reduce((s: number, r: unknown) => s + r.rating, 0) / ratings.length;
          if (avg < 3.0) {
            for (const admin of admins) {
              const { data: existing } = await supabase.from("admin_notifications")
                .select("id").eq("admin_id", admin.user_id)
                .eq("notification_type", "low_rating").eq("is_read", false)
                .gte("created_at", oneDayAgo).limit(1);
              if (existing && existing.length > 0) continue;
              await supabase.from("admin_notifications").insert({
                admin_id: admin.user_id,
                title: "Low User Satisfaction Alert",
                body: `Average rating dropped to ${avg.toFixed(1)}/5 in the last 24 hours (${ratings.length} responses).`,
                notification_type: "low_rating",
                is_read: false,
                metadata: { average_rating: avg, response_count: ratings.length },
              });
            }
          }
        }

        // RULE 3: Feature request trend — 3+ same category in 24h
        const { data: features } = await supabase
          .from("user_feedback")
          .select("category")
          .eq("feedback_type", "feature")
          .gte("created_at", oneDayAgo)
          .not("category", "is", null);

        if (features) {
          const catCounts: Record<string, number> = {};
          for (const f of features) {
            catCounts[f.category || 'Other'] = (catCounts[f.category || 'Other'] || 0) + 1;
          }
          for (const [cat, count] of Object.entries(catCounts)) {
            if (count >= 3) {
              for (const admin of admins) {
                const { data: existing } = await supabase.from("admin_notifications")
                  .select("id").eq("admin_id", admin.user_id)
                  .eq("notification_type", "feature_trend").eq("is_read", false)
                  .gte("created_at", oneDayAgo).limit(1);
                if (existing && existing.length > 0) continue;
                await supabase.from("admin_notifications").insert({
                  admin_id: admin.user_id,
                  title: "Feature Request Trend",
                  body: `${count} users requested improvements to ${cat} in the last 24 hours.`,
                  notification_type: "feature_trend",
                  is_read: false,
                  metadata: { category: cat, request_count: count },
                });
              }
            }
          }
        }
      }
    } catch (smartErr) {
      console.error("[hourly-monitor] Smart alerts error:", smartErr);
    }

    return new Response(JSON.stringify({ success: true, time: haitiTime, date: haitiDate, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("hourly-monitor error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
