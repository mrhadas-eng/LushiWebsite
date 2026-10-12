// Lead validation rules and Hebrew messages, shared by the browser forms and the Worker
// (worker/index.js imports this file), so both sides accept and reject exactly the same input.
// Message texts are proposed by the owner (2026-10-11) and listed for approval in
// docs/LANDING-PAGE-INVENTORY.md §7.

/** Inline messages shown next to a missing or invalid field. */
export const FIELD_MESSAGES = {
  full_name: 'יש להזין שם מלא',
  phone: 'יש להזין מספר טלפון',
  email: 'נא להזין כתובת אימייל תקינה',
  consent: 'יש לאשר את מדיניות הפרטיות',
};

/** Shown only when a valid lead could not be delivered (CRM rejected it, timed out or was unreachable). */
export const DELIVERY_FAILED_TEXT = 'לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ.';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS_RE = /^[0-9+()\-.\s]{7,40}$/;

/** Digits, spaces, + ( ) - . only, with 9–15 digits (Israeli numbers have 9–10, international up to 15). */
export function isValidPhone(value) {
  const s = String(value ?? '').trim();
  if (!PHONE_CHARS_RE.test(s)) return false;
  const digits = s.replace(/\D/g, '').length;
  return digits >= 9 && digits <= 15;
}

/** Error code (as returned by the Worker) → the form field it belongs to. */
export const ERROR_FIELD = {
  missing_name: 'full_name',
  invalid_phone: 'phone',
  invalid_email: 'email',
  missing_consent: 'consent',
};

/**
 * Checks the fields a visitor fills in. Returns the error codes in form order (empty = valid).
 * values: { full_name, phone, email, consent } (strings); requireConsent for landing-page forms.
 */
export function fieldErrors(values, { requireConsent = false } = {}) {
  const v = (k) => String(values?.[k] ?? '').trim();
  const errors = [];
  if (!v('full_name')) errors.push('missing_name');
  if (!isValidPhone(v('phone'))) errors.push('invalid_phone');
  if (!EMAIL_RE.test(v('email'))) errors.push('invalid_email');
  if (requireConsent && v('consent') !== 'yes') errors.push('missing_consent');
  return errors;
}
