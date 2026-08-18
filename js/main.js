import { HokmGame, HUMAN_SEAT, teamOf } from './rules.js';
import { chooseTrumpAI, chooseCardAI } from './ai.js';
import { audio } from './audio.js';
import { ShaderBackground } from './bg.js';
import * as ui from './ui.js';
import { SUIT_INFO } from './deck.js';
import { hydrateSuitIcons } from './suits.js';
import { cardBackImage } from './pixelart.js';
import * as chatter from './chatter.js';

// Drawn per match so the table has a different cast each time. Kept short so
// they fit a nameplate, and spread widely across regions and languages.
const BOT_NAMES = [
  // West & Central Asia
  'Darius', 'Roya', 'Kian', 'Nasrin', 'Omid', 'Parisa', 'Arash', 'Laleh',
  'Cyrus', 'Anahita', 'Emre', 'Elif', 'Baran', 'Deniz', 'Aylin',
  // Arab world & Levant
  'Amir', 'Layla', 'Karim', 'Rania', 'Tariq', 'Yasmin', 'Zaid', 'Noor',
  'Samir', 'Hala', 'Noa', 'Eitan', 'Tamar', 'Yonatan',
  // South Asia
  'Priya', 'Arjun', 'Ananya', 'Rohan', 'Meera', 'Vikram', 'Aisha', 'Dev',
  'Ishaan', 'Kavya',
  // East Asia
  'Wei', 'Mei', 'Jian', 'Lin', 'Hao', 'Xiu', 'Kenji', 'Yuki', 'Haru', 'Aiko',
  'Sora', 'Rin', 'Jisoo', 'Minho', 'Haeun', 'Jun',
  // Southeast Asia & the Pacific
  'Anh', 'Linh', 'Bayu', 'Sari', 'Mai', 'Nurul', 'Tane', 'Moana', 'Kai',
  'Anika',
  // Africa
  'Kwame', 'Amara', 'Zuri', 'Kofi', 'Nia', 'Tendai', 'Ayo', 'Chidi', 'Sade',
  'Thabo', 'Imani', 'Sekou',
  // Europe
  'Lucas', 'Emma', 'Mateo', 'Sofia', 'Elena', 'Hugo', 'Clara', 'Luca', 'Nora',
  'Felix', 'Ivan', 'Katya', 'Milos', 'Zofia', 'Dmitri', 'Lena', 'Erik',
  'Freya', 'Lars', 'Ingrid', 'Sigrid', 'Nikos', 'Thalia', 'Stavros', 'Daphne',
  'Siobhan', 'Eoin',
  // The Americas
  'Diego', 'Camila', 'Rafa', 'Valeria', 'Santiago', 'Paloma', 'Mateus',
  'Bianca', 'Dakota', 'Yara',
];

function drawBotNames() {
  const pool = BOT_NAMES.slice();
  const picked = [];
  for (let i = 0; i < 3; i++) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picked; // West, North, East
}

const TRICK_HOLD_MS = 1150;
const HAND_MODAL_DELAY_MS = 1500;
const AI_MIN_DELAY = 550;
const AI_MAX_DELAY = 1050;

let game = null;
let background = null;

function aiDelay() {
  return AI_MIN_DELAY + Math.random() * (AI_MAX_DELAY - AI_MIN_DELAY);
}

function renderAllHands({ interactive = false } = {}) {
  for (let s = 1; s < 4; s++) {
    ui.renderOpponentHand(s, game.hands[s].length);
  }
  let opts;
  if (interactive) {
    const validIds = new Set(game.getValidMoves(HUMAN_SEAT).map((c) => c.id));
    opts = { interactive: true, validIds, onPlay: (card) => humanPlay(card) };
  } else {
    opts = { interactive: false };
  }
  ui.renderSouthHand(game.hands[HUMAN_SEAT], game.trumpSuit, opts);
}

function humanPlay(card) {
  if (game.phase !== 'playing') return;
  if (game.currentTurnSeat() !== HUMAN_SEAT) return;
  if (!game.isValidMove(HUMAN_SEAT, card)) {
    audio.invalidMove();
    ui.shakeTable();
    return;
  }
  audio.cardPlace();
  game.playCard(HUMAN_SEAT, card);
}

function proceedTurn() {
  if (game.phase !== 'playing') return;
  const seat = game.currentTurnSeat();
  ui.setActiveSeat(seat);

  if (seat === HUMAN_SEAT) {
    ui.setTurnText('Your turn — play a card');
    renderAllHands({ interactive: true });
  } else {
    ui.setTurnText(`${ui.seatName(seat)} is thinking…`);
    renderAllHands({ interactive: false });
    setTimeout(() => {
      if (game.phase !== 'playing' || game.currentTurnSeat() !== seat) return;
      // Bots get a restricted view, never the game itself — see rules.viewFor.
      const card = chooseCardAI(game.viewFor(seat));
      audio.cardPlace();
      game.playCard(seat, card);
    }, aiDelay());
  }
}

