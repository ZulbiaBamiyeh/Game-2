// Hand-drawn pixel art, rendered to SVG and cached as data-URI images.
//
// Sprites are 40x56 character grids. Most characters map to the fixed palette
// below; 'c', 'C' and 'L' are the card's suit colour at base, shadow and
// highlight, so one sprite serves all four suits. Rows are merged into
// horizontal runs, and each finished sprite is rasterised once and reused as a
// background image — the DOM never carries the rects.

const BASE_PALETTE = {
  o: '#14101c', // outline
  k: '#2a2036', // deep shadow
  s: '#f2c393', // skin
  S: '#cf9a68', // skin shadow
  H: '#ffe0bb', // skin highlight
  h: '#7a4a22', // hair
  j: '#4e2d12', // hair shadow
  J: '#a8703f', // hair highlight
  g: '#ffc93f', // gold
  G: '#c98b14', // gold shadow
  Y: '#ffe58a', // gold highlight
  w: '#fffaf0', // white
  v: '#cfc7dc', // grey
  r: '#e0143c', // ruby
  b: '#2f7fe0', // sapphire
  n: '#17a05c', // emerald
  f: '#f0ead8', // fur
  F: '#cfc4a8', // fur shadow
  R: '#8e0b2c', // card-back crimson shadow
  d: '#e0a02a', // card-back lattice
};

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

function parseHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => '#' + rgb.map((v) => clamp(v).toString(16).padStart(2, '0')).join('');

/** Suit colour shaded darker (factor < 1) or lifted toward white (> 1). */
function shade(hex, factor) {
  const [r, g, b] = parseHex(hex);
  if (factor <= 1) return toHex([r * factor, g * factor, b * factor]);
  const t = factor - 1;
  return toHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]);
}

