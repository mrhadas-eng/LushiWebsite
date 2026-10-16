// lp.hagarlushi.com/sitemap.xml – the same 7 pages WordPress listed in /wp-sitemap.xml (no build-date lastmod).
import { lpPages, lpThankYou, lpLegal, lpSite } from '../../data/lp.mjs';
export function GET() {
  const paths = [...lpPages.map((p) => p.path), lpThankYou.path, ...lpLegal.map((p) => p.path)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${lpSite.origin}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
