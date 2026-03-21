
-- 1. Point settings table: parent-configurable point values per student
CREATE TABLE public.point_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  action_key text NOT NULL,
  points integer NOT NULL DEFAULT 10,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, action_key)
);

ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_settings_select" ON public.point_settings
  FOR SELECT TO authenticated USING (is_my_student(student_id));

CREATE POLICY "point_settings_insert" ON public.point_settings
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'parent' AND is_my_student(student_id));

CREATE POLICY "point_settings_update" ON public.point_settings
  FOR UPDATE TO authenticated USING (get_my_role() = 'parent' AND is_my_student(student_id));

CREATE POLICY "point_settings_delete" ON public.point_settings
  FOR DELETE TO authenticated USING (get_my_role() = 'parent' AND is_my_student(student_id));

-- 2. Challenges table: weekly goals with bonus rewards
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  title text NOT NULL,
  description text,
  target_count integer NOT NULL DEFAULT 5,
  current_count integer NOT NULL DEFAULT 0,
  bonus_points integer NOT NULL DEFAULT 50,
  challenge_type text NOT NULL DEFAULT 'weekly',
  category_filter text,
  subject_filter text,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_select" ON public.challenges
  FOR SELECT TO authenticated USING (is_my_student(student_id));

CREATE POLICY "challenges_insert" ON public.challenges
  FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'parent' AND is_my_student(student_id));

CREATE POLICY "challenges_update" ON public.challenges
  FOR UPDATE TO authenticated USING (is_my_student(student_id));

CREATE POLICY "challenges_delete" ON public.challenges
  FOR DELETE TO authenticated USING (get_my_role() = 'parent' AND is_my_student(student_id));
