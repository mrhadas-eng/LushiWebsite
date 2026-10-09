# Notes for AI assistants working on this repository

Static Astro 5 site replacing the Wix site at https://www.hagarlushi.com (Hebrew, RTL), hosted on Firebase Hosting.

- For a pre-launch / DNS-migration review, start with `docs/MIGRATION-REVIEW.md`. It lists every setting, ID, URL, redirect, tracking event and the webhook payload, plus what was verified and what is still open.
- All content and settings: `src/data/content.mjs`. Redirects and headers: `firebase.json`.
- Commands: `npm install`, `npm run build`, `npm run check-launch` (fails while launch blockers remain).
- Do not change page URLs (they match Wix for SEO), the GTM container ID, or the Hebrew text without the owner's approval.
