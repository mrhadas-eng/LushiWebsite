// Unit tests for the lead endpoint (worker/index.js). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleLead, validateLead } from '../worker/index.js';

const ORIGIN = 'https://www.hagarlushi.com';
const GOOD = {
  full_name: 'ישראל ישראלי', email: 'test@example.com', phone: '050-1234567',
  message: 'מעוניין בתכנון מטבח', form: 'home', page_path: '/', source_summary: 'direct',
  submitted_at: '2026-10-11T09:00:00.000Z', site: 'www.hagarlushi.com',
};

function req(body, { method = 'POST', origin = ORIGIN, type = 'application/json', site = 'same-origin', raw } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (type) headers['Content-Type'] = type;
  if (site) headers['Sec-Fetch-Site'] = site;
  return new Request(`${ORIGIN}/api/lead`, {
    method, headers, body: method === 'GET' ? undefined : (raw ?? JSON.stringify(body)),
  });
}

/** Fake CRM: records calls and answers with the given status/body. */
function crm(status = 200, body = '{"success":true}') {
  const calls = [];
  const impl = async (url, init) => { calls.push({ url, init }); return new Response(body, { status }); };
  return { calls, impl };
}
const ENV = { CRM_WEBHOOK_URL: 'https://crm.example.test/hook', CRM_FORMAT: 'json' };

test('valid lead is forwarded as JSON and confirmed', async () => {
  const c = crm();
  const res = await handleLead(req(GOOD), ENV, c.impl);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(c.calls.length, 1);
  assert.equal(c.calls[0].url, ENV.CRM_WEBHOOK_URL);
  assert.equal(c.calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(c.calls[0].init.body), GOOD);
});

test('form format and auth header are applied', async () => {
  const c = crm(200, 'OK');
  const env = { ...ENV, CRM_FORMAT: 'form', CRM_AUTH_HEADER: 'X-Api-Key: secret123' };
  const res = await handleLead(req(GOOD), env, c.impl);
  assert.equal(res.status, 200);
  const init = c.calls[0].init;
  assert.match(init.headers['Content-Type'], /^application\/x-www-form-urlencoded/);
  assert.equal(init.headers['X-Api-Key'], 'secret123');
  assert.equal(new URLSearchParams(init.body).get('full_name'), GOOD.full_name);
});

test('unknown fields are dropped before forwarding', async () => {
  const c = crm();
  await handleLead(req({ ...GOOD, admin: 'x', website: '' }), ENV, c.impl);
  const sent = JSON.parse(c.calls[0].init.body);
  assert.equal(sent.admin, undefined);
  assert.equal(sent.website, undefined);
});

test('CRM error status is reported as failure (502), not success', async () => {
  const res = await handleLead(req(GOOD), ENV, crm(500, 'boom').impl);
  assert.equal(res.status, 502);
  assert.equal((await res.json()).ok, false);
});

test('CRM 200 with an explicit failure body is reported as failure', async () => {
  for (const body of ['{"success":false}', '{"ok":false}', '{"status":"error"}']) {
    const res = await handleLead(req(GOOD), ENV, crm(200, body).impl);
    assert.equal(res.status, 502, body);
  }
});

test('unreachable CRM is reported as failure', async () => {
  const res = await handleLead(req(GOOD), ENV, async () => { throw new TypeError('network'); });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'crm_unreachable');
});

test('missing secret answers 503 and forwards nothing', async () => {
  const c = crm();
  const res = await handleLead(req(GOOD), { CRM_FORMAT: 'json' }, c.impl);
  assert.equal(res.status, 503);
  assert.equal(c.calls.length, 0);
});

test('honeypot: bot gets ok but nothing is forwarded', async () => {
  const c = crm();
  const res = await handleLead(req({ ...GOOD, website: 'spam.example' }), ENV, c.impl);
  assert.equal(res.status, 200);
  assert.equal(c.calls.length, 0);
});

test('cross-origin, missing origin and cross-site requests are rejected', async () => {
  for (const opts of [{ origin: 'https://evil.example' }, { origin: null }, { site: 'cross-site' }]) {
    const c = crm();
    const res = await handleLead(req(GOOD, opts), ENV, c.impl);
    assert.equal(res.status, 403, JSON.stringify(opts));
    assert.equal(c.calls.length, 0);
  }
});

test('wrong method, content type, size and JSON are rejected', async () => {
  assert.equal((await handleLead(req(null, { method: 'GET' }), ENV, crm().impl)).status, 405);
  assert.equal((await handleLead(req(GOOD, { type: 'text/plain' }), ENV, crm().impl)).status, 415);
  assert.equal((await handleLead(req(null, { raw: '{"a":' }), ENV, crm().impl)).status, 400);
  const big = { ...GOOD, message: 'א'.repeat(6000) };
  assert.equal((await handleLead(req(big), ENV, crm().impl)).status, 413);
});

test('validation: email required and valid, name or phone required, form value checked', () => {
  assert.equal(validateLead({ ...GOOD, email: '' }).error, 'invalid_email');
  assert.equal(validateLead({ ...GOOD, email: 'not-an-email' }).error, 'invalid_email');
  assert.equal(validateLead({ email: 'a@b.co' }).error, 'missing_name_or_phone');
  assert.equal(validateLead({ ...GOOD, phone: 'call me' }).error, 'invalid_phone');
  assert.equal(validateLead({ ...GOOD, form: 'other' }).error, 'invalid_form');
  assert.equal(validateLead({ ...GOOD, email: 42 }).error, 'invalid_email');
  assert.ok(validateLead({ email: 'a@b.co', full_name: 'דנה' }).lead);
});

test('router: /api/lead handled, other /api paths 404, pages go to static assets', async () => {
  const env = { ...ENV, ASSETS: { fetch: async () => new Response('asset', { status: 200 }) } };
  assert.equal((await worker.fetch(new Request(`${ORIGIN}/api/other`), env)).status, 404);
  assert.equal(await (await worker.fetch(new Request(`${ORIGIN}/אודות`), env)).text(), 'asset');
  assert.equal((await worker.fetch(req(null, { method: 'GET' }), env)).status, 405);
});
