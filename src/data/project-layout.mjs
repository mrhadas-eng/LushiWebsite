// Project pages as laid out on Wix (desktop, measured at 1440px on the 980px page; see docs/VISUAL-PARITY-AUDIT.md).
// Each project page on Wix was edited separately, so the title position, text column and body style differ
// per page. The text itself comes from content.mjs (verified identical to Wix); this file only holds layout.
//   titleTop  y of the 60px title (the header ends at 249)
//   col       text column: a = x 412-988 (576 wide), b = x 441-986, c = x 443-988 (545 wide)
//   justify   body paragraphs justified (otherwise right-aligned)
//   small     body paragraphs 15/21px instead of 18/25.2px
//   bold      words shown bold inside the body; boldLabels: the text up to the first ':' of each paragraph
//   subtitle  the first body paragraph is a 28/39.2px subtitle in Times New Roman (no intro, no blank line)
//   line      height of the 1px vertical rule (#282626) 9px right of the title, from 26px below the title top
//   brandon   body set in Brandon Grotesque on Wix: it has no Hebrew letters, so Hebrew shows in the browser's sans-serif
const A = 'a', B = 'b', C = 'c';
export const projectLayout = {
  'להיות-יפה-שירלי': { titleTop: 330, col: A, justify: true, line: 72 },
  'אור-לעתיד': { titleTop: 329, col: A, justify: true, line: 101 },
  'מיברג': { titleTop: 330, col: A, justify: true, line: 101 },
  'סטון-גלרי': { titleTop: 329, col: A, justify: true, line: 101 },
  'יוניקורן': { titleTop: 256, col: B, small: true, brandon: true, line: 134 },
  'copy-of-יוניקורן-1': { titleTop: 256, col: B, bold: ['בארמון'], line: 134 },
  'געתון': { titleTop: 256, col: B, subtitle: true, boldLabels: true, brandon: true, line: 134 },
  'copy-of-יוניקורן': { titleTop: 256, col: B, small: true, brandon: true, line: 134 },
  'מסודרים-ליד-ביבי': { titleTop: 329, col: B, line: 134 },
  'מנהל-הפרויקט': { titleTop: 329, col: B, line: 102 },
  'אבק-כוכבים': { titleTop: 329, col: C, line: 102 },
  'דירה-להשכיר': { titleTop: 329, col: C, justify: true, line: 78 },
  'האקדמיים': { titleTop: 329, col: C, justify: true, line: 102 },
  'יפה-להשכרה': { titleTop: 329, col: C, justify: true, line: 77 },
  'עיצוב-מחדש': { titleTop: 329, col: C, justify: true, line: 72 },
  'צאו-לחופשה': { titleTop: 330, col: A, justify: true, line: 101 },
  'פסיכולוגית-אלגנטית': { titleTop: 329, col: A, justify: true, line: 101 },
  // A different Wix layout: centred 28px title (Times New Roman) and 16px text (Brandon), credit on the right, then a
  // full-width collage.
  'הבן-של-הנגר': { titleTop: 276, collage: true },
};

