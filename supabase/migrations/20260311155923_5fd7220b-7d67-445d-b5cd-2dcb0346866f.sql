-- Batch 2: curriculum_map, daily_plan, messages_log

-- curriculum_map
DROP POLICY IF EXISTS "curriculum_map_select" ON public.curriculum_map;
CREATE POLICY "curriculum_map_select" ON public.curriculum_map FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "curriculum_map_insert" ON public.curriculum_map;
CREATE POLICY "curriculum_map_insert" ON public.curriculum_map FOR INSERT TO authenticated WITH CHECK ((get_my_role() = 'parent') AND (auth.uid() = user_id));

DROP POLICY IF EXISTS "curriculum_map_update" ON public.curriculum_map;
CREATE POLICY "curriculum_map_update" ON public.curriculum_map FOR UPDATE TO authenticated USING ((get_my_role() = 'parent') AND (auth.uid() = user_id));

DROP POLICY IF EXISTS "curriculum_map_delete" ON public.curriculum_map;
CREATE POLICY "curriculum_map_delete" ON public.curriculum_map FOR DELETE TO authenticated USING ((get_my_role() = 'parent') AND (auth.uid() = user_id));

-- daily_plan
DROP POLICY IF EXISTS "daily_plan_select" ON public.daily_plan;
CREATE POLICY "daily_plan_select" ON public.daily_plan FOR SELECT TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "daily_plan_insert" ON public.daily_plan;
CREATE POLICY "daily_plan_insert" ON public.daily_plan FOR INSERT TO authenticated WITH CHECK (is_my_student(student_id));

DROP POLICY IF EXISTS "daily_plan_update" ON public.daily_plan;
CREATE POLICY "daily_plan_update" ON public.daily_plan FOR UPDATE TO authenticated USING (is_my_student(student_id));

DROP POLICY IF EXISTS "daily_plan_delete" ON public.daily_plan;
CREATE POLICY "daily_plan_delete" ON public.daily_plan FOR DELETE TO authenticated USING (is_my_student(student_id));

-- messages_log (SELECT only - writes are service-role only)
DROP POLICY IF EXISTS "messages_log_select" ON public.messages_log;
CREATE POLICY "messages_log_select" ON public.messages_log FOR SELECT TO authenticated USING (auth.uid() = user_id);