function beginTrumpSelection() {
  const hakem = game.hakemSeat;
  ui.setHakemBanner(`Hakem: ${ui.seatName(hakem)}`);
  ui.setTrumpBanner(null);
  ui.setTurnText(`${ui.seatName(hakem)} is choosing the trump suit…`);
  ui.setActiveSeat(hakem);

  if (hakem === HUMAN_SEAT) {
    setTimeout(() => {
      ui.showTrumpModal(game.hands[HUMAN_SEAT], (suit) => {
        audio.trumpChosen();
        game.chooseTrump(suit);
      });
    }, 420);
  } else {
    setTimeout(() => {
      const suit = chooseTrumpAI(game.hands[hakem]);
      audio.trumpChosen();
      game.chooseTrump(suit);
    }, aiDelay() + 300);
  }
}

function beginNewHand() {
  ui.clearTrickArea();
  ui.updateTrickCounts([0, 0, 0, 0]);
  ui.updateTeamTricks([0, 0]);
  ui.setTrumpBanner(null);
  game.startHand();
}

const PARTNER_SEAT = 2;

/**
 * Work out what actually happened in the trick — was it cut, whose card went
 * down, was it a big one — and let a bot react to that specifically.
 */
function speakAboutTrick(winner, plays) {
  const trump = game.trumpSuit;
  const ledSuit = plays[0].card.suit;
  const winning = plays.find((p) => p.seat === winner);
  const others = plays.filter((p) => p.seat !== winner);
  if (!winning || !others.length) return;

  // The card that would have taken the trick had the winner not played.
  let runnerUp = others[0];
  for (const p of others.slice(1)) {
    if (game.beats(p, runnerUp, ledSuit)) runnerUp = p;
  }

  const trumped = winning.card.suit === trump && ledSuit !== trump;
  const ctx = {
    winnerIsHuman: winner === HUMAN_SEAT,
    winnerIsPartner: winner === PARTNER_SEAT,
    beatenIsHuman: runnerUp.seat === HUMAN_SEAT,
    beatenIsPartner: runnerUp.seat === PARTNER_SEAT,
    trumped,
    overTrumped: trumped && runnerUp.card.suit === trump,
    beatenRank: runnerUp.card.rank,
    beatenWasHigh: runnerUp.card.rank >= 12,
    winnerRank: winning.card.rank,
  };

  // Only bots speak, so drop any line whose speaker would be the player.
  const seatFor = { partner: PARTNER_SEAT, winner, beaten: runnerUp.seat };
  const usable = chatter.trickTalk(ctx).filter((c) => seatFor[c.role] !== HUMAN_SEAT);
  if (!usable.length || Math.random() > 0.55) return;

  const choice = chatter.pick(usable);
  ui.showSpeech(seatFor[choice.role], choice.text);
}

/** Stagger a dealing sound across the opening deal for a riffle effect. */
function playDealSounds(count, spacing = 55) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => audio.cardDeal(), i * spacing);
  }
}

function wireGameEvents() {
  game.on('hand-start', ({ hakemSeat, handNumber }) => {
    ui.log(`Hand ${handNumber} — ${ui.seatName(hakemSeat)} deals and becomes Hakem.`);
  });

  game.on('initial-deal', () => {
    playDealSounds(8);
    renderAllHands({ interactive: false });
    beginTrumpSelection();
  });

  game.on('trump-chosen', ({ suit, hakemSeat }) => {
    ui.setTrumpBanner(suit);
    if (background) background.pulse();
    if (hakemSeat !== HUMAN_SEAT) {
      ui.showSpeech(hakemSeat, chatter.trumpCallLine(SUIT_INFO[suit].name));
    }
    ui.log(`${ui.seatName(hakemSeat)} calls ${SUIT_INFO[suit].name} (${SUIT_INFO[suit].symbol}) as Hokm!`);
  });

  game.on('final-deal', () => {
    playDealSounds(10, 45);
    renderAllHands({ interactive: false });
    proceedTurn();
  });

  game.on('card-played', ({ seat, card }) => {
    ui.placeCardInTrick(seat, card);
    renderAllHands({ interactive: false });
    if (game.currentTrick.plays.length < 4) {
      proceedTurn();
    }
  });

  game.on('trick-end', ({ winner, teamTricks, plays }) => {
    ui.setActiveSeat(null);
    ui.setTurnText(`${ui.seatName(winner)} takes the trick!`);

    const cardEl = ui.glowWinner(winner);
    audio.trickWin();
    ui.screenShake(teamOf(winner) === 0 ? 1 : 0.6);
    if (cardEl) {
      ui.burstAt(cardEl, 16);
      ui.floatText(cardEl, '+1');
    }

    ui.updateTrickCounts(game.tricksWon);
    ui.updateTeamTricks(teamTricks);

    speakAboutTrick(winner, plays);

    ui.log(
      `${ui.seatName(winner)} takes the trick for ${ui.teamName(teamOf(winner))} · ` +
      `${ui.teamName(0)} ${teamTricks[0]} — ${ui.teamName(1)} ${teamTricks[1]}`
    );

    setTimeout(() => {
      ui.clearTrickArea();
      if (game.phase === 'playing') proceedTurn();
    }, TRICK_HOLD_MS);
  });

  game.on('hand-end', (payload) => {
    setTimeout(() => {
      ui.updateScores(payload.matchScore, payload.winningTeam);
      if (background) background.pulse();

      if (payload.matchOver) {
        audio.matchWin();
        ui.spawnConfetti(90);
        ui.screenShake(1.6);
        ui.showResultModal(
          'MATCH WON!',
          `${ui.teamName(payload.winningTeam)} take the match ${payload.matchScore[0]}–${payload.matchScore[1]}.`,
          () => ui.showScreen('start'),
          { grand: true }
        );
      } else {
        // A bot on each side reacts to how the hand went.
        const speakers = [1, 2, 3].filter((sx) => teamOf(sx) === payload.winningTeam);
        const speaker = speakers.length
          ? speakers[Math.floor(Math.random() * speakers.length)]
          : null;
        if (speaker !== null) {
          const line = chatter.handEndLine(teamOf(speaker) === 0, true, payload.isKot);
          if (line) ui.showSpeech(speaker, line);
        }
        // On a Kot the whitewashed side gets a word in too, a beat later.
        const sulkers = [1, 2, 3].filter((sx) => teamOf(sx) !== payload.winningTeam);
        if (payload.isKot && sulkers.length) {
          const sulker = sulkers[Math.floor(Math.random() * sulkers.length)];
          const line = chatter.handEndLine(teamOf(sulker) === 0, false, true);
          if (line) setTimeout(() => ui.showSpeech(sulker, line), 900);
        }
        audio.handWin();
        ui.spawnConfetti(payload.isKot ? 60 : 32);
        ui.screenShake(payload.isKot ? 1.4 : 0.9);
        const kotText = payload.isKot ? ' — a KOT! Worth double.' : '';
        ui.showResultModal(
          `${ui.teamName(payload.winningTeam)} win the hand!`,
          `Tricks: ${payload.teamTricks[0]}–${payload.teamTricks[1]}${kotText}`,
          () => beginNewHand()
        );
      }
    }, HAND_MODAL_DELAY_MS);
  });
}

