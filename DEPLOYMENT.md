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
| `static-dist/` | The untouched build output including `index.html` — used as the Vercel output directory |
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
- security + long-lived asset cache headers preserved from the original config

To rebuild from source instead, run `npm install && npm run build:prod:no-check`
inside `legacy/frontend/` and copy `dist/` over `static-dist/` and
`public/assets/`.
