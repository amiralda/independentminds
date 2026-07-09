import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email is now sent via Lovable transactional email infrastructure

interface NotifyRequest {
  filters: {
    roles?: string[];
    betaStatus?: string;
    taskProgress?: string;
    languages?: string[];
    activity?: string;
    specificUsers?: string[];
  };
  channels: string[];
  title: string;
  body: string;
  scheduled_for?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Verify admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: NotifyRequest = await req.json();
    const { filters, channels, title, body: messageBody, scheduled_for } = body;

    if (!channels || channels.length === 0) {
      return new Response(JSON.stringify({ error: "At least one channel required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve recipients
    const recipients = await resolveRecipients(supabase, filters);

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const personalizedTitle = personalizeMessage(title, recipient);
        const personalizedBody = personalizeMessage(messageBody, recipient);

        // In-app notification
        if (channels.includes("inapp")) {
          // Find parent_id - for parents it's their own id, for others we try to find one
          const parentId = recipient.id;
          await supabase.from("inbox_messages").insert({
            parent_id: parentId,
            student_id: recipient.student_id || "system",
            message_type: "admin_broadcast",
            title: personalizedTitle,
            body: personalizedBody,
          });
        }

        // Email via Lovable transactional email system
        if (channels.includes("email") && recipient.email) {
          try {
            await supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "admin-broadcast",
                recipientEmail: recipient.email,
                templateData: {
                  title: personalizedTitle,
                  body: personalizedBody,
                  recipientName: recipient.display_name,
                },
              },
            });
          } catch (emailErr) {
            console.error("Failed to send transactional email:", emailErr);
          }
        }

        // WhatsApp
        if (channels.includes("whatsapp") && recipient.whatsapp_number) {
          const { sendWhatsApp } = await import("../_shared/whatsapp.ts");
          await sendWhatsApp(recipient.whatsapp_number, `${personalizedTitle}\n\n${personalizedBody}`);
        }

        // Telegram
        if (channels.includes("telegram") && recipient.telegram_chat_id && recipient.telegram_bot_token) {
          const url = `https://api.telegram.org/bot${recipient.telegram_bot_token}/sendMessage`;
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: recipient.telegram_chat_id,
              text: `<b>${personalizedTitle}</b>\n\n${personalizedBody}`,
              parse_mode: "HTML",
            }),
          });
        }

        sent++;
      } catch (e) {
        console.error("Failed to notify recipient:", recipient.id, e);
        failed++;
      }
    }

    // Log the sent notification
    await supabase.from("admin_sent_notifications").insert({
      sent_by: user.id,
      title,
      body: messageBody,
      channels,
      filters,
      recipient_count: sent,
      scheduled_for: scheduled_for || null,
      status: failed === recipients.length ? "failed" : "sent",
    });

    return new Response(
      JSON.stringify({ sent, failed, total: recipients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("admin-notify error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface Recipient {
  id: string;
  display_name: string;
  email?: string;
  student_id?: string;
  whatsapp_number?: string;
  telegram_chat_id?: string;
  telegram_bot_token?: string;
  tasks_remaining?: number;
  level?: string;
  points?: number;
}

async function resolveRecipients(supabase: unknown, filters: NotifyRequest["filters"]): Promise<Recipient[]> {
  // Get all profiles with auth emails
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, role, student_id, language_pref, last_active_at");

  if (!profiles) return [];

  // Get auth emails
  const userIds = profiles.map((p: unknown) => p.id);
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      emailMap[u.id] = u.email || "";
    }
  }

  // Get parent settings for whatsapp/telegram
  const { data: parentSettings } = await supabase
    .from("parent_settings")
    .select("user_id, whatsapp_number, whatsapp_enabled, telegram_chat_id, telegram_bot_token");
  const settingsMap: Record<string, unknown> = {};
  if (parentSettings) {
    for (const s of parentSettings) {
      settingsMap[s.user_id] = s;
    }
  }

  // Get beta testers
  const { data: betaTesters } = await supabase
    .from("beta_testers")
    .select("id, user_id, tester_type, points_earned, current_level, tasks_completed, tasks_total");
  const betaMap: Record<string, unknown> = {};
  if (betaTesters) {
    for (const bt of betaTesters) {
      if (bt.user_id) betaMap[bt.user_id] = bt;
    }
  }

  // Get co-guardians
  const { data: coGuardians } = await supabase.from("co_guardians").select("guardian_id");
  const coGuardianSet = new Set((coGuardians || []).map((cg: unknown) => cg.guardian_id));

  let filtered = profiles;

  // Filter by role
  if (filters.roles && filters.roles.length > 0) {
    filtered = filtered.filter((p: unknown) => {
      for (const role of filters.roles!) {
        if (role === "parents" && p.role === "parent") return true;
        if (role === "beta_testers" && betaMap[p.id]) return true;
        if (role === "co_guardians" && coGuardianSet.has(p.id)) return true;
        if (role === "admins" && p.role === "admin") return true;
      }
      return false;
    });
  }

  // Filter by beta status
  if (filters.betaStatus === "beta_only") {
    filtered = filtered.filter((p: unknown) => betaMap[p.id]);
  } else if (filters.betaStatus === "non_beta") {
    filtered = filtered.filter((p: unknown) => !betaMap[p.id]);
  }

  // Filter by task progress
  if (filters.taskProgress && filters.taskProgress !== "unknown") {
    filtered = filtered.filter((p: unknown) => {
      const bt = betaMap[p.id];
      if (!bt) return false;
      const completed = bt.tasks_completed || 0;
      const total = bt.tasks_total || 0;
      if (filters.taskProgress === "never_started") return completed === 0;
      if (filters.taskProgress === "in_progress") return completed >= 1 && completed <= 3;
      if (filters.taskProgress === "completed") return completed >= total && total > 0;
      return true;
    });
  }

  // Filter by language
  if (filters.languages && filters.languages.length > 0) {
    filtered = filtered.filter((p: unknown) =>
      filters.languages!.includes(p.language_pref?.toUpperCase() || "EN")
    );
  }

  // Filter by activity
  if (filters.activity && filters.activity !== "all") {
    const now = Date.now();
    const day = 86400000;
    filtered = filtered.filter((p: unknown) => {
      const last = p.last_active_at ? new Date(p.last_active_at).getTime() : 0;
      const daysAgo = (now - last) / day;
      if (filters.activity === "active_7d") return daysAgo <= 7;
      if (filters.activity === "inactive_7d") return daysAgo > 7;
      if (filters.activity === "inactive_30d") return daysAgo > 30;
      if (filters.activity === "never") return !p.last_active_at;
      return true;
    });
  }

  // Filter by specific users
  if (filters.specificUsers && filters.specificUsers.length > 0) {
    filtered = filtered.filter((p: unknown) => filters.specificUsers!.includes(p.id));
  }

  // Map to recipients
  return filtered.map((p: unknown) => {
    const settings = settingsMap[p.id] || {};
    const beta = betaMap[p.id];
    return {
      id: p.id,
      display_name: p.display_name,
      email: emailMap[p.id] || undefined,
      student_id: p.student_id,
      whatsapp_number: settings.whatsapp_enabled ? settings.whatsapp_number : undefined,
      telegram_chat_id: settings.telegram_chat_id,
      telegram_bot_token: settings.telegram_bot_token,
      tasks_remaining: beta ? (beta.tasks_total || 0) - (beta.tasks_completed || 0) : 0,
      level: beta?.current_level || "Explorer",
      points: beta?.points_earned || 0,
    };
  });
}

function personalizeMessage(msg: string, recipient: Recipient): string {
  return msg
    .replace(/\{\{name\}\}/g, recipient.display_name || "there")
    .replace(/\{\{tasks_remaining\}\}/g, String(recipient.tasks_remaining || 0))
    .replace(/\{\{level\}\}/g, recipient.level || "Explorer")
    .replace(/\{\{points\}\}/g, String(recipient.points || 0));
}

