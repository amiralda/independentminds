import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}

// Lazy proxy: defers createClient() until first property access so that
// importing this module never throws when SUPABASE_SERVICE_ROLE_KEY is absent.
// The proxy only intercepts the top-level access; nested calls (e.g.
// supabaseAdmin.auth.admin.listUsers()) operate on real Supabase objects
// with correct `this` context, so no recursive proxying is needed.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
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
