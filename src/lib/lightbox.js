// Minimal accessible lightbox: arrows, keyboard, swipe, Escape to close.
let box, imgEl, counter, items = [], index = 0, lastFocus;

function build() {
  box = document.createElement('div');
  box.className = 'lb';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'תצוגת תמונה');
  box.innerHTML = `
    <button class="lb-close" aria-label="סגירה">&times;</button>
    <button class="lb-prev" aria-label="הקודמת"><svg viewBox="0 0 17 35" width="17" height="35"><path d="M1 1l15 16.5L1 34" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>
    <figure class="lb-fig"><img alt="" /></figure>
    <button class="lb-next" aria-label="הבאה"><svg viewBox="0 0 17 35" width="17" height="35"><path d="M16 1L1 17.5 16 34" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></button>
    <p class="lb-count" aria-live="polite"></p>`;
  const css = document.createElement('style');
  css.textContent = `
    .lb{position:fixed;inset:0;z-index:1000;background:rgba(255,255,255,.97);display:none;align-items:center;justify-content:center}
    .lb.open{display:flex}
    .lb-fig{margin:0;max-width:calc(100vw - 140px);max-height:calc(100vh - 90px);display:flex}
    .lb-fig img{max-width:100%;max-height:calc(100vh - 90px);object-fit:contain}
    .lb button{position:absolute;background:none;border:0;color:#414141;cursor:pointer;padding:12px}
    .lb-close{top:10px;left:14px;font-size:38px;line-height:1}
    .lb-prev{right:18px;top:50%;transform:translateY(-50%)}
    .lb-next{left:18px;top:50%;transform:translateY(-50%)}
    .lb-count{position:absolute;bottom:14px;inset-inline:0;text-align:center;font-size:14px;color:#636363;margin:0;direction:ltr}
    @media (max-width:760px){.lb-fig{max-width:100vw}.lb-prev,.lb-next{display:none}}`;
  document.head.append(css);
  document.body.append(box);
  imgEl = box.querySelector('img');
  counter = box.querySelector('.lb-count');
  box.querySelector('.lb-close').onclick = close;
  box.querySelector('.lb-prev').onclick = () => show(index - 1);
  box.querySelector('.lb-next').onclick = () => show(index + 1);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index + 1);
    if (e.key === 'ArrowRight') show(index - 1);
  });
  let x0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) show(dx > 0 ? index + 1 : index - 1);
    x0 = null;
  });
}

function show(n) {
  index = (n + items.length) % items.length;
  imgEl.src = items[index].href;
  counter.textContent = `${index + 1} / ${items.length}`;
  // preload neighbours
  [index + 1, index - 1].forEach((k) => { const i = new Image(); i.src = items[(k + items.length) % items.length].href; });
}

function close() {
  box.classList.remove('open');
  document.documentElement.style.overflow = '';
  lastFocus?.focus();
}

export function initLightbox(root) {
  const links = [...root.querySelectorAll('a')];
  links.forEach((a, n) => a.addEventListener('click', (e) => {
    e.preventDefault();
    if (!box) build();
    items = links;
    lastFocus = a;
    box.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    show(n);
    box.querySelector('.lb-close').focus();
  }));
}
