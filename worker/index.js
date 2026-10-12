// Cloudflare Worker for hagarlushi.com.
//
// Static pages and images are served by Cloudflare straight from ./dist (see wrangler.jsonc);
// this code only runs for /api/*.
//
// POST /api/lead
//   Receives a lead from the site's contact forms, translates it to the OfficeCRM leads-webhook
//   contract and forwards it. Replies { ok: true } ONLY when OfficeCRM answered HTTP 2xx with a
//   JSON body containing success: true, so the site shows the thank-you page and counts a
//   conversion only for leads OfficeCRM actually created.
//
// OfficeCRM contract (POST, application/json, Authorization: Bearer <key>):
//   required: name, phone, email, source     optional: referrerName, notes
//   success:  HTTP 200, JSON { success: true, leadId: ... }
//
// Configuration: Cloudflare dashboard → Workers → hagarlushi → Settings → Variables and Secrets.
// Both are type "Secret" and are never written in the repository, the site or the logs.
//   CRM_WEBHOOK_URL         the OfficeCRM leads webhook address (https://…/api/leads/webhook)
//   LEADS_WEBHOOK_API_KEY   the same value as OfficeCRM's LEADS_WEBHOOK_API_KEY, the bare key
//                           (no "Bearer " prefix; the Worker adds it)

import { EMAIL_RE, isValidPhone, ERROR_FIELD } from '../src/lib/lead-rules.js';

const MAX_BODY_BYTES = 10_000;
// Not exported: the Workers runtime only accepts functions and handlers as module exports.
const CRM_TIMEOUT_MS = 10_000;
const MAX_NOTES = 4000;

// Fields accepted from the browser (anything else is dropped), with maximum lengths.
const FIELDS = {
  full_name: 200, email: 254, phone: 40, message: 5000, form: 20,
  page_url: 2000, page_path: 500, landing_page: 500, referrer: 2000,
  utm_source: 200, utm_medium: 200, utm_campaign: 200, utm_term: 200, utm_content: 200,
  gclid: 300, fbclid: 300, source_summary: 2500, submitted_at: 40, site: 200, consent: 10,
};
// Forms on www.hagarlushi.com and on the landing pages (lp.hagarlushi.com).
const FORMS = {
  home: 'דף הבית', contact: 'דף יצירת קשר',
  'lp-home': 'דף נחיתה – ראשי', 'lp-architecture': 'דף נחיתה – אדריכלות',
  'lp-interior-design': 'דף נחיתה – עיצוב פנים', 'lp-renovation': 'דף נחיתה – שיפוץ',
};
const isLandingForm = (form) => typeof form === 'string' && form.startsWith('lp-');

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  });
}

/** Only accept submissions made by the site's own pages (same origin as this Worker). */
export function isSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return false;
  const site = request.headers.get('Sec-Fetch-Site');
  return !site || site === 'same-origin';
}

/** Validates and cleans the website payload. Returns { lead } or { error }. */
export function validateLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'invalid_body' };
  const lead = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    const v = input[key];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string') return { error: `invalid_${key}` };
    const s = v.trim();
    if (s.length > max) return { error: `too_long_${key}` };
    if (s) lead[key] = s;
  }
  // OfficeCRM requires name, phone and email. Same rules as the browser forms (src/lib/lead-rules.js).
  if (!lead.full_name) return { error: 'missing_name' };
  if (!isValidPhone(lead.phone)) return { error: 'invalid_phone' };
  if (!lead.email || !EMAIL_RE.test(lead.email)) return { error: 'invalid_email' };
  if (lead.form && !FORMS[lead.form]) return { error: 'invalid_form' };
  // The landing-page forms have a required privacy-policy checkbox; enforce it server-side too.
  if (isLandingForm(lead.form) && lead.consent !== 'yes') return { error: 'missing_consent' };
  return { lead };
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/**
 * OfficeCRM "source": where the lead came from, starting with "website" (www) or "landing-page" (lp.).
 * e.g. "website / google / cpc", "website / google-ads", "website / facebook", "website / instagram.com",
 * "website / direct". Campaign details go in the notes.
 */
export function leadSource(lead) {
  let channel = 'direct';
  if (lead.utm_source) channel = [lead.utm_source, lead.utm_medium].filter(Boolean).join(' / ');
  else if (lead.gclid) channel = 'google-ads';
  else if (lead.fbclid) channel = 'facebook';
  else {
    const ref = hostOf(lead.referrer || '');
    if (ref && !ref.endsWith('hagarlushi.com')) channel = ref;
  }
  return `${isLandingForm(lead.form) ? 'landing-page' : 'website'} / ${channel}`.slice(0, 200);
}

