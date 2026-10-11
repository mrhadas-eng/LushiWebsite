# hagarlushi.com: מסמך בדיקה לפני מעבר מ-Wix

המסמך מתאר את כל מה שבודק חיצוני, למשל ChatGPT, צריך כדי לוודא שהאתר החדש מוכן למעבר ה-DNS ושלא אבדה שום פונקציונליות מאתר ה-Wix.
עודכן לאחרונה: 2026-10-11 (קוד Cloudflare הושלם ונבדק מקומית; טרם נפרס). הממצאים על אתר ה-Wix נאספו ב-2026-10-08.

---

## 0. איך משתמשים במסמך

1. ב-ChatGPT מחברים את GitHub (Settings ← Connectors ← GitHub) ומאשרים גישה למאגר `mrhadas-eng/LushiWebsite`. אפשרות אחרת: להוריד את המאגר כ-ZIP ולהעלות אותו.
2. מדביקים את ההנחיה מסעיף 1.
3. את הממצאים שחוזרים מ-ChatGPT מביאים חזרה לשיחה עם Claude לתיקון.

---

## 1. הנחיה להדבקה ב-ChatGPT

```
אתה בודק טכני לפני העלאה לאוויר. המאגר mrhadas-eng/LushiWebsite הוא אתר סטטי (Astro 5)
שמחליף את אתר ה-Wix בכתובת https://www.hagarlushi.com ויתארח ב-Cloudflare Workers (static assets),
עם DNS ב-Cloudflare. קרא קודם את docs/MIGRATION-REVIEW.md ואת docs/CLOUDFLARE-PLAN.md במלואם,
ואחריהם את הקבצים שהם מפנים אליהם.

בדוק:
1. שכל פונקציונליות של אתר ה-Wix (סעיף 4) קיימת באתר החדש או שיש לה החלטה מתועדת.
2. שכל כתובת ישנה (סעיף 5) נשמרת או מופנית ב-301 לדף הנכון, כולל כתובות בעברית.
3. שאנליטיקס ואירועי לידים (סעיף 6) מוגדרים נכון, ושלא ייווצרו ספירה כפולה, ספירה חסרה
   או זליגת נתונים מסביבות בדיקה.
4. ששליחת הלידים ל-CRM (סעיף 7) עמידה: שגיאות רשת, ספאם, CORS, תווים בעברית.
5. שתוכנית ה-DNS והאחסון (סעיף 8 ו-docs/CLOUDFLARE-PLAN.md) לא תפיל שום שירות קיים:
   דף הנחיתה lp, מייל, אימותים. בדוק במיוחד את הגדרת html_handling (כתובות בלי לוכסן בסוף).
6. SEO: canonical, sitemap, robots, noindex, הפניות, www מול דומיין ללא www.
7. נגישות, מובייל וביצועים: רק בעיות ממשיות, לא העדפות סגנון.

החזר טבלה: חומרה (חוסם / חשוב / שיפור) | ממצא | קובץ ושורה או שלב | המלצה מדויקת.
אל תמציא מידע שלא מופיע במאגר או במסמך. אם משהו לא ניתן לבדיקה מהקוד
(למשל רשומות DNS או הגדרות ב-GTM), כתוב "דורש בדיקה ידנית" ופרט מה בודקים ואיך.
```

---

## 2. סקירת הפרויקט

| | |
|---|---|
| מאגר | `github.com/mrhadas-eng/LushiWebsite`, ענף `main` |
| טכנולוגיה | Astro 5, פלט סטטי מלא (`dist/`), עברית, RTL |
| אחסון | **Cloudflare Workers (static assets) + Cloudflare DNS**, בתוכנית החינמית. הקוד וההגדרות מוכנים (C1–C4), ועדיין לא נפרס (C5 ושלבי O1–O5 ב-`docs/CLOUDFLARE-PLAN.md`) |
| דומיין קנוני | `https://www.hagarlushi.com` (עם www) |
| הרצה מקומית | `npm install`, ואז `npm run dev` (מהיר, בלי `/api/lead`), או `npm run preview:cf` (סביבת Cloudflare מקומית, כולל `/api/lead`, דורש `.dev.vars`) |
| בדיקות | `npm test` (Worker וקבצי האתר, אחרי `npm run build`), `npx wrangler deploy --dry-run` (תקינות הגדרות Cloudflare) |
| בדיקת מוכנות | `npm run check-launch` (מחזיר שגיאה אם חסר משהו קריטי) |

