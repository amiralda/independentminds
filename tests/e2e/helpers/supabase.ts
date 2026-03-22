import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
