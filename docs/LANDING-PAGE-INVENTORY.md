# Landing pages and subdomains: URL inventory (discovered 2026-10-11)

Every URL found on `hagarlushi.com`, `www.`, `lp.`, `en.`, `he.` and `office.`, and what the new site does with each one.
The machine-readable copy is `src/data/url-inventory.mjs`. `test/inventory.test.mjs` fails if a page or redirect rule exists in the build but isn't listed there, or if a listed URL is neither served nor redirected. `npm run check-launch` fails while any redirect is still waiting for the owner's approval.

**Evidence labels:**
- **Confirmed**: seen directly on the live site, through public HTML, the WordPress REST API, the sitemaps or DNS lookups.
- **Assumed**: inferred from what is visible, not verified.
- **Inaccessible**: needs an admin login (WordPress, Wix, GTM, Google Ads, Meta), so it was not checked.

## 1. Summary

| Host | Today | New | Status |
|---|---|---|---|
| `www.hagarlushi.com` | Wix | Worker `hagarlushi` (`dist/`) | 26 pages recreated at the same URLs. 9 old copies or placeholders redirect (owner approval pending). 3 live Wix landing pages need a decision (§3). |
| `hagarlushi.com` (apex) | 3 A records → Wix, redirects to www | Cloudflare Redirect Rule → www | Planned (CLOUDFLARE-PLAN O5) |
| `lp.hagarlushi.com` | WordPress 7.1.3 + Elementor Pro 4.0.5 on 69.62.113.1 | Worker `hagarlushi-lp` (`dist-lp/`) | All 7 published pages recreated at the same URLs and tested. The WordPress site stays live until cutover is approved. |
| `en.` / `he.` | CNAME → Wix, showing the Wix "ConnectYourDomain Error" page | No change | Inactive. DNS decision only (§6). |
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
  9. A floating WhatsApp button, which opens a pop-up.
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
- **WhatsApp pop-up** (Elementor popup 444, form `ecfe932`):
  - Title: "לפתיחת צ'אט וואטסאפ, נא להשאיר שם וטלפון".
  - Fields: name\*, phone\*, plus the same consent checkbox. **No email.**
  - WhatsApp number on lp: **972544317164**, with the message "היי הגר! יש לי פרוייקט שאני רוצה להתייעץ לגביו."

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

Copy, images and layout come from the WordPress REST export (`src/data/lp/wp-pages.json`) and the media library (85 files, converted to local WebP by the `fetch-lp-media` GitHub Action). Hebrew copy is unchanged, including the original spelling ("אדרכלות", "בעברה"). **The only new text** is the form error message "השליחה נכשלה. אפשר לנסות שוב, או לכתוב לנו בוואטסאפ דרך הכפתור בפינת המסך." WordPress showed Elementor's generic error, so this needs the owner's approval.

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

**Live Wix landing pages: decision D3.** These are real landing pages, not drafts as first assumed. They redirect for now, which is **not approved**:

| URL | Content | Form | Redirect to |
|---|---|---|---|
| `/דף-נחיתה-פרטיים` | "מתכננים עבורכם!" landing page for private clients | Yes (Wix form, submits to Wix) | `/לקוחות-פרטיים` |
| `/דף-נחיתה-פרטי` | "משולחן השרטוט - עד לבית מעוצב…" | No (call and email buttons) | `/לקוחות-פרטיים` |
| `/דףנחיתה2` | Landing page, mostly Wix widgets; content not fully captured | Yes | `/` |

To decide: if Google Ads, Meta or any printed material still links to them, recreate them (copy plus the `/api/lead` form) before cutover. Otherwise approve the redirects. The ad accounts must be checked (inaccessible here).

## 4. Forms → OfficeCRM

| Form | Where | Fields | Sends to | Status |
|---|---|---|---|---|
| Main site contact | `/`, `/יצירת-קשר` | name\*, phone\*, email\*, message | `/api/lead` → OfficeCRM | Done (earlier phase) |
| lp consultation form | 4 lp pages | name\*, phone\*, email\*, consent\* | `/api/lead` → OfficeCRM (the same Worker code, deployed as `hagarlushi-lp`) | Done and tested with a mock CRM |
| lp WhatsApp pop-up | All lp pages | name\*, phone\*, consent\* | **Not sent to the CRM.** It opens WhatsApp and pushes `whatsapp_click`. | **Decision D1** |
| Wix landing-page forms | §3 | Wix forms | Wix | Decision D3 |

What an lp lead carries (`worker/index.js`; no new CRM integration):
- **The OfficeCRM fields:** `name`, `phone`, `email`, `source`, `notes`.
- **`source`:** `landing-page / <utm_source> / <utm_medium>`. If there are no UTM tags it falls back to `landing-page / google-ads` (gclid), `/ facebook` (fbclid), the referring site, or `/ direct`.
- **`notes`:**
  - Form name ("דף נחיתה – אדריכלות"), page path, the first page of the visit, all UTMs, gclid/fbclid, the referrer.
  - The site (`lp.hagarlushi.com`), "אישור מדיניות פרטיות: כן" and the time.
- **Consent:** required in the browser and again in the Worker (`missing_consent` → 400, nothing sent).
- **Success:** only on HTTP 2xx with `success: true`. Only then does the browser go to `/thankyou/` and push `generate_lead`.

**Inaccessible (WordPress admin needed):** what the Elementor forms did on submit (email notification, webhook, Zapier or CRM, redirect). If they post to a different service (e.g. a Zapier, Make or WhatsApp-bot webhook), that dependency must be recorded and approved before WordPress is switched off (brief rule). The redirect to `/thankyou/` after the main form is assumed, because that page exists and the Ads conversion is attached to it.