function startNewMatch() {
  ui.setSeatNames(drawBotNames());
  game = new HokmGame({ targetHandWins: 7 });
  wireGameEvents();
  ui.updateScores([0, 0]);
  ui.updateTrickCounts([0, 0, 0, 0]);
  ui.updateTeamTricks([0, 0]);
  ui.clearTrickArea();
  game.startMatch();
}

const DECK_KEY = 'hokm.deck.contrast';

/** Swap the card sheet. Purely a CSS variable, so cards on screen update live. */
function setContrastDeck(on) {
  document.body.classList.toggle('deck-contrast', on);
  ui.el.chkContrast.checked = on;
  ui.el.btnDeck.classList.toggle('is-active', on);
  try { localStorage.setItem(DECK_KEY, on ? '1' : '0'); } catch (e) { /* private mode */ }
}

function init() {
  hydrateSuitIcons();
  let savedDeck = false;
  try { savedDeck = localStorage.getItem(DECK_KEY) === '1'; } catch (e) { /* private mode */ }
  setContrastDeck(savedDeck);
  ui.el.chkContrast.addEventListener('change', (e) => setContrastDeck(e.target.checked));
  ui.el.btnDeck.addEventListener('click', () => setContrastDeck(!ui.el.chkContrast.checked));

  // Build the card-back artwork once and share it as an image across every back.
  document.documentElement.style.setProperty('--card-back-img', cardBackImage());
  background = new ShaderBackground(document.getElementById('bg-canvas'));
  background.start();

  ui.el.btnStart.addEventListener('click', async () => {
    await audio.resume();
    audio.startMusic();
    ui.showScreen('game');
    startNewMatch();
  });

  ui.el.btnHowto.addEventListener('click', () => ui.showScreen('howto'));
  ui.el.btnHowtoClose.addEventListener('click', () => ui.showScreen('start'));

  ui.el.chkMusic.addEventListener('change', (e) => {
    audio.toggleMusic(e.target.checked);
    ui.el.btnMuteMusic.classList.toggle('is-muted', !e.target.checked);
  });
  ui.el.chkSfx.addEventListener('change', (e) => {
    audio.muted.sfx = !e.target.checked;
    ui.el.btnMuteSfx.classList.toggle('is-muted', !e.target.checked);
  });

  ui.el.btnMuteMusic.addEventListener('click', () => {
    ui.el.chkMusic.checked = !ui.el.chkMusic.checked;
    ui.el.chkMusic.dispatchEvent(new Event('change'));
  });
  ui.el.btnMuteSfx.addEventListener('click', () => {
    ui.el.chkSfx.checked = !ui.el.chkSfx.checked;
    ui.el.chkSfx.dispatchEvent(new Event('change'));
  });

  document.querySelectorAll('.btn, .suit-btn, .icon-btn').forEach((b) => {
    b.addEventListener('mouseenter', () => audio.buttonHover());
    b.addEventListener('click', () => audio.buttonClick());
  });
}

document.addEventListener('DOMContentLoaded', init);
