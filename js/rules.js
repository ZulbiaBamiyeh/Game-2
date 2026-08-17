// Hokm game engine — pure game logic, no DOM. Emits events UI/AI can subscribe to.
import { makeDeck, shuffle, SUITS } from './deck.js';

export const SEAT_NAMES = ['South', 'West', 'North', 'East'];
export const HUMAN_SEAT = 0;

export function teamOf(seat) {
  return seat % 2; // 0 & 2 = Team A (You + North), 1 & 3 = Team B
}

export function partnerOf(seat) {
  return (seat + 2) % 4;
}

export class HokmGame {
  constructor({ targetHandWins = 7 } = {}) {
    this.targetHandWins = targetHandWins;
    this.listeners = {};
    this.matchScore = [0, 0];
    this.hakemSeat = Math.floor(Math.random() * 4);
    this.handsPlayed = 0;
    this.reset();
  }

  on(event, cb) {
    (this.listeners[event] ||= []).push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter((f) => f !== cb);
    };
  }

  emit(event, payload) {
    (this.listeners[event] || []).forEach((cb) => cb(payload));
  }

  reset() {
    this.hands = [[], [], [], []];
    this.trumpSuit = null;
    this.tricksWon = [0, 0, 0, 0]; // per seat, for display
    this.teamTricks = [0, 0]; // per team
    this.currentTrick = null; // { leader, ledSuit, plays: [{seat, card}] }
    this.trickLeader = null;
    this.phase = 'idle'; // idle -> choosing-trump -> playing -> hand-over
    this.trickHistory = [];
  }

  startMatch() {
    this.matchScore = [0, 0];
    this.handsPlayed = 0;
    this.startHand();
  }

  startHand() {
    this.reset();
    if (this.handsPlayed > 0) {
      this.hakemSeat = (this.hakemSeat + 1) % 4;
    }
    this.handsPlayed++;

    const deck = shuffle(makeDeck());
    // Deal 5 cards to each player, starting from the hakem, for trump selection.
    for (let i = 0; i < 5; i++) {
      for (let s = 0; s < 4; s++) {
        const seat = (this.hakemSeat + s) % 4;
        this.hands[seat].push(deck.pop());
      }
    }
    this.deckRemainder = deck;
    this.phase = 'choosing-trump';
    this.emit('hand-start', {
      hakemSeat: this.hakemSeat,
      handNumber: this.handsPlayed,
    });
    this.emit('initial-deal', { hands: this.hands });
  }

  getHakemHand() {
    return this.hands[this.hakemSeat];
  }

  chooseTrump(suit) {
    if (this.phase !== 'choosing-trump') throw new Error('Not choosing trump now');
    if (!SUITS.includes(suit)) throw new Error('Invalid suit');
    this.trumpSuit = suit;
    // Deal remaining 8 cards to each player, starting from the hakem.
    for (let i = 0; i < 8; i++) {
      for (let s = 0; s < 4; s++) {
        const seat = (this.hakemSeat + s) % 4;
        this.hands[seat].push(this.deckRemainder.pop());
      }
    }
    this.phase = 'playing';
    this.trickLeader = this.hakemSeat;
    this.emit('trump-chosen', { suit, hakemSeat: this.hakemSeat });
    this.startTrick();
    this.emit('final-deal', { hands: this.hands });
  }

  startTrick() {
    this.currentTrick = { leader: this.trickLeader, ledSuit: null, plays: [] };
    this.emit('trick-start', {
      leader: this.trickLeader,
      trickIndex: this.trickHistory.length,
    });
  }

  /**
   * A seat's-eye view of the game, containing only what that player is
   * entitled to know: their own hand, the cards on the table, the trump, how
   * many cards everyone else is holding, and the completed tricks.
   *
   * Bots are given this instead of the game itself so that partners cannot see
   * each other's cards — the hidden hands simply are not reachable from here,
   * rather than merely being left alone by convention.
   */
  viewFor(seat) {
    const game = this;
    const trick = this.currentTrick;
    return {
      seat,
      hand: this.hands[seat].slice(),
      trumpSuit: this.trumpSuit,
      currentTrick: trick && {
        leader: trick.leader,
        ledSuit: trick.ledSuit,
        plays: trick.plays.map((p) => ({ seat: p.seat, card: p.card })),
      },
      // Public: everyone can see how many cards each player still holds and
      // which cards have already been played.
      handSizes: this.hands.map((h) => h.length),
      trickHistory: this.trickHistory.map((t) => ({
        winner: t.winner,
        plays: t.plays.slice(),
      })),
      getValidMoves: () => game.getValidMoves(seat),
      beats: (play, currentWinner, ledSuit) => game.beats(play, currentWinner, ledSuit),
    };
  }

  getValidMoves(seat) {
    const hand = this.hands[seat];
    const led = this.currentTrick?.ledSuit;
    if (!led) return hand.slice();
    const followers = hand.filter((c) => c.suit === led);
    return followers.length ? followers : hand.slice();
  }

  isValidMove(seat, card) {
    return this.getValidMoves(seat).some((c) => c.id === card.id);
  }

  playCard(seat, card) {
    if (this.phase !== 'playing') throw new Error('Not in playing phase');
    if (seat !== this.currentTurnSeat()) throw new Error('Not this seat\'s turn');
    if (!this.isValidMove(seat, card)) throw new Error('Invalid move');

    const hand = this.hands[seat];
    const idx = hand.findIndex((c) => c.id === card.id);
    hand.splice(idx, 1);

    if (!this.currentTrick.ledSuit) this.currentTrick.ledSuit = card.suit;
    this.currentTrick.plays.push({ seat, card });
    this.emit('card-played', { seat, card });

    if (this.currentTrick.plays.length === 4) {
      this.resolveTrick();
    } else {
      this.emit('turn-changed', { seat: this.currentTurnSeat() });
    }
  }

  currentTurnSeat() {
    const n = this.currentTrick.plays.length;
    return (this.currentTrick.leader + n) % 4;
  }

  resolveTrick() {
    const { ledSuit, plays } = this.currentTrick;
    let winner = plays[0];
    for (const play of plays.slice(1)) {
      winner = this.beats(play, winner, ledSuit) ? play : winner;
    }
    const winSeat = winner.seat;
    this.tricksWon[winSeat]++;
    this.teamTricks[teamOf(winSeat)]++;
    this.trickHistory.push({ plays: plays.slice(), winner: winSeat });

    this.emit('trick-end', {
      winner: winSeat,
      plays: plays.slice(),
      teamTricks: this.teamTricks.slice(),
    });

    if (this.teamTricks[0] >= 7 || this.teamTricks[1] >= 7) {
      this.endHand();
      return;
    }

    this.trickLeader = winSeat;
    this.startTrick();
  }

  beats(play, currentWinner, ledSuit) {
    const trump = this.trumpSuit;
    const a = play.card;
    const b = currentWinner.card;
    const aTrump = a.suit === trump;
    const bTrump = b.suit === trump;
    if (aTrump && !bTrump) return true;
    if (!aTrump && bTrump) return false;
    if (aTrump && bTrump) return a.rank > b.rank;
    // Neither trump: only cards of the led suit can win.
    if (a.suit === ledSuit && b.suit === ledSuit) return a.rank > b.rank;
    if (a.suit === ledSuit && b.suit !== ledSuit) return true;
    return false;
  }

  endHand() {
    this.phase = 'hand-over';
    const winningTeam = this.teamTricks[0] >= 7 ? 0 : 1;
    const losingTeam = 1 - winningTeam;
    const isKot = this.teamTricks[losingTeam] === 0;
    const points = isKot ? 2 : 1;
    this.matchScore[winningTeam] += points;

    const matchOver = this.matchScore[winningTeam] >= this.targetHandWins;
    this.emit('hand-end', {
      winningTeam,
      isKot,
      points,
      teamTricks: this.teamTricks.slice(),
      matchScore: this.matchScore.slice(),
      matchOver,
    });

    if (matchOver) {
      this.phase = 'match-over';
      this.emit('match-end', { winningTeam, matchScore: this.matchScore.slice() });
    }
  }
}
