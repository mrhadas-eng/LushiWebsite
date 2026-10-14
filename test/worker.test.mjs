// Tests for /api/lead against the OfficeCRM "website-v1" contract (docs/OFFICECRM-INTEGRATION-CONTRACT.md). Run: npm test
// No real CRM is contacted: requests go to an injected fetch or a local fake server.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as workerModule from '../worker/index.js';
import worker, { handleLead, validateLead, toCrmPayload } from '../worker/index.js';
import { CONSENT_TEXT, LEAD_SOURCES } from '../src/lib/lead-rules.js';

const ORIGIN = 'https://www.hagarlushi.com';
const TEST_KEY = 'test-key-not-real';
const ENV = { CRM_WEBHOOK_URL: 'https://crm.example.test/api/leads/webhook', LEADS_WEBHOOK_API_KEY: TEST_KEY };

// What the website's form sends to /api/lead
const SID = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c';
const CONTACT_PATH = encodeURI('/יצירת-קשר');   // the browser sends location.pathname (percent-encoded)
const SITE_LEAD = {
  full_name: 'ישראל ישראלי', email: 'test@example.com', phone: '050-1234567',
  message: 'מעוניין בתכנון מטבח', form: 'contact', page_path: CONTACT_PATH, landing_page: '/',
  utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'autumn', gclid: 'abc123',
  referrer: 'https://www.google.com/', submitted_at: '2026-10-11T09:00:00.000Z',
  submission_id: SID,
};

function req(body, { method = 'POST', origin = ORIGIN, type = 'application/json', site = 'same-origin', raw } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (type) headers['Content-Type'] = type;
  if (site) headers['Sec-Fetch-Site'] = site;
  return new Request(`${ORIGIN}/api/lead`, { method, headers, body: method === 'GET' ? undefined : (raw ?? JSON.stringify(body)) });
}

/** Injected fetch that records calls and answers like OfficeCRM (or however the test asks). */
function crm(status = 200, body = JSON.stringify({ success: true, leadId: 'lead_42' })) {
  const calls = [];
  const impl = async (url, init) => { calls.push({ url, init }); return new Response(body, { status }); };
  return { calls, impl };
}
const post = (body, env = ENV, c = crm(), opts = {}) => handleLead(req(body), env, { fetchImpl: c.impl, ...opts });

test('module exports only functions and the default handler (the Workers runtime rejects anything else)', () => {
  for (const [name, value] of Object.entries(workerModule)) {
    if (name === 'default') assert.equal(typeof value.fetch, 'function');
    else assert.equal(typeof value, 'function', `export "${name}" must be a function`);
  }
});

// ---------------------------------------------------------------- request to OfficeCRM

test('sends to the configured endpoint with Bearer auth and JSON content type', async () => {
  const c = crm();
  const res = await post(SITE_LEAD, ENV, c);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(c.calls.length, 1);
  const { url, init } = c.calls[0];
  assert.equal(url, ENV.CRM_WEBHOOK_URL);
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.headers.Authorization, `Bearer ${TEST_KEY}`);
  assert.equal(init.headers['Idempotency-Key'], SID, 'Idempotency-Key header = submission_id');
  assert.equal(JSON.parse(init.body).submission_id, SID, 'body submission_id exactly matches the header');
});

test('a key stored with a "Bearer " prefix is not doubled', async () => {
  const c = crm();
  await post(SITE_LEAD, { ...ENV, LEADS_WEBHOOK_API_KEY: `Bearer ${TEST_KEY}` }, c);
  assert.equal(c.calls[0].init.headers.Authorization, `Bearer ${TEST_KEY}`);
});

