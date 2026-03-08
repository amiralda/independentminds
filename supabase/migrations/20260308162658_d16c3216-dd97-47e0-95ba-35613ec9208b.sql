
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'badge',
  name text NOT NULL,
  description text,
  criteria_met_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select" ON public.achievements
  FOR SELECT TO authenticated
  USING (student_id = get_my_student_id() OR get_my_role() = 'parent');

CREATE POLICY "achievements_insert" ON public.achievements
  FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_student_id() OR get_my_role() = 'parent');

CREATE POLICY "achievements_delete" ON public.achievements
  FOR DELETE TO authenticated
  USING (get_my_role() = 'parent');
