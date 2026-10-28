// Static checks on the built site (run `npm run build` first). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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
  assert.equal(locs.length, 24);
  assert.ok(!locs.includes('/portfolio'), 'the removed press page is not in the sitemap');
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

test('accessibility statement (/הצהרתנגישות): contact email is lushi.office@gmail.com as a mailto link; old address gone; wording unchanged', { skip: !built && 'run npm run build first' }, () => {
  const h = fs.readFileSync(page('/הצהרתנגישות'), 'utf8');
  assert.match(h, /דואר אלקטרוני: <a href="mailto:lushi\.office@gmail\.com"[^>]*>lushi\.office@gmail\.com<\/a>/);
  assert.doesNotMatch(h, /mr\.hadas@gmail\.com/);
  for (const m of h.matchAll(/href="mailto:([^"?]+)/g)) assert.equal(m[1], 'lushi.office@gmail.com');
  // Only the address changed in the page source (owner, 2026-10-12): nothing else in the statement differs.
  const src = fs.readFileSync('src/pages/הצהרתנגישות.astro', 'utf8');
  assert.equal(src.match(/lushi\.office@gmail\.com/g).length, 2);
  assert.doesNotMatch(src, /mr\.hadas@gmail\.com|hagarlushi@gmail\.com/);
});

// Built from pieces so this file itself never contains the full address.
const OFFICE_WEBHOOK = ['office', 'hagarlushi.com/api/leads'].join('.');

test('no CRM address, key or auth header in the built site', { skip: !built && 'run npm run build first' }, () => {
  const files = fs.readdirSync(DIST, { recursive: true }).filter((f) => /\.(html|js|css|xml|txt|json)$/.test(f));
  assert.ok(files.length > 20);
  for (const f of files) {
    const s = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.ok(!s.includes(OFFICE_WEBHOOK), `CRM address in ${f}`);
    assert.ok(!/api\/leads\/webhook|LEADS_WEBHOOK_API_KEY|CRM_WEBHOOK_URL|Authorization|Bearer\s/i.test(s), `CRM config in ${f}`);
    assert.ok(!/web3forms|hooks\.zapier|hook\.\w+\.make\.com/i.test(s), `old webhook in ${f}`);
  }
});

test('the CRM webhook address is not committed anywhere in the repository', () => {
  const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n')
    .filter((f) => f && !/\.(png|jpe?g|webp|woff2?|gif|ico)$/i.test(f) && !f.startsWith('originals/') && !f.startsWith('public/media/'));
  for (const f of tracked) {
    if (!fs.existsSync(f)) continue;
    assert.ok(!fs.readFileSync(f, 'utf8').includes(OFFICE_WEBHOOK), `CRM address committed in ${f}`);
  }
  assert.ok(!tracked.includes('.dev.vars'), '.dev.vars must stay git-ignored');
});

test('press page removed (owner, 2026-10-19): /portfolio is a permanent redirect to the home page, no page, menu item or video left', { skip: !built && 'run npm run build first' }, () => {
  assert.deepEqual(redirects.find(([from]) => from === '/portfolio'), ['/portfolio', '/', '301']);
  assert.deepEqual(redirects.find(([from]) => from === '/portfolio-collections/*'), ['/portfolio-collections/*', '/', '301'], 'no chain through /portfolio');
  assert.ok(!fs.existsSync(page('/portfolio')), 'no /portfolio page is built');
  assert.ok(!fs.existsSync(path.join(DIST, 'media', 'video')), 'no video files are deployed');
  const html = fs.readdirSync(DIST, { recursive: true }).map(String).filter((f) => f.endsWith('.html'));
  for (const f of html) {
    const h = fs.readFileSync(path.join(DIST, f), 'utf8');
    assert.doesNotMatch(h, /href="\/portfolio"|מהעיתונות/, `${f}: link to the removed press page`);
    assert.doesNotMatch(h, /<video|\.mp4|video\.wixstatic\.com/, `${f}: press video`);
  }
});
