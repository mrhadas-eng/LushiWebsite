# Notes for AI assistants working on this repository

Static Astro 5 site replacing the Wix site at https://www.hagarlushi.com (Hebrew, RTL).

## Hosting: Cloudflare (decided 2026-10-11)
- Target: **Cloudflare Workers static assets** + **Cloudflare DNS** (free plan). Firebase Hosting is no longer the target.
- The step-by-step migration plan, with tasks for Claude (C1–C5) and for the owner (O1–O5) and acceptance criteria for each, is in **`docs/CLOUDFLARE-PLAN.md`**. Start there when working on hosting, deployment, redirects, the lead endpoint or DNS.
- Until task C2 is done, the redirect and cache rules still live in `firebase.json`. That file is the source to port, not a deployment target.

## Where things are
- All content and settings: `src/data/content.mjs`.
- Pre-launch / DNS-migration review brief (every setting, ID, URL, redirect, tracking event and the lead payload): `docs/MIGRATION-REVIEW.md`.
- Owner-facing checklist (Hebrew): `LAUNCH.md`.
- Commands: `npm install`, `npm run dev`, `npm run build`, `npm run check-launch` (fails while launch blockers remain).

## Rules
- Do not change page URLs (they match Wix for SEO), the GTM container ID (`GTM-KJRR2DNT`), or the Hebrew text without the owner's approval.
- Never commit secrets. The CRM webhook URL goes in a Worker secret (`CRM_WEBHOOK_URL`), not in the repo.
- `lp.hagarlushi.com` is a separate WordPress/Elementor site. Its DNS record must be preserved exactly in any DNS change.
- The owner communicates in Hebrew and English and isn't a developer: give step-by-step instructions for anything they must do in a dashboard.
