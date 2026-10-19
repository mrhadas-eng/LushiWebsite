# Visual parity audit: Wix / WordPress → Astro

**Reference (source of truth):** the live Wix site www.hagarlushi.com for the main site, and the live WordPress site
lp.hagarlushi.com for the landing pages (the landing pages were never on Wix).
**Branch:** `visual-parity` (from `cloudflare-migration` at `6bdb8ac`), not committed yet.
**Status (2026-10-19):** owner decisions of 2026-10-19 applied; all images and the About portrait are served from the
site itself (no Wix URL left in either build). Page heights and footer positions match Wix on every www route at
desktop and phone size. Later the same day the owner removed the press page (`/portfolio` → 301 to `/`, videos not
kept) and set the landing-page WhatsApp number to 054-431-7164.
**Routes PASS at all three sizes: 0 of 34** (no route can pass "tablet", see below). Desktop PASS: 9 of 34; phone PASS:
3 groups. Everything else is PARTIAL or BLOCKED for the reasons listed per route. Nothing was committed, deployed or
merged; DNS, secrets and OfficeCRM were not touched.

## How the comparison is done

The reference sites are reachable only from the owner's Mac (the cloud workspace is blocked by the network
allowlist), so the references were measured in the Claude desktop app's browser on the Mac, and the local build in
a headless Chromium in the workspace **with the same fonts** (Google Fonts served from identical @fontsource copies).

The same extractor runs on both sides and records, for every visible text run, image, form field and icon: position
and size (document coordinates), font family, size, weight, line height, letter spacing, colour and alignment;
borders, background and radius for fields. `compare.py` matches items by text or media id and lists the
differences. Tools: `scripts/parity/` (see its README). Reference measurements: `docs/visual-parity/`.
Side-by-side screenshots (reference left, local right): `docs/visual-parity/screenshots/`.

Viewports: desktop 1440×900; tablet 768–1180 (see below); phone 390×844.

Notes on the references:
- **Wix mobile is a separate design**, authored 320px wide (`<meta viewport width=320>`) and scaled by the phone
  (×1.22 on a 390px phone). We reproduce it with a unit `--m = 100vw / 320` (sizes written as Wix value × `--m`),
  and Wix mobile coordinates are compared after scaling (`scale.py`).
- **Wix has no tablet layout.** At 768px it shows the fixed ~980px desktop layout with a sideways scrollbar; an iPad
  scales that desktop layout down. Our tablet target is the desktop composition fitted to the width. It is checked
  with `test/e2e/responsive.e2e.mjs` (768, 820, 1024, 1180 px): no sideways scrolling, nothing off-screen, no distorted
  images, readable text, 40px tap targets, menu on one row.
- WordPress pages are responsive (Elementor); they were measured at 1440 and 390 in the same browser.
- Platform widgets are excluded: Wix chat, Wix "quick actions" button, Wix ads, cookie banner; the WordPress and
  local WhatsApp buttons.
- Wix screenshots after scrolling on the 1440 desktop render badly in the Mac browser pane (Wix scales the page),
  so desktop screenshots are first-viewport only; measurements are not affected. Some Wix phone screenshots
  (`side-m-menu`, `side-m-thankyou-bottom`) were rendered at 311px instead of 390px by the same quirk.
- Wix scroll-in animations had not run in some reference screenshots (project and category text is missing there);
  the measurements were taken after the animations.
- Footer positions (= page heights) for all 26 www routes at both sizes: `docs/visual-parity/footer-positions.tsv`
  (`scripts/parity/footer-position.mjs`).
- Remaining text-width differences come from font rendering (macOS vs Linux) and the licensed-font substitutes
  below; the Hebrew site font itself is the identical file.

## Fonts (investigated first)

