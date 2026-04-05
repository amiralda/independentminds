ALTER TABLE public.beta_testers
  ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_level text NOT NULL DEFAULT 'Explorer',
  ADD COLUMN IF NOT EXISTS first_login_shown boolean NOT NULL DEFAULT false;