// Card model and deck utilities for Hokm.

export const SUITS = ['S', 'H', 'D', 'C'];

export const SUIT_INFO = {
  S: { symbol: '♠', name: 'Spades', color: 'dark' },
  H: { symbol: '♥', name: 'Hearts', color: 'red' },
  D: { symbol: '♦', name: 'Diamonds', color: 'red' },
  C: { symbol: '♣', name: 'Clubs', color: 'dark' },
};

const RANK_LABELS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export function rankLabel(rank) {
  return RANK_LABELS[rank] || String(rank);
}

export function cardId(card) {
  return `${card.rank}${card.suit}`;
}

export function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return deck;
}

export function shuffle(deck, rng = Math.random) {
  const arr = deck.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sortHand(cards, trumpSuit) {
  const suitOrder = trumpSuit
    ? [trumpSuit, ...SUITS.filter((s) => s !== trumpSuit)]
    : SUITS;
  return cards.slice().sort((a, b) => {
    const sa = suitOrder.indexOf(a.suit);
    const sb = suitOrder.indexOf(b.suit);
    if (sa !== sb) return sa - sb;
    return b.rank - a.rank;
  });
}
