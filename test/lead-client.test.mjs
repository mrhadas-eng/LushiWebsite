// Browser-side lead logic (src/lib/lead-client.js): no thank-you redirect and no generate_lead
// unless /api/lead confirmed the lead. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendLead, submitLead, recordLeadConversion, LEAD_FLAG } from '../src/lib/lead-client.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
const reply = (status, body) => async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

test('sendLead: ok only for HTTP 2xx with { ok: true }; every failure is classified not_saved or unknown', async () => {
  const U = (error) => ({ ok: false, error, outcome: 'unknown' });
  const N = (error) => ({ ok: false, error, outcome: 'not_saved' });
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(200, { ok: true }) }), { ok: true });
  // A 2xx that isn't { ok: true } proves nothing: unknown.
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(200, { ok: false }) }), U('http_200'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(200, {}) }), U('http_200'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(200, 'not json') }), U('http_200'));
  // The Worker's verdicts.
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(502, { ok: false, error: 'crm_rejected', outcome: 'not_saved' }) }), N('crm_rejected'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(502, { ok: false, error: 'crm_uncertain', outcome: 'unknown' }) }), U('crm_uncertain'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(503, { ok: false, error: 'not_configured' }) }), N('not_configured'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(403, { ok: false, error: 'forbidden' }) }), N('forbidden'));
  // Our own endpoint's answer lost or not ours: unknown (it may have reached OfficeCRM).
  assert.deepEqual(await sendLead({}, { fetchImpl: async () => { throw new TypeError('offline'); } }), U('network'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(502, '<html>Cloudflare error</html>') }), U('http_502'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(500, { ok: false, error: 'crm_rejected' }) }), U('crm_rejected'));
  assert.deepEqual(await sendLead({}, { fetchImpl: reply(400, { ok: false, error: 'invalid_phone', field: 'phone' }) }),
    { ok: false, error: 'invalid_phone', field: 'phone', outcome: 'not_saved' });
});

test('server field rejection: field reported, no redirect, no conversion', async () => {
  const storage = memoryStorage();
  const navigations = [], flagged = [];
  const result = await submitLead({
    lead: { full_name: 'x' }, honeypot: '', formLocation: 'lp-home', storage, navigate: (p) => navigations.push(p),
    send: (l) => sendLead(l, { fetchImpl: reply(400, { ok: false, error: 'missing_consent', field: 'consent' }) }),
    onFieldError: (f) => flagged.push(f),
  });
  assert.equal(result, 'invalid');
  assert.deepEqual(flagged, ['consent']);
  assert.deepEqual(navigations, []);
  assert.equal(recordLeadConversion(storage, []), false);
});

test('sendLead posts JSON to /api/lead', async () => {
  let call;
  await sendLead({ full_name: 'x' }, { fetchImpl: async (url, init) => { call = { url, init }; return new Response('{"ok":true}'); } });
  assert.equal(call.url, '/api/lead');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(call.init.body), { full_name: 'x' });
});

for (const [label, fetchImpl, expected] of [
  ['OfficeCRM rejected before saving (502 not_saved)', reply(502, { ok: false, error: 'crm_rejected', outcome: 'not_saved' }), 'failed'],
  ['not configured (503)', reply(503, { ok: false, error: 'not_configured' }), 'failed'],
  ['OfficeCRM outcome unknown (502 crm_uncertain)', reply(502, { ok: false, error: 'crm_uncertain', outcome: 'unknown' }), 'uncertain'],
  ['network error to our endpoint', async () => { throw new TypeError('offline'); }, 'uncertain'],
  ['unreadable 5xx', reply(500, 'oops'), 'uncertain'],
]) {
  test(`not delivered (${label}): ${expected}, no redirect, no conversion`, async () => {
    const storage = memoryStorage();
    const navigations = [];
    const dataLayer = [];
    const result = await submitLead({
      lead: { full_name: 'x' }, honeypot: '', formLocation: 'home', storage,
      navigate: (p) => navigations.push(p), send: (l) => sendLead(l, { fetchImpl }),
    });
    assert.equal(result, expected);
    assert.deepEqual(navigations, []);
    assert.equal(storage.getItem(LEAD_FLAG), null);
    assert.equal(recordLeadConversion(storage, dataLayer), false);
    assert.deepEqual(dataLayer, []);
  });
}

test('delivered: redirect to /thankyou and exactly one generate_lead there', async () => {
  const storage = memoryStorage();
  const navigations = [];
  const result = await submitLead({
    lead: { full_name: 'x' }, honeypot: '', formLocation: 'contact', storage,
    navigate: (p) => navigations.push(p), send: (l) => sendLead(l, { fetchImpl: reply(200, { ok: true }) }),
  });
  assert.equal(result, 'delivered');
  assert.deepEqual(navigations, ['/thankyou']);
  const dataLayer = [];
  assert.equal(recordLeadConversion(storage, dataLayer), true);
  assert.deepEqual(dataLayer, [{ event: 'generate_lead', form_location: 'contact' }]);
  assert.equal(recordLeadConversion(storage, dataLayer), false, 'refresh does not count again');
  assert.equal(dataLayer.length, 1);
});

test('honeypot: thank-you page shown, nothing sent, nothing counted', async () => {
  const storage = memoryStorage();
  let sent = false;
  const navigations = [];
  const result = await submitLead({
    lead: {}, honeypot: 'spam', formLocation: 'home', storage,
    navigate: (p) => navigations.push(p), send: async () => { sent = true; return true; },
  });
  assert.equal(result, 'spam');
  assert.equal(sent, false);
  assert.deepEqual(navigations, ['/thankyou']);
  const dataLayer = [];
  assert.equal(recordLeadConversion(storage, dataLayer), false);
  assert.deepEqual(dataLayer, []);
});

test('thank-you page opened directly: no conversion', () => {
  const dataLayer = [];
  assert.equal(recordLeadConversion(memoryStorage(), dataLayer), false);
  assert.deepEqual(dataLayer, []);
});
