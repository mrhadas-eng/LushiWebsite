// Every URL in src/data/url-inventory.mjs (all URLs discovered on www./lp. on 2026-10-11) must be
// served by the new site or covered by a redirect rule — and nothing may be served that is not inventoried.
// Static checks on the build output: run `npm run build` first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { inventory, pendingDecisions, outOfScopePending, retired, ownerReviewPending } from '../src/data/url-inventory.mjs';

const built = fs.existsSync('dist/index.html') && fs.existsSync('dist-lp/index.html');
const skip = !built && 'run npm run build first';
const DIR = { www: 'dist', lp: 'dist-lp' };

const rules = (file) => fs.readFileSync(file, 'utf8').split('\n')
  .filter((l) => l.trim() && !l.startsWith('#')).map((l) => { const [from, to, code] = l.trim().split(/\s+/); return { from: decodeURI(from), to, code }; });
const RULES = { www: rules('public/_redirects'), lp: rules('lp-public/_redirects') };

test('Cloudflare redirect sources percent-encode non-ASCII paths', () => {
  for (const file of ['public/_redirects', 'lp-public/_redirects']) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'))) {
      const from = line.trim().split(/\s+/)[0];
      assert.equal(from, encodeURI(decodeURI(from)), `${file}: ${from}`);
    }
  }
});

/** Does the build serve this URL as a page or file? */
function served(host, url) {
  const dir = DIR[host];
  const p = decodeURI(url);
  if (p === '/') return fs.existsSync(path.join(dir, 'index.html'));
  if (/\.(xml|txt)$/.test(p)) return fs.existsSync(path.join(dir, p));
  return fs.existsSync(path.join(dir, p.replace(/\/$/, ''), 'index.html'));
}
/** The redirect rule that matches a URL (exact first, then a trailing * wildcard). */
function ruleFor(host, url) {
  return RULES[host].find((r) => r.from === url)
    ?? RULES[host].find((r) => r.from.endsWith('*') && url.startsWith(r.from.slice(0, -1)));
}
const all = (dir) => fs.readdirSync(dir, { recursive: true }).map(String)
  .filter((f) => f.endsWith('index.html') && !f.startsWith('_astro'))
  .map((f) => '/' + f.replace(/\/?index\.html$/, ''));

test('inventory entries are well-formed and unique', () => {
  const seen = new Set();
  for (const e of inventory) {
    const key = `${e.host} ${e.url}`;
    assert.ok(!seen.has(key), `duplicate ${key}`); seen.add(key);
    assert.ok(['www', 'lp', 'apex', 'en', 'he', 'office'].includes(e.host), key);
    assert.ok(['implemented', 'redirect', 'retired', 'remove-dns', 'external'].includes(e.status), key);
    if (e.status === 'redirect') { assert.ok(e.to, `${key}: redirect without target`); assert.equal(typeof e.approved, 'boolean', key); }
    if (e.status === 'retired' || e.status === 'remove-dns' || e.status === 'external' || e.campaignCheck || (e.status === 'redirect' && !e.technical)) assert.ok(e.reason, `${key}: reason required`);
  }
});

test('every inventoried www/lp URL is either served at the same URL or redirected by a rule', { skip }, () => {
  for (const e of inventory.filter((x) => DIR[x.host])) {
    const key = `${e.host} ${e.url}`;
    if (e.status === 'implemented') {
      assert.ok(served(e.host, e.url), `${key}: no page in ${DIR[e.host]}`);
      assert.ok(!RULES[e.host].some((r) => r.from === e.url), `${key}: a redirect rule hides this page`);
    } else if (e.status === 'retired') {
      assert.ok(!served(e.host, e.url), `${key}: retired URL is served`);
      assert.ok(!ruleFor(e.host, e.url), `${key}: retired URL has a redirect rule`);
    } else {
      const r = ruleFor(e.host, e.url);
      assert.ok(r, `${key}: no redirect rule`);
      assert.equal(r.to, e.to, `${key}: rule goes to ${r.to}, inventory says ${e.to}`);
      assert.equal(r.code, '301', key);
      assert.ok(!served(e.host, e.url), `${key}: redirected URL is also a page`);
    }
  }
});

