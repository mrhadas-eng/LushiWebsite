# hagarlushi.com

Static version of the Hagar Lushi website (previously on Wix), built with [Astro](https://astro.build) and hosted on Firebase Hosting.

## Where things are

| What | Where |
|---|---|
| All text, projects, menu, contact details | `src/data/content.mjs` |
| Project photo galleries (order + sizes) | `src/data/galleries.raw.txt` |
| Images and font (after copying from Wix) | `public/media`, `public/fonts` |
| Page layouts | `src/pages`, `src/components` |
| Colors and fonts | `src/styles/global.css` |
| Hosting settings and old-URL redirects | `firebase.json` |

Every page keeps the exact address it had on Wix, including the Hebrew ones, so search rankings carry over.

## Run it on your computer

Requires Node.js (LTS).

```bash
npm install
npm run dev        # open http://localhost:4321
```

## Copy the images off Wix (once)

Images still load from Wix until they are copied into the repository. Either:

- **On GitHub:** Actions tab → "Copy images from Wix" → Run workflow, or
- **On your computer:** `npm run fetch-media`, then commit `public/media` and `public/fonts`.

## Contact form

Create a free access key at <https://web3forms.com> using hagarlushi@gmail.com and paste it into `web3formsKey` in `src/data/content.mjs`. Until then the form opens the visitor's email app.

## Deploy

```bash
npm run build
firebase deploy --only hosting
```
