// Both local previews running at the same time route to the right Worker (regression for the lp /privacy/ "404").
// Start them first (each in its own terminal):  npm run preview:cf   and   npm run preview:cf:lp
// Then: node test/e2e/preview-routing.e2e.mjs
const WWW = 'http://127.0.0.1:8787', LP = 'http://127.0.0.1:8788';
const out = [];
const check = (ok, label, detail = '') => out.push(`${ok ? '✔' : '✘'} ${label}${detail ? `  [${detail}]` : ''}`);
const get = async (url) => {
  const r = await fetch(url, { redirect: 'manual' });
  const body = await r.text();
  return { status: r.status, location: r.headers.get('location'), title: body.match(/<title>([^<]*)/)?.[1] || '' };
};
const WWW_404 = 'הדף לא נמצא', LP_404 = 'העמוד לא נמצא';

let r = await get(`${WWW}/`);
check(r.status === 200 && r.title.startsWith('הגר לושי'), 'www preview on 8787 serves the main home page', `${r.status} ${r.title}`);
for (const u of ['/portfolio', '/portfolio?utm_source=test', '/portfolio-collections/my-portfolio/project-title-1']) {
  r = await get(`${WWW}${u}`);
  const loc = r.location && new URL(r.location, WWW);
  check(r.status === 301 && loc?.pathname === '/' && loc.search === (u.includes('?') ? '?utm_source=test' : ''),
    `www ${u} redirects permanently to the home page`, `${r.status} → ${r.location}`);
}
r = await get(`${WWW}/privacy/`);
check(r.status === 404 && r.title.includes(WWW_404), 'www has no /privacy/ (main-site 404 page)', `${r.status} ${r.title}`);
r = await get(`${LP}/privacy/`);
check(r.status === 200 && r.title.startsWith('מדיניות פרטיות'), 'lp preview on 8788 serves /privacy/', `${r.status} ${r.title}`);
r = await get(`${LP}/privacy`);
check(r.status === 307 && /\/privacy\/$/.test(r.location || ''), 'lp /privacy redirects to /privacy/', `${r.status} → ${r.location}`);
r = await get(`${LP}/lp/privacy/`);
check(r.status === 404 && r.title.includes(LP_404), '/lp/privacy/ is not an lp Worker URL (lp 404 page; it exists only under npm run dev)', `${r.status} ${r.title}`);
r = await get(`${LP}/architecture/`);
check(r.status === 200, 'lp /architecture/ still served', String(r.status));

console.log(out.join('\n'));
const failed = out.filter((l) => l.startsWith('✘')).length;
console.log(`\n${failed} failed of ${out.length}`);
process.exit(failed ? 1 : 0);
