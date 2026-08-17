import { HokmGame, HUMAN_SEAT, teamOf } from './rules.js';
import { chooseTrumpAI, chooseCardAI } from './ai.js';
import { audio } from './audio.js';
import * as ui from './ui.js';
import { SUIT_INFO } from './deck.js';

const TRICK_HOLD_MS = 1000;
const HAND_MODAL_DELAY_MS = 1400;
const AI_MIN_DELAY = 550;
const AI_MAX_DELAY = 1050;

let game = null;

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
    opts = {
      interactive: true,
      validIds,
      onPlay: (card) => humanPlay(card),
    };
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
    }, 400);
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
  ui.setTrumpBanner(null);
  game.startHand();
}

function wireGameEvents() {
  game.on('hand-start', ({ hakemSeat, handNumber }) => {
    ui.log(`Hand ${handNumber} — ${ui.seatName(hakemSeat)} deals and becomes Hakem.`);
  });

  game.on('initial-deal', () => {
    renderAllHands({ interactive: false });
    beginTrumpSelection();
  });

  game.on('trump-chosen', ({ suit, hakemSeat }) => {
    ui.setTrumpBanner(suit);
    ui.log(`${ui.seatName(hakemSeat)} calls ${SUIT_INFO[suit].name} (${SUIT_INFO[suit].symbol}) as Hokm!`);
  });

  game.on('final-deal', () => {
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
    ui.glowWinner(winner);
    audio.trickWin();
    ui.updateTrickCounts(game.tricksWon);
    ui.log(`${ui.seatName(winner)} wins the trick. (${teamTricks[0]}–${teamTricks[1]} tricks)`);

    setTimeout(() => {
      ui.clearTrickArea();
      if (game.phase === 'playing') {
        proceedTurn();
      }
    }, TRICK_HOLD_MS);
  });

  game.on('hand-end', (payload) => {
    setTimeout(() => {
      ui.updateScores(payload.matchScore, payload.winningTeam);
      if (payload.matchOver) {
        audio.matchWin();
        ui.spawnConfetti(70);
        ui.showResultModal(
          'MATCH WON! 🏆',
          `${ui.teamName(payload.winningTeam)} win the match ${payload.matchScore[0]}–${payload.matchScore[1]}!`,
          () => {
            ui.showScreen('start');
          }
        );
      } else {
        audio.handWin();
        ui.spawnConfetti(28);
        const kotText = payload.isKot ? ' — a KOT (7–0 shutout)! Worth double.' : '';
        ui.showResultModal(
          `${ui.teamName(payload.winningTeam)} win the hand!`,
          `Tricks: ${payload.teamTricks[0]}–${payload.teamTricks[1]}${kotText}`,
          () => {
            beginNewHand();
          }
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
  ui.clearTrickArea();
  game.startMatch();
}

function init() {
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
