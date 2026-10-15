# Hagar Lushi Website Launch Checklist

**Last reviewed:** 2026-10-15  
**Website repo:** `mrhadas-eng/LushiWebsite`, branch `cloudflare-migration`  
**OfficeCRM repo:** `mrhadas-eng/OfficeCRM`, target branch `dev`  
**Launch rule:** No production deployment, DNS/nameserver change, or custom-domain cutover without explicit owner approval. Keep `office.hagarlushi.com` unchanged. Keep Wix/WordPress available until their replacements are verified.

Legend: `[x]` verified complete; `[ ]` open; `[?]` not yet verified. Do not mark complete based on code alone when a live test is required.

## Current status

- [x] OfficeCRM website lead deduplication PR #2 merged to `dev` on 2026-10-15 (merge commit `fb4e4c0b2aea0b0618ad9936c8ee3604a686c9f1`).
- [x] Reported OfficeCRM tests: 183 unit tests, TypeScript clean, isolated emulator suite 17/17 across three runs. GitHub PR checks were not configured/reported; do not describe these as CI results.
- [x] Local direct CRM webhook synthetic duplicate test returned `duplicate: true`, `outcome: replay`, and the same lead ID.
- [x] Website `npm run check-launch` executed on 2026-10-15: repository/configuration checks passed except one intentional launch blocker, owner review of copied landing-page privacy policy at `/privacy/`. The script reports 12 out-of-scope Wix redirects awaiting approval as non-blocking; check active campaigns before approving the three old landing-page redirects.
- [ ] Verify OfficeCRM's merged `dev` version is actually deployed to the production Firebase App Hosting backend. A Git merge does not prove deployment.
- [ ] Complete real HTTP end-to-end test from the website Cloudflare Worker through OfficeCRM.
- [ ] Resolve and verify Cloudflare Worker secret configuration. Earlier local `.dev.vars` output showed a malformed Markdown-style `CRM_WEBHOOK_URL`; do not trust the website-to-CRM test until verified.
- [ ] Complete owner/legal review of the landing-page privacy policy.
- [ ] Check WordPress/Elementor form delivery settings before moving `lp`.
- [ ] Export and compare the Wix DNS zone, preserve mail records and `office`, and verify the Cloudflare zone.
- [ ] Owner approval of any production deploy or DNS change remains outstanding.
- [ ] Local main Worker was not running at `127.0.0.1:8787` when checked (curl returned HTTP 000); this only confirms no local server was listening at that moment, not a production outage.

## A. Repository and release readiness

- [x] Website migration code and launch documentation exist on branch `cloudflare-migration`.
- [x] OfficeCRM website-v1 implementation has been merged into `dev`.
- [x] Ran `npm run check-launch` on 2026-10-15. All repository checks passed except the privacy-policy owner-review blocker described above.
- [ ] Verify the current website PR #1 status and decide separately whether/when to merge it. Do not merge or deploy automatically as part of these checks.
- [ ] Verify the latest website build and tests from the exact intended release commit.
- [ ] Verify `npx wrangler deploy --dry-run` for the main Worker.
- [ ] Verify `npx wrangler deploy -c wrangler.lp.jsonc --dry-run` for the landing-page Worker.
- [ ] Verify `office.hagarlushi.com` will remain untouched.

## B. OfficeCRM deployment and integration (critical blockers)