test('every page and redirect rule in the build is inventoried (nothing added or dropped silently)', { skip }, () => {
  for (const host of ['www', 'lp']) {
    const urls = new Set(inventory.filter((e) => e.host === host).map((e) => decodeURI(e.url)));
    for (const p of all(DIR[host])) {
      if (p === '/404') continue;
      const url = host === 'lp' && p !== '/' ? `${p}/` : p;
      assert.ok(urls.has(decodeURI(url)), `${host}: page ${url} is built but not in the inventory`);
    }
    for (const r of RULES[host]) {
      const covered = r.from.endsWith('*') ? inventory.some((e) => e.host === host && e.rule === r.from) : urls.has(r.from);
      assert.ok(covered, `${host}: redirect rule ${r.from} is not in the inventory`);
    }
  }
});

test('redirects: targets exist, no chains or loops, campaign parameters are not overwritten', { skip }, () => {
  for (const host of ['www', 'lp']) {
    for (const r of RULES[host]) {
      assert.ok(served(host, r.to), `${host}: ${r.from} → ${r.to} target missing`);
      assert.ok(!RULES[host].some((x) => x.from === r.to), `${host}: ${r.from} → ${r.to} is a chain/loop`);
      assert.notEqual(r.from, r.to, `${host}: ${r.from} redirects to itself`);
      // Cloudflare keeps the incoming query string (utm_*, gclid, fbclid) unless the target sets its own.
      assert.ok(!r.to.includes('?'), `${host}: ${r.from} target would replace the campaign parameters`);
    }
  }
});

test('no landing-page URL is redirected to a homepage silently', () => {
  for (const e of inventory.filter((x) => x.status === 'redirect' && x.to === '/' && !x.technical)) {
    assert.ok(e.reason, `${e.host} ${e.url}`);
    // Stays an open owner decision unless the owner approved it explicitly (approval date recorded).
    if (e.approved) assert.match(e.approvedOn || '', /^\d{4}-\d{2}-\d{2}$/, `${e.host} ${e.url}: approved without an owner decision date`);
    assert.notEqual(e.host, 'lp', `${e.host} ${e.url}: lp pages are never redirected to the homepage`);
  }
  // Every real lp page keeps its own URL.
  for (const u of ['/', '/architecture/', '/interior-design/', '/renovation/', '/thankyou/', '/privacy/', '/accessibility-statement/'])
    assert.equal(inventory.find((e) => e.host === 'lp' && e.url === u)?.status, 'implemented', u);
});

test('scope: no redirect blocks launch or awaits approval; lp author archives are retired (404, not recreated); every out-of-scope Wix redirect is owner-approved', () => {
  assert.deepEqual(pendingDecisions(), []);
  assert.deepEqual(retired().map((e) => `${e.host} ${e.url}`).sort(), ['lp /author/gal/', 'lp /author/roy/']);
  // All out-of-scope Wix redirects are approved (9 on 2026-10-28, the 3 old landing pages on 2026-10-20): none waits.
  assert.deepEqual(outOfScopePending().map((e) => `${e.host} ${e.url}`), [], 'out-of-scope Wix redirects still awaiting approval');
  assert.ok(inventory.filter((e) => e.scope === 'out').every((e) => e.host === 'www' && !e.technical && e.reason && e.approved));
  // The 3 old Wix landing pages were approved by the owner on 2026-10-20: none waits for a campaign check.
  assert.equal(inventory.filter((e) => e.campaignCheck).length, 0);
  for (const e of inventory.filter((x) => x.status === 'redirect' && x.approved && !x.technical))
    assert.match(e.approvedOn || '', /^\d{4}-\d{2}-\d{2}$/, `${e.host} ${e.url}: approved content redirect without an owner decision date`);
  for (const e of inventory.filter((x) => x.technical && x.status === 'redirect')) assert.equal(e.approved, true, `${e.host} ${e.url}`);
});

test('en. and he. are unused and planned for DNS removal; office. is untouched', () => {
  for (const h of ['en', 'he']) assert.equal(inventory.find((e) => e.host === h).status, 'remove-dns');
  assert.equal(inventory.find((e) => e.host === 'office').status, 'external');
});

test('the redirect approval list is up to date (npm run redirect-list)', async () => {
  const { render } = await import('../scripts/redirect-list.mjs');
  assert.equal(fs.readFileSync('docs/REDIRECT-APPROVALS.md', 'utf8'), render());
});

test('privacy policy: owner approval is recorded; cookie/storage audit and policy update remain post-launch tasks', () => {
  assert.deepEqual(ownerReviewPending(), []);
  const privacy = inventory.find((e) => e.host === 'lp' && e.url === '/privacy/');
  assert.equal(privacy?.status, 'implemented');
  assert.match(privacy?.note ?? '', /approved by the owner for launch/);
  assert.match(privacy?.note ?? '', /post-launch tasks/);
});
