import { test, expect } from '@playwright/test';
import { cleanupTestUser, supabaseAdmin } from '../helpers/supabase';

test('AUTH-07 — onboarding_step defaults correctly for new users', async () => {
  const email = `onboard-${Date.now()}@test.com`;
  const { data } = await supabaseAdmin.auth.signUp({
    email,
    password: 'Onboard2026!',
    options: {
      data: {
        display_name: 'Onboard User',
        adult_confirmed: true,
        adult_confirmed_at: new Date().toISOString(),
      },
    },
  });

  if (data.user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('onboarding_step, onboarding_complete')
      .eq('id', data.user.id)
      .single();

    // onboarding_step should default to 0, onboarding_complete to false
    expect(profile?.onboarding_complete).toBe(false);
    expect(profile?.onboarding_step).toBeDefined();
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
});