## 5. Tracking (GTM container `GTM-KJRR2DNT`, version 9, read from the public container JS)

| Tag | Fires on | Effect of the migration |
|---|---|---|
| GA4 `G-4QMWQY3565` | gtm.init, all pages; **blocked on lp.** | None |
| Google Ads `AW-16872313549`, conversion label `-2jHCIbIu50aEM2lrO0-` | Page view of `lp.hagarlushi.com/thankyou/` | Still fires, since the URL is unchanged. Note: a refresh or direct visit counts again. Recommendation **D6**: switch the trigger to the `generate_lead` event (owner decision, in GTM). |
| Meta Pixel `629224152313207` | All pages | None |
| Microsoft Clarity `qc82doh8lz` | All pages; blocked on lp | None |
| Site Kit `GT-TQKZV73G` (gtag, lp only) | All lp pages | Kept as an inline tag with the same ID and linker setting |

New dataLayer events on lp:
- `generate_lead`: once, on `/thankyou/`, only after OfficeCRM confirmed the lead.
- `whatsapp_click`: from the pop-up, `link_location: lp_popup`.

Live conversion firing can't be verified without the GTM, Google Ads or Meta dashboards; it is verified only locally (tags are not loaded off-domain).

## 6. DNS: proposed changes (documented only; nothing has been changed)

| Record | Today (confirmed by lookup) | Proposed at cutover | Precondition |
|---|---|---|---|
| `hagarlushi.com` A ×3 | Wix | Proxied, served by Worker `hagarlushi` plus a Redirect Rule → www | O3 passed |
| `www` | CNAME → Wix | Custom domain on Worker `hagarlushi` | O3 passed |
| `lp` | A 69.62.113.1 (WordPress) | **Copied unchanged** at the nameserver switch. Later, a custom domain on Worker `hagarlushi-lp`. | All 7 lp pages and forms accepted on the workers.dev preview; D1, D2, D5 decided; WordPress form actions checked |
| `office` | A 35.219.200.106 (OfficeCRM) | **Copied exactly, never changed** | none |
| `en`, `he` | CNAME → Wix (error page) | Decision **D7**: copy as is, or delete them (no site behind them) | Owner |
| MX, SPF, DKIM, DMARC, verification TXT | Per the zone export | Copied exactly | O1 export |

Rollback for lp: point `lp` back to `A 69.62.113.1` (WordPress is not touched until acceptance).

## 7. Decisions required (owner)

| # | Decision | Options | Default in code |
|---|---|---|---|
| D1 | WhatsApp pop-up has no email field, but OfficeCRM requires email | (a) add an email field (changes the form); (b) allow leads without email in OfficeCRM (out of scope here); (c) WhatsApp only, no CRM lead | (c): `popupSendsToCrm: false` |
| D2 | Two WhatsApp numbers: lp uses 054-431-7164, the main site 050-578-8634 | Keep both, or unify | Both kept as they are |
| D3 | Live Wix landing pages (§3) | Recreate, or approve the redirects | Redirect (not approved) |
| D4 | Duplicate/placeholder redirects (§3) and `/author/*` on lp | Approve | Redirect (not approved) |
| D5 | `/privacy/` text: starts with a duplicated accessibility statement, then a generic template (SEQ Legal / Website Planet credit), with outdated wording | Legal review; text changes need the owner's approval | Copied unchanged |
| D6 | Google Ads conversion trigger (lp `/thankyou/` page view) | Keep, or move to `generate_lead` | Unchanged |
| D7 | `en.` / `he.` DNS records | Keep or delete | Unchanged |
| D8 | New form error message (§2) | Approve or edit | Shown on failure |

## 8. Acceptance (what was tested, 2026-10-11)

- `npm test`: **59/59 pass**. Covers:
  - Worker tests, including lp forms, consent and CRM failure.
  - Inventory coverage both ways.
  - Redirect targets, no chains or loops, query strings kept.
  - lp canonicals, robots, tags, form fields and consent.
  - WhatsApp pop-up never reports a lead.
  - Sitemap; images all local; no CRM address or key in `dist/` or `dist-lp/`.
- **Browser, lp, 66/66 pass** (Playwright, desktop 1366px and mobile 375px, local `wrangler dev` with a mock OfficeCRM):
  - All 4 forms: lead sent with the correct source and notes → `/thankyou/` → `generate_lead` once; no second conversion on refresh.
  - CRM `success:false` or 500 → error message, no redirect, no conversion.
  - Consent missing → blocked in the browser and by the API.
  - Pop-up → opens WhatsApp (972544317164), no CRM call, no `generate_lead`.
  - Gallery lightbox, testimonials carousel, no horizontal scroll, no broken images, no JS errors, no tags off-domain.
- **Browser, main site:** 40/40 pass (unchanged).
- `npm run check-launch`: all repository checks pass except the open owner decisions (14 unapproved redirects and D1), which fail **by design** until decided.
- `wrangler deploy --dry-run`:
  - `hagarlushi`: 1,430 asset files. `hagarlushi-lp`: 258 asset files.
  - Both valid. Nothing was deployed.
- **Not yet done** (needs dashboards):
  - Deploy to workers.dev.
  - A real test lead into OfficeCRM per form, deleted afterwards.
  - GTM preview of the Ads conversion on the preview host.
  - Check the WordPress form actions.
