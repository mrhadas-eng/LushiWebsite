// Shared validation rules (src/lib/lead-rules.js), used by the forms and by the Worker. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldErrors, isValidPhone, normalizePhone, ERROR_MESSAGES, ERROR_FIELD, DELIVERY_FAILED_TEXT, DELIVERY_UNCERTAIN_TEXT } from '../src/lib/lead-rules.js';
import { validateLead } from '../worker/index.js';

const OK = { full_name: 'ישראל ישראלי', phone: '050-1234567', email: 'a@example.com', consent: 'yes' };

test('owner Hebrew messages (exact text); an empty phone and an invalid phone get different messages', () => {
  assert.deepEqual(ERROR_MESSAGES, {
    missing_name: 'יש להזין שם מלא',
    missing_phone: 'יש להזין מספר טלפון',
    invalid_phone: 'יש להזין מספר טלפון תקין',
    invalid_email: 'נא להזין כתובת אימייל תקינה',
    missing_consent: 'יש לאשר את מדיניות הפרטיות',
  });
  assert.equal(DELIVERY_FAILED_TEXT, 'לא הצלחנו לשלוח את הפרטים כרגע. אפשר לנסות שוב או ליצור קשר בטלפון או בוואטסאפ.');
  assert.equal(DELIVERY_UNCERTAIN_TEXT, 'לא ניתן לוודא שהפרטים נקלטו. ייתכן שהם נשמרו בכל זאת, ולכן מומלץ לא לשלוח את הטופס שוב כרגע. אפשר ליצור קשר בטלפון או בוואטסאפ.');
  assert.ok(!DELIVERY_UNCERTAIN_TEXT.includes('לנסות שוב'), 'the uncertain message never invites a retry');
});

test('each required field missing or invalid is reported, in form order', () => {
  assert.deepEqual(fieldErrors(OK, { requireConsent: true }), []);
  const cases = [
    [{ full_name: '' }, ['missing_name']], [{ full_name: '   ' }, ['missing_name']],
    [{ phone: '' }, ['missing_phone']], [{ phone: '   ' }, ['missing_phone']], [{ phone: 'call me' }, ['invalid_phone']], [{ phone: '12345' }, ['invalid_phone']],
    [{ phone: '+++------' }, ['invalid_phone']],
    [{ email: '' }, ['invalid_email']], [{ email: 'not-an-email' }, ['invalid_email']], [{ email: 'a@b' }, ['invalid_email']],
    [{ consent: '' }, ['missing_consent']],
  ];
  for (const [patch, expected] of cases) assert.deepEqual(fieldErrors({ ...OK, ...patch }, { requireConsent: true }), expected, JSON.stringify(patch));
  assert.deepEqual(fieldErrors({}, { requireConsent: true }), ['missing_name', 'missing_phone', 'invalid_email', 'missing_consent']);
  assert.deepEqual(fieldErrors({ ...OK, consent: '' }), [], 'main-site forms have no consent box');
});

test('phone: valid Israeli numbers are accepted whatever the formatting', () => {
  for (const p of [
    '052-431-7164', '0524317164', '052 431 7164', '052-4317164', '05-24317164', '052.431.7164', '(052) 431-7164', ' 0501234567 ',
    '+972 52-431-7164', '+972524317164', '972524317164', '00972524317164', '+972 (0)52 431 7164', '+972-52-431-7164',
    '03-1234567', '(03) 123-4567', '04.123.4567', '02 123 4567', '08-9123456', '09-7654321', '077-1234567', '073 123 4567',
    '+972 3 123 4567', '+44 20 7946 0958', '+1 (212) 555-0100', '0044 20 7946 0958',
  ]) assert.ok(isValidPhone(p), p);
  assert.equal(normalizePhone('+972 (0)52-431.7164'), '+9720524317164');
});

test('phone: incomplete, too long or impossible numbers are rejected', () => {
  for (const p of [
    '12345', '123', '052-431-716', '052431716', '05243171645', '524317164', '1234567890', '06-1234567', '01-1234567',
    '0001234567', '+972 12 345 6789', '+972 52 431 716', '+97252431716', 'call me', '052-431-716a', '052–431–7164x',
    '+++------', '--', '+', '+44 20', '++972524317164', '052+4317164',
  ]) assert.ok(!isValidPhone(p), p);
});

test('the Worker applies exactly the same rules (browser validation is not the only check)', () => {
  for (const patch of [{}, { full_name: '' }, { phone: '' }, { phone: '12345' }, { phone: '+++------' }, { email: 'a@b' }, { consent: '' }]) {
    const lead = { ...OK, ...patch, form: 'lp-home', submission_id: '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c', page_path: '/' };
    const browser = fieldErrors(lead, { requireConsent: true })[0];
    assert.equal(validateLead(lead).error, browser, JSON.stringify(patch));
  }
  for (const code of Object.keys(ERROR_FIELD)) assert.ok(ERROR_MESSAGES[code], code);
  assert.deepEqual(Object.keys(ERROR_MESSAGES).sort(), Object.keys(ERROR_FIELD).sort());
});

test('the consent wording sent to OfficeCRM is exactly what the landing pages display', async () => {
  const { CONSENT_TEXT } = await import('../src/lib/lead-rules.js');
  const { lpShared } = await import('../src/data/lp.mjs');
  assert.equal(`${lpShared.consentBefore}${lpShared.consentLink}`, CONSENT_TEXT);
});
