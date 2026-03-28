// Trigger: pg_cron — every Sunday 00:00 UTC
// Auth: CRON_SECRET header (no JWT)
// Rate limit: N/A (cron only)
// Side effects: Writes JSON to storage/backups, sends Telegram, deletes old backups

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const TABLES = [
  'profiles',
  'students',
  'daily_plan',
  'check_ins',
  'achievements',
  'reward_points',
  'rewards_catalog',
  'reward_redemptions',
  'messages_log',
  'parent_settings',
  'ai_conversations',
  'schedule_templates',
  'co_guardians',
  'guardian_invites',
  'inbox_messages',
  'user_roles',
  'beta_config',
  'beta_invites',
  'beta_requests',
  'beta_testers',
  'beta_tasks',
  'beta_task_completions',
  'beta_feedback',
  'beta_events',
  'beta_sessions',
  'beta_invite_logs',
] as const;

const MAX_BACKUPS = 4;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected || cronSecret !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const folder = today;
  let savedCount = 0;
  const errors: string[] = [];

  // 1. Export each table as JSON to storage
  for (const table of TABLES) {
    try {
      // Paginate to handle tables > 1000 rows
      let allRows: unknown[] = [];
      let offset = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await admin
          .from(table)
          .select('*')
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        offset += pageSize;
      }

      const json = JSON.stringify(allRows, null, 2);
      const filePath = `${folder}/${table}.json`;

      const { error: uploadErr } = await admin.storage
        .from('backups')
        .upload(filePath, new Blob([json], { type: 'application/json' }), {
          contentType: 'application/json',
          upsert: true,
        });

      if (uploadErr) throw uploadErr;
      savedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${table}: ${msg}`);
      console.error(`Backup failed for ${table}:`, msg);
    }
  }

  // 2. Clean up old backups (keep last MAX_BACKUPS)
  try {
    const { data: folders } = await admin.storage.from('backups').list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'desc' },
    });

    if (folders && folders.length > 0) {
      // Folders show up as items; filter to date-like names
      const backupFolders = folders
        .filter((f) => /^\d{4}-\d{2}-\d{2}$/.test(f.name))
        .sort((a, b) => b.name.localeCompare(a.name));

      const toDelete = backupFolders.slice(MAX_BACKUPS);

      for (const old of toDelete) {
        // List files in the old folder and delete them
        const { data: files } = await admin.storage
          .from('backups')
          .list(old.name);

        if (files && files.length > 0) {
          const paths = files.map((f) => `${old.name}/${f.name}`);
          await admin.storage.from('backups').remove(paths);
        }
      }

      if (toDelete.length > 0) {
        console.log(
          `Cleaned up ${toDelete.length} old backup(s): ${toDelete.map((f) => f.name).join(', ')}`
        );
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }

  // 3. Send Telegram notification to admin
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (botToken && chatId) {
      const statusEmoji = errors.length === 0 ? '✅' : '⚠️';
      let message =
        `${statusEmoji} Weekly backup complete — ${savedCount}/${TABLES.length} tables saved — ${today}`;

      if (errors.length > 0) {
        message += `\n\n❌ Errors (${errors.length}):\n${errors.join('\n')}`;
      }

      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      );
    }
  } catch (err) {
    console.error('Telegram notification error:', err);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      date: today,
      tables_saved: savedCount,
      tables_total: TABLES.length,
      errors,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