### מפת קבצים

| מה | איפה |
|---|---|
| כל התוכן וההגדרות: טלפון, מייל, וואטסאפ, GTM | `src/data/content.mjs` (האובייקט `site`) |
| הגדרות Cloudflare | `wrangler.jsonc` |
| נקודת הקצה `/api/lead` (העברה ל-CRM) | `worker/index.js` |
| בדיקות אוטומטיות | `test/worker.test.mjs`, `test/site.test.mjs` |
| תבנית עמוד בסיסית: head, meta, canonical, noindex | `src/layouts/Base.astro` |
| אנליטיקס ואירועי לידים | `src/components/Tracking.astro` |
| טופס יצירת קשר ושליחה ל-CRM | `src/components/ContactForm.astro` |
| דף תודה וספירת ליד | `src/pages/thankyou.astro` |
| כפתור וואטסאפ צף | `src/components/WhatsAppButton.astro` |
| sitemap ו-robots | `src/pages/sitemap.xml.js`, `src/pages/robots.txt.js` |
| הפניות 301 וכותרות cache | `public/_redirects`, `public/_headers` |
| תוכנית האחסון ב-Cloudflare | `docs/CLOUDFLARE-PLAN.md` |
| בדיקת מוכנות | `scripts/check-launch.mjs` |
| משימות פתוחות | `LAUNCH.md` |
| תמונות | `public/media` (WebP מוקטן ולוגואים ב-PNG). המקור ברזולוציה מלאה ב-`originals/` ולא עולה לאוויר |

---

## 3. מצב קיים: אתר ה-Wix (נבדק ב-2026-10-08)

**תשתית**
- האתר בנוי ב-Wix. שרתי השמות של הדומיין הם של Wix: `ns14.wixdns.net`, `ns15.wixdns.net`.
- **דף נחיתה נפרד:** `lp.hagarlushi.com` בנוי ב-WordPress ו-Elementor (לא ב-Wix). יש בו טופס "תאמו שיחת ייעוץ" (שם, טלפון, אימייל, הסכמה למדיניות פרטיות), חלון וואטסאפ שמבקש שם וטלפון, ואותו GTM. הרשומה שלו מוגדרת ב-DNS של Wix.
- **רשומות MX ו-TXT:** לא נבדקו. שירות ה-DNS החיצוני הגביל את הבדיקה. **דורש בדיקה ידנית בממשק Wix.**

**מעקב:** הכול עובר דרך Google Tag Manager `GTM-KJRR2DNT` (גרסת קונטיינר 9).

| תג בקונטיינר | מזהה | מתי פועל |
|---|---|---|
| Google tag (GA4) | `G-4QMWQY3565` | כל הדפים (gtm.init). חסום ב-lp |
| Google Ads, המרה | `AW-16872313549`, label `-2jHCIbIu50aEM2lrO0-` | **רק** כשהכתובת מכילה `lp.hagarlushi.com/thankyou/` |
| Conversion Linker | | כל הדפים |
| Microsoft Clarity (תבנית מותאמת, מוסק מהסקריפט `clarity.ms/tag/qc82doh8lz?ref=gtm`) | `qc82doh8lz` | כל הדפים. חסום ב-lp |
| Meta Pixel (תבנית מותאמת, אירוע standard, מוסק מ-`fbevents.js`) | `629224152313207` | כל הדפים, כולל lp |
| תג מושהה (paused) | | |

הטריגרים בקונטיינר מבוססים רק על `gtm.init`, `gtm.js` ו-Page URL. **אין תלות באירועים ש-Wix דוחף ל-dataLayer** (`Pageview`, `ecommerce`, `user_id`, `site_id`), ולכן אותו קונטיינר יעבוד באתר החדש בלי שינוי.
**ממצא חשוב:** כיום אף ליד מהאתר הראשי לא נספר כהמרה. ההמרה היחידה היא בדף התודה של lp.

