ALTER TABLE public.beta_task_completions
ADD COLUMN IF NOT EXISTS difficulty_score integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_on_task integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rage_clicks_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS errors_count integer NOT NULL DEFAULT 0;