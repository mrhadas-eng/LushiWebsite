// usage: node local-extract.mjs <outdir> <width>x<height>[,..] <path>[,..]   (paths starting with lp: go to 8788)
import { chromium } from 'playwright';
import fs from 'node:fs';
import { withFonts } from './fonts.mjs';
const [out, sizes, paths] = process.argv.slice(2);
const EX = fs.readFileSync(new URL('../parity/extract.js', import.meta.url), 'utf8');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
fs.mkdirSync(out, { recursive: true });
for (const sz of sizes.split(',')) {
  const [w, h] = sz.split('x').map(Number);
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 1100, deviceScaleFactor: 1 });
  await withFonts(ctx);
  const p = await ctx.newPage();
  for (const path of paths.split(',')) {
    const url = path.startsWith('lp:') ? 'http://127.0.0.1:8788' + path.slice(3) : 'http://127.0.0.1:8787' + path;
    await p.goto(url, { waitUntil: 'load' });
    await p.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
    await p.evaluate(() => { document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-in')); document.querySelectorAll('img[loading=lazy]').forEach((i) => (i.loading = 'eager')); });
    const json = await p.evaluate(EX);
    await p.waitForTimeout(1200);
    const name = `${path.replace(/^lp:/, 'lp_').replace(/[\/?]/g, '_') || '_'}-${w}`;
    fs.writeFileSync(`${out}/${name}.json`, json);
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true, animations: 'disabled' });
    const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight));
    console.log(name, JSON.parse(json).n, 'items; fonts:', [...new Set(fonts)].join(', '));
  }
  await ctx.close();
}
await b.close();
