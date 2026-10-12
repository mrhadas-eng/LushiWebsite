// Inline, accessible field validation for the lead forms (main site and landing pages).
// Each validated field has an error element <… data-error-for="<field>" id="…"> whose id is in the
// field's aria-describedby. Invalid fields get aria-invalid="true" and the Hebrew message next to
// them; the first invalid field receives focus. Values the visitor typed are never cleared.
import { FIELD_MESSAGES, ERROR_FIELD, fieldErrors } from './lead-rules.js';

const control = (form, field) => form.querySelector(`[name="${field}"]`);

export function showFieldError(form, field, show) {
  const input = control(form, field);
  const msg = form.querySelector(`[data-error-for="${field}"]`);
  if (input) input.setAttribute('aria-invalid', show ? 'true' : 'false');
  if (msg) { msg.textContent = show ? FIELD_MESSAGES[field] : ''; msg.hidden = !show; }
  input?.closest('[data-field]')?.classList.toggle('has-error', show);
}

/** Validates the form; shows/clears every field's message. Returns true when valid. */
export function validateForm(form, { requireConsent = false } = {}) {
  const fd = new FormData(form);
  const values = Object.fromEntries(['full_name', 'phone', 'email', 'consent'].map((k) => [k, String(fd.get(k) ?? '')]));
  const bad = fieldErrors(values, { requireConsent }).map((code) => ERROR_FIELD[code]);
  for (const field of ['full_name', 'phone', 'email', ...(requireConsent ? ['consent'] : [])]) showFieldError(form, field, bad.includes(field));
  if (bad.length) control(form, bad[0])?.focus();
  return bad.length === 0;
}

/** Shows a server-side field error (the Worker's 400 reply) as if the browser had found it. */
export function showServerFieldError(form, field) {
  if (!FIELD_MESSAGES[field]) return false;
  showFieldError(form, field, true);
  control(form, field)?.focus();
  return true;
}

/** After a field was flagged, re-check it as the visitor corrects it. */
export function liveRevalidate(form, { requireConsent = false } = {}) {
  const recheck = (e) => {
    const name = e.target?.name;
    if (!name || !FIELD_MESSAGES[name] || e.target.getAttribute('aria-invalid') !== 'true') return;
    const fd = new FormData(form);
    const values = Object.fromEntries(['full_name', 'phone', 'email', 'consent'].map((k) => [k, String(fd.get(k) ?? '')]));
    const stillBad = fieldErrors(values, { requireConsent }).some((code) => ERROR_FIELD[code] === name);
    if (!stillBad) showFieldError(form, name, false);
  };
  form.addEventListener('input', recheck);
  form.addEventListener('change', recheck);
}
