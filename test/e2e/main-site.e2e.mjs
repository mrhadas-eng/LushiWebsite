// Browser checks against `wrangler dev` (127.0.0.1:8787) + mock OfficeCRM (127.0.0.1:8799).
import { chromium } from 'playwright';
const B = 'http://127.0.0.1:8787', M = 'http://127.0.0.1:8799';
const mode = (m) => fetch(`${M}/mode/${m}`);
const crm = async () => (await fetch(`${M}/last`)).json();
const out = [];
const check = (ok, label, detail = '') => out.push(`${ok ? '✔' : '✘'} ${label}${detail ? `  [${detail}]` : ''}`);
const leads = (p) => p.evaluate(() => (window.dataLayer || []).filter((e) => e.event === 'generate_lead').length);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
async function fill(p, scope, { name = 'בדיקה אתר חדש', phone = '050-1234567', email = 'test@example.com' } = {}) {
  await p.fill(`${scope}input[name=full_name]`, name);
  await p.fill(`${scope}input[name=email]`, email);
  await p.fill(`${scope}input[name=phone]`, phone);
  await p.fill(`${scope}textarea[name=message]`, 'בדיקת חיבור ל-OfficeCRM');
}

for (const [vp, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 375, height: 812 }]]) {
  const ctx = await b.newContext({ viewport });
  const p = await ctx.newPage();
  let gtm = false;
  p.on('request', (r) => { if (r.url().includes('googletagmanager.com')) gtm = true; });
  const t = (s) => `[${vp}] ${s}`;

  // Success from the home form
  await mode('ok'); const before = (await crm()).count;
  await p.goto(`${B}/?utm_source=facebook&utm_medium=paid&utm_campaign=autumn&fbclid=xyz`);
  await fill(p, '#contact ');
  await p.click('#contact .send');
  await p.waitForURL('**/thankyou', { timeout: 15000 }).catch(() => {});
  const c = await crm();
  const sent = c.last ? JSON.parse(c.last.body) : {};
  check(p.url().endsWith('/thankyou'), t('success: redirected to /thankyou'));
  check(c.count === before + 1, t('success: OfficeCRM got exactly one request'));
  check(c.last?.auth === 'Bearer local-test-key' && /^application\/json/.test(c.last?.type), t('success: Bearer auth + JSON content type'));
  check(JSON.stringify(Object.keys(sent).sort()) === '["email","name","notes","phone","source"]', t('success: exactly the OfficeCRM fields'), Object.keys(sent).join(','));
  check(sent.name === 'בדיקה אתר חדש' && sent.phone === '050-1234567' && sent.email === 'test@example.com', t('success: name/phone/email mapped'));
  check(sent.source === 'website / facebook / paid', t('success: source from acquisition'), sent.source);
  check(/utm_campaign=autumn/.test(sent.notes) && /fbclid/.test(sent.notes) && /דף הבית/.test(sent.notes), t('success: notes carry form, campaign, message'));
  check((await leads(p)) === 1, t('success: generate_lead fired once'));
  await p.reload();
  check((await leads(p)) === 0, t('refresh of thank-you page: no second conversion'));

  // Failures on the contact page: no redirect, no conversion, data kept
  for (const m of ['success-false', 'missing-success', 'malformed', '500']) {
    await mode(m);
    await p.goto(`${B}/${encodeURI('יצירת-קשר')}`);
    await fill(p, '');
    await p.click('.send');
    await p.waitForSelector('.status:not([hidden])', { timeout: 15000 }).catch(() => {});
    const stayed = decodeURI(new URL(p.url()).pathname) === '/יצירת-קשר';
    check(stayed && (await p.isVisible('.status')), t(`OfficeCRM ${m}: error shown, no redirect`));
    check((await leads(p)) === 0 && (await p.inputValue('input[name=phone]')) === '050-1234567', t(`OfficeCRM ${m}: no conversion, typed data kept`));
  }

  // Contact page now requires phone and name (OfficeCRM contract): blocked in the browser
  await mode('ok'); const c0 = (await crm()).count;
  await p.goto(`${B}/${encodeURI('יצירת-קשר')}`);
  await fill(p, '', { phone: '' });
  await p.click('.send'); await p.waitForTimeout(700);
  check((await crm()).count === c0 && !p.url().includes('thankyou'), t('contact form without phone: blocked, nothing sent'));

  // Bot
  await p.goto(`${B}/`);
  await fill(p, '#contact ');
  await p.evaluate(() => { document.querySelector('#contact input[name=website]').value = 'spam'; });
  await p.click('#contact .send');
  await p.waitForURL('**/thankyou', { timeout: 15000 }).catch(() => {});
  check((await crm()).count === c0 && (await leads(p)) === 0, t('bot: nothing sent to OfficeCRM, no conversion'));

  check(!gtm, t('GTM not loaded on a non-production host'));
  await ctx.close();
}
await b.close();
console.log(out.join('\n'));
console.log(`\n${out.filter((l) => l.startsWith('✘')).length} failed of ${out.length}`);
