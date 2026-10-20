// After `astro build`: split the output into the two Cloudflare Workers' asset folders.
//   dist/     → www.hagarlushi.com      (wrangler.jsonc)      – everything except the landing pages
//   dist-lp/  → lp.hagarlushi.com       (wrangler.lp.jsonc)   – src/pages/lp/** at the root, plus their assets
// Runs as part of `npm run build`.
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const LP = path.resolve('dist-lp');
const from = path.join(DIST, 'lp');
if (!fs.existsSync(from)) { console.error('split-lp: dist/lp not found — did astro build run?'); process.exit(1); }

fs.rmSync(LP, { recursive: true, force: true });
fs.renameSync(from, LP);                                               // landing pages → dist-lp root
for (const dir of ['_astro']) fs.cpSync(path.join(DIST, dir), path.join(LP, dir), { recursive: true }); // shared CSS/JS
const media = path.join(DIST, 'lp-media');
if (fs.existsSync(media)) fs.renameSync(media, path.join(LP, 'lp-media'));                             // lp images only on lp
const notFound = path.join(LP, '404', 'index.html');                                                    // Cloudflare wants /404.html
if (fs.existsSync(notFound)) { fs.renameSync(notFound, path.join(LP, '404.html')); fs.rmSync(path.join(LP, '404'), { recursive: true }); }
for (const f of ['_redirects', '_headers']) fs.copyFileSync(path.resolve('lp-public', f), path.join(LP, f));

const count = (d) => fs.readdirSync(d, { recursive: true }).filter((f) => fs.statSync(path.join(d, f)).isFile()).length;
console.log(`split-lp: dist ${count(DIST)} files (www), dist-lp ${count(LP)} files (lp.)`);
