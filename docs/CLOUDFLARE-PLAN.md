# Hosting plan: Cloudflare (decided 2026-10-11)

**Decision:** the site will be hosted on **Cloudflare Workers (static assets)**, and the
hagarlushi.com DNS moves from Wix to **Cloudflare DNS**. Both are on the free plan.
**Firebase Hosting is no longer the target.** `firebase.json` stays in the repo only until its
redirects and headers have been moved over (task C2), and is then deleted.

Why Cloudflare rather than Firebase:
- Static asset requests are free and unlimited on Cloudflare. Firebase's free plan caps traffic
  at 360 MB/day, which is too low for a photo-heavy portfolio.
- The DNS has to leave Wix anyway, so the domain, the site and the `lp.hagarlushi.com` record
  end up in one dashboard.
- A Worker can sit in front of the CRM webhook on the free plan, keeping the webhook URL secret
  and filtering spam. On Firebase this needs the paid Blaze plan.
- Every pushed branch gets a preview URL through Workers Builds (GitHub integration).

Why Workers rather than Pages: Cloudflare steers new projects to Workers, and we need a Worker
for `/api/lead` anyway. Pages would also work.

---

## Target architecture

```
browser ──> www.hagarlushi.com (Cloudflare)
              ├─ /api/lead  -> Worker (worker/index.js) -> CRM webhook (secret CRM_WEBHOOK_URL)
              └─ everything else -> static assets from ./dist (Astro build)
hagarlushi.com -> 301 -> https://www.hagarlushi.com (Cloudflare Redirect Rule)
lp.hagarlushi.com -> unchanged WordPress/Elementor host (DNS record copied from Wix)
```

---

## Tasks for Claude (code: do these in order, one PR each where sensible)

### C1. Worker + Wrangler config
- Add `wrangler.jsonc` at the repo root:
  ```jsonc
  {
    "name": "hagarlushi",
    "main": "worker/index.js",
    "compatibility_date": "2026-10-01",
    "assets": {
      "directory": "./dist",
      "binding": "ASSETS",
      "html_handling": "drop-trailing-slash",   // keep Wix URLs: /אודות, never /אודות/
      "not_found_handling": "404-page",          // serves dist/404.html with status 404
      "run_worker_first": ["/api/*"]
    }
  }
  ```
- Add `wrangler` as a devDependency, plus scripts `"preview:cf": "npm run build && wrangler dev"`
  and `"deploy": "npm run build && wrangler deploy"`.
- `html_handling: drop-trailing-slash` is **required**. The default (`auto-trailing-slash`)
  redirects every `/page` to `/page/`, which breaks the Wix-matching URLs and the canonical tags.
- **Done when:** `npx wrangler dev` serves every page at its Wix URL with status 200 and no
  redirect, `/אודות/` returns 307 to `/אודות`, and an unknown URL returns the 404 page with status 404.

### C2. Move redirects and headers out of `firebase.json`
- Create `public/_redirects` (Astro copies it into `dist/`) with every redirect currently in
  `firebase.json`, all 301. Test Hebrew sources both raw and percent-encoded (`%D7…`). If raw
  doesn't match, write the encoded form. `/portfolio-collections/*` becomes a splat rule.
- Create `public/_headers` with the long-cache rules for `/media/*`, `/fonts/*` and `/_astro/*`
  (`Cache-Control: public, max-age=31536000, immutable`).
- Delete `firebase.json`, and update `scripts/check-launch.mjs` to read `public/_redirects` instead.
- **Done when:** every source URL in docs/MIGRATION-REVIEW.md section 5 returns 301 to the right
  target under `wrangler dev`, and `npm run check-launch` passes this check.

### C3. Lead endpoint `/api/lead` (replaces the browser-side webhook call)
- `worker/index.js`:
  - `POST /api/lead` accepts JSON (the payload in docs/MIGRATION-REVIEW.md section 7).
  - It rejects non-POST requests, other origins (allow `https://www.hagarlushi.com` and preview
    hosts), bodies over 10 KB, a missing name/email or an invalid email, and filled honeypot
    `website` fields (answer 200 `{ok:true}` to bots without forwarding).
  - It forwards to `env.CRM_WEBHOOK_URL` in the CRM's expected format (`env.CRM_FORMAT`:
    `json` | `form`).
  - It returns `{ok:true}` or `{ok:false}` with status 502 when the CRM fails.
  - Optional: verify a Cloudflare Turnstile token (`env.TURNSTILE_SECRET`) if spam appears.
  - Every other request goes to `env.ASSETS.fetch(request)`.
