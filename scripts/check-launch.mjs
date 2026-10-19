// Pre-launch check: run `npm run check-launch` before pointing the domain at Cloudflare.
// Fails (exit 1) if anything in the repository that would lose leads, URLs or statistics is missing.
// Items that live only in a dashboard (Worker secret, DNS, GTM) are listed as manual checks.
import fs from 'node:fs';
import { site, allMedia } from '../src/data/content.mjs';
import { img } from '../src/lib/media.mjs';
import { lpSite, lpUsedMedia, lpImg } from '../src/data/lp.mjs';
import { pendingDecisions, outOfScopePending, ownerReviewPending } from '../src/data/url-inventory.mjs';
import { render as redirectList } from './redirect-list.mjs';

const results = [];
const check = (ok, label, fix) => results.push({ ok, label, fix });

/** Reads a .jsonc file: strips // and /* comments outside strings, then parses. */
function readJsonc(file) {
  const src = fs.readFileSync(file, 'utf8');
  let out = '', inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { out += c; if (c === '\\') { out += n; i++; } else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

// --- Cloudflare configuration
let wr = null;
try { wr = readJsonc('wrangler.jsonc'); } catch { /* reported below */ }
check(Boolean(wr), 'Cloudflare config exists and parses (wrangler.jsonc)', 'Restore wrangler.jsonc (see docs/CLOUDFLARE-PLAN.md, task C1)');
check(wr?.assets?.directory === './dist', 'Static assets come from the Astro build (assets.directory = ./dist)', 'Set assets.directory to "./dist" in wrangler.jsonc');
check(wr?.assets?.html_handling === 'drop-trailing-slash', 'URLs keep the Wix form, no trailing slash (html_handling)',
  'Set assets.html_handling to "drop-trailing-slash" in wrangler.jsonc');
check(wr?.assets?.not_found_handling === '404-page', 'Unknown URLs get the 404 page (not_found_handling)', 'Set assets.not_found_handling to "404-page"');
check((wr?.assets?.run_worker_first || []).includes('/api/*') && fs.existsSync(wr?.main || ''), 'Lead endpoint Worker is wired up (/api/* → worker/index.js)',
  'Set "main": "worker/index.js" and assets.run_worker_first: ["/api/*"]');
const wrText = fs.existsSync('wrangler.jsonc') ? fs.readFileSync('wrangler.jsonc', 'utf8') : '';
check(!/https?:\/\/[^\s"]*\/api\/leads|Bearer\s+\w/i.test(wrText) && !wr?.vars?.CRM_WEBHOOK_URL && !wr?.vars?.LEADS_WEBHOOK_API_KEY,
  'No CRM address or key in wrangler.jsonc (they must be Worker secrets)', 'Remove them from wrangler.jsonc and set them as secrets');

// --- URLs
const redirects = fs.existsSync('public/_redirects')
  ? fs.readFileSync('public/_redirects', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')) : [];
check(redirects.some((l) => l.startsWith('/home ')) && redirects.length >= 16, `Old Wix URLs redirect (${redirects.length} rules in public/_redirects)`,
  'Restore public/_redirects (see docs/MIGRATION-REVIEW.md, section 5)');
check(fs.existsSync('public/_headers'), 'Cache headers are set (public/_headers)', 'Restore public/_headers');
check(!fs.existsSync('firebase.json'), 'No leftover Firebase config', 'Delete firebase.json (hosting is Cloudflare)');

// --- Leads and measurement
check(site.leadEndpoint === '/api/lead', 'Forms post to the lead endpoint (/api/lead)', 'Set site.leadEndpoint to "/api/lead" in src/data/content.mjs');
check(fs.existsSync('src/pages/thankyou.astro'), 'Thank-you page exists (/thankyou)', 'Restore src/pages/thankyou.astro');
check(site.gtmId === 'GTM-KJRR2DNT', 'Google Tag Manager container unchanged (GTM-KJRR2DNT)',
  'site.gtmId must stay GTM-KJRR2DNT unless the owner approves a change');
check(/^\d{10,15}$/.test(site.whatsapp?.number || ''), 'WhatsApp number is set',
  'Set site.whatsapp.number in international format without "+", e.g. 972505788634');

// --- Content
const media = fs.existsSync('public/media') ? fs.readdirSync('public/media').length : 0;
check(media > 100, `Images are stored locally (${media} files in public/media)`,
  'Run "npm run fetch-media" or the "Copy images from Wix" GitHub Action');
// Every image the main site uses must be served from public/media, not from Wix (Wix goes away at launch).
const onWix = allMedia().filter((m) => !img(m).src.startsWith('/media/'));
check(onWix.length === 0, `Main-site images stored locally (${onWix.length} still load from Wix)`,
  'Run the "Copy images from Wix" GitHub Action (or npm run fetch-media where Wix is reachable), then rebuild');

// --- Landing pages (lp.hagarlushi.com, second Worker)
let wrl = null;
try { wrl = readJsonc('wrangler.lp.jsonc'); } catch { /* reported below */ }
check(Boolean(wrl) && wrl.name !== wr?.name, 'Landing-page Worker config exists (wrangler.lp.jsonc, separate Worker)', 'Restore wrangler.lp.jsonc');
check(wrl?.assets?.directory === './dist-lp' && wrl?.assets?.html_handling === 'force-trailing-slash',
  'Landing pages keep the WordPress URLs with a trailing slash (dist-lp, force-trailing-slash)', 'Set assets.directory "./dist-lp" and html_handling "force-trailing-slash"');
check((wrl?.assets?.run_worker_first || []).includes('/api/*') && wrl?.main === 'worker/index.js',
  'Landing-page forms use the same lead endpoint (/api/* → worker/index.js)', 'Set "main": "worker/index.js" and run_worker_first ["/api/*"] in wrangler.lp.jsonc');
const wrlText = fs.existsSync('wrangler.lp.jsonc') ? fs.readFileSync('wrangler.lp.jsonc', 'utf8') : '';
check(!/https?:\/\/[^\s"]*\/api\/leads|Bearer\s+\w/i.test(wrlText) && !wrl?.vars?.CRM_WEBHOOK_URL && !wrl?.vars?.LEADS_WEBHOOK_API_KEY,
  'No CRM address or key in wrangler.lp.jsonc', 'Remove them and set them as secrets on hagarlushi-lp');
const lpPagesBuilt = ['index.html', 'architecture/index.html', 'interior-design/index.html', 'renovation/index.html',
  'thankyou/index.html', 'privacy/index.html', 'accessibility-statement/index.html'].filter((f) => fs.existsSync(`dist-lp/${f}`)).length;
check(lpPagesBuilt === 7, `All 7 landing pages are built (${lpPagesBuilt}/7 in dist-lp)`, 'Run npm run build');
const missingMedia = lpUsedMedia().filter((m) => lpImg(m).local === false);
check(missingMedia.length === 0, `Landing-page images stored locally (${lpUsedMedia().length - missingMedia.length}/${lpUsedMedia().length})`,
  'Run the "Copy landing-page images" GitHub Action (fetch-lp-media.yml)');
check(lpSite.siteKitTagId === 'GT-TQKZV73G', 'Landing-page Google tag unchanged (GT-TQKZV73G, from Site Kit)', 'lpSite.siteKitTagId must stay GT-TQKZV73G unless the owner approves');

// --- Owner decisions (docs/REDIRECT-APPROVALS.md, docs/LANDING-PAGE-INVENTORY.md §7)
const open = pendingDecisions();
check(open.length === 0, `In-scope content redirects approved by the owner (${open.length} open)`,
  `Owner approval needed (docs/REDIRECT-APPROVALS.md, group B), then set approved: true in src/data/url-inventory.mjs:\n${open.map((e) => `      - ${e.host} ${e.url} → ${e.to}: ${e.reason}`).join('\n')}`);
const review = ownerReviewPending();
check(review.length === 0, `Owner review of copied legal text (${review.length} pending)`,
  `Pending the owner's review on the preview site (not done yet). After the owner confirms, remove ownerReview from the entry in src/data/url-inventory.mjs:\n${review.map((e) => `      - ${e.host} ${e.url}: ${e.note}`).join('\n')}`);
check(fs.existsSync('docs/REDIRECT-APPROVALS.md') && fs.readFileSync('docs/REDIRECT-APPROVALS.md', 'utf8') === redirectList(),
  'Redirect approval list is up to date (docs/REDIRECT-APPROVALS.md)', 'Run npm run redirect-list');
check(lpSite.phoneHref === 'tel:+972525949682' && !lpSite.phoneHref.includes(lpSite.whatsapp.number),
  'Landing-page calls: 052-594-9682, separate from the WhatsApp number', 'Fix lpSite.phone / lpSite.phoneHref');
check(lpSite.whatsapp.number === '972544317164' && site.whatsapp.number === '972505788634',
  'WhatsApp numbers: landing pages 054-431-7164, main site 050-578-8634', 'Fix lpSite.whatsapp / site.whatsapp');
const outPending = outOfScopePending();

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? '✔' : '✘'} ${r.label}`);
  if (!r.ok) { failed++; console.log(`    → ${r.fix}`); }
}
if (outPending.length) {
  console.log(`\nNot blocking: ${outPending.length} redirects of out-of-scope Wix pages await approval (docs/REDIRECT-APPROVALS.md, groups C–D):`);
  for (const e of outPending) console.log(`  · ${e.url} → ${e.to}${e.campaignCheck ? '   [check active campaigns first]' : ''}`);
}

console.log(`
Manual checks (cannot be verified from the repository):
  ☐ Worker secrets set on hagarlushi AND hagarlushi-lp: CRM_WEBHOOK_URL (OfficeCRM leads webhook) and LEADS_WEBHOOK_API_KEY (bare key)
  ☐ WordPress admin checked: what the Elementor form did on submit (email, webhook, redirect) — inventory section 4
  ☐ A test lead from each form on the workers.dev preview was created in OfficeCRM (and deleted afterwards)
  ☐ DNS: every Wix record copied to Cloudflare, including lp. and office. (OfficeCRM), MX, SPF/DKIM/DMARC
  ☐ GTM: triggers for generate_lead / whatsapp_click / phone_click / email_click published
  ☐ GTM: Google Ads conversion on lp still fires (lp /thankyou/ page view, or moved to generate_lead)
  ☐ Google Ads / Meta final URLs checked: no active ad uses /דף-נחיתה-פרטיים, /דף-נחיתה-פרטי, /דףנחיתה2 (REDIRECT-APPROVALS D)
  ☐ GTM: whatsapp_click is NOT a conversion (not linked to Google Ads / Meta Lead) — docs/ANALYTICS-EVENTS.md
  ☐ DNS cutover: delete the en and he records (unused); keep office exactly
See LAUNCH.md and docs/CLOUDFLARE-PLAN.md.`);
console.log(failed ? `\n${failed} repository item(s) to fix before launch.` : '\nRepository checks passed.');
process.exit(failed ? 1 : 0);
