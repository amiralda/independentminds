
-- ============ curriculum_map: tighten RLS ============
DROP POLICY IF EXISTS "Curriculum viewable by all" ON public.curriculum_map;
DROP POLICY IF EXISTS "Curriculum insertable by all" ON public.curriculum_map;
DROP POLICY IF EXISTS "Curriculum updatable by all" ON public.curriculum_map;
DROP POLICY IF EXISTS "Curriculum deletable by all" ON public.curriculum_map;

-- Everyone authenticated can read
CREATE POLICY "curriculum_map_select" ON public.curriculum_map
  FOR SELECT TO authenticated USING (true);

-- Only parents can insert/update/delete
CREATE POLICY "curriculum_map_insert" ON public.curriculum_map
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'parent');

CREATE POLICY "curriculum_map_update" ON public.curriculum_map
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'parent');

CREATE POLICY "curriculum_map_delete" ON public.curriculum_map
  FOR DELETE TO authenticated USING (public.get_my_role() = 'parent');

-- ============ students: tighten RLS ============
DROP POLICY IF EXISTS "Students are viewable by all" ON public.students;
DROP POLICY IF EXISTS "Students insertable by all" ON public.students;
DROP POLICY IF EXISTS "Students updatable by all" ON public.students;
DROP POLICY IF EXISTS "Students deletable by all" ON public.students;

-- Students see own row; parents see all
CREATE POLICY "students_select" ON public.students
  FOR SELECT TO authenticated
  USING (student_id = public.get_my_student_id() OR public.get_my_role() = 'parent');

-- Only parents can insert/update/delete
CREATE POLICY "students_insert" ON public.students
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'parent');

CREATE POLICY "students_update" ON public.students
  FOR UPDATE TO authenticated USING (public.get_my_role() = 'parent');

CREATE POLICY "students_delete" ON public.students
  FOR DELETE TO authenticated USING (public.get_my_role() = 'parent');

-- ============ messages_log: tighten RLS ============
DROP POLICY IF EXISTS "Messages viewable by all" ON public.messages_log;
DROP POLICY IF EXISTS "Messages insertable by all" ON public.messages_log;

-- Only parents can read
CREATE POLICY "messages_log_select" ON public.messages_log
  FOR SELECT TO authenticated USING (public.get_my_role() = 'parent');

-- Only backend/parents can insert
CREATE POLICY "messages_log_insert" ON public.messages_log
  FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'parent');
