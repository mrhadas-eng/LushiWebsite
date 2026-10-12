# Landing pages and subdomains: URL inventory (discovered 2026-10-11, scope agreed 2026-10-11)

**Agreed scope (owner, 2026-10-11):**
- The landing pages being migrated are the **seven WordPress pages on `lp.hagarlushi.com`**. They are recreated at the same URLs.
- The three old Wix landing pages and the other obsolete Wix pages under `www.hagarlushi.com` are **not recreated** and are **not launch blockers**. Their proposed redirects are listed for approval in `docs/REDIRECT-APPROVALS.md`.
- The main site and the landing pages stay separate, as two Cloudflare Workers.
- `office.hagarlushi.com` is preserved.
- `en.` and `he.` are unused; their DNS records are deleted at cutover.

Every URL found on `hagarlushi.com`, `www.`, `lp.`, `en.`, `he.` and `office.`, and what the new site does with each one.
The machine-readable copy is `src/data/url-inventory.mjs`. `test/inventory.test.mjs` fails if a page or redirect rule exists in the build but isn't listed there, or if a listed URL is neither served nor redirected. `npm run check-launch` fails while an in-scope content redirect (lp `/author/*`) or the privacy-policy legal review is open. Out-of-scope Wix redirects are listed there as non-blocking. Analytics events: `docs/ANALYTICS-EVENTS.md`.

**Evidence labels:**
- **Confirmed**: seen directly on the live site, through public HTML, the WordPress REST API, the sitemaps or DNS lookups.
- **Assumed**: inferred from what is visible, not verified.
- **Inaccessible**: needs an admin login (WordPress, Wix, GTM, Google Ads, Meta), so it was not checked.

## 1. Summary

| Host | Today | New | Status |
|---|---|---|---|
| `www.hagarlushi.com` | Wix | Worker `hagarlushi` (`dist/`) | 26 pages recreated at the same URLs. 9 obsolete copies or placeholders and 3 old Wix landing pages are out of scope and not recreated; their redirects await approval but don't block launch (§3). |
| `hagarlushi.com` (apex) | 3 A records → Wix, redirects to www | Cloudflare Redirect Rule → www | Planned (CLOUDFLARE-PLAN O5) |
| `lp.hagarlushi.com` | WordPress 7.1.3 + Elementor Pro 4.0.5 on 69.62.113.1 | Worker `hagarlushi-lp` (`dist-lp/`) | All 7 published pages recreated at the same URLs and tested. The WordPress site stays live until cutover is approved. |
| `en.` / `he.` | CNAME → Wix, showing the Wix "ConnectYourDomain Error" page | **Delete both records at cutover** | Unused (owner confirmed). Live DNS not changed yet (§6). |
| `office.hagarlushi.com` | OfficeCRM, A 35.219.200.106 | **Untouched** | Keep the record exactly as it is. |

How the URLs were found:
- `www`: the Wix sitemaps, plus a crawl of the internal links (confirmed).
- `lp`: `/wp-json/wp/v2/pages`, `posts`, `users`, `/wp-sitemap.xml`, `robots.txt` and the internal links (confirmed). Result: 7 published pages, 0 posts.
- Public search engines show no indexed `lp.` URLs (confirmed 2026-10-11).
- Not inspected: drafts, private pages, Elementor templates and menus. The WordPress REST API answers 401 for these (inaccessible).

## 2. lp.hagarlushi.com: the landing pages

Shared by all 4 landing pages (confirmed):
- **Layout, top to bottom:**
  1. Header: logo, 140px high.
  2. Hero slideshow: fades every 2.5s, with a dark overlay.
  3. "עיצוב ייחודי בהתאמה אישית" intro, with the CTA "לשיחת ייעוץ ללא עלות".
  4. "נעים מאוד," about block with Hagar's photo.
  5. "לקוחות מספרים": 3 testimonials in a carousel.
  6. Green "מעוניינים בשיחת ייעוץ?" form.
  7. "פרויקטים אחרונים" gallery (3 columns, lightbox).
  8. Black footer with links to the accessibility statement and privacy policy.
  9. A floating WhatsApp button that opens the chat directly.
