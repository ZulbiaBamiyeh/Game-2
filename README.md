# Hokm Night

A browser-based implementation of **Hokm**, the classic Persian 4-player
trick-taking card game, styled like a neon casino-lounge roguelike — chunky
pixel type, hand-drawn pixel cards, a live shader background, and a jazz
soundtrack.

Play it at
**[zulbiabamiyeh.github.io/Game-2](https://zulbiabamiyeh.github.io/Game-2/)**,
or run it locally (see below). Every push deploys through GitHub Actions.

## About the assets

All the artwork is **original**, drawn in code rather than taken from any
existing game, and the sound effects are synthesized at runtime. The
soundtrack is a supplied AI-generated track, bundled in `audio/`. Nothing is
fetched from a third party at runtime — the page loads only its own files.

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
- **Card art** — hand-drawn pixel art (`js/pixelart.js`). The Jack, Queen and
  King are drawn **double-headed**, the upper figure repeated rotated 180° the
  way a real court card is printed, each with a jewelled crown or feathered
  cap, hair, and a held sword, flower or staff. Their robes take the colour of
  their suit, derived from one base sprite, with very dark suits lifted toward
  a slate so black-on-black linework stays legible. The card back is an ornate
  gold-and-crimson lattice. Every full-card sprite is rasterised once per
  rank+suit and reused as an image, so the artwork costs no DOM.
- **Suits** — pixel symbols too (`js/pixelart.js`), hand-authored at 15x15 so
  the four silhouettes stay unmistakable, on a four-colour deck: slate spades,
  red hearts, blue clubs, gold diamonds. Number cards lay them out in the
  traditional 3x7 pip arrangement, with the lower pips rotated as printed.
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
js/pixelart.js    All pixel artwork: suits, courts, card back
js/suits.js       Suit naming + icon hydration
js/bg.js          WebGL shader background
js/ui.js          DOM rendering, card faces, animation juice
js/chatter.js     Table-talk lines, chosen by what just happened
js/main.js        Wires engine + AI + audio + UI together
```
