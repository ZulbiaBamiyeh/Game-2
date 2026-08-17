# Hokm Night

A browser-based implementation of **Hokm**, the classic Persian 4-player
trick-taking card game, styled like a neon casino-lounge roguelike — chunky
pixel type, glowing card outlines, drifting color-blob backgrounds, and a
synthesized jazzy chiptune soundtrack.

Play at [zulbiabamiyeh.github.io/Game-2](https://zulbiabamiyeh.github.io/Game-2/)
once GitHub Pages is enabled for this repo (Settings → Pages → deploy from
`main`), or run it locally (see below).

## About the assets

Everything you see and hear is **original**, generated with plain code rather
than taken from any existing game. The page loads no external resources at
all — it runs fully offline.

- **Music** — composed and synthesized live with the Web Audio API
  (`js/audio.js`). A lookahead scheduler plays a sixteen-bar lounge-funk loop
  in A minor at 104 BPM on a swung-sixteenth grid, structured A A B A so the
  groove develops rather than just repeating. It is built around a recurring
  syncopated **hook** — stated in full over the outer A blocks and thinned to
  its long notes in the middle one — over a gap-driven bass line, vibraphone
  comping with tremolo, brushed kit and a sixteenth-note shaker. Everything
  runs through a procedurally-generated convolution reverb and a bus
  compressor, and ducks under the win stingers.
- **Sound effects** — likewise synthesized: dealing, placing, trick wins,
  the trump-call swell, and hand/match fanfares, with the music ducking
  underneath the bigger stingers.
- **Background** — a WebGL fragment shader (`js/bg.js`) rendering
  domain-warped fbm noise, which produces the slow liquid-marble swirl.
  Falls back to a CSS gradient where WebGL is unavailable.
- **Card art** — hand-drawn pixel art (`js/pixelart.js`). The Jack, Queen and
  King are 40x56 character-grid sprites with multi-tone shading — jewelled
  crowns, flowing hair, fur trim, a feathered cap — whose robes take the
  colour of their suit, derived at render time from a single base sprite. The
  card back is an ornate gold-and-crimson lattice. Each finished sprite is
  rasterised once and reused as a background image, so the artwork can be as
  detailed as it likes without putting a single rect in the DOM.
- **Suits** — drawn as SVG paths (`js/suits.js`) with deliberately distinct
  silhouettes, on a four-colour deck — spades black, hearts red, diamonds
  blue, clubs green — so suit reads from colour as well as shape.
- **Cards & UI** — no image files anywhere. Cards tilt toward the cursor in
  3D, idle-float on the table, and spring in when played.
- **Fonts** — [Silkscreen](https://fonts.google.com/specimen/Silkscreen) and
  [Baloo 2](https://fonts.google.com/specimen/Baloo+2), bundled in `fonts/`
  and served locally. Both are under the SIL Open Font License; see
  `fonts/OFL.txt`.

## Running it

Because the game uses ES modules, open it through a local static server
rather than a bare `file://` path:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000/
```

or `npx http-server`, or any static file server.

## How to play

- You (South) and North are partners, against West and East.
- Each hand, one seat is dealt 5 cards first and becomes the **Hakem** —
  they choose the trump suit (the "Hokm"). Everyone is then dealt the rest,
  for 13 cards each.
- Follow the suit that was led if you can; otherwise play anything —
  trumps beat every other suit.
- Highest trump wins the trick, or the highest card of the led suit if no
  trump was played.
- First team to win 7 tricks takes the hand (win it 7–0 for a "Kot", worth
  double). First team to 7 hand-points wins the match.

## Project layout

```
index.html        Page shell / screens / modals
css/style.css     Theme, layout, card artwork, animations
fonts/            Bundled OFL fonts + license
js/deck.js        Card model + deck helpers
js/rules.js       Hokm game engine (pure logic, event-driven)
js/ai.js          Bot trump-selection and card-play heuristics
js/audio.js       Music arrangement + SFX synthesis
js/pixelart.js    Pixel-art court sprites and card back
js/suits.js       SVG suit artwork
js/bg.js          WebGL shader background
js/ui.js          DOM rendering, card faces, animation juice
js/main.js        Wires engine + AI + audio + UI together
```
