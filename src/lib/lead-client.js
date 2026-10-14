// Browser-side lead logic, shared by the contact forms and the thank-you page.
// Kept free of DOM code so it can be unit-tested (test/lead-client.test.mjs).

export const LEAD_FLAG = 'hl_lead';
export const SUBMISSION_PREFIX = 'hl_submission:';

/** A random UUID v4 (crypto.randomUUID where available, else built from getRandomValues). */
export function newSubmissionId(c = globalThis.crypto) {
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Fallback when sessionStorage is blocked: resends from the same page still reuse the ID.
const memory = new Map();

/**
 * The enquiry currently being sent from this form: { submission_id, submitted_at }.
 * Created at the first send attempt and REUSED for every resend of the same enquiry (after a "not saved" or
 * "uncertain" outcome, after a reload in the same tab, after editing fields) until OfficeCRM confirms the lead.
 * Keeping submitted_at too makes a pure resend identical, so OfficeCRM's idempotency sees a replay, not an edit.
 */
export function currentSubmission(storage, formId, { uuid = newSubmissionId, now = () => new Date() } = {}) {
  const key = SUBMISSION_PREFIX + (formId || 'form');
  let rec = null;
  try { rec = JSON.parse(storage.getItem(key) || 'null'); } catch { rec = memory.get(key) || null; }
  if (!rec && memory.has(key)) rec = memory.get(key);
  if (!rec || typeof rec.submission_id !== 'string' || typeof rec.submitted_at !== 'string') {
    rec = { submission_id: uuid(), submitted_at: now().toISOString() };
    try { storage.setItem(key, JSON.stringify(rec)); } catch { /* blocked: memory only */ }
    memory.set(key, rec);
  }
  return rec;
}

/** Called only after OfficeCRM confirmed the lead: the next enquiry from this form gets a new ID. */
export function clearSubmission(storage, formId) {
  const key = SUBMISSION_PREFIX + (formId || 'form');
  memory.delete(key);
  try { storage.removeItem(key); } catch { /* blocked */ }
}

/**
 * Sends a lead to the site's /api/lead endpoint. Never throws. Resolves:
 *   { ok: true }                                 HTTP 2xx with { ok: true }: the Worker returns this only after
 *                                                OfficeCRM confirmed the lead
 *   { ok: false, error, field, outcome: 'not_saved' }  the Worker rejected a field (HTTP 400): nothing was sent
 *   { ok: false, error, outcome: 'not_saved' }   definitely not saved: the Worker refused before contacting OfficeCRM
 *                                                (4xx, 503 not_configured) or OfficeCRM rejected it before writing
 *                                                (502 with outcome "not_saved")
 *   { ok: false, error, outcome: 'unknown' }     anything else: OfficeCRM's answer was uncertain (502 crm_uncertain),
 *                                                or our own endpoint's answer was lost or unreadable (network error,
 *                                                5xx without our JSON). The lead may exist.
 */
export async function sendLead(lead, { endpoint = '/api/lead', fetchImpl = fetch } = {}) {
  let res;
  try {
    res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lead),
    });
  } catch {
    return { ok: false, error: 'network', outcome: 'unknown' };   // the request may have reached the Worker
  }
  const reply = await res.json().catch(() => null);
  if (res.ok && reply && reply.ok === true) return { ok: true };
  const ours = reply && typeof reply.error === 'string';            // a reply written by worker/index.js
  const error = ours ? reply.error : `http_${res.status}`;
  if (ours && res.status === 400 && typeof reply.field === 'string') return { ok: false, error, field: reply.field, outcome: 'not_saved' };
  const notSaved = ours && (reply.outcome === 'not_saved'
    || (res.status >= 400 && res.status < 500)                      // refused by the Worker before any CRM call
    || (res.status === 503 && reply.error === 'not_configured'));   // secrets missing: nothing sent
  return { ok: false, error, outcome: notSaved ? 'not_saved' : 'unknown' };
}

/**
 * Runs a form submission end to end.
 *  - spam (honeypot filled): go to the thank-you page, but send nothing and count nothing
 *  - delivered: mark the lead for counting, then go to the thank-you page
 *  - invalid: the server rejected a field → onFieldError(field, error); stay on the page
 *  - failed: definitely not saved → stay on the page; retrying is safe
 *  - uncertain: the lead may or may not exist → stay on the page; the visitor is NOT invited to resubmit
 * Only 'delivered' marks a conversion (once per confirmed enquiry: the submission ID is cleared at that point).
 * The submission ID and time are added here (currentSubmission); no automatic retry ever happens. Returns 'spam' | 'delivered' | 'invalid' | 'failed' | 'uncertain'.
 */
export async function submitLead({ lead, honeypot, formLocation, storage, navigate, thanksPath = '/thankyou', send = sendLead, onFieldError, ids }) {
  if (honeypot) { navigate(thanksPath); return 'spam'; }
  const sub = currentSubmission(storage, formLocation, ids);
  const sent = await send({ ...lead, submission_id: sub.submission_id, submitted_at: sub.submitted_at });
  const res = typeof sent === 'boolean' ? { ok: sent, outcome: sent ? undefined : 'unknown' } : (sent || { ok: false, outcome: 'unknown' });
  if (!res.ok) {
    if (res.field && onFieldError) { onFieldError(res.field, res.error); return 'invalid'; }
    return res.outcome === 'not_saved' ? 'failed' : 'uncertain';
  }
  clearSubmission(storage, formLocation);           // confirmed: a new enquiry gets a new submission ID
  try { storage.setItem(LEAD_FLAG, formLocation || ''); } catch { /* storage blocked: lead still delivered */ }
  navigate(thanksPath);
  return 'delivered';
}

/**
 * On the thank-you page: pushes generate_lead once, only if a delivered lead was marked.
 * Refreshing the page or opening it directly does not count. Returns true when counted.
 */
export function recordLeadConversion(storage, dataLayer) {
  let from = null;
  try { from = storage.getItem(LEAD_FLAG); storage.removeItem(LEAD_FLAG); } catch { return false; }
  if (from === null) return false;
  dataLayer.push({ event: 'generate_lead', form_location: from });
  return true;
}
