# hagarlushi.com: מסמך בדיקה לפני מעבר מ-Wix

המסמך מתאר את כל מה שבודק חיצוני, למשל ChatGPT, צריך כדי לוודא שהאתר החדש מוכן למעבר ה-DNS ושלא אבדה שום פונקציונליות מאתר ה-Wix.
עודכן לאחרונה: 2026-10-09. הממצאים על אתר ה-Wix נאספו ב-2026-10-08.

---

## 0. איך משתמשים במסמך

1. ב-ChatGPT מחברים את GitHub (Settings ← Connectors ← GitHub) ומאשרים גישה למאגר `mrhadas-eng/LushiWebsite`. אפשרות אחרת: להוריד את המאגר כ-ZIP ולהעלות אותו.
2. מדביקים את ההנחיה מסעיף 1.
3. את הממצאים שחוזרים מ-ChatGPT מביאים חזרה לשיחה עם Claude לתיקון.

---

## 1. הנחיה להדבקה ב-ChatGPT

```
אתה בודק טכני לפני העלאה לאוויר. המאגר mrhadas-eng/LushiWebsite הוא אתר סטטי (Astro 5)
שמחליף את אתר ה-Wix בכתובת https://www.hagarlushi.com ויתארח ב-Firebase Hosting.
קרא קודם את docs/MIGRATION-REVIEW.md במלואו, ואחריו את הקבצים שהוא מפנה אליהם.

בדוק:
1. שכל פונקציונליות של אתר ה-Wix (סעיף 4) קיימת באתר החדש או שיש לה החלטה מתועדת.
2. שכל כתובת ישנה (סעיף 5) נשמרת או מופנית ב-301 לדף הנכון, כולל כתובות בעברית.
3. שאנליטיקס ואירועי לידים (סעיף 6) מוגדרים נכון, ושלא ייווצרו ספירה כפולה, ספירה חסרה
   או זליגת נתונים מסביבות בדיקה.
4. ששליחת הלידים ל-CRM (סעיף 7) עמידה: שגיאות רשת, ספאם, CORS, תווים בעברית.
5. שתוכנית ה-DNS (סעיף 8) לא תפיל שום שירות קיים: דף הנחיתה lp, מייל, אימותים.
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
| אחסון | Firebase Hosting (פרויקט Firebase עדיין לא נוצר, ואין עדיין `.firebaserc` או workflow לפריסה) |
| דומיין קנוני | `https://www.hagarlushi.com` (עם www) |
| הרצה מקומית | `npm install`, `npm run dev`, ואז `http://localhost:4321` |
| בדיקת מוכנות | `npm run check-launch` (מחזיר שגיאה אם חסר משהו קריטי) |

### מפת קבצים

| מה | איפה |
|---|---|
| כל התוכן וההגדרות: טלפון, מייל, וואטסאפ, GTM, webhook | `src/data/content.mjs` (האובייקט `site`) |
| תבנית עמוד בסיסית: head, meta, canonical, noindex | `src/layouts/Base.astro` |
| אנליטיקס ואירועי לידים | `src/components/Tracking.astro` |
| טופס יצירת קשר ושליחה ל-CRM | `src/components/ContactForm.astro` |
| דף תודה וספירת ליד | `src/pages/thankyou.astro` |
| כפתור וואטסאפ צף | `src/components/WhatsAppButton.astro` |
| sitemap ו-robots | `src/pages/sitemap.xml.js`, `src/pages/robots.txt.js` |
| הפניות 301 וכותרות cache | `firebase.json` |
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
| טפסי Wix | שליחה ישירה ל-webhook של ה-CRM, ואז מעבר ל-`/thankyou` | ⏳ חסרה כתובת ה-webhook |
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

**הפניות 301** (`firebase.json`) לטיוטות, לכפילויות ולדפי התבנית של Wix:
`/home`, `/bio`, `/פרוייקטים`, `/להיות-יפה`, `/copy-of-להיות-יפה`, `/redesign`, `/go-on-vacation`, `/הבן-של-הנגר3`, `/דףנחיתה2`, `/דף-נחיתה-פרטיים`, `/דף-נחיתה-פרטי`, `/coming-soon`, `/portfolio-collections/**`, ו-3 כתובות ה-sitemap הישנות.

**לבדיקה:**
- שההפניות בעברית עובדות ב-Firebase (גם בכתובת מקודדת `%D7…`). לבדוק בקישור תצוגה מקדימה לפני המעבר.
- `cleanUrls: true` ו-`trailingSlash: false`: לוודא שגם `/אודות/` מגיע לדף.
- דומיין ללא www (`hagarlushi.com`) צריך הפניה ל-`www`. מגדירים את זה ב-Firebase בהוספת הדומיין ("Redirect to www.hagarlushi.com").

