// Every URL discovered on the old properties (2026-10-11), and what the new site does with it.
// Human-readable version with evidence: docs/LANDING-PAGE-INVENTORY.md. Checked by test/inventory.test.mjs
// and scripts/check-launch.mjs.
//
// status:
//   implemented – the new site serves this exact URL
//   redirect    – 301 to `to`. approved:true only for technical URLs or after the owner approved it;
//                 approved:false redirects are DECISIONS REQUIRED before cutover (check-launch fails)
//   retired     – not recreated and not redirected (owner decision): the URL returns the 404 page
//   remove-dns  – unused subdomain (owner confirmed 2026-10-11): delete its DNS record at cutover
//   external    – not part of this website (keep as is)
// Redirect kinds: technical:true – no visitor content is lost (sitemaps, feeds, WordPress slugs,
//                 template demo items, apex → www); content – a page with visible content is retired.
// scope: 'out' – an obsolete Wix page outside the agreed landing-page migration scope (owner,
//                 2026-10-11): not recreated; its redirect awaits approval but does NOT block launch.
// ownerReview:true – content copied unchanged that the owner reviews on the preview site before lp cutover.
// host: www (www.hagarlushi.com), lp (lp.hagarlushi.com), apex, en, he, office

const www = (url, extra = {}) => ({ host: 'www', url, ...extra });
const lp = (url, extra = {}) => ({ host: 'lp', url, ...extra });
const done = { status: 'implemented' };

