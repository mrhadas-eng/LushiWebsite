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
| טפסי Wix | שליחה ל-`/api/lead` (Cloudflare Worker) שמתרגם ושולח ל-OfficeCRM, ומעבר ל-`/thankyou` רק אחרי `success: true` | ✅ קוד ונבדק מול OfficeCRM מדומה. ⏳ ליד בדיקה מול OfficeCRM האמיתי (O3) |
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

**עדכון 2026-10-11 (בדיקת תוכן):**
- `/דף-נחיתה-פרטיים`, `/דף-נחיתה-פרטי` ו-`/דףנחיתה2` הם **דפי נחיתה חיים** ולא טיוטות. הם מחוץ להיקף ולא נבנים מחדש; ההפניה שלהם ממתינה לאישור אחרי בדיקת קמפיינים פעילים, ולא עוצרת את המעבר (D3).
- `/copy-of-להיות-יפה` הוא עותק של "דירה להשכיר", וההפניה שלו תוקנה.
- כל ההפניות מסומנות "ממתינות לאישור" ב-`src/data/url-inventory.mjs`.

**דפי הנחיתה lp.hagarlushi.com** נבנו מחדש. כל 7 הכתובות נשמרו, כולל הלוכסן בסוף. הרשימה המלאה של כל הכתובות, ההחלטות D1–D8 ותוכנית ה-DNS נמצאות ב-`docs/LANDING-PAGE-INVENTORY.md`.

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

## 7. לידים ושליחה ל-OfficeCRM

**הארכיטקטורה:** הטופס שולח JSON לכתובת באותו אתר, `POST /api/lead`. שם Cloudflare Worker (`worker/index.js`) בודק את הבקשה, מתרגם אותה למבנה ש-OfficeCRM מצפה לו, ושולח אותה ל-webhook הקיים של OfficeCRM. OfficeCRM עצמו לא שונה.

**סודות ב-Cloudflare** (Workers ← hagarlushi ← Settings ← Variables and Secrets, סוג **Secret**):

| שם | ערך |
|---|---|
| `CRM_WEBHOOK_URL` | הכתובת המלאה של ה-webhook ב-OfficeCRM: `https://<כתובת OfficeCRM>/api/leads/webhook` |
| `LEADS_WEBHOOK_API_KEY` | אותו ערך כמו `LEADS_WEBHOOK_API_KEY` ב-OfficeCRM: המפתח בלבד, בלי `Bearer` |

שני הערכים לא נמצאים במאגר (שהוא ציבורי), לא בקוד האתר ולא ביומנים. `npm test` נכשל אם כתובת ה-webhook מופיעה בקובץ כלשהו במאגר או באתר הבנוי.

**הבקשה ל-OfficeCRM:** `POST`, `Content-Type: application/json`, `Authorization: Bearer <מפתח>`.

| שדה ב-OfficeCRM | מאיפה |
|---|---|
| `name` (חובה) | השם מהטופס |
| `phone` (חובה) | הטלפון מהטופס |
| `email` (חובה) | האימייל מהטופס |
| `source` (חובה) | ערוץ ההגעה, תמיד מתחיל ב-`website`: `website / google / cpc` (לפי utm), `website / google-ads` (gclid), `website / facebook` (fbclid), `website / instagram.com` (אתר מפנה), או `website / direct` |
| `notes` | ההודעה של הגולש, איזה טופס, מאיזה דף נשלח, דף הכניסה, כל תגי ה-utm, gclid/fbclid, האתר המפנה והשעה |
| `referrerName` | **לא נשלח.** באתר אין שדה "מי המליץ", ולא ממציאים ערך |

שם, טלפון ואימייל הם חובה ב-OfficeCRM, ולכן **שני הטפסים מחייבים עכשיו את שלושתם**. בעבר בדף יצירת קשר רק האימייל היה חובה.

