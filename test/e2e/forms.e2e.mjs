// Form validation, delivery, website-v1 contract, idempotency and WhatsApp checks on both local Workers
// (www 8787, lp 8788) + the fake OfficeCRM (8799, test/e2e/mock-office.mjs). Never the real CRM.
import { chromium } from 'playwright';
const M = 'http://127.0.0.1:8799';
const mode = (m) => fetch(`${M}/mode/${m}`);
const crmCount = async () => (await (await fetch(`${M}/last`)).json()).count;
const crmLast = async () => (await (await fetch(`${M}/last`)).json()).last;
const out = [];
const check = (ok, label, detail = '') => out.push(`${ok ? '✔' : '✘'} ${label}${detail ? `  [${detail}]` : ''}`);
const ev = (p, n) => p.evaluate((n) => (window.dataLayer || []).filter((e) => e.event === n).length, n).catch(() => -1);
const PHONE_MISSING = 'יש להזין מספר טלפון', PHONE_INVALID = 'יש להזין מספר טלפון תקין';
const MSG = { full_name: 'יש להזין שם מלא', phone: PHONE_MISSING, email: 'נא להזין כתובת אימייל תקינה', consent: 'יש לאשר את מדיניות הפרטיות' };
const FAIL = 'לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ.';
const UNSURE = 'לא ניתן לוודא שהפרטים נקלטו. ייתכן שהם נשמרו בכל זאת, ולכן מומלץ לא לשלוח את הטופס שוב כרגע. אפשר ליצור קשר בטלפון או בוואטסאפ.';
const crmSaved = async () => (await (await fetch(`${M}/last`)).json()).saved;
const crmState = async () => (await fetch(`${M}/last`)).json();
const crmLeads = async () => (await fetch(`${M}/leads`)).json();
const CONSENT = 'קראתי ומאשר/ת את מדיניות הפרטיות';
const SOURCE = { home: 'website-home', contact: 'website-contact', 'lp-home': 'lp-home', 'lp-architecture': 'lp-architecture', 'lp-interior-design': 'lp-interior-design', 'lp-renovation': 'lp-renovation' };
const LABEL = { 'website-home': 'Website – General Enquiry', 'website-contact': 'Website – General Enquiry', 'lp-home': 'Landing Page – General Enquiry',
  'lp-architecture': 'Architecture', 'lp-interior-design': 'Interior Design', 'lp-renovation': 'Renovation' };
const VALID = { full_name: 'בדיקה טופס', phone: '050-1234567', email: 'test@example.com' };