/** OfficeCRM "notes": everything else useful to whoever calls the lead back (Hebrew labels). */
export function leadNotes(lead) {
  const lines = [];
  if (lead.message) lines.push(`הודעה: ${lead.message}`, '');
  lines.push(`טופס: ${FORMS[lead.form] || 'אתר'}`);
  if (lead.page_path) lines.push(`נשלח מהדף: ${lead.page_path}`);
  if (lead.landing_page && lead.landing_page !== lead.page_path) lines.push(`דף כניסה לאתר: ${lead.landing_page}`);
  const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    .filter((k) => lead[k]).map((k) => `${k}=${lead[k]}`);
  if (utm.length) lines.push(`קמפיין: ${utm.join(', ')}`);
  if (lead.gclid) lines.push(`Google Ads gclid: ${lead.gclid}`);
  if (lead.fbclid) lines.push(`Facebook fbclid: ${lead.fbclid}`);
  if (lead.referrer) lines.push(`הגיע מ: ${lead.referrer}`);
  if (lead.site) lines.push(`אתר: ${lead.site}`);
  if (lead.consent === 'yes') lines.push('אישור מדיניות פרטיות: כן');
  if (lead.submitted_at) lines.push(`נשלח: ${lead.submitted_at}`);
  const notes = lines.join('\n');
  return notes.length > MAX_NOTES ? `${notes.slice(0, MAX_NOTES - 1)}…` : notes;
}

/**
 * The exact OfficeCRM payload. referrerName is left out: the website form has no
 * "who referred you" field, and a referring website is not a person's name.
 */
export function toCrmPayload(lead) {
  return {
    name: lead.full_name,
    phone: lead.phone,
    email: lead.email,
    source: leadSource(lead),
    notes: leadNotes(lead),
  };
}

/** Configured only with both secrets, and only over https (plain http allowed for local tests). */
export function crmConfig(env) {
  const url = env.CRM_WEBHOOK_URL, key = env.LEADS_WEBHOOK_API_KEY;
  if (!url || !key) return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return null;
  return { url, key: key.replace(/^Bearer\s+/i, '').trim() };
}

/**
 * Sends the lead to OfficeCRM. Resolves { ok: true, leadId } only for HTTP 2xx + JSON success:true;
 * otherwise { ok: false, reason }. Never throws.
 */
export async function forwardToCrm(lead, cfg, { fetchImpl = fetch, timeoutMs = CRM_TIMEOUT_MS } = {}) {
  let res;
  try {
    res = await fetchImpl(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify(toCrmPayload(lead)),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    return { ok: false, reason: e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'timeout' : 'unreachable' };
  }
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  let body;
  try { body = JSON.parse(await res.text()); } catch { return { ok: false, reason: 'invalid_json' }; }
  if (!body || body.success !== true) return { ok: false, reason: 'not_confirmed' };
  return { ok: true, leadId: body.leadId };
}

export async function handleLead(request, env, opts = {}) {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, { Allow: 'POST' });
  if (!isSameOrigin(request)) return json(403, { ok: false, error: 'forbidden' });
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' });
  let input;
  try { input = JSON.parse(raw); } catch { return json(400, { ok: false, error: 'invalid_json' }); }

  // Spam trap: real visitors never fill the hidden "website" field. Pretend success, send nothing.
  if (input && typeof input.website === 'string' && input.website.trim() !== '') {
    return json(200, { ok: true });
  }

  const { lead, error } = validateLead(input);
  if (error) return json(400, ERROR_FIELD[error] ? { ok: false, error, field: ERROR_FIELD[error] } : { ok: false, error });

  const cfg = crmConfig(env);
  if (!cfg) {
    console.error('lead: CRM_WEBHOOK_URL / LEADS_WEBHOOK_API_KEY missing or invalid');
    return json(503, { ok: false, error: 'not_configured' });
  }

  const result = await forwardToCrm(lead, cfg, opts);
  if (result.ok) {
    // The leadId is OfficeCRM's record number, not lead data: logged so a test lead can be traced.
    console.log(`lead: created in OfficeCRM (leadId ${result.leadId ?? 'not returned'})`);
    return json(200, { ok: true });
  }
  // Only the reason code is logged: no lead data, no URL, no key.
  console.error(`lead: OfficeCRM did not confirm the lead (${result.reason})`);
  return json(502, { ok: false, error: result.reason === 'timeout' || result.reason === 'unreachable' ? 'crm_unreachable' : 'crm_rejected' });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/lead') return handleLead(request, env);
    if (pathname.startsWith('/api/')) return json(404, { ok: false, error: 'not_found' });
    return env.ASSETS.fetch(request);
  },
};
