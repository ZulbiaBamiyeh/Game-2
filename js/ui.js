// DOM rendering, card artwork, and the animation "juice" for the Hokm table.
import { SUIT_INFO, rankLabel, sortHand } from './deck.js';
import { suitSVG } from './suits.js';


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
  tricksTeamA: $('#tricks-team-a'),
  tricksTeamB: $('#tricks-team-b'),
  tricksBarA: $('#tricks-bar-a'),
  tricksBarB: $('#tricks-bar-b'),
  panelA: $('#panel-a'),
  panelB: $('#panel-b'),
  pipsA: $('#pips-a'),
  pipsB: $('#pips-b'),
  hakemBanner: $('#hakem-banner'),
  trumpBanner: $('#trump-banner'),
  btnMuteMusic: $('#btn-mute-music'),
  btnMuteSfx: $('#btn-mute-sfx'),
  btnDeck: $('#btn-deck'),
  chkContrast: $('#chk-contrast'),
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
  app: $('#app'),
};

// Seat 0 is always the player; the other three get names drawn per match.
const SEAT_POSITION = ['You', 'West', 'North', 'East'];
let seatLabels = SEAT_POSITION.slice();

export function seatName(seat) {
  return seatLabels[seat];
}
export function seatPosition(seat) {
  return SEAT_POSITION[seat];
}
export function teamName(team) {
  return team === 0
    ? `You & ${seatLabels[2]}`
    : `${seatLabels[1]} & ${seatLabels[3]}`;
}

/** Name the three bots and write those names into the table furniture. */
export function setSeatNames(names) {
  seatLabels = ['You', names[0], names[1], names[2]];
  document.querySelector('#seat-1 .seat-name').textContent = names[0];
  document.querySelector('#seat-2 .seat-name').textContent = names[1];
  document.querySelector('#seat-3 .seat-name').textContent = names[2];
  document.querySelector('#team-a-seats').textContent = `You + ${names[1]}`;
  document.querySelector('#team-b-seats').textContent = `${names[0]} + ${names[2]}`;
}

/** A short-lived speech bubble beside a seat. */
export function showSpeech(seat, text) {
  const host = document.getElementById(`seat-${seat}`);
  if (!host) return;
  host.querySelectorAll('.speech').forEach((n) => n.remove());
  const bubble = document.createElement('div');
  bubble.className = 'speech';
  bubble.textContent = text;
  host.appendChild(bubble);
  setTimeout(() => bubble.classList.add('leaving'), 2600);
  setTimeout(() => bubble.remove(), 3100);
}

export function showScreen(name) {
  [el.screenStart, el.screenHowto, el.screenGame].forEach((s) => s.classList.add('hidden'));
  if (name === 'start') el.screenStart.classList.remove('hidden');
  if (name === 'howto') el.screenHowto.classList.remove('hidden');
  if (name === 'game') el.screenGame.classList.remove('hidden');
}

// ---------- card artwork ----------

// Card faces come from a deck sprite sheet: 13 columns (A,2..10,J,Q,K) by
// 4 rows (spades, hearts, clubs, diamonds). Which sheet is used — the standard
// deck or the high-contrast one — is a CSS variable, so switching decks
// restyles every card on screen without re-rendering anything.
const SUIT_ROW = { S: 0, H: 1, C: 2, D: 3 };
const cardColumn = (rank) => (rank === 14 ? 0 : rank - 1);

export function createCardFace(card, { small = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `card suit-${card.suit.toLowerCase()}${small ? ' card-sm' : ''}`;
  wrap.dataset.id = card.id;
  wrap.style.setProperty('--col', cardColumn(card.rank));
  wrap.style.setProperty('--row', SUIT_ROW[card.suit]);
  wrap.innerHTML = '<div class="card-inner"><div class="card-face"></div></div>';
  return wrap;
}

// The back is one shared data-URI image rather than per-card SVG: with three
// opponents holding thirteen cards each, inlining it would add thousands of
// rects to the DOM for no visual gain.
function createCardBack() {
  const div = document.createElement('div');
  div.className = 'card-back';
  return div;
}

// ---------- hands ----------

export function renderOpponentHand(seat, count) {
  const container = document.getElementById(`hand-${seat}`);
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const back = createCardBack();
    back.style.setProperty('--i', i);
    container.appendChild(back);
  }
}

/** Tilt a card toward the cursor for a subtle parallax on hover. */
function attachTilt(cardEl) {
  const inner = cardEl.querySelector('.card-inner');
  cardEl.addEventListener('mousemove', (e) => {
    const rect = cardEl.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    inner.style.setProperty('--tilt-y', `${px * 22}deg`);
    inner.style.setProperty('--tilt-x', `${-py * 18}deg`);
  });
  cardEl.addEventListener('mouseleave', () => {
    inner.style.setProperty('--tilt-y', '0deg');
    inner.style.setProperty('--tilt-x', '0deg');
  });
}

