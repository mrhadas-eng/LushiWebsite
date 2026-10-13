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
  .filter((l) => l.trim() && !l.startsWith('#')).map((l) => { const [from, to, code] = l.trim().split(/\s+/); return { from, to, code }; });
const RULES = { www: rules('public/_redirects'), lp: rules('lp-public/_redirects') };

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
    assert.equal(e.approved, false, `${e.host} ${e.url}: must stay listed as an owner decision until approved`);
  }
  // Every real lp page keeps its own URL.
  for (const u of ['/', '/architecture/', '/interior-design/', '/renovation/', '/thankyou/', '/privacy/', '/accessibility-statement/'])
    assert.equal(inventory.find((e) => e.host === 'lp' && e.url === u)?.status, 'implemented', u);
});

test('scope: no redirect blocks launch; lp author archives are retired (404, not recreated); out-of-scope Wix pages are listed but do not block', () => {
  assert.deepEqual(pendingDecisions(), []);
  assert.deepEqual(retired().map((e) => `${e.host} ${e.url}`).sort(), ['lp /author/gal/', 'lp /author/roy/']);
  const out = outOfScopePending();
  assert.equal(out.length, 12);
  assert.ok(out.every((e) => e.host === 'www' && !e.technical && e.reason));
  assert.equal(out.filter((e) => e.campaignCheck).length, 3, 'the 3 old Wix landing pages wait for the campaign check');
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

test('privacy policy: still pending the owner\'s review (never marked done automatically)', () => {
  assert.deepEqual(ownerReviewPending().map((e) => `${e.host} ${e.url}`), ['lp /privacy/']);
});
