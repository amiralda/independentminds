# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Independent Minds EDU — a React 18 + TypeScript + Vite 5 single-page application for homeschool family management. The backend is entirely hosted on Supabase Cloud (no local backend infrastructure required). See `README.md` for full architecture details.

### Package manager

The project uses **bun** (`bun.lock` is the lockfile). Ensure `~/.bun/bin` is on `PATH`. Use `bun install` for dependencies, `bun run <script>` for npm scripts.

### Key commands

| Task | Command |
|---|---|
| Install deps | `bun install` |
| Dev server | `bun run dev` (Vite on port 8080) |
| Lint | `bun run lint` |
| Unit tests | `bun run test` (Vitest, jsdom, no backend needed) |
| Build | `bun run build` |
| E2E tests | `bun run test:e2e` (Playwright, needs browsers installed first via `npx playwright install`) |

### Non-obvious caveats

- The `.env` file at the repo root contains Supabase Cloud credentials (anon key, project URL). These are checked in and point to the hosted backend — no local Supabase setup is needed for normal frontend development.
- ESLint (`bun run lint`) currently reports ~330 pre-existing errors (mostly `@typescript-eslint/no-explicit-any` in edge functions). This is expected — do not try to fix them unless specifically asked.
- The Vite dev server binds to `::` (all interfaces) on port 8080. HMR overlay is disabled in `vite.config.ts`.
- Unit tests run entirely in jsdom with no network calls. They cover auth, i18n, gamification, co-guardian permissions, offline queue, and notification routing.
- E2E tests (Playwright) default to the production URL. To test locally, set `PLAYWRIGHT_BASE_URL=http://localhost:8080`.
- Supabase edge functions live in `supabase/functions/` and are written in Deno/TypeScript. They run on Supabase Cloud, not locally.
- The `bun.lock` is a text-based lockfile (not the binary `bun.lockb` format).