**לידים**
- טפסי Wix בדף הבית ובדף יצירת קשר (שם, אימייל, טלפון, הודעה).
- צ'אט Wix (Wix Chat) בפינה התחתונה.
- קישורי `tel:` ו-`mailto:`. באתר הראשי אין וואטסאפ.

**SEO**
- `sitemap.xml` (אינדקס של `pages-sitemap.xml`, `portfolio-projects-sitemap.xml`, `portfolio-collections-sitemap.xml`).
- אימות Google Search Console ו-Bing דרך תגי meta.

---

## 4. מיפוי פונקציונליות: Wix ← האתר החדש

| פונקציונליות ב-Wix | באתר החדש | סטטוס |
|---|---|---|
| 26 דפים (בית, אודות, 2 קטגוריות, 18 פרויקטים, עיתונות, יצירת קשר, נגישות) | כל הדפים, אותן כתובות | ✅ |
| תפריט עם תתי-תפריטים | `Header.astro`, תפריט המבורגר במובייל | ✅ |
| מצגת תמונות בדף הבית, גלריה נגללת, גלריות פרויקטים ותצוגת תמונה מוגדלת | `Slideshow.astro`, `Gallery.astro`, `src/lib/lightbox.js` | ✅ |
| טפסי Wix | שליחה ל-`/api/lead` (Cloudflare Worker) שמעביר ל-CRM, ומעבר ל-`/thankyou` רק אחרי אישור ה-CRM | ✅ קוד ונבדק מול CRM מדומה. ⏳ חסרים פרטי ה-CRM האמיתי |
| Wix Chat | כפתור וואטסאפ צף, `wa.me/972505788634` | ✅ (לאשר מספר והודעה) |
| GTM: GA4, Ads, Meta, Clarity | אותו קונטיינר, נטען רק בדומיין האמיתי | ✅ |
| מעקב לידים מהאתר הראשי | לא היה | ✅ אירועים קיימים. ⏳ צריך להגדיר טריגרים ב-GTM |
| sitemap.xml | `/sitemap.xml` (25 דפים), וכתובות ה-sitemap הישנות מופנות אליו | ✅ |
| robots.txt | `/robots.txt` | ✅ |
| אימות Google ו-Bing | אותם תגי meta ב-`Base.astro` | ✅ |
| הצהרת נגישות | `/הצהרתנגישות` | ✅ |
| מדיניות פרטיות באתר הראשי | לא הייתה ב-Wix, ואין גם עכשיו | ❓ החלטה פתוחה |
| באנר עוגיות | ב-Wix לא הוצג בישראל | ❓ החלטה פתוחה |
| אנשי קשר, פניות והיסטוריית צ'אט ב-Wix | לא עוברים אוטומטית | ⏳ לייצא מ-Wix לפני ביטול |

---

## 5. כתובות והפניות

**דפים קיימים** (נשמרים בדיוק כמו ב-Wix):
`/`, `/אודות`, `/מסחריים`, `/לקוחות-פרטיים`, `/יצירת-קשר`, `/portfolio`, `/הצהרתנגישות`, ו-18 דפי פרויקטים:
`/להיות-יפה-שירלי`, `/אור-לעתיד`, `/מיברג`, `/סטון-גלרי`, `/יוניקורן`, `/copy-of-יוניקורן-1`, `/געתון`, `/copy-of-יוניקורן`, `/מסודרים-ליד-ביבי`, `/מנהל-הפרויקט`, `/אבק-כוכבים`, `/דירה-להשכיר`, `/האקדמיים`, `/יפה-להשכרה`, `/עיצוב-מחדש`, `/צאו-לחופשה`, `/פסיכולוגית-אלגנטית`, `/הבן-של-הנגר`.
**חדש:** `/thankyou` (noindex, לא נכלל ב-sitemap).

