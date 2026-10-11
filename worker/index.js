// Cloudflare Worker for hagarlushi.com.
//
// Static pages and images are served by Cloudflare straight from ./dist (see wrangler.jsonc);
// this code only runs for /api/*.
//
// POST /api/lead
//   Receives a lead from the site's contact forms and forwards it to the CRM webhook.
//   Replies { ok: true } ONLY when the CRM confirmed it (2xx and not an explicit failure body),
//   so the site shows the thank-you page and counts a conversion only for delivered leads.
//
// Configuration (Cloudflare dashboard → Workers → hagarlushi → Settings → Variables and Secrets):
//   CRM_WEBHOOK_URL   secret, required. The CRM webhook address. Never commit it.
//   CRM_AUTH_HEADER   secret, optional. A header the CRM requires, written as "Name: value",
//                     e.g. "Authorization: Bearer abc123" or "X-Api-Key: abc123".
//   CRM_FORMAT        var, "json" (default) or "form" (application/x-www-form-urlencoded).

const MAX_BODY_BYTES = 10_000;
const CRM_TIMEOUT_MS = 10_000;

// Fields accepted from the browser (anything else is dropped), with maximum lengths.
const FIELDS = {
  full_name: 200, email: 254, phone: 40, message: 5000, form: 20,
  page_url: 2000, page_path: 500, landing_page: 500, referrer: 2000,
  utm_source: 200, utm_medium: 200, utm_campaign: 200, utm_term: 200, utm_content: 200,
  gclid: 300, fbclid: 300, source_summary: 2500, submitted_at: 40, site: 200,
};
const FORMS = new Set(['home', 'contact']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,40}$/;

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

/** Validates and cleans a lead. Returns { lead } or { error }. */
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
  if (!lead.email || !EMAIL_RE.test(lead.email)) return { error: 'invalid_email' };
  if (lead.phone && !PHONE_RE.test(lead.phone)) return { error: 'invalid_phone' };
  if (!lead.full_name && !lead.phone) return { error: 'missing_name_or_phone' };
  if (lead.form && !FORMS.has(lead.form)) return { error: 'invalid_form' };
  return { lead };
}

function parseAuthHeader(value) {
  if (!value) return null;
  const i = value.indexOf(':');
  if (i < 1) return null;
  return [value.slice(0, i).trim(), value.slice(i + 1).trim()];
}

/** Sends the lead to the CRM. Resolves true only when the CRM confirms success. */
export async function forwardToCrm(lead, env, fetchImpl = fetch) {
  const asForm = env.CRM_FORMAT === 'form';
  const headers = {
    'Content-Type': asForm ? 'application/x-www-form-urlencoded;charset=UTF-8' : 'application/json',
    Accept: 'application/json, text/plain, */*',
  };
  const auth = parseAuthHeader(env.CRM_AUTH_HEADER);
  if (auth) headers[auth[0]] = auth[1];

  const res = await fetchImpl(env.CRM_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: asForm ? new URLSearchParams(lead).toString() : JSON.stringify(lead),
    signal: AbortSignal.timeout(CRM_TIMEOUT_MS),
  });
  if (!res.ok) return { ok: false, status: res.status };

  // Some webhooks answer 200 with an error body: treat an explicit failure flag as failure.
  const text = await res.text().catch(() => '');
  try {
    const body = JSON.parse(text);
    if (body && (body.success === false || body.ok === false || body.status === 'error')) {
      return { ok: false, status: res.status };
    }
  } catch { /* non-JSON 2xx reply: accepted */ }
  return { ok: true, status: res.status };
}

export async function handleLead(request, env, fetchImpl = fetch) {
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
  if (error) return json(400, { ok: false, error });

  if (!env.CRM_WEBHOOK_URL) {
    console.error('lead: CRM_WEBHOOK_URL secret is not set');
    return json(503, { ok: false, error: 'not_configured' });
  }

  try {
    const result = await forwardToCrm(lead, env, fetchImpl);
    if (result.ok) return json(200, { ok: true });
    // Log only the status code: no lead data, no webhook URL.
    console.error(`lead: CRM rejected the lead (HTTP ${result.status})`);
    return json(502, { ok: false, error: 'crm_rejected' });
  } catch (e) {
    console.error(`lead: CRM request failed (${e && e.name})`);
    return json(502, { ok: false, error: 'crm_unreachable' });
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/lead') return handleLead(request, env);
    if (pathname.startsWith('/api/')) return json(404, { ok: false, error: 'not_found' });
    return env.ASSETS.fetch(request);
  },
};
