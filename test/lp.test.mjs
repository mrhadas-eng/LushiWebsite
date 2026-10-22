// lp.hagarlushi.com build output (dist-lp): SEO, tracking, forms, consent and secrets.
// Run `npm run build` first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lpPages, lpSite, lpWpPages } from '../src/data/lp.mjs';
import { legalHtml } from '../src/lib/lp-legal.mjs';

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
    assert.match(form, / novalidate/, `${pg.path}: browser bubbles replaced by inline messages`);
    for (const f of ['full_name', 'phone', 'email', 'consent']) {
      const input = form.match(new RegExp(`<input[^>]*name="${f}"[^>]*>`))?.[0] || '';
      const errId = `${pg.form}-${f}-err`;
      assert.match(input, /required aria-required="true"/, `${pg.path}: ${f} marked required`);
      assert.ok(input.includes(`aria-describedby="${errId}"`), `${pg.path}: ${f} linked to its message`);
      assert.match(form, new RegExp(`id="${errId}" data-error-for="${f}" hidden`), `${pg.path}: ${f} message element`);
    }
    assert.ok(form.includes('קראתי ומאשר/ת את') && form.includes('href="/privacy/"'), `${pg.path}: consent wording/link`);
    assert.ok(form.includes('data-thanks="/thankyou/"'), `${pg.path}: thank-you path`);
    assert.ok(form.includes('name="website"'), `${pg.path}: honeypot`);
    const fail = form.match(/<p class="lp-form-error"[\s\S]*?<\/p>/)[0].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    assert.equal(fail, 'לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ.', `${pg.path}: delivery-failure text`);
  }
});

test('WhatsApp: correct landing-page number and message on every lp page; a link, never a lead', { skip }, () => {
  assert.equal(lpSite.whatsapp.number, '972544317164'); // 054-431-7164 (owner, 2026-10-19)
  const msg = encodeURIComponent(lpSite.whatsapp.message);
  for (const p of [...PAGES]) {
    const h = html(p);
    const links = [...h.matchAll(/href="(https:\/\/api\.whatsapp\.com[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    assert.ok(links.length >= 1, `${p}: WhatsApp link`);
    for (const l of links) {
      assert.ok(l.startsWith('https://api.whatsapp.com/send/?phone=972544317164&'), `${p}: number ${l}`);
      assert.ok(l.includes(`text=${msg}`), `${p}: prescribed message`);
    }
    assert.ok(!/972524317164|052-431-7164|972505788634|050-578-8634/.test(h), `${p}: old or main-site number on a landing page`);
    // Calls and WhatsApp use separate numbers (owner, 2026-10-19): never mixed.
    for (const t of h.matchAll(/href="tel:([^"]+)"/g)) assert.equal(t[1], '+972525949682', `${p}: call link ${t[1]}`);
    assert.doesNotMatch(h, /tel:\+?972544317164|(phone=|wa\.me\/)972525949682/, `${p}: call and WhatsApp numbers mixed`);
    assert.match(h, /class="lp-wa" href="https:\/\/api\.whatsapp\.com/, `${p}: floating button is a plain link`);
    assert.doesNotMatch(h, /lp-wa-dialog/, `${p}: no pop-up form`);
  }
  const src = fs.readFileSync('src/components/lp/LpWhatsApp.astro', 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /<script|generate_lead|\/api\/lead|sendLead|submitLead/);
});

test('landing-page form failure message: calls go to 052-594-9682 (tel:+972525949682), WhatsApp to 054-431-7164', { skip }, () => {
  assert.equal(lpSite.phone, '052-594-9682');
  assert.equal(lpSite.phoneHref, 'tel:+972525949682');
  for (const pg of lpPages) {
    const fail = html(pg.path).match(/<p class="lp-form-error"[\s\S]*?<\/p>/)?.[0] || '';
    assert.ok(fail.includes('href="tel:+972525949682"'), `${pg.path}: phone link`);
    assert.match(fail, /href="https:\/\/api\.whatsapp\.com\/send\/\?phone=972544317164&(amp;)?text=/, `${pg.path}: WhatsApp link`);
    assert.doesNotMatch(fail, /tel:\+972505788634|tel:\+972544317164|tel:\+972524317164|phone=972525949682/, `${pg.path}: another site's number`);
  }
});

test('legal pages: contact email is lushi.office@gmail.com (text and mailto link); old addresses gone; wording otherwise unchanged', { skip }, () => {
  assert.equal(lpSite.legalEmail, 'lushi.office@gmail.com');
  for (const p of ['/privacy/', '/accessibility-statement/']) {
    const h = html(p);
    assert.ok(h.includes('<a href="mailto:lushi.office@gmail.com" dir="ltr">lushi.office@gmail.com</a>'), `${p}: email link`);
    assert.doesNotMatch(h, /mr\.hadas@gmail\.com|hagarlushi@gmail\.com/i, `${p}: old address`);
    for (const m of h.matchAll(/href="mailto:([^"?]+)/g)) assert.equal(m[1], 'lushi.office@gmail.com', `${p}: mailto`);
  }
  // Only the address changed: the exported text with the address swapped is otherwise identical.
  for (const id of [9, 378]) {
    const strip = (x) => x.replace(/<[^>]+>/g, '').replace(/mr\.hadas@gmail\.com|lushi\.office@gmail\.com/g, 'EMAIL');
    assert.equal(strip(legalHtml(id)), strip(lpWpPages.find((x) => x.id === id).html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')), `wp ${id}`);
  }
});

test('main site keeps its own number (050-578-8634), never the landing-page one', { skip }, () => {
  for (const f of ['dist/index.html', 'dist/יצירת-קשר/index.html']) {
    const h = fs.readFileSync(f, 'utf8');
    assert.ok(h.includes('972505788634'), `${f}: main WhatsApp`);
    assert.ok(!/972524317164|052-431-7164|972525949682|052-594-9682|972544317164|054-431-7164/.test(h), `${f}: landing-page number on the main site`);
    const fail = h.match(/<p class="status"[\s\S]*?<\/p>/)[0];
    assert.ok(fail.includes('tel:+972505788634') && fail.includes('wa.me/972505788634'), `${f}: failure message contact links`);
  }
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
