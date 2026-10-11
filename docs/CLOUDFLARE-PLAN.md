# Hosting plan: Cloudflare (decided 2026-10-11)

**Decision:** the site is hosted on **Cloudflare Workers (static assets)**, and the hagarlushi.com DNS
moves from Wix to **Cloudflare DNS**, both on the free plan. Firebase Hosting was dropped and
`firebase.json` has been removed.

Why Cloudflare: static asset requests are free and unlimited (Firebase's free plan caps traffic at
360 MB/day); the domain, site and `lp.hagarlushi.com` record live in one dashboard; a Worker keeps the
CRM webhook URL secret on the free plan; every branch gets a preview URL.

## Status (2026-10-11)

| Task | Status | Evidence |
|---|---|---|
| C1 Worker + config | ✅ Done | `wrangler.jsonc`, `worker/index.js`. `npx wrangler deploy --dry-run` succeeds (1,421 assets, 5 KB Worker). Under `wrangler dev` all 25 pages return 200 at their Wix URLs, `/אודות/` returns 307 to `/אודות`, and unknown URLs return the 404 page with status 404 |
| C2 Redirects + headers | ✅ Done | `public/_redirects` (16 rules) and `public/_headers`. All 16 redirects verified under `wrangler dev` with Hebrew sources. Images and fonts send `max-age=31536000, immutable`; HTML sends `must-revalidate` |
| C3 Lead endpoint | ✅ Done (code). ⏳ Live CRM test pending | `POST /api/lead`, 12 unit tests (`npm test`), and a browser test against a mock CRM: success, CRM 500, CRM 200 with `success:false`, bot, invalid input, desktop and mobile |
| C4 Docs + tracking guard | ✅ Done | GTM loads only on `hagarlushi.com` hosts (verified: not requested on the local host) |
| C5 Deploy pipeline | ⏳ Owner (dashboard) | See O3 below |

---

## Architecture

```
browser ──> www.hagarlushi.com (Cloudflare)
              ├─ POST /api/lead -> Worker (worker/index.js) -> CRM webhook (secret CRM_WEBHOOK_URL)
              └─ everything else -> static assets from ./dist (Astro build), _redirects, _headers
hagarlushi.com -> 301 -> https://www.hagarlushi.com   (Cloudflare Redirect Rule)
lp.hagarlushi.com -> unchanged WordPress/Elementor host (DNS record copied exactly from Wix)
```

### Files
| File | Purpose |
|---|---|
| `wrangler.jsonc` | Worker name `hagarlushi`, `assets.directory ./dist`, `html_handling: drop-trailing-slash` (keeps Wix URLs), `not_found_handling: 404-page`, `run_worker_first: ["/api/*"]`, var `CRM_FORMAT` |
| `worker/index.js` | `/api/lead` endpoint. Everything else goes straight to the static assets |
| `public/_redirects`, `public/_headers` | Old Wix URLs → 301, and cache rules (copied into `dist/` by Astro) |
| `test/worker.test.mjs`, `test/site.test.mjs` | `npm test` |
| `.dev.vars` (git-ignored, create locally) | Secrets for `wrangler dev`, e.g. `CRM_WEBHOOK_URL=https://webhook.site/...` |

### Commands
| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server (fast; **no** `/api/lead`, so the form shows its error message) |
| `npm run preview:cf` | Build + run on the local Cloudflare runtime, with `/api/lead` (needs `.dev.vars`) |
| `npm test` | Worker unit tests + checks on the built site (run `npm run build` first) |
| `npm run check-launch` | Repository launch checks + list of manual dashboard checks |
| `npx wrangler deploy --dry-run` | Validates the Cloudflare config without uploading |
| `npm run deploy` | Build + deploy to Cloudflare. **Only with the owner's approval** |