test('website-v1 body for the main-site contact form: exact fields; no source / notes / referrerName', async () => {
  const c = crm();
  await post({ ...SITE_LEAD, admin: 'x', source: 'spoof', notes: 'spoof', page_url: 'https://evil.example/', site: 'evil.example' }, ENV, c);
  const sent = JSON.parse(c.calls[0].init.body);
  assert.deepEqual(sent, {
    contract: 'website-v1',
    submission_id: SID,
    lead_source: 'website-contact',
    name: 'ישראל ישראלי',
    phone: '050-1234567',
    email: 'test@example.com',
    message: 'מעוניין בתכנון מטבח',
    context: {
      site: 'www.hagarlushi.com',                                   // from the Worker's own origin, not the browser
      page_url: `https://www.hagarlushi.com${CONTACT_PATH}`,        // origin + path, no query string
      form_name: 'website-contact',
      submitted_at: '2026-10-11T09:00:00.000Z',
      landing_page: '/', referrer: 'https://www.google.com/',
      utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'autumn', gclid: 'abc123',
    },
  });
  assert.ok(!('consent' in sent), 'no consent object on main-site forms');
});

test('lead_source: the six fixed identifiers, from the form id only (never from the URL or campaign data)', async () => {
  const cases = [
    ['home', 'https://www.hagarlushi.com', '/', 'website-home'],
    ['contact', 'https://www.hagarlushi.com', CONTACT_PATH, 'website-contact'],
    ['lp-home', 'https://lp.hagarlushi.com', '/', 'lp-home'],
    ['lp-architecture', 'https://lp.hagarlushi.com', '/architecture/', 'lp-architecture'],
    ['lp-interior-design', 'https://lp.hagarlushi.com', '/interior-design/', 'lp-interior-design'],
    ['lp-renovation', 'https://lp.hagarlushi.com', '/renovation/', 'lp-renovation'],
  ];
  assert.deepEqual(Object.values(LEAD_SOURCES).sort(), cases.map((x) => x[3]).sort());
  for (const [form, origin, path, expected] of cases) {
    const body = toCrmPayload({ ...SITE_LEAD, form, page_path: path, utm_campaign: 'interior_design', utm_source: 'architecture', consent: 'yes' }, { origin });
    assert.equal(body.lead_source, expected, form);
    assert.equal(body.context.form_name, expected, form);
    assert.equal(body.context.page_url, `${origin}${path}`, form);
  }
});

test('landing-page consent object: given, the exact displayed Hebrew wording, policy_url on the same site, given_at', () => {
  assert.equal(CONSENT_TEXT, 'קראתי ומאשר/ת את מדיניות הפרטיות');
  const body = toCrmPayload({ ...SITE_LEAD, form: 'lp-renovation', page_path: '/renovation/', consent: 'yes', message: undefined }, { origin: 'https://lp.hagarlushi.com' });
  assert.deepEqual(body.consent, { given: true, text: CONSENT_TEXT, policy_url: 'https://lp.hagarlushi.com/privacy/', given_at: '2026-10-11T09:00:00.000Z' });
  assert.ok(!('message' in body), 'message omitted when empty');
  assert.equal(body.context.site, 'lp.hagarlushi.com');
});

test('a resend of the same enquiry produces a byte-identical body (stable submitted_at), so OfficeCRM sees a replay', () => {
  const a = JSON.stringify(toCrmPayload(SITE_LEAD, { origin: ORIGIN, now: () => new Date('2030-01-01') }));
  const b = JSON.stringify(toCrmPayload(SITE_LEAD, { origin: ORIGIN, now: () => new Date('2031-01-01') }));
  assert.equal(a, b);
});

// ---------------------------------------------------------------- OfficeCRM responses

test('success only for HTTP 2xx with success: true; a duplicate replay of the same submission is a confirmed lead', async () => {
  for (const body of ['{"success":true,"leadId":"L-1"}', '{"success":true,"leadId":"L-1","duplicate":false}', '{"success":true,"leadId":"L-1","duplicate":true}']) {
    const res = await post(SITE_LEAD, ENV, crm(200, body));
    assert.equal(res.status, 200, body);
    assert.deepEqual(await res.json(), { ok: true });
  }
});