**מתי ליד נחשב הצלחה:** רק אם OfficeCRM החזיר HTTP 2xx עם JSON שבו `success: true` (צפוי: 200 עם `leadId`). כל תשובה אחרת נחשבת כישלון: `success: false`, בלי `success`, JSON שבור או ריק, 4xx/5xx, timeout של 10 שניות או שגיאת רשת. בכישלון הגולש נשאר בדף, מה שהקליד נשמר, ומוצגת הודעה עם הטלפון והוואטסאפ. **אין מעבר לדף תודה ואין `generate_lead`.** ביומן נרשם רק קוד הסיבה, או ה-`leadId` בהצלחה.

**נבדק (2026-10-11, בלי לגעת ב-OfficeCRM האמיתי):**
- `npm test`: 41 בדיקות, כולל שרת מדומה שמתנהג כמו ה-webhook של OfficeCRM. הן מכסות: כתובת, Bearer, JSON, מיפוי שדות, `success:true` עם `leadId`, `success:false`, בלי `success`, JSON שבור, 401/400/500, timeout, שגיאת רשת, סודות חסרים, מקור זר, honeypot, קלט לא תקין, אין redirect ואין `generate_lead` בכישלון, ואין כתובת או מפתח באתר ובמאגר.
- סביבת Cloudflare מקומית (`wrangler dev`) עם OfficeCRM מדומה, בדפדפן במחשב ובמובייל: 40/40 בדיקות. הבדיקה הזו גם מצאה ותיקנה באג שהיה מפיל את ה-Worker ב-Cloudflare.

**לא נבדק:** OfficeCRM האמיתי. הקוד של OfficeCRM לא היה זמין לבדיקה, ולכן החוזה מומש כפי שנמסר. מאמתים אותו בליד בדיקה אחרי הפריסה (`docs/CLOUDFLARE-PLAN.md`, שלב O3). שם גם רשומות 4 נקודות לבדיקה: ערכי `source`, אורך `notes`, כפילויות, וחסימת רשת.

---

## 8. תוכנית DNS ומעבר

**לפני כל שינוי:**
1. בממשק Wix (Domains ← hagarlushi.com ← Manage DNS Records) לייצא או לצלם את **כל** הרשומות: A, AAAA, CNAME (`www`, **`lp`**, **`office`**), MX, TXT (כולל `google-site-verification`, SPF, DKIM, DMARC אם קיימים). **`office` הוא OfficeCRM:** אם הרשומה שלו תאבד, ה-CRM ושליחת הלידים מהאתר יפסיקו לעבוד.
2. לבדוק איפה הדומיין רשום (registrar): ב-Wix או במקום אחר. זה קובע אם מעבירים את הדומיין או רק משנים שרתי שמות.

**סדר מומלץ:**
1. **O2:** להוסיף את `hagarlushi.com` לחשבון Cloudflare, ולוודא שכל הרשומות מ-Wix הועתקו. רשומות MX, מייל, `lp` ו-`office` מגדירים "DNS only" (ענן אפור). `www` והדומיין הראשי ממשיכים בשלב הזה להצביע ל-Wix.
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
dig +short office.hagarlushi.com   # אותו יעד כמו לפני המעבר (OfficeCRM)
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
| הגדרת הסודות `CRM_WEBHOOK_URL` ו-`LEADS_WEBHOOK_API_KEY` ב-Cloudflare, וליד בדיקה מכל טופס (O3) | בעל האתר | כן |
| אימות 4 נקודות החוזה מול OfficeCRM (`source`, `notes`, כפילויות, חסימת רשת) | בעל האתר | כן, בזמן ליד הבדיקה |
| דפי הנחיתה lp.hagarlushi.com: נבנו מחדש (C6). החלטות ב-`docs/LANDING-PAGE-INVENTORY.md` §7; פתוח: בדיקת מדיניות הפרטיות על ידי בעלת האתר (בתצוגה המקדימה), אישור נוסח הטפסים; בדיקה ב-WordPress admin של יעד הטפסים; ליד בדיקה מכל טופס (O3b) | בעל האתר | כן, למעבר של `lp` בלבד (O6). WordPress נשאר עד אז |
| מדיניות פרטיות ובאנר עוגיות | בעל האתר | החלטה |
| ייצוא אנשי קשר, פניות וצ'אטים מ-Wix | בעל האתר | לפני ביטול Wix |
