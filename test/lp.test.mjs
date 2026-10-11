// lp.hagarlushi.com build output (dist-lp): SEO, tracking, forms, consent and secrets.
// Run `npm run build` first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lpPages, lpSite } from '../src/data/lp.mjs';

const DIR = 'dist-lp';
const built = fs.existsSync(path.join(DIR, 'index.html'));
const skip = !built && 'run npm run build first';
const html = (p) => fs.readFileSync(path.join(DIR, p.replace(/^\/|\/$/g, ''), 'index.html'), 'utf8');
const PAGES = ['/', '/architecture/', '/interior-design/', '/renovation/', '/thankyou/', '/privacy/', '/accessibility-statement/'];

test('every lp page: self-referencing canonical with trailing slash, indexable as on WordPress, both tags', { skip }, () => {
  for (const p of PAGES) {
    const h = html(p);
    assert.equal(h.match(/<link rel="canonical" href="([^"]+)"/)?.[1], `https://lp.hagarlushi.com${p}`, p);
    assert.match(h, /<meta name="robots" content="max-image-preview:large">/, p);
    assert.ok(h.includes('GTM-KJRR2DNT'), `${p}: GTM container`);
    assert.ok(h.includes(lpSite.siteKitTagId), `${p}: Site Kit Google tag`);
    assert.match(h, /<html lang="he-IL" dir="rtl">/, p);
  }
  const nf = fs.readFileSync(path.join(DIR, '404.html'), 'utf8');
  assert.match(nf, /noindex, follow/);
  assert.doesNotMatch(nf, /rel="canonical"/);
});

test('tags load only on hagarlushi.com hosts (not on previews or localhost)', { skip }, () => {
  const h = html('/');
  assert.ok(h.includes('hagarlushi\\.com'), 'host guard present');
});

test('landing pages: form with name, phone, email and the required privacy consent; correct form id', { skip }, () => {
  for (const pg of lpPages) {
    const h = html(pg.path);
    const form = h.match(/<form class="lp-form"[\s\S]*?<\/form>/)?.[0];
    assert.ok(form, `${pg.path}: no lead form`);
    assert.ok(form.includes(`data-form="${pg.form}"`), `${pg.path}: form id`);
    for (const f of ['full_name', 'phone', 'email']) assert.match(form, new RegExp(`name="${f}" required`), `${pg.path}: ${f}`);
    assert.match(form, /type="checkbox" name="consent" value="yes" required/, `${pg.path}: consent`);
    assert.ok(form.includes('קראתי ומאשר/ת את') && form.includes('href="/privacy/"'), `${pg.path}: consent wording/link`);
    assert.ok(form.includes('data-thanks="/thankyou/"'), `${pg.path}: thank-you path`);
    assert.ok(form.includes('name="website"'), `${pg.path}: honeypot`);
  }
});

test('WhatsApp pop-up: name, phone and consent; never reports a lead or calls the CRM', { skip }, () => {
  const h = html('/architecture/');
  const dlg = h.match(/<dialog id="lp-wa-dialog"[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(dlg);
  assert.match(dlg, /name="full_name" required/);
  assert.match(dlg, /name="phone" required/);
  assert.match(dlg, /name="consent" value="yes" required/);
  assert.doesNotMatch(dlg, /name="email"/);
  assert.ok(dlg.includes(`phone=${lpSite.whatsapp.number}`));
  const src = fs.readFileSync('src/components/lp/LpWhatsApp.astro', 'utf8').split('<script>')[1];
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ''), /generate_lead|\/api\/lead|sendLead|submitLead/);
  assert.equal(lpSite.popupSendsToCrm, false, 'change only after the owner decided (inventory: popup email)');
});

test('thank-you page records the conversion only after a confirmed lead', { skip }, () => {
  const src = fs.readFileSync('src/pages/lp/thankyou.astro', 'utf8');
  assert.match(src, /recordLeadConversion\(sessionStorage/);
});

test('sitemap and robots match the 7 WordPress pages', { skip }, () => {
  const xml = fs.readFileSync(path.join(DIR, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  assert.deepEqual(locs.sort(), [...PAGES].sort());
  assert.match(fs.readFileSync(path.join(DIR, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/lp\.hagarlushi\.com\/sitemap\.xml/);
});

test('images are served locally (no WordPress or Wix image URLs) and every page image exists', { skip }, () => {
  for (const p of PAGES) {
    const h = html(p);
    assert.doesNotMatch(h, /wp-content\/uploads|static\.wixstatic/, p);
    for (const m of h.matchAll(/(?:src|href)="(\/lp-media\/[^"]+)"/g))
      assert.ok(fs.existsSync(path.join(DIR, decodeURI(m[1]))), `${p}: missing ${m[1]}`);
  }
});

// Built from pieces so this file never contains the full address.
const OFFICE_WEBHOOK = ['office', 'hagarlushi.com/api/leads'].join('.');

test('no CRM address, key or auth header in dist-lp', { skip }, () => {
  for (const f of fs.readdirSync(DIR, { recursive: true }).map(String)) {
    const full = path.join(DIR, f);
    if (!fs.statSync(full).isFile() || !/\.(html|js|css|txt|xml|json)$|^_/.test(path.basename(full))) continue;
    const s = fs.readFileSync(full, 'utf8');
    assert.ok(!s.includes(OFFICE_WEBHOOK), `${f}: CRM address`);
    assert.doesNotMatch(s, /LEADS_WEBHOOK_API_KEY|CRM_WEBHOOK_URL|Bearer\s/, f);
  }
});

test('lp pages are not exposed on www (separate Worker)', { skip }, () => {
  assert.ok(!fs.existsSync('dist/lp') && !fs.existsSync('dist/lp-media'));
});
