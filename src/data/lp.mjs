// Landing pages (lp.hagarlushi.com), recreated from the WordPress/Elementor site.
// Copy, images and settings were captured from the live pages on 2026-10-11; see
// docs/LANDING-PAGE-INVENTORY.md. Do not change copy, URLs or tracking IDs without the owner's approval.
import fs from 'node:fs';
import path from 'node:path';

export const lpSite = {
  origin: 'https://lp.hagarlushi.com',
  siteName: 'Hagar Lushi | Architecture & Interior Design',
  // Google tag added by WordPress' Site Kit plugin (in addition to GTM-KJRR2DNT); preserved as-is.
  siteKitTagId: 'GT-TQKZV73G',
  // Landing-page contact number (owner, 2026-10-11): 052-431-7164. The main site keeps 050-578-8634.
  // The WordPress thank-you page linked to 972544317164; the owner corrected it.
  phone: '052-431-7164',
  phoneHref: 'tel:+972524317164',
  // A WhatsApp click is not a lead (owner decision D1): the button opens the chat with this message,
  // is tracked as whatsapp_click only, and never sends anything to OfficeCRM or counts generate_lead.
  // (WordPress showed a name/phone pop-up first; it is not recreated because its data was not used.)
  whatsapp: {
    number: '972524317164',
    message: 'היי הגר! יש לי פרוייקט שאני רוצה להתייעץ לגביו.',
  },
  // Contact email shown on the landing pages' legal pages (owner, 2026-10-12). It replaces the addresses
  // in the WordPress text (src/lib/lp-legal.mjs); the policy wording itself is unchanged (legal review pending).
  legalEmail: 'lushi.office@gmail.com',
  footer: { rights: 'כל הזכויות שמורות להגר לושי' },
};

// ---------------------------------------------------------------- shared copy
const INTRO_HEADING = 'עיצוב ייחודי בהתאמה אישית';
const INTRO_FULL = [
  ['החלום', ' – בית חדש או משופץ שמתאים עבורכם ובסגנון שלכם!'],
  ['המציאות', ' – איפה מתחילים? כל כך הרבה אפשרויות וכל כך הרבה פרטים!'],
  ['הפתרון', ' – המשרד שלי הוא משרד בוטיק שמעניק ליווי משלב השיחה הראשונית ועד לסידור המצעים על המיטה (תשאלו לקוחות שלי :)). אני מאמינה שלכל אחד מגיע לקבל את הכי טוב שאני יכולה לתת בלי קשר לתקציב הבניה שלו. אני קמה כל בוקר לעשות את מה שאני הכי אוהבת, ביחד איתכם!'],
];
const INTRO_SHORT = [
  INTRO_FULL[0], INTRO_FULL[1],
  ['הפתרון', ' – המשרד שלי הוא משרד בוטיק שמעניק ליווי משלב השיחה הראשונית ועד לסידור המצעים על המיטה (תשאלו לקוחות שלי :)). אני מאמינה שלכל אחד מגיע לקבל את הכי טוב שאני יכולה לתת.'],
];
// The home page says "בעברה", the campaign pages "בעברי" (as on the live site).
const aboutText = (word) => `אני הגר לושי, הנדסאית אדריכלות ועיצוב פנים, בוגרת שנקר, עוסקת בתחום האדריכלות ועיצוב פנים כבר 15 שנים ו${word} עשרות פרוייקטים פרטיים ומסחריים בארץ ובחו"ל.`;

