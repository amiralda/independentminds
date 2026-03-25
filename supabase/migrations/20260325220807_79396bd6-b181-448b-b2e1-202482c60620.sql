
-- Step 1: Make all FK constraints on students deferrable
ALTER TABLE public.daily_plan DROP CONSTRAINT daily_plan_student_id_fkey;
ALTER TABLE public.daily_plan ADD CONSTRAINT daily_plan_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(student_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.check_ins DROP CONSTRAINT check_ins_student_id_fkey;
ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(student_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.profiles DROP CONSTRAINT profiles_student_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(student_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.achievements DROP CONSTRAINT achievements_student_id_fkey;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(student_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.subject_tracks DROP CONSTRAINT subject_tracks_student_id_fkey;
ALTER TABLE public.subject_tracks ADD CONSTRAINT subject_tracks_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(student_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE public.activity_logs DROP CONSTRAINT activity_logs_student_id_fkey;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(student_id) DEFERRABLE INITIALLY DEFERRED;

-- Step 2: Update all student IDs
-- Christian (DOB 2013-12-19) -> CH1312-95039
SET CONSTRAINTS ALL DEFERRED;

UPDATE public.students SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.daily_plan SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.check_ins SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.achievements SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.activity_logs SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.subject_tracks SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.profiles SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.reward_points SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.rewards_catalog SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.point_settings SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.challenges SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.inbox_messages SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.ai_conversations SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.learning_tools SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.co_guardians SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.guardian_invites SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.impersonation_logs SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';
UPDATE public.schedule_templates SET student_id = 'CH1312-95039' WHERE student_id = 'CHRIS';

-- Alex (no DOB, use current 2603) -> AL2603-55880
UPDATE public.students SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.daily_plan SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.check_ins SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.achievements SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.activity_logs SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.subject_tracks SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.profiles SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.reward_points SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.rewards_catalog SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.point_settings SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.challenges SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.inbox_messages SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.ai_conversations SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.learning_tools SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.co_guardians SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.guardian_invites SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.impersonation_logs SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';
UPDATE public.schedule_templates SET student_id = 'AL2603-55880' WHERE student_id = 'ALEX';

-- Aryah (no DOB) -> AR2603-74321
UPDATE public.students SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.daily_plan SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.check_ins SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.achievements SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.activity_logs SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.subject_tracks SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.profiles SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.reward_points SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.rewards_catalog SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.point_settings SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.challenges SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.inbox_messages SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.ai_conversations SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.learning_tools SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.co_guardians SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.guardian_invites SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.impersonation_logs SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';
UPDATE public.schedule_templates SET student_id = 'AR2603-74321' WHERE student_id = 'ARYAH';

-- Notty (no DOB) -> NO2603-49711
UPDATE public.students SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.daily_plan SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.check_ins SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.achievements SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.activity_logs SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.subject_tracks SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.profiles SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.reward_points SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.rewards_catalog SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.point_settings SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.challenges SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.inbox_messages SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.ai_conversations SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.learning_tools SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.co_guardians SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.guardian_invites SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.impersonation_logs SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
UPDATE public.schedule_templates SET student_id = 'NO2603-49711' WHERE student_id = 'NOTTYG';
