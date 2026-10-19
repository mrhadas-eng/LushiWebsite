// Form layout and accessibility on the built sites (run `npm run build` first): every lead form, main site and
// landing pages. Browser checks of the same rules (computed direction, alignment, focus, keyboard order):
// test/e2e/forms.e2e.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const built = fs.existsSync('dist/index.html') && fs.existsSync('dist-lp/index.html');
const skip = !built && 'run npm run build first';
// Every page with a lead form and the fields it must have, in reading (and keyboard) order.
const FORMS = [
  ['dist/index.html', 'contact-form', ['full_name', 'email', 'phone', 'message']],
  ['dist/יצירת-קשר/index.html', 'contact-form', ['full_name', 'email', 'phone', 'message']],
  ...['index.html', 'architecture/index.html', 'interior-design/index.html', 'renovation/index.html']
    .map((f) => [path.join('dist-lp', f), 'lp-form', ['full_name', 'phone', 'email', 'consent']]),
];
// Expected direction per field: Hebrew text right to left; phone and email left to right (digits, +972, addresses).
const DIR = { full_name: 'rtl', message: 'rtl', phone: 'ltr', email: 'ltr' };
const formHtml = (file, cls) => {
  const h = fs.readFileSync(file, 'utf8');
  const m = h.match(new RegExp(`<form class="${cls}[^"]*"[\\s\\S]*?</form>`));
  assert.ok(m, `${file}: ${cls}`);
  return m[0];
};
const fieldTag = (form, name) => form.match(new RegExp(`<(input|textarea)\\b[^>]*name="${name}"[^>]*>`))?.[0];
// (Astro adds data-astro-cid-… attributes to scoped elements, so tags are matched with [^>]*.)
const strip = (s) => s.replace(/<span class="visually-hidden"[^>]*>[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim();

test('every page that should have a lead form has exactly one, and no other forms are rendered', { skip }, () => {
  const all = (dir) => fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f));
  const withForm = [...all('dist'), ...all('dist-lp')].filter((f) => /<form\b/.test(fs.readFileSync(f, 'utf8'))).map((f) => decodeURI(f)).sort();
  assert.deepEqual(withForm, FORMS.map(([f]) => f).sort());
  for (const [file] of FORMS) assert.equal(fs.readFileSync(file, 'utf8').match(/<form\b/g).length, 1, file);
});

test('forms are explicitly right to left; each field has its own explicit direction', { skip }, () => {
  for (const [file, cls, fields] of FORMS) {
    const form = formHtml(file, cls);
    assert.match(form.slice(0, 200), /\bdir="rtl"/, `${file}: form dir`);
    for (const f of fields.filter((x) => DIR[x])) assert.match(fieldTag(form, f) || '', new RegExp(`\\bdir="${DIR[f]}"`), `${file}: ${f} dir="${DIR[f]}"`);
  }
});

test('every field has a visible label (not a placeholder) and required fields are announced', { skip }, () => {
  for (const [file, cls, fields] of FORMS) {
    const form = formHtml(file, cls);
    assert.doesNotMatch(form, /placeholder="[^"]+"/, `${file}: no placeholder text used as a label`);
    for (const f of fields) {
      const label = form.match(new RegExp(`<label\\b[^>]*>((?:(?!</label>)[\\s\\S])*?name="${f}"[\\s\\S]*?)</label>`))?.[1];
      assert.ok(label, `${file}: ${f} is inside a <label>`);
      const visible = f === 'consent' ? strip(label) : strip(label.match(/<span class="form-label"[^>]*>([\s\S]*?)<\/span>(?=\s*<(input|textarea))/)?.[1] || '');
      assert.ok(visible.length >= 2, `${file}: ${f} has visible label text (got "${visible}")`);
      if (f !== 'message') assert.match(label, /\(שדה חובה\)/, `${file}: ${f} announced as required`);
      if (f !== 'message') assert.match(fieldTag(form, f), /aria-required="true"/, `${file}: ${f} aria-required`);
    }
    if (fields.includes('message')) assert.match(form, /<span class="form-optional"[^>]*>\(לא חובה\)<\/span>/, `${file}: optional message marked`);
  }
});

test('error messages are linked to their fields (aria-describedby) and the fields are in reading order', { skip }, () => {
  for (const [file, cls, fields] of FORMS) {
    const form = formHtml(file, cls);
    for (const f of fields.filter((x) => x !== 'message')) {
      const ref = fieldTag(form, f).match(/aria-describedby="([^"]+)"/)?.[1];
      assert.ok(ref, `${file}: ${f} aria-describedby`);
      assert.match(form, new RegExp(`<p class="[^"]*field-error"[^>]*id="${ref}"[^>]*data-error-for="${f}"`), `${file}: ${f} error element`);
    }
    const order = [...form.matchAll(/name="(full_name|email|phone|message|consent)"/g)].map((m) => m[1]);
    assert.deepEqual(order, fields, `${file}: source order`);
    assert.ok(form.indexOf('type="submit"') > form.lastIndexOf(`name="${fields.at(-1)}"`), `${file}: submit button after the last field`);
  }
});

test('shared form CSS: phone and email left to right but right-aligned; text fields right to left', { skip }, () => {
  // The rules are small enough for Astro to inline them into the page's <style>; check what each form page loads.
  for (const [file] of FORMS) {
    const h = fs.readFileSync(file, 'utf8');
    const linked = [...h.matchAll(/<link rel="stylesheet" href="\/(_astro\/[^"]+)"/g)].map((m) => fs.readFileSync(path.join(path.dirname(file).split(path.sep)[0], decodeURI(m[1])), 'utf8'));
    const c = [...linked, ...(h.match(/<style[^>]*>[\s\S]*?<\/style>/g) || [])].join('\n').replace(/\s+/g, '');
    const dir = file;
    assert.match(c, /input\[type=(")?tel\1?\],[^{]*input\[type=(")?email\2?\][^{]*\{direction:ltr;text-align:right\}/, `${dir}: tel/email rule`);
    assert.match(c, /\.(contact-form|lp-form)[^{]*\{direction:rtl;text-align:right\}/, `${dir}: form rule`);
  }
});
