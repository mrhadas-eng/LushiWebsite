// Local Cloudflare previews (`npm run preview:cf` / `npm run preview:cf:lp`) and where the lp privacy page lives.
// Regression for: lp /privacy/ "404" in the local preview. Both Workers defaulted to port 8787, so with the main
// preview still running wrangler silently moved the lp preview to another port, and localhost:8787/privacy/ was
// answered by the MAIN-site Worker (which has no /privacy/). Pinned ports make a clash fail loudly instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readJsonc(file) {
  const src = fs.readFileSync(file, 'utf8');
  let out = '', inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inStr) { out += c; if (c === '\\') { out += n; i++; } else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

const www = readJsonc('wrangler.jsonc');
const lp = readJsonc('wrangler.lp.jsonc');
const scripts = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts;

test('local previews use fixed, distinct ports: www 8787, lp 8788 (and distinct inspector ports)', () => {
  assert.equal(www.dev?.port, 8787);
  assert.equal(lp.dev?.port, 8788);
  assert.ok(Number.isInteger(www.dev?.inspector_port) && Number.isInteger(lp.dev?.inspector_port));
  assert.notEqual(www.dev.inspector_port, lp.dev.inspector_port);
  assert.ok(![www.dev.port, lp.dev.port].includes(www.dev.inspector_port) && ![www.dev.port, lp.dev.port].includes(lp.dev.inspector_port));
});

test('preview scripts: lp preview uses its own config and its own local state folder', () => {
  assert.match(scripts['preview:cf'], /wrangler dev(?!.*-c )/);
  assert.match(scripts['preview:cf:lp'], /wrangler dev -c wrangler\.lp\.jsonc/);
  assert.match(scripts['preview:cf:lp'], /--persist-to \.wrangler\/state-lp\b/);
  assert.ok(/^\.wrangler\/?$/m.test(fs.readFileSync('.gitignore', 'utf8')), '.wrangler is git-ignored');
});

test('routing config unchanged: www drops the trailing slash, lp forces it; both serve their own 404 page', () => {
  assert.equal(www.assets.directory, './dist');
  assert.equal(www.assets.html_handling, 'drop-trailing-slash');
  assert.equal(lp.assets.directory, './dist-lp');
  assert.equal(lp.assets.html_handling, 'force-trailing-slash');
  for (const c of [www, lp]) { assert.equal(c.assets.not_found_handling, '404-page'); assert.deepEqual(c.assets.run_worker_first, ['/api/*']); }
});

const built = fs.existsSync('dist-lp/index.html') && fs.existsSync('dist/index.html');
test('lp privacy is served at /privacy/ by the lp Worker only (not /lp/privacy/, not on www)', { skip: !built && 'run npm run build first' }, () => {
  assert.ok(fs.existsSync('dist-lp/privacy/index.html'), 'dist-lp/privacy/index.html → https://lp.hagarlushi.com/privacy/');
  assert.match(fs.readFileSync('dist-lp/privacy/index.html', 'utf8'), /<link rel="canonical" href="https:\/\/lp\.hagarlushi\.com\/privacy\/"/);
  assert.ok(!fs.existsSync('dist-lp/lp'), '/lp/... exists only under `npm run dev`, never in the Worker build');
  assert.ok(!fs.existsSync('dist/lp') && !fs.existsSync('dist/privacy'), 'the main site does not serve lp pages');
  const title = (f) => fs.readFileSync(f, 'utf8').match(/<title>([^<]*)/)[1];
  assert.notEqual(title('dist/404.html'), title('dist-lp/404.html'), 'the two 404 pages are distinguishable');
});
