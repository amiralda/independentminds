
-- Trigger: notify admins when a new student is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_student_created()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  parent_name text;
BEGIN
  SELECT display_name INTO parent_name FROM public.profiles WHERE id = NEW.parent_id;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_notifications (admin_id, title, body, notification_type, metadata)
    VALUES (
      admin_record.user_id,
      'New Student Created',
      COALESCE(parent_name, 'A parent') || ' added student ' || COALESCE(NEW.display_name, NEW.student_id),
      'student_created',
      jsonb_build_object('parent_id', NEW.parent_id, 'student_id', NEW.student_id, 'student_name', NEW.display_name, 'parent_name', parent_name)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_student_created
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_student_created();

-- Trigger: notify admins when a co-guardian is added
CREATE OR REPLACE FUNCTION public.notify_admins_on_coguardian_added()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  guardian_name text;
  inviter_name text;
  student_name text;
BEGIN
  SELECT display_name INTO guardian_name FROM public.profiles WHERE id = NEW.guardian_id;
  SELECT display_name INTO inviter_name FROM public.profiles WHERE id = NEW.invited_by;
  SELECT display_name INTO student_name FROM public.students WHERE student_id = NEW.student_id;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_notifications (admin_id, title, body, notification_type, metadata)
    VALUES (
      admin_record.user_id,
      'Co-Guardian Accepted',
      COALESCE(guardian_name, 'A user') || ' joined as co-guardian for ' || COALESCE(student_name, NEW.student_id),
      'coguardian_accepted',
      jsonb_build_object('guardian_id', NEW.guardian_id, 'invited_by', NEW.invited_by, 'student_id', NEW.student_id, 'guardian_name', guardian_name, 'inviter_name', inviter_name, 'student_name', student_name)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_coguardian_added
  AFTER INSERT ON public.co_guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_coguardian_added();
