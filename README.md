# Hokm Night

A browser-based implementation of **Hokm**, the classic Persian 4-player
trick-taking card game, styled like a neon casino-lounge roguelike — chunky
pixel type, hand-drawn pixel cards, a live shader background, and a jazz
soundtrack.

Play it at
**[zulbiabamiyeh.github.io/Game-2](https://zulbiabamiyeh.github.io/Game-2/)**,
or run it locally (see below). Every push deploys through GitHub Actions.

## About the assets

Nothing here comes from another game. The deck art and the soundtrack are
supplied AI-generated assets bundled into the repo; everything else — the
background, the card backs, the suit symbols and every sound effect — is
generated in code at runtime. Nothing is fetched from a third party while the
page runs: it loads only its own files.

- **Music** — `audio/hokm-theme.mp3`, an AI-generated jazz track supplied for
  the project. It plays through the same Web Audio mixer the effects use, so
  the mute toggle, volume and the ducking under win stingers all apply to it.
- **Sound effects** — synthesized live with the Web Audio API (`js/audio.js`):
  dealing, placing, trick wins, the trump-call swell and the hand/match
  fanfares, through a procedurally-generated convolution reverb and a bus
  compressor.
- **Background** — a WebGL fragment shader (`js/bg.js`) rendering
  domain-warped fbm noise, which produces the slow liquid-marble swirl.
  Falls back to a CSS gradient where WebGL is unavailable.
- **Card art** — a supplied, generated deck contact sheet
  (`assets/deck-source.jpeg`), sliced into two 13x4 sprite sheets by
  `tools/slice_deck.py`: `cards-main.png` and a high-contrast variant with
  blue clubs and gold diamonds, switchable in-game. Each card is cropped on
  its printed border and pasted centred into a fixed 87x115 cell with an equal
  margin on all four sides, then supersampled 3x so it stays sharp when the
  table scales it up. A card face is one cell of that sheet, picked by two CSS
  custom properties, so a whole hand costs one image and no DOM.
- **Card backs & suit icons** — hand-drawn pixel art (`js/pixelart.js`): an
  ornate gold-and-crimson lattice back, and 15x15 suit symbols authored so the
  four silhouettes stay unmistakable at HUD size.
- **Table juice** — cards tilt toward the cursor in 3D, idle-float on the
  table, and spring in when played; the winner's card jumps and the HUD
  numbers pop as they change.
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

- You (South) and your partner across the table are partners, against the two
  players to your left and right. The three bots are named at random each match.
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
js/audio.js       Music playback + SFX synthesis
audio/            Bundled soundtrack
js/pixelart.js    Pixel artwork: suit symbols, card back
js/suits.js       Suit naming + icon hydration
js/bg.js          WebGL shader background
js/ui.js          DOM rendering, card faces, animation juice
js/chatter.js     Table-talk lines, chosen by what just happened
js/main.js        Wires engine + AI + audio + UI together
assets/           Deck source image + the two generated sprite sheets
tools/            slice_deck.py, which cuts the source into those sheets
```