| Used on Wix for | Wix font | What it is | Licence | Local | Decision |
|---|---|---|---|---|---|
| Almost all Hebrew text, menu, headings | uploaded `wfont_349df3_b29a…` | **Assistant ExtraLight** 3.000 | SIL OFL | `Lushi` = **byte-identical** file (SHA-256 `c5125230…` woff2, `845b4528…` woff) | Kept |
| About and thank-you body | uploaded `wfont_3c0642_c6470bd7…` | **Heebo Regular** 3.001 | SIL OFL | was missing | **Added**, self-hosted (`public/fonts/heebo-400-*`, licence file) |
| About and thank-you title | uploaded `wfont_3c0642_e0cb7c2a…` | **Heebo ExtraLight** 3.001 | SIL OFL | was missing | **Added** (`public/fonts/heebo-200-*`) |
| Contact email/phone, "צפו בפרויקטים" | Open Sans Hebrew Condensed | Apache 2.0 | | Open Sans at `font-stretch: 75%` (its successor, already loaded) |
| Top-bar phone, home contact | Avenir LT 35 Light | Commercial (Monotype), Wix sites only | | Nunito Sans 300 (substitute; cannot be reused) |
| Subtitles, "שליחה" | Futura LT Book | Commercial, Wix only; **no Hebrew letters** | | Josefin Sans → Hebrew falls back to the browser's sans-serif, as on Wix |
| Quote, some project texts, legal page | Brandon Grotesque Light | Commercial, Wix only; **no Hebrew letters** | | same as Futura |
| Some headings | Times New Roman (system) | system | | system Times New Roman |
| Landing pages | Open Sans, Noto Sans Hebrew, Tahoma (system), system UI (thank-you / 404) | OFL / system | | same fonts |

No font file is missing from the build, blocked, served with a wrong type or loaded from Wix.

## Root causes found (and fixed once, in the shared component)

1. **Mirrored horizontal order.** Wix positions elements left to right; the RTL templates mirrored every multi-column
   row. Fixed with `direction: ltr` on the row and `rtl` inside (contact page, values row, category grid, galleries,
   splits, footer, social icons).
2. **Generic heading classes** instead of the per-component sizes Wix uses. Replaced by measured values per template.
3. **Simplified templates** (About, contact, category header, footer, home contact block, hero caption, project
   pages, landing pages). Rebuilt from measurements.
4. **Missing Heebo fonts** (About). Added.
5. **Mobile derived from desktop** instead of the Wix 320px mobile design. Rebuilt per template with `--m`.
6. **Landing pages at the wrong scale** (940px content, 50px hero title, 340px fields). Rebuilt to the WordPress
   measurements (1140px content, 83px title, 278px fields, one-row footer).
7. **Content bugs found on the way:** 12 project galleries were truncated in the original migration (359 photos
   missing; now 801 photos, all verified against Wix by fingerprint); the home tasting gallery lacked Wix's 10th
   item; the two press videos were shown as still images; decorative rules and the ellipse around the home logo mark
   were missing.

## Fixes by template (what changed, evidence)

