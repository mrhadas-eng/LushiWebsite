// Fake OfficeCRM leads webhook for local browser tests. It is never the real CRM and sends nothing anywhere.
//
// Request side: the OfficeCRM "website-v1" contract as confirmed by the OfficeCRM workstream (branch
// website-lead-contract-v2, commit 76b99cc; owner, 2026-10-14):
//   Authorization: Bearer <key>; Idempotency-Key: <UUID> equal to body.submission_id; contract "website-v1";
//   lead_source one of 6 ids; name 1–200; phone required ≤ 40; email required ≤ 254; message ≤ 5000;
//   context { site, page_url, form_name, submitted_at, … } required; consent { given, text, policy_url, given_at }
//   required for lp-* forms.
// Response side: modelled on docs/OFFICECRM-CHANGE-REQUEST.md §5 (the PROPOSED schema). The exact response body
// of OfficeCRM 76b99cc has NOT been read by the website workstream; the website only relies on
// "2xx + success:true = confirmed", "4xx = not saved", everything else = unknown.
//
// Idempotency: the first request with a key saves the lead; any later request with that key saves nothing new and
// returns the same leadId with duplicate:true. A later request with the same key but a different body is stored as
// a revision of the original lead (the visitor's edit is kept, no second lead).
//
// Modes (GET /mode/<name>):
//   ok                    normal behaviour
//   not-configured        503, nothing saved            force-400   400 validation, nothing saved
//   in-progress           409, nothing saved            500         500 before any write
//   500-after-save        saves, then 500               slow-after-save   saves, answers after 25 s
//   drop-after-save-once  saves, then drops the connection without an answer; switches back to ok afterwards
//   hang / reset          no answer / connection dropped, nothing saved
//   malformed / missing-success / success-false        broken or unconfirmed 200 answers (robustness only)
// GET /last → { count, saved, revisions, last }; GET /leads → stored leads; GET /reset → clears everything.
import http from 'node:http';
import { createHash } from 'node:crypto';

const KEY = 'local-test-key';
const SOURCES = ['website-home', 'website-contact', 'lp-home', 'lp-architecture', 'lp-interior-design', 'lp-renovation'];
const LABELS = { 'website-home': 'Website – General Enquiry', 'website-contact': 'Website – General Enquiry',
  'lp-home': 'Landing Page – General Enquiry', 'lp-architecture': 'Architecture', 'lp-interior-design': 'Interior Design',
  'lp-renovation': 'Renovation' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let mode = 'ok', last = null, count = 0;
let leads = [], keys = new Map(), revisions = 0;

const str = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
function invalidFields(b, idem) {
  const f = [];
  if (b.contract !== 'website-v1') f.push('contract');
  if (!UUID.test(idem || '') || b.submission_id !== idem) f.push('submission_id');
  if (!SOURCES.includes(b.lead_source)) f.push('lead_source');
  if (!str(b.name, 1, 200)) f.push('name');
  if (!str(b.phone, 1, 40)) f.push('phone');
  if (!str(b.email, 1, 254) || !b.email.includes('@')) f.push('email');
  if (b.message !== undefined && !str(b.message, 0, 5000)) f.push('message');
  const c = b.context;
  if (!c || typeof c !== 'object' || !['site', 'page_url', 'form_name', 'submitted_at'].every((k) => str(c[k], 1, 2000))) f.push('context');
  if (String(b.lead_source).startsWith('lp-')) {
    const k = b.consent;
    if (!k || k.given !== true || !str(k.text, 1, 500) || !str(k.policy_url, 1, 500) || !str(k.given_at, 1, 40)) f.push('consent');
  }
  return f;
}

http.createServer((req, res) => {
  const send = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
  if (req.method === 'GET' && req.url.startsWith('/mode/')) { mode = req.url.slice(6); return res.end(mode); }
  if (req.method === 'GET' && req.url === '/last') return send(200, { count, saved: leads.length, revisions, last });
  if (req.method === 'GET' && req.url === '/leads') return send(200, leads);
  if (req.method === 'GET' && req.url === '/reset') { leads = []; keys = new Map(); revisions = 0; count = 0; last = null; mode = 'ok'; return send(200, { ok: true }); }
  if (req.method === 'POST' && req.url === '/api/leads/webhook') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      count++;
      const idem = req.headers['idempotency-key'];
      last = { auth: req.headers.authorization, idempotencyKey: idem, type: req.headers['content-type'], body: raw };
      if (mode === 'not-configured') return send(503, { success: false, error: 'Webhook is not configured.' });
      if ((req.headers.authorization || '').replace(/^Bearer\s+/i, '') !== KEY) return send(401, { success: false, error: 'Unauthorized. Invalid API Key.' });
      let b;
      try { b = JSON.parse(raw); } catch { return send(400, { success: false, error: 'validation', fields: ['body'] }); }
      if (mode === 'force-400') return send(400, { success: false, error: 'validation', fields: ['email'] });
      const bad = invalidFields(b, idem);
      if (bad.length) return send(400, { success: false, error: 'validation', fields: bad });
      if (mode === 'in-progress') return send(409, { success: false, error: 'in_progress' });
      if (mode === 'hang') return;
      if (mode === 'reset') return req.socket.destroy();
      if (mode === '500') return send(500, { success: false, error: 'Internal error' });
      if (mode === 'success-false') return send(200, { success: false, error: 'not saved' });
      // idempotent create-if-absent
      const hash = createHash('sha256').update(raw).digest('hex');
      const known = keys.get(idem);
      let leadId, duplicate = false;
      if (known) {
        duplicate = true; leadId = known.leadId;
        if (known.hash !== hash) {                       // edited resend: keep it as a revision, no second lead
          revisions++;
          leads.find((l) => l.id === leadId).revisions.push({ name: b.name, phone: b.phone, email: b.email, message: b.message });
        }
      } else {
        leadId = `L-${leads.length + 1}`;
        keys.set(idem, { leadId, hash });
        leads.push({ id: leadId, submission_id: b.submission_id, category: LABELS[b.lead_source], lead_source: b.lead_source,
          name: b.name, phone: b.phone, email: b.email, message: b.message ?? null, consent: b.consent ?? null,
          context: b.context, revisions: [] });
      }
      if (mode === 'drop-after-save-once') { mode = 'ok'; return req.socket.destroy(); }
      if (mode === '500-after-save') return send(500, { success: false, error: 'Failed to add note' });
      if (mode === 'slow-after-save') return setTimeout(() => send(200, { success: true, leadId, duplicate, message: 'Lead created successfully' }), 25_000);
      if (mode === 'malformed') return send(200, '{"success":tru');
      if (mode === 'missing-success') return send(200, { leadId });
      return send(200, { success: true, leadId, duplicate, message: duplicate ? 'Duplicate submission' : 'Lead created successfully' });
    });
    return;
  }
  send(404, { success: false });
}).listen(8799, '127.0.0.1', () => console.log('fake OfficeCRM (website-v1) on 8799'));
