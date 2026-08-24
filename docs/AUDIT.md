# Project Audit — Independent Minds EDU

_Last updated: 2026-07-12_

This document records the results of a project audit covering build/test health,
continuous integration, security posture, dependencies, and configuration. It is
a point-in-time snapshot intended to guide follow-up work; items marked **Fixed
in this PR** were addressed directly, while **Recommendations** are left for the
maintainers to prioritise.

## Summary

| Area | Status |
|---|---|
| Lint (`npm run lint`) | ✅ Clean |
| Build (`npm run build`) | ✅ Succeeds |
| Unit tests (`npm run test`) | ✅ 87/87 passing (16 files) |
| Dependency vulnerabilities (`npm audit`) | ✅ 0 reported |
| CI on `main` | ❌ Failing — root cause identified and fixed (see below) |

## Findings

### 1. CI E2E job crashes at test collection time — **Fixed in this PR**

**Severity:** High (CI on `main` is red on every push).

The Playwright end-to-end helper created a Supabase **admin** client at module
import time:

```ts
// tests/e2e/helpers/supabase.ts (before)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

When `SUPABASE_SERVICE_ROLE_KEY` is not configured, `createClient` throws
`Error: supabaseKey is required.` as soon as the module is imported. Because
three specs import this helper, the error surfaced during Playwright's test
**collection** phase and failed the entire E2E run (all retry attempts) before
any test executed.

The E2E job's skip gate only checked `PLAYWRIGHT_BASE_URL`, so when that secret
was present but the Supabase admin secrets were not, the job ran and failed
instead of skipping.

**Fixes applied:**

- `tests/e2e/helpers/supabase.ts` now initialises the admin client **lazily**
  (on first use) behind a `Proxy`. Importing the module never throws; only tests
  that actually use the admin client fail — with a clear, actionable message —
  when the required environment variables are missing.
- `.github/workflows/test.yml` extends the E2E skip gate to require the full
  secret set (`PLAYWRIGHT_BASE_URL`, `SUPABASE_URL`, and
  `SUPABASE_SERVICE_ROLE_KEY`). If any are absent, the E2E job skips (consistent
  with the workflow's existing "skip when secrets missing" design) rather than
  failing.

### 2. `.env` is committed to version control — **Recommendation**

`.gitignore` already lists `.env*`, yet a `.env` file is tracked in the
repository. It currently contains only the Supabase project URL, project ID, and
the **publishable/anon** key, all of which are public by design in a Vite
frontend (they are embedded in the client bundle). No private secret (e.g. a
service-role key) is exposed.

Even so, committing `.env` contradicts the repository's own ignore rules and is a
poor convention. **Recommendation:** remove `.env` from version control
(`git rm --cached .env`) and have contributors create their own from
`.env.example`. This was intentionally left out of this PR to avoid disrupting
any local/deploy workflow that currently relies on the tracked file; coordinate
the removal with the maintainers.

### 3. Wildcard CORS on Supabase Edge Functions — **Recommendation**

33 edge functions under `supabase/functions/**` respond with
`Access-Control-Allow-Origin: *`. Requests are still authenticated (JWT and/or an
`x-cron-secret` header), so the risk is limited, but tightening the allowed
origin to the known application origin(s) would reduce the browser-exposed attack
surface. Consider centralising CORS handling in `supabase/functions/_shared`.

### 4. TypeScript strictness is disabled — **Recommendation**

`tsconfig.json` / `tsconfig.app.json` disable strictness (`strict: false`,
`noImplicitAny: false`, `strictNullChecks: false`). This weakens type safety and
allows `null`/`undefined` bugs to go undetected at compile time. **Recommendation:**
enable `strict` incrementally (start with `strictNullChecks`) and burn down the
resulting errors over time.

### 5. No `SECURITY.md` / dependency automation — **Recommendation**

There is no security policy file and no Dependabot / renovate configuration.
Adding a `SECURITY.md` (how to report vulnerabilities) and enabling automated
dependency updates would improve the project's security hygiene.

## Notes on tooling

- The committed `package-lock.json` contains eight entries resolved from a
  private build-sandbox proxy (`europe-west4-npm.pkg.dev`) rather than
  `registry.npmjs.org`. GitHub-hosted runners can reach this proxy, so `npm ci`
  succeeds in CI today; however, contributors on networks that cannot reach it
  will need to install against the public registry. Regenerating the lockfile
  against `registry.npmjs.org` would make installs reproducible everywhere. This
  is noted for awareness and not changed here to keep the lockfile diff minimal.