| Template / component | Fix | Evidence |
|---|---|---|
| Header (all www) | Top bar icons 29px, phone icon 28px, menu cells 131px, shadow, dropdown arrows; **phone (new):** Wix mobile header (white, grey icons top left, logo 240×84, black 280×8 bar, pinned menu button) and the Wix menu panel (260px from the right, grey veil, mark in a circle, centred items, current page grey, arrows for sub-menus) | `side-d-*`, `side-m-home-top`, `side-m-menu` |
| Footer (all www) | Desktop: right-aligned text, icons left (Facebook, Instagram); phone: Wix 122px band, centred copyright, credit box | measured (all pages), `side-m-home-gallery` |
| Home | Hero caption bottom right 50/45 + 30/27; 73% photo over black; Wix dots and arrow sides; intro link order; ellipse around the mark; values left to right with per-item text positions; splits at Wix positions with the Wix hover photo swap; quote #041f3e band with the photo at 66%; tasting strip 1216px, one photo every 4 s, white arrow, 10 items as on Wix; contact block centred 8px right, email/phone with the 1px rule, Facebook-Instagram, boxed 460px form. **Phone:** the Wix order (contact before quote and gallery), no homes photo, envelope/phone icons with a rule, 260px form, 82×109 strip | `_-1440.json` page height 5040 vs 5039; `side-d-home`, `side-m-home-*` |
| About | Side photos 404/403 × 724, #f9f9f9 centre, Heebo ExtraLight 75px title, Futura subtitle, Heebo 16/24 body; **phone:** Wix column with the round portrait and the first photo below | page height 1117 = 1117; `side-d-about`, `side-m-about` |
| Contact page | Grid at Wix positions, rule beside the text, underline form; **phone:** Wix field heights and 120px pill button, photo not stretched | page height 1399 = 1399; `side-d-contact`, `side-m-contact` |
| Category pages | Header grid, 2×478px cards, gradient captions, **rules** (233px under the title, 190px beside the mark); **phone:** centred header with the 172px rule, 2×137px grid, titles only | `side-d-private`, `side-m-private` |
| Project pages (18) | Per-page layout data (title position, column, justify, sizes, bold words, subtitle, Brandon), full galleries in the Wix 3×197px grid, **vertical rule** right of the title (per-page height, measured on all 17), collage for הבן-של-הנגר; **phone:** Wix mobile column, 3×91px grid, Wix's own mobile collage arrangement | texts verified identical (SHA-1); `side-d-project`, `side-m-project` |
| Press (`/portfolio`) | **Removed** (owner, 2026-10-19): no page, no menu item, no videos; `/portfolio` and the old `/portfolio-collections/*` items redirect (301) to `/` | `site.test.mjs`, `preview-routing.e2e.mjs` |
| Accessibility statement | Wix column 250–1205, Brandon 56px title, Times 40/56 heading, 20/28 text with Wix's empty lines | every block's y position identical to Wix; height 1403 vs 1402 |
| Thank-you (www) | Rebuilt as the Wix thank-you page (About layout, its photos, Wix text "תודה" / "אני אחזור אליכם בהקדם האפשרי" / "מוזמנים להתרשם מהפרוייקטים האחרונים באתר") | page height 1108 = 1108 |
| Landing pages | 1140px content; hero 760px, 40% veil, 83px title, Tahoma subtitle; intro, about (290×435 photo), testimonials (Wix veil, 939px card, name under the card), green form (4 equal columns, consent under the button on the left), one-row footer with dotted links, header shadow; **phone:** WordPress 390px sizes (48px hero title, 36px headings, photo under the text, one-column form with the consent before the button) | page height 4545 vs 4547; `side-d-lp-gallery` |
| Empty space under the content (owner decision 2026-10-19) | Wix leaves empty page under many galleries and on the phone thank-you page. Reproduced with a minimum page-body height per route measured on Wix (`src/data/page-heights.mjs`, applied in `Base.astro`); the phone thank-you page keeps its grey band with the photo at the bottom | footer top equal to Wix (±1px) on all 26 routes × 2 sizes — `footer-positions.tsv`; `side-m-thankyou-bottom`, `side-m-project-bottom` |
| Project galleries | Wix shows the first **24** photos of a project gallery on desktop and **25** on phones; the rest only in the full-screen viewer. Same now (all photos stay in the viewer). The הבן-של-הנגר collage is cut at 8961px on desktop as on Wix | page heights equal on all 18 projects |
| Forms | No " *" in the placeholders (as on Wix); required fields keep a hidden "(שדה חובה)" in the label, `aria-required` and the same validation | `forms.e2e.mjs` 336/336 |
| Footer year | © 2025 as on Wix (`site.copyrightYear`) | |
| Landing legal / thank-you / 404 | Legal pages styled as on WordPress (the accessibility statement had no styles at all); thank-you rebuilt as on WordPress (flush right, envelope icon, grey WhatsApp button); 404 in the WordPress theme style | WordPress measurements in this doc; `side-d-lp-thankyou` |

Forms and states: validation, consent, lead submission, honeypot, outcomes and tracking are unchanged; only CSS and
layout changed. Checked with `forms.e2e.mjs` (336 checks), `main-site.e2e.mjs` (44) and `preview-routing.e2e.mjs`
(6) against the mock CRM.

## Route inventory and status

**PASS** verified against the reference (measurements and side-by-side screenshots), only font-rendering
differences left · **PARTIAL** differences remain (listed) · **BLOCKED** no usable reference.
Tablet for every route: **PARTIAL** — Wix has no tablet design; the desktop composition is fitted to the width and
passes the responsive checks at 768/820/1024/1180 (0 problems in 315 page views).

