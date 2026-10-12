// Browser-side lead logic, shared by the contact forms and the thank-you page.
// Kept free of DOM code so it can be unit-tested (test/lead-client.test.mjs).

export const LEAD_FLAG = 'hl_lead';

/**
 * Sends a lead to the site's /api/lead endpoint. Never throws. Resolves:
 *   { ok: true }                       – HTTP 2xx with { ok: true }: the Worker returns this only after
 *                                         OfficeCRM confirmed the lead
 *   { ok: false, error, field }        – the Worker rejected a field (HTTP 400, e.g. invalid_phone → phone)
 *   { ok: false, error }               – anything else: CRM rejected / unreachable / timeout, network error
 */
export async function sendLead(lead, { endpoint = '/api/lead', fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lead),
    });
    const reply = await res.json().catch(() => null);
    if (res.ok && reply && reply.ok === true) return { ok: true };
    const error = (reply && typeof reply.error === 'string' && reply.error) || `http_${res.status}`;
    const field = res.status === 400 && reply && typeof reply.field === 'string' ? reply.field : undefined;
    return field ? { ok: false, error, field } : { ok: false, error };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/**
 * Runs a form submission end to end.
 *  - spam (honeypot filled): go to the thank-you page, but send nothing and count nothing
 *  - delivered: mark the lead for counting, then go to the thank-you page
 *  - invalid: the server rejected a field → onFieldError(field, error); stay on the page (no navigation, no mark)
 *  - failed: delivery not confirmed → stay on the page (no navigation, no mark)
 * Returns 'spam' | 'delivered' | 'invalid' | 'failed'.
 */
export async function submitLead({ lead, honeypot, formLocation, storage, navigate, thanksPath = '/thankyou', send = sendLead, onFieldError }) {
  if (honeypot) { navigate(thanksPath); return 'spam'; }
  const sent = await send(lead);
  const res = typeof sent === 'boolean' ? { ok: sent } : (sent || { ok: false });
  if (!res.ok) {
    if (res.field && onFieldError) { onFieldError(res.field, res.error); return 'invalid'; }
    return 'failed';
  }
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
