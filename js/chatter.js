// Table talk. Lines are chosen from what actually happened in the trick — who
// cut whom, whose king went down, who over-trumped — so the bots sound like
// they are watching the same game you are. Each candidate names the role that
// should say it; the caller resolves that to a seat.
//
// Roles:
//   partner — the player's partner
//   winner  — whoever took the trick (only used when that isn't the player)
//   beaten  — whoever played the card the winner beat (likewise)

const RANK_NAME = {
  14: 'ace', 13: 'king', 12: 'queen', 11: 'jack', 10: 'ten',
  9: 'nine', 8: 'eight', 7: 'seven', 6: 'six', 5: 'five', 4: 'four',
  3: 'three', 2: 'two',
};
export const rankName = (rank) => RANK_NAME[rank] || String(rank);
/** Rank name for the start of a sentence. */
const Rank = (rank) => {
  const n = rankName(rank);
  return n.charAt(0).toUpperCase() + n.slice(1);
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Candidate lines for a finished trick.
 *
 * ctx: { winnerIsHuman, winnerIsPartner, beatenIsHuman, beatenIsPartner,
 *        trumped, overTrumped, beatenRank, beatenWasHigh, winnerRank }
 */
export function trickTalk(ctx) {
  const {
    winnerIsHuman, winnerIsPartner, beatenIsHuman, beatenIsPartner,
    trumped, overTrumped, beatenRank, beatenWasHigh, winnerRank,
  } = ctx;
  const beaten = rankName(beatenRank);
  const played = rankName(winnerRank);
  const out = [];

  // --- someone cut in with the Hokm ---
  if (trumped) {
    if (overTrumped) {
      if (!winnerIsHuman && !winnerIsPartner) {
        out.push({ role: 'winner', text: `Higher trump, friend.` });
        out.push({ role: 'winner', text: `You cut. I cut better.` });
      }
      if (winnerIsHuman) out.push({ role: 'partner', text: `Over their trump as well! Ruthless.` });
      if (winnerIsPartner) out.push({ role: 'partner', text: `Their trump wasn't big enough.` });
    } else if (winnerIsHuman) {
      out.push({ role: 'partner', text: `Nice cut, partner.` });
      out.push({ role: 'partner', text: `That is what the Hokm is for.` });
      if (beatenWasHigh) {
        out.push({ role: 'partner', text: `You cut their ${beaten}! We wrecked them.` });
        out.push({ role: 'beaten', text: `My ${beaten}... cut down.` });
      } else {
        out.push({ role: 'beaten', text: `Out of that suit already?` });
      }
    } else if (winnerIsPartner) {
      out.push({ role: 'partner', text: `Cut. Clean.` });
      out.push({ role: 'partner', text: `I had the Hokm waiting all along.` });
      if (beatenWasHigh) out.push({ role: 'partner', text: `Their ${beaten} goes down. Ours.` });
    } else {
      out.push({ role: 'winner', text: `The Hokm decides, not your ${beaten}.` });
      out.push({ role: 'winner', text: `I cut. Sorry, not sorry.` });
      if (beatenIsHuman) out.push({ role: 'partner', text: `Ah — they were out of that suit.` });
    }
    return out;
  }

  // --- a high card went down without a cut ---
  if (beatenWasHigh) {
    if (winnerIsHuman) {
      out.push({ role: 'partner', text: `Your ${played} over their ${beaten}. Beautiful.` });
      out.push({ role: 'partner', text: `Straight over the top of them!` });
      out.push({ role: 'beaten', text: `Not my ${beaten}...` });
    } else if (winnerIsPartner) {
      out.push({ role: 'partner', text: `My ${played} takes their ${beaten}.` });
      out.push({ role: 'partner', text: `That is ours, partner.` });
    } else {
      out.push({ role: 'winner', text: `Your ${beaten} was not enough.` });
      out.push({ role: 'winner', text: `${Rank(winnerRank)} beats ${beaten}. Every time.` });
      if (beatenIsHuman) out.push({ role: 'partner', text: `Save the big ones, partner.` });
    }
    return out;
  }

  // --- an ordinary trick ---
  if (winnerIsHuman) {
    out.push({ role: 'partner', text: `Good, keep them coming.` });
    out.push({ role: 'beaten', text: `Take it. It changes nothing.` });
  } else if (winnerIsPartner) {
    out.push({ role: 'partner', text: `Got it, partner.` });
    out.push({ role: 'partner', text: `We're rolling now.` });
  } else {
    out.push({ role: 'winner', text: `That one's mine.` });
    out.push({ role: 'winner', text: `Too slow.` });
    out.push({ role: 'winner', text: `Thanks for the gift.` });
    if (beatenIsPartner) out.push({ role: 'winner', text: `Your partner will not save you.` });
  }
  return out;
}

export function trumpCallLine(suitName) {
  return pick([
    `Hokm is ${suitName}. Trust me.`,
    `${suitName}. Let us play.`,
    `We ride on ${suitName} tonight.`,
    `${suitName} it is. Deal them.`,
  ]);
}

export function handEndLine(isPartner, won, isKot) {
  if (won) {
    if (isKot) {
      return pick(isPartner
        ? ['KOT! They got nothing!', 'Seven–nil, partner!']
        : ['KOT! Not one trick for you.', 'Seven to nothing. Brutal.']);
    }
    return pick(isPartner
      ? ['That is the hand!', 'Beautiful, partner.', 'We take it.']
      : ['Seven. Done.', 'Book it.', 'Told you.', 'That is how it is played.']);
  }
  return isKot ? pick(['...not a single trick.', 'Never speak of this hand.']) : null;
}

export { pick };
