# Database backup & restore — Independent Minds EDU

> **This repository is public.** No dump, password, connection string or private key
> ever goes into the repo, a commit, a log, a chat or a report. `.gitignore` blocks
> `*.dump`, `*.age`, `*.partial`, `backup-out/`, `age-key*.txt`. Everything below
> uses **names only**, never values.

## 1. How it works

| | |
|---|---|
| Where | GitHub Actions, workflow `.github/workflows/backup.yml` ("Database backup") |
| When | Daily at 06:30 UTC (02:30 EDT / 01:30 EST in Haiti), plus a manual "Run workflow" button |
| What | `pg_dump` **17** (production is PostgreSQL 17.6), custom format, schemas `public`, `auth`, `storage` |
| Encryption | The dump is piped straight into `age -r <public key>`: it is encrypted as it streams, no unencrypted copy is ever written to disk. Public key: `backup/age-recipient.txt` |
| Kept | As a GitHub Actions **artifact** named `ime-db_<UTC timestamp>.dump.age`, **7 days**, then GitHub deletes it |
| Secret | `SUPABASE_DB_URL` (repository secret, set by Dany). **Not set → the run ends green with a "Backup skipped" notice** (no failure email) |
| Logs | Public (public repo). `backup/backup.sh` never prints the connection string, host, user or password — error messages are cleaned first |

Because the repo is public, anyone signed in to GitHub can download the artifact
file — but it is age-encrypted: only the **private key** (kept by Dany, never in
git) can read it.

Tables the database role cannot read (Supabase feature tables such as `auth.mfa_*`,
`storage.s3_*`) are excluded automatically and listed in the run log, instead of
making the whole backup fail.

### What the backup does NOT contain

| Not in the dump | How to get it back |
|---|---|
| Storage **files** (student photos in bucket `student-photos`) — only their metadata | Re-upload |
| Vault secret `cron_secret` | Re-create by hand (same value as the Edge Function secret `CRON_SECRET`) |
| Supabase-managed schemas (`cron`, `net`, `realtime`, `extensions`, `vault`, `supabase_migrations`…) | Re-run the migrations (they are in git; they also recreate the cron jobs) |
| Edge Functions and their secrets | Code is in git; secret **names** in §5 |
| Auth dashboard settings, Vercel env vars, Stripe/Resend/DNS settings | §5 |

## 2. One-time setup (Dany)

1. **Private key.** It was generated on 2026-10-11 and saved on Dany's PC, outside the
   repo: `%USERPROFILE%\.ime-backup\age-key-2026-10-11.txt` (readable by your Windows
   account only). Copy the **whole file content** (the `AGE-SECRET-KEY-…` line) into
   your password manager — without it, no backup can ever be read. Also add it as the
   GitHub secret `AGE_PRIVATE_KEY` if you want it there (no workflow uses it today;
   GitHub never shows a secret again, so the password manager copy is the one you
   restore with). Never paste it in a chat, an email or a commit.
2. **Connection string.** Supabase Dashboard → project → **Connect** → **Session
   pooler** → URI (port 5432), with the database password filled in (if the password
   has special characters such as `@`, `#`, `/`, write them URL-encoded).
   Use the *session pooler*, not the direct connection: GitHub runners have no IPv6
   and the direct host is IPv6-only. Do not use the transaction pooler (port 6543):
   `pg_dump` needs a session.
3. **GitHub secret.** GitHub → repository → **Settings → Secrets and variables →
   Actions → New repository secret** → name `SUPABASE_DB_URL`, value = the URI from
   step 2.
4. **First run.** GitHub → **Actions → Database backup → Run workflow**. The run must
   end green with "Backup OK: ime-db_….dump.age (… bytes)" in its summary and an
   artifact at the bottom of the run page.
5. **First restore test** (§3) with that artifact — a backup is only proven once it
   has been restored.

Note: GitHub turns off scheduled workflows in a public repository after 60 days
without any commit. If the repo is quiet for two months, re-enable the workflow
(Actions → Database backup → Enable workflow).

## 3. Restore test on your own computer (never production)

Needs: `age` (installed with winget), the PostgreSQL 17 client tools (`pg_restore`,
`psql`), Docker Desktop. Work in a temporary folder **outside the repo**.

1. **Download.** GitHub → Actions → Database backup → the run you want → **Artifacts**
   → download, unzip → `ime-db_<timestamp>.dump.age`.
2. **Decrypt:**
   ```
   age -d -i "%USERPROFILE%\.ime-backup\age-key-2026-10-11.txt" -o restore.dump ime-db_<timestamp>.dump.age
   ```
   (or `-i` pointing at a file where you pasted the key from your password manager).
