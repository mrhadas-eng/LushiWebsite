// Downloads every image the site uses from the Wix CDN (full-resolution originals)
// into public/media, and creates resized WebP versions for fast loading.
// Also downloads the site's custom Hebrew font.
//
// Run once (and again whenever you add images that still live on Wix):
//   npm run fetch-media
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { allMedia } from '../src/data/content.mjs';
import { normalize, localBase, localOriginal, WIDTHS } from '../src/lib/media.mjs';

const OUT = path.resolve('public/media');
const FONT_OUT = path.resolve('public/fonts');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(FONT_OUT, { recursive: true });

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const names = allMedia();
let done = 0, skipped = 0, failed = [];

async function handle(name) {
  const n = normalize(name);
  const orig = path.join(OUT, localOriginal(n));
  try {
    if (!fs.existsSync(orig)) await download(`https://static.wixstatic.com/media/${n}`, orig);
    else skipped++;
    if (!/\.png$/i.test(n)) {
      const meta = await sharp(orig).metadata();
      for (const w of WIDTHS) {
        const out = path.join(OUT, `${localBase(n)}-w${w}.webp`);
        if (fs.existsSync(out)) continue;
        await sharp(orig).rotate().resize({ width: Math.min(w, meta.width || w) }).webp({ quality: 80 }).toFile(out);
      }
    }
    done++;
  } catch (e) {
    failed.push(`${n}: ${e.message}`);
  }
}

// a few at a time
const queue = [...names];
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await handle(queue.shift()); }));

// The site's uploaded Hebrew font (from the Wix site settings)
const font = 'https://static.wixstatic.com/ufonts/349df3_b29a14ea11d649d7b2797dad85fb7c1b';
for (const [fmt, ext] of [['woff2', 'woff2'], ['woff', 'woff']]) {
  const dest = path.join(FONT_OUT, `lushi.${ext}`);
  if (!fs.existsSync(dest)) {
    try { await download(`${font}/${fmt}/file.${ext}`, dest); } catch (e) { failed.push(`font ${fmt}: ${e.message}`); }
  }
}

console.log(`Images: ${done} ready (${skipped} were already downloaded), ${failed.length} failed of ${names.length}.`);
if (failed.length) { console.log(failed.join('\n')); process.exitCode = 1; }
