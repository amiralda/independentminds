# Dyagnostik Supabase — 27% Failure Rate (2026-08-30)

**Estati:** Dyagnostik sèlman. Okenn korije pa aplike. Tout done sòti nan kòmand lekti sèlman (`query_logs`, `execute_sql` SELECT, `get_advisors`, `list_tables`) sou pwojè `gyvjcwuwfwrwwwnuwlex`.

**Kontèks orijinal:** Dashboard Supabase te montre ~27% failure rate sou yon fenèt 60 minit (12 erè API Gateway, 6 warning + 2 erè Storage, 7 erè Postgres). Dyagnostik la revele fenèt reyèl erè yo pi laj: soti **2026-08-29 20:43 UTC** rive **2026-08-30 18:34 UTC** (~22h), sou yon sèl itilizatè otantifye (`auth_user = ae29fe11-98f4-4c72-9ce5-4e3a2c53c122`), pa bot ni trafik anonim.

**Konklizyon prensipal:** Okenn nan erè yo se konsekans travay Stripe billing la — tab `stripe_customers`/`subscriptions` pa parèt nan okenn erè. Yo se 4 bug distenk ki egziste endepandamman.

---

## 1. Rezime pa severite

| # | Sevrite | Deskripsyon | Okirans | Aktif kounye a? |
|---|---|---|---|---|
| 1 | 🔴 KRITIK | RLS infinite recursion sou `user_roles` | 32 | Wi, dènye a 18:30:25 |
| 2 | 🔴 KRITIK (silans) | Cron notifikasyon paran yo kraze (pg_net + URL malfòme) | 3/22h (1/jou/job) | Wi, chak jou depi kreyasyon |
| 3 | 🟡 MODERE | Mismatch kolòn frontend↔DB (42703) | ~470 | Wi, depann de itilizasyon paj yo |
| 4 | 🟡 MODERE | Tab ki pa egziste ditou (PGRST205) | ~320 | Wi, depann de itilizasyon paj yo |
| 5 | ⚪ NEGLIJAB | `search_path` mutable sou `has_role`/`handle_new_user` | N/A (advisory) | Wi, deja swiv nan CLAUDE.md |
| 6 | ⚪ NEGLIJAB | Bri nòmal Postgres (checkpoint, logical decoding, 1 disconnect) | ~40 | N/A — nòmal |
| 7 | ⚪ ENKONKLIZIF | "Storage warnings/errors" itilizatè a te wè nan dashboard | 0 jwenn | Pa repwodwi nan fenèt 24h ki disponib la |
| 8 | ⚪ PRE-EGZISTAN | `auth_leaked_password_protection` disabled | N/A (advisory) | Wi, san rapò ak pik erè a |

---

## 2. Detay pa kategori

### 🔴 #1 — RLS infinite recursion sou `public.user_roles`

**Erè:** `42P17 infinite recursion detected in policy for relation "user_roles"` → HTTP 500 sou `GET /rest/v1/user_roles?select=role&user_id=eq...`

**Kòz rasin (konfime via `pg_policies`):**
```sql
-- Politik "admin manages roles" (cmd: ALL)
EXISTS (
  SELECT 1 FROM user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
)
```
Politik la sou `user_roles` ap kite yon `SELECT` sou `user_roles` menm — chak evalyasyon deklanche yon lòt evalyasyon, san fen.

**Enpak:** Chak apèl ki verifye wòl yon itilizatè (has_role RPC, chèk admin, gating UI) ka echwe ak 500. Sa lye dirèkteman ak dènye commit la (`fix: correct has_role RPC parameter names in useAdminAuth`, `64a9cc5`) — fonksyon `has_role()` egziste kòm `SECURITY DEFINER` (ki ta dwe bypass RLS), men politik `user_roles` a li menm poko konvèti pou l itilize li.

**Rekòmandasyon:** Ranplase `EXISTS (SELECT 1 FROM user_roles ur WHERE ...)` nan politik la ak yon apèl `has_role(auth.uid(), 'admin')` (fonksyon SECURITY DEFINER a deja egziste, li jis pa itilize kounye a nan politik sa a).

---

### 🔴 #2 — Cron jobs notifikasyon paran yo kraze

**Erè Postgres:** `schema "net" does not exist` (3 okirans nan fenèt 22h la — youn pou chak nan 3 job ki gen orè chak jou).

**Kòz rasin #1 — Extension manke:** `pg_net` pa enstale sou pwojè a, men 4 pg_cron job rele `net.http_post(...)`:

| Job | Orè | Pwoblèm URL |
|---|---|---|
| `morning-reminder-job` | `0 13 * * *` (chak jou 13h) | `https://METE_ID_PWOJE_W_LA.supabase.co/...` — placeholder pa janm ranpli |
| `checkin-reminder-job` | `0 18 * * *` (chak jou 18h) | Menm placeholder |
| `daily-report-job` | `0 23 * * *` (chak jou 23h) | Menm placeholder |
| `weekly-badge-job` | `0 1 * * 1` (chak lendi 1h) | `https://gyvjcwuwfwrwwwnuwlex/...` — manke `.supabase.co` |

**Kòz rasin #2 — URL kraze:** Menm si `pg_net` te enstale, 2 job yo gen yon **placeholder literal ki pa janm ranpli** (`METE_ID_PWOJE_W_LA` — tradiksyon Kreyòl pou "PUT_PROJECT_ID_HERE"), ak `weekly-badge-job` gen yon hostname malfòme.

**Nòt sekirite segondè:** `Authorization: Bearer <REDACTED: retired secret, removed from cron.job on 2026-08-30>` se yon sekrè kòd an tèks klè dirèkteman nan kòmand `cron.job` la (vizib pou nenpòt moun ki gen aksè SQL/dashboard). Pa yon vyolasyon règ "no hardcoded secrets" nan sans strik (se pa yon fichye kòd sous ki commited), men li ta pi sekirize si l te pase pa Supabase Vault olye l ekri an tèks klè.

**Enpak:** 4 fonksyonalite notifikasyon paran (reminder maten, reminder check-in, rapò chak jou, badge chak semèn) **pa janm mache**, depi yo te kreye — echèk la pa vizib nan UI paske se cron backend, sèlman postgres_logs montre l.

**Rekòmandasyon:** (1) `CREATE EXTENSION IF NOT EXISTS pg_net;`, (2) ranplase 4 URL yo ak vrè hostname `gyvjcwuwfwrwwwnuwlex.supabase.co`, (3) deplase Bearer token a nan Vault/secret olye tèks klè nan `cron.job.command`.

---

### 🟡 #3 — Mismatch kolòn frontend ↔ DB (`42703 undefined_column`)

Total ~470 okirans, 2026-08-29 20:43 → 2026-08-30 18:34, tout sou menm sesyon itilizatè a.

| Tab | Kolòn frontend mande | Kolòn ki egziste vrèman nan DB | Okirans |
|---|---|---|---|
| `profiles` | `username`, `role`, `student_id`, `onboarding_complete` | `display_name`, `preferred_language`, `language_pref`, `adult_confirmed`, `onboarding_step`, `telegram_chat_id` | 191 |
| `beta_testers` | `first_login_shown`, `points_earned`, `current_level` | `tasks_total`, `tasks_completed`, `tasks_abandoned`, `session_count`, `recording_consent`, `beta_phase` | 101 |
| `messages_log` | `timestamp` (order/select), `type` (filter) | `sent_at`, `message_type` | 73 + 73 |
| `students` | `student_id` (kòm kolòn), `grade_level`, `updated_at` | PK se `id`; pa gen `grade_level`; gen `created_at` sèlman | 3 |
| `check_ins` | `timestamp`, `need_help` | `checked_in_at`, `help_needed` | 2 |
| `reward_redemptions` | `created_at` (order) | `requested_at`, `approved_at` | 1 |

**Analiz:** Modèl sa a (yon melanj kolòn ki sanble ak yon lòt vèsyon/deziyon schema — pa egzanp `role`+`student_id` sou `profiles` olye `user_roles`+`students`) sijere kòd frontend ki te ekri kont yon ansyen oswa yon lòt vèsyon schema a, epi DB a te evolye san frontend la pa t suiv (oswa vis-vèrsa: fonksyonalite ki poko fin bati kòte DB a).

**Rekòmandasyon:** Idantifye ki paj/dashboard nan frontend la ki fè kèt sa yo (sanble se yon dashboard admin/beta-tester), epi deside si se frontend la ki pou korije (itilize bon non kolòn) oswa DB a ki manke migration.

---

### 🟡 #4 — Tab ki pa egziste ditou (`PGRST205`)

Total ~320 okirans, menm fenèt tan ak #3, menm itilizatè.

| Tab mande | Konfime pa egziste (via `list_tables`) | Okirans |
|---|---|---|
| `platform_errors` | Wi | 281 |
| `educators` | Wi | 32 |
| `admin_notifications` | Wi | 5 |
| `activity_logs` | Wi | ~16 |
| `user_feedback` | Wi | 1 |

