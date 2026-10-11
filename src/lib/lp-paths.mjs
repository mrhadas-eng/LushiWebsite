// Landing pages live at the root of lp.hagarlushi.com (dist-lp/), but under /lp/ during `npm run dev`
// and inside the combined Astro build. Links between landing pages go through lpHref().
export const LP_DEV_BASE = '/lp';

/** "/privacy/" -> "/privacy/" on lp.hagarlushi.com, "/lp/privacy/" in the dev server. */
export function lpHref(path) {
  return import.meta.env?.DEV ? `${LP_DEV_BASE}${path === '/' ? '' : path}` : path;
}
