// lp.hagarlushi.com/robots.txt
export function GET() {
  return new Response('User-agent: *\nAllow: /\n\nSitemap: https://lp.hagarlushi.com/sitemap.xml\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