export const lpShared = {
  cta: 'תאמו שיחת ייעוץ!',
  introHeading: INTRO_HEADING,
  aboutHeading: 'נעים מאוד,',
  testimonialsHeading: 'לקוחות מספרים',
  testimonialsBackground: '2025/02/lushishirly_ph_NetaCones-20.jpg',
  testimonials: [
    { text: 'רצינו לבנות בית בבניה מתקדמת, בתקציב מסודר וברמה גבוהה. קיבלנו צוות שרוצה לדאוג לנו והבית יצא בדיוק כמו שרצינו!', name: 'זוג + 3', place: 'רמת השופט' },
    { text: 'לכל מקום שהגעתי עם הגר תמיד ובאופן גורף שמעתי מהקבלנים, המפקחים, הספקים, בעלי המקצוע: "אתם של לושי?!! הופה! זכיתם! תדעו לכם שבחרתם באשת מקצוע תותחית! הלוואי וכל המעצבות שאנחנו עובדים מולן היו כמו לושי"', name: 'זוג + 3', place: 'קיבוץ יגור' },
    { text: 'בחרנו לשפץ חדר שירותים ומקלחת אך עם האוכל בא התאבון, ואט אט גלשנו לפינות נוספות בבית. חיפשתי משהי שתוציא לפועל את השגעונות שיש לי בראש, תדייק אותם, תפקח בשטח ותהיה שם שצריך. יצא מטורף!', name: 'זוג + 3', place: 'פרדס חנה - כרכור' },
  ],
  formHeading: 'מעוניינים בשיחת ייעוץ?',
  formText: 'מלאו את הטופס ואחזור אליכם בהקדם:',
  formLabels: { name: 'שם', phone: 'טלפון', email: 'אימייל', submit: 'שליחה' },
  consentBefore: 'קראתי ומאשר/ת את ',
  consentLink: 'מדיניות הפרטיות',
  galleryHeading: 'פרויקטים אחרונים',
  galleryCaption: 'פרוייקט...',
};

// ---------------------------------------------------------------- the four landing pages
const WA = (t) => `2025/02/WhatsApp-Image-2025-02-25-at-${t}.jpeg`;
const GALLERY_ARCH = [WA('10.34.52'), WA('10.34.54'), WA('10.35.03-1'), WA('10.35.03'), '2025/02/lushi-ph-netacones-86.jpg', WA('10.35.02'), WA('10.35.06-1'), WA('10.35.06'), WA('10.35.07'), WA('10.35.00'), WA('10.34.59'), WA('10.34.57')];

export const lpPages = [
  {
    path: '/', slug: '', form: 'lp-home', wpId: 2,
    title: 'Hagar Lushi | Architecture & Interior Design',
    hero: { tag: 'h2', heading: ['חללים שמספרים את הסיפור שלכם'], button: false, scrollArrow: true,
      slides: ['2025/02/4v7a1249-copy-min.jpg', '2025/02/dsc2433-copy.jpg', '2025/02/lushi-ph-netacones-9-min.jpg'] },
    intro: INTRO_FULL,
    about: { text: aboutText('בעברה'), image: '2025/02/תמונה-הגר-לושי.avif' },
    gallery: ['2025/02/4v7a1249-copy-min.jpg', '2025/02/lushishirly-ph-netacones-20-min.jpg', '2025/02/dsc2433-copy-min.jpg', '2025/02/hagarl-30322-3-copy-min.jpg', '2025/02/hagarl-30322-10-copy-min.jpg', '2025/02/lushi-bialik-ph-neta-cones-13-min.jpg', '2025/02/lushi-ph-netacones-3-min.jpg', '2025/02/lushi-ph-netacones-8-min.jpg', '2025/02/lushi-ph-netacones-9-min.jpg', '2025/02/lushishirly-ph-netacones-14-min.jpg', '2025/02/15-min.jpg', '2025/02/lushi-bialik-ph-neta-cones-21.jpg'],
  },
  {
    path: '/architecture/', slug: 'architecture', form: 'lp-architecture', wpId: 387,
    title: 'הגר לושי | אדרכלות – Hagar Lushi | Architecture & Interior Design',
    hero: { tag: 'h1', heading: ['אדריכלות יוקרה ועיצוב', 'בהתאמה אישית'], sub: 'תכנון מוקפד. עיצוב מדויק. ליווי מלא.', button: true,
      slides: [WA('10.34.52'), WA('10.34.54'), WA('10.34.54-1'), WA('10.35.03-1'), WA('10.35.06')] },
    intro: INTRO_FULL,
    about: { text: aboutText('בעברי'), image: WA('11.06.35') },
    gallery: GALLERY_ARCH,
  },
  {
    path: '/interior-design/', slug: 'interior-design', form: 'lp-interior-design', wpId: 321,
    title: 'הגר לושי | עיצוב פנים – Hagar Lushi | Architecture & Interior Design',
    hero: { tag: 'h2', heading: ['עיצוב פנים שמספר את הסיפור שלכם'], button: true,
      slides: [WA('10.34.54-1'), WA('10.35.06-1'), WA('10.35.07')] },
    intro: INTRO_FULL,
    about: { text: aboutText('בעברי'), image: WA('11.06.35') },
    gallery: [WA('10.35.04'), WA('10.35.06-1'), WA('10.35.06'), WA('10.35.07'), WA('10.35.00'), WA('10.34.59'), WA('10.34.58'), WA('10.34.57'), WA('10.34.52'), WA('10.34.53'), WA('10.34.54'), WA('10.34.55')],
  },
  {
    path: '/renovation/', slug: 'renovation', form: 'lp-renovation', wpId: 406,
    title: 'הגר לושי | אדרכלות – Hagar Lushi | Architecture & Interior Design',
    hero: { tag: 'h1', heading: ['שיפוץ מהיסוד בהתאמה אישית', 'מהחזון ועד גמר הפרוייקט'], sub: 'ליווי מלא בתכנון, עיצוב וניהול הפרויקט עד גמר.', button: true,
      slides: [WA('10.34.52'), WA('10.34.54'), WA('10.34.54-1'), WA('10.35.03-1'), WA('10.35.06')] },
    intro: INTRO_SHORT,
    about: { text: aboutText('בעברי'), image: WA('11.06.35') },
    gallery: GALLERY_ARCH,
  },
];