### Lead endpoint contract (`POST /api/lead`)
- Accepts only: same-origin `POST` (the `Origin` header equals the Worker's own origin, `Sec-Fetch-Site` same-origin),
  `Content-Type: application/json`, body ≤ 10 KB.
- Validation: email required and valid; name or phone required; phone `[0-9+()-. ]{7,40}`; `form` is
  `home` or `contact`; only known fields are forwarded (list in `worker/index.js`); length limits per field.
- Honeypot `website` filled → replies `{ok:true}` and forwards **nothing** (the browser also skips the conversion).
- Forwards to `CRM_WEBHOOK_URL` as JSON (or `application/x-www-form-urlencoded` when `CRM_FORMAT=form`),
  with optional header from `CRM_AUTH_HEADER` (`"Name: value"`), timeout 10 s.
- Replies `{ok:true}` **only** if the CRM answers 2xx and the body isn't an explicit failure
  (`success:false`, `ok:false` or `status:"error"`). Otherwise it replies 502 (`crm_rejected` / `crm_unreachable`),
  or 503 (`not_configured`) when the secret is missing.
- Logs only status codes, never lead data or the webhook URL.
- The browser goes to `/thankyou` (where `generate_lead` fires once) only after `{ok:true}`. On failure it keeps
  the typed data and shows the phone / WhatsApp alternatives, so a lead is never silently dropped.

**Still needed from the CRM owner to verify the contract** (the CRM itself isn't changed):
1. The webhook URL.
2. Whether it expects JSON or form encoding, and its field names. If they differ from the payload in
   docs/MIGRATION-REVIEW.md §7, a field mapping goes into `forwardToCrm`.
3. The authentication method (header name and value, or a token in the URL).
4. What it returns on success and on failure (status code and body), to confirm the success rule above.

---

## Owner tasks (dashboard access needed; Claude walks through each one)

### O1. Before anything changes (no risk)
1. **Export the whole Wix DNS zone.** Wix → Domains → hagarlushi.com → ⋯ → Manage DNS Records.
   Screenshot or copy **every** row: A, AAAA, CNAME, MX, TXT, SRV.
   - Email: **MX** rows, and TXT rows starting `v=spf1` (SPF), names containing `_domainkey` (DKIM), and `_dmarc` (DMARC).
   - **`lp`**: the exact type (A or CNAME) and value. The landing page depends on it.
   - Verification TXT rows (`google-site-verification=…`, Microsoft/Bing, Meta).
2. **Find the registrar:** Wix → Domains. If the domain was bought at Wix, check whether "Change nameservers"
   is offered. If not, the domain has to be transferred out first (e.g. to Cloudflare Registrar; it takes a few days,
   and the domain must be more than 60 days past registration or last transfer).
3. **CRM contract:** the 4 items listed above.

### O2. Create the Cloudflare zone (no risk: nothing changes until the nameservers change)
1. Create a free Cloudflare account → Add a domain → `hagarlushi.com` → Free plan.
2. Cloudflare imports records automatically. **Compare every row with the O1 export** and add anything missing.
3. Set these to **DNS only (grey cloud)**: MX targets, mail-related records, and `lp`. Proxying `lp` can break the
   WordPress host's SSL, so only proxy it later, after testing.
4. Leave `www` and the apex pointing at Wix for now, so the live site doesn't change.

### O3. Deploy and verify the new site on Cloudflare's preview address (before touching DNS)
1. Workers & Pages → Create → **Import a repository** → GitHub → `mrhadas-eng/LushiWebsite`.
   - Project/Worker name: `hagarlushi`. Production branch: `main`.
   - Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
   - Non-production branch deploy command: `npx wrangler versions upload`, which gives a preview URL per branch.
2. Workers → hagarlushi → Settings → **Variables and Secrets** → add `CRM_WEBHOOK_URL` (type **Secret**),
   plus `CRM_AUTH_HEADER` if the CRM needs one. If the CRM wants form encoding, change `CRM_FORMAT` in `wrangler.jsonc`.
3. Open `https://hagarlushi.<account>.workers.dev`, click through the pages and **send a test lead from both forms**.
   Confirm the leads appear in the CRM with their source.

### O4. Switch nameservers (zero downtime: records are identical, only the DNS provider changes)
1. At the registrar, replace `ns14.wixdns.net` / `ns15.wixdns.net` with the two Cloudflare nameservers.
2. Wait until Cloudflare shows the zone as **Active** (minutes to hours).
3. Check that `lp.hagarlushi.com` loads, that email arrives and that the old site still loads.

### O5. Point the domain at the Worker
1. Workers → hagarlushi → Settings → Domains & Routes → **Add Custom Domain** → `www.hagarlushi.com`.
   This replaces the `www` record that pointed at Wix.
2. Apex `hagarlushi.com`: DNS → add `AAAA` `@` `100::` **Proxied** (placeholder), then Rules → **Redirect Rules** →
   "Redirect from root to WWW" template (or custom: hostname equals `hagarlushi.com` →
   `https://www.hagarlushi.com${http.request.uri.path}`, 301, preserve query string).
3. Run the post-launch checks in docs/MIGRATION-REVIEW.md §8.
4. Keep Wix active until everything is verified, then export contacts, form submissions and chats, and cancel.

---

## Landing pages (`lp.hagarlushi.com`): out of scope for this migration

Nothing in this repository builds, replaces or redirects the landing page. It stays on its WordPress/Elementor
host, and the only requirement here is to **copy its DNS record exactly** (O1, O2). Migrating it would be a
separate project needing the owner's decision. What we know about it (checked 2026-10-08):

- URLs: `https://lp.hagarlushi.com/` and the thank-you page `https://lp.hagarlushi.com/thankyou/`. The Google Ads
  conversion (`AW-16872313549`, label `-2jHCIbIu50aEM2lrO0-`) fires **only** on that thank-you URL.
- Lead capture: an Elementor form "תאמו שיחת ייעוץ" (name, phone, email, privacy-policy consent checkbox), and a
  WhatsApp popup that asks for name and phone first. Where these leads go (email/CRM) is configured inside WordPress and
  isn't visible from outside.
- Tracking: the same GTM container; GA4 and Clarity are blocked there by a GTM rule, and the Meta Pixel fires.
- It has its own privacy policy page.

If it's ever migrated: rebuild it as an Astro page in this repo with the same form fields and consent, post to `/api/lead`
with `form: "lp"`, keep the URL `lp.hagarlushi.com/thankyou/` (or update the Ads conversion trigger first), test on a
preview address, and only then repoint the `lp` DNS record.

## Limits (free plan)
- Static asset requests: free and unlimited. Worker requests (only `/api/lead`): 100,000/day.
- `_redirects`: 2,000 static + 100 dynamic rules. The site has about 1,420 deployed files; full-size originals in `originals/` are never deployed.
