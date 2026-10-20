// Content of the landing pages' legal pages, exported unchanged from WordPress (src/data/lp/wp-pages.json).
// Only executable / presentational markup is removed, and the contact email is replaced by the one the
// owner set (lpSite.legalEmail, 2026-10-12). The policy text itself is not edited (pending the owner's review).
import { lpWpPages, lpSite } from '../data/lp.mjs';

/** Addresses in the WordPress text that are replaced by lpSite.legalEmail (text and mailto: links). */
export const REPLACED_EMAILS = ['mr.hadas@gmail.com', 'hagarlushi@gmail.com'];

export function legalHtml(wpId) {
  const p = lpWpPages.find((x) => x.id === wpId);
  if (!p) return null;
  const old = REPLACED_EMAILS.map((e) => e.replace(/[.]/g, '\\.')).join('|');
  const link = `<a href="mailto:${lpSite.legalEmail}" dir="ltr">${lpSite.legalEmail}</a>`;
  return p.html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    // an existing email link → one link to the new address; then any address left in plain text
    .replace(new RegExp(`<a\\b[^>]*href="mailto:(?:${old})"[^>]*>[\\s\\S]*?<\\/a>`, 'gi'), link)
    .replace(new RegExp(old, 'gi'), link);
}