- **Design:** Open Sans and Noto Sans Hebrew. Headings 50px/500, body text 19px. Form section `rgb(63,100,75)`.
- **Mobile:** sections stack, the form fields stack and the gallery drops to 2 columns. Checked at 375px with no horizontal scroll.
- **SEO:** a self-referencing canonical with a trailing slash. `robots: max-image-preview:large`. Pages are indexable, as they are on WordPress.
- **Tracking:**
  - GTM `GTM-KJRR2DNT` plus the Site Kit Google tag `GT-TQKZV73G` (linker domain `lp.hagarlushi.com`), both unchanged.
  - Both load only on `*.hagarlushi.com` (or with `?gtm=1`).
- **Main form** (Elementor form `690e664`):
  - Fields: name\*, phone\*, email\*.
  - Required checkbox: **"קראתי ומאשר/ת את מדיניות הפרטיות"**, linking to `/privacy/` (opens in a new tab).
  - Submit button: "שליחה".
- **WhatsApp** (decision D1, 2026-10-11: a WhatsApp click is not a lead):
  - The button opens the chat with **052-431-7164** (`972524317164`) and the prescribed message "היי הגר! יש לי פרוייקט שאני רוצה להתייעץ לגביו."
  - It is tracked as `whatsapp_click` only: nothing goes to OfficeCRM, there's no thank-you page and no `generate_lead`.
  - The WordPress pop-up (popup 444, form `ecfe932`: "לפתיחת צ'אט וואטסאפ, נא להשאיר שם וטלפון", name, phone, consent, no email) is **not recreated**, because the details it asked for are no longer used.
  - The WordPress thank-you page linked to 054-431-7164 (`972544317164`). The owner corrected this to 052-431-7164, which is now used on every lp page.
- **Main-site contact details stay separate:** phone and WhatsApp 050-578-8634. The tests check that neither site shows the other site's number.

| URL (kept exactly) | Title / purpose | Hero | Form id → OfficeCRM notes | WP id | Status |
|---|---|---|---|---|---|
| `/` | "Hagar Lushi \| Architecture & Interior Design" (general landing page) | "חללים שמספרים את הסיפור שלכם", scroll arrow, no button | `lp-home` → "דף נחיתה – ראשי" | 2 (slug `sample-page`) | Implemented and tested |
| `/architecture/` | "הגר לושי \| אדרכלות" (architecture campaign) | Two lines, plus "תכנון מוקפד. עיצוב מדויק. ליווי מלא." and a button | `lp-architecture` → "דף נחיתה – אדריכלות" | 387 | Implemented and tested |
| `/interior-design/` | Interior-design campaign | Heading and button | `lp-interior-design` → "דף נחיתה – עיצוב פנים" | 321 | Implemented and tested |
| `/renovation/` | Renovation campaign (shorter intro) | Heading and button | `lp-renovation` → "דף נחיתה – שיפוץ" | 406 | Implemented and tested |
| `/thankyou/` | "תודה שיצרת קשר" | Check icon, text and a WhatsApp button | none (conversion page) | 244 | Implemented. **The Google Ads conversion fires on this page view** (§5). |
| `/privacy/` | Privacy policy | none | none | 378 | Implemented: text copied unchanged from the WordPress export. **Needs legal review** (§7). |
| `/accessibility-statement/` | Accessibility statement | none | none | 9 | Implemented: text copied unchanged |
| `/sitemap.xml`, `/robots.txt` | Technical | none | none | none | Implemented: the 7 URLs above |

Copy, images and layout come from the WordPress REST export (`src/data/lp/wp-pages.json`) and the media library (85 files, converted to local WebP by the `fetch-lp-media` GitHub Action). Hebrew copy is unchanged, including the original spelling ("אדרכלות", "בעברה"). **New text** (validation and failure messages, the same on both sites) is listed for approval in §7, D8.

**Query parameters:**
- `?utm_*`, `gclid`, `fbclid` and any other parameter are kept.
- A URL typed without the trailing slash (`/architecture?…`) returns 307 to `/architecture/?…` with the query intact. Verified locally.
- Attribution is captured on the first page view and sent with the lead (§4).

### WordPress-only URLs on lp.

