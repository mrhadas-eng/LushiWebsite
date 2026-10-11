# hagarlushi.com

Static version of the Hagar Lushi website (previously on Wix), built with [Astro](https://astro.build), to be hosted on **Cloudflare** (Workers static assets + Cloudflare DNS). The migration plan is in [`docs/CLOUDFLARE-PLAN.md`](docs/CLOUDFLARE-PLAN.md).

## Where things are

| What | Where |
|---|---|
| All text, projects, menu, contact details | `src/data/content.mjs` |
| Project photo galleries (order + sizes) | `src/data/galleries.raw.txt` |
| Images and font (after copying from Wix) | `public/media`, `public/fonts` |
| Page layouts | `src/pages`, `src/components` |
| Colors and fonts | `src/styles/global.css` |
| Old-URL redirects and cache headers | `firebase.json` for now; moving to `public/_redirects` and `public/_headers` (plan task C2) |
| Hosting plan and task list | `docs/CLOUDFLARE-PLAN.md` |

Every page keeps the exact address it had on Wix, including the Hebrew ones, so search rankings carry over.

## Run it on your computer

Requires Node.js (LTS).

```bash
npm install
npm run dev        # open http://localhost:4321
```

## Copy the images off Wix (once)

Images still load from Wix until they are copied into the repository. Either:

- **On GitHub:** Actions tab → "Copy images from Wix" → Run workflow, or
- **On your computer:** `npm run fetch-media`, then commit `public/media` and `public/fonts`.

## Leads and analytics

- **Contact forms** POST each lead to the CRM webhook in `site.leadWebhook` (`src/data/content.mjs`), then redirect to `/thankyou`. Until the URL is set, the form opens the visitor's email app. Each lead includes the page it was sent from and the visit's source (utm tags, gclid, fbclid, referrer). Payload and options: `docs/MIGRATION-REVIEW.md`, section 7. **Planned change (task C3):** the form will post to a same-site Cloudflare Worker endpoint, `/api/lead`, which forwards to the CRM. The webhook URL then lives only in a Worker secret and is no longer visible in the page.
- **Analytics** use the Wix site's Google Tag Manager container (`gtmId`), so GA4, Google Ads, the Meta Pixel and Clarity carry over. GTM only loads on hagarlushi.com; add `?gtm=1` to a preview URL to test tags.
- **Lead events** pushed to the dataLayer: `generate_lead`, `whatsapp_click`, `phone_click`, `email_click` (see `src/components/Tracking.astro`).
- **WhatsApp** floating button: `site.whatsapp` in `src/data/content.mjs`.

## Before launch

Run `npm run check-launch`, and work through `LAUNCH.md` (DNS, CRM webhook, GTM triggers).
For an independent review (e.g. ChatGPT), use `docs/MIGRATION-REVIEW.md`, which includes a ready-to-paste prompt.

## Deploy

Cloudflare Workers Builds, connected to this GitHub repo: a push to `main` deploys the live site, and other branches get a preview URL. Not set up yet; see `docs/CLOUDFLARE-PLAN.md`, tasks C1 and C5.
