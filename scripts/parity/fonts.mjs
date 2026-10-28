// Google Fonts are blocked in this workspace. Serve the same families from @fontsource copies so local
// screenshots render with the fonts a real visitor gets (Base.astro and LpBase.astro font requests).
import fs from 'node:fs';
const D = process.env.FONTSOURCE_DIR || new URL('./node_modules/', import.meta.url).pathname;   // folder with the @fontsource packages
const F = (pkg, file) => `${D}${pkg}/files/${file}`;
const faces = [
  ...[200, 300, 400, 700].flatMap((w) => [
    ['Assistant', w, F('@fontsource/assistant', `assistant-hebrew-${w}-normal.woff2`), 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F'],
    ['Assistant', w, F('@fontsource/assistant', `assistant-latin-${w}-normal.woff2`), 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ]),
  ['Josefin Sans', 300, F('@fontsource/josefin-sans', 'josefin-sans-latin-300-normal.woff2'), ''],
  ['Nunito Sans', 300, F('@fontsource/nunito-sans', 'nunito-sans-latin-300-normal.woff2'), ''],
  ['Open Sans', '300 800', F('@fontsource-variable/open-sans', 'open-sans-hebrew-wdth-normal.woff2'), 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F', '75% 100%'],
  ['Open Sans', '300 800', F('@fontsource-variable/open-sans', 'open-sans-latin-wdth-normal.woff2'), 'U+0000-00FF,U+2000-206F,U+20AC,U+2122', '75% 100%'],
  ['Noto Sans Hebrew', '100 900', F('@fontsource-variable/noto-sans-hebrew', 'noto-sans-hebrew-hebrew-wght-normal.woff2'), 'U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F'],
];
const css = faces.map(([fam, w, file, range, stretch], i) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};${stretch ? `font-stretch:${stretch};` : ''}font-display:swap;src:url(https://fonts.gstatic.com/local/${i}.woff2) format('woff2');${range ? `unicode-range:${range};` : ''}}`).join('\n');
export async function withFonts(ctx) {
  for (const [, , file] of faces) if (!fs.existsSync(file)) throw new Error('missing font ' + file);
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: css }));
  await ctx.route('https://fonts.gstatic.com/local/*', (r) => { const i = +r.request().url().match(/(\d+)\.woff2$/)[1]; r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(faces[i][2]) }); });
  await ctx.route(/googletagmanager|google-analytics|doubleclick/, (r) => r.abort());
}
