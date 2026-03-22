
CREATE TABLE public.impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id text NOT NULL,
  action text NOT NULL DEFAULT 'start',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parent_reads_own_logs" ON public.impersonation_logs
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "parent_inserts_own_logs" ON public.impersonation_logs
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid() AND get_my_role() = 'parent' AND is_my_student(student_id));

CREATE POLICY "admin_reads_all_logs" ON public.impersonation_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "no_update_logs" ON public.impersonation_logs
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "no_delete_logs" ON public.impersonation_logs
  FOR DELETE TO authenticated
  USING (false);