export const lpThankYou = {
  path: '/thankyou/', wpId: 244,
  title: 'תודה שיצרת קשר – Hagar Lushi | Architecture & Interior Design',
  heading: 'תודה שיצרת קשר',
  text: 'ההודעה שלך התקבלה ואצור איתך קשר בהקדם.',
  whatsappButton: 'בואו נדבר ב-WhatsApp',
};

// Legal pages: content comes from the WordPress export (src/data/lp/wp-pages.json), unchanged.
export const lpLegal = [
  { path: '/privacy/', wpId: 378, title: 'מדיניות פרטיות – Hagar Lushi | Architecture & Interior Design' },
  { path: '/accessibility-statement/', wpId: 9, title: 'הצהרת נגישות – Hagar Lushi | Architecture & Interior Design' },
];

// ---------------------------------------------------------------- media + exported WordPress content
const DATA = path.resolve('src/data/lp');
const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fallback; } };
export const lpMedia = readJson('media.json', {});
export const lpWpPages = readJson('wp-pages.json', []);

/**
 * Image for a WordPress upload path ("2025/02/x.jpg"). Uses the copied WebP files when available.
 * Before the media workflow has run, falls back to the WordPress URL (tests and check-launch flag that).
 */
export function lpImg(rel, display = 960) {
  const m = lpMedia[rel];
  if (m?.variants) {
    const widths = Object.keys(m.variants).map(Number).sort((a, b) => a - b);
    const pick = widths.find((w) => w >= display) || widths.at(-1);
    return { src: m.variants[pick], srcset: widths.map((w) => `${m.variants[w]} ${Math.min(w, m.width)}w`).join(', '), width: m.width, height: m.height, local: true };
  }
  if (m?.file) return { src: m.file, srcset: undefined, width: m.width, height: m.height, local: true };
  return { src: `${lpSite.origin}/wp-content/uploads/${rel}`, srcset: undefined, local: false };
}

/** Every upload path the recreated pages use (for tests / launch checks). */
export function lpUsedMedia() {
  const s = new Set(['2025/02/LOGO.png', '2025/02/LOGO-white-2.png', '2025/02/fav.png', '2025/02/double-quotes.svg', lpShared.testimonialsBackground]);
  for (const p of lpPages) { p.hero.slides.forEach((x) => s.add(x)); s.add(p.about.image); p.gallery.forEach((x) => s.add(x)); }
  return [...s];
}

/** The landing pages' WhatsApp chat link, with the prescribed opening message. */
export const lpWhatsAppUrl = () =>
  `https://api.whatsapp.com/send/?phone=${lpSite.whatsapp.number}&text=${encodeURIComponent(lpSite.whatsapp.message)}&type=phone_number&app_absent=0`;
