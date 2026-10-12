// Lead validation rules and Hebrew messages, shared by the browser forms and the Worker
// (worker/index.js imports this file), so both sides accept and reject exactly the same input.
// Message texts were given by the owner (2026-10-11; phone missing vs invalid 2026-10-12) and listed for approval in
// docs/LANDING-PAGE-INVENTORY.md §7.

/** Inline message per error code, shown next to the field it belongs to. */
export const ERROR_MESSAGES = {
  missing_name: 'יש להזין שם מלא',
  missing_phone: 'יש להזין מספר טלפון',
  invalid_phone: 'יש להזין מספר טלפון תקין',
  invalid_email: 'נא להזין כתובת אימייל תקינה',
  missing_consent: 'יש לאשר את מדיניות הפרטיות',
};

/** Shown only when a valid lead could not be delivered (CRM rejected it, timed out or was unreachable). */
export const DELIVERY_FAILED_TEXT = 'לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ.';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Phone numbers. Formatting is ignored: spaces, hyphens, dots and parentheses may appear anywhere.
// Accepted (after removing formatting):
//   Israeli mobile / VoIP   05X / 07X + 7 digits          e.g. 052-431-7164, 077 123 4567
//   Israeli landline        02 03 04 08 09 + 7 digits     e.g. (03) 123-4567
//   the same with +972 / 972 / 00972 instead of the 0, with or without the 0 ("+972 (0)52 …")
//   other countries         + or 00, country code ≠ 972, 8–15 digits in total
const PHONE_ALLOWED_RE = /^\+?[0-9\s\-.()]+$/;
const IL_NATIONAL = '(?:5\\d|7\\d)\\d{7}|[23489]\\d{7}';
const IL_RE = new RegExp(`^(?:0(?:${IL_NATIONAL})|(?:\\+|00)?9720?(?:${IL_NATIONAL}))$`);
const INTL_RE = /^(?:\+|00)(?!972)[1-9]\d{7,14}$/;

/** Removes formatting characters; keeps a leading +. */
export const normalizePhone = (value) => String(value ?? '').trim().replace(/[\s\-.()]/g, '');

/** True for a well-formed Israeli number (or a +country-code number from abroad), whatever the formatting. */
export function isValidPhone(value) {
  const s = String(value ?? '').trim();
  if (!s || !PHONE_ALLOWED_RE.test(s)) return false;
  const n = normalizePhone(s);
  return IL_RE.test(n) || INTL_RE.test(n);
}

/** Error code (as returned by the Worker) → the form field it belongs to. */
export const ERROR_FIELD = {
  missing_name: 'full_name',
  missing_phone: 'phone',
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
  if (!v('phone')) errors.push('missing_phone');
  else if (!isValidPhone(v('phone'))) errors.push('invalid_phone');
  if (!EMAIL_RE.test(v('email'))) errors.push('invalid_email');
  if (requireConsent && v('consent') !== 'yes') errors.push('missing_consent');
  return errors;
}
