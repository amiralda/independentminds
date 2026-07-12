import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Lazily create the Supabase admin client.
 *
 * The client is created on first use rather than at import time so that
 * importing this module (which happens for every spec during Playwright test
 * collection) never throws when the service-role secret is absent. Only tests
 * that actually exercise the admin client will fail — with a clear message —
 * when the required environment variables are missing.
 */
function getAdminClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the Supabase admin test helper.'
      );
    }
    client = createClient(url, serviceRoleKey);
  }
  return client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdminClient(), prop, receiver);
  },
});

export async function cleanupTestUser(email: string) {
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === email);
  if (user) await supabaseAdmin.auth.admin.deleteUser(user.id);
}

export async function getProfile(userId: string) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}
