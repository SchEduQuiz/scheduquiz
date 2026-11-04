# EduQuiz Platform — deployment layout

The uploaded package is served **from its existing production build**. Nothing
in the legacy app is installed or compiled at deploy time, so there is no
install step that can break the deployment.

## What lives where

| Path | Purpose |
| --- | --- |
| `public/assets/*` | The shipped production bundle (JS + CSS), served as static files by this app |
| `src/components/spa-host.tsx` | Renders `<div id="root">` and loads the built entry chunk after hydration |
| `src/routes/index.tsx` | Home page (`/`) |
| `src/routes/$.tsx` | Catch-all SPA fallback so every client-side route (`/login`, `/courses`, `/dashboard`, ...) serves the same shell and the app's own React Router takes over |
| `static-dist/` | The synchronized patched build output including `index.html` — used as the Vercel output directory |
| `legacy/frontend/` | Full original source (React + Vite + Tailwind), kept for reference and future rebuilds |
| `supabase-legacy/` | Original Supabase migrations and Edge Functions, preserved as-is |

## Fixes applied for deployment safety

- **Missing Tailwind config**: the package shipped no `tailwind.config.js` /
  `postcss.config.js`, so `dist/assets/index-*.css` still contained raw
  `@tailwind` directives and the app rendered unstyled. Both configs were added
  under `legacy/frontend/` and the stylesheet was compiled and written back to
  the served bundle.
- **Service worker**: `sw.js` was cache-first for *all* requests, including
  navigations, which permanently pinned a stale app shell. Navigation requests
  are now network-first with a cache fallback.
- **Secrets**: the bundled `frontend/.env` (Supabase + Google/Gemini AI keys)
  was removed and replaced with `legacy/frontend/.env.example`. Rotate those
  keys, they were shipped in the archive.

## Vercel

The root `vercel.json` deploys the prebuilt output with no install/build step:

- `installCommand` / `buildCommand`: no-ops
- `outputDirectory`: `static-dist`
- `rewrites`: everything except static assets falls back to `/index.html`
- security headers preserved; asset responses revalidate because patches reuse the imported asset filenames

To rebuild from source instead, run `npm install && npm run build:prod:no-check`
inside `legacy/frontend/` and copy `dist/` over `static-dist/` and
`public/assets/`.

## Authenticated services

The static Vercel output does not execute TanStack server routes. Account
management, password-reset administration and quiz services depend on the
corresponding server routes being published on `https://scheduquiz.lovable.app`.
The imported client forwards bearer-authenticated account requests there when
running outside Lovable or localhost. Never replace these privileged operations
with browser-side admin credentials or profile-only updates.

Publish the Lovable server changes before checking those operations from Vercel.
Cross-site production reachability and password recovery email delivery still
require verification; local tests do not establish either.

## Question contract audit and verification

### Baseline and scope

The reported crash was reproduced in Chromium using the actual shipped
QuestionManager with an isolated legacy-shaped response. Database inspection
found 10 lesson questions with JSON-string options and 60 seeded challenge
questions. The original 10 tests passed despite the crash. Scope: repair the
shared option/answer contract, generation/editor persistence, service-origin
selection and install-event handling without changing student records.

### Changes

- The shared lesson-question decoder handles native arrays, JSON-string arrays,
  string options and object options; malformed values produce a visible load
  error rather than a render exception. Correct answers are retained when editing.
- Generated and manually saved lesson questions now write native JSON arrays.
  The generation service uses stored lesson content and validates answer/option
  consistency before returning questions; course-teacher/admin checks remain.
- The exact shared decoder is embedded in both shipped bundles and parity is
  regression-tested. Quiz clients and admin transport use one service-origin selector.
- Question mode changes reload the list; reorder failures no longer silently succeed.
- Install events no longer suppress the browser banner. Custom installation
  reads `userChoice`; service-worker registration is refused in local/preview contexts.
- Vercel asset headers revalidate the patched fixed-name bundles.
- Future-dated quiz attempts are not considered resumable.

### Evidence

- `bun test tools/`: **17 passed, 0 failed**, including decoder parity, correct
  answer preservation, malformed data rejection, service routing/body preservation,
  question table restrictions, read failures, account safeguards and resume rules.
- `node --check public/assets/index-Wviw5V5-.js` and the equivalent
  `static-dist` command: both passed. Deployment bundles are identical.
- Automatic preview validation: latest entry reports **build OK**. An intermediate
  TypeScript return-type error was corrected and the subsequent check passed.
- Chromium controlled workflow: list loaded, correct answer restored as B,
  edited option saved as a native array, reloaded list displayed the changed text
  and retained the correct-option marker; **no page errors**. Install event
  `defaultPrevented` was false. This used mocked persistence, not a real account.
- Local signed-out admin reset statistics and quiz start both returned **401**.
- `bun audit`: reported **25 vulnerabilities (1 critical, 14 high, 9 moderate,
  1 low)** across the installed dependency graph. This is a failing security
  readiness gate, despite the command exiting successfully. Findings include
  dev tooling and transitive packages; production exploitability was not assessed.
  No broad dependency upgrade was applied without compatibility verification.
- Database read-only policy review: lesson writes require the course teacher or
  `has_role` admin; challenge attempts/responses are owner-readable. No migration
  or student-data mutation was executed in this audit.
- Failed browser attempts: stale service-worker interception initially prevented
  test exports loading; blocking workers isolated the test. A wrong editor selector
  was replaced by the actual shipped button selector. The final workflow passed.

### Outstanding readiness work

This is **not an enterprise-production certification**. Authenticated real-student
save/resume/submit, teacher CRUD/generation, reset delivery, message receipt and
cross-site production flows remain unverified: the external Supabase project has
no available managed test session. Publication was not requested or performed.

Audit findings still needing complete implementations and verification:

- Quiz start/resume disclose correct answers; assessment delivery and client feedback
  must be redesigned together before claiming answer secrecy.
- Quiz finalization currently claims completion before all response/score writes
  finish; a transactional, idempotent finalization contract is needed.
- Gamification ignores some persistence errors and caps aggregation at 500 attempts;
  analytics helpers similarly cap results or mask errors. They are not verified
  enterprise-scale totals.
- System Settings remains unavailable; its read policy still references the profile
  compatibility role rather than the centralized authorization table.
- Admin bulk changes/reset approval lack transactional outcome guarantees under
  partial failure/concurrency; real-account integration coverage is outstanding.
- Question-management REST adapters and repeated authentication/CORS definitions
  remain consolidation work. Wildcard CORS is not authorization; bearer checks remain.
- The existing production app-shell worker can retain patched assets in its cache;
  HTTP revalidation does not invalidate those browser-held entries. A PWA cleanup or
  guarded generated-worker migration must be validated with returning installed users.
- Source-to-static release generation, dependency remediation/security scanning, load tests,
  operational monitoring, backup/restore and the earlier database security warnings
  have not been fully verified in this audit.
