// Content of the landing pages' legal pages, exported unchanged from WordPress (src/data/lp/wp-pages.json).
// Only executable / presentational markup is removed; the text is not edited (legal review is pending).
import { lpWpPages } from '../data/lp.mjs';
export function legalHtml(wpId) {
  const p = lpWpPages.find((x) => x.id === wpId);
  if (!p) return null;
  return p.html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '');
}