export function renderSouthHand(cards, trumpSuit, { interactive, validIds, onPlay } = {}) {
  const container = document.getElementById('hand-0');
  container.innerHTML = '';
  const sorted = sortHand(cards, trumpSuit);
  const n = sorted.length;
  sorted.forEach((card, i) => {
    const cardEl = createCardFace(card);
    const mid = (n - 1) / 2;
    const offset = n > 1 ? i - mid : 0;
    // Fan the hand along a shallow arc.
    cardEl.style.setProperty('--rot', `${offset * 3.2}deg`);
    cardEl.style.setProperty('--lift', `${Math.abs(offset) * Math.abs(offset) * 1.1}px`);
    cardEl.style.setProperty('--i', i);
    cardEl.style.zIndex = i;

    if (trumpSuit && card.suit === trumpSuit) cardEl.classList.add('is-trump');

    if (interactive) {
      const isValid = validIds.has(card.id);
      cardEl.classList.add(isValid ? 'playable' : 'disabled');
      if (isValid) {
        attachTilt(cardEl);
        cardEl.addEventListener('click', () => onPlay(card));
      }
    }
    container.appendChild(cardEl);
  });
}

// ---------- HUD ----------

export function updateTrickCounts(tricksWon) {
  for (let s = 0; s < 4; s++) {
    const node = document.getElementById(`tricks-${s}`);
    if (node.textContent !== String(tricksWon[s])) {
      node.textContent = tricksWon[s];
      pop(node);
    }
  }
}

/**
 * Show each team's pooled trick count for the current hand. Without this the
 * only visible numbers are per-seat counts and the hand-point score, which
 * makes a team's progress toward winning the hand invisible.
 */
export function updateTeamTricks(teamTricks) {
  const cells = [
    [el.tricksTeamA, el.tricksBarA, teamTricks[0]],
    [el.tricksTeamB, el.tricksBarB, teamTricks[1]],
  ];
  for (const [label, bar, value] of cells) {
    if (label.textContent !== String(value)) {
      label.textContent = value;
      pop(label);
    }
    bar.style.width = `${Math.min(value / 7, 1) * 100}%`;
    bar.classList.toggle('is-full', value >= 7);
  }
}

const TARGET_POINTS = 7;

/** Row of point markers filling up as a team banks hand wins. */
function renderPips(container, value) {
  if (container.childElementCount !== TARGET_POINTS) {
    container.innerHTML = '';
    for (let i = 0; i < TARGET_POINTS; i++) {
      container.appendChild(document.createElement('i'));
    }
  }
  [...container.children].forEach((pip, i) => {
    const lit = i < value;
    if (lit && !pip.classList.contains('lit')) {
      pip.classList.add('lit', 'just-lit');
      setTimeout(() => pip.classList.remove('just-lit'), 600);
    } else if (!lit) {
      pip.classList.remove('lit', 'just-lit');
    }
  });
}

export function updateScores(matchScore, bumpTeam = null) {
  el.scoreA.textContent = matchScore[0];
  el.scoreB.textContent = matchScore[1];
  renderPips(el.pipsA, matchScore[0]);
  renderPips(el.pipsB, matchScore[1]);
  if (bumpTeam === 0) pop(el.scoreA);
  if (bumpTeam === 1) pop(el.scoreB);

  // Mark whichever side is ahead so the standing reads at a glance.
  const [a, b] = matchScore;
  el.panelA.classList.toggle('is-leading', a > b);
  el.panelB.classList.toggle('is-leading', b > a);
}

