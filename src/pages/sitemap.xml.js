// /sitemap.xml – replaces the sitemap Wix generated (submitted in Google Search Console).
// Lists every public page; /thankyou and /404 are left out on purpose.
// No <lastmod>: a build date would claim every page changed on every deploy, which is not true.
import { site, projects } from '../data/content.mjs';

const STATIC = ['/', '/אודות', '/מסחריים', '/לקוחות-פרטיים', '/יצירת-קשר', '/portfolio', '/הצהרתנגישות'];

export function GET() {
  const paths = [...STATIC, ...projects.map((p) => `/${p.slug}`)];
  const urls = paths
    .map((p) => `  <url><loc>${new URL(encodeURI(p), site.url).href}</loc></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
