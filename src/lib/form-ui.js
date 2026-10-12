// Inline, accessible field validation for the lead forms (main site and landing pages).
// Each validated field has an error element <… data-error-for="<field>" id="…"> whose id is in the
// field's aria-describedby. Invalid fields get aria-invalid="true" and the Hebrew message next to
// them; the first invalid field receives focus. Values the visitor typed are never cleared.
import { ERROR_MESSAGES, ERROR_FIELD, fieldErrors } from './lead-rules.js';

const FIELDS = new Set(Object.values(ERROR_FIELD));

const control = (form, field) => form.querySelector(`[name="${field}"]`);

/** code: an error code from lead-rules.js (shows its message), or null to clear the field. */
export function showFieldError(form, field, code) {
  const show = Boolean(code);
  const input = control(form, field);
  const msg = form.querySelector(`[data-error-for="${field}"]`);
  if (input) input.setAttribute('aria-invalid', show ? 'true' : 'false');
  if (msg) { msg.textContent = show ? ERROR_MESSAGES[code] : ''; msg.hidden = !show; msg.dataset.code = code || ''; }
  input?.closest('[data-field]')?.classList.toggle('has-error', show);
}

/** Validates the form; shows/clears every field's message. Returns true when valid. */
export function validateForm(form, { requireConsent = false } = {}) {
  const fd = new FormData(form);
  const values = Object.fromEntries(['full_name', 'phone', 'email', 'consent'].map((k) => [k, String(fd.get(k) ?? '')]));
  const codes = fieldErrors(values, { requireConsent });
  const byField = Object.fromEntries(codes.map((code) => [ERROR_FIELD[code], code]));
  for (const field of ['full_name', 'phone', 'email', ...(requireConsent ? ['consent'] : [])]) showFieldError(form, field, byField[field] || null);
  if (codes.length) control(form, ERROR_FIELD[codes[0]])?.focus();
  return codes.length === 0;
}

/** Shows a server-side field error (the Worker's 400 reply: error code + field) as if the browser had found it. */
export function showServerFieldError(form, field, code) {
  if (!FIELDS.has(field)) return false;
  // Use the Worker's code when it belongs to this field; otherwise that field's generic 'invalid' message.
  const fallback = Object.keys(ERROR_FIELD).filter((c) => ERROR_FIELD[c] === field).pop();
  showFieldError(form, field, ERROR_FIELD[code] === field ? code : fallback);
  control(form, field)?.focus();
  return true;
}

/** After a field was flagged, re-check it as the visitor corrects it. */
export function liveRevalidate(form, { requireConsent = false } = {}) {
  const recheck = (e) => {
    const name = e.target?.name;
    if (!name || !FIELDS.has(name) || e.target.getAttribute('aria-invalid') !== 'true') return;
    const fd = new FormData(form);
    const values = Object.fromEntries(['full_name', 'phone', 'email', 'consent'].map((k) => [k, String(fd.get(k) ?? '')]));
    // Clear the message once the field is fixed; switch it (e.g. missing → invalid phone) while typing.
    const code = fieldErrors(values, { requireConsent }).find((c) => ERROR_FIELD[c] === name);
    showFieldError(form, name, code || null);
  };
  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);
}