| URL | What it is | New behaviour | Approved? |
|---|---|---|---|
| `/sample-page/`, `/sample-page` | WordPress slug of the front page | 301 → `/` | Technical |
| `/wp-sitemap.xml`, `/wp-sitemap-posts-page-1.xml`, `/wp-sitemap-users-1.xml` | WordPress sitemaps | 301 → `/sitemap.xml` | Technical |
| `/feed/`, `/comments/feed/` | Empty RSS feeds (no posts) | 301 → `/` | Technical |
| `/author/gal/`, `/author/roy/` | Author archives (`gal` is in the old sitemap) | 301 → `/` | **Owner approval** |
| `/wp-admin/`, `/wp-login.php`, `/wp-json/…` | WordPress admin and API | 404 | Not content |
| anything else | none | 404 page (noindex) | none |

## 3. www.hagarlushi.com (Wix)

**Recreated at the same URL (26):**
- Pages: `/`, `/אודות`, `/מסחריים`, `/לקוחות-פרטיים`, `/יצירת-קשר`, `/portfolio`, `/הצהרתנגישות`.
- The 18 project pages, listed in `url-inventory.mjs`.
- `/thankyou`: noindex, final text pending.
- Also served: `sitemap.xml` and `robots.txt`.

Live Wix pages that are copies or placeholders (content checked 2026-10-11) **redirect with 301, pending the owner's approval:**

| URL | Content today | Redirect to |
|---|---|---|
| `/copy-of-להיות-יפה` | Copy of the "דירה להשכיר" project (**corrected**: it previously pointed at "להיות יפה") | `/דירה-להשכיר` |
| `/להיות-יפה` | Older copy of "להיות יפה" | `/להיות-יפה-שירלי` |
| `/redesign` | Copy of "עיצוב מחדש" | `/עיצוב-מחדש` |
| `/go-on-vacation` | Copy of "צאו לחופשה" | `/צאו-לחופשה` |
| `/הבן-של-הנגר3` | Copy of "הבן של הנגר" | `/הבן-של-הנגר` |
| `/bio` | Older About text | `/אודות` |
| `/home` | Empty | `/` |
| `/פרוייקטים` | "הפרוייקטים שלי" heading only | `/לקוחות-פרטיים` |
| `/coming-soon` | "האתר בשיפוצים...נשוב בקרוב!" | `/` |
| `/portfolio-collections/*` (6 items), old `*-sitemap.xml` | Wix template demo items / sitemaps | `/portfolio`, `/sitemap.xml` (technical) |

**Old Wix landing pages: out of scope, not recreated (owner, 2026-10-11).** These are live Wix pages with real content. Their proposed redirects stay pending until the owner has checked that no active campaign uses them. That check is not a launch blocker (REDIRECT-APPROVALS group D):

| URL | Content | Form | Proposed redirect |
|---|---|---|---|
| `/דף-נחיתה-פרטיים` | "מתכננים עבורכם!" landing page for private clients | Yes (Wix form, submits to Wix) | `/לקוחות-פרטיים` |
| `/דף-נחיתה-פרטי` | "משולחן השרטוט - עד לבית מעוצב…" | No (call and email buttons) | `/לקוחות-פרטיים` |
| `/דףנחיתה2` | Landing page, mostly Wix widgets | Yes | `/` |

To check: Google Ads final URLs and Meta ad website URLs (steps in `docs/REDIRECT-APPROVALS.md`). If an active ad uses one of these pages, change the ad to an lp. page before the main site moves.

## 4. Forms → OfficeCRM

| Form | Where | Fields | Sends to | Status |
|---|---|---|---|---|
| Main site contact | `/`, `/יצירת-קשר` | name\*, phone\*, email\*, message | `/api/lead` → OfficeCRM | Done and tested with a mock CRM |
| lp consultation form | 4 lp pages | name\*, phone\*, email\*, consent\* | `/api/lead` → OfficeCRM (the same Worker code, deployed as `hagarlushi-lp`) | Done and tested with a mock CRM |
| WhatsApp (both sites) | Floating button, thank-you pages, failure message | none | Opens WhatsApp only; `whatsapp_click` | Not a lead (D1) |
| Wix landing-page forms | §3 | Wix forms | Wix | Out of scope; not recreated |

