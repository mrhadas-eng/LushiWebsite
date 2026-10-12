// Shared validation rules (src/lib/lead-rules.js), used by the forms and by the Worker. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldErrors, isValidPhone, FIELD_MESSAGES, ERROR_FIELD, DELIVERY_FAILED_TEXT } from '../src/lib/lead-rules.js';
import { validateLead } from '../worker/index.js';

const OK = { full_name: 'ישראל ישראלי', phone: '050-1234567', email: 'a@example.com', consent: 'yes' };

test('owner-proposed Hebrew messages (exact text)', () => {
  assert.deepEqual(FIELD_MESSAGES, {
    full_name: 'יש להזין שם מלא', phone: 'יש להזין מספר טלפון',
    email: 'נא להזין כתובת אימייל תקינה', consent: 'יש לאשר את מדיניות הפרטיות',
  });
  assert.equal(DELIVERY_FAILED_TEXT, 'לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ.');
});

test('each required field missing or invalid is reported, in form order', () => {
  assert.deepEqual(fieldErrors(OK, { requireConsent: true }), []);
  const cases = [
    [{ full_name: '' }, ['missing_name']], [{ full_name: '   ' }, ['missing_name']],
    [{ phone: '' }, ['invalid_phone']], [{ phone: 'call me' }, ['invalid_phone']], [{ phone: '12345' }, ['invalid_phone']],
    [{ phone: '+++------' }, ['invalid_phone']],
    [{ email: '' }, ['invalid_email']], [{ email: 'not-an-email' }, ['invalid_email']], [{ email: 'a@b' }, ['invalid_email']],
    [{ consent: '' }, ['missing_consent']],
  ];
  for (const [patch, expected] of cases) assert.deepEqual(fieldErrors({ ...OK, ...patch }, { requireConsent: true }), expected, JSON.stringify(patch));
  assert.deepEqual(fieldErrors({}, { requireConsent: true }), ['missing_name', 'invalid_phone', 'invalid_email', 'missing_consent']);
  assert.deepEqual(fieldErrors({ ...OK, consent: '' }), [], 'main-site forms have no consent box');
});

test('phone numbers: Israeli and international formats accepted', () => {
  for (const p of ['050-1234567', '0501234567', '+972 50 123 4567', '(03) 123-4567', '04.123.4567']) assert.ok(isValidPhone(p), p);
});

test('the Worker applies exactly the same rules (browser validation is not the only check)', () => {
  for (const patch of [{}, { full_name: '' }, { phone: '12345' }, { phone: '+++------' }, { email: 'a@b' }, { consent: '' }]) {
    const lead = { ...OK, ...patch, form: 'lp-home' };
    const browser = fieldErrors(lead, { requireConsent: true })[0];
    assert.equal(validateLead(lead).error, browser, JSON.stringify(patch));
  }
  for (const code of Object.keys(ERROR_FIELD)) assert.ok(FIELD_MESSAGES[ERROR_FIELD[code]], code);
});
