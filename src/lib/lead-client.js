// Browser-side lead logic, shared by the contact forms and the thank-you page.
// Kept free of DOM code so it can be unit-tested (test/lead-client.test.mjs).

export const LEAD_FLAG = 'hl_lead';

/**
 * Sends a lead to the site's /api/lead endpoint.
 * Resolves true only when the endpoint answers HTTP 2xx with { ok: true }, which the Worker
 * returns only after OfficeCRM confirmed the lead. Never throws.
 */
export async function sendLead(lead, { endpoint = '/api/lead', fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(lead),
    });
    const reply = await res.json().catch(() => null);
    return Boolean(res.ok && reply && reply.ok === true);
  } catch {
    return false;
  }
}

/**
 * Runs a form submission end to end.
 *  - spam (honeypot filled): go to the thank-you page, but send nothing and count nothing
 *  - delivered: mark the lead for counting, then go to the thank-you page
 *  - failed: stay on the page (no navigation, no mark)
 * Returns 'spam' | 'delivered' | 'failed'.
 */
export async function submitLead({ lead, honeypot, formLocation, storage, navigate, thanksPath = '/thankyou', send = sendLead }) {
  if (honeypot) { navigate(thanksPath); return 'spam'; }
  if (!(await send(lead))) return 'failed';
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