**הפניות 301** (`public/_redirects`) לטיוטות, לכפילויות ולדפי התבנית של Wix:
`/home`, `/bio`, `/פרוייקטים`, `/להיות-יפה`, `/copy-of-להיות-יפה`, `/redesign`, `/go-on-vacation`, `/הבן-של-הנגר3`, `/דףנחיתה2`, `/דף-נחיתה-פרטיים`, `/דף-נחיתה-פרטי`, `/coming-soon`, `/portfolio-collections/*`, ו-3 כתובות ה-sitemap הישנות.

**נבדק ב-`wrangler dev` (2026-10-11):**
- כל 25 הדפים מחזירים 200 בכתובת של Wix, בלי הפניה.
- כל 16 ההפניות מחזירות 301 ליעד הנכון, כולל מקורות בעברית.
- `/אודות/` מחזיר 307 ל-`/אודות` (בזכות `html_handling: "drop-trailing-slash"`; ברירת המחדל של Cloudflare הפוכה ותשבור את הכתובות).
- כתובת לא קיימת מחזירה את דף ה-404 עם סטטוס 404. דף ה-404 ודף התודה הם noindex ובלי canonical.
- `sitemap.xml` כולל 25 דפים, בלי `lastmod` (תאריך בנייה היה מציג כל דף כ"עודכן" בכל פריסה).

**עוד לבדוק אחרי הפריסה:** אותן בדיקות בכתובת `workers.dev`, והפניית `hagarlushi.com` ל-`www` (Redirect Rule, שלב O5).

---

## 6. אנליטיקס ואירועים

- **טעינה:** `Tracking.astro` טוען את `GTM-KJRR2DNT` רק אם ה-hostname תואם ל-`(^|\.)hagarlushi\.com$`, או אם הכתובת נפתחה פעם אחת עם `?gtm=1` (נשמר ל-session). כך localhost וקישורי התצוגה המקדימה של Cloudflare (`*.workers.dev`) לא נספרים.
- **אין consent mode:** ב-Wix נשלחו ברירות מחדל של הסכמה, ובישראל הן לא נאכפו (`gdprEnforcedGeo: false`). באתר החדש לא נשלחים אותות הסכמה, כך שגוגל מתייחס להסכמה כמאושרת. **לבדוק שזה תואם את ההחלטה על באנר עוגיות.**
- **מקור הגעה:** בעמוד הראשון של הביקור נשמרים ב-`sessionStorage` (`hl_attribution`) הערכים utm_*, gclid, fbclid, referrer ו-landing_page.

**אירועי dataLayer**

| event | מתי | פרמטרים |
|---|---|---|
| `generate_lead` | בטעינת `/thankyou`, רק אם הגיעו מטופס שנשלח (flag ב-`sessionStorage`, נמחק אחרי שימוש, לכן רענון לא סופר שוב) | `form_location`: `home` או `contact` |
| `whatsapp_click` | לחיצה על קישור `wa.me` או `whatsapp.com` | `link_url`, `link_location`, `page_path` |
| `phone_click` | לחיצה על `tel:` | כנ"ל |
| `email_click` | לחיצה על `mailto:` | כנ"ל |

**דורש הגדרה ידנית ב-GTM (לא בקוד):** טריגרים מסוג Custom Event לאירועים האלה, תגי GA4 Event, סימון `generate_lead` כ-Key event ב-GA4, ואם רוצים, המרת Google Ads ואירוע Lead של מטא. אפשר גם להשתמש בטריגר "Page URL contains hagarlushi.com/thankyou". **הטריגר הקיים של ההמרה (`lp.hagarlushi.com/thankyou/`) לא יופעל מדף התודה החדש,** וזה מכוון.

---

## 7. לידים ושליחה ל-CRM

**הארכיטקטורה (הושלם ב-2026-10-11):** הטופס שולח JSON לכתובת באותו אתר, `POST /api/lead`. שם Cloudflare Worker (`worker/index.js`) בודק את הבקשה ומעביר אותה ל-webhook של ה-CRM. **כתובת ה-webhook לא נמצאת בקוד האתר:** היא סוד ב-Cloudflare בשם `CRM_WEBHOOK_URL`.

