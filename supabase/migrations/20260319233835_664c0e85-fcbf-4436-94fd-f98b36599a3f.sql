
-- Restrict uploads to email-assets bucket to service_role only
CREATE POLICY "email_assets_service_role_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-assets' AND (SELECT auth.role()) = 'service_role');

CREATE POLICY "email_assets_service_role_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'email-assets' AND (SELECT auth.role()) = 'service_role');

CREATE POLICY "email_assets_service_role_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'email-assets' AND (SELECT auth.role()) = 'service_role');
