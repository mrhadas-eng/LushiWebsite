# Notes for AI assistants working on this repository

Static Astro 5 site replacing the Wix site at https://www.hagarlushi.com (Hebrew, RTL).

## Hosting: Cloudflare (decided 2026-10-11)
- **Cloudflare Workers static assets** + **Cloudflare DNS** (free plan). Code tasks C1–C4 are done and tested locally. Deployment (C5/O3) and DNS (O1–O5) need the owner's dashboard access.
- **`docs/CLOUDFLARE-PLAN.md`** has the status, architecture, `/api/lead` contract, owner steps and landing-page scope. Start there for hosting, deployment, redirects, the lead endpoint or DNS.
- Config: `wrangler.jsonc` (keep `html_handling: "drop-trailing-slash"`; it preserves the Wix URLs). Redirects and cache headers: `public/_redirects`, `public/_headers`. Lead endpoint: `worker/index.js`.

## Where things are
- All content and settings: `src/data/content.mjs`.
- Pre-launch / DNS-migration review brief (every setting, ID, URL, redirect, tracking event and the lead payload): `docs/MIGRATION-REVIEW.md`.
- Owner-facing checklist (Hebrew): `LAUNCH.md`.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm test` (after a build), `npm run check-launch`, `npm run preview:cf` (local Cloudflare runtime; needs a git-ignored `.dev.vars`), `npx wrangler deploy --dry-run`.
- Never run `npm run deploy` / `wrangler deploy`, or change DNS, without the owner's explicit approval.

## Rules
- Do not change page URLs (they match Wix for SEO), the GTM container ID (`GTM-KJRR2DNT`), or the Hebrew text without the owner's approval.
- Never commit secrets. The CRM webhook URL goes in a Worker secret (`CRM_WEBHOOK_URL`), not in the repo.
- `lp.hagarlushi.com` is a separate WordPress/Elementor site and is out of scope. Its DNS record must be preserved exactly in any DNS change. Don't replace or redirect it without an approved plan.
- The CRM is out of scope: don't change it. Adapt only `forwardToCrm` in `worker/index.js` to its documented contract.
- The owner communicates in Hebrew and English and isn't a developer: give step-by-step instructions for anything they must do in a dashboard.
