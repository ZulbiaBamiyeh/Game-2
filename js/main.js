import { HokmGame, HUMAN_SEAT, teamOf } from './rules.js';
import { chooseTrumpAI, chooseCardAI } from './ai.js';
import { audio } from './audio.js';
import { ShaderBackground } from './bg.js';
import * as ui from './ui.js';
import { SUIT_INFO } from './deck.js';
import { hydrateSuitIcons } from './suits.js';

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
      const card = chooseCardAI(game, seat);
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

  game.on('trick-end', ({ winner, teamTricks }) => {
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
    ui.log(
      `${ui.seatName(winner)} takes the trick for ${ui.teamName(teamOf(winner))} · ` +
      `You & North ${teamTricks[0]} — West & East ${teamTricks[1]}`
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
  game = new HokmGame({ targetHandWins: 7 });
  wireGameEvents();
  ui.updateScores([0, 0]);
  ui.updateTrickCounts([0, 0, 0, 0]);
  ui.updateTeamTricks([0, 0]);
  ui.clearTrickArea();
  game.startMatch();
}

function init() {
  hydrateSuitIcons();
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
