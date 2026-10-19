(async () => {
  // Scroll the whole page so lazy content loads, then measure every visible text run, image, field and button.
  for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400)); await document.fonts.ready;
  const out = [], sy = scrollY, R = (v) => Math.round(v);
  const fam = (f) => f.split(',')[0].replace(/["']/g, '').trim();
  const vis = (e, r) => { if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01; };
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest('script,style,noscript,#WIX_ADS,[data-testid=wix-ads]')) continue;
    const r = e.getBoundingClientRect(); if (!vis(e, r)) continue;
    if (e.tagName.toLowerCase() === 'svg' && !e.parentElement.closest('svg')) { if (r.width < 60 && r.height < 60) out.push({ k: 'v', t: 'icon', b: [R(r.left), R(r.top + sy), R(r.width), R(r.height)] }); continue; }
    if (e.closest('svg') || (e.tagName !== 'IMG' && e.closest('[aria-hidden=true]'))) continue;
    const s = getComputedStyle(e), box = [R(r.left), R(r.top + sy), R(r.width), R(r.height)];
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (own && own.length > 0) {
      out.push({ k: 't', t: own.slice(0, 60), b: box, f: fam(s.fontFamily), fs: parseFloat(s.fontSize), fw: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, c: s.color, a: s.textAlign });
    } else if (e.tagName === 'IMG' || (s.backgroundImage.includes('url(') && e.tagName !== 'BODY')) {
      const src = e.tagName === 'IMG' ? (e.currentSrc || e.src) : s.backgroundImage;
      const id = (src.match(/3f6e24_[0-9a-f]{32}/) || src.match(/[0-9a-f]{6}_[0-9a-f]{32}/) || [src.slice(-40)])[0];
      out.push(r.width < 60 && r.height < 60 && !/3f6e24_/.test(id) ? { k: 'v', t: 'icon', b: box } : { k: 'i', t: id, b: box, fit: s.objectFit, pos: s.objectPosition });
    } else if (/^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(e.tagName) && e.type !== 'hidden') {
      out.push({ k: 'f', t: (e.getAttribute('placeholder') || e.getAttribute('aria-label') || e.name || e.textContent || '').trim().slice(0, 40), tag: e.tagName, b: box,
        bd: `${s.borderTopWidth} ${s.borderBottomWidth} ${s.borderBottomColor}`, bg: s.backgroundColor, fs: parseFloat(s.fontSize), f: fam(s.fontFamily), rad: s.borderRadius });
    }
  }
  // compact rows: [k, text, x, y, w, h, font, size, weight, lineHeight, letterSpacing, color, align | border, bg, radius]
  const hex = (c) => (c || '').replace(/rgba?\(([^)]+)\)/, (m, v) => v.split(',').slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('') + (v.split(',').length > 3 ? 'a' + (+v.split(',')[3]).toFixed(2) : ''));
  const ff = (f) => /^(wfont_349df3|wf_b29a)/.test(f) ? 'Lushi' : /^wfont_3c0642_e0cb/.test(f) ? 'WixFontE0CB' : /^wfont_3c0642_c647/.test(f) ? 'WixFontC647' : /^avenir/.test(f) ? 'Avenir' : /^brandon/.test(f) ? 'Brandon' : /^futura/.test(f) ? 'Futura' : /^opensanshebrewcondensed/.test(f) ? 'OpenSansHebrewCondensed' : f;
  const rows = out.map((o) => o.k === 't' ? ['t', o.t, ...o.b, ff(o.f), o.fs, o.fw, o.lh, o.ls, hex(o.c), o.a] : o.k === 'f' ? ['f', o.t, ...o.b, ff(o.f), o.fs, o.tag, o.bd.replace(/rgba?\([^)]+\)/, hex), hex(o.bg), o.rad] : [o.k, o.t, ...o.b]);
  return JSON.stringify({ url: decodeURI(location.pathname), vw: innerWidth, docH: document.documentElement.scrollHeight, rows });
})()
