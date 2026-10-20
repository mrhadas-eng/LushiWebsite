// Responsive check of every page of both sites on phones and tablets (portrait and landscape).
// Start the previews first (npm run preview:cf on 8787, npm run preview:cf:lp on 8788), then:
//   node test/e2e/responsive.e2e.mjs          (Playwright installed outside the repo, see README)
// Fails on: horizontal scrolling, content sticking out of the screen, distorted images, text under 12px,
// form fields under 16px (iOS zooms in on them), tap targets under 40px on touch screens (24px elsewhere),
// and the main menu wrapping onto a second row on tablets.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WWW = process.env.WWW || 'http://127.0.0.1:8787', LP = process.env.LP || 'http://127.0.0.1:8788';
const locs = (file, origin, base) => fs.readFileSync(file, 'utf8').match(/<loc>[^<]+/g).map((l) => l.slice(5).replace(origin, base));
const urls = [
  ...locs('dist/sitemap.xml', 'https://www.hagarlushi.com', WWW), `${WWW}/thankyou`, `${WWW}/no-such-page`,
  ...locs('dist-lp/sitemap.xml', 'https://lp.hagarlushi.com', LP), `${LP}/no-such-page/`,
];
const VIEWPORTS = [
  ['phone 320', 320, 640], ['phone 360', 360, 740], ['phone 390', 390, 844], ['phone 430', 430, 932], ['phone landscape', 844, 390],
  ['tablet 768', 768, 1024], ['tablet 820', 820, 1180], ['tablet 1024', 1024, 1366], ['tablet landscape', 1180, 820],
];

const audit = () => {
  const vw = document.documentElement.clientWidth, out = [];
  const name = (e) => `${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : ''}`;
  const visible = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && !e.closest('[hidden],[aria-hidden=true]'); };
  const clipped = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).overflowX !== 'visible') return true; return false; };
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px > ${vw}px)`);
  for (const e of document.body.querySelectorAll('*')) {
    if (!visible(e)) continue;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if ((r.right > vw + 1 || r.left < -1) && s.position !== 'fixed' && !clipped(e)) out.push(`${name(e)} sticks out of the screen`);
    if (e.tagName === 'IMG' && e.complete && e.naturalWidth && !['cover', 'contain'].includes(s.objectFit) && Math.abs((e.naturalWidth / e.naturalHeight) / (r.width / r.height) - 1) > 0.04) out.push(`distorted image ${e.getAttribute('src')}`);
    if (e.matches('input:not([type=hidden],[type=checkbox],[type=radio]),textarea,select') && parseFloat(s.fontSize) < 16) out.push(`${name(e)} font ${s.fontSize} (iOS zooms in)`);
    if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(s.fontSize) < 12) out.push(`${name(e)} text ${s.fontSize}`);
    if (e.matches('a[href],button,input[type=checkbox],input[type=submit],summary') && r.bottom > 0) {
      if (s.display === 'inline' && e.closest('p,li,td') && !e.closest('nav,footer,.lp-consent')) continue;   // links inside running text
      let t = (e.matches('input[type=checkbox]') ? (e.closest('label') || e) : e).getBoundingClientRect();
      const af = getComputedStyle(e, '::after');
      if (af.content !== 'none' && af.position === 'absolute') { const g = -parseFloat(af.top) || 0; t = { width: t.width + 2 * g, height: t.height + 2 * g }; }
      const min = coarse ? 40 : 24;
      if (t.height < (e.matches('.dot') ? 32 : min) || t.width < (e.matches('.dot') ? 32 : 24)) out.push(`small tap target ${name(e)} ${Math.round(t.width)}x${Math.round(t.height)} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)}"`);
    }
  }
  const menu = [...document.querySelectorAll('.site-header .menu-item')].filter(visible);
  if (menu.length && new Set(menu.map((m) => Math.round(m.getBoundingClientRect().top))).size > 1) out.push('main menu wraps onto a second row');
  return [...new Set(out)];
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const failures = [];
let checks = 0;
for (const [label, width, height] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 1100, hasTouch: true });
  const page = await ctx.newPage();
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; });
      await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 5000); }))));
    });
    checks++;
    for (const problem of await page.evaluate(audit)) failures.push(`✘ ${label}  ${decodeURI(url)}  ${problem}`);
  }
  await ctx.close();
}
await browser.close();
console.log(failures.join('\n') || `✔ ${urls.length} pages × ${VIEWPORTS.length} phone/tablet sizes: no layout problems`);
console.log(`\n${failures.length} problems in ${checks} page views`);
process.exit(failures.length ? 1 : 0);
