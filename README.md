# hagarlushi.com

Static version of the Hagar Lushi website (previously on Wix), built with [Astro](https://astro.build) and hosted on **Cloudflare** (Workers static assets + Cloudflare DNS). The code is ready and tested locally; the deployment and DNS steps are in [`docs/CLOUDFLARE-PLAN.md`](docs/CLOUDFLARE-PLAN.md).

## Where things are

| What | Where |
|---|---|
| All text, projects, menu, contact details | `src/data/content.mjs` |
| Project photo galleries (order + sizes) | `src/data/galleries.raw.txt` |
| Images and font (after copying from Wix) | `public/media`, `public/fonts` |
| Page layouts | `src/pages`, `src/components` |
| Colors and fonts | `src/styles/global.css` |
| Old-URL redirects and cache headers | `public/_redirects`, `public/_headers` |
| Cloudflare config | `wrangler.jsonc` |
| Lead endpoint `/api/lead` (forwards to the CRM) | `worker/index.js` |
| Landing pages `lp.hagarlushi.com` (second Worker) | `src/pages/lp`, `src/components/lp`, `src/data/lp.mjs`, `lp-public/`, `wrangler.lp.jsonc` |
| Every old URL and its status | `src/data/url-inventory.mjs`, `docs/LANDING-PAGE-INVENTORY.md` |
| Tests | `test/` |
| Hosting plan, owner steps | `docs/CLOUDFLARE-PLAN.md` |

Every page keeps the exact address it had on Wix, including the Hebrew ones, so search rankings carry over. The landing pages keep their WordPress addresses (with a trailing slash).

`npm run build` builds both sites: `dist/` (www) and `dist-lp/` (lp., split off by `scripts/split-lp.mjs`). In `npm run dev` the landing pages are at `http://localhost:4321/lp/`.

## Run it on your computer

Requires Node.js (LTS).

```bash
npm install
npm run dev          # http://localhost:4321 (fast; no /api/lead, so the form shows its error message)
npm run preview:cf   # build + local Cloudflare runtime with /api/lead (http://localhost:8787)
npm run preview:cf:lp  # same for the landing pages
npm test             # Worker tests + checks on the built site (run `npm run build` first)
```

For `preview:cf`, create a git-ignored `.dev.vars` file pointing at a **mock** server (never the real CRM key):
`CRM_WEBHOOK_URL=http://127.0.0.1:8799/api/leads/webhook` and `LEADS_WEBHOOK_API_KEY=local-test-key`.

## Images

All images and the font are already copied from Wix into the repository (`public/media`, `public/fonts`; full-size originals in `originals/`, which is never deployed). If an image that still lives on Wix is added later, run the GitHub Action "Copy images from Wix", or `npm run fetch-media` locally.

## Leads and analytics

- **Contact forms** POST each lead as JSON to `/api/lead` (`worker/index.js`). The Worker validates it, maps it to OfficeCRM's `website-v1` contract (`lead_source`, `name`, `phone`, `email`, `message`, `context`, landing-page `consent`, and one `submission_id` per enquiry, also sent as `Idempotency-Key`) and sends it with `Authorization: Bearer`. The address and key are the Cloudflare secrets `CRM_WEBHOOK_URL` and `LEADS_WEBHOOK_API_KEY`, never in this public repo. The visitor goes to `/thankyou` only when OfficeCRM replies `success: true`. Otherwise the form keeps the input and shows either a retry message (not saved) or the uncertain-outcome message (the outcome is unknown), with the phone and WhatsApp. Details: `docs/OFFICECRM-INTEGRATION-CONTRACT.md`. Details: `docs/CLOUDFLARE-PLAN.md`.
- **Analytics** use the Wix site's Google Tag Manager container (`gtmId`), so GA4, Google Ads, the Meta Pixel and Clarity carry over. GTM only loads on hagarlushi.com; add `?gtm=1` to a preview URL to test tags.
- **Lead events** pushed to the dataLayer: `generate_lead`, `whatsapp_click`, `phone_click`, `email_click` (see `src/components/Tracking.astro`).
- **WhatsApp** floating button: `site.whatsapp` in `src/data/content.mjs`.

## Before launch

Run `npm run check-launch`, and work through `LAUNCH.md` (DNS, CRM webhook, GTM triggers).
For an independent review (e.g. ChatGPT), use `docs/MIGRATION-REVIEW.md`, which includes a ready-to-paste prompt.

## Deploy

Cloudflare Workers Builds, connected to this GitHub repo: a push to `main` deploys, and other branches get a preview URL. Build command `npm run build`, deploy command `npx wrangler deploy`. The landing pages are a second Workers project (`hagarlushi-lp`, deploy command `npx wrangler deploy -c wrangler.lp.jsonc`). Not connected yet; see `docs/CLOUDFLARE-PLAN.md`, steps O3, O3b and O6. `npx wrangler deploy --dry-run` validates the config without uploading.
