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
| C3 Lead endpoint → OfficeCRM | ✅ `website-v1` implemented and tested against a fake CRM (2026-10-14). ⏳ Real local end-to-end test with OfficeCRM's emulators (test plan), then the O3 test lead | `POST /api/lead` translates to the OfficeCRM contract (Bearer auth, `name/phone/email/source/notes`) and succeeds only on `success: true`. `npm test`: 41 tests including a mock OfficeCRM server. Browser test on the local Cloudflare runtime with a mock OfficeCRM: 40/40 checks, desktop and mobile |
| C4 Docs + tracking guard | ✅ Done | GTM loads only on `hagarlushi.com` hosts (verified: not requested on the local host) |
| C5 Deploy pipeline | ⏳ Owner (dashboard) | See O3 below |
| C6 Landing pages (`lp.`) rebuilt | ✅ Done (code). ⏳ Preview + acceptance (O6); open: D5 (privacy policy, pending the owner's review on the preview), D8 (text approval) | Second Worker `hagarlushi-lp` (`wrangler.lp.jsonc`, `dist-lp/`). All 7 WordPress pages at their exact URLs, same copy/images/layout, forms → `/api/lead`. `npm test` 59/59; browser 66/66 (desktop + mobile, mock OfficeCRM); `wrangler deploy -c wrangler.lp.jsonc --dry-run` valid (258 assets). Full URL list and decisions: **docs/LANDING-PAGE-INVENTORY.md** |

---

## Architecture

```
browser ──> www.hagarlushi.com (Cloudflare)
              ├─ POST /api/lead -> Worker (worker/index.js) -> CRM webhook (secret CRM_WEBHOOK_URL)
              └─ everything else -> static assets from ./dist (Astro build), _redirects, _headers
hagarlushi.com -> 301 -> https://www.hagarlushi.com   (Cloudflare Redirect Rule)
lp.hagarlushi.com -> today: WordPress (A 69.62.113.1, copied exactly at the nameserver switch)
                     after acceptance (O6): Worker hagarlushi-lp
              ├─ POST /api/lead -> the same worker/index.js -> OfficeCRM (its own copy of the two secrets)
              └─ everything else -> static assets from ./dist-lp, lp-public/_redirects, _headers
office.hagarlushi.com -> OfficeCRM, never changed
```

One `npm run build` produces both sites: Astro builds `src/pages/**` (www) and `src/pages/lp/**`, then
`scripts/split-lp.mjs` moves the landing pages to `dist-lp/` (at the root) with their images (`lp-media/`), so nothing
from lp. is served on www and vice versa. In `npm run dev` the landing pages are at `http://localhost:4321/lp/…`.

### Files
| File | Purpose |
|---|---|
| `wrangler.lp.jsonc` | Worker `hagarlushi-lp`: `assets.directory ./dist-lp`, `html_handling: force-trailing-slash` (keeps the WordPress URLs, e.g. `/architecture/`), same Worker code and 404 handling. No secrets |
| `src/pages/lp/`, `src/components/lp/`, `src/layouts/LpBase.astro`, `src/data/lp.mjs` | The landing pages; all content in `lp.mjs` |
| `lp-public/_redirects`, `lp-public/_headers` | WordPress-only URLs → 301; cache rules for lp |
| `src/data/url-inventory.mjs` | Every old URL and its status (checked by `test/inventory.test.mjs` and `check-launch`) |
| `wrangler.jsonc` | Worker name `hagarlushi`, `assets.directory ./dist`, `html_handling: drop-trailing-slash` (keeps Wix URLs), `not_found_handling: 404-page`, `run_worker_first: ["/api/*"]`. No secrets |
| `worker/index.js` | `/api/lead`: validates, translates to OfficeCRM and forwards. Everything else goes straight to the static assets |
| `src/lib/lead-client.js` | Browser side: send, and redirect / count only after confirmation |
| `public/_redirects`, `public/_headers` | Old Wix URLs → 301, and cache rules (copied into `dist/` by Astro) |
| `test/worker.test.mjs`, `test/lead-client.test.mjs`, `test/site.test.mjs` | `npm test` |
| `.dev.vars` (git-ignored, create locally) | Local secrets for `wrangler dev`, pointing at a **mock** server: `CRM_WEBHOOK_URL=http://127.0.0.1:8799/api/leads/webhook` and `LEADS_WEBHOOK_API_KEY=local-test-key` |

### Commands
| Command | What it does |
|---|---|
| `npm run dev` | Astro dev server (fast; **no** `/api/lead`, so the form shows its error message) |
| `npm run preview:cf` | Build + run on the local Cloudflare runtime, with `/api/lead` (needs `.dev.vars`) |
| `npm test` | Worker unit tests + checks on the built site (run `npm run build` first) |
| `npm run check-launch` | Repository launch checks + list of manual dashboard checks |
| `npx wrangler deploy --dry-run` | Validates the Cloudflare config without uploading |
| `npm run preview:cf:lp` | Same for the landing pages (`wrangler dev -c wrangler.lp.jsonc`) |
| `npx wrangler deploy -c wrangler.lp.jsonc --dry-run` | Validates the landing-page Worker |
| `npm run deploy` / `npm run deploy:lp` | Build + deploy www / lp. **Only with the owner's approval** |

### Lead endpoint (`POST /api/lead`) → OfficeCRM

**Browser → Worker.** The forms send their fields to `/api/lead`: `full_name, phone, email, message (www), consent (lp), form, page_path`, attribution fields, plus `submission_id` and `submitted_at` added by `submitLead()`. The Worker accepts
only same-origin `POST` (`Origin` equals the Worker's own origin; `Sec-Fetch-Site` same-origin),
`Content-Type: application/json`, body ≤ 10 KB.

**Validation:**
- name, phone and email are required.
- The phone must be a valid Israeli number, or a `+` country code from abroad; formatting is ignored. Empty and invalid phone are separate errors (`missing_phone`, `invalid_phone`).
- `form` must be one of the six form ids.
- `submission_id` must be a UUID.
- `page_path` must start with `/`, with no query string.
- Length limits per field (OfficeCRM's: name 200, phone 40, email 254, message 5,000).
- Landing-page forms must also send `consent: "yes"`, else 400 `missing_consent`.

If the honeypot field `website` is filled, the Worker replies `{ok:true}` and sends **nothing**.

**Worker → OfficeCRM: contract `website-v1`** (confirmed by the OfficeCRM workstream, branch `website-lead-contract-v2`, commit `76b99cc`; details and status in `docs/OFFICECRM-INTEGRATION-CONTRACT.md`):
```
POST <CRM_WEBHOOK_URL>
Content-Type: application/json
Accept: application/json
Authorization: Bearer <LEADS_WEBHOOK_API_KEY>
Idempotency-Key: <submission_id>
```
```json
{
  "contract": "website-v1",
  "submission_id": "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c",
  "lead_source": "lp-architecture",
  "name": "ישראל ישראלי",
  "phone": "050-1234567",
  "email": "test@example.com",
  "context": { "site": "lp.hagarlushi.com", "page_url": "https://lp.hagarlushi.com/architecture/",
               "form_name": "lp-architecture", "submitted_at": "2026-10-14T09:00:00.000Z",
               "landing_page": "/architecture/", "utm_source": "google", "utm_medium": "cpc", "gclid": "abc123" },
  "consent": { "given": true, "text": "קראתי ומאשר/ת את מדיניות הפרטיות",
               "policy_url": "https://lp.hagarlushi.com/privacy/", "given_at": "2026-10-14T09:00:00.000Z" }
}
```
| Field | Filled from |
|---|---|
| `lead_source` | The form id only (`home`→`website-home`, `contact`→`website-contact`, `lp-*` unchanged). Never from the URL or campaign data. OfficeCRM maps it to `Website – General Enquiry` / `Landing Page – General Enquiry` / `Architecture` / `Interior Design` / `Renovation` |
| `name`, `phone`, `email` | The form, as typed |
| `message` | The visitor's message (main-site forms), omitted when empty |
| `context` | `site` and `page_url` (origin + path, no query string) from the Worker's own origin; `form_name` = `lead_source`; `submitted_at` from the browser, kept with the submission ID; landing page, referrer, UTMs, gclid/fbclid when present |
| `consent` | Landing-page forms only: `given: true`, the exact displayed wording (`CONSENT_TEXT` in `src/lib/lead-rules.js`), the site's `/privacy/` URL, and `given_at` = submission time |
| `submission_id` / `Idempotency-Key` | One UUID per enquiry, reused on every resend until OfficeCRM confirms it, then cleared (`currentSubmission()` in `src/lib/lead-client.js`) |
| `source`, `notes`, `referrerName` | **Not sent** |

**Success rule** (updated 2026-10-13). The Worker replies `{ok:true}` only when OfficeCRM answers **HTTP 2xx with JSON `success: true`**
(real OfficeCRM: 200 `{"success":true,"leadId":"…","message":"Lead created successfully"}`, sent after the lead is written).
Every other answer is classified:
- **Not saved:** OfficeCRM 400/401/403/404/405/415/422/503 → 502 `crm_rejected` / `not_saved` → retry message.
- **Unknown:** 500 or other 5xx, a timeout (**20 s**, provisional), a dropped connection, malformed or unconfirmed JSON → 502 `crm_uncertain` / `unknown` → the owner-approved uncertain message, which does not invite a resubmit. OfficeCRM can store a lead and then answer 500.

Missing or invalid secrets, or a non-https URL, give 503 (`not_configured`) and nothing is sent. The thank-you page and
`generate_lead` happen **only** after `{ok:true}`. Logs contain only the `leadId` or a reason code, the outcome and the response time in ms;
never lead data, the URL or the key.

### Secrets (Cloudflare → Workers → hagarlushi **and** hagarlushi-lp → Settings → Variables and Secrets)
Each Worker has its own secrets: set the same two values on both.
| Name | Type | Value format |
|---|---|---|
| `CRM_WEBHOOK_URL` | **Secret** | The full OfficeCRM leads-webhook address: `https://<OfficeCRM host>/api/leads/webhook` |
| `LEADS_WEBHOOK_API_KEY` | **Secret** | The **same value** as `LEADS_WEBHOOK_API_KEY` in OfficeCRM. Only the key itself, no `Bearer ` in front (the Worker adds it; a pasted `Bearer ` prefix is stripped) |

Never put either value in the repository, `wrangler.jsonc`, chat, email or a screenshot. The repository is public.
Locally, `npm run preview:cf` reads them from `.dev.vars` (git-ignored). Use a **mock** server and a fake key there, never the production key.
`npm test` and `npm run check-launch` fail if the webhook address appears in any committed file or in the built site.

### OfficeCRM contract status (2026-10-13)
**Not compatible yet.** The OfficeCRM code report shows that OfficeCRM ignores `source` (it derives the category from `page_url`),
drops `notes` (so the visitor's message and the consent text are lost), never returns 400, can return 500 after saving,
and has no duplicate protection. The owner decided that OfficeCRM changes come first:
- an explicit website and renovation category
- the message stored visibly
- consent recorded
- validation
- idempotency
- safe errors
- webhook security

See `docs/OFFICECRM-INTEGRATION-CONTRACT.md`, `docs/OFFICECRM-CHANGE-REQUEST.md` and `docs/OFFICECRM-INTEGRATION-TEST-PLAN.md`.
The payload below is today's and will change to the confirmed contract. The first real test is local (Firebase emulators + `wrangler dev`), before any O3 test lead.

---

## Owner tasks (dashboard access needed; Claude walks through each one)

### O1. Before anything changes (no risk)
1. **Export the whole Wix DNS zone.** Wix → Domains → hagarlushi.com → ⋯ → Manage DNS Records.
   Screenshot or copy **every** row: A, AAAA, CNAME, MX, TXT, SRV.
   - Email: **MX** rows, and TXT rows starting `v=spf1` (SPF), names containing `_domainkey` (DKIM), and `_dmarc` (DMARC).
   - **`lp`**: the exact type (A or CNAME) and value. The landing page depends on it.
   - **`office`**: OfficeCRM runs on `office.hagarlushi.com`. Its record must be copied exactly, or OfficeCRM and the website's lead delivery stop working.
   - Verification TXT rows (`google-site-verification=…`, Microsoft/Bing, Meta).
2. **Find the registrar:** Wix → Domains. If the domain was bought at Wix, check whether "Change nameservers"
   is offered. If not, the domain has to be transferred out first (e.g. to Cloudflare Registrar; it takes a few days,
   and the domain must be more than 60 days past registration or last transfer).
3. **OfficeCRM:** have the `LEADS_WEBHOOK_API_KEY` value ready (from Secret Manager, project `jassign`) for O3. The CRM changes in `docs/OFFICECRM-CHANGE-REQUEST.md` must be live first.

### O2. Create the Cloudflare zone (no risk: nothing changes until the nameservers change)
1. Create a free Cloudflare account → Add a domain → `hagarlushi.com` → Free plan.
2. Cloudflare imports records automatically. **Compare every row with the O1 export** and add anything missing.
3. **Delete the imported `en` and `he` records** (unused; Wix error pages). Keep `office` exactly as exported.
4. Set these to **DNS only (grey cloud)**: MX targets, mail-related records, `lp` and `office`. Proxying them can break
   their hosts' SSL, so only proxy them later, after testing.
5. Leave `www` and the apex pointing at Wix for now, so the live site doesn't change.

### O3. Deploy and verify the new site on Cloudflare's preview address (before touching DNS)
1. Workers & Pages → Create → **Import a repository** → GitHub → `mrhadas-eng/LushiWebsite`.
   - Project/Worker name: `hagarlushi`. Production branch: `main`.
   - Build command: `npm run build`. Deploy command: `npx wrangler deploy`.
   - Non-production branch deploy command: `npx wrangler versions upload`, which gives a preview URL per branch.
2. **Add the two secrets** (exact names and formats in "Secrets" above):
   Workers & Pages → **hagarlushi** → **Settings** → **Variables and Secrets** → **+ Add** →
   Type **Secret** → Variable name `CRM_WEBHOOK_URL` → value → **Deploy**. Repeat for `LEADS_WEBHOOK_API_KEY`.
   Copy the key directly from OfficeCRM into this field; don't paste it anywhere else.
   (Alternative in a terminal: `npx wrangler secret put LEADS_WEBHOOK_API_KEY`, which prompts for the value, so it stays out of shell history.)
   Secrets belong to the Worker and are used by its preview versions too.
3. **Send and verify a test lead** on the preview address (`https://hagarlushi.<account>.workers.dev`, or the branch's preview URL):
   1. Open the address with a campaign tag, e.g. `…workers.dev/?utm_source=test&utm_campaign=migration`.
   2. Fill the **home page** form with clearly marked test data: name `בדיקה – אתר חדש`, your own phone and email,
      message `בדיקת חיבור לאתר החדש – למחוק`. Send. Expected: the thank-you page appears.
   3. In **OfficeCRM**, find the new lead. Check:
      - name, phone and email are correct
      - the category is `Website – General Enquiry`
      - the message is shown on the lead
      - the page and `utm_campaign=migration` are in its submission context
   4. Repeat from the **contact page** (`/יצירת-קשר`): same category, with its own message.
   5. Optional log check: Workers → hagarlushi → **Logs** → each test should show `lead: created in OfficeCRM (leadId …, submission …)`
      with the same lead number OfficeCRM shows.
   6. If the form shows a red message instead, the logs show the reason:
      - `http_401`: wrong key
      - `http_400`: a field OfficeCRM didn't accept
      - `not_confirmed`: OfficeCRM replied without `success: true`
      - `not_configured`: a secret is missing
      - `unknown`: timeout or 5xx. **Do not resend from another tab**; check OfficeCRM first.
   7. Delete the test leads in OfficeCRM.
4. Click through the pages on the preview address, including a few old Wix URLs from docs/MIGRATION-REVIEW.md §5.

### O3b. Deploy the landing pages to a preview address (WordPress stays live)
1. Workers & Pages → Create → **Import a repository** → `mrhadas-eng/LushiWebsite` again, as a second project.
   - Name: `hagarlushi-lp`. Build command: `npm run build`. Deploy command: `npx wrangler deploy -c wrangler.lp.jsonc`.
   - Non-production branch deploy command: `npx wrangler versions upload -c wrangler.lp.jsonc`.
2. Add the same two secrets to **hagarlushi-lp** (steps as in O3.2).
3. On `https://hagarlushi-lp.<account>.workers.dev/architecture/?utm_source=test&utm_campaign=lp-migration`, send one
   clearly marked test lead (name `בדיקה – דף נחיתה`), with the privacy box ticked. Expected: `/thankyou/` appears. In OfficeCRM the category is `Architecture`, and the lead shows the consent record (given, wording, privacy URL, time) and the submission context.
   Repeat for `/` (`Landing Page – General Enquiry`), `/interior-design/` (`Interior Design`) and `/renovation/` (`Renovation`). Delete the test leads.
4. Compare each page side by side with the WordPress page on a phone and a computer.

### O4. Switch nameservers (zero downtime: records are identical, only the DNS provider changes)
1. At the registrar, replace `ns14.wixdns.net` / `ns15.wixdns.net` with the two Cloudflare nameservers.
2. Wait until Cloudflare shows the zone as **Active** (minutes to hours).
3. Check that `lp.hagarlushi.com` and OfficeCRM (`office.hagarlushi.com`) load, that email arrives and that the old site still loads.

### O5. Point the domain at the Worker
1. Workers → hagarlushi → Settings → Domains & Routes → **Add Custom Domain** → `www.hagarlushi.com`.
   This replaces the `www` record that pointed at Wix.
2. Apex `hagarlushi.com`: DNS → add `AAAA` `@` `100::` **Proxied** (placeholder), then Rules → **Redirect Rules** →
   "Redirect from root to WWW" template (or custom: hostname equals `hagarlushi.com` →
   `https://www.hagarlushi.com${http.request.uri.path}`, 301, preserve query string).
3. Run the post-launch checks in docs/MIGRATION-REVIEW.md §8.
4. Keep Wix active until everything is verified, then export contacts, form submissions and chats, and cancel.

---

### O6. Move `lp.hagarlushi.com` to the new Worker (only after acceptance)
Preconditions, all required: O3b passed for all 4 forms; the owner has reviewed the privacy policy on the preview site (D5) (docs/LANDING-PAGE-INVENTORY.md §7); the WordPress form actions checked in WordPress admin (Elementor → Submissions /
form "Actions After Submit"); the Google Ads conversion checked in GTM preview on the workers.dev address.
1. Workers → hagarlushi-lp → Settings → Domains & Routes → **Add Custom Domain** → `lp.hagarlushi.com`.
   This replaces the `lp` A record (69.62.113.1).
2. Check the 7 URLs, send one real test lead, check the Ads conversion in Google Ads (it can take hours).
3. Rollback: remove the custom domain and re-add `A lp 69.62.113.1` (DNS only). Keep WordPress running for at least a month.

## DNS: proposed changes (documentation only; nothing has been changed)
See docs/LANDING-PAGE-INVENTORY.md §6 for the record-by-record table. In short: copy every record exactly at the
nameserver switch (O4), including `lp` (A 69.62.113.1) and **`office` (A 35.219.200.106, never changed)**; then `www` and the
apex move to Worker `hagarlushi` (O5); `lp` moves to Worker `hagarlushi-lp` only after O6's preconditions;
`en`/`he` are unused (owner confirmed): **don't copy them into Cloudflare** (or delete them after the import). Nothing changes in live DNS until the cutover.

## Limits (free plan)
- Static asset requests: free and unlimited. Worker requests (only `/api/lead`, both Workers together): 100,000/day.
- `_redirects`: 2,000 static + 100 dynamic rules. The site has about 1,420 deployed files; full-size originals in `originals/` are never deployed.
