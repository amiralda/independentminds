
-- Admin notifications table
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  notification_type text NOT NULL DEFAULT 'impersonation',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can read their own notifications
CREATE POLICY "admin_reads_own_notifications" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'));

-- Admins can update (mark read) their own notifications
CREATE POLICY "admin_updates_own_notifications" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (admin_id = auth.uid() AND has_role(auth.uid(), 'admin'));

-- No client inserts (only trigger)
CREATE POLICY "no_client_insert_admin_notifications" ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- No client deletes
CREATE POLICY "no_client_delete_admin_notifications" ON public.admin_notifications
  FOR DELETE TO authenticated
  USING (false);

-- Function to notify admins on impersonation
CREATE OR REPLACE FUNCTION public.notify_admins_on_impersonation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  parent_name text;
  student_name text;
BEGIN
  -- Only notify on 'start' action
  IF NEW.action <> 'start' THEN
    RETURN NEW;
  END IF;

  -- Get parent display name
  SELECT display_name INTO parent_name FROM public.profiles WHERE id = NEW.parent_id;
  
  -- Get student display name
  SELECT display_name INTO student_name FROM public.students WHERE student_id = NEW.student_id;

  -- Insert notification for each admin
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_notifications (admin_id, title, body, notification_type, metadata)
    VALUES (
      admin_record.user_id,
      'Student Impersonation',
      COALESCE(parent_name, 'A parent') || ' logged in as ' || COALESCE(student_name, NEW.student_id),
      'impersonation',
      jsonb_build_object('parent_id', NEW.parent_id, 'student_id', NEW.student_id, 'parent_name', parent_name, 'student_name', student_name)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on impersonation_logs
CREATE TRIGGER trg_notify_admins_on_impersonation
  AFTER INSERT ON public.impersonation_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_impersonation();
