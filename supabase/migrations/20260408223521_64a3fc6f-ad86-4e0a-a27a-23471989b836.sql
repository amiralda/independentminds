
-- Feature 4: educator_parent_invites
CREATE TABLE public.educator_parent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  educator_id uuid NOT NULL REFERENCES public.educators(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  parent_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.educator_parent_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "educator_manages_own_parent_invites" ON public.educator_parent_invites
  FOR ALL TO authenticated
  USING (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()))
  WITH CHECK (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()));

CREATE POLICY "admin_reads_educator_parent_invites" ON public.educator_parent_invites
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Feature 5: create tables first
CREATE TABLE public.educator_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES public.educators(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_type text NOT NULL CHECK (group_type IN ('class', 'subject_group')),
  grade_level text,
  subject text,
  academic_year text,
  description text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.educator_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.educator_group_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.educator_groups(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.educator_group_students ENABLE ROW LEVEL SECURITY;

-- Now add policies (educator_group_students exists)
CREATE POLICY "educator_manages_own_groups" ON public.educator_groups
  FOR ALL TO authenticated
  USING (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()))
  WITH CHECK (educator_id IN (SELECT id FROM public.educators WHERE user_id = auth.uid()));

CREATE POLICY "admin_reads_all_groups" ON public.educator_groups
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "parent_reads_child_groups" ON public.educator_groups
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.educator_group_students egs
    JOIN public.students s ON s.student_id = egs.student_id
    WHERE egs.group_id = educator_groups.id AND s.parent_id = auth.uid()
  ));

-- Trigger: enforce one class per student per educator
CREATE OR REPLACE FUNCTION public.enforce_one_class_per_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group_type text;
  v_educator_id uuid;
  v_existing_class text;
BEGIN
  SELECT group_type, educator_id INTO v_group_type, v_educator_id
  FROM public.educator_groups WHERE id = NEW.group_id;

  IF v_group_type = 'class' THEN
    SELECT eg.name INTO v_existing_class
    FROM public.educator_group_students egs
    JOIN public.educator_groups eg ON eg.id = egs.group_id
    WHERE egs.student_id = NEW.student_id
      AND eg.educator_id = v_educator_id
      AND eg.group_type = 'class'
      AND egs.id IS DISTINCT FROM NEW.id;

    IF v_existing_class IS NOT NULL THEN
      RAISE EXCEPTION 'Student already belongs to class "%". Remove them first.', v_existing_class;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_one_class_per_student
  BEFORE INSERT OR UPDATE ON public.educator_group_students
  FOR EACH ROW EXECUTE FUNCTION public.enforce_one_class_per_student();

CREATE POLICY "educator_manages_own_group_students" ON public.educator_group_students
  FOR ALL TO authenticated
  USING (group_id IN (
    SELECT eg.id FROM public.educator_groups eg
    JOIN public.educators e ON e.id = eg.educator_id
    WHERE e.user_id = auth.uid()
  ))
  WITH CHECK (group_id IN (
    SELECT eg.id FROM public.educator_groups eg
    JOIN public.educators e ON e.id = eg.educator_id
    WHERE e.user_id = auth.uid()
  ));

CREATE POLICY "admin_reads_all_group_students" ON public.educator_group_students
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "parent_reads_own_child_group_membership" ON public.educator_group_students
  FOR SELECT TO authenticated
  USING (student_id IN (
    SELECT s.student_id FROM public.students s WHERE s.parent_id = auth.uid()
  ));