// The collage on /הבן-של-הנגר (Wix "collage" gallery): [id, x, y, width, height] relative to the top left of the
// 980px page at the gallery's top (y 572 on Wix); total height 14420px. Rendered in percentages so it scales.
// Wix shows only the top 8961px of the collage on desktop (the gallery box is cut there, the footer follows).
export const collage = {
  width: 980,
  height: 14420,
  visibleHeight: 8961,
  items: [
    ['aa09a5_fb3e6119c0474e579f7d385eeaebc4da', 0, 0, 980, 654],
    ['aa09a5_f42378bb685042b9bdd800bcd1df9ff7', 0, 677, 980, 654],
    ['aa09a5_ea11ad3faefa42908f3f9b2357075ace', 0, 1354, 980, 654],
    ['aa09a5_4e25ca12d1ab4c278d8975aae3a47ec6', 0, 2031, 980, 654],
    ['aa09a5_e61857cccfc740f5975a9128dc6e4208', 0, 2708, 498, 333],
    ['aa09a5_ddd305026fa74850bfe2bffabf7d5b8d', 521, 2708, 459, 688],
    ['aa09a5_3373819a945e49c1b8cf077e86abff36', 0, 3064, 498, 332],
    ['aa09a5_98097b9091114660ad1f8f4d6f0ce7b8', 0, 3419, 403, 404],
    ['aa09a5_d66a6ed97c3a43d4844e2ae1769126ed', 426, 3419, 554, 830],
    ['aa09a5_940509baa79b4d9fb91f63c055867aea', 0, 3846, 403, 403],
    ['aa09a5_d0e5a306d9914d2081155ab9a3f61e85', 0, 4272, 662, 442],
    ['aa09a5_d0b2076b935b44d892de10647d4b6a23', 685, 4272, 295, 442],
    ['aa09a5_bcc6c9cdda52476bb1b25f6586010457', 0, 4737, 643, 963],
    ['aa09a5_a3662f15d94140c9aa5fe42516524b9c', 666, 4737, 314, 470],
    ['aa09a5_dd7968498bd04adfbc8e2cb078732412', 666, 5230, 314, 470],
    ['aa09a5_b23263e0ac5d4c498a202b3d025681ba', 0, 5723, 385, 257],
    ['aa09a5_23133ab31cfe468daf139ed065b691c6', 408, 5723, 572, 857],
    ['aa09a5_f3a06739af7f4cca80ea7e3921ee4049', 0, 6003, 385, 577],
    ['aa09a5_5674f2ef92a344d6830c8644ea51fd3b', 0, 6603, 479, 319],
    ['aa09a5_4818f678651b425f8912ec71951a3dc5', 502, 6603, 478, 319],
    ['aa09a5_2481bdcab85f42b0bcced8ab43420951', 0, 6945, 980, 654],
    ['aa09a5_593c2cecb856492ea66f93bd71148b0b', 0, 7622, 498, 333],
    ['aa09a5_27a0f40fbc5a40f9a08777a3e343d92b', 521, 7622, 459, 688],
    ['aa09a5_309c2b79126d41bd8d0e48a7426aaf7a', 0, 7978, 498, 332],
    ['aa09a5_16e783b0c1214af3b940b87890dd807f', 0, 8333, 488, 313],
    ['aa09a5_9a06f414155b4fc0a3e5bb4bd799394d', 511, 8333, 469, 313],
    ['aa09a5_8bf9c504e7614aa39a13be7b04a39fa7', 0, 8669, 980, 654],
    ['aa09a5_8a6160bd45874ef9a99020e95bee0f49', 0, 9346, 459, 688],
    ['aa09a5_8a39a8faa22a4338bfa19d05ee8ea685', 482, 9346, 498, 333],
    ['aa09a5_7d17eea741444aac866a85b58ecb741f', 482, 9702, 498, 332],
    ['aa09a5_6d5d4501dd42426ca26f9e1e54dca663', 0, 10057, 662, 442],
    ['aa09a5_5f8bb5957f5c4aab93f964a714b468b7', 685, 10057, 295, 442],
    ['aa09a5_4bb626a27c60433c91d894d87cf6a3d2', 0, 10522, 385, 257],
    ['aa09a5_2ec620b98c4e4e2397cfc1b5816d99df', 408, 10522, 572, 857],
    ['aa09a5_2ef45c2033b14c37aee8aba02cce7d6c', 0, 10802, 385, 577],
    ['aa09a5_1b233529d1eb49d093f36c2a851f0c7a', 0, 11402, 980, 654],
    ['aa09a5_c4d67da260c84174922cba585539cc1c', 0, 12079, 980, 654],
    ['aa09a5_0b47f8a77f6a40c3bcf0e2b5124c927e', 0, 12756, 479, 319],
    ['aa09a5_07832a88d07644ecbc4e612668594605', 502, 12756, 478, 319],
    ['aa09a5_3432d315fb01420bbdf8df1fe1266b4c', 0, 13098, 980, 980],
    ['aa09a5_7a3c4d33cf9e44b1827cb7be9d71db7e', 0, 14101, 479, 319],
    ['aa09a5_e3ed02638cba4320baa6e1f508f94397', 502, 14101, 478, 319],
  ],
};

