// Footer top on the local build vs Wix (desktop 1440; phone 390 = Wix 320 x 390/320)
import { chromium } from 'playwright';
import { withFonts } from './fonts.mjs';
const wixD = {"/":4895,"/אודות":973,"/יצירת-קשר":1255,"/לקוחות-פרטיים":4737,"/מסחריים":2336,"/הצהרתנגישות":1259,"/thankyou":964,"/להיות-יפה-שירלי":2478,"/אור-לעתיד":2657,"/מיברג":1696,"/סטון-גלרי":2202,"/יוניקורן":2575,"/copy-of-יוניקורן-1":1934,"/געתון":2424,"/copy-of-יוניקורן":2449,"/מסודרים-ליד-ביבי":2579,"/מנהל-הפרויקט":2657,"/אבק-כוכבים":2554,"/דירה-להשכיר":2529,"/האקדמיים":2327,"/יפה-להשכרה":2580,"/עיצוב-מחדש":2426,"/צאו-לחופשה":2379,"/פסיכולוגית-אלגנטית":2631,"/הבן-של-הנגר":9533};
const wixM = {"/":4133,"/אודות":1396,"/יצירת-קשר":1445,"/לקוחות-פרטיים":1617,"/מסחריים":1066,"/הצהרתנגישות":1890,"/thankyou":1467,"/להיות-יפה-שירלי":2527,"/אור-לעתיד":2527,"/מיברג":2527,"/סטון-גלרי":2527,"/יוניקורן":3301,"/copy-of-יוניקורן-1":2527,"/געתון":2527,"/copy-of-יוניקורן":2527,"/מסודרים-ליד-ביבי":3177,"/מנהל-הפרויקט":3315,"/אבק-כוכבים":2527,"/דירה-להשכיר":2527,"/האקדמיים":2527,"/יפה-להשכרה":2527,"/עיצוב-מחדש":2527,"/צאו-לחופשה":2527,"/פסיכולוגית-אלגנטית":2527,"/הבן-של-הנגר":10103};
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const rows = [];
for (const [kind, vp, ref, k] of [['desktop', { width: 1440, height: 900 }, wixD, 1], ['phone', { width: 390, height: 844 }, wixM, 390 / 320]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: kind === 'phone', hasTouch: kind === 'phone' }); await withFonts(ctx);
  const p = await ctx.newPage();
  for (const [path, w] of Object.entries(ref)) {
    await p.goto('http://127.0.0.1:8787' + path, { waitUntil: 'load' });
    const top = await p.evaluate(() => Math.round(document.querySelector('footer').getBoundingClientRect().top + scrollY));
    rows.push([kind, path, w == null ? '-' : Math.round(w * k), top, w == null ? '-' : top - Math.round(w * k)]);
  }
  await ctx.close();
}
await b.close();
for (const r of rows) console.log(r.join('\t'));
