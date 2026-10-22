# Redirect approval list

Generated from `src/data/url-inventory.mjs` by `npm run redirect-list`; do not edit by hand.
Every redirect (HTTP 301) on the main site (`www.hagarlushi.com`, rules in `public/_redirects`) and on
`lp.hagarlushi.com` (rules in `lp-public/_redirects`). Campaign parameters (`utm_*`, `gclid`, `fbclid`) are kept
on every redirect. Unknown URLs get the 404 page. Every real landing page keeps its exact URL and is not listed here.

**How to approve:** reply with the numbers you approve (e.g. "C: approve 1–9") or the ones to change.
Claude then sets `approved: true` in the inventory.

| Group | Rules | Blocks launch? |
|---|---|---|
| A. Technical: no visitor content is lost | 12 | No (pre-approved; tell us if you object) |
| B. Content, lp.hagarlushi.com | 0 | No (none left) |
| C. Content, main site: obsolete Wix pages (out of migration scope) | 13 | No. Without approval, the redirect proposed here goes live with the main site |
| D. Main site: old Wix landing pages (out of scope, not recreated) | 0 | No (none left) |

## A. Technical redirects

| # | Site | Old URL | Redirects to (301) | Why |
|---|---|---|---|---|
| 1 | www.hagarlushi.com | `/portfolio-collections/*` | `/` | Wix template demo items (stock photos), not studio content |
| 2 | www.hagarlushi.com | `/pages-sitemap.xml` | `/sitemap.xml` | Old Wix sitemap file |
| 3 | www.hagarlushi.com | `/portfolio-projects-sitemap.xml` | `/sitemap.xml` | Old Wix sitemap file |
| 4 | www.hagarlushi.com | `/portfolio-collections-sitemap.xml` | `/sitemap.xml` | Old Wix sitemap file |
| 5 | lp.hagarlushi.com | `/wp-sitemap.xml` | `/sitemap.xml` | Technical URL with no content of its own |
| 6 | lp.hagarlushi.com | `/wp-sitemap-posts-page-1.xml` | `/sitemap.xml` | Technical URL with no content of its own |
| 7 | lp.hagarlushi.com | `/wp-sitemap-users-1.xml` | `/sitemap.xml` | Technical URL with no content of its own |
| 8 | lp.hagarlushi.com | `/sample-page/` | `/` | WordPress slug of the front page |
| 9 | lp.hagarlushi.com | `/sample-page` | `/` | Technical URL with no content of its own |
| 10 | lp.hagarlushi.com | `/feed/` | `/` | Empty RSS feed (no posts) |
| 11 | lp.hagarlushi.com | `/comments/feed/` | `/` | Empty comments feed |
| 12 | hagarlushi.com | `/` | `https://www.hagarlushi.com/` | hagarlushi.com redirects to www today (Wix) |

## B. Content redirects: lp.hagarlushi.com

None. The WordPress author archives are not redirected (see "No redirect" below).

## C. Content redirects: main site, obsolete Wix pages (approval requested, not blocking)

| # | Site | Old URL | Redirects to (301) | Why | Approved |
|---|---|---|---|---|---|
| 1 | www.hagarlushi.com | `/portfolio` | `/` | Press page ("מהעיתונות") removed from the site (owner decision, 2026-10-19) | yes (2026-10-19) |
| 2 | www.hagarlushi.com | `/copy-of-להיות-יפה` | `/דירה-להשכיר` | Duplicate of the "דירה להשכיר" project page | ☐ pending |
| 3 | www.hagarlushi.com | `/להיות-יפה` | `/להיות-יפה-שירלי` | Older copy of the "להיות יפה" project page | ☐ pending |
| 4 | www.hagarlushi.com | `/redesign` | `/עיצוב-מחדש` | Duplicate of the "עיצוב מחדש" project page | ☐ pending |
| 5 | www.hagarlushi.com | `/go-on-vacation` | `/צאו-לחופשה` | Duplicate of the "צאו לחופשה" project page | ☐ pending |
| 6 | www.hagarlushi.com | `/הבן-של-הנגר3` | `/הבן-של-הנגר` | Duplicate of the "הבן של הנגר" project page | ☐ pending |
| 7 | www.hagarlushi.com | `/bio` | `/אודות` | Older version of the About text | ☐ pending |
| 8 | www.hagarlushi.com | `/home` | `/` | Empty Wix page | ☐ pending |
| 9 | www.hagarlushi.com | `/פרוייקטים` | `/לקוחות-פרטיים` | Near-empty index ("הפרוייקטים שלי") | ☐ pending |
| 10 | www.hagarlushi.com | `/coming-soon` | `/` | "האתר בשיפוצים...נשוב בקרוב!" placeholder | ☐ pending |
| 11 | www.hagarlushi.com | `/דף-נחיתה-פרטיים` | `/לקוחות-פרטיים` | Live Wix landing page with a Wix contact form ("מתכננים עבורכם!") | yes (2026-10-20) |
| 12 | www.hagarlushi.com | `/דף-נחיתה-פרטי` | `/לקוחות-פרטיים` | Live Wix landing page ("משולחן השרטוט - עד לבית מעוצב…", call/mail buttons, no form) | yes (2026-10-20) |
| 13 | www.hagarlushi.com | `/דףנחיתה2` | `/` | Live Wix landing page with a form (content not fully captured: mostly Wix widgets) | yes (2026-10-20) |

## D. Old Wix landing pages

None left: the owner approved their redirects (group C).

## No redirect: these URLs return the 404 page

Owner decision: no redirect needed, and the pages are not recreated. The 404 page is `noindex`, so search engines drop these URLs.

| # | Site | Old URL | Why |
|---|---|---|---|
| 1 | lp.hagarlushi.com | `/author/gal/` | WordPress author archive (listed in the old sitemap), no content. No redirect needed (owner decision, 2026-10-13): 404 |
| 2 | lp.hagarlushi.com | `/author/roy/` | WordPress author archive (via the public users API), no content. No redirect needed (owner decision, 2026-10-13): 404 |
