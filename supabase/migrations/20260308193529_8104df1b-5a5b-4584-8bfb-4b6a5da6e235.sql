
-- Create subject_tracks table for multi-track learning management
CREATE TABLE public.subject_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Core Academics',
  daily_target integer NOT NULL DEFAULT 1,
  unit_type text NOT NULL DEFAULT 'lessons',
  icon text NOT NULL DEFAULT 'BookOpen',
  color text NOT NULL DEFAULT 'primary',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subject_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subject_tracks_select" ON public.subject_tracks
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (student_id = get_my_student_id() OR get_my_role() = 'parent');

CREATE POLICY "subject_tracks_insert" ON public.subject_tracks
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'parent');

CREATE POLICY "subject_tracks_update" ON public.subject_tracks
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (get_my_role() = 'parent');

CREATE POLICY "subject_tracks_delete" ON public.subject_tracks
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (get_my_role() = 'parent');

-- Create activity_logs table for per-track activity tracking
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.subject_tracks(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'Planned',
  notes text,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_select" ON public.activity_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (student_id = get_my_student_id() OR get_my_role() = 'parent');

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (student_id = get_my_student_id() OR get_my_role() = 'parent');

CREATE POLICY "activity_logs_update" ON public.activity_logs
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (student_id = get_my_student_id() OR get_my_role() = 'parent');

CREATE POLICY "activity_logs_delete" ON public.activity_logs
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (get_my_role() = 'parent');