**Validation** is the same on both sites. The rules in `src/lib/lead-rules.js` are shared by the forms and the Worker.
- Required fields are marked with \*.
- Each missing or invalid field gets its own Hebrew message next to it, and the field is set to `aria-invalid` and linked to the message with `aria-describedby`:
  - Name: "יש להזין שם מלא".
  - Phone: empty → "יש להזין מספר טלפון"; filled but not a valid number → "יש להזין מספר טלפון תקין". Formatting never causes a rejection: spaces, hyphens, dots and parentheses are ignored. Accepted:
    - Israeli mobile or VoIP numbers: 05X or 07X plus 7 digits, e.g. 052-431-7164, 077 123 4567.
    - Israeli landlines: 02, 03, 04, 08 or 09 plus 7 digits, e.g. (03) 123-4567.
    - The same with +972, 972 or 00972 instead of the leading 0, including "+972 (0)52…".
    - Numbers from abroad: starting with + or 00, 8–15 digits.
  - Rejected: too short or too long, a prefix that doesn't exist (01, 06), letters.
  - Email: "נא להזין כתובת אימייל תקינה".
  - Privacy consent, lp only: "יש לאשר את מדיניות הפרטיות".
- The first invalid field is focused, nothing is sent and the typed values are kept. While the visitor edits a flagged field, its message updates (e.g. from "תקין" to empty) and clears as soon as the field is correct.
- The Worker applies the same rules. If the browser check is bypassed, it answers 400 with the error code and field (`missing_phone` and `invalid_phone` separately), and the form shows that field's message (not a generic error).

**Delivery:**
- While sending, the button is disabled, so a double click sends one lead.
- The thank-you page and `generate_lead` follow only after OfficeCRM confirms the lead.
- If OfficeCRM rejects the lead, times out (10 s) or is unreachable, or the visitor's connection fails, the values are kept and a separate message appears: "לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ."
  - "בטלפון" and "בוואטסאפ" link to the site's own number: www 050-578-8634, lp 052-431-7164.

What an lp lead carries (`worker/index.js`; no new CRM integration):
- **The OfficeCRM fields:** `name`, `phone`, `email`, `source`, `notes`.
- **`source`:** `landing-page / <utm_source> / <utm_medium>`. If there are no UTM tags it falls back to `landing-page / google-ads` (gclid), `/ facebook` (fbclid), the referring site, or `/ direct`.
- **`notes`:**
  - Form name ("דף נחיתה – אדריכלות"), page path, the first page of the visit, all UTMs, gclid/fbclid, the referrer.
  - The site (`lp.hagarlushi.com`), "אישור מדיניות פרטיות: כן" and the time.
- **Consent:** required in the browser and again in the Worker (`missing_consent` → 400, nothing sent).
- **Success:** only on HTTP 2xx with `success: true`. Only then does the browser go to `/thankyou/` and push `generate_lead`.

**Inaccessible (WordPress admin needed):** what the main Elementor form did on submit (email notification, webhook, Zapier or CRM, redirect). If they post to a different service (e.g. a Zapier, Make or WhatsApp-bot webhook), that dependency must be recorded and approved before WordPress is switched off (brief rule). The redirect to `/thankyou/` after the main form is assumed, because that page exists and the Ads conversion is attached to it.

## 5. Tracking (GTM container `GTM-KJRR2DNT`, version 9, read from the public container JS)

| Tag | Fires on | Effect of the migration |
|---|---|---|
| GA4 `G-4QMWQY3565` | gtm.init, all pages; **blocked on lp.** | None |
| Google Ads `AW-16872313549`, conversion label `-2jHCIbIu50aEM2lrO0-` | Page view of `lp.hagarlushi.com/thankyou/` | Still fires, since the URL is unchanged. Note: a refresh or direct visit counts again. Recommendation **D6**: switch the trigger to the `generate_lead` event (owner decision, in GTM). |
| Meta Pixel `629224152313207` | All pages | None |
| Microsoft Clarity `qc82doh8lz` | All pages; blocked on lp | None |
| Site Kit `GT-TQKZV73G` (gtag, lp only) | All lp pages | Kept as an inline tag with the same ID and linker setting |

