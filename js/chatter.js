// Table talk. The bots comment on the play — needling you when they take a
// trick, cheering when your partner does, calling the trump, gloating over a
// hand. Lines are picked by what actually just happened, and gated by chance so
// the table stays lively without turning into a wall of noise.

const OPPONENT_TAKES = [
  "That one's mine.", 'Too slow.', 'Thanks for the gift.', 'Ha! Mine.',
  'Not today, friend.', 'Watch and learn.', 'Easy.', 'You walked into that.',
  'I had that all along.', 'Keep them coming.',
];

const PARTNER_TAKES = [
  'Got it, partner!', 'Leave that to me.', "We're rolling.", 'Nice lead!',
  "That one's ours.", 'Together, always.', 'Good hand, keep going.',
];

const OPPONENT_LOSES = [
  'Lucky.', 'Hmph.', 'Enjoy it while it lasts.', 'That was mine!',
  "You'll pay for that one.", 'Beginner’s luck.', 'Fine. Take it.',
];

const PARTNER_LOSES = [
  'No matter, we go again.', 'I had nothing.', 'Next one, partner.',
  'Save your trumps.',
];

const TRUMPED = [
  'Hokm!', 'Cut it.', 'Trump. Sorry, not sorry.', "Didn't see that coming?",
  'The Hokm decides.',
];

const CALLS_TRUMP = [
  'Hokm is {suit}. Trust me.', '{suit}. Let us play.',
  'We ride on {suit} tonight.', '{suit} it is. Deal them.',
];

const OPPONENT_WINS_HAND = ['Seven. Done.', 'Book it.', 'Told you.', 'That is how it is played.'];
const PARTNER_WINS_HAND = ['That is the hand!', 'Beautiful, partner.', 'We take it.'];
const OPPONENT_WINS_KOT = ['KOT! Not one trick for you.', 'Seven to nothing. Brutal.'];
const PARTNER_WINS_KOT = ['KOT! They got nothing!', 'Seven–nil, partner!'];
const LOSES_KOT = ['...not a single trick.', 'Never speak of this hand.'];

const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

/**
 * A line for whoever just took a trick, or null when they should stay quiet.
 * `chance` keeps the chatter occasional rather than constant.
 */
export function trickLine(isPartner, wasTrumped, chance = 0.4) {
  if (Math.random() > chance) return null;
  if (wasTrumped && Math.random() < 0.5) return pick(TRUMPED);
  return pick(isPartner ? PARTNER_TAKES : OPPONENT_TAKES);
}

/** A grumble from a bot who just lost a trick. */
export function lostTrickLine(isPartner, chance = 0.18) {
  if (Math.random() > chance) return null;
  return pick(isPartner ? PARTNER_LOSES : OPPONENT_LOSES);
}

export function trumpCallLine(suitName) {
  return pick(CALLS_TRUMP).replace('{suit}', suitName);
}

export function handEndLine(isPartner, won, isKot) {
  if (won) {
    if (isKot) return pick(isPartner ? PARTNER_WINS_KOT : OPPONENT_WINS_KOT);
    return pick(isPartner ? PARTNER_WINS_HAND : OPPONENT_WINS_HAND);
  }
  return isKot ? pick(LOSES_KOT) : null;
}
