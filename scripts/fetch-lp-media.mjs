// Copies the landing-page property (lp.hagarlushi.com, WordPress/Elementor) into this repository:
//   - every file in its WordPress media library  -> originals/lp/ (full size, never deployed)
//     plus resized WebP versions                 -> public/lp-media/<name>-w{480,960,1600}.webp
//     (SVG/PNG/GIF are copied as-is)             -> public/lp-media/<name>.<ext>
//   - the published pages (title + HTML)         -> src/data/lp/wp-pages.json
//   - a manifest of what was copied              -> src/data/lp/media.json
// Runs in GitHub Actions (.github/workflows/fetch-lp-media.yml); the sandbox can't reach the WordPress host.
//   node scripts/fetch-lp-media.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ORIGIN = 'https://lp.hagarlushi.com';
const ARCHIVE = path.resolve('originals/lp');
const OUT = path.resolve('public/lp-media');
const DATA = path.resolve('src/data/lp');
const WIDTHS = [480, 960, 1600];
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; hagarlushi-migration/1.0)' };
for (const d of [ARCHIVE, OUT, DATA]) fs.mkdirSync(d, { recursive: true });

async function json(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { body: await res.json(), total: Number(res.headers.get('X-WP-Total') || 0), pages: Number(res.headers.get('X-WP-TotalPages') || 1) };
}

/** ASCII file-system name: "2025/02/lushi-ph-netacones-9-min.jpg" -> "lushi-ph-netacones-9-min"; non-ASCII names -> "media-<id>". */
export function localName(sourceUrl, id) {
  const file = decodeURIComponent(sourceUrl.split('/').pop());
  const base = file.replace(/\.[^.]+$/, '');
  return /^[\w.-]+$/.test(base) ? base.toLowerCase() : `media-${id}`;
}

// ---------------------------------------------------------------- media library
const media = [];
for (let page = 1, pages = 1; page <= pages; page++) {
  const r = await json(`${ORIGIN}/wp-json/wp/v2/media?per_page=100&page=${page}&_fields=id,source_url,mime_type,alt_text,post,media_details`);
  pages = r.pages;
  media.push(...r.body);
}
console.log(`media library: ${media.length} files`);

const manifest = {};
const failed = [];
for (const m of media) {
  const ext = path.extname(new URL(m.source_url).pathname).toLowerCase();
  const name = localName(m.source_url, m.id);
  const rel = decodeURIComponent(new URL(m.source_url).pathname.replace('/wp-content/uploads/', ''));
  const orig = path.join(ARCHIVE, `${name}${ext}`);
  try {
    if (!fs.existsSync(orig)) {
      const res = await fetch(m.source_url, { headers: HEADERS });
      if (!res.ok) throw new Error(`${res.status}`);
      fs.writeFileSync(orig, Buffer.from(await res.arrayBuffer()));
    }
    const entry = { id: m.id, source: rel, name, ext, mime: m.mime_type, alt: m.alt_text || '', attachedTo: m.post };
    if (/\.(svg|png|gif)$/.test(ext)) {
      fs.copyFileSync(orig, path.join(OUT, `${name}${ext}`));
      entry.file = `/lp-media/${name}${ext}`;
      if (ext !== '.svg') { const meta = await sharp(orig).metadata(); entry.width = meta.width; entry.height = meta.height; }
    } else {
      const meta = await sharp(orig).metadata();
      entry.width = meta.width; entry.height = meta.height; entry.variants = {};
      for (const w of WIDTHS) {
        const target = Math.min(w, meta.width);
        const out = path.join(OUT, `${name}-w${w}.webp`);
        if (!fs.existsSync(out)) await sharp(orig).rotate().resize({ width: target, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
        entry.variants[w] = `/lp-media/${name}-w${w}.webp`;
      }
    }
    manifest[rel] = entry;
  } catch (e) {
    failed.push(`${m.source_url} (${e.message})`);
  }
}
fs.writeFileSync(path.join(DATA, 'media.json'), JSON.stringify(manifest, null, 2) + '\n');

// ---------------------------------------------------------------- pages (content for legal pages, and an audit list)
const pages = (await json(`${ORIGIN}/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,link,status,modified,title,content,template`)).body;
const out = pages.map((p) => ({
  id: p.id, slug: p.slug, link: p.link, status: p.status, modified: p.modified, template: p.template,
  title: p.title?.rendered || '', html: p.content?.rendered || '',
}));
fs.writeFileSync(path.join(DATA, 'wp-pages.json'), JSON.stringify(out, null, 2) + '\n');

console.log(`copied ${Object.keys(manifest).length} media files, ${out.length} pages`);
if (failed.length) { console.error(`FAILED:\n  ${failed.join('\n  ')}`); process.exitCode = 1; }