| הגדרה | איפה | ערכים |
|---|---|---|
| `CRM_WEBHOOK_URL` | Secret ב-Cloudflare (מקומית: `.dev.vars`, לא נשמר ב-git) | כתובת ה-webhook. חובה |
| `CRM_AUTH_HEADER` | Secret ב-Cloudflare, אופציונלי | כותרת אימות בפורמט `"Name: value"`, למשל `X-Api-Key: …` |
| `CRM_FORMAT` | `vars` ב-`wrangler.jsonc` | `json` (ברירת מחדל) או `form` |

**כללי ה-Worker:**
- מקבל רק `POST` מאותו מקור (`Origin` של האתר עצמו), מסוג `application/json`, בגודל עד 10KB.
- בודק שדות: אימייל חובה ותקין, שם או טלפון חובה, ומגבלות אורך. מעביר רק שדות מוכרים.
- מלכודת ספאם (`website` מולא): עונה `ok` ולא מעביר כלום.
- עונה `{ok:true}` **רק** אם ה-CRM החזיר 2xx בלי גוף שמסמן כישלון (`success:false`, `ok:false`, `status:"error"`). אחרת מחזיר 502 (או 503 אם הסוד לא הוגדר).
- לא רושם ליומן נתוני ליד או את כתובת ה-webhook, רק קודי סטטוס.

**בדפדפן:** הגולש עובר ל-`/thankyou` (ושם נספר `generate_lead` פעם אחת) רק אחרי `{ok:true}`. בכישלון: נשאר בדף, כל מה שהקליד נשמר, ומוצגת הודעה עם הטלפון והוואטסאפ, כך שליד לא הולך לאיבוד בשקט.

**מבנה הנתונים שה-CRM מקבל** (מפתחות באנגלית; ערכים ריקים לא נשלחים):
```json
{
  "full_name": "ישראל ישראלי",
  "email": "test@example.com",
  "phone": "050-1234567",
  "message": "מעוניין בתכנון מטבח",
  "form": "home",
  "page_url": "https://www.hagarlushi.com/?utm_source=facebook&utm_campaign=autumn&fbclid=xyz",
  "page_path": "/",
  "source_summary": "utm_source=facebook | utm_campaign=autumn | Facebook / Instagram (fbclid) | landing: /",
  "submitted_at": "2026-10-09T09:09:00.796Z",
  "site": "www.hagarlushi.com",
  "utm_source": "facebook",
  "utm_campaign": "autumn",
  "fbclid": "xyz",
  "landing_page": "/"
}
```

**נבדק (מקומית, 2026-10-11):**
- 12 בדיקות יחידה של ה-Worker (`npm test`).
- `wrangler dev` (סביבת Cloudflare המקומית) מול CRM מדומה: מקור זר נדחה (403), בקשה בלי Origin נדחתה (403), אימייל לא תקין נדחה (400), בוט לא הועבר, CRM 500 ו-CRM 200 עם `success:false` החזירו 502, וכותרת האימות הגיעה ל-CRM.
- דפדפן (מחשב ומובייל): הצלחה מובילה לדף תודה עם המרה אחת, כולל מקור ההגעה. בכישלון מוצגת שגיאה, הנתונים נשמרים, ואין המרה. בוט: אין שליחה ואין המרה.

**לא נבדק (דורש פרטי CRM):** שליחה אמיתית ל-CRM. צריך: כתובת webhook, פורמט ושמות שדות, שיטת אימות, ומה ה-CRM מחזיר בהצלחה ובכישלון (`docs/CLOUDFLARE-PLAN.md`).

---

## 8. תוכנית DNS ומעבר

**לפני כל שינוי:**
1. בממשק Wix (Domains ← hagarlushi.com ← Manage DNS Records) לייצא או לצלם את **כל** הרשומות: A, AAAA, CNAME (`www`, **`lp`**), MX, TXT (כולל `google-site-verification`, SPF, DKIM, DMARC אם קיימים).
2. לבדוק איפה הדומיין רשום (registrar): ב-Wix או במקום אחר. זה קובע אם מעבירים את הדומיין או רק משנים שרתי שמות.

