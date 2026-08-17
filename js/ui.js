// DOM rendering and animation helpers for the Hokm table.
import { SUIT_INFO, rankLabel, sortHand } from './deck.js';

const $ = (sel) => document.querySelector(sel);

export const el = {
  screenStart: $('#screen-start'),
  screenHowto: $('#screen-howto'),
  screenGame: $('#screen-game'),
  btnStart: $('#btn-start'),
  btnHowto: $('#btn-howto'),
  btnHowtoClose: $('#btn-howto-close'),
  chkMusic: $('#chk-music'),
  chkSfx: $('#chk-sfx'),
  scoreA: $('#score-a'),
  scoreB: $('#score-b'),
  hakemBanner: $('#hakem-banner'),
  trumpBanner: $('#trump-banner'),
  btnMuteMusic: $('#btn-mute-music'),
  btnMuteSfx: $('#btn-mute-sfx'),
  table: $('#table'),
  trickArea: $('#trick-area'),
  turnIndicator: $('#turn-indicator'),
  log: $('#log'),
  modalTrump: $('#modal-trump'),
  hakemPreview: $('#hakem-preview'),
  suitPicker: $('#suit-picker'),
  modalResult: $('#modal-result'),
  resultTitle: $('#result-title'),
  resultDetail: $('#result-detail'),
  btnContinue: $('#btn-continue'),
  particles: $('#particles'),
};

const SEAT_LABEL = ['You', 'West', 'North', 'East'];
export function seatName(seat) {
  return SEAT_LABEL[seat];
}
export function teamName(team) {
  return team === 0 ? 'You & North' : 'West & East';
}

export function showScreen(name) {
  [el.screenStart, el.screenHowto, el.screenGame].forEach((s) => s.classList.add('hidden'));
  if (name === 'start') el.screenStart.classList.remove('hidden');
  if (name === 'howto') el.screenHowto.classList.remove('hidden');
  if (name === 'game') el.screenGame.classList.remove('hidden');
}

export function createCardFace(card) {
  const info = SUIT_INFO[card.suit];
  const div = document.createElement('div');
  div.className = `card ${info.color}`;
  div.dataset.id = card.id;
  const label = rankLabel(card.rank);
  div.innerHTML = `
    <div class="corner top">${label}<br>${info.symbol}</div>
    <div class="pip">${info.symbol}</div>
    <div class="corner bottom">${label}<br>${info.symbol}</div>
  `;
  return div;
}

function createCardBack() {
  const div = document.createElement('div');
  div.className = 'card-back';
  return div;
}

export function renderOpponentHand(seat, count) {
  const container = document.getElementById(`hand-${seat}`);
  container.innerHTML = '';
  for (let i = 0; i < count; i++) container.appendChild(createCardBack());
}

export function renderSouthHand(cards, trumpSuit, { interactive, validIds, onPlay } = {}) {
  const container = document.getElementById('hand-0');
  container.innerHTML = '';
  const sorted = sortHand(cards, trumpSuit);
  const n = sorted.length;
  sorted.forEach((card, i) => {
    const cardEl = createCardFace(card);
    const rot = n > 1 ? (i - (n - 1) / 2) * 3.5 : 0;
    cardEl.style.setProperty('--rot', `${rot}deg`);
    if (interactive) {
      const isValid = validIds.has(card.id);
      cardEl.classList.add(isValid ? 'playable' : 'disabled');
      if (isValid) {
        cardEl.addEventListener('click', () => onPlay(card));
      }
    }
    container.appendChild(cardEl);
  });
}

export function updateTrickCounts(tricksWon) {
  for (let s = 0; s < 4; s++) {
    document.getElementById(`tricks-${s}`).textContent = tricksWon[s];
  }
}

export function updateScores(matchScore, bumpTeam = null) {
  el.scoreA.textContent = matchScore[0];
  el.scoreB.textContent = matchScore[1];
  if (bumpTeam === 0) bump(el.scoreA);
  if (bumpTeam === 1) bump(el.scoreB);
}

function bump(node) {
  node.classList.remove('bump');
  void node.offsetWidth;
  node.classList.add('bump');
}

export function setHakemBanner(text) {
  el.hakemBanner.textContent = text;
}

export function setTrumpBanner(suit) {
  if (!suit) {
    el.trumpBanner.textContent = '';
    return;
  }
  const info = SUIT_INFO[suit];
  el.trumpBanner.textContent = `HOKM: ${info.symbol} ${info.name}`;
}

export function setActiveSeat(seat) {
  for (let s = 0; s < 4; s++) {
    document.getElementById(`seat-${s}`).classList.toggle('active-turn', s === seat);
  }
}

export function setTurnText(text) {
  el.turnIndicator.textContent = text;
}

export function placeCardInTrick(seat, card) {
  const slot = document.getElementById(`slot-${seat}`);
  slot.innerHTML = '';
  const cardEl = createCardFace(card);
  cardEl.style.setProperty('--rot', '0deg');
  cardEl.classList.add('playing');
  slot.appendChild(cardEl);
  return cardEl;
}

export function clearTrickArea() {
  for (let s = 0; s < 4; s++) {
    document.getElementById(`slot-${s}`).innerHTML = '';
  }
}

export function glowWinner(seat) {
  const slot = document.getElementById(`slot-${seat}`);
  const cardEl = slot.querySelector('.card');
  if (cardEl) cardEl.classList.add('winner-glow');
}

export function shakeTable() {
  el.table.classList.remove('shake');
  void el.table.offsetWidth;
  el.table.classList.add('shake');
}

let logTimer = null;
export function log(message) {
  el.log.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = message;
  el.log.appendChild(span);
}

export function showTrumpModal(hand, onChoose) {
  el.hakemPreview.innerHTML = '';
  sortHand(hand).forEach((card) => {
    const cardEl = createCardFace(card);
    cardEl.style.setProperty('--rot', '0deg');
    el.hakemPreview.appendChild(cardEl);
  });
  el.modalTrump.classList.remove('hidden');
  const buttons = el.suitPicker.querySelectorAll('.suit-btn');
  const handler = (e) => {
    const suit = e.currentTarget.dataset.suit;
    buttons.forEach((b) => b.removeEventListener('click', handler));
    el.modalTrump.classList.add('hidden');
    onChoose(suit);
  };
  buttons.forEach((b) => b.addEventListener('click', handler));
}

export function showResultModal(title, detail, onContinue) {
  el.resultTitle.textContent = title;
  el.resultDetail.textContent = detail;
  el.modalResult.classList.remove('hidden');
  const btn = el.btnContinue;
  const handler = () => {
    btn.removeEventListener('click', handler);
    el.modalResult.classList.add('hidden');
    onContinue();
  };
  btn.addEventListener('click', handler);
}

const CONFETTI_COLORS = ['#ffd23f', '#ff4d6d', '#3ec9ff', '#3ee089', '#b083ff'];
export function spawnConfetti(count = 30) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const duration = 1.6 + Math.random() * 1.4;
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    el.particles.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + 0.5) * 1000);
  }
}
