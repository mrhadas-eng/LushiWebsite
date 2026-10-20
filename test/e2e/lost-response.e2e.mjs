// Lost-response recovery through the response-dropping proxy (test plan T10c), against the fake CRM.
// Setup: fake CRM on 8799; `node test/e2e/drop-response-proxy.mjs 8798 http://127.0.0.1:8799`;
// an lp Worker whose CRM_WEBHOOK_URL points at the proxy, e.g.
//   npx wrangler dev -c wrangler.lp.jsonc --port 8786 --var CRM_WEBHOOK_URL:http://127.0.0.1:8798/api/leads/webhook
// The same procedure is used later against a LOCAL OfficeCRM (never production).
import { chromium } from 'playwright';
const M = 'http://127.0.0.1:8799', P = 'http://127.0.0.1:8798', B = process.env.LP_VIA_PROXY || 'http://127.0.0.1:8786';
const out = [];
const check = (ok, label, detail = '') => out.push(`${ok ? '✔' : '✘'} ${label}${detail ? `  [${detail}]` : ''}`);
const state = async () => (await fetch(`${M}/last`)).json();
const stats = async () => (await fetch(`${P}/proxy-stats`)).json();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const p = await (await b.newContext()).newPage();
const ev = (n) => p.evaluate((n) => (window.dataLayer || []).filter((e) => e.event === n).length, n).catch(() => -1);
await fetch(`${M}/mode/ok`);
await p.goto(`${B}/architecture/?utm_source=crmtest`);
await p.fill('.lp-form [name=full_name]', 'בדיקה אובדן תשובה');
await p.fill('.lp-form [name=phone]', '052-431-7164');
await p.fill('.lp-form [name=email]', 'test@example.com');
await p.check('.lp-form [name=consent]');
const s0 = await state(), d0 = await stats();
await fetch(`${P}/proxy-mode/drop-once`);
await p.click('.lp-form .lp-submit');
await p.waitForSelector('.lp-form-uncertain:not([hidden])', { timeout: 30000 }).catch(() => {});
const s1 = await state(), d1 = await stats(), key1 = s1.last?.idempotencyKey;
check(d1.dropped === d0.dropped + 1 && s1.saved === s0.saved + 1, 'proxy forwarded the request, the CRM saved the lead, the answer was dropped');
check(await p.isVisible('.lp-form-uncertain') && (await ev('generate_lead')) === 0 && !p.url().includes('thankyou'), 'visitor sees the uncertain message; no conversion');
await p.click('.lp-form .lp-submit');
await p.waitForURL('**/thankyou/', { timeout: 15000 }).catch(() => {});
const s2 = await state();
check(s2.last?.idempotencyKey === key1, 'resend carries the same Idempotency-Key / submission_id', key1);
check(s2.saved === s0.saved + 1, 'still exactly ONE lead (the CRM replayed it as a duplicate)', `saved +${s2.saved - s0.saved}`);
check(p.url().endsWith('/thankyou/') && (await ev('generate_lead')) === 1, 'thank-you page and exactly one generate_lead');
await b.close();
console.log(out.join('\n'));
console.log(`\n${out.filter((l) => l.startsWith('✘')).length} failed of ${out.length}`);
