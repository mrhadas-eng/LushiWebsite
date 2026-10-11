# Notes for AI assistants working on this repository

Static Astro 5 site replacing the Wix site at https://www.hagarlushi.com (Hebrew, RTL).

## Hosting: Cloudflare (decided 2026-10-11)
- **Cloudflare Workers static assets** + **Cloudflare DNS** (free plan). Code tasks C1–C4 are done and tested locally. Deployment (C5/O3) and DNS (O1–O5) need the owner's dashboard access.
- **`docs/CLOUDFLARE-PLAN.md`** has the status, architecture, `/api/lead` contract, owner steps and landing-page scope. Start there for hosting, deployment, redirects, the lead endpoint or DNS.
- Config: `wrangler.jsonc` (keep `html_handling: "drop-trailing-slash"`; it preserves the Wix URLs). Redirects and cache headers: `public/_redirects`, `public/_headers`. Lead endpoint: `worker/index.js`.

## Where things are
- All content and settings: `src/data/content.mjs`.
- Landing pages and URL inventory (every old URL, decisions D1–D8): `docs/LANDING-PAGE-INVENTORY.md`.
- Pre-launch / DNS-migration review brief (every setting, ID, URL, redirect, tracking event and the lead payload): `docs/MIGRATION-REVIEW.md`.
- Owner-facing checklist (Hebrew): `LAUNCH.md`.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm test` (after a build), `npm run check-launch`, `npm run preview:cf` (local Cloudflare runtime; needs a git-ignored `.dev.vars`), `npx wrangler deploy --dry-run`.
- Never run `npm run deploy` / `wrangler deploy`, or change DNS, without the owner's explicit approval.

## Rules
- Do not change page URLs (they match Wix for SEO), the GTM container ID (`GTM-KJRR2DNT`), or the Hebrew text without the owner's approval.
- Never commit secrets (the repo is public). OfficeCRM is reached through two Worker secrets: `CRM_WEBHOOK_URL` (webhook address) and `LEADS_WEBHOOK_API_KEY` (bare key; the Worker sends `Authorization: Bearer <key>`). Neither value may appear in the repo, the built site, docs or logs, and tests enforce this for the address. Tests use mocks only: never send test leads to the live CRM.
- `office.hagarlushi.com` is OfficeCRM: keep its DNS record exactly as is.
- `lp.hagarlushi.com` (WordPress today) is rebuilt in this repo as a second Worker, `hagarlushi-lp`. The source is `src/pages/lp/`, `src/data/lp.mjs`, `wrangler.lp.jsonc`; the build output is `dist-lp/`. Keep its URLs exactly as they are (with a trailing slash), and its tags `GTM-KJRR2DNT` and `GT-TQKZV73G`. Its DNS record (A 69.62.113.1) must be preserved exactly until the owner approves cutover (docs/CLOUDFLARE-PLAN.md O6). Never redirect lp pages to the homepage, and don't switch off WordPress.
- Every old URL is listed in `src/data/url-inventory.mjs` and `docs/LANDING-PAGE-INVENTORY.md`. Tests fail if a page or redirect is added or removed without updating it. Set `approved: true` only after the owner approves.
- OfficeCRM is out of scope: don't change it. The contract (fields `name/phone/email/source`, optional `notes/referrerName`, success = HTTP 2xx + `success: true`) is documented in `docs/CLOUDFLARE-PLAN.md`; the mapping lives in `toCrmPayload` / `leadSource` / `leadNotes` in `worker/index.js`.
- The owner communicates in Hebrew and English and isn't a developer: give step-by-step instructions for anything they must do in a dashboard.
