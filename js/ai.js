// Heuristic bot logic for Hokm: trump selection and card play.
//
// These functions deliberately take a seat's-eye VIEW of the game rather than
// the game itself (see HokmGame#viewFor). The hidden hands are not reachable
// through a view, so partners cannot see each other's cards and no bot can see
// yours — the bots decide from their own hand plus what is public at the table.
import { SUITS } from './deck.js';
import { teamOf } from './rules.js';

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

function currentWinningPlay(view) {
  const { ledSuit, plays } = view.currentTrick;
  let winner = plays[0];
  for (const play of plays.slice(1)) {
    winner = view.beats(play, winner, ledSuit) ? play : winner;
  }
  return winner;
}

export function chooseCardAI(view) {
  const valid = view.getValidMoves();
  if (valid.length === 1) return valid[0];

  const trump = view.trumpSuit;
  const trick = view.currentTrick;
  const isLeading = trick.plays.length === 0;

  if (isLeading) {
    return chooseLead(view, valid);
  }

  const winningPlay = currentWinningPlay(view);
  const partnerWinning = teamOf(winningPlay.seat) === teamOf(view.seat);
  const ledSuit = trick.ledSuit;
  const canFollow = valid.some((c) => c.suit === ledSuit);

  if (partnerWinning) {
    // Partner is ahead: don't waste strength, dump the lowest legal card.
    return lowestCard(valid);
  }

  // An opponent is currently winning this trick — try to take it.
  const winners = valid.filter((c) => view.beats({ card: c }, { card: winningPlay.card }, ledSuit));
  if (winners.length) {
    return cheapestWinner(winners, ledSuit);
  }

  if (canFollow) {
    // Can't win by following suit — dump the lowest card of that suit.
    return lowestCard(valid.filter((c) => c.suit === ledSuit));
  }

  // Can't follow and can't win — discard a low non-trump if possible so the
  // trumps stay available for later tricks.
  const nonTrump = valid.filter((c) => c.suit !== trump);
  return lowestCard(nonTrump.length ? nonTrump : valid);
}

function cheapestWinner(winners, ledSuit) {
  const following = winners.filter((c) => c.suit === ledSuit);
  const pool = following.length ? following : winners;
  return pool.slice().sort((a, b) => a.rank - b.rank)[0];
}

function lowestCard(cards) {
  return cards.slice().sort((a, b) => a.rank - b.rank)[0];
}

function highestCard(cards) {
  return cards.slice().sort((a, b) => b.rank - a.rank)[0];
}

function chooseLead(view, valid) {
  const trump = view.trumpSuit;

  const bySuit = {};
  for (const c of valid) (bySuit[c.suit] ||= []).push(c);

  // Prefer leading a non-trump suit where we hold the top card.
  const nonTrumpSuits = Object.keys(bySuit).filter((s) => s !== trump);
  for (const suit of nonTrumpSuits) {
    const cards = bySuit[suit].slice().sort((a, b) => b.rank - a.rank);
    if (cards[0].rank === 14 || cards[0].rank === 13) {
      return cards[0];
    }
  }

  // Otherwise lead our longest non-trump suit with its highest card, to
  // eventually establish it once trumps have been drawn out.
  if (nonTrumpSuits.length) {
    const longest = nonTrumpSuits
      .slice()
      .sort((a, b) => bySuit[b].length - bySuit[a].length)[0];
    return highestCard(bySuit[longest]);
  }

  // Only trump left — lead it.
  return highestCard(valid);
}
