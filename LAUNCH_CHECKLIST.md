# Launch Checklist

Use this checklist before publishing the Independent Minds EDU app to production.

## Pre-Launch

- [ ] All required environment variables are set for production.
- [ ] Lovable Cloud / backend is enabled and configured.
- [ ] Supabase Edge Functions are deployed and healthy.
- [ ] Database migrations are applied and RLS is enabled on all new tables.
- [ ] Auth providers (Google OAuth) are configured and the redirect URI matches the production origin.
- [ ] Email domain and templates are verified.
- [ ] PWA manifest, icons, and service worker are in place.
- [ ] End-to-end and unit tests pass in CI.
- [ ] Critical user paths are smoke-tested on the preview deployment.

## Publish

- [ ] Click **Publish** in the Lovable editor.
- [ ] Wait for the build to complete.
- [ ] Confirm the published URL loads without errors.
- [ ] Verify deep links / client-side routes refresh correctly.
- [ ] Run a final login → dashboard → logout flow on the live domain.

## Post-Launch

- [ ] Monitor error tracking and edge function logs for 24 hours.
- [ ] Verify real-time features (inbox, Supabase realtime subscriptions).
- [ ] Spot-check scheduled jobs (morning reminders, hourly monitor, weekly badge).

---

## Troubleshooting

### Dist upload fails due to S3 throttling

During the publish step, the build output (`dist/`) is uploaded to S3. If you see an error like the one below, the upload was throttled by S3 for that object:

```
dist upload failed: dist upload exit 1: upload failed: dist/pwa-icon-192.png to s3://previews/<project-id>/<build-id>/pwa-icon-192.png An error occurred (ServiceUnavailable) when calling the PutObject operation: Reduce your concurrent request rate for the same object.
```

This is a transient S3 rate-limit from the hosting uploader, not an error in the application code.

#### What to do

1. **Retry the build** — make any trivial edit, or click **Update** in the publish dialog to re-trigger the upload. Throttled uploads usually succeed on retry.
2. **If the failure repeats**, contact Lovable support with the exact log lines from the build output.

#### Exact log lines to share with support

Copy the following fields from the build log and include them in your support request:

| Field | Description |
| --- | --- |
| **Request ID** | `x-amz-request-id` / `x-amz-id-2` from the S3 response headers |
| **Object key** | Full S3 path, e.g. `s3://previews/<project-id>/<build-id>/pwa-icon-192.png` |
| **Retry count** | Number of retry attempts shown for the failed upload (if visible in the build log) |
| **Timestamp** | Time the failure occurred (UTC) |
| **Build ID** | The build identifier embedded in the S3 path (e.g. `<build-id>`) |

Example support snippet:

```text
S3 upload throttling
Request ID: 1A2B3C4D5E6F7890
x-amz-id-2: example-amz-id-2-value
Object key: s3://previews/bfd23272-641f-4f36-97a3-5beaaba5f786/59ec4dd9/pwa-icon-192.png
Retry count: 3
Timestamp: 2026-07-03T12:34:56Z
Build ID: 59ec4dd9
Error: ServiceUnavailable — Reduce your concurrent request rate for the same object.
```

Support can use the request ID and object key to correlate the failure on the S3 side and investigate the upload concurrency for that build.