// Real OfficeCRM answers (docs/OFFICECRM-INTEGRATION-CONTRACT.md §1): 401 bad key, 503 not configured → the lead was
// NOT saved (retry is safe). A 500 can follow a successful write, and malformed or unconfirmed 2xx answers prove
// nothing → the outcome is UNKNOWN: never success, never "definitely failed".
const UNKNOWN = { ok: false, error: 'crm_uncertain', outcome: 'unknown' };
const NOT_SAVED = { ok: false, error: 'crm_rejected', outcome: 'not_saved' };
for (const [label, status, body, expected] of [
  ['HTTP 401 (bad key, real OfficeCRM body)', 401, '{"success":false,"error":"Unauthorized. Invalid API Key."}', NOT_SAVED],
  ['HTTP 503 (webhook not configured, real OfficeCRM body)', 503, '{"success":false,"error":"Webhook is not configured."}', NOT_SAVED],
  ['HTTP 400 (website-v1 validation)', 400, '{"success":false,"error":"validation","fields":["email"]}', NOT_SAVED],
  ['HTTP 409 (same key still in progress)', 409, '{"success":false,"error":"in_progress"}', UNKNOWN],
  ['HTTP 404 (route missing)', 404, 'Not Found', NOT_SAVED],
  ['HTTP 500 (may follow a saved lead)', 500, '{"success":false,"error":"x"}', UNKNOWN],
  ['HTTP 502 from a proxy', 502, '<html>Bad gateway</html>', UNKNOWN],
  ['HTTP 200 with success: false', 200, '{"success":false,"error":"duplicate"}', UNKNOWN],
  ['HTTP 200 without success', 200, '{"leadId":"L-1"}', UNKNOWN],
  ['HTTP 200 with success: "true" (string)', 200, '{"success":"true","leadId":"L-1"}', UNKNOWN],
  ['HTTP 200 with malformed JSON', 200, '{"success":tru', UNKNOWN],
  ['HTTP 200 with an empty body', 200, '', UNKNOWN],
]) {
  test(`not confirmed: ${label} → 502 ${expected.outcome}, no success`, async () => {
    const res = await post(SITE_LEAD, ENV, crm(status, body));
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), expected);
  });
}

test('network failure → 502 unknown (the request may have reached OfficeCRM)', async () => {
  const res = await handleLead(req(SITE_LEAD), ENV, { fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), UNKNOWN);
});

test('timeout → 502 unknown (request aborted; OfficeCRM may still have saved it)', async () => {
  let aborted = false;
  const hang = (url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => { aborted = true; reject(init.signal.reason); });
  });
  const res = await handleLead(req(SITE_LEAD), ENV, { fetchImpl: hang, timeoutMs: 50 });
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), UNKNOWN);
  assert.ok(aborted);
});