- [x] Merge the website lead deduplication implementation into OfficeCRM `dev` (PR #2).
- [ ] Confirm the Firebase App Hosting backend's production branch and deployed revision.
- [ ] Confirm production has the website-v1 webhook route and matching secret `LEADS_WEBHOOK_API_KEY`, without exposing the secret in chat, shell output, source, or logs.
- [ ] Verify website Worker `CRM_WEBHOOK_URL` is a plain valid HTTPS URL ending in `/api/leads/webhook`; no Markdown link syntax.
- [ ] Verify `LEADS_WEBHOOK_API_KEY` in each Cloudflare Worker matches the CRM secret exactly (bare key; Worker adds Bearer authorization).
- [ ] Run a synthetic test from the main-site Worker to OfficeCRM; verify the lead appears with correct name, phone, email, category, message and submission context.
- [ ] Run synthetic tests for the main contact form and each of the four landing-page forms: home, architecture, interior design, renovation. Include the main site's contact form as a separate form where present.
- [ ] Verify landing-page privacy consent is required and saved with exact wording, policy URL and timestamp.
- [ ] Repeat the same submission and verify no duplicate lead; test a new enquiry and an edited enquiry separately.
- [ ] Verify invalid input is rejected and no success/thank-you state appears unless OfficeCRM confirms `success: true`.
- [ ] Test CRM rejection, timeout and unknown-response handling; inspect CRM before any retry when the result is uncertain.
- [ ] Remove clearly marked synthetic test leads after evidence is recorded.
- [ ] Keep TTL configuration, legacy-lead backfill, rate limiting and other CRM changes as separate decisions; do not change them during the launch checks without approval.

## C. Cloudflare preview and site acceptance

- [ ] Verify Cloudflare preview deployments for both `hagarlushi` and `hagarlushi-lp`.
- [ ] Configure both Worker secrets separately for each Worker.
- [ ] Compare the 26 main-site Wix URLs and the 7 landing-page URLs against the inventories and confirm expected HTTP statuses.
- [ ] Test redirects, 404/noindex pages, sitemap.xml, robots.txt, canonical URLs and HTTPS.
- [ ] Check Hebrew and English pages, navigation, images, fonts, phone links, email links and WhatsApp links on desktop and mobile.
- [ ] Verify the correct contact numbers on each site.
- [ ] Verify the thank-you page appears only after a confirmed CRM save.
- [ ] Verify `generate_lead` fires only after confirmed lead creation; WhatsApp clicks are not leads.
- [ ] Verify analytics/tags do not fire on unintended preview/local hosts; use preview tag debugging only when deliberately enabled.
- [ ] Verify the current landing-page privacy policy on preview; owner/legal approval is a launch blocker for `lp`.
- [ ] In WordPress admin, inspect Elementor form “Actions After Submit” and document where existing leads currently go.
- [ ] Review the old Wix redirect list and active advertising destinations before approving redirects for old campaign landing pages.

## D. DNS, domain, email and rollback plan (before any change)

- [ ] Export/capture every Wix DNS record: A, AAAA, CNAME, MX, TXT, SRV.
- [ ] Identify and preserve MX, SPF, DKIM, DMARC and all email-provider records.
- [ ] Preserve verification TXT records (Google, Microsoft/Bing, Meta, etc.).
- [ ] Preserve the `office` record exactly; it is a hard requirement.
- [ ] Keep the current `lp` record pointing to WordPress until the landing-page cutover is separately approved and its preconditions pass.
- [ ] Confirm registrar access and how nameservers will be changed.
- [ ] Add/verify Cloudflare DNS records against the Wix export, record by record.
- [ ] Keep mail-related records, `office` and `lp` DNS-only as planned.
- [ ] Remove unused `en` and `he` records only as part of the approved cutover plan.
- [ ] Document the exact rollback actions and verify Wix/WordPress remain available.
- [ ] Obtain explicit owner approval for nameserver changes and separately for moving `www` and `lp` to Workers.

## E. Main-site cutover (`www.hagarlushi.com`) — only after A–D pass

- [ ] Choose a monitored cutover window.
- [ ] Change nameservers only after comparing the full DNS zone and validating email and `office`.
- [ ] Wait for Cloudflare zone activation; verify email, `office`, and the old site still work.
- [ ] Attach `www.hagarlushi.com` to Worker `hagarlushi` and configure apex-to-www redirect as documented.
- [ ] Test public-domain pages, redirects, HTTPS, mobile, analytics and the real Worker-to-CRM path using synthetic data.
- [ ] Keep Wix active until all post-cutover checks pass; export contacts, form submissions and chats before any cancellation.

## F. Landing-page cutover (`lp.hagarlushi.com`) — separate approval

- [ ] All four landing-page form tests pass on the preview Worker.
- [ ] Privacy policy reviewed and approved by the owner/legal reviewer.
- [ ] WordPress/Elementor lead routing has been checked and documented.
- [ ] Analytics/Google Ads conversion behavior has been verified in GTM preview.
- [ ] Owner explicitly approves the separate `lp` cutover.
- [ ] Attach `lp.hagarlushi.com` to `hagarlushi-lp`.
- [ ] Verify all seven landing-page URLs and run a synthetic lead through to OfficeCRM.
- [ ] Keep WordPress running for at least one month; document rollback to the previous `lp` record if needed.

## G. Post-launch monitoring

- [ ] Re-test all public forms and duplicate handling using synthetic data.
- [ ] Verify `office.hagarlushi.com` and email continue working.
- [ ] Verify GA4 realtime/events and GTM tag behavior.
- [ ] Submit the updated sitemap in Google Search Console.
- [ ] Monitor Worker logs, CRM errors, response times and lead delivery during the first days.
- [ ] Decide separately on TTL, legacy lead handling and rate limiting.

## Working protocol

1. Work one check at a time and preserve unrelated changes.
2. Record evidence and outcome before changing a task to `[x]`.
3. Use synthetic/test data; never create an unmarked fake lead or send a test to production without an explicit plan.
4. No production deployment, DNS/nameserver change, or custom-domain cutover without explicit owner approval.
5. After each work session, update this file with completed items, blockers, evidence and the next exact step.