| Route | Template | Reference | Desktop | Phone | Remaining differences |
|---|---|---|---|---|---|
| `/` | home | Wix | PARTIAL | PARTIAL | value icons are our own drawings (Wix vector art is licensed to Wix sites); quote photo without Wix's parallax; hero and quote photos without Wix's parallax zoom; on phones the businesses photo shows the first photo (Wix shows its hover photo) |
| `/אודות` | about | Wix | **PASS** | **PASS** | text wraps slightly differently (font rendering) |
| `/יצירת-קשר` | contact | Wix | **PASS** | PARTIAL | phone: block ~8px lower than Wix (page height and footer match) |
| `/לקוחות-פרטיים` | category | Wix | **PASS** | PARTIAL | phone: the intro wraps one line shorter (font rendering), so the grid sits ~30px higher; page height and footer match |
| `/מסחריים` | category | Wix | **PASS** | PARTIAL | as above |
| 18 project pages | project | Wix | **PASS** (מיברג, יוניקורן measured; all 18 page heights equal) | **PASS** (מיברג measured; all heights equal) | the other 15 not compared item by item; the photos in the viewer beyond Wix's 24/25 are the full Wix gallery lists |
| `/הצהרתנגישות` | legal | Wix | **PASS** | PARTIAL | the non-functional "Click Here" button is left out (owner decision); email lushi.office@gmail.com (owner decision of 2026-10-12); phone measured for heights only |
| `/thankyou` | thank-you | Wix | PARTIAL | PARTIAL | the WhatsApp line below the text is not on Wix; kept as a tracked contact link (owner decision; its number is unchanged until verified) |
| 404 (www) | 404 | **BLOCKED** | — | — | Wix shows its own English platform error page ("This page isn't available"), not a site design; our branded 404 is kept |
| lp `/architecture/` | landing | WordPress | PARTIAL | PARTIAL | measured; within a few px except hover captions (WordPress has a title per photo, we show one caption) and 44px phone fields (WordPress 35px; kept 44px for touch) |
| lp `/`, `/interior-design/`, `/renovation/` | landing | WordPress | PARTIAL | PARTIAL | same template; hero and section heights measured, not compared item by item |
| lp `/thankyou/` | lp thank-you | WordPress | PARTIAL | PARTIAL | rebuilt to WordPress; the WhatsApp button links to 054-431-7164 as on WordPress (owner, 2026-10-19) |
| lp `/privacy/`, `/accessibility-statement/` | lp legal | WordPress | PARTIAL | PARTIAL | styles measured; long privacy text not compared line by line |
| lp 404 | lp 404 | WordPress | PARTIAL | PARTIAL | WordPress text "העמוד המבוקש לא נמצא." / "עושה רושם…" differs from ours "העמוד לא נמצא" + home link (text change needs approval) |

Routes verified PASS at all sizes: **0 of 34** (desktop PASS: 9 of 34 counting each project page; phone PASS: 3 groups —
About and the project pages by height; BLOCKED: 1).

## Owner decisions (2026-10-19) and open items

Applied: project pages without previous/next/all-projects links; Wix's empty spaces reproduced (page heights); no " *"
in placeholders (hidden "(שדה חובה)" kept for screen readers); © 2025; no "Click Here" button on the accessibility
page; the main-site thank-you WhatsApp line kept (main-site number). Then: press page removed with its videos and
thumbnails (`/portfolio` → `/`); landing-page WhatsApp number 054-431-7164 on every lp WhatsApp link (floating
button, thank-you button, form failure message); lp call links 052-594-9682 (owner, 2026-10-19), never mixed with the WhatsApp number.

Media: copied from Wix through the owner's browser (2026-10-19) because the workspace cannot reach Wix and the GitHub
Action would commit: 372 original photos (207 MB, `originals/`) and the round portrait, then `npm run fetch-media` made
the WebP versions (`public/media/`). The two press videos copied the same day were deleted again when the press page
was removed, with the press thumbnails; `fetch-media` no longer downloads videos. `npm run check-launch` fails if any
main-site image would still load from Wix. All 52 page loads (26 routes × 2 sizes, before the press page was removed)
made **no request to any Wix host**; 1810 images loaded, none broken.

Still open:
- **O-7 / value icons:** our own drawings (the Wix vector art is licensed to Wix sites). Replace if the owner has the
  originals.
- Tablet: Wix has no tablet layout (see above).

## Tests and checks (2026-10-19, after the press removal and number change, on the built output)

- `npm run build`: OK (34 www pages, lp pages split into `dist-lp`).
- `npm test`: 98 pass, 0 fail (new: the `/portfolio` redirect and no press page, link or video in the build).
- `test/e2e/forms.e2e.mjs` 350/350 (lp WhatsApp links 054-431-7164 and lp call links 052-594-9682 on all 7 lp pages, never mixed),
  `main-site.e2e.mjs` 44/44, `preview-routing.e2e.mjs` 9/9 (`/portfolio`, `/portfolio?utm_source=test` and an old
  `/portfolio-collections/…` item answer 301 → `/`, query string kept). Mock CRM only.
- `test/e2e/responsive.e2e.mjs`: 0 problems in 306 page views (all pages, 9 phone and tablet sizes).
- `npm run check-launch`: "Repository checks passed" ("0 still load from Wix"; "WhatsApp numbers: landing pages
  054-431-7164, main site 050-578-8634").
