# Visual parity tools

Used for `docs/VISUAL-PARITY-AUDIT.md`. Not part of the build or `npm test`.

| File | What it does |
|---|---|
| `extract.js` | Runs in a page (paste into the browser console, or Playwright `page.evaluate`). Scrolls the page, then records every visible text run, image, form field and small icon: position, size, font, size, weight, line height, letter spacing, colour, alignment. Returns compact JSON. |
| `local-extract.mjs` | Runs `extract.js` on the local previews with Playwright and saves the JSON and a full-page screenshot: `node local-extract.mjs <outdir> 1440x900,390x844 /,/אודות,lp:/architecture/` (`lp:` paths go to the landing-page preview on 8788). Set `CHROMIUM` to a Chromium binary if Playwright has none. |
| `fonts.mjs` | Serves the Google Fonts families from local `@fontsource` copies (for machines where fonts.googleapis.com is blocked), so screenshots use the same fonts visitors get. `FONTSOURCE_DIR` = folder that contains the `@fontsource` packages. |
| `compare.py` | `python3 compare.py reference.json local.json [tolerance_px]`: matches items by text or Wix media id and lists position, size and typography differences. |
| `footer-position.mjs` | Prints where the footer starts (= the page height) on each page, as a tab-separated list: run it in the browser on Wix and on the previews and compare (`docs/visual-parity/footer-positions.tsv`). |
| `scale.py` | Wix mobile pages are a 320px design scaled to the phone: `python3 scale.py raw.json out.json 390` scales a Wix mobile extraction to a 390px phone before comparing. |

The reference measurements (Wix at 1440px, Wix mobile at 320px, WordPress) and side-by-side screenshots are in
`docs/visual-parity/`. Start both previews first (`npm run preview:cf`, `npm run preview:cf:lp`).
