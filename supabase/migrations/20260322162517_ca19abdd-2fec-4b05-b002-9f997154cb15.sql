
CREATE OR REPLACE FUNCTION public.notify_admins_on_reward_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  student_name text;
  reward_name text;
  reward_icon text;
BEGIN
  SELECT display_name INTO student_name FROM public.students WHERE student_id = NEW.student_id;
  SELECT name, icon INTO reward_name, reward_icon FROM public.rewards_catalog WHERE id = NEW.reward_id;

  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_notifications (admin_id, title, body, notification_type, metadata)
    VALUES (
      admin_record.user_id,
      'Reward Redeemed',
      COALESCE(student_name, NEW.student_id) || ' redeemed ' || COALESCE(reward_icon, '🎁') || ' ' || COALESCE(reward_name, 'a reward') || ' (' || NEW.points_spent || ' pts)',
      'reward_redeemed',
      jsonb_build_object(
        'student_id', NEW.student_id,
        'student_name', student_name,
        'reward_id', NEW.reward_id,
        'reward_name', reward_name,
        'reward_icon', reward_icon,
        'points_spent', NEW.points_spent
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_reward_redemption
AFTER INSERT ON public.reward_redemptions
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_reward_redemption();