Sa se yon vyolasyon schema cache pa — tab yo pa egziste ditou nan `public` schema. Swa se fonksyonalite planifye ki pa janm gen migration kreye pou li, swa se restan kòd Lovable/ansyen ke T1 (Remove Lovable remnants) pa t atrape paske se referans nan requête, pa nan fichye kòd estatik.

**Rekòmandasyon:** Menm apwòch ak #3 — idantifye orijin apèl yo nan frontend, deside si tab yo dwe kreye oswa referans yo dwe retire.

---

### ⚪ #5 — `search_path` mutable (deja swiv, poko fini)

Konfime via `get_advisors` (security) + `pg_proc.proconfig`:

| Fonksyon | `SECURITY DEFINER` | `search_path` fikse? |
|---|---|---|
| `has_role` | Wi | ❌ Non (`proconfig: null`) |
| `handle_new_user` | Wi | ❌ Non (`proconfig: null`) |
| `rls_auto_enable` | Wi | ✅ Wi (`search_path=pg_catalog`) |

Sa se 2/3 nan atik "Stripe live-mode gate" checklist nan `CLAUDE.md` ki toujou poko fè. Pa yon nouvo dekouvèt — jis konfimasyon eta egzat la.

`get_advisors` te montre tou 2 lòt advisory ki gen rapò: `handle_new_user`, `has_role`, ak `rls_auto_enable` yo tout 3 kapab egzekite pa wòl `anon` ak `authenticated` kòm fonksyon `SECURITY DEFINER` — sa vle di nenpòt moun ki pa otantifye ka rele yo via `/rest/v1/rpc/...`. Sa ka entansyonèl (egzanp `handle_new_user` dwe rele pandan siyati), men vo verifye.

---

### ⚪ #6 — Bri nòmal Postgres

Checkpoint logs (~22), logical decoding/replication slot startup (~9), 1 sèl "could not receive data from client: Connection reset by peer" (deconnexion nòmal kliyan). Sa se operasyon estanda Postgres/Supabase, pa reprezante okenn pwoblèm.

---

### ⚪ #7 — "Storage warnings/errors" pa repwodui

Rechèch nan `storage_logs` pou 24h ki disponib la (limit API a) sèlman montre 4 antre, tout se `GET 200` sou `/tenants/gyvjcwuwfwrwwwnuwlex[/health]` — health-check mgmt-api entèn, pa okenn erè reyèl. Pa t gen okenn rekèt `/storage/v1/*` ki echwe nan fenèt sa a.

**Enkonklizif:** Sa pa vle di pwoblèm nan pa egziste — API `query_logs` la limite a 24h, epi "6 warning + 2 erè" itilizatè a te wè yo ka soti nan yon fenèt ki deja pase 24h lè mwen te fè rechèch la, oswa dashboard Supabase a ka montre yon lòt kalite metrik (egzanp bandwidth/kota) anba tit "Storage". **Rekòmande:** tcheke dashboard Supabase → Logs → Storage dirèkteman pou konfime egzak lè/mesaj yo.

---

### ⚪ #8 — Advisory pre-egzistan san rapò

`auth_leaked_password_protection` disabled (Supabase Auth pa tcheke modpas kont HaveIBeenPwned.org). Deja te parèt nan odit anvan yo, san rapò ak pik erè aktyèl la.

---

## 3. Rekòmandasyon final, klase pa priyorite

1. **[Kritik, fix rapid]** Refè politik RLS `"admin manages roles"` sou `user_roles` pou l itilize `has_role(auth.uid(), 'admin')` olye l gade tèt li.
2. **[Kritik, konsekans silansye]** Enstale `pg_net`, korije 4 URL cron jobs yo (2 placeholder, 1 hostname malfòme), deplase Bearer token nan Vault.
3. **[Modere]** Detèmine orijin frontend pou mismatch kolòn yo (#3) ak tab ki manke yo (#4) — deside si se frontend oswa DB ki dwe chanje.
4. **[Deja swiv]** Fini `search_path` fix sou `has_role` ak `handle_new_user` (2 dènye nan checklist Stripe live-mode a).
5. **[Verifikasyon]** Tcheke dashboard Storage logs dirèkteman pou konfime/enfime #7.

---

*Dokiman sa a se yon rapò dyagnostik. Wè `docs/ACTIVITY_LOG.md` (antre 2026-08-30 "Diagnose ~27% Supabase failure rate") pou istorik travay ki mennen nan dyagnostik sa a.*