function pop(node, cls = 'pop') {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

export function setHakemBanner(text) {
  el.hakemBanner.textContent = text;
}

export function setTrumpBanner(suit) {
  if (!suit) {
    el.trumpBanner.innerHTML = '';
    el.trumpBanner.className = 'pill trump-pill';
    return;
  }
  el.trumpBanner.innerHTML = `<span>HOKM</span>${suitSVG(suit, 'pill-suit')}<span>${SUIT_INFO[suit].name}</span>`;
  el.trumpBanner.className = `pill trump-pill is-set suit-${suit.toLowerCase()}`;
  pop(el.trumpBanner);
}

export function setActiveSeat(seat) {
  for (let s = 0; s < 4; s++) {
    document.getElementById(`seat-${s}`).classList.toggle('active-turn', s === seat);
  }
}

export function setTurnText(text) {
  el.turnIndicator.textContent = text;
}

// ---------- trick area ----------

export function placeCardInTrick(seat, card) {
  const slot = document.getElementById(`slot-${seat}`);
  slot.innerHTML = '';
  const cardEl = createCardFace(card);
  // A small random skew makes the pile look hand-dealt rather than snapped to a grid.
  cardEl.style.setProperty('--rot', `${(Math.random() - 0.5) * 14}deg`);
  cardEl.classList.add('playing');
  slot.appendChild(cardEl);
  el.trickArea.classList.add('has-cards');
  return cardEl;
}

export function clearTrickArea() {
  let sweeping = false;
  for (let s = 0; s < 4; s++) {
    const slot = document.getElementById(`slot-${s}`);
    const card = slot.querySelector('.card');
    if (card) {
      sweeping = true;
      card.classList.add('sweeping');
      setTimeout(() => {
        if (card.parentNode === slot) slot.innerHTML = '';
      }, 320);
    } else {
      slot.innerHTML = '';
    }
  }
  // Hold the "cards present" state until the sweep finishes, so the turn
  // prompt doesn't flash back in behind the outgoing cards.
  if (sweeping) {
    setTimeout(() => el.trickArea.classList.remove('has-cards'), 320);
  } else {
    el.trickArea.classList.remove('has-cards');
  }
}

export function glowWinner(seat) {
  const slot = document.getElementById(`slot-${seat}`);
  const cardEl = slot.querySelector('.card');
  if (!cardEl) return null;
  cardEl.classList.add('winner-glow');
  return cardEl;
}

// ---------- juice ----------

export function screenShake(strength = 1) {
  el.app.style.setProperty('--shake', strength);
  el.app.classList.remove('shaking');
  void el.app.offsetWidth;
  el.app.classList.add('shaking');
  setTimeout(() => el.app.classList.remove('shaking'), 420);
}

export function shakeTable() {
  el.table.classList.remove('shake');
  void el.table.offsetWidth;
  el.table.classList.add('shake');
}

const BURST_COLORS = ['#ffcf3f', '#ff5470', '#43d9ff', '#4ef08e', '#c08cff'];

/** Radial spark burst centred on an element. */
export function burstAt(target, count = 18) {
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.className = 'spark';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 60 + Math.random() * 90;
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    spark.style.background = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
    spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    spark.style.animationDuration = `${0.5 + Math.random() * 0.4}s`;
    el.particles.appendChild(spark);
    setTimeout(() => spark.remove(), 1000);
  }
}

/** Floating text that rises and fades — used for trick and score callouts. */
export function floatText(target, text, variant = '') {
  const rect = target.getBoundingClientRect();
  const node = document.createElement('div');
  node.className = `float-text ${variant}`;
  node.textContent = text;
  node.style.left = `${rect.left + rect.width / 2}px`;
  node.style.top = `${rect.top + rect.height / 2}px`;
  el.particles.appendChild(node);
  setTimeout(() => node.remove(), 1200);
}

let logTimer = null;
export function log(message) {
  el.log.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = message;
  el.log.appendChild(span);
}

// ---------- modals ----------

export function showTrumpModal(hand, onChoose) {
  el.hakemPreview.innerHTML = '';
  sortHand(hand).forEach((card, i) => {
    const cardEl = createCardFace(card, { small: true });
    cardEl.style.setProperty('--rot', '0deg');
    cardEl.style.animationDelay = `${i * 60}ms`;
    cardEl.classList.add('deal-pop');
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

export function showResultModal(title, detail, onContinue, { grand = false } = {}) {
  el.resultTitle.textContent = title;
  el.resultDetail.textContent = detail;
  el.modalResult.querySelector('.modal-card').classList.toggle('is-grand', grand);
  el.modalResult.classList.remove('hidden');
  const btn = el.btnContinue;
  const handler = () => {
    btn.removeEventListener('click', handler);
    el.modalResult.classList.add('hidden');
    onContinue();
  };
  btn.addEventListener('click', handler);
}

const CONFETTI_COLORS = ['#ffcf3f', '#ff5470', '#43d9ff', '#4ef08e', '#c08cff', '#ffffff'];
export function spawnConfetti(count = 36) {
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${10 + Math.random() * 10}px`;
    const duration = 1.8 + Math.random() * 1.6;
    piece.style.animationDuration = `${duration}s`;
    piece.style.animationDelay = `${Math.random() * 0.5}s`;
    piece.style.setProperty('--spin', `${360 + Math.random() * 720}deg`);
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 240}px`);
    el.particles.appendChild(piece);
    setTimeout(() => piece.remove(), (duration + 0.7) * 1000);
  }
}
