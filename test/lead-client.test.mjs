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

test('sendLead: true only for HTTP 2xx with { ok: true }', async () => {
  assert.equal(await sendLead({}, { fetchImpl: reply(200, { ok: true }) }), true);
  assert.equal(await sendLead({}, { fetchImpl: reply(200, { ok: false }) }), false);
  assert.equal(await sendLead({}, { fetchImpl: reply(200, {}) }), false);
  assert.equal(await sendLead({}, { fetchImpl: reply(200, 'not json') }), false);
  assert.equal(await sendLead({}, { fetchImpl: reply(502, { ok: false, error: 'crm_rejected' }) }), false);
  assert.equal(await sendLead({}, { fetchImpl: reply(503, { ok: false, error: 'not_configured' }) }), false);
  assert.equal(await sendLead({}, { fetchImpl: async () => { throw new TypeError('offline'); } }), false);
});

test('sendLead posts JSON to /api/lead', async () => {
  let call;
  await sendLead({ full_name: 'x' }, { fetchImpl: async (url, init) => { call = { url, init }; return new Response('{"ok":true}'); } });
  assert.equal(call.url, '/api/lead');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(call.init.body), { full_name: 'x' });
});

for (const [label, fetchImpl] of [
  ['OfficeCRM rejected (502)', reply(502, { ok: false, error: 'crm_rejected' })],
  ['not configured (503)', reply(503, { ok: false, error: 'not_configured' })],
  ['network error', async () => { throw new TypeError('offline'); }],
]) {
  test(`delivery failed (${label}): no redirect, no conversion`, async () => {
    const storage = memoryStorage();
    const navigations = [];
    const dataLayer = [];
    const result = await submitLead({
      lead: { full_name: 'x' }, honeypot: '', formLocation: 'home', storage,
      navigate: (p) => navigations.push(p), send: (l) => sendLead(l, { fetchImpl }),
    });
    assert.equal(result, 'failed');
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
