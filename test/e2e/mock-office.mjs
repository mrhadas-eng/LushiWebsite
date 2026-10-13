// Fake OfficeCRM leads webhook for local browser tests. It is never the real CRM and never sends anything anywhere.
// Models the REAL OfficeCRM behaviour as reported from its code (docs/OFFICECRM-INTEGRATION-CONTRACT.md §1):
//   - Bearer key checked first: wrong key → 401 {"success":false,"error":"Unauthorized. Invalid API Key."}, nothing saved
//   - no validation, never 400: any payload with the right key is saved
//   - success → 200 {"success":true,"leadId":"…","message":"Lead created successfully"}, after the write
//   - `source` and `notes` are not stored; the stored source is derived from page_url (as reported; the exact matching
//     rule is UNVERIFIED, so this mock records what was sent and derives a source only for reporting)
//   - every POST creates a new lead (no idempotency)
// Modes (GET /mode/<name>):
//   ok                success
//   not-configured    503 {"success":false,"error":"Webhook is not configured."}, nothing saved
//   500               500 before any write (nothing saved)
//   500-after-save    the lead IS saved, then 500 (the reported partial-match failure path)
//   slow-after-save   the lead IS saved, the answer comes after 25 s (longer than the Worker's 20 s timeout)
//   hang              never answers, nothing saved
//   reset             connection dropped, nothing saved
//   malformed         saves, then answers 200 with broken JSON (not real OfficeCRM behaviour; a robustness check)
//   missing-success   saves, then answers 200 without `success`   (not real OfficeCRM behaviour)
//   success-false     200 {"success":false} without saving         (not real OfficeCRM behaviour)
// GET /last → { count: requests received, saved: leads stored, last: last request }; GET /leads → stored leads.
import http from 'node:http';
const KEY = 'local-test-key';
let mode = 'ok', last = null, count = 0;
const leads = [];
const derivedSource = (u = '') => (/interior|design/i.test(u) ? 'עיצוב פנים' : /architect/i.test(u) ? 'אדריכלות' : 'Elementor / דף נחיתה');
function save(lead) {
  const id = `L-${leads.length + 1}`;
  leads.push({ id, name: lead.name, phone: lead.phone, email: lead.email, page_url: lead.page_url, form_name: lead.form_name,
    derived_source: derivedSource(lead.page_url || lead.url) });
  return id;
}
http.createServer((req, res) => {
  const send = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
  if (req.method === 'GET' && req.url.startsWith('/mode/')) { mode = req.url.slice(6); return res.end(mode); }
  if (req.method === 'GET' && req.url === '/last') return send(200, { count, saved: leads.length, last });
  if (req.method === 'GET' && req.url === '/leads') return send(200, leads);
  if (req.method === 'POST' && req.url === '/api/leads/webhook') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      count++;
      last = { auth: req.headers.authorization, type: req.headers['content-type'], body };
      if (mode === 'not-configured') return send(503, { success: false, error: 'Webhook is not configured.' });
      const key = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (key !== KEY) return send(401, { success: false, error: 'Unauthorized. Invalid API Key.' });
      let lead = {};
      try { lead = JSON.parse(body || '{}'); } catch { /* the real CRM has no validation either */ }
      if (mode === 'hang') return;
      if (mode === 'reset') return req.socket.destroy();
      if (mode === '500') return send(500, { success: false, error: 'Internal error' });
      if (mode === 'success-false') return send(200, { success: false, error: 'not saved' });
      const leadId = save(lead);
      if (mode === '500-after-save') return send(500, { success: false, error: 'Failed to add note' });
      if (mode === 'slow-after-save') return setTimeout(() => send(200, { success: true, leadId, message: 'Lead created successfully' }), 25_000);
      if (mode === 'malformed') return send(200, '{"success":tru');
      if (mode === 'missing-success') return send(200, { leadId });
      return send(200, { success: true, leadId, message: 'Lead created successfully' });
    });
    return;
  }
  send(404, { success: false });
}).listen(8799, '127.0.0.1', () => console.log('fake OfficeCRM on 8799'));
