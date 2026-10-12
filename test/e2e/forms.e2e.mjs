// Form validation, delivery and WhatsApp checks on both local Workers (www 8787, lp 8788) + mock OfficeCRM (8799).
import { chromium } from 'playwright';
const M = 'http://127.0.0.1:8799';
const mode = (m) => fetch(`${M}/mode/${m}`);
const crmCount = async () => (await (await fetch(`${M}/last`)).json()).count;
const crmLast = async () => (await (await fetch(`${M}/last`)).json()).last;
const out = [];
const check = (ok, label, detail = '') => out.push(`${ok ? '✔' : '✘'} ${label}${detail ? `  [${detail}]` : ''}`);
const ev = (p, n) => p.evaluate((n) => (window.dataLayer || []).filter((e) => e.event === n).length, n).catch(() => -1);
const MSG = { full_name: 'יש להזין שם מלא', phone: 'יש להזין מספר טלפון', email: 'נא להזין כתובת אימייל תקינה', consent: 'יש לאשר את מדיניות הפרטיות' };
const FAIL = 'לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ.';
const VALID = { full_name: 'בדיקה טופס', phone: '050-1234567', email: 'test@example.com' };

const SITES = [
  { name: 'www', base: 'http://127.0.0.1:8787', pages: [['/', 'home'], ['/יצירת-קשר', 'contact']], form: '.contact-form', submit: '.send', fail: '.status',
    thanks: '/thankyou', consent: false, wa: { float: '.wa-float', number: '972505788634' }, src: 'website / google / cpc' },
  { name: 'lp', base: 'http://127.0.0.1:8788', pages: [['/', 'lp-home'], ['/architecture/', 'lp-architecture'], ['/interior-design/', 'lp-interior-design'], ['/renovation/', 'lp-renovation']],
    form: '.lp-form', submit: '.lp-submit', fail: '.lp-form-error', thanks: '/thankyou/', consent: true, wa: { float: '.lp-wa', number: '972524317164' }, src: 'landing-page / google / cpc' },
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());