Event details, including which events are implemented, which need GTM configuration and which are optional: **`docs/ANALYTICS-EVENTS.md`**.
- `generate_lead`: once, on the thank-you page, only after OfficeCRM confirmed the lead.
- `whatsapp_click`: every WhatsApp link. Not a conversion.

Live conversion firing can't be verified without the GTM, Google Ads or Meta dashboards; it is verified only locally (tags are not loaded off-domain).

## 6. DNS: proposed changes (documented only; nothing has been changed)

| Record | Today (confirmed by lookup) | Proposed at cutover | Precondition |
|---|---|---|---|
| `hagarlushi.com` A ×3 | Wix | Proxied, served by Worker `hagarlushi` plus a Redirect Rule → www | O3 passed |
| `www` | CNAME → Wix | Custom domain on Worker `hagarlushi` | O3 passed |
| `lp` | A 69.62.113.1 (WordPress) | **Copied unchanged** at the nameserver switch. Later, a custom domain on Worker `hagarlushi-lp`. | All 7 lp pages and forms accepted on the workers.dev preview; D1, D2, D5 decided; WordPress form actions checked |
| `office` | A 35.219.200.106 (OfficeCRM) | **Copied exactly, never changed** | none |
| `en`, `he` | CNAME → Wix (error page) | **Delete both records** at the nameserver switch (don't copy them into Cloudflare, or delete them there). Owner confirmed they're unused (D7, 2026-10-11). | Not done yet: cutover checklist |
| MX, SPF, DKIM, DMARC, verification TXT | Per the zone export | Copied exactly | O1 export |

Rollback for lp: point `lp` back to `A 69.62.113.1` (WordPress is not touched until acceptance).

## 7. Decisions

| # | Topic | Status |
|---|---|---|
| D1 | WhatsApp pop-up / WhatsApp leads | **Decided:** a WhatsApp click is not a lead; it opens the chat directly and is tracked as `whatsapp_click` only. Implemented. |
| D2 | WhatsApp numbers | **Decided:** landing pages use 052-431-7164 for calls (`tel:+972524317164`) and WhatsApp (`972524317164`), including the delivery-failure message. The main site keeps 050-578-8634. Implemented. |
| D3 | Old Wix landing pages | **Decided:** out of scope, not recreated. **Open (not blocking):** check active campaigns, then approve the redirects (REDIRECT-APPROVALS group D). |
| D4 | Redirect approvals | **Open:** lp `/author/gal/` and `/author/roy/` (group B, **blocks lp cutover**); main-site obsolete pages (group C, not blocking). |
| D5 | lp `/privacy/` text: starts with a duplicated accessibility statement, then a generic template (SEQ Legal / Website Planet credit) | **Open, blocks lp cutover:** legal review. Copied unchanged until then (`legalReview` flag in the inventory). |
| D6 | Google Ads conversion trigger (lp `/thankyou/` page view) | **Open (recommendation):** move it in GTM to `generate_lead`. |
| D7 | `en.` / `he.` | **Decided:** unused; delete both DNS records at cutover. |
| D8 | New Hebrew form text | **Open, owner approval:** see the list below. |
| D9 | Contact email on the legal pages | **Decided (2026-10-12):** the lp privacy policy and accessibility statement show `lushi.office@gmail.com` as a `mailto:` link. WordPress had `mr.hadas@gmail.com` as plain text. The address is swapped when the page is built (`src/lib/lp-legal.mjs`); the policy wording is unchanged and still awaits legal review (D5). **Main site, also decided (2026-10-12):** the accessibility statement at `/הצהרתנגישות` (www) now shows `lushi.office@gmail.com`. It was already a `mailto:` link; only the address changed, and the rest of the statement is untouched. |

**D8: exact Hebrew text.** The field messages were given by the owner (phone missing/invalid split on 2026-10-12).

| Where | Text |
|---|---|
| Field required marker | `*` after each required field (in the main site's placeholders, e.g. "שם מלא *") |
| Name missing | יש להזין שם מלא |
| Phone empty | יש להזין מספר טלפון |
| Phone not a valid number | יש להזין מספר טלפון תקין |
| Email missing or invalid | נא להזין כתובת אימייל תקינה |
| Privacy box not ticked (lp) | יש לאשר את מדיניות הפרטיות |
| Delivery failure (both sites; replaces "השליחה נכשלה…") | לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ. ("בטלפון" and "בוואטסאפ" are links to the site's own number) |
| Screen readers only (main site) | "(שדה חובה)" after each required field's label |

## 8. Acceptance (re-run 2026-10-12)

- **`npm test`: 73/73 pass.** Covers:
  - The shared validation rules and the exact Hebrew messages; 26 valid phone formats accepted, 22 invalid numbers rejected; empty vs invalid phone.
  - The Worker applying the same rules, with 400 + field and nothing sent.
  - Lead client: a field rejection, CRM rejection, timeout and network failure produce no redirect and no conversion.
  - The OfficeCRM contract with a mock.
  - Inventory coverage both ways; scope (only lp `/author/*` blocks); en./he. planned for removal; the redirect approval list up to date.
  - lp canonicals, tags and form markup (required, `aria-describedby`, messages).
  - WhatsApp: 052-431-7164 plus the message on every lp page, the main site's 050-578-8634, never mixed; no pop-up form.
  - Main-site accessibility statement: `lushi.office@gmail.com` as a `mailto:` link, no `mr.hadas@gmail.com`.
  - lp legal pages: `lushi.office@gmail.com` as text and `mailto:` link, no old address, wording otherwise identical to the WordPress export.
  - lp delivery-failure links: `tel:+972524317164` and WhatsApp `972524317164` on all 4 forms; main site `tel:+972505788634`.
  - Sitemap; images all local; no CRM address or key in either build.
- **Browser, both sites: 188/188 pass** (`test/e2e/forms.e2e.mjs`, desktop 1366px and mobile 375px, local `wrangler dev`, mock OfficeCRM). Covers:
  - An empty form flags every required field; each field missing or invalid on its own; consent unchecked.
  - The first invalid field is focused, `aria-invalid` is set and no request is sent.
  - Phone: empty, spaces only → "יש להזין מספר טלפון"; `12345`, `052-431-716`, `06-1234567`, `abc` → "יש להזין מספר טלפון תקין". The message switches while editing.
  - `052 431 7164`, `+972-52-431-7164`, `(03) 123-4567` and `0524317164` are accepted and delivered as typed.
  - Values are kept, and messages clear when corrected.
  - The server rejects a missing and an invalid phone separately (400 `missing_phone` / `invalid_phone`). A server field rejection is shown next to the field, which gets focus.
  - The lp privacy and accessibility pages show the `lushi.office@gmail.com` link and no old address.
  - Success on all 6 forms: the button is disabled while sending, a double click sends exactly one OfficeCRM request, then `/thankyou` and one `generate_lead`; no second conversion on refresh.
  - Delivery failures (`success:false`, HTTP 500, timeout, dropped CRM connection, visitor offline): the separate message appears with this site's phone and WhatsApp links, values are kept, there's no redirect and no conversion, and the visitor can retry.
  - WhatsApp: the correct number and message, `whatsapp_click` once, no CRM request, no thank-you page, no `generate_lead`. The lp number is checked on all 7 lp pages.
  - No horizontal scroll and no JS errors.
- **Browser, main-site OfficeCRM round trip:** 40/40 pass (`test/e2e/main-site.e2e.mjs`).
- **`npm run check-launch`:** every repository check passes except two, which fail **by design** until the owner acts:
  - The lp `/author/*` redirect approval.
  - The `/privacy/` legal review.
  - The 12 out-of-scope Wix redirects are listed as not blocking.
- **`wrangler deploy --dry-run`:**
  - `hagarlushi`: 1,431 asset files. `hagarlushi-lp`: 259 asset files.
  - Both valid. Nothing was deployed.
- **Not yet done** (needs dashboards):
  - Deploy to workers.dev.
  - A real test lead into OfficeCRM per form, deleted afterwards.
  - GTM triggers and preview.
  - Check the WordPress main-form action.
  - The ad campaign URL check.
  - DNS changes, including deleting `en`/`he`, at cutover.