test('default CRM timeout is 20 s (owner, provisional) and response time is logged without lead data', async () => {
  const src = (await import('node:fs')).readFileSync('worker/index.js', 'utf8');
  assert.match(src, /const CRM_TIMEOUT_MS = 20_000;/);
  const logs = []; const orig = [console.log, console.error];
  console.log = console.error = (m) => logs.push(String(m));
  try {
    let t = 1000; const now = () => (t += 250);
    await handleLead(req(SITE_LEAD), ENV, { fetchImpl: crm(200, '{"success":true,"leadId":"L-7","message":"Lead created successfully"}').impl, now });
    await handleLead(req(SITE_LEAD), ENV, { fetchImpl: crm(500, '{"success":false}').impl, now });
  } finally { [console.log, console.error] = orig; }
  assert.match(logs[0], new RegExp(`^lead: created in OfficeCRM \\(leadId L-7, submission ${SID}, \\d+ ms\\)$`));
  assert.match(logs[1], new RegExp(`^lead: OfficeCRM did not confirm the lead \\(http_500, unknown, submission ${SID}, \\d+ ms\\)$`));
  logs.length = 0;
  console.log = console.error = (m) => logs.push(String(m));
  try { await handleLead(req(SITE_LEAD), ENV, { fetchImpl: crm(200, '{"success":true,"leadId":"L-7","duplicate":true}').impl }); }
  finally { [console.log, console.error] = orig; }
  assert.match(logs[0], /^lead: already in OfficeCRM \(duplicate submission\) \(leadId L-7, submission /);
});

// ---------------------------------------------------------------- configuration

test('missing URL or key → 503 and nothing is sent', async () => {
  for (const env of [{}, { CRM_WEBHOOK_URL: ENV.CRM_WEBHOOK_URL }, { LEADS_WEBHOOK_API_KEY: TEST_KEY }]) {
    const c = crm();
    const res = await post(SITE_LEAD, env, c);
    assert.equal(res.status, 503, JSON.stringify(Object.keys(env)));
    assert.equal(c.calls.length, 0);
  }
});

test('a non-https webhook URL is refused (the key would travel unencrypted)', async () => {
  const c = crm();
  const res = await post(SITE_LEAD, { ...ENV, CRM_WEBHOOK_URL: 'http://crm.example.test/api/leads/webhook' }, c);
  assert.equal(res.status, 503);
  assert.equal(c.calls.length, 0);
});

// ---------------------------------------------------------------- input, origin, spam

test('honeypot: bot gets ok but nothing is forwarded', async () => {
  const c = crm();
  const res = await post({ ...SITE_LEAD, website: 'spam.example' }, ENV, c);
  assert.equal(res.status, 200);
  assert.equal(c.calls.length, 0);
});

test('cross-origin, missing-origin and cross-site requests are rejected', async () => {
  for (const opts of [{ origin: 'https://evil.example' }, { origin: null }, { site: 'cross-site' }]) {
    const c = crm();
    const res = await handleLead(req(SITE_LEAD, opts), ENV, { fetchImpl: c.impl });
    assert.equal(res.status, 403, JSON.stringify(opts));
    assert.equal(c.calls.length, 0);
  }
});

test('wrong method, content type, size and JSON are rejected', async () => {
  const opt = { fetchImpl: crm().impl };
  assert.equal((await handleLead(req(null, { method: 'GET' }), ENV, opt)).status, 405);
  assert.equal((await handleLead(req(SITE_LEAD, { type: 'text/plain' }), ENV, opt)).status, 415);
  assert.equal((await handleLead(req(null, { raw: '{"a":' }), ENV, opt)).status, 400);
  assert.equal((await handleLead(req({ ...SITE_LEAD, message: 'א'.repeat(6000) }), ENV, opt)).status, 413);
});

test('validation: name, phone, email, form, submission ID and page path are required (website-v1)', async () => {
  const lead = { full_name: 'דנה', phone: '050-1234567', email: 'a@b.co', form: 'home', submission_id: SID, page_path: '/' };
  assert.ok(validateLead(lead).lead);
  assert.equal(validateLead({ ...lead, full_name: '' }).error, 'missing_name');
  assert.equal(validateLead({ ...lead, phone: '' }).error, 'missing_phone');
  assert.equal(validateLead({ ...lead, phone: 'call me' }).error, 'invalid_phone');
  assert.equal(validateLead({ ...lead, email: '' }).error, 'invalid_email');
  assert.equal(validateLead({ ...lead, email: 'not-an-email' }).error, 'invalid_email');
  assert.equal(validateLead({ ...lead, email: 42 }).error, 'invalid_email');
  assert.equal(validateLead({ ...lead, form: 'other' }).error, 'invalid_form');
  assert.equal(validateLead({ ...lead, form: undefined }).error, 'invalid_form');
  assert.equal(validateLead({ ...lead, submission_id: undefined }).error, 'invalid_submission_id');
  assert.equal(validateLead({ ...lead, submission_id: 'not-a-uuid' }).error, 'invalid_submission_id');
  assert.equal(validateLead({ ...lead, page_path: '/?utm_source=x' }).error, 'invalid_page_path');
  assert.equal(validateLead({ ...lead, page_path: 'https://evil.example/' }).error, 'invalid_page_path');
  assert.equal(validateLead({ ...lead, full_name: 'א'.repeat(201) }).error, 'too_long_full_name');
  assert.equal(validateLead({ ...lead, message: 'א'.repeat(5001) }).error, 'too_long_message');
  const c = crm();
  const res = await post({ email: 'a@b.co', full_name: 'x' }, ENV, c);
  assert.equal(res.status, 400);
  assert.equal(c.calls.length, 0);
});

test('router: /api/lead handled, other /api paths 404, pages go to static assets', async () => {
  const env = { ...ENV, ASSETS: { fetch: async () => new Response('asset', { status: 200 }) } };
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/api/other`), env)).status, 404);
  assert.equal(await (await worker.fetch(new Request(`${ORIGIN}/אודות`), env)).text(), 'asset');
  assert.equal((await worker.fetch(req(null, { method: 'GET' }), env)).status, 405);
});

// ---------------------------------------------------------------- logs

test('logs never contain lead data, the webhook URL or the key', async () => {
  const lines = [];
  const orig = { log: console.log, error: console.error };
  console.log = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  try {
    await post(SITE_LEAD, ENV, crm());
    await post(SITE_LEAD, ENV, crm(500, 'boom'));
    await post(SITE_LEAD, {}, crm());
  } finally { Object.assign(console, orig); }
  const all = lines.join('\n');
  assert.ok(lines.length >= 3);
  for (const secret of [TEST_KEY, ENV.CRM_WEBHOOK_URL, 'crm.example.test', SITE_LEAD.email, SITE_LEAD.phone, SITE_LEAD.full_name]) {
    assert.ok(!all.includes(secret), `log leaked: ${secret}`);
  }
});

// ---------------------------------------------------------------- real HTTP round trip

// A local server that behaves like the OfficeCRM leads webhook.
let received = [];
const mock = http.createServer((rq, rs) => {
  let body = '';
  rq.on('data', (c) => (body += c));
  rq.on('end', () => {
    received.push({ method: rq.method, url: rq.url, headers: rq.headers, body });
    rs.setHeader('Content-Type', 'application/json');
    if (rq.headers.authorization !== `Bearer ${TEST_KEY}`) { rs.statusCode = 401; return rs.end('{"success":false,"error":"unauthorized"}'); }
    let lead; try { lead = JSON.parse(body); } catch { rs.statusCode = 400; return rs.end('{"success":false}'); }
    if (lead.contract !== 'website-v1' || rq.headers['idempotency-key'] !== lead.submission_id
      || !['name', 'phone', 'email', 'lead_source'].every((k) => typeof lead[k] === 'string' && lead[k])) {
      rs.statusCode = 400; return rs.end('{"success":false,"error":"validation"}');
    }
    rs.end(JSON.stringify({ success: true, leadId: `lead_${received.length}` }));
  });
});
await new Promise((r) => mock.listen(0, '127.0.0.1', r));
const MOCK_URL = `http://127.0.0.1:${mock.address().port}/api/leads/webhook`;
after(() => mock.close());

test('round trip through a mock OfficeCRM server (real HTTP)', async () => {
  received = [];
  const res = await handleLead(req(SITE_LEAD), { CRM_WEBHOOK_URL: MOCK_URL, LEADS_WEBHOOK_API_KEY: TEST_KEY });
  assert.equal(res.status, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].method, 'POST');
  assert.equal(received[0].url, '/api/leads/webhook');
  assert.match(received[0].headers['content-type'], /^application\/json/);
  assert.equal(JSON.parse(received[0].body).name, SITE_LEAD.full_name);
  assert.equal(received[0].headers['idempotency-key'], SID);
});

test('round trip with a wrong key: OfficeCRM 401 → not confirmed', async () => {
  const res = await handleLead(req(SITE_LEAD), { CRM_WEBHOOK_URL: MOCK_URL, LEADS_WEBHOOK_API_KEY: 'wrong' });
  assert.equal(res.status, 502);
});

// ---------------------------------------------------------------- landing pages (lp.hagarlushi.com)

const LP_ORIGIN = 'https://lp.hagarlushi.com';
const LP_LEAD = {
  full_name: 'ישראל ישראלי', email: 'test@example.com', phone: '050-1234567', consent: 'yes',
  form: 'lp-architecture', submission_id: SID,
  page_path: '/architecture/', landing_page: '/architecture/', utm_source: 'google', utm_medium: 'cpc',
  utm_campaign: 'arch', gclid: 'abc123', submitted_at: '2026-10-11T09:00:00.000Z',
};
const lpReq = (body) => new Request(`${LP_ORIGIN}/api/lead`, {
  method: 'POST', body: JSON.stringify(body),
  headers: { Origin: LP_ORIGIN, 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' },
});

test('landing-page forms: website-v1 with lead_source, context and consent for all four forms', async () => {
  for (const [form, path] of [['lp-home', '/'], ['lp-architecture', '/architecture/'], ['lp-interior-design', '/interior-design/'], ['lp-renovation', '/renovation/']]) {
    const c = crm();
    const res = await handleLead(lpReq({ ...LP_LEAD, form, page_path: path }), ENV, { fetchImpl: c.impl });
    assert.equal(res.status, 200, form);
    const sent = JSON.parse(c.calls[0].init.body);
    assert.deepEqual(Object.keys(sent).sort(), ['consent', 'context', 'contract', 'email', 'lead_source', 'name', 'phone', 'submission_id']);
    assert.equal(sent.lead_source, form);
    assert.deepEqual(sent.consent, { given: true, text: CONSENT_TEXT, policy_url: `${LP_ORIGIN}/privacy/`, given_at: LP_LEAD.submitted_at });
    assert.deepEqual(sent.context, {
      site: 'lp.hagarlushi.com', page_url: `${LP_ORIGIN}${path}`, form_name: form, submitted_at: LP_LEAD.submitted_at,
      landing_page: '/architecture/', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'arch', gclid: 'abc123',
    });
    assert.equal(c.calls[0].init.headers['Idempotency-Key'], SID);
  }
});

test('landing-page forms: the privacy-policy consent is required server-side', async () => {
  for (const consent of [undefined, '', 'no']) {
    const c = crm();
    const res = await handleLead(lpReq({ ...LP_LEAD, consent }), ENV, { fetchImpl: c.impl });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'missing_consent');
    assert.equal(c.calls.length, 0, 'nothing sent to the CRM without consent');
  }
  assert.equal(validateLead({ ...LP_LEAD, form: 'lp-unknown' }).error, 'invalid_form');
});

test('landing-page forms: CRM failure is not confirmed (no thank-you page)', async () => {
  for (const c of [crm(500, '{}'), crm(200, JSON.stringify({ success: false }))]) {
    const res = await handleLead(lpReq(LP_LEAD), ENV, { fetchImpl: c.impl });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).ok, false);
  }
});

test('invalid requests: 400 names the field so the form can show the message next to it; nothing sent', async () => {
  for (const [patch, error, field] of [
    [{ full_name: '' }, 'missing_name', 'full_name'], [{ phone: '' }, 'missing_phone', 'phone'], [{ phone: '123' }, 'invalid_phone', 'phone'],
    [{ email: 'x@' }, 'invalid_email', 'email'], [{ consent: '' }, 'missing_consent', 'consent'],
  ]) {
    const c = crm();
    const res = await handleLead(lpReq({ ...LP_LEAD, ...patch }), ENV, { fetchImpl: c.impl });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { ok: false, error, field });
    assert.equal(c.calls.length, 0);
  }
});