---

## 6. אנליטיקס ואירועים

- **טעינה:** `Tracking.astro` טוען את `GTM-KJRR2DNT` רק אם ה-hostname תואם ל-`(^|\.)hagarlushi\.com$`, או אם הכתובת נפתחה פעם אחת עם `?gtm=1` (נשמר ל-session). כך localhost וקישורי התצוגה המקדימה של Firebase לא נספרים.
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

הגדרות ב-`site.leadWebhook` שבקובץ `content.mjs`:

| שדה | ערכים | משמעות |
|---|---|---|
| `url` | כתובת https של ה-webhook | ריק = מצב בדיקה (פותח את תוכנת המייל) |
| `format` | `json` (ברירת מחדל) או `form` | JSON, או `application/x-www-form-urlencoded` |
| `mode` | `no-cors` (ברירת מחדל) או `cors` | `no-cors` עובד עם כל CRM, אבל אי אפשר לדעת אם ה-CRM החזיר שגיאה. `cors` דורש שה-CRM יאשר את המקור `https://www.hagarlushi.com`, ואז שגיאה מוצגת לגולש |

**תהליך:** בדיקת שדות חובה, ואז מלכודת ספאם (השדה הנסתר `website`; אם מולא, מעבר לדף תודה בלי שליחה ובלי ספירה), ואז `fetch` (POST, `keepalive`), ואז מעבר ל-`/thankyou`. בשגיאת רשת, או בשגיאה ממצב `cors`, מוצגת הודעה עם הטלפון והוואטסאפ, והגולש נשאר בדף.

**מבנה הנתונים שנשלח** (מפתחות באנגלית; ערכים ריקים לא נשלחים):
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
במצב `json` + `no-cors` הגוף נשלח עם `Content-Type: text/plain`. הדפדפן לא מאפשר JSON מפורש בלי CORS. **לבדוק שה-CRM מפענח גוף כזה,** או לעבור ל-`cors` או ל-`form`.

**נבדק אוטומטית** (דפדפן headless מול webhook מדומה): JSON מדף הבית, form מדף יצירת קשר, שגיאת 500 במצב cors (הודעת שגיאה מוצגת, אין מעבר), בוט (לא נשלח ולא נספר), רענון דף התודה (לא נספר שוב).

**מגבלות ידועות:**
- כתובת ה-webhook גלויה בקוד הדף, כך שכל אחד יכול לשלוח אליה. ההגנה היא מלכודת הספאם בלבד. הגנה חזקה יותר דורשת שרת ביניים, למשל Firebase Function, שזמינה רק בתוכנית Blaze.
- במצב `no-cors` שגיאה בצד ה-CRM לא נראית לגולש. לכן חשוב לבדוק בעלייה שכל ליד באמת נכנס ל-CRM.

---

## 8. תוכנית DNS ומעבר

**לפני כל שינוי:**
1. בממשק Wix (Domains ← hagarlushi.com ← Manage DNS Records) לייצא או לצלם את **כל** הרשומות: A, AAAA, CNAME (`www`, **`lp`**), MX, TXT (כולל `google-site-verification`, SPF, DKIM, DMARC אם קיימים).
2. לבדוק איפה הדומיין רשום (registrar): ב-Wix או במקום אחר. זה קובע אם מעבירים את הדומיין או רק משנים שרתי שמות.

**סדר מומלץ:**
1. ליצור פרויקט Firebase, להעלות את האתר ולבדוק אותו בכתובת `*.web.app`.
2. להעתיק את כל הרשומות הקיימות לספק ה-DNS החדש (Cloudflare חינמי או ה-registrar), **לפני** שמחליפים שרתי שמות.
3. ב-Firebase Hosting ← Add custom domain להוסיף את `www.hagarlushi.com` (ראשי) ואת `hagarlushi.com` (הפניה ל-www), ולהוסיף את רשומות ה-TXT וה-A שמתקבלות.
4. להחליף את שרתי השמות. לחכות להפצה ולהנפקת תעודת SSL ב-Firebase (בדרך כלל עד כמה שעות).
5. להשאיר את מנוי Wix פעיל עד שהכול נבדק.

**בדיקות אחרי המעבר** (אפשר להריץ בטרמינל):
```bash
dig +short www.hagarlushi.com      # Firebase
dig +short hagarlushi.com          # Firebase
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
| יצירת פרויקט Firebase ו-workflow לפריסה מ-GitHub | בעל האתר / Claude | כן |
| מדיניות פרטיות ובאנר עוגיות | בעל האתר | החלטה |
| ייצוא אנשי קשר, פניות וצ'אטים מ-Wix | בעל האתר | לפני ביטול Wix |
