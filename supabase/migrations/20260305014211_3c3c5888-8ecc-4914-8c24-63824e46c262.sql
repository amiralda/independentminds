
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) STUDENTS table
CREATE TABLE public.students (
  student_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  grade_level INTEGER NOT NULL DEFAULT 7,
  timezone TEXT NOT NULL DEFAULT 'America/Port-au-Prince',
  language_pref TEXT NOT NULL DEFAULT 'EN',
  parent_name TEXT,
  parent_email TEXT,
  parent_whatsapp TEXT,
  student_whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students are viewable by all" ON public.students FOR SELECT USING (true);
CREATE POLICY "Students insertable by all" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students updatable by all" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Students deletable by all" ON public.students FOR DELETE USING (true);

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) CURRICULUM_MAP table
CREATE TABLE public.curriculum_map (
  map_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level INTEGER NOT NULL DEFAULT 7,
  subject TEXT NOT NULL,
  unit_or_chapter TEXT,
  lesson_title TEXT NOT NULL,
  time4learning_path_hint TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  difficulty TEXT DEFAULT 'Medium',
  language_support_tip TEXT,
  platform_name TEXT DEFAULT 'Time4Learning',
  platform_link TEXT DEFAULT 'https://www.time4learning.com',
  platform_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curriculum viewable by all" ON public.curriculum_map FOR SELECT USING (true);
CREATE POLICY "Curriculum insertable by all" ON public.curriculum_map FOR INSERT WITH CHECK (true);
CREATE POLICY "Curriculum updatable by all" ON public.curriculum_map FOR UPDATE USING (true);
CREATE POLICY "Curriculum deletable by all" ON public.curriculum_map FOR DELETE USING (true);

CREATE TRIGGER update_curriculum_map_updated_at BEFORE UPDATE ON public.curriculum_map
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) DAILY_PLAN table
CREATE TABLE public.daily_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date DATE NOT NULL,
  student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  block_order INTEGER NOT NULL DEFAULT 1,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  map_id UUID REFERENCES public.curriculum_map(map_id),
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned','In Progress','Done','Missed')),
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 5),
  notes TEXT,
  time4learning_score INTEGER,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily plan viewable by all" ON public.daily_plan FOR SELECT USING (true);
CREATE POLICY "Daily plan insertable by all" ON public.daily_plan FOR INSERT WITH CHECK (true);
CREATE POLICY "Daily plan updatable by all" ON public.daily_plan FOR UPDATE USING (true);
CREATE POLICY "Daily plan deletable by all" ON public.daily_plan FOR DELETE USING (true);

CREATE INDEX idx_daily_plan_date ON public.daily_plan(plan_date, student_id);

CREATE TRIGGER update_daily_plan_updated_at BEFORE UPDATE ON public.daily_plan
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) CHECK_INS table
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  student_id TEXT NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('Good','Okay','Tired')),
  focus TEXT NOT NULL CHECK (focus IN ('High','Medium','Low')),
  blocks_done INTEGER NOT NULL DEFAULT 0,
  need_help BOOLEAN NOT NULL DEFAULT false,
  comment TEXT
);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Check-ins viewable by all" ON public.check_ins FOR SELECT USING (true);
CREATE POLICY "Check-ins insertable by all" ON public.check_ins FOR INSERT WITH CHECK (true);
CREATE POLICY "Check-ins updatable by all" ON public.check_ins FOR UPDATE USING (true);

-- 5) MESSAGES_LOG table
CREATE TABLE public.messages_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp','Email','SMS')),
  type TEXT NOT NULL CHECK (type IN ('MorningReminder','CheckIn','DailyReport','WeeklyBadge')),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'Sent',
  provider_message_id TEXT
);

ALTER TABLE public.messages_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by all" ON public.messages_log FOR SELECT USING (true);
CREATE POLICY "Messages insertable by all" ON public.messages_log FOR INSERT WITH CHECK (true);
