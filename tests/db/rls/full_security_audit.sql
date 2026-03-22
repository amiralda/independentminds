BEGIN;
SELECT plan(35);

-- All key tables have RLS
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='profiles'         AND relnamespace='public'::regnamespace),'RLS: profiles');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='students'         AND relnamespace='public'::regnamespace),'RLS: students');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='daily_plan'       AND relnamespace='public'::regnamespace),'RLS: daily_plan');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='co_guardians'     AND relnamespace='public'::regnamespace),'RLS: co_guardians');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='guardian_invites' AND relnamespace='public'::regnamespace),'RLS: guardian_invites');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='inbox_messages'   AND relnamespace='public'::regnamespace),'RLS: inbox_messages');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='user_roles'       AND relnamespace='public'::regnamespace),'RLS: user_roles');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='flagged_inputs'   AND relnamespace='public'::regnamespace),'RLS: flagged_inputs');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='messages_log'     AND relnamespace='public'::regnamespace),'RLS: messages_log');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='rate_limits'      AND relnamespace='public'::regnamespace),'RLS: rate_limits');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='ai_conversations' AND relnamespace='public'::regnamespace),'RLS: ai_conversations');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE relname='merge_requests'   AND relnamespace='public'::regnamespace),'RLS: merge_requests');

-- Security definer functions
SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='has_role'),               'has_role() SECURITY DEFINER');
SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='has_guardian_permission'), 'has_guardian_permission() SECURITY DEFINER');
SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='award_points'),            'award_points() SECURITY DEFINER');
SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='redeem_reward'),           'redeem_reward() SECURITY DEFINER');
SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='increment_rate_limit'),    'increment_rate_limit() SECURITY DEFINER');
SELECT ok((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='delete_my_account'),       'delete_my_account() SECURITY DEFINER');

-- No client INSERT on write-protected tables
SELECT ok(NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='messages_log' AND cmd='INSERT' AND qual IS NULL AND with_check = 'false'),
  'SEC-05: messages_log blocks client INSERT');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='rate_limits' AND cmd='INSERT'),
  'SEC-06: rate_limits has INSERT policy defined');
SELECT ok(EXISTS(SELECT 1 FROM pg_policies WHERE tablename='flagged_inputs'),
  'SEC-07: flagged_inputs has policies');

-- COPPA columns exist
SELECT has_column('public','profiles','adult_confirmed',    'profiles.adult_confirmed');
SELECT has_column('public','profiles','adult_confirmed_at', 'profiles.adult_confirmed_at');
SELECT has_column('public','profiles','language_pref',      'profiles.language_pref');
SELECT has_column('public','profiles','onboarding_step',    'profiles.onboarding_step');
SELECT has_column('public','parent_settings','telegram_bot_token','telegram_bot_token exists');

-- Guardian invite columns
SELECT has_column('public','guardian_invites','token',      'guardian_invites.token');
SELECT has_column('public','guardian_invites','expires_at', 'guardian_invites.expires_at');

-- Admin notification columns
SELECT has_column('public','admin_notifications','notification_type', 'admin_notifications.notification_type');
SELECT has_column('public','admin_notifications','metadata',          'admin_notifications.metadata');

-- Impersonation logs
SELECT has_column('public','impersonation_logs','parent_id',  'impersonation_logs.parent_id');
SELECT has_column('public','impersonation_logs','student_id', 'impersonation_logs.student_id');
SELECT has_column('public','impersonation_logs','action',     'impersonation_logs.action');

-- Anonymous cannot read protected tables
SET LOCAL role TO anon;
SELECT is_empty($$SELECT * FROM public.profiles     LIMIT 1$$,'Anon: no profiles');
SELECT is_empty($$SELECT * FROM public.user_roles   LIMIT 1$$,'Anon: no user_roles');
SELECT is_empty($$SELECT * FROM public.flagged_inputs LIMIT 1$$,'Anon: no flagged_inputs');
RESET role;

SELECT * FROM finish();
ROLLBACK;