**סדר מומלץ:**
1. **O2:** להוסיף את `hagarlushi.com` לחשבון Cloudflare, ולוודא שכל הרשומות מ-Wix הועתקו. רשומות MX, מייל ו-`lp` מגדירים "DNS only" (ענן אפור). `www` והדומיין הראשי ממשיכים בשלב הזה להצביע ל-Wix.
2. **O3:** לחבר את GitHub ל-Cloudflare, להגדיר את הסוד `CRM_WEBHOOK_URL`, ולבדוק את האתר בכתובת `*.workers.dev`, כולל ליד בדיקה מכל טופס שמגיע ל-CRM. **לפני כל שינוי DNS.**
3. **O4:** להחליף את שרתי השמות ל-Cloudflare ולחכות שהאזור יהיה Active. אין השבתה, כי הרשומות זהות.
4. **O5:** לחבר את `www.hagarlushi.com` ל-Worker (Custom Domain) ולהגדיר Redirect Rule מ-`hagarlushi.com` ל-`www`.
5. להשאיר את מנוי Wix פעיל עד שהכול נבדק.

פירוט מלא, צעד אחר צעד: `docs/CLOUDFLARE-PLAN.md`, משימות O1–O5.

**בדיקות אחרי המעבר** (אפשר להריץ בטרמינל):
```bash
dig +short NS hagarlushi.com       # שרתי השמות של Cloudflare
dig +short www.hagarlushi.com      # כתובות Cloudflare
dig +short hagarlushi.com          # כתובות Cloudflare
dig +short lp.hagarlushi.com       # אותו יעד כמו לפני המעבר
dig +short MX hagarlushi.com       # זהה לרשומות שהיו ב-Wix
dig +short TXT hagarlushi.com      # כולל google-site-verification
curl -sI https://hagarlushi.com | grep -i location   # הפניה ל-https://www.hagarlushi.com
curl -sI "https://www.hagarlushi.com/home" | grep -i location   # הפניה ל-/
curl -s https://www.hagarlushi.com/sitemap.xml | grep -c "<url>"   # 25
```
ואחר כך:
- **טופס בדיקה מכל טופס.** הליד מופיע ב-CRM עם מקור ההגעה.
- **בדיקת אנליטיקס.** GA4 Realtime ו-Tag Assistant מראים צפייה ואירוע `generate_lead`.
- **דף הנחיתה.** `lp.hagarlushi.com` עולה, והטופס שלו עובד.
- **Search Console.** שולחים מחדש את `https://www.hagarlushi.com/sitemap.xml`.

---

## 9. החלטות ופריטים פתוחים

| פריט | בעלים | חוסם עלייה? |
|---|---|---|
| כתובת webhook של ה-CRM, ופורמט שה-CRM מצפה לו | בעל האתר | כן |
| תוכן סופי לדף התודה (`thankYou` ב-`content.mjs`) | בעל האתר | לא |
| אישור מספר הוואטסאפ וההודעה הפותחת | בעל האתר | לא |
| ייצוא רשומות DNS מ-Wix, כולל `lp` ו-MX | בעל האתר | **כן** |
| טריגרים ב-GTM לאירועי הלידים החדשים | בעל האתר / Claude עם גישה | לא, אבל בלעדיהם הלידים לא נספרים |
| ~~הגדרת Cloudflare בקוד: Worker, `_redirects`, `/api/lead` (C1–C4)~~ | Claude | הושלם |
| חיבור GitHub ל-Cloudflare ופריסה ל-`workers.dev` (C5/O3) | בעל האתר, בהדרכת Claude | כן |
| חשבון Cloudflare, העברת DNS וחיבור הדומיין (O1, O2, O4, O5) | בעל האתר, בהדרכת Claude | כן |
| פרטי ה-CRM: פורמט, שמות שדות, אימות, תשובת הצלחה/כישלון | בעל האתר | כן |
| דף הנחיתה lp.hagarlushi.com: האם להעביר אותו (כרגע מחוץ לתחום, נשאר ב-WordPress) | בעל האתר | לא, כל עוד רשומת ה-DNS שלו נשמרת |
| מדיניות פרטיות ובאנר עוגיות | בעל האתר | החלטה |
| ייצוא אנשי קשר, פניות וצ'אטים מ-Wix | בעל האתר | לפני ביטול Wix |