export const COURT_SPRITES = {
  J: [
    '.................................oovo...',
    '................................ovovo...',
    '...............................ovvvvo...',
    '..............................ovvvvvvo..',
    '.............................ovvvvvvo...',
    '.............................ovvvvvvo...',
    '....................o........ovvvvvvo...',
    '..............ooooooLoooooo..ovvvvvo....',
    '...........oooLLLLLLLLLLLccoovvvvvvo....',
    '..........ocLLLLLLLLLLLLLccccCvvvvo.....',
    '.........oLLLLLLLLLLLLLLLcccccvvvo......',
    '........ocLLLLLLLLLLLLLLLcccccvvvo......',
    '.......ocLLLLLLLLLLLLLLLLcccccvvvo......',
    '.......occLLLLLLLLLLLLLLLccccccvCo......',
    '......occcLLLLLLLLLLLLLLLccccccCCCo.....',
    '.......occccLLLLLLLLLLLLLccccCCCCo......',
    '.......occccccLLLLLLLLLLLccCCCCCCo......',
    '......oggggggggggggggggggGGGGGGGGGo.....',
    '......oggggggggggggggggggGGGGGGGGGo.....',
    '......oGGGGGGGGGGGGGGGGGGGGGGGGGGGo.....',
    '......oGGGGGGGGGGGGGGGGGGGGGGGGGGGo.....',
    '.......oooJJJjjjjjHHcHHjjjjjhhhooo......',
    '.........oJJJjjjjjHHHHHjjjjjhhho........',
    '........oJJJsHHHHHHHHHHHHsssShhho.......',
    '........oJJJsssowosssssowoSSShhho.......',
    '........oJJJsssooosssssoooSSShhho.......',
    '........oJJJsssooosssssoooSSShhho.......',
    '.......oJJJssssssssssssssSSSSShhho......',
    '......oJJhJJsssssssSSSsssSSSShhhhho.....',
    '......oJhhhJsssssssssssssSSSShhhhho.....',
    '.....oJhhhJhsssskssssssskSSSShhhhhho....',
    '......oJhhhJssssskkkkkkksSSSShhhhho.....',
    '......oJJhJJJssssssssssssSSShhhhhho.....',
    '.......ooJJJJssssssssssssSSShhhhoo......',
    '.........ooJJJsssssssssssSShhhoo........',
    '...........oJJJssssssssssShhho..........',
    '........ooowwJJJJsssssssJhhhvvooo.......',
    '.......owwwwwwJJJJJJsJJJJhhvvvvvvo......',
    '......owwwwwvvvvJJJJJJJJJvvvvvvvvvo.....',
    '.....owwwwvvvvvvvvvvJvvvvvvvvvvvvvvo....',
    '....owwwwvvvvvvvvvvvvvvvvvvvvvvvvvvvo...',
    '...ooowwwwvvvvvvvvvvvvvvvvvvvvvvvvvoo...',
    '..occccwwwwwvvvvvvvvvvvvvvvvvvvvvvCCCo..',
    '..occcccwwwwwwwwwwwwvwwwwvvvvvvvvCCCCo..',
    '..occccccccwwwwwwwwwwwwwwvvvvvCCCCCCCCo.',
    '..occccccccccccLLLLLwLLLLcCCCCCCCCCCCCo.',
    '.occcccccccccccLLLLgggLLLcCCCCCCCCCCCCCo',
    '..occccccccccccLLLLLgLLLLcCCCCCCCCCCCCo.',
    '..occccccccccccLLLLLLLLLLcCCCCCCCCCCCCo.',
    '..occccccccccccLLLLLgLLLLcCCCCCCCCCCCo..',
    '..occccccccccccLLLLgggLLLcCCCCCCCCCCCo..',
    '..occccccccccccLLLLLgLLLLcCCCCCCCCCCCo..',
    '..occccccccccccLLLLLLLLLLcCCCCCCCCCCCo..',
    '..occccccccccccLLLLLgLLLLcCCCCCCCCCCCo..',
    '..occccccccccccLLLLgggLLLcCCCCCCCCCCCo..',
    '..occccccccccccLLLLLgLLLLcCCCCCCCCCCCo..',
  ],
  Q: [
    '........................................',
    '........................................',
    '....................o...................',
    '...................oro..................',
    '...................ogo..................',
    '..............o...ogggo...o.............',
    '.............ono..ogggo..obo............',
    '.............ogo..ogggo..oGo............',
    '............ogggoogggggooGGGo...........',
    '............ogggoogggggooGGGo...........',
    '...........oogggoogggggooGGGo...........',
    '..........ogggggggggrggggGGGGo..........',
    '..........oggggggggrrrgggGGGGo..........',
    '..........ogggggggggrggggGGGGo..........',
    '..........oGGGGGGGGGGGGGGGGGGjo.........',
    '..........oGGGGGGGGGGGGGGGGGGjo.........',
    '.........ohhhhhhhhhhhhhhhjjjjjjo........',
    '.........ohhhhhhhhhhhhhhhjjjjjjo........',
    '........ohhhhhhhhhhhhhhhhjjjjjjjo.......',
    '.........ohhjjjjjhhhhhhhjjjjjjjo........',
    '.........ohhjjjjjHHHHHHHjjjjjjjo........',
    '........ohhhsHHHHHHHHHHHHsssSjjjo.......',
    '.......ohhhhsHHowoHHHHHowossSjjjjo......',
    '.......ohhhhsssooosssssoooSSSjjjjo......',
    '.......ohhhhsssooosssssoooSSSjjjjo......',
    '......ohhhhhsssssssssssssSSSSjjjjjo.....',
    '......ohhhhssssssssSSSsssSSSSSjjjjo.....',
    '.....ohhhhhhsssssssssssssSSSSjjjjjjo....',
    '.....ohhhhhhssssssssSssssSSSSjjjjjjo....',
    '.....ohhhhhhsssssssssssssSSSSjjjjjjo....',
    '.....ohhhhhhssssssrrrrrssSSSSjjjjjjo....',
    '.....ohhhhhhssssssrrrrrssSSSSjjjjjjo....',
    '.....ohhhhhhhssssssssssssSSSjjjjjjjo....',
    '.....ohhhhhhhhsssssssssssSSjjjjjjjjo....',
    '....ohhhhhhhhhsssssssssssSSjjjjjjjjjo...',
    '....ohhhhhhhhhhssssssssssSjjjjjjjjjo....',
    '....ohhhhhhhhhhhhssssssshjjjjjjjjjjo....',
    '....ohhhhhhhhhhhhhhhshhhhjjjjjjjjjjo....',
    '....ohhhhhhhhhhhhhhhhhhhhjjjjjjjjjjo....',
    '....ohhhhhhhghhhghhhghhhgjjjGjjjjjjo....',
    '....ohhhcccgggcgggcgggcggGCGGGCCCjjo....',
    '..ooohccccccgcccgcccgcccgCCCGCCCCCCooo..',
    '.occccLLLLLLLLLLLLLLLLLLLcccccccccCCCCo.',
    '.occccLLLLLLLLLLLLLLLLLLLcccccccccCCCCo.',
    '.occccLLLLLLLLLLLLLLLLLLLcccccccccCCCCCo',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCCo',
    'occccccccccccccccccccccccCCCCCCCCCCCCCCC',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCCo',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCCo',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCo.',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCo.',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCo.',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCo.',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCo.',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCo.',
    '.occcccccccccccccccccccccCCCCCCCCCCCCCo.',
  ],
  K: [
    '...................obo..................',
    '..........o........ogo........o.........',
    '.........oro......ogggo......ono........',
    '.........ogo......ogggo......oGo........',
    '........ogggo.....ogggo.....oGGGo.......',
    '........ogggo....ogggggo....oGGGo.......',
    '........ogggo....ogggggo....oGGGo.......',
    '.......ogggggo..ogggggggo..oGGGGGo......',
    '.......ogggggo..ogggggggo..oGGGGGo......',
    '.......ogggggoooogggggggooooGGGGGo......',
    '......oggggggggggggggggggGGGGGGGGGo.....',
    '......ogggggggrgggggbggggGnGGGGGGGo.....',
    '.......ogggggrrrgggbbbgggnnnGGGGoo......',
    '.......oggggggrgggggbggggGnGGGGGo.......',
    '.......oGGGGGGGGGGGGGGGGGGGGGGGGo.......',
    '.......oGGGGGGGGGGGGGGGGGGGGGGGGo.......',
    '........oooojjjjjHHHHHHHjjjjjooo........',
    '...........ojjjjjHHHHHHHjjjjjo..........',
    '..........ojjHHHHHHHHHHHHsssjjo.........',
    '.........ojjsHHowoHHHHHowossSjjo........',
    '.........ojjsHHoooHHHHHooossSjjo........',
    '........ojjjsssooosssssoooSSSjjjo.......',
    '........ojjjsssssssssssssSSSSjjjo.......',
    '........ojjjsssssssSSSsssSSSSjjjo.......',
    '........ojjssssssssSSSsssSSSSSjjo.......',
    '........ojjjssssssssSssssSSSSjjjo.......',
    '.......ojjjjsssssssssssssSSSSjjjjo......',
    '........ojjjsssssssssssssSSSSjjjo.......',
    '........ojjjshhhhhhhhhhhhjjjSjjjo.......',
    '........ojjjshhhhhhhhhhhhjjjSjjjo.......',
    '........ojjjhhhJJJJJJJJJJJjjjjjjo.......',
    '........ojjjhhJJJJJkkkJJJJJjjjjjo.......',
    '.........ojhhhJJJJJkkkJJJJJjjjjo........',
    '.........ojhhhJJJJJkkkJJJJJjjjjo........',
    '..........ohhJJJJJJJJJJJJJJJjjo.........',
    '..........ohhhJJJJJJJJJJJJJjjjo.........',
    '.........ohhhhJJJJJJJJJJJJJjjjjo........',
    '..........ohhhhhhhhhhhhhhjjjjjo.........',
    '.......oooohhhhhhhhhhhhhhjjjjjoooo......',
    '..ooooocccchhhhhhhhhhhhhhjjjjjCCCCoooo..',
    '.occfffffffhhhhhhhhhhhhhhjjjjjFFFFFFCCo.',
    '.occfFfffFffhhhhhhhhhhhhhjjjjFFFFFFFCCo.',
    '.occffFfffFfhhhhhhhhhhhhhjjjjFFFFFFFCCCo',
    'ooccfffffffffhhhhhhhhhhhhjjjFFFFFFFFCCCo',
    'cccccccccccccchhhhhhhhhhhjjCCCCCCCCCCCCC',
    'cccccccccccccccchhhhhhhhhCCCCCCCCCCCCCCC',
    'cccccccccccccccccccchccccCCCCCCCCCCCCCCC',
    'ccccccccccccccccccgggggccCCCCCCCCCCCCCCC',
    'cccccccccccccccccgggrgggcCCCCCCCCCCCCCCC',
    'cccccccccccccccccggrrrggcCCCCCCCCCCCCCCC',
    'ccccccccccccccccggrrrrrggCCCCCCCCCCCCCCC',
    'cccccccccccccccccggrrrggcCCCCCCCCCCCCCCC',
    'cccccccccccccccccgggrgggcCCCCCCCCCCCCCCC',
    'ccccccccccccccccccgggggccCCCCCCCCCCCCCCC',
    'ccccccccccccccccccccgccccCCCCCCCCCCCCCCC',
    'cccccccccccccccccccccccccCCCCCCCCCCCCCCC',
  ],
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

/** Character grid to SVG, merging horizontal runs of one colour into a rect. */
function spriteSVG(grid, suitColor) {
  const palette = Object.assign({}, BASE_PALETTE);
  if (suitColor) {
    palette.c = suitColor;
    palette.C = shade(suitColor, 0.62);
    palette.L = shade(suitColor, 1.38);
  }

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
      const fill = palette[ch];
      if (fill) parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`);
      x += run;
    }
  }

  // The xmlns is required: without it the markup renders inline but fails to
  // load when used as a data-URI background image.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${parts.join('')}</svg>`;
}

const toURI = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const courtCache = new Map();

/** CSS url() for a court figure, rasterised once per rank+suit pairing. */
export function courtImage(rank, suitColor) {
  const key = { 11: 'J', 12: 'Q', 13: 'K' }[rank];
  if (!key) return '';
  const id = `${key}${suitColor}`;
  if (!courtCache.has(id)) {
    courtCache.set(id, toURI(spriteSVG(COURT_SPRITES[key], suitColor)));
  }
  return courtCache.get(id);
}

let backURI = null;
export function cardBackImage() {
  if (!backURI) backURI = toURI(spriteSVG(CARD_BACK, null));
  return backURI;
}