3. **Look inside** (no database needed):
   ```
   pg_restore --list restore.dump
   ```
   You should see the tables of `public`, `auth` and `storage`.
4. **Throwaway database:**
   ```
   docker run -d --name ime-restore -e POSTGRES_PASSWORD=restoretest -p 54329:5432 postgres:17
   ```
   Wait ~5 seconds, then create what Supabase normally provides:
   ```
   psql "postgresql://postgres:restoretest@localhost:54329/postgres" -c "create role anon nologin; create role authenticated nologin; create role service_role nologin; create role supabase_auth_admin nologin; create role supabase_storage_admin nologin; create schema extensions; create extension pgcrypto schema extensions; create extension \"uuid-ossp\" schema extensions;"
   ```
5. **Restore:**
   ```
   pg_restore --no-owner --no-privileges -d "postgresql://postgres:restoretest@localhost:54329/postgres" restore.dump
   ```
   A few errors about Supabase-only objects (e.g. extensions, `cron`, `net`, `vault`)
   are expected on a plain Postgres; the tables and rows are what matter.
6. **Count rows** and compare with production (Supabase SQL Editor, same queries):
   ```
   psql "postgresql://postgres:restoretest@localhost:54329/postgres" -c "select (select count(*) from auth.users) users, (select count(*) from public.profiles) profiles, (select count(*) from public.students) students, (select count(*) from public.daily_plan) plans, (select count(*) from public.subscriptions) subs;"
   ```
7. **Clean up — always:**
   ```
   docker rm -f ime-restore
   del restore.dump ime-db_<timestamp>.dump.age
   ```

## 4. Real disaster: rebuild on a NEW Supabase project

1. **New project**, PostgreSQL 17, same region if possible. Note its project ref.
2. **Schema:** apply every file of `supabase/migrations/` in order (`supabase link
   --project-ref <new ref>` then `supabase db push`, or each file in the SQL Editor).
   This recreates tables, functions, RLS policies, triggers and cron jobs.
3. **Vault:** recreate `cron_secret` with the same value as the Edge Function secret
   `CRON_SECRET`.
4. **Data.** Decrypt the chosen backup (§3 steps 1–2), then turn it into a data-only
   SQL file and load it **with every trigger switched off**:
   ```
   pg_restore --data-only --no-owner --no-privileges -n auth -n public -n storage -f data.sql restore.dump
   psql --single-transaction -v ON_ERROR_STOP=1 -c "SET session_replication_role = replica" -f data.sql -d "<new project session pooler URI>"
   ```
   **Why `session_replication_role = replica` is mandatory:** without it, inserting
   the restored users and roles fires the project's triggers — `handle_new_user`
   (duplicate profiles) and the **welcome-email triggers, which would email every
   restored user**. With it, no trigger and no foreign-key check runs during the load.
   `--single-transaction` + `ON_ERROR_STOP`: if anything fails, nothing is kept. If it
   stops on a *duplicate key* in a table the migrations pre-filled, empty that table in
   the new project and run the `psql` line again.
   Then delete `data.sql` and `restore.dump`.
5. **Storage files:** re-upload the bucket contents.
6. **Edge Functions:** deploy the functions listed in `OPERATIONAL_MANUAL_v4.md` §18
   and set their secrets (§5).
7. **Auth settings, Vercel env vars, Stripe/Resend webhooks:** re-enter (§5), point
   `VITE_SUPABASE_*` at the new project, redeploy Vercel.
8. **Backup:** update the GitHub secret `SUPABASE_DB_URL` to the new project.
9. **Check:** sign in with a test account; compare row counts (§3 step 6).

## 5. Not in the backup — names to re-create (values live in your password manager)

**Edge Function secrets:** `RESEND_API_KEY`, `CRON_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY`, `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `ADMIN_WHATSAPP_NUMBER`,
`BETA_ADMIN_EMAIL`, `MONITOR_DOMAIN`, `MONITOR_CANONICAL_DOMAIN`.
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.)

**Vault:** `cron_secret`.

**Auth settings (Supabase → Authentication):** Site URL
(`https://www.independentmindsedu.org`), Redirect URLs allowlist, email confirmation,
password rules, SMTP settings, Google provider if re-enabled.

**Vercel env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`, `VITE_SITE_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`.

**GitHub secrets:** `SUPABASE_DB_URL` (and `AGE_PRIVATE_KEY` if you stored it there).

**Outside Supabase:** Stripe webhook endpoint URL, Resend domain (DNS), Cloudflare
DNS / Email Routing.

## 6. Changing the key

`age-keygen -o "%USERPROFILE%\.ime-backup\age-key-<date>.txt"`, put the new
`age1…` public key in `backup/age-recipient.txt` (commit), store the new private key
as in §2. Keep the old private key until the last backup made with it has expired
(7 days).
