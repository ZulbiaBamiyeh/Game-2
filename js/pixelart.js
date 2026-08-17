// All card artwork, drawn as pixel grids.
//
// '.' is transparent, 'c'/'C'/'L' take the card's suit colour at base, shadow
// and highlight, and the rest map to the fixed palette below. Court figures are
// double-headed — the upper half repeated rotated 180° — the way a real court
// card is printed. Grids are rendered to SVG rects with horizontal runs merged;
// full-card artwork is rasterised once per rank+suit and reused as an image.

const PALETTE = {
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
  w: '#fffaf0', // white
  v: '#cfc7dc', // steel / grey
  r: '#e0143c', // ruby
  b: '#2f7fe0', // sapphire
  n: '#17a05c', // emerald
  R: '#8e0b2c', // card-back crimson shadow
  d: '#e0a02a', // card-back lattice
};
// The card back is drawn in fixed colours rather than the suit's.
const BACK_PALETTE = { g: '#ffc93f', G: '#c98b14', r: '#b8123c', R: '#8e0b2c', d: '#e0a02a' };

const toRGB = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (c) =>
  '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/**
 * Robe colour for a suit. Spades is nearly black, and black fill behind black
 * outlines loses every detail, so dark suits are lifted toward a slate that
 * still reads as the dark suit while keeping the figure legible.
 */
function robeFor(hex) {
  const rgb = toRGB(hex);
  const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  if (lum >= 70) return hex;
  const t = (70 - lum) / 70;
  const target = [78, 76, 108];
  return toHex(rgb.map((v, i) => v + (target[i] - v) * t));
}
const mixWhite = (hex, t) => toHex(toRGB(hex).map((v) => v + (255 - v) * t));
const darken = (hex, f) => toHex(toRGB(hex).map((v) => v * f));

export const SUIT_SPRITES = {
  S: [
    '.......c.......',
    '......ccc......',
    '.....ccccc.....',
    '....ccccccc....',
    '...ccccccccc...',
    '..ccccccccccc..',
    '.ccccccccccccc.',
    'ccccccccccccccc',
    'ccccccccccccccc',
    'ccccccccccccccc',
    '.cccc.ccc.cccc.',
    '..cc..ccc..cc..',
    '......ccc......',
    '....ccccccc....',
    '...ccccccccc...',
  ],
  H: [
    '..cccc...cccc..',
    '.ccccccccccccc.',
    'ccccccccccccccc',
    'ccccccccccccccc',
    'ccccccccccccccc',
    '.ccccccccccccc.',
    '.ccccccccccccc.',
    '..ccccccccccc..',
    '..ccccccccccc..',
    '...ccccccccc...',
    '....ccccccc....',
    '.....ccccc.....',
    '......ccc......',
    '.......c.......',
    '...............',
  ],
  D: [
    '.......c.......',
    '......ccc......',
    '.....ccccc.....',
    '....ccccccc....',
    '...ccccccccc...',
    '..ccccccccccc..',
    '.ccccccccccccc.',
    'ccccccccccccccc',
    '.ccccccccccccc.',
    '..ccccccccccc..',
    '...ccccccccc...',
    '....ccccccc....',
    '.....ccccc.....',
    '......ccc......',
    '.......c.......',
  ],
  C: [
    '.....ccccc.....',
    '....ccccccc....',
    '...ccccccccc...',
    '...ccccccccc...',
    '....ccccccc....',
    '.ccc..ccc..ccc.',
    'ccccc.ccc.ccccc',
    'ccccccccccccccc',
    'ccccc.ccc.ccccc',
    '.ccc..ccc..ccc.',
    '......ccc......',
    '......ccc......',
    '.....ccccc.....',
    '....ccccccc....',
    '...............',
  ],
};