// The same collage on Wix mobile (320px design): one 280px column from x 20, 19px apart, some photos in pairs
// (130 + 19 + 131px). [id, x, y, width, height] relative to the top left of the column.
export const collageMobile = {
  width: 280,
  height: 9496,
  items: [
    ["aa09a5_fb3e6119c0474e579f7d385eeaebc4da", 0, 0, 280, 187],
    ["aa09a5_f42378bb685042b9bdd800bcd1df9ff7", 0, 206, 280, 187],
    ["aa09a5_ea11ad3faefa42908f3f9b2357075ace", 0, 412, 280, 187],
    ["aa09a5_4e25ca12d1ab4c278d8975aae3a47ec6", 0, 618, 280, 187],
    ["aa09a5_e61857cccfc740f5975a9128dc6e4208", 0, 824, 280, 187],
    ["aa09a5_3373819a945e49c1b8cf077e86abff36", 0, 1030, 280, 187],
    ["aa09a5_ddd305026fa74850bfe2bffabf7d5b8d", 0, 1236, 280, 420],
    ["aa09a5_98097b9091114660ad1f8f4d6f0ce7b8", 0, 1675, 130, 131],
    ["aa09a5_940509baa79b4d9fb91f63c055867aea", 149, 1675, 131, 131],
    ["aa09a5_d66a6ed97c3a43d4844e2ae1769126ed", 0, 1825, 280, 420],
    ["aa09a5_d0e5a306d9914d2081155ab9a3f61e85", 0, 2264, 280, 187],
    ["aa09a5_d0b2076b935b44d892de10647d4b6a23", 0, 2470, 280, 420],
    ["aa09a5_bcc6c9cdda52476bb1b25f6586010457", 0, 2909, 280, 420],
    ["aa09a5_a3662f15d94140c9aa5fe42516524b9c", 0, 3348, 130, 196],
    ["aa09a5_dd7968498bd04adfbc8e2cb078732412", 149, 3348, 131, 196],
    ["aa09a5_b23263e0ac5d4c498a202b3d025681ba", 0, 3563, 280, 187],
    ["aa09a5_f3a06739af7f4cca80ea7e3921ee4049", 0, 3769, 130, 196],
    ["aa09a5_23133ab31cfe468daf139ed065b691c6", 149, 3769, 131, 196],
    ["aa09a5_5674f2ef92a344d6830c8644ea51fd3b", 0, 3984, 280, 187],
    ["aa09a5_4818f678651b425f8912ec71951a3dc5", 0, 4190, 280, 187],
    ["aa09a5_2481bdcab85f42b0bcced8ab43420951", 0, 4396, 280, 187],
    ["aa09a5_593c2cecb856492ea66f93bd71148b0b", 0, 4602, 280, 187],
    ["aa09a5_309c2b79126d41bd8d0e48a7426aaf7a", 0, 4808, 280, 187],
    ["aa09a5_27a0f40fbc5a40f9a08777a3e343d92b", 0, 5014, 280, 420],
    ["aa09a5_16e783b0c1214af3b940b87890dd807f", 0, 5453, 280, 179],
    ["aa09a5_9a06f414155b4fc0a3e5bb4bd799394d", 0, 5651, 280, 187],
    ["aa09a5_8bf9c504e7614aa39a13be7b04a39fa7", 0, 5857, 280, 187],
    ["aa09a5_8a6160bd45874ef9a99020e95bee0f49", 0, 6063, 280, 420],
    ["aa09a5_8a39a8faa22a4338bfa19d05ee8ea685", 0, 6502, 280, 187],
    ["aa09a5_7d17eea741444aac866a85b58ecb741f", 0, 6708, 280, 187],
    ["aa09a5_6d5d4501dd42426ca26f9e1e54dca663", 0, 6914, 280, 187],
    ["aa09a5_5f8bb5957f5c4aab93f964a714b468b7", 0, 7120, 280, 420],
    ["aa09a5_4bb626a27c60433c91d894d87cf6a3d2", 0, 7559, 280, 187],
    ["aa09a5_2ef45c2033b14c37aee8aba02cce7d6c", 0, 7765, 130, 196],
    ["aa09a5_2ec620b98c4e4e2397cfc1b5816d99df", 149, 7765, 131, 196],
    ["aa09a5_1b233529d1eb49d093f36c2a851f0c7a", 0, 7980, 280, 187],
    ["aa09a5_c4d67da260c84174922cba585539cc1c", 0, 8186, 280, 187],
    ["aa09a5_0b47f8a77f6a40c3bcf0e2b5124c927e", 0, 8392, 280, 187],
    ["aa09a5_07832a88d07644ecbc4e612668594605", 0, 8598, 280, 187],
    ["aa09a5_3432d315fb01420bbdf8df1fe1266b4c", 0, 8804, 280, 280],
    ["aa09a5_7a3c4d33cf9e44b1827cb7be9d71db7e", 0, 9103, 280, 187],
    ["aa09a5_e3ed02638cba4320baa6e1f508f94397", 0, 9309, 280, 187],
  ],
};