const SITES = [
  { name: 'www', base: 'http://127.0.0.1:8787', pages: [['/', 'home'], ['/יצירת-קשר', 'contact']], form: '.contact-form', submit: '.send', fail: '.status:not(.status-uncertain)', unsure: '.status-uncertain',
    thanks: '/thankyou', consent: false, wa: { float: '.wa-float', number: '972505788634' }, src: 'website / google / cpc' },
  { name: 'lp', base: 'http://127.0.0.1:8788', pages: [['/', 'lp-home'], ['/architecture/', 'lp-architecture'], ['/interior-design/', 'lp-interior-design'], ['/renovation/', 'lp-renovation']],
    form: '.lp-form', submit: '.lp-submit', fail: '.lp-form-error:not(.lp-form-uncertain)', unsure: '.lp-form-uncertain', thanks: '/thankyou/', consent: true, wa: { float: '.lp-wa', number: '972524317164' }, src: 'landing-page / google / cpc' },
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
    // A genuinely new enquiry (new visitor): no stored submission ID for any form.
    const newEnquiry = () => p.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('hl_submission:')).forEach((k) => sessionStorage.removeItem(k))).catch(() => {});
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
    const bad = [['full_name', ''], ['phone', '', PHONE_MISSING], ['phone', '   ', PHONE_MISSING], ['phone', '12345', PHONE_INVALID],
      ['phone', '052-431-716', PHONE_INVALID], ['phone', '06-1234567', PHONE_INVALID], ['phone', 'abc', PHONE_INVALID], ['email', ''], ['email', 'not-an-email']];
    for (const [f, v, msg = MSG[f]] of bad) {
      await go(path0); await fill({ ...VALID, [f]: v });
      await p.click(F(S.submit)); await p.waitForTimeout(250);
      const e = await shown();
      check(JSON.stringify(e) === JSON.stringify({ [f]: msg }) && (await focused()) === f && apiCalls === 0,
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
    const wasInvalid = (await shown()).phone === PHONE_INVALID;
    await p.fill(F('[name=phone]'), ''); await p.waitForTimeout(150);
    const nowMissing = (await shown()).phone === PHONE_MISSING;
    await p.fill(F('[name=phone]'), VALID.phone); await p.waitForTimeout(150);
    check(kept && wasInvalid && nowMissing && !('phone' in await shown()), t('values kept; phone message switches invalid → missing while editing, clears once corrected'));

    // 3b. valid Israeli formats are accepted and sent as typed (no rejection because of formatting)
    for (const ph of ['052 431 7164', '+972-52-431-7164', '(03) 123-4567', '0524317164']) {
      await mode('ok'); await go(path0); await fill({ ...VALID, phone: ph }); const c = await crmCount();
      await p.click(F(S.submit)); await p.waitForURL(`**${S.thanks}`, { timeout: 15000 }).catch(() => {});
      const sent = JSON.parse((await crmLast())?.body || '{}');
      check(p.url().endsWith(S.thanks) && (await crmCount()) === c + 1 && sent.phone === ph, t(`phone "${ph}" accepted and delivered as typed`));
    }

    // 4. server-side rejection: browser check bypassed → Worker 400 names the field, form shows it, nothing sent
    const before = await crmCount();
    const api = await p.evaluate(async () => { const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: 'x', phone: '123', email: 'a@b.co', form: document.querySelector('form[data-form],form[data-location]')?.dataset.form || 'home' }) }); return [r.status, await r.json()]; });
    const api2 = await p.evaluate(async () => { const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: 'x', phone: '', email: 'a@b.co', form: document.querySelector('form[data-form],form[data-location]')?.dataset.form || 'home' }) }); return [r.status, await r.json()]; });
    check(api[0] === 400 && api[1].error === 'invalid_phone' && api[1].field === 'phone' && api2[0] === 400 && api2[1].error === 'missing_phone' && (await crmCount()) === before,
      t('server rejects missing / invalid phone separately (400 missing_phone / invalid_phone), nothing sent to OfficeCRM'));
    await p.route('**/api/lead', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false,"error":"invalid_phone","field":"phone"}' }));
    await go(path0); await fill();
    await p.click(F(S.submit)); await p.waitForTimeout(400);
    check(JSON.stringify(await shown()) === JSON.stringify({ phone: PHONE_INVALID }) && (await focused()) === 'phone' && !(await p.isVisible(F(S.fail))),
      t('server invalid_phone shown as "מספר טלפון תקין" next to the phone field, focused'));
    await p.unroute('**/api/lead');
    await p.route('**/api/lead', (r) => r.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false,"error":"invalid_email","field":"email"}' }));
    await go(path0); await fill();
    await p.click(F(S.submit)); await p.waitForTimeout(400);
    check(JSON.stringify(await shown()) === JSON.stringify({ email: MSG.email }) && !(await p.isVisible(F(S.fail))) && !p.url().includes('thankyou') && (await ev(p, 'generate_lead')) === 0,
      t('server field rejection shown next to the field (not as a generic failure), no conversion'));
    await p.unroute('**/api/lead');

    // 5. success on every form, button disabled while sending, double click sends once
    for (const [path, formId] of S.pages) {
      await mode('ok'); await go(path); await newEnquiry(); await fill(); const c = await crmCount();
      const msg = `הודעת בדיקה ${vp} ${formId}`;
      if (!S.consent) await p.fill(F('[name=message]'), msg);
      await p.route('**/api/lead', async (r) => { await new Promise((ok) => setTimeout(ok, 800)); await r.continue(); });
      await p.click(F(S.submit));
      const disabled = await p.$eval(F(S.submit), (el) => el.disabled);
      await p.click(F(S.submit), { force: true }).catch(() => {});
      await p.waitForURL(`**${S.thanks}`, { timeout: 15000 }).catch(() => {});
      await p.unroute('**/api/lead');
      const lastReq = await crmLast(); const sent = JSON.parse(lastReq?.body || '{}');
      const stored = (await crmLeads()).find((l) => l.submission_id === sent.submission_id) || {};
      const expectSrc = SOURCE[formId];
      check(disabled && (await crmCount()) === c + 1, t(`${path}: button disabled while sending, exactly one OfficeCRM request`));
      check(p.url().endsWith(S.thanks) && (await ev(p, 'generate_lead')) === 1, t(`${path}: thank-you + one generate_lead (${formId})`));
      check(sent.contract === 'website-v1' && sent.lead_source === expectSrc && lastReq.idempotencyKey === sent.submission_id && /^[0-9a-f-]{36}$/.test(sent.submission_id)
        && !('source' in sent) && !('notes' in sent),
        t(`${path}: website-v1, lead_source ${expectSrc}, Idempotency-Key = submission_id, no source/notes`), sent.lead_source);
      const ctxOk = sent.context?.form_name === expectSrc && sent.context?.page_url === `${S.base}${encodeURI(path)}` && sent.context?.site === new URL(S.base).host
        && !!sent.context?.submitted_at && sent.context?.utm_source === 'google' && sent.context?.utm_campaign === 't';
      check(ctxOk, t(`${path}: context (site, page_url without query, form_name, submitted_at, UTMs)`), JSON.stringify(sent.context).slice(0, 90));
      if (S.consent) check(sent.consent?.given === true && sent.consent?.text === CONSENT && sent.consent?.policy_url === `${S.base}/privacy/` && !!sent.consent?.given_at && !('message' in sent),
        t(`${path}: consent object with the exact displayed wording; no message field`));
      else check(sent.message === msg && !('consent' in sent), t(`${path}: message mapped, no consent object`));
      check(stored.category === LABEL[expectSrc] && stored.name === VALID.full_name && stored.phone === VALID.phone && stored.email === VALID.email,
        t(`${path}: fake CRM stored one lead, category "${LABEL[expectSrc]}", contact details as typed`), stored.category);
    }
    await p.reload(); check((await ev(p, 'generate_lead')) === 0, t('thank-you refresh: no second conversion'));

    // 6. not delivered. "not_saved" (OfficeCRM refused before writing): the retry message.
    //    "unknown" (the lead may exist): the uncertain message, which never invites a resubmit. Never success.
    for (const [m, kind, savedDelta] of [
      ['not-configured', 'not_saved', 0], ['force-400', 'not_saved', 0], ['in-progress', 'unknown', 0], ['500', 'unknown', 0], ['500-after-save', 'unknown', 1], ['slow-after-save', 'unknown', 1],
      ['hang', 'unknown', 0], ['reset', 'unknown', 0], ['malformed', 'unknown', 1], ['browser-offline', 'unknown', 0],
    ]) {
      if (m === 'browser-offline') { await mode('ok'); await p.route('**/api/lead', (r) => r.abort('internetdisconnected')); } else await mode(m);
      await go(S.pages[S.pages.length - 1][0]); await newEnquiry(); await fill(); const s0 = await crmSaved();
      await p.click(F(S.submit));
      const shownSel = kind === 'not_saved' ? S.fail : S.unsure, otherSel = kind === 'not_saved' ? S.unsure : S.fail;
      await p.waitForSelector(`${S.form} ${shownSel}:not([hidden])`, { timeout: 30000 }).catch(() => {});
      const txt = (await p.textContent(F(shownSel)).catch(() => '')).replace(/\s+/g, ' ').trim();
      const keptAll = await p.inputValue(F('[name=full_name]')) === VALID.full_name && await p.inputValue(F('[name=phone]')) === VALID.phone && await p.inputValue(F('[name=email]')) === VALID.email;
      const links = await p.$$eval(`${S.form} ${shownSel} a`, (as) => as.map((a) => a.getAttribute('href')));
      check(txt === (kind === 'not_saved' ? FAIL : UNSURE) && !(await p.isVisible(F(otherSel))) && keptAll && Object.keys(await shown()).length === 0
        && !p.url().includes('thankyou') && (await ev(p, 'generate_lead')) === 0 && !(await p.$eval(F(S.submit), (el) => el.disabled)),
        t(`CRM ${m}: ${kind === 'not_saved' ? 'retry' : 'uncertain'} message only, values kept, no redirect, no conversion`), txt.slice(0, 30));
      if (m !== 'browser-offline') check((await crmSaved()) - s0 === savedDelta, t(`CRM ${m}: fake CRM stored ${savedDelta} lead(s)${savedDelta ? ' although the visitor saw no success' : ''}`));
      check(links.includes(`tel:+${S.wa.number}`) && links.some((h) => /whatsapp|wa\.me/.test(h) && h.includes(S.wa.number)) && links.length === 2, t(`CRM ${m}: phone/WhatsApp links use this site's number`), links.join(' '));
      if (m === 'browser-offline') await p.unroute('**/api/lead');
    }
    await mode('ok');

    // 6b. Idempotency (OfficeCRM website-v1): one submission ID per enquiry; resends reuse it; exactly one lead.
    {
      const path = S.pages[S.pages.length - 1][0];
      const submitAndWait = async (sel) => { await p.click(F(S.submit)); await p.waitForSelector(sel, { timeout: 30000 }).catch(() => {}); };
      // (a) lost response: the CRM saves, the answer is dropped → uncertain; the resend replays the same ID → one lead
      await go(path); await newEnquiry(); await fill(); const s0 = await crmState();
      await mode('drop-after-save-once');
      await submitAndWait(`${S.form} ${S.unsure}:not([hidden])`);
      const k1 = (await crmLast()).idempotencyKey; const afterFirst = await crmState();
      check(await p.isVisible(F(S.unsure)) && afterFirst.saved === s0.saved + 1 && (await ev(p, 'generate_lead')) === 0,
        t('lost response: CRM saved the lead, visitor sees "uncertain", no conversion'));
      await p.click(F(S.submit)); await p.waitForURL(`**${S.thanks}`, { timeout: 15000 }).catch(() => {});
      const k2 = (await crmLast()).idempotencyKey; const afterResend = await crmState();
      check(k1 === k2 && afterResend.saved === s0.saved + 1 && p.url().endsWith(S.thanks) && (await ev(p, 'generate_lead')) === 1,
        t('lost response → resend: same submission ID, still ONE lead (duplicate replay), thank-you, exactly one generate_lead'), `${k1 === k2} saved+${afterResend.saved - s0.saved}`);
      // (b) edited resend after an uncertain outcome: same ID, no second lead, the edit kept as a revision
      await go(path); await newEnquiry(); await fill(); const e0 = await crmState();
      await mode('drop-after-save-once');
      await submitAndWait(`${S.form} ${S.unsure}:not([hidden])`);
      const ke1 = (await crmLast()).idempotencyKey;
      await p.fill(F('[name=full_name]'), `${VALID.full_name} (תוקן)`);
      if (S.consent) await p.check(F('[name=consent]'));
      await p.click(F(S.submit)); await p.waitForURL(`**${S.thanks}`, { timeout: 15000 }).catch(() => {});
      const ke2 = (await crmLast()).idempotencyKey; const e1 = await crmState();
      check(ke1 === ke2 && e1.saved === e0.saved + 1 && e1.revisions === e0.revisions + 1 && (await ev(p, 'generate_lead')) === 1,
        t('edited resend: same submission ID, one lead, edit stored as a revision, one generate_lead'), `saved+${e1.saved - e0.saved} rev+${e1.revisions - e0.revisions}`);
      // (c) lost response, then a page reload before resending: the ID survives in sessionStorage
      await go(path); await newEnquiry(); await fill(); const r0 = await crmState();
      await mode('drop-after-save-once');
      await submitAndWait(`${S.form} ${S.unsure}:not([hidden])`);
      const kr1 = (await crmLast()).idempotencyKey;
      await p.reload(); await fill();
      await p.click(F(S.submit)); await p.waitForURL(`**${S.thanks}`, { timeout: 15000 }).catch(() => {});
      const kr2 = (await crmLast()).idempotencyKey; const r1 = await crmState();
      check(kr1 === kr2 && r1.saved === r0.saved + 1 && (await ev(p, 'generate_lead')) === 1, t('lost response + reload + resend: same ID, one lead, one generate_lead'));
      // (d) a genuinely new enquiry after a confirmed lead gets a new ID → a new lead
      await go(path); await fill(); const n0 = await crmState();
      await p.click(F(S.submit)); await p.waitForURL(`**${S.thanks}`, { timeout: 15000 }).catch(() => {});
      const kn = (await crmLast()).idempotencyKey; const n1 = await crmState();
      check(kn !== kr2 && n1.saved === n0.saved + 1, t('new enquiry after a confirmed lead: new submission ID, new lead'));
      // (e) CRM validation rejection (400) is "not saved" (retry message), never "uncertain"; no conversion
      await mode('force-400'); await go(path); await newEnquiry(); await fill(); const v0 = await crmState();
      await submitAndWait(`${S.form} ${S.fail}:not([hidden])`);
      const v1 = await crmState();
      check(await p.isVisible(F(S.fail)) && !(await p.isVisible(F(S.unsure))) && v1.saved === v0.saved && (await ev(p, 'generate_lead')) === 0 && !p.url().includes('thankyou'),
        t('CRM 400 validation: "not saved" retry message, not uncertain; nothing stored; no conversion'));
      await mode('ok');
    }

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
        if (path === '/privacy/' || path === '/accessibility-statement/') {
          const mails = await p.$$eval('a[href^="mailto:"]', (as) => as.map((a) => [a.getAttribute('href'), a.textContent.trim()]));
          const body = await p.textContent('main, body');
          check(mails.length >= 1 && mails.every(([h, x]) => h === 'mailto:lushi.office@gmail.com' && x === 'lushi.office@gmail.com') && !/mr\.hadas@|hagarlushi@/.test(body),
            t(`${path}: legal contact email lushi.office@gmail.com (link), old addresses gone`), JSON.stringify(mails));
        }
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
