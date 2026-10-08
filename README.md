# hagarlushi.com

Static version of the Hagar Lushi website (previously on Wix), built with [Astro](https://astro.build) and hosted on Firebase Hosting.

## Where things are

| What | Where |
|---|---|
| All text, projects, menu, contact details | `src/data/content.mjs` |
| Project photo galleries (order + sizes) | `src/data/galleries.raw.txt` |
| Images and font (after copying from Wix) | `public/media`, `public/fonts` |
| Page layouts | `src/pages`, `src/components` |
| Colors and fonts | `src/styles/global.css` |
| Hosting settings and old-URL redirects | `firebase.json` |

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

- **Contact forms** post to Web3Forms, which emails hagarlushi@gmail.com. Set `web3formsKey` in `src/data/content.mjs` (free key from <https://web3forms.com>). Until then the form opens the visitor's email app. Each submission includes the page it was sent from and the visit's source (utm tags, gclid, fbclid, referrer).
- **Analytics** use the Wix site's Google Tag Manager container (`gtmId`), so GA4, Google Ads, the Meta Pixel and Clarity carry over. GTM only loads on hagarlushi.com; add `?gtm=1` to a preview URL to test tags.
- **Lead events** pushed to the dataLayer: `generate_lead`, `whatsapp_click`, `phone_click`, `email_click` (see `src/components/Tracking.astro`).
- **WhatsApp** floating button: `site.whatsapp` in `src/data/content.mjs`.

## Before launch

Run `npm run check-launch`, and work through `LAUNCH.md` (DNS, form key, GTM triggers).

## Deploy

```bash
npm run build
firebase deploy --only hosting
```
