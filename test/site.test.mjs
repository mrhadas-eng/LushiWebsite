// Static checks on the built site (run `npm run build` first). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const built = fs.existsSync(path.join(DIST, 'index.html'));
const page = (p) => path.join(DIST, decodeURI(p), 'index.html');

const redirects = fs.readFileSync('public/_redirects', 'utf8').split('\n')
  .filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.trim().split(/\s+/));

test('every redirect rule is well-formed and permanent', () => {
  assert.ok(redirects.length >= 16);
  for (const [from, to, code] of redirects) {
    assert.ok(from.startsWith('/') && to.startsWith('/'), `${from} -> ${to}`);
    assert.equal(code, '301', from);
  }
});

test('every redirect points to a page that exists', { skip: !built && 'run npm run build first' }, () => {
  for (const [, to] of redirects) {
    const ok = to === '/' ? fs.existsSync(path.join(DIST, 'index.html'))
      : to.endsWith('.xml') ? fs.existsSync(path.join(DIST, to)) : fs.existsSync(page(to));
    assert.ok(ok, `redirect target missing: ${to}`);
  }
});

test('no redirect hides a real page', { skip: !built && 'run npm run build first' }, () => {
  for (const [from] of redirects) {
    if (from.includes('*')) continue;
    assert.ok(!fs.existsSync(page(from)), `redirect source is also a page: ${from}`);
  }
});

test('sitemap lists only existing public pages, without build-date lastmod', { skip: !built && 'run npm run build first' }, () => {
  const xml = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  assert.equal(locs.length, 25);
  assert.ok(!xml.includes('<lastmod>'));
  for (const p of locs) assert.ok(p === '/' ? true : fs.existsSync(page(p)), `sitemap page missing: ${decodeURI(p)}`);
  assert.ok(!locs.includes('/thankyou'));
});

test('thank-you and 404 pages are noindex; canonical URLs use www and no trailing slash', { skip: !built && 'run npm run build first' }, () => {
  assert.match(fs.readFileSync(page('/thankyou'), 'utf8'), /<meta name="robots" content="noindex, follow"/);
  const notFound = fs.readFileSync(path.join(DIST, '404.html'), 'utf8');
  assert.match(notFound, /<meta name="robots" content="noindex, follow"/);
  assert.doesNotMatch(notFound, /rel="canonical"/);
  const about = fs.readFileSync(page('/אודות'), 'utf8');
  const canon = about.match(/<link rel="canonical" href="([^"]+)"/)[1];
  assert.equal(decodeURI(canon), 'https://www.hagarlushi.com/אודות');
});

test('no secrets or webhook URLs in the built site', { skip: !built && 'run npm run build first' }, () => {
  const files = fs.readdirSync(DIST, { recursive: true }).filter((f) => /\.(html|js)$/.test(f));
  for (const f of files) {
    const s = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.ok(!/CRM_WEBHOOK_URL|web3forms|hooks\.zapier|hook\.\w+\.make\.com/i.test(s), f);
  }
});