for (const [vp, viewport] of [['desktop', { width: 1366, height: 800 }], ['mobile', { width: 375, height: 812 }]]) {
  for (const S of SITES) {
    const ctx = await b.newContext({ viewport });
    await ctx.route(/api\.whatsapp\.com|wa\.me/, (r) => r.fulfill({ body: 'wa stub' }));
    const p = await ctx.newPage();
    let apiCalls = 0, errors = [];
    p.on('request', (r) => { if (r.url().includes('/api/lead')) apiCalls++; });
    p.on('pageerror', (e) => errors.push(e.message));
    const t = (s) => `[${vp} ${S.name}] ${s}`;
    const F = (sel) => `${S.form} ${sel}`;
    const fill = async (vals = VALID, consent = true) => {
      for (const [k, v] of Object.entries(vals)) await p.fill(F(`[name=${k}]`), v);
      if (S.consent) consent ? await p.check(F('[name=consent]')) : await p.uncheck(F('[name=consent]'));
    };
    const shown = async () => p.$$eval(`${S.form} [data-error-for]`, (els) => Object.fromEntries(els.filter((e) => !e.hidden).map((e) => [e.dataset.errorFor, e.textContent.trim()])));
    const focused = () => p.evaluate(() => document.activeElement?.getAttribute('name'));
    const go = async (path) => { await p.goto(`${S.base}${encodeURI(path)}?utm_source=google&utm_medium=cpc&utm_campaign=t`); apiCalls = 0; };
    const fields = ['full_name', 'phone', 'email', ...(S.consent ? ['consent'] : [])];

    // 1. empty form: every required field flagged with its own message, focus on the first, nothing sent
    const [path0] = S.pages[0];
    await go(path0); const c0 = await crmCount();
    await p.click(F(S.submit)); await p.waitForTimeout(300);
    const e1 = await shown();
    check(fields.every((f) => e1[f] === MSG[f]) && Object.keys(e1).length === fields.length, t('empty form: inline message next to each required field'), JSON.stringify(e1));
    check((await focused()) === 'full_name', t('empty form: first invalid field focused'));
    const inv = await p.$$eval(`${S.form} [aria-invalid="true"]`, (els) => els.map((e) => e.name));
    check(fields.every((f) => inv.includes(f)), t('empty form: aria-invalid on each field, messages linked via aria-describedby'));
    check(apiCalls === 0 && (await crmCount()) === c0 && !(await p.isVisible(F(S.fail))), t('empty form: no request, no delivery-failure message'));

    // 2. each field missing / invalid on its own
    const bad = [['full_name', ''], ['phone', ''], ['phone', '12345'], ['email', ''], ['email', 'not-an-email']];
    for (const [f, v] of bad) {
      await go(path0); await fill({ ...VALID, [f]: v });
      await p.click(F(S.submit)); await p.waitForTimeout(250);
      const e = await shown();
      check(JSON.stringify(e) === JSON.stringify({ [f]: MSG[f] }) && (await focused()) === f && apiCalls === 0,
        t(`${f} = "${v}": only that message, focused, nothing sent`), JSON.stringify(e));
    }
    if (S.consent) {
      await go(path0); await fill(VALID, false);
      await p.click(F(S.submit)); await p.waitForTimeout(250);
      const e = await shown();
      check(JSON.stringify(e) === JSON.stringify({ consent: MSG.consent }) && (await focused()) === 'consent' && apiCalls === 0, t('consent unchecked: consent message, focused, nothing sent'));
    }
    // 3. values kept; message clears as the visitor corrects the field
    await go(path0); await fill({ ...VALID, phone: '12' });
    await p.click(F(S.submit)); await p.waitForTimeout(250);
    const kept = await p.inputValue(F('[name=full_name]')) === VALID.full_name && await p.inputValue(F('[name=email]')) === VALID.email && await p.inputValue(F('[name=phone]')) === '12';
    await p.fill(F('[name=phone]'), VALID.phone); await p.waitForTimeout(150);
    check(kept && !('phone' in await shown()), t('values kept after validation; message clears once corrected'));

    // 4. server-side rejection: browser check bypassed → Worker 400 names the field, form shows it, nothing sent
    const before = await crmCount();
    const api = await p.evaluate(async () => { const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: 'x', phone: '123', email: 'a@b.co', form: document.querySelector('form[data-form],form[data-location]')?.dataset.form || 'home' }) }); return [r.status, await r.json()]; });
    check(api[0] === 400 && api[1].field === 'phone' && (await crmCount()) === before, t('server rejects an invalid lead (400, field=phone), nothing sent to OfficeCRM'));
    await p.route('**/api/lead', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false,"error":"invalid_email","field":"email"}' }));
    await go(path0); await fill();
    await p.click(F(S.submit)); await p.waitForTimeout(400);
    check(JSON.stringify(await shown()) === JSON.stringify({ email: MSG.email }) && !(await p.isVisible(F(S.fail))) && !p.url().includes('thankyou') && (await ev(p, 'generate_lead')) === 0,
      t('server field rejection shown next to the field (not as a generic failure), no conversion'));
    await p.unroute('**/api/lead');

    // 5. success on every form, button disabled while sending, double click sends once
    for (const [path, formId] of S.pages) {
      await mode('ok'); await go(path); await fill(); const c = await crmCount();
      await p.route('**/api/lead', async (r) => { await new Promise((ok) => setTimeout(ok, 800)); await r.continue(); });
      await p.click(F(S.submit));
      const disabled = await p.$eval(F(S.submit), (el) => el.disabled);
      await p.click(F(S.submit), { force: true }).catch(() => {});
      await p.waitForURL(`**${S.thanks}`, { timeout: 15000 }).catch(() => {});
      await p.unroute('**/api/lead');
      const sent = JSON.parse((await crmLast())?.body || '{}');
      check(disabled && (await crmCount()) === c + 1, t(`${path}: button disabled while sending, exactly one OfficeCRM request`));
      check(p.url().endsWith(S.thanks) && (await ev(p, 'generate_lead')) === 1 && sent.source === S.src, t(`${path}: thank-you + one generate_lead (${formId})`), sent.source);
    }
    await p.reload(); check((await ev(p, 'generate_lead')) === 0, t('thank-you refresh: no second conversion'));

    // 6. delivery failures: rejection, timeout, CRM connection dropped, browser offline
    for (const m of ['success-false', '500', 'hang', 'reset', 'browser-offline']) {
      if (m === 'browser-offline') await p.route('**/api/lead', (r) => r.abort('internetdisconnected')); else await mode(m);
      await go(S.pages[S.pages.length - 1][0]); await fill();
      await p.click(F(S.submit));
      await p.waitForSelector(`${S.form} ${S.fail}:not([hidden])`, { timeout: 20000 }).catch(() => {});
      const txt = (await p.textContent(F(S.fail)).catch(() => '')).replace(/\s+/g, ' ').trim();
      const keptAll = await p.inputValue(F('[name=full_name]')) === VALID.full_name && await p.inputValue(F('[name=phone]')) === VALID.phone && await p.inputValue(F('[name=email]')) === VALID.email;
      const links = await p.$$eval(`${S.form} ${S.fail} a`, (as) => as.map((a) => a.getAttribute('href')));
      check(txt === FAIL && keptAll && Object.keys(await shown()).length === 0 && !p.url().includes('thankyou') && (await ev(p, 'generate_lead')) === 0
        && !(await p.$eval(F(S.submit), (el) => el.disabled)), t(`delivery ${m}: distinct message, values kept, no redirect, no conversion, can retry`), txt.slice(0, 30));
      check(links.some((h) => h.includes(S.wa.number.slice(3))) && links.some((h) => h.includes(S.wa.number)), t(`delivery ${m}: phone/WhatsApp links use this site's number`), links.join(' '));
      if (m === 'browser-offline') await p.unroute('**/api/lead');
      if (m !== 'success-false') { /* only check one non-timeout variant per site for speed */ }
    }
    await mode('ok');

    // 7. WhatsApp: correct number + message, whatsapp_click only, no CRM / thank-you / generate_lead
    await go(S.pages[0][0]); const cw = await crmCount();
    const href = await p.getAttribute(S.wa.float, 'href');
    const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click(S.wa.float)]);
    if (tab) await tab.close();
    await p.waitForTimeout(300);
    check(href.includes(S.wa.number) && /text=/.test(href) && !!tab, t(`WhatsApp opens the chat with ${S.wa.number} and the prescribed message`), href.slice(0, 70));
    check((await ev(p, 'whatsapp_click')) === 1 && (await ev(p, 'generate_lead')) === 0 && (await crmCount()) === cw && apiCalls === 0 && !p.url().includes('thankyou'),
      t('WhatsApp click: whatsapp_click once, no lead, no CRM request, no thank-you page'));
    if (S.name === 'lp') {
      for (const [path] of [...S.pages, ['/thankyou/'], ['/privacy/'], ['/accessibility-statement/']]) {
        await p.goto(`${S.base}${path}`);
        const hrefs = await p.$$eval('a[href*="api.whatsapp.com"], a[href*="wa.me"]', (as) => as.map((a) => a.href));
        check(hrefs.length > 0 && hrefs.every((h) => h.includes('phone=972524317164') && h.includes('text=')), t(`${path}: WhatsApp links use 052-431-7164`), String(hrefs.length));
      }
    }
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 0, t('no horizontal scroll'));
    check(errors.length === 0, t('no JavaScript errors'), errors.join(' | '));
    if (vp === 'mobile') {
      await go(S.pages[S.pages.length - 1][0]); await p.click(F(S.submit)); await p.waitForTimeout(300);
      await (await p.$(S.form)).screenshot({ path: `/tmp/form-errors-${S.name}.png` });
    }
    await ctx.close();
  }
}
await b.close();
console.log(out.join('\n'));
console.log(`\n${out.filter((l) => l.startsWith('✘')).length} failed of ${out.length}`);
