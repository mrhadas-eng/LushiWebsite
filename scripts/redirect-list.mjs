// Writes docs/REDIRECT-APPROVALS.md from src/data/url-inventory.mjs: every redirect on the main site
// and on lp.hagarlushi.com, technical vs content, with its approval state. Run: npm run redirect-list
// (test/inventory.test.mjs fails if the file is out of date).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inventory, retired } from '../src/data/url-inventory.mjs';

const HOST = { www: 'www.hagarlushi.com', lp: 'lp.hagarlushi.com', apex: 'hagarlushi.com' };
const redirects = inventory.filter((e) => e.status === 'redirect');

function rows(list) {
  const seen = new Set(), out = [];
  for (const e of list) {
    const from = e.rule || e.url;                 // collapse wildcard rules to one row
    const key = `${e.host} ${from}`;
    if (seen.has(key)) continue; seen.add(key);
    out.push({ ...e, from });
  }
  return out;
}
function table(list, { approveCol }) {
  const head = approveCol
    ? '| # | Site | Old URL | Redirects to (301) | Why | Approved |\n|---|---|---|---|---|---|'
    : '| # | Site | Old URL | Redirects to (301) | Why |\n|---|---|---|---|---|';
  return [head, ...rows(list).map((e, i) => {
    const cells = [i + 1, HOST[e.host], `\`${e.from}\``, `\`${e.to}\``, e.reason || 'Technical URL with no content of its own'];
    if (approveCol) cells.push(e.approved ? 'yes' : '☐ pending');
    return `| ${cells.join(' | ')} |`;
  })].join('\n');
}

export function render() {
  const technical = redirects.filter((e) => e.technical);
  const lpContent = redirects.filter((e) => !e.technical && e.host === 'lp');
  const wwwObsolete = redirects.filter((e) => !e.technical && e.host === 'www' && !e.campaignCheck);
  const wixLanding = redirects.filter((e) => !e.technical && e.campaignCheck);
  return `# Redirect approval list

Generated from \`src/data/url-inventory.mjs\` by \`npm run redirect-list\`; do not edit by hand.
Every redirect (HTTP 301) on the main site (\`www.hagarlushi.com\`, rules in \`public/_redirects\`) and on
\`lp.hagarlushi.com\` (rules in \`lp-public/_redirects\`). Campaign parameters (\`utm_*\`, \`gclid\`, \`fbclid\`) are kept
on every redirect. Unknown URLs get the 404 page. Every real landing page keeps its exact URL and is not listed here.

**How to approve:** reply with the numbers you approve (e.g. "C: approve 1–9") or the ones to change.
Claude then sets \`approved: true\` in the inventory.

| Group | Rules | Blocks launch? |
|---|---|---|
| A. Technical: no visitor content is lost | ${rows(technical).length} | No (pre-approved; tell us if you object) |
| B. Content, lp.hagarlushi.com | ${rows(lpContent).length} | ${rows(lpContent).length ? '**Yes, the lp. cutover** (\`npm run check-launch\` fails until approved)' : 'No (none left)'} |
| C. Content, main site: obsolete Wix pages (out of migration scope) | ${rows(wwwObsolete).length} | No. Without approval, the redirect proposed here goes live with the main site |
| D. Main site: old Wix landing pages (out of scope, not recreated) | ${rows(wixLanding).length} | No, but **check active campaigns first** (below) |

## A. Technical redirects

${table(technical, { approveCol: false })}

## B. Content redirects: lp.hagarlushi.com

${lpContent.length ? table(lpContent, { approveCol: true }) : 'None. The WordPress author archives are not redirected (see "No redirect" below).'}

## C. Content redirects: main site, obsolete Wix pages (approval requested, not blocking)

${table(wwwObsolete, { approveCol: true })}

## D. Old Wix landing pages: pending the campaign check

These are live Wix pages with their own content (two have a Wix form). They are **not** recreated (owner, 2026-10-11).
Before the main site moves to Cloudflare, check that no active Google Ads or Meta ad, and no printed material, links to them:
- Google Ads: Campaigns → Ads → add the "Final URL" column, and search for \`נחיתה\`.
- Meta Ads Manager: Ads → the "Website URL" of each active ad.

If none does, approve the redirect. If one does, change the ad's URL to an lp. page first (e.g. \`https://lp.hagarlushi.com/\`).

${table(wixLanding, { approveCol: true })}

## No redirect: these URLs return the 404 page

Owner decision: no redirect needed, and the pages are not recreated. The 404 page is \`noindex\`, so search engines drop these URLs.

| # | Site | Old URL | Why |
|---|---|---|---|
${retired().map((e, i) => `| ${i + 1} | ${HOST[e.host]} | \`${e.url}\` | ${e.reason} |`).join('\n')}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync('docs/REDIRECT-APPROVALS.md', render());
  console.log('docs/REDIRECT-APPROVALS.md written');
}
