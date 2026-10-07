// Image helper.
// Every image on the site is referenced by its original Wix media name
// (e.g. "3f6e24_af78c53536474b188e7b1c2e3cc4c71e~mv2.jpg").
// After `npm run fetch-media` has downloaded the originals into public/media,
// pages use the local copies (plus resized WebP versions). Until then they
// fall back to the Wix CDN, so the site always renders.
import fs from 'node:fs';
import path from 'node:path';

export const WIDTHS = [480, 960, 1600];
const PUBLIC_MEDIA = path.resolve('public/media');

/** Gallery entries are stored without the "~mv2.jpg" suffix. */
export function normalize(name) {
  return /\.\w+$/.test(name) ? name : `${name}~mv2.jpg`;
}

/** File-system safe local base name: "3f6e24_abc~mv2.jpg" -> "3f6e24_abc-mv2" */
export function localBase(name) {
  return normalize(name).replace(/~/g, '-').replace(/\.\w+$/, '');
}

export function localOriginal(name) {
  const n = normalize(name);
  return `${localBase(n)}${path.extname(n).toLowerCase()}`;
}

// Full-size JPG originals are archived in /originals (not deployed);
// the site serves the resized WebP versions and the PNG logos from public/media.
function hasLocal(name) {
  const n = normalize(name);
  if (/\.png$/i.test(n)) return fs.existsSync(path.join(PUBLIC_MEDIA, localOriginal(n)));
  return fs.existsSync(path.join(PUBLIC_MEDIA, `${localBase(n)}-w${WIDTHS[0]}.webp`));
}

function wixUrl(name, w) {
  const n = normalize(name);
  if (!w) return `https://static.wixstatic.com/media/${n}`;
  return `https://static.wixstatic.com/media/${n}/v1/fit/w_${w},h_${w},q_90,enc_auto/${n}`;
}

/**
 * Returns { src, srcset } for an image.
 * @param {string} name  Wix media name
 * @param {number} [display] approximate largest display width, picks the default src
 */
export function img(name, display = 960) {
  const local = hasLocal(name);
  const isPng = /\.png$/i.test(normalize(name));
  if (local) {
    const base = `/media/${localBase(name)}`;
    if (isPng) return { src: `/media/${localOriginal(name)}`, srcset: undefined };
    const avail = WIDTHS.filter((w) => fs.existsSync(path.join(PUBLIC_MEDIA, `${localBase(name)}-w${w}.webp`)));
    if (!avail.length) return { src: wixUrl(name, display), srcset: undefined };
    const pick = avail.find((w) => w >= display) ?? avail[avail.length - 1];
    return {
      src: `${base}-w${pick}.webp`,
      srcset: avail.map((w) => `${base}-w${w}.webp ${w}w`).join(', '),
    };
  }
  if (isPng) return { src: wixUrl(name), srcset: undefined };
  return {
    src: wixUrl(name, WIDTHS.find((w) => w >= display) ?? 1600),
    srcset: WIDTHS.map((w) => `${wixUrl(name, w)} ${w}w`).join(', '),
  };
}

/** Full-size URL for the lightbox. */
export function full(name) {
  if (hasLocal(name)) {
    const big = path.join(PUBLIC_MEDIA, `${localBase(name)}-w1600.webp`);
    if (fs.existsSync(big)) return `/media/${localBase(name)}-w1600.webp`;
    const largest = [...WIDTHS].reverse().find((w) => fs.existsSync(path.join(PUBLIC_MEDIA, `${localBase(name)}-w${w}.webp`)));
    return `/media/${localBase(name)}-w${largest}.webp`;
  }
  return wixUrl(name, 1600);
}
