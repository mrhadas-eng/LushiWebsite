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
| Tests | `test/` |
| Hosting plan, owner steps | `docs/CLOUDFLARE-PLAN.md` |

Every page keeps the exact address it had on Wix, including the Hebrew ones, so search rankings carry over.

## Run it on your computer

Requires Node.js (LTS).

```bash
npm install
npm run dev          # http://localhost:4321 (fast; no /api/lead, so the form shows its error message)
npm run preview:cf   # build + local Cloudflare runtime with /api/lead (http://localhost:8787)
npm test             # Worker tests + checks on the built site (run `npm run build` first)
```

For `preview:cf`, create a git-ignored `.dev.vars` file with a test webhook, e.g.
`CRM_WEBHOOK_URL=https://webhook.site/<your-id>`.

## Images

All images and the font are already copied from Wix into the repository (`public/media`, `public/fonts`; full-size originals in `originals/`, which is never deployed). If an image that still lives on Wix is added later, run the GitHub Action "Copy images from Wix", or `npm run fetch-media` locally.

## Leads and analytics

- **Contact forms** POST each lead as JSON to `/api/lead` (`worker/index.js`). The Worker validates it and forwards it to the CRM webhook, whose URL is the Cloudflare secret `CRM_WEBHOOK_URL` (never in the repo). The visitor goes to `/thankyou` only when the CRM confirms; otherwise the form keeps the input and shows the phone / WhatsApp. Each lead includes the page it was sent from and the visit's source (utm tags, gclid, fbclid, referrer). Contract and payload: `docs/CLOUDFLARE-PLAN.md` and `docs/MIGRATION-REVIEW.md` §7.
- **Analytics** use the Wix site's Google Tag Manager container (`gtmId`), so GA4, Google Ads, the Meta Pixel and Clarity carry over. GTM only loads on hagarlushi.com; add `?gtm=1` to a preview URL to test tags.
- **Lead events** pushed to the dataLayer: `generate_lead`, `whatsapp_click`, `phone_click`, `email_click` (see `src/components/Tracking.astro`).
- **WhatsApp** floating button: `site.whatsapp` in `src/data/content.mjs`.

## Before launch

Run `npm run check-launch`, and work through `LAUNCH.md` (DNS, CRM webhook, GTM triggers).
For an independent review (e.g. ChatGPT), use `docs/MIGRATION-REVIEW.md`, which includes a ready-to-paste prompt.

## Deploy

Cloudflare Workers Builds, connected to this GitHub repo: a push to `main` deploys, and other branches get a preview URL. Build command `npm run build`, deploy command `npx wrangler deploy`. Not connected yet; see `docs/CLOUDFLARE-PLAN.md`, step O3. `npx wrangler deploy --dry-run` validates the config without uploading.