export const COURT_SPRITES = {
  J: [
    '...................................oowwwo.......',
    '........................o.........owowwwo.......',
    '.................oooooooLooooooo.owwwwwwo.......',
    '...............oocLLLLLLLLLLLLLcowwwwwwwo.......',
    '.............oocLLLLLLLLLLLLLLLLLwwwwwwwo.......',
    '............occLLLLLLLLLLLLLLLLLLwwwwwwwo.......',
    '...........occLLLLLLLLLLLLLLLLLLLwwwwwoo........',
    '...........occcLLLLLLLLLLLLLLLLLLwwwwwo.........',
    '..........occcccLLLLLLLLLLLLLLLLLcwwwco.........',
    '....oooooogggggggggggggggggggggggggwgggo........',
    '...ogggggogggggggggggggggggggggggggggggo........',
    '...ogggggoGGGGGGGGGGGGGGGGGGGGGGGGGGGGGo........',
    '...ogggggoGGGGGGGGGGGGGGGGGGGGGGGGGGGGGo........',
    '....ovvvo.ooooJJJcccccccccccccccJJJoooo.........',
    '....ovvvo...oJJJJsswoosscsswoossJJJJo...........',
    '....ovvvo..ooJJJJssooosssssooossJJJJoo..........',
    '....ovvvoooJoJJJsssooosssssooosssJJJoJoo........',
    '....ovvvoJJJJJJJJsssssssssssssssJJJJJJJJo.......',
    '....ovvvJJJhJJJJJssssssSSSssssssJJJJJhJJJo......',
    '....ovvvJJhhhJJJJsssksssssssksssJJJJhhhJJo......',
    '....ovvvJhhhhhJJJJssskkkkkkksssJJJJhhhhhJJo.....',
    '....ovvvJJhhhJJJJJsssssssssssssJJJJJhhhJJo......',
    '....ovvvJJJhJJJJJJJsssssssssssJJJJJJJhJJJo......',
    '....ovvvoJJJJJJJJJJJJsssssssJJJJJJJJJJJJo.......',
    '....ovvvcccJwwJJJJJJJJJJsJJJJJJJJJJwwJccco......',
    '....ovvvcccwwwwJJJJJJJJJJJJJJJJJJJwwwwcccco.....',
    '....ovvvccccwwwwJJJJJJJJJJJJJJJJJwwwwcccccco....',
    '....ovvvcccccwwwwwJJJJJJJJJJJJJwwwwwcccccccco...',
    '....ovvvccccccccwwwwJJJJJJJJJwwwwccccccccccco...',
    '....ovvvccccccccccccccccJccccccccccccccccccco...',
    '...ocvvvccccccccccccccccccccccccccccccccccccco..',
    '....ovvvcccccccccccccccccccccccccccccccccccco...',
    '....ovvvcccccccccccccccccccccccccccccccccccco...',
    '....ovvvcccccccccccccccccccccccccccccccccccco...',
    '...occccccccccccccccccccccccccccccccccccvvvo....',
    '...occccccccccccccccccccccccccccccccccccvvvo....',
    '...occccccccccccccccccccccccccccccccccccvvvo....',
    '..occcccccccccccccccccccccccccccccccccccvvvco...',
    '...occcccccccccccccccccJccccccccccccccccvvvo....',
    '...occcccccccccwwwwJJJJJJJJJwwwwccccccccvvvo....',
    '...occccccccwwwwwJJJJJJJJJJJJJwwwwwcccccvvvo....',
    '....occccccwwwwJJJJJJJJJJJJJJJJJwwwwccccvvvo....',
    '.....occccwwwwJJJJJJJJJJJJJJJJJJJwwwwcccvvvo....',
    '......occcJwwJJJJJJJJJJsJJJJJJJJJJwwJcccvvvo....',
    '.......oJJJJJJJJJJJJsssssssJJJJJJJJJJJJovvvo....',
    '......oJJJhJJJJJJJsssssssssssJJJJJJJhJJJvvvo....',
    '......oJJhhhJJJJJsssssssssssssJJJJJhhhJJvvvo....',
    '.....oJJhhhhhJJJJssskkkkkkksssJJJJhhhhhJvvvo....',
    '......oJJhhhJJJJsssksssssssksssJJJJhhhJJvvvo....',
    '......oJJJhJJJJJssssssSSSssssssJJJJJhJJJvvvo....',
    '.......oJJJJJJJJsssssssssssssssJJJJJJJJovvvo....',
    '........ooJoJJJsssooosssssooosssJJJoJooovvvo....',
    '..........ooJJJJssooosssssooossJJJJoo..ovvvo....',
    '...........oJJJJssoowsscssoowssJJJJo...ovvvo....',
    '.........ooooJJJcccccccccccccccJJJoooo.ovvvo....',
    '........oGGGGGGGGGGGGGGGGGGGGGGGGGGGGGogggggo...',
    '........oGGGGGGGGGGGGGGGGGGGGGGGGGGGGGogggggo...',
    '........ogggggggggggggggggggggggggggggogggggo...',
    '........ogggwgggggggggggggggggggggggggoooooo....',
    '.........ocwwwcLLLLLLLLLLLLLLLLLccccco..........',
    '.........owwwwwLLLLLLLLLLLLLLLLLLccco...........',
    '........oowwwwwLLLLLLLLLLLLLLLLLLLcco...........',
    '.......owwwwwwwLLLLLLLLLLLLLLLLLLcco............',
    '.......owwwwwwwLLLLLLLLLLLLLLLLLcoo.............',
    '.......owwwwwwwocLLLLLLLLLLLLLcoo...............',
    '.......owwwwwwo.oooooooLooooooo.................',
    '.......owwwowo.........o........................',
    '.......owwwoo...................................',
  ],
  Q: [
    '........................o.......................',
    '.......................oro......................',
    '.....o............o....ogo....o.................',
    '....oro..........ono..ogggo..obo................',
    '...orrro.........ogoooogggoooogo................',
    '..orrrrro.......ogggjjgggggjjgggo...............',
    '...orrro.......ojgggjjgggggjjgggjo..............',
    '..owwgwwo.....ogggggggggggggggggggo.............',
    '.orrgggrro...ojgggggggggggggggggggjo............',
    'orrrrgrrrro...ogggggggggrgggggggggo.............',
    'orrrrwrrrro...oGGGGGGGGGGGGGGGGGGGo.............',
    '.orrrorrro...ohGGGGGGGGGGGGGGGGGGGho............',
    '..ooonnoo...ohhhhsHHHHHHHHHHHHHshhhho...........',
    '....onno...ohhhhhssssssssssssssshhhhho..........',
    '....onno...ohhhhhsswoossssswoosshhhhho..........',
    '....onno..ohhhhhhssooosssssooosshhhhhho.........',
    '....onno..ohhhhhsssooosssssooossshhhhho.........',
    '....onno..ohhhhhhssssssssssssssshhhhhho.........',
    '....onno..ohhhhhhssssssSSSsssssshhhhhho.........',
    '....onno..ohhhhhhssssssssssssssshhhhhho.........',
    '....onno.ohhhhhhhsssssrrrrrssssshhhhhhho........',
    '....onno.ohhhhhhhhssssrrrrrsssshhhhhhhho........',
    '....onno.ohhhhhhhhhssssssssssshhhhhhhhho........',
    '....onnooohhhhhhhhhhssssssssshhhhhhhhhhoo.......',
    '....onnocchhhhhhhhhhhhssssshhhhhhhhhhhhcco......',
    '....onnccchhhhhhhhhhhhhhhhhhhhhhhhhhhhhccco.....',
    '....onnccchhhhhhhhhhhhhhhhhhhhhhhhhhhhhcccco....',
    '....onnccccchhhhhhhhhhhhhhhhhhhhhhhhhccccccco...',
    '....onncccccchhhhhhhhhhhhhhhhhhhhhhhcccccccco...',
    '....onnccccccchhhhhhhhhhhhhhhhhhhhhccccccccco...',
    '...ocnncccccccchhhhhhhhhhhhhhhhhhhccccccccccco..',
    '....onnccccccccchhhhhhhhhhhhhhhhhccccccccccco...',
    '....onncccccccccchhhhhhhhhhhhhhhcccccccccccco...',
    '....onncccccccccccchhhhhhhhhhhcccccccccccccco...',
    '...occcccccccccccchhhhhhhhhhhccccccccccccnno....',
    '...occcccccccccchhhhhhhhhhhhhhhccccccccccnno....',
    '...occccccccccchhhhhhhhhhhhhhhhhcccccccccnno....',
    '..occccccccccchhhhhhhhhhhhhhhhhhhccccccccnnco...',
    '...occccccccchhhhhhhhhhhhhhhhhhhhhcccccccnno....',
    '...occcccccchhhhhhhhhhhhhhhhhhhhhhhccccccnno....',
    '...occccccchhhhhhhhhhhhhhhhhhhhhhhhhcccccnno....',
    '....occcchhhhhhhhhhhhhhhhhhhhhhhhhhhhhcccnno....',
    '.....occchhhhhhhhhhhhhhhhhhhhhhhhhhhhhcccnno....',
    '......occhhhhhhhhhhhhssssshhhhhhhhhhhhcconno....',
    '.......oohhhhhhhhhhssssssssshhhhhhhhhhooonno....',
    '........ohhhhhhhhhssssssssssshhhhhhhhho.onno....',
    '........ohhhhhhhhssssrrrrrsssshhhhhhhho.onno....',
    '........ohhhhhhhsssssrrrrrssssshhhhhhho.onno....',
    '.........ohhhhhhssssssssssssssshhhhhho..onno....',
    '.........ohhhhhhssssssSSSsssssshhhhhho..onno....',
    '.........ohhhhhhssssssssssssssshhhhhho..onno....',
    '.........ohhhhhsssooosssssooossshhhhho..onno....',
    '.........ohhhhhhssooosssssooosshhhhhho..onno....',
    '..........ohhhhhssoowsssssoowsshhhhho...onno....',
    '..........ohhhhhssssssssssssssshhhhho...onno....',
    '...........ohhhhsHHHHHHHHHHHHHshhhho...oonnooo..',
    '............ohGGGGGGGGGGGGGGGGGGGho...orrrorrro.',
    '.............oGGGGGGGGGGGGGGGGGGGo...orrrrwrrrro',
    '.............ogggggggggrgggggggggo...orrrrgrrrro',
    '............ojgggggggggggggggggggjo...orrgggrro.',
    '.............ogggggggggggggggggggo.....owwgwwo..',
    '..............ojgggjjgggggjjgggjo.......orrro...',
    '...............ogggjjgggggjjgggo.......orrrrro..',
    '................ogoooogggoooogo.........orrro...',
    '................obo..ogggo..ono..........oro....',
    '.................o....ogo....o............o.....',
    '......................oro.......................',
    '.......................o........................',
  ],
  K: [
    '...............o.......obo.......o..............',
    '..............oro.....ogggo.....ono.............',
    '.............ogggo....ogggo....ogggo............',
    '.....o.......ogggo...ogggggo...ogggo............',
    '....ogo......ogggo...ogggggo...ogggo............',
    '...ogggo...oogggggooogggggggooogggggoo..........',
    '..ogggggo.ogggggggggggggggggggggggggggo.........',
    '...ogggo..ogggggggggggggggggggggggggggo.........',
    '..ogggggo.oggggggrggggggbggggggnggggggo.........',
    '..ogggggo.oGGGGGGGGGGGGGGGGGGGGGGGGGGGo.........',
    '...ovvvo..oGGGGGGGGGGGGGGGGGGGGGGGGGGGo.........',
    '...ovvvo...ooojjjjHHHHHHHHHHHHHjjjjooo..........',
    '...ovvvo.....ojjjsHHHHHHHHHHHHHsjjjo............',
    '...ovvvo....ojjjjsswoossssswoossjjjjo...........',
    '...ovvvo....ojjjjssooosssssooossjjjjo...........',
    '...ovvvo....ojjjsssooosssssooosssjjjo...........',
    '...ovvvo....ojjjjsssssssssssssssjjjjo...........',
    '...ovvvo...ojjjjjsshhhhhhhhhhhssjjjjjo..........',
    '...ovvvo....ojjjjshhhjjjjjjjhhhsjjjjo...........',
    '...ovvvo....ojjjjhhhjjjjjjjjjhhhjjjjo...........',
    '...ovvvo....ojjjjhhjjjjjjjjjjjhhjjjjo...........',
    '...ovvvo....ojjjhhhhjjjjjjjjjhhhhjjjo...........',
    '...ovvvo..oooojjjhhhhhhhhhhhhhhhjjjoooo.........',
    '...ovvvoooccccjjjhhhhhhhhhhhhhhhjjjccccoo.......',
    '...ovvvocccccccjjjhhhhhhhhhhhhhjjjccccccco......',
    '...ovvvccccccccwjjjhhhhhhhhhhhjjjwcccccccco.....',
    '...ovvvccccccccwwwjjhhhhhhhhhjjwwwccccccccco....',
    '...ovvvcccccccccccccjjjjhjjjjccccccccccccccco...',
    '...ovvvcccccccccccccccggjggccccccccccccccccco...',
    '...ovvvcccccccccccccccggrggccccccccccccccccco...',
    '...ovvvccccccccccccccggrrrggccccccccccccccccco..',
    '...ovvvcccccccccccccccggrggccccccccccccccccco...',
    '...ovvvcccccccccccccccgggggccccccccccccccccco...',
    '...ovvvcccccccccccccccccgccccccccccccccccccco...',
    '...occcccccccccccccccccgcccccccccccccccccvvvo...',
    '...occcccccccccccccccgggggcccccccccccccccvvvo...',
    '...occcccccccccccccccggrggcccccccccccccccvvvo...',
    '..occcccccccccccccccggrrrggccccccccccccccvvvo...',
    '...occcccccccccccccccggrggcccccccccccccccvvvo...',
    '...occcccccccccccccccggjggcccccccccccccccvvvo...',
    '...occcccccccccccccjjjjhjjjjcccccccccccccvvvo...',
    '....occcccccccwwwjjhhhhhhhhhjjwwwccccccccvvvo...',
    '.....occccccccwjjjhhhhhhhhhhhjjjwccccccccvvvo...',
    '......occcccccjjjhhhhhhhhhhhhhjjjcccccccovvvo...',
    '.......ooccccjjjhhhhhhhhhhhhhhhjjjccccooovvvo...',
    '.........oooojjjhhhhhhhhhhhhhhhjjjoooo..ovvvo...',
    '...........ojjjhhhhjjjjjjjjjhhhhjjjo....ovvvo...',
    '...........ojjjjhhjjjjjjjjjjjhhjjjjo....ovvvo...',
    '...........ojjjjhhhjjjjjjjjjhhhjjjjo....ovvvo...',
    '...........ojjjjshhhjjjjjjjhhhsjjjjo....ovvvo...',
    '..........ojjjjjsshhhhhhhhhhhssjjjjjo...ovvvo...',
    '...........ojjjjsssssssssssssssjjjjo....ovvvo...',
    '...........ojjjsssooosssssooosssjjjo....ovvvo...',
    '...........ojjjjssooosssssooossjjjjo....ovvvo...',
    '...........ojjjjssoowsssssoowssjjjjo....ovvvo...',
    '............ojjjsHHHHHHHHHHHHHsjjjo.....ovvvo...',
    '..........ooojjjjHHHHHHHHHHHHHjjjjooo...ovvvo...',
    '.........oGGGGGGGGGGGGGGGGGGGGGGGGGGGo..ovvvo...',
    '.........oGGGGGGGGGGGGGGGGGGGGGGGGGGGo.ogggggo..',
    '.........oggggggnggggggbggggggrggggggo.ogggggo..',
    '.........ogggggggggggggggggggggggggggo..ogggo...',
    '.........ogggggggggggggggggggggggggggo.ogggggo..',
    '..........oogggggooogggggggooogggggoo...ogggo...',
    '............ogggo...ogggggo...ogggo......ogo....',
    '............ogggo...ogggggo...ogggo.......o.....',
    '............ogggo....ogggo....ogggo.............',
    '.............ono.....ogggo.....oro..............',
    '..............o.......obo.......o...............',
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

/** Grid to SVG, merging horizontal runs of one colour into a single rect. */
function gridSVG(grid, palette, { inline = false } = {}) {
  const h = grid.length;
  const w = grid[0].length;
  const parts = [];
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    let x = 0;
    while (x < w) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let run = 1;
      while (x + run < w && row[x + run] === ch) run++;
      const fill = palette[ch];
      if (fill) parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`);
      x += run;
    }
  }
  // The xmlns matters: without it the markup renders inline but fails to load
  // when handed to CSS as a data URI.
  const cls = inline ? ' class="pixel-art"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg"${cls} viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${parts.join('')}</svg>`;
}

function suitPalette(hex) {
  const robe = robeFor(hex);
  return Object.assign({}, PALETTE, { c: robe, C: darken(robe, 0.62), L: mixWhite(robe, 0.38) });
}

/** Inline pixel suit symbol, in the suit's own colour. */
export function suitSVG(suit, className = '') {
  const svg = gridSVG(SUIT_SPRITES[suit], { c: 'currentColor' }, { inline: true });
  return className ? svg.replace('class="pixel-art"', `class="pixel-art ${className}"`) : svg;
}

const toURI = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const courtCache = new Map();
/** CSS url() for a double-headed court figure, rasterised once per rank+suit. */
export function courtImage(rank, suitHex) {
  const key = { 11: 'J', 12: 'Q', 13: 'K' }[rank];
  if (!key) return '';
  const id = key + suitHex;
  if (!courtCache.has(id)) {
    courtCache.set(id, toURI(gridSVG(COURT_SPRITES[key], suitPalette(suitHex))));
  }
  return courtCache.get(id);
}

let backURI = null;
export function cardBackImage() {
  if (!backURI) backURI = toURI(gridSVG(CARD_BACK, BACK_PALETTE));
  return backURI;
}
