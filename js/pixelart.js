// Hand-drawn pixel art, rendered as SVG rects.
//
// Sprites are character grids: '.' is transparent, 'c' takes the card's suit
// colour (so a King of Hearts wears a red robe and a King of Clubs a green
// one), and the rest map to the fixed palette below. Rows are merged into
// horizontal runs before emitting rects, which keeps the DOM small.

const PALETTE = {
  o: { fill: '#191320' },                    // ink outline
  s: { fill: '#f5cb9c' },                    // skin
  h: { fill: '#7a4428' },                    // hair / beard
  g: { fill: '#ffcf3f' },                    // gold
  G: { fill: '#d99613' },                    // gold, shaded
  w: { fill: '#fffaf0' },                    // white
  r: { fill: '#b8123c' },                    // card-back crimson
  R: { fill: '#8e0b2c' },                    // card-back crimson, shaded
  d: { fill: '#e0a02a' },                    // card-back lattice
  c: { fill: 'currentColor' },               // suit colour
  C: { fill: 'currentColor', opacity: 0.55 },// suit colour, shaded
};

export const COURT_SPRITES = {
  J: [
    '....cccccgG..',
    '...cccccccgg.',
    '..oooooooooG.',
    '...ossssso...',
    '...osososo...',
    '...ossssso...',
    '...oshhhso...',
    '....sssss....',
    '..wwwwwwwww..',
    '.wwwwwwwwwww.',
    '.ccccccccccc.',
    'ccccccccccccc',
    'ccccgcccgcccc',
    'ccccccccccccc',
    'ccCcccccccCcc',
    '.ccccccccccc.',
    '..ccccccccc..',
  ],
  Q: [
    '....g.g.g....',
    '...ggggggg...',
    '..hhhhhhhhh..',
    '..hosssssoh..',
    '..hosssssoh..',
    '..hosososoh..',
    '..hosshssoh..',
    '..hosssssoh..',
    '..h.sssss.h..',
    '..h..sss..h..',
    '.cccwcccwccc.',
    'chccccccccchc',
    'cccccgggccccc',
    'ccccccccccccc',
    'ccCcccccccCcc',
    '.ccccccccccc.',
    '..ccccccccc..',
  ],
  K: [
    '..g...g...g..',
    '..ggggggggg..',
    '..GGwGwGwGG..',
    '...ooooooo...',
    '...ossssso...',
    '...osososo...',
    '...ossssso...',
    '...oshhhso...',
    '....hhhhh....',
    '....hhhhh....',
    '.....hhh.....',
    '.cccwcccwccc.',
    'ccccccccccccc',
    'cccccgggccccc',
    'ccCcccccccCcc',
    '.ccccccccccc.',
    '..ccccccccc..',
  ]
};

export const CARD_BACK = [
  'ggggggggggggg',
  'gRrRrRrRrRrRg',
  'grdrRrdrRrdrg',
  'gRrdrdrdrdrRg',
  'grRrdrRrdrRrg',
  'gRrdrdrdrdrRg',
  'grdrRrdrRrdrg',
  'gRrdrdGdrdrRg',
  'grRrdGgGdrRrg',
  'gRrdGgggGdrRg',
  'grdrRGgGRrdrg',
  'gRrdrdGdrdrRg',
  'grRrdrRrdrRrg',
  'gRrdrdrdrdrRg',
  'grdrRrdrRrdrg',
  'gRrdrdrdrdrRg',
  'grRrRrRrRrRrg',
  'ggggggggggggg',
];

/** Convert a character grid into SVG, merging horizontal runs into one rect. */
export function spriteSVG(grid, className = '') {
  const h = grid.length;
  const w = grid[0].length;
  const parts = [];

  for (let y = 0; y < h; y++) {
    const rowStr = grid[y];
    let x = 0;
    while (x < w) {
      const ch = rowStr[x];
      if (ch === '.') { x++; continue; }
      let run = 1;
      while (x + run < w && rowStr[x + run] === ch) run++;
      const p = PALETTE[ch];
      if (p) {
        const op = p.opacity != null ? ` fill-opacity="${p.opacity}"` : '';
        parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${p.fill}"${op}/>`);
      }
      x += run;
    }
  }

  // The xmlns is required: without it the markup renders inline but fails to
  // load when used as a data-URI background image.
  return `<svg xmlns="http://www.w3.org/2000/svg" class="pixel-art ${className}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}

export function courtSVG(rank, className = '') {
  const key = { 11: 'J', 12: 'Q', 13: 'K' }[rank];
  return key ? spriteSVG(COURT_SPRITES[key], className) : '';
}

export function cardBackSVG(className = '') {
  return spriteSVG(CARD_BACK, className);
}