export const inventory = [
  // ------------------------------------------------ www.hagarlushi.com (Wix) – pages kept at the same URL
  ...['/', '/אודות', '/מסחריים', '/לקוחות-פרטיים', '/יצירת-קשר', '/הצהרתנגישות',
    '/להיות-יפה-שירלי', '/אור-לעתיד', '/מיברג', '/סטון-גלרי', '/יוניקורן', '/copy-of-יוניקורן-1', '/געתון',
    '/copy-of-יוניקורן', '/מסודרים-ליד-ביבי', '/מנהל-הפרויקט', '/אבק-כוכבים', '/דירה-להשכיר', '/האקדמיים',
    '/יפה-להשכרה', '/עיצוב-מחדש', '/צאו-לחופשה', '/פסיכולוגית-אלגנטית', '/הבן-של-הנגר'].map((u) => www(u, done)),
  www('/thankyou', { status: 'implemented', noindex: true, note: 'Wix thank-you page (text: "תודה אני אחזור אליכם בהקדם האפשרי…"); new page at the same URL, final text pending' }),

  // Press page ("מהעיתונות") removed from the new site (owner decision, 2026-10-19): its address goes to the home page.
  www('/portfolio', { status: 'redirect', to: '/', approved: true, approvedOn: '2026-10-19',
    reason: 'Press page ("מהעיתונות") removed from the site (owner decision, 2026-10-19)' }),

  // ------------------------------------------------ www – duplicates / near-empty Wix pages (content verified 2026-10-11)
  // Out of scope (owner, 2026-10-11): not migrated. Redirects approved by the owner on 2026-10-28, so the old
  // addresses don't 404.
  www('/copy-of-להיות-יפה', { scope: 'out', status: 'redirect', to: '/דירה-להשכיר', approved: true, approvedOn: '2026-10-28', reason: 'Duplicate of the "דירה להשכיר" project page' }),
  www('/להיות-יפה', { scope: 'out', status: 'redirect', to: '/להיות-יפה-שירלי', approved: true, approvedOn: '2026-10-28', reason: 'Older copy of the "להיות יפה" project page' }),
  www('/redesign', { scope: 'out', status: 'redirect', to: '/עיצוב-מחדש', approved: true, approvedOn: '2026-10-28', reason: 'Duplicate of the "עיצוב מחדש" project page' }),
  www('/go-on-vacation', { scope: 'out', status: 'redirect', to: '/צאו-לחופשה', approved: true, approvedOn: '2026-10-28', reason: 'Duplicate of the "צאו לחופשה" project page' }),
  www('/הבן-של-הנגר3', { scope: 'out', status: 'redirect', to: '/הבן-של-הנגר', approved: true, approvedOn: '2026-10-28', reason: 'Duplicate of the "הבן של הנגר" project page' }),
  www('/bio', { scope: 'out', status: 'redirect', to: '/אודות', approved: true, approvedOn: '2026-10-28', reason: 'Older version of the About text' }),
  www('/home', { scope: 'out', status: 'redirect', to: '/', approved: true, approvedOn: '2026-10-28', reason: 'Empty Wix page' }),
  www('/פרוייקטים', { scope: 'out', status: 'redirect', to: '/לקוחות-פרטיים', approved: true, approvedOn: '2026-10-28', reason: 'Near-empty index ("הפרוייקטים שלי")' }),
  www('/coming-soon', { scope: 'out', status: 'redirect', to: '/', approved: true, approvedOn: '2026-10-28', reason: '"האתר בשיפוצים...נשוב בקרוב!" placeholder' }),

  // ------------------------------------------------ www – old Wix landing pages (live today, real content)
  // Out of scope (owner, 2026-10-11): NOT recreated. Redirects approved by the owner on 2026-10-20 (no campaign
  // check needed).
  www('/דף-נחיתה-פרטיים', { scope: 'out', campaignCheck: false, status: 'redirect', to: '/לקוחות-פרטיים', approved: true, approvedOn: '2026-10-20',
    reason: 'Live Wix landing page with a Wix contact form ("מתכננים עבורכם!")' }),
  www('/דף-נחיתה-פרטי', { scope: 'out', campaignCheck: false, status: 'redirect', to: '/לקוחות-פרטיים', approved: true, approvedOn: '2026-10-20',
    reason: 'Live Wix landing page ("משולחן השרטוט - עד לבית מעוצב…", call/mail buttons, no form)' }),
  www('/דףנחיתה2', { scope: 'out', campaignCheck: false, status: 'redirect', to: '/', approved: true, approvedOn: '2026-10-20',
    reason: 'Live Wix landing page with a form (content not fully captured: mostly Wix widgets)' }),

  // ------------------------------------------------ www – technical
  ...['project-title-1', 'project-title-2', 'project-title-3', 'project-title-4', 'project-title-5', 'project-title-6']
    .map((s) => www(`/portfolio-collections/my-portfolio/${s}`, { status: 'redirect', to: '/', approved: true, technical: true, rule: '/portfolio-collections/*', reason: 'Wix template demo items (stock photos), not studio content' })),
  ...['/pages-sitemap.xml', '/portfolio-projects-sitemap.xml', '/portfolio-collections-sitemap.xml']
    .map((u) => www(u, { status: 'redirect', to: '/sitemap.xml', approved: true, technical: true, reason: 'Old Wix sitemap file' })),
  www('/sitemap.xml', { status: 'implemented', technical: true }),
  www('/robots.txt', { status: 'implemented', technical: true }),

  // ------------------------------------------------ lp.hagarlushi.com (WordPress/Elementor) – all 7 published pages
  lp('/', { status: 'implemented', wpId: 2, note: 'WordPress slug "sample-page" (front page)' }),
  lp('/architecture/', { status: 'implemented', wpId: 387 }),
  lp('/interior-design/', { status: 'implemented', wpId: 321 }),
  lp('/renovation/', { status: 'implemented', wpId: 406 }),
  lp('/thankyou/', { status: 'implemented', wpId: 244, note: 'Google Ads conversion fires on this page view (GTM)' }),
  lp('/privacy/', { status: 'implemented', wpId: 378, note: 'Privacy policy approved by the owner for launch on 2026-10-18; cookie/storage audit and policy update are post-launch tasks.' }),
  lp('/accessibility-statement/', { status: 'implemented', wpId: 9 }),
  lp('/sitemap.xml', { status: 'implemented', technical: true }),
  lp('/robots.txt', { status: 'implemented', technical: true }),

  // ------------------------------------------------ lp – WordPress artifacts
  // Author archives: no redirect needed (owner decision, 2026-10-13). Not recreated; they return the 404 page (noindex).
  lp('/author/gal/', { status: 'retired', reason: 'WordPress author archive (listed in the old sitemap), no content. No redirect needed (owner decision, 2026-10-13): 404' }),
  lp('/author/roy/', { status: 'retired', reason: 'WordPress author archive (via the public users API), no content. No redirect needed (owner decision, 2026-10-13): 404' }),
  lp('/wp-sitemap.xml', { status: 'redirect', to: '/sitemap.xml', approved: true, technical: true }),
  lp('/wp-sitemap-posts-page-1.xml', { status: 'redirect', to: '/sitemap.xml', approved: true, technical: true }),
  lp('/wp-sitemap-users-1.xml', { status: 'redirect', to: '/sitemap.xml', approved: true, technical: true }),
  lp('/sample-page/', { status: 'redirect', to: '/', approved: true, technical: true, reason: 'WordPress slug of the front page' }),
  lp('/sample-page', { status: 'redirect', to: '/', approved: true, technical: true }),
  lp('/feed/', { status: 'redirect', to: '/', approved: true, technical: true, reason: 'Empty RSS feed (no posts)' }),
  lp('/comments/feed/', { status: 'redirect', to: '/', approved: true, technical: true, reason: 'Empty comments feed' }),

  // ------------------------------------------------ other hosts
  { host: 'apex', url: '/', status: 'redirect', to: 'https://www.hagarlushi.com/', approved: true, technical: true, where: 'Cloudflare Redirect Rule (docs/CLOUDFLARE-PLAN.md, O5)', reason: 'hagarlushi.com redirects to www today (Wix)' },
  { host: 'en', url: '/', status: 'remove-dns', reason: 'CNAME to Wix showing the Wix "ConnectYourDomain Error" page; owner confirmed unused (2026-10-11): delete the record at cutover' },
  { host: 'he', url: '/', status: 'remove-dns', reason: 'CNAME to Wix showing the Wix "ConnectYourDomain Error" page; owner confirmed unused (2026-10-11): delete the record at cutover' },
  { host: 'office', url: '/', status: 'external', reason: 'OfficeCRM (A 35.219.200.106) — keep the DNS record exactly' },
];

/** Redirects still awaiting the owner's approval. */
export const unapprovedRedirects = () => inventory.filter((e) => e.status === 'redirect' && !e.approved);
/** Unapproved redirects that block launch (in scope). */
export const pendingDecisions = () => unapprovedRedirects().filter((e) => e.scope !== 'out');
/** Unapproved redirects of out-of-scope Wix pages: listed for approval, not blocking. */
export const outOfScopePending = () => unapprovedRedirects().filter((e) => e.scope === 'out');
/** Content the owner still has to review before cutover. */
export const ownerReviewPending = () => inventory.filter((e) => e.ownerReview);
/** URLs deliberately left to the 404 page (owner decision). */
export const retired = () => inventory.filter((e) => e.status === 'retired');
