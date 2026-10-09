// /robots.txt – allow everything, point search engines to the sitemap.
import { site } from '../data/content.mjs';

export function GET() {
  const body = `User-agent: *\nAllow: /\nDisallow: /thankyou\n\nSitemap: ${site.url}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
