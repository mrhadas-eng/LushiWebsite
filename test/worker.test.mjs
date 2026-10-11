// Tests for /api/lead against the OfficeCRM leads-webhook contract. Run: npm test
// No real CRM is contacted: requests go to an injected fetch or a local mock server.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as workerModule from '../worker/index.js';
import worker, { handleLead, validateLead, toCrmPayload, leadSource } from '../worker/index.js';

const ORIGIN = 'https://www.hagarlushi.com';
const TEST_KEY = 'test-key-not-real';
const ENV = { CRM_WEBHOOK_URL: 'https://crm.example.test/api/leads/webhook', LEADS_WEBHOOK_API_KEY: TEST_KEY };

// What the website's form sends to /api/lead
const SITE_LEAD = {
  full_name: 'ישראל ישראלי', email: 'test@example.com', phone: '050-1234567',
  message: 'מעוניין בתכנון מטבח', form: 'contact', page_path: '/יצירת-קשר', landing_page: '/',
  utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'autumn', gclid: 'abc123',
  referrer: 'https://www.google.com/', submitted_at: '2026-10-11T09:00:00.000Z', site: 'www.hagarlushi.com',
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
});

test('a key stored with a "Bearer " prefix is not doubled', async () => {
  const c = crm();
  await post(SITE_LEAD, { ...ENV, LEADS_WEBHOOK_API_KEY: `Bearer ${TEST_KEY}` }, c);
  assert.equal(c.calls[0].init.headers.Authorization, `Bearer ${TEST_KEY}`);
});

test('maps the website payload to exactly the OfficeCRM fields', async () => {
  const c = crm();
  await post({ ...SITE_LEAD, admin: 'x' }, ENV, c);
  const sent = JSON.parse(c.calls[0].init.body);
  assert.deepEqual(Object.keys(sent).sort(), ['email', 'name', 'notes', 'phone', 'source']);
  assert.equal(sent.name, SITE_LEAD.full_name);
  assert.equal(sent.phone, SITE_LEAD.phone);
  assert.equal(sent.email, SITE_LEAD.email);
  assert.equal(sent.source, 'website / google / cpc');
  assert.equal(sent.referrerName, undefined, 'referrerName is never invented');
  for (const part of ['מעוניין בתכנון מטבח', 'דף יצירת קשר', '/יצירת-קשר', 'utm_campaign=autumn', 'gclid: abc123', 'https://www.google.com/']) {
    assert.ok(sent.notes.includes(part), `notes should include ${part}`);
  }
});

test('source reflects the acquisition channel', () => {
  const base = { full_name: 'a', phone: '0501234567', email: 'a@b.co' };
  assert.equal(leadSource(base), 'website / direct');
  assert.equal(leadSource({ ...base, utm_source: 'facebook' }), 'website / facebook');
  assert.equal(leadSource({ ...base, gclid: 'x' }), 'website / google-ads');
  assert.equal(leadSource({ ...base, fbclid: 'x' }), 'website / facebook');
  assert.equal(leadSource({ ...base, referrer: 'https://www.instagram.com/p/1' }), 'website / instagram.com');
  assert.equal(leadSource({ ...base, referrer: 'https://www.hagarlushi.com/אודות' }), 'website / direct');
  assert.ok(toCrmPayload(base).notes.includes('טופס'));
});

// ---------------------------------------------------------------- OfficeCRM responses

test('success only for HTTP 2xx with success: true (leadId returned)', async () => {
  const res = await post(SITE_LEAD, ENV, crm(200, '{"success":true,"leadId":"L-1"}'));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

for (const [label, status, body] of [
  ['HTTP 200 with success: false', 200, '{"success":false,"error":"duplicate"}'],
  ['HTTP 200 without success', 200, '{"leadId":"L-1"}'],
  ['HTTP 200 with success: "true" (string)', 200, '{"success":"true","leadId":"L-1"}'],
  ['HTTP 200 with malformed JSON', 200, '{"success":tru'],
  ['HTTP 200 with an empty body', 200, ''],
  ['HTTP 401 (bad key)', 401, '{"success":false,"error":"unauthorized"}'],
  ['HTTP 400 (missing field)', 400, '{"success":false}'],
  ['HTTP 500', 500, 'Internal Server Error'],
]) {
  test(`not confirmed: ${label} → 502, no success`, async () => {
    const res = await post(SITE_LEAD, ENV, crm(status, body));
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { ok: false, error: 'crm_rejected' });
  });
}

test('network failure → 502 crm_unreachable', async () => {
  const res = await handleLead(req(SITE_LEAD), ENV, { fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'crm_unreachable');
});

test('timeout → 502 crm_unreachable (request aborted)', async () => {
  let aborted = false;
  const hang = (url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => { aborted = true; reject(init.signal.reason); });
  });
  const res = await handleLead(req(SITE_LEAD), ENV, { fetchImpl: hang, timeoutMs: 50 });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'crm_unreachable');
  assert.ok(aborted);
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

test('validation: name, phone and email are required (OfficeCRM contract)', async () => {
  const lead = { full_name: 'דנה', phone: '050-1234567', email: 'a@b.co' };
  assert.ok(validateLead(lead).lead);
  assert.equal(validateLead({ ...lead, full_name: '' }).error, 'missing_name');
  assert.equal(validateLead({ ...lead, phone: '' }).error, 'invalid_phone');
  assert.equal(validateLead({ ...lead, phone: 'call me' }).error, 'invalid_phone');
  assert.equal(validateLead({ ...lead, email: '' }).error, 'invalid_email');
  assert.equal(validateLead({ ...lead, email: 'not-an-email' }).error, 'invalid_email');
  assert.equal(validateLead({ ...lead, email: 42 }).error, 'invalid_email');
  assert.equal(validateLead({ ...lead, form: 'other' }).error, 'invalid_form');
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
    if (!['name', 'phone', 'email', 'source'].every((k) => typeof lead[k] === 'string' && lead[k])) {
      rs.statusCode = 400; return rs.end('{"success":false,"error":"missing fields"}');
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
});

test('round trip with a wrong key: OfficeCRM 401 → not confirmed', async () => {
  const res = await handleLead(req(SITE_LEAD), { CRM_WEBHOOK_URL: MOCK_URL, LEADS_WEBHOOK_API_KEY: 'wrong' });
  assert.equal(res.status, 502);
});
