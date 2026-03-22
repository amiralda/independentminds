
CREATE OR REPLACE FUNCTION public.notify_admins_on_sos_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  student_name text;
  parent_name text;
  parent_id_val uuid;
BEGIN
  IF NEW.need_help IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT display_name, parent_id INTO student_name, parent_id_val
  FROM public.students WHERE student_id = NEW.student_id;

  IF parent_id_val IS NOT NULL THEN
    SELECT display_name INTO parent_name FROM public.profiles WHERE id = parent_id_val;
  END IF;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_notifications (admin_id, title, body, notification_type, metadata)
    VALUES (
      admin_record.user_id,
      'SOS Check-In',
      COALESCE(student_name, NEW.student_id) || ' requested help (mood: ' || COALESCE(NEW.mood, '?') || ', focus: ' || COALESCE(NEW.focus, '?') || ')',
      'sos_checkin',
      jsonb_build_object(
        'student_id', NEW.student_id,
        'student_name', student_name,
        'parent_name', parent_name,
        'mood', NEW.mood,
        'focus', NEW.focus,
        'comment', NEW.comment
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_sos_checkin
AFTER INSERT ON public.check_ins
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_sos_checkin();
