# Hokm Night

A browser-based implementation of **Hokm**, the classic Persian 4-player
trick-taking card game, styled like a neon casino-lounge roguelike — chunky
pixel type, glowing card outlines, drifting color-blob backgrounds, and a
synthesized jazzy chiptune soundtrack.

Play at [zulbiabamiyeh.github.io/Game-2](https://zulbiabamiyeh.github.io/Game-2/)
once GitHub Pages is enabled for this repo (Settings → Pages → deploy from
`main`), or run it locally (see below).

## About the assets

All music, sound effects, and card art in this project are **original**,
generated with plain code rather than pulled from any existing game:

- **Music & SFX** — synthesized live in the browser with the Web Audio API
  (`js/audio.js`): a scheduled step-sequencer plays a swung minor-key lounge
  loop (walking bass, comped chords, brushed hats), plus one-shot chimes for
  dealing, playing, winning a trick, calling trump, and winning a hand. No
  audio files are shipped or downloaded.
- **Cards & UI** — plain HTML/CSS (`css/style.css`), no external images.
- **Fonts** — [Silkscreen](https://fonts.google.com/specimen/Silkscreen) and
  [Baloo 2](https://fonts.google.com/specimen/Baloo+2) from Google Fonts
  (both open-licensed, loaded via CDN link in `index.html`).

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
css/style.css      Theme, layout, animations
js/deck.js         Card model + deck helpers
js/rules.js        Hokm game engine (pure logic, event-driven)
js/ai.js           Bot trump-selection and card-play heuristics
js/audio.js        Procedural music + SFX synth engine
js/ui.js           DOM rendering helpers
js/main.js         Wires engine + AI + audio + UI together
```