- Secrets are set with `wrangler secret put CRM_WEBHOOK_URL`. They are never committed.
- `src/components/ContactForm.astro`: POST same-origin JSON to `/api/lead` (normal CORS, so
  the response is readable). On `ok`, set the `hl_lead` flag and go to `/thankyou`. On an error,
  show the existing phone/WhatsApp message. Keep the honeypot and attribution fields.
- `src/data/content.mjs`: remove `leadWebhook.url/format/mode` (the URL now lives only in the
  Worker secret) and keep `thankYouPath`.
- `scripts/check-launch.mjs`: replace the webhook-URL check with a check that `worker/index.js`
  and `wrangler.jsonc` exist. Document that `CRM_WEBHOOK_URL` must be set as a secret (it can't
  be checked locally).
- **Done when:** under `wrangler dev` with a test webhook (e.g. a webhook.site URL as the secret),
  the home form and the contact form both deliver the payload, land on `/thankyou` and push
  `generate_lead` once. A CRM error shows the error message. A bot submission is not forwarded and
  not counted.

### C4. Update tracking guard and docs
- `src/components/Tracking.astro`: GTM stays restricted to `hagarlushi.com` hostnames, so
  `*.workers.dev` previews are not counted. Only the comment needs updating.
- Update `README.md`, `LAUNCH.md`, `docs/MIGRATION-REVIEW.md` and `AGENTS.md` so they describe the
  finished state, and remove "planned" wording.

### C5. Deploy pipeline
- In the Cloudflare dashboard (owner does this, Claude guides): Workers & Pages → Create →
  Import a repository → `mrhadas-eng/LushiWebsite`.
  - Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
  - Non-production branch deploy command: `npx wrangler versions upload`, which gives a preview URL per branch.
- Production branch: `main`.
- **Done when:** a push to `main` deploys to `hagarlushi.<account>.workers.dev`, and a push to
  another branch gets its own preview URL.

---

## Tasks for the owner (Claude walks through each one)

### O1. Before anything changes
- [ ] Export or screenshot **all** DNS records in Wix (Domains → hagarlushi.com → Manage DNS
      Records): A, AAAA, CNAME (`www`, **`lp`**), MX, TXT (google-site-verification, SPF, DKIM, DMARC).
- [ ] Find out where the domain is **registered**. If it's registered at Wix, check whether Wix allows
      changing nameservers. If not, transfer the domain out (for example to Cloudflare Registrar).
- [ ] Get the CRM webhook URL and the format the CRM expects.

### O2. Cloudflare account and zone
- [ ] Create a free Cloudflare account and add `hagarlushi.com` (Free plan).
- [ ] Compare the records Cloudflare imported with the Wix export, and add anything missing.
  - **MX, mail-related TXT and `lp`: set to "DNS only" (grey cloud).** Proxying `lp` can break the
    WordPress host's SSL. Leave it unproxied unless it's tested.
  - `www` and the apex keep pointing at Wix for now, so the site stays up during the switch.

### O3. Switch nameservers (zero downtime: records are identical, only the DNS provider changes)
- [ ] At the registrar, replace `ns14/ns15.wixdns.net` with the two Cloudflare nameservers.
- [ ] Wait until Cloudflare shows the zone as **Active**.
- [ ] Check that `lp.hagarlushi.com` and email still work.

### O4. Point the site at the Worker
- [ ] Workers → hagarlushi → Settings → Domains & Routes → add custom domain
      `www.hagarlushi.com`. This replaces the Wix `www` record.
- [ ] Apex: keep a proxied DNS record for `hagarlushi.com` (e.g. `AAAA 100::`, proxied) and add a
      **Redirect Rule** from `hagarlushi.com/*` to `https://www.hagarlushi.com/${1}`, 301, keeping
      the query string.
- [ ] Set the secret: Workers → hagarlushi → Settings → Variables and Secrets →
      `CRM_WEBHOOK_URL` (type: Secret).

### O5. After switching
- [ ] Run the post-launch checks in docs/MIGRATION-REVIEW.md section 8.
- [ ] Keep Wix active until everything is verified, then export contacts, form submissions and chats, and cancel.

---

## Limits to keep in mind (free plan)
- Static asset requests: free and unlimited. Worker requests (`/api/lead` only): 100,000/day.
- `_redirects`: 2,000 static + 100 dynamic rules, max 1,000 characters each.
- The site has about 1,360 files in `public/media`. Check the current Workers static-assets file
  limits before adding many more images. The full-size originals in `originals/` are never deployed.
