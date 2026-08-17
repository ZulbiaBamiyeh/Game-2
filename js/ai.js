// Heuristic bot logic for Hokm: trump selection and card play.
import { SUITS } from './deck.js';
import { teamOf, partnerOf } from './rules.js';

export function chooseTrumpAI(hand) {
  const counts = {};
  const strength = {};
  for (const suit of SUITS) {
    counts[suit] = 0;
    strength[suit] = 0;
  }
  for (const card of hand) {
    counts[card.suit]++;
    strength[card.suit] += card.rank;
  }
  return SUITS.slice().sort((a, b) => {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return strength[b] - strength[a];
  })[0];
}

function currentWinningPlay(game) {
  const { ledSuit, plays } = game.currentTrick;
  let winner = plays[0];
  for (const play of plays.slice(1)) {
    winner = game.beats(play, winner, ledSuit) ? play : winner;
  }
  return winner;
}

export function chooseCardAI(game, seat) {
  const valid = game.getValidMoves(seat);
  if (valid.length === 1) return valid[0];

  const trump = game.trumpSuit;
  const trick = game.currentTrick;
  const isLeading = trick.plays.length === 0;

  if (isLeading) {
    return chooseLead(game, seat, valid);
  }

  const winningPlay = currentWinningPlay(game);
  const partnerWinning = teamOf(winningPlay.seat) === teamOf(seat);
  const isLastToPlay = trick.plays.length === 3;
  const ledSuit = trick.ledSuit;
  const canFollow = valid.some((c) => c.suit === ledSuit);

  if (partnerWinning) {
    // Partner is ahead: don't waste strength. Dump the lowest legal card,
    // unless it's cheap to add a bit more strength on the last play only
    // when it can't be beaten by the opponent (already resolved by then).
    return lowestCard(valid);
  }

  // Opponent is currently winning this trick — try to take it.
  const winners = valid.filter((c) => beatsHypothetically(game, c, winningPlay.card, ledSuit));
  if (winners.length) {
    // Win as cheaply as possible.
    return cheapestWinner(winners, trump, ledSuit);
  }

  if (canFollow) {
    // Can't win by following suit — dump the lowest card of that suit.
    return lowestCard(valid.filter((c) => c.suit === ledSuit));
  }

  // Can't follow and can't win — discard lowest non-trump if possible to
  // preserve trump for later, otherwise lowest trump.
  const nonTrump = valid.filter((c) => c.suit !== trump);
  return lowestCard(nonTrump.length ? nonTrump : valid);
}

function beatsHypothetically(game, card, opponentCard, ledSuit) {
  return game.beats({ card }, { card: opponentCard }, ledSuit);
}

function cheapestWinner(winners, trump, ledSuit) {
  const nonTrumpWinners = winners.filter((c) => c.suit === ledSuit);
  const pool = nonTrumpWinners.length ? nonTrumpWinners : winners;
  return pool.slice().sort((a, b) => a.rank - b.rank)[0];
}

function lowestCard(cards) {
  return cards.slice().sort((a, b) => a.rank - b.rank)[0];
}

function highestCard(cards) {
  return cards.slice().sort((a, b) => b.rank - a.rank)[0];
}

function chooseLead(game, seat, valid) {
  const trump = game.trumpSuit;
  const hand = game.hands[seat];
  const partner = partnerOf(seat);

  // Count how many cards remain in each suit for this player.
  const bySuit = {};
  for (const c of valid) (bySuit[c.suit] ||= []).push(c);

  // Prefer leading a strong non-trump suit where we hold the top card.
  const nonTrumpSuits = Object.keys(bySuit).filter((s) => s !== trump);
  for (const suit of nonTrumpSuits) {
    const cards = bySuit[suit].slice().sort((a, b) => b.rank - a.rank);
    if (cards[0].rank === 14 || cards[0].rank === 13) {
      return cards[0];
    }
  }

  // Otherwise lead our longest non-trump suit with its highest card, to
  // eventually establish it once trumps are drawn out.
  if (nonTrumpSuits.length) {
    const longest = nonTrumpSuits
      .slice()
      .sort((a, b) => bySuit[b].length - bySuit[a].length)[0];
    return highestCard(bySuit[longest]);
  }

  // Only trump left — lead it.
  return highestCard(valid);
}
