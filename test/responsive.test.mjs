// Phone/tablet basics on the built sites (run `npm run build` first). The full browser check is
// test/e2e/responsive.e2e.mjs (every page at 9 phone and tablet sizes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const built = fs.existsSync('dist/index.html') && fs.existsSync('dist-lp/index.html');
const skip = !built && 'run npm run build first';
const htmlFiles = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.html')).map((f) => path.join(dir, f));
// All CSS of a build: the stylesheets plus the <style> blocks Astro inlines into pages.
const css = (dir) => [
  ...fs.readdirSync(path.join(dir, '_astro')).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(dir, '_astro', f), 'utf8')),
  ...htmlFiles(dir).flatMap((f) => fs.readFileSync(f, 'utf8').match(/<style[^>]*>[\s\S]*?<\/style>/g) || []),
].join('\n');

test('every page has a mobile viewport and lets visitors zoom', { skip }, () => {
  for (const f of [...htmlFiles('dist'), ...htmlFiles('dist-lp')]) {
    const h = fs.readFileSync(f, 'utf8');
    const vp = h.match(/<meta name="viewport" content="([^"]+)"/)?.[1];
    assert.ok(vp && /width=device-width/.test(vp), `${f}: viewport meta`);
    assert.doesNotMatch(vp, /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/, `${f}: zoom must not be disabled`);
  }
});

test('main menu stays on one row on tablets: cells shrink instead of wrapping', { skip }, () => {
  const c = css('dist');
  assert.match(c, /\.menu-list\[[^\]]+\]\{[^}]*flex-wrap:nowrap/);
  assert.match(c, /\.menu-item\[[^\]]+\]\{[^}]*flex:0 1 131px[^}]*min-width:0/);
});

test('desktop submenu toggles stay above neighboring menu links', { skip }, () => {
  const c = css('dist');
  assert.match(c, /\.sub-toggle\[[^\]]+\]\{[^}]*position:absolute;z-index:1/);
});

test('touch screens get larger tap areas (desktop layout unchanged)', { skip }, () => {
  const www = css('dist'), lp = css('dist-lp');
  assert.ok(new Set(www.match(/@media\s*\(pointer:\s*coarse\)\{[^@]*/g)).size >= 6, 'www: pointer-coarse rules');
  // mobile menu button: the Wix size (41x40 on the 320px design) but never under 44x44px
  assert.match(www, /\.menu-toggle\[[^\]]+\]\{[^}]*width:max\(44px,[^}]*height:max\(44px,/);
  // lp styles are global (no Astro scope attribute), so the attribute part is optional
  assert.match(lp, /@media\s*\(pointer:\s*coarse\)\{\.lp-consent(\[[^\]]+\])?\{min-height:44px\}/);
  assert.match(lp, /\.lp-footer a(\[[^\]]+\])?\{display:inline-block;padding-block:12px/);
});
