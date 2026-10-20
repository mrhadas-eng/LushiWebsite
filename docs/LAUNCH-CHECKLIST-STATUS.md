# Hagar Lushi Website — Remaining Launch Checklist

**Last reviewed:** 2026-10-20  
**Website repo:** `mrhadas-eng/LushiWebsite`, branch `cloudflare-migration`  
**OfficeCRM repo:** `mrhadas-eng/OfficeCRM`, target branch `dev`

This file intentionally contains **only work still outstanding**. Completed checks have been removed from the active list. No production deployment, DNS/nameserver change, or custom-domain cutover without explicit owner approval. Keep `office.hagarlushi.com` unchanged and keep Wix/WordPress available until replacements are verified.

## 1. Immediate next steps

- [ ] Check the status and mergeability of website PR #1; do not merge without a separate explicit decision.
- [ ] Verify the exact intended website release commit, then rerun build/tests on that commit if it differs from the commit already tested.
- [ ] Verify OfficeCRM's merged `dev` revision is actually deployed to the intended Firebase App Hosting backend. Git merge alone is not deployment evidence.
- [ ] Confirm the production webhook route and authentication configuration without exposing secrets.
- [ ] Resolve the local configuration mismatch: `.dev.vars` points to `http://127.0.0.1:3000/api/leads/webhook`, while the Worker implementation refuses non-HTTPS webhook URLs. Do not silently change the setting; decide on a safe local test setup first.

## 2. Preview integration and form acceptance

- [ ] Verify Cloudflare preview deployments for both Workers: `hagarlushi` and `hagarlushi-lp`.
- [ ] Verify `CRM_WEBHOOK_URL` and `LEADS_WEBHOOK_API_KEY` are correctly configured as separate secrets on each Cloudflare Worker; never print or paste secret values.
- [ ] Run the remaining real HTTP end-to-end tests from each preview form to OfficeCRM using clearly synthetic data: main contact form and landing pages home, architecture, interior design, renovation.
- [ ] Confirm the saved synthetic leads contain the expected contact details, category, message, source/context, and (for landing pages) consent wording, policy URL and timestamp.
- [ ] Verify invalid submissions are rejected and no thank-you/success conversion occurs unless OfficeCRM confirms success.
- [ ] Test rejection, timeout and uncertain-response handling against the preview integration. If the outcome is uncertain, inspect OfficeCRM before retrying.
- [ ] Record evidence, then delete clearly marked synthetic test leads.
- [ ] Verify all seven landing-page URLs and the 26 main-site URLs return the intended pages/statuses on preview.
- [ ] Check redirects, 404/noindex pages, sitemap.xml, robots.txt, canonical URLs, HTTPS, Hebrew/English layout, navigation, images, fonts, phone/email links and WhatsApp links on desktop and mobile.
- [ ] Verify the correct phone numbers on each site and that the thank-you page appears only after a confirmed CRM save.

**Evidence note:** Local synthetic integration and replay/deduplication have already been tested. The replay returned `duplicate: true`, `outcome: replay`, and the same lead ID without creating a second lead. The replay body was reconstructed, so byte-for-byte equality with the original request was not established. This is local evidence, not proof of production deployment or live Cloudflare-to-OfficeCRM delivery.

## 3. Owner decisions and WordPress/analytics

- [ ] Replace the legacy copied privacy-policy content with the owner's updated document on both intended site surfaces; render as plain Hebrew RTL text with no Elementor/legacy styling. Remove the internal note before publishing and ensure the publication-date placeholder is not shown to visitors.
- [ ] Review the updated privacy policy at `/privacy/` on preview for RTL layout, mobile readability, plain styling, links, and correct rendering on both domains. Privacy policy is considered near-ready and is not a launch blocker by itself; any factual corrections identified by the post-launch technical audit should be tracked separately.
- [ ] In WordPress admin, inspect Elementor form “Actions After Submit” and document the current lead-delivery destinations.
- [ ] Review the 9 remaining out-of-scope Wix redirects in `docs/REDIRECT-APPROVALS.md` (group C); they are classified as non-blocking. (The 3 old landing-page redirects `/דף-נחיתה-פרטיים`, `/דף-נחיתה-פרטי` and `/דףנחיתה2` were approved by the owner on 2026-10-20, without a campaign check.)
- [ ] Verify GTM triggers for `generate_lead`, `whatsapp_click`, `phone_click`, and `email_click` are published.
- [ ] Verify the Google Ads conversion on landing pages still fires as intended (thank-you page view or the approved replacement event).
- [ ] Verify `whatsapp_click` is not configured as a Google Ads/Meta Lead conversion.

## 4. DNS, domains, email and rollback plan

- [ ] Export/capture all Wix DNS records: A, AAAA, CNAME, MX, TXT and SRV.
- [ ] Compare records against Cloudflare, preserving MX, SPF, DKIM, DMARC, email-provider records and verification TXT records.
- [ ] Preserve `office.hagarlushi.com` exactly; do not change it.
- [ ] Keep `lp` pointing to WordPress until the separate LP cutover is approved and all preconditions pass.
- [ ] Confirm registrar access, nameserver procedure, rollback actions, and that Wix/WordPress remain available.
- [ ] Keep mail-related records, `office`, and `lp` DNS-only as planned; remove unused `en` and `he` records only as part of an approved cutover.
- [ ] Obtain explicit owner approval for nameserver changes and separately for moving `www` and `lp` to Workers.

## 5. Cutover — only after the relevant checks above pass

### Main site: `www.hagarlushi.com`

- [ ] Choose a monitored cutover window.
- [ ] After DNS comparison and approval, perform the approved cutover and verify email, `office`, HTTPS, redirects, mobile pages, analytics and the real Worker-to-CRM path with synthetic data.
- [ ] Keep Wix available until post-cutover checks pass; export contacts, form submissions and chats before any cancellation.

### Landing pages: `lp.hagarlushi.com` (separate approval)

- [ ] Complete all four LP form tests on the preview Worker.
- [ ] Obtain privacy-policy approval and document Elementor routing.
- [ ] Verify analytics/Google Ads conversion behavior in GTM preview.
- [ ] Obtain explicit owner approval for the LP cutover.
- [ ] Attach `lp.hagarlushi.com` to `hagarlushi-lp` only after approval.
- [ ] Verify all seven public LP URLs and one synthetic lead end-to-end.
- [ ] Keep WordPress running for at least one month and document rollback to the previous `lp` record.

## 6. After launch

- [ ] Re-test public forms and duplicate handling with synthetic data.
- [ ] Verify `office.hagarlushi.com` and email continue working.
- [ ] Verify GA4 realtime/events and GTM behavior.
- [ ] Post-launch: audit Cookies and browser storage separately on `hagarlushi.com` and `lp.hagarlushi.com` (clean state, after accept, after reject if available); record cookie names, providers, purposes, lifetimes, and whether non-essential tags load before choice. Update section 6 of the privacy policy to reflect verified behavior.
- [ ] Post-launch: replace the privacy-policy date placeholder with the actual publication/update date, then verify the date is visible and the internal editorial note is absent.
- [ ] Submit the updated sitemap in Google Search Console.
- [ ] Monitor Worker logs, CRM errors, response times and lead delivery during the first days.
- [ ] Decide separately on TTL, legacy-lead handling and rate limiting.

## Working rules

1. Work one step at a time and preserve unrelated changes.
2. Use synthetic/test data; never create an unmarked fake lead or test production without an explicit plan.
3. Do not print secrets, reset/stash/clean unrelated changes, deploy, merge, or change DNS without the relevant explicit approval.
4. Update this file after each verified step; keep completed tasks out of the active checklist.
