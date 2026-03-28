
-- Create private backups bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: only service_role can access (no client policies needed)
-- The bucket is private and only edge functions with service_role key write to it
