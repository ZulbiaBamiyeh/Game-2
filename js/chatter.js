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
        out.push({ role: 'winner', text: `counter-trumped. sit down` });
        out.push({ role: 'winner', text: `you cut, i cut harder. skill issue` });
        out.push({ role: 'winner', text: `nice trump. mine's bigger lmao` });
      }
      if (winnerIsHuman) {
        out.push({ role: 'partner', text: `OVER their trump?? absolutely feral` });
        out.push({ role: 'partner', text: `you just deleted their save file` });
      }
      if (winnerIsPartner) {
        out.push({ role: 'partner', text: `their trump was NOT built for this` });
        out.push({ role: 'partner', text: `counter-cut. gg go next` });
      }
    } else if (winnerIsHuman) {
      out.push({ role: 'partner', text: `CUT. that's my partner right there` });
      out.push({ role: 'partner', text: `hokm goes brrrr` });
      if (beatenWasHigh) {
        out.push({ role: 'partner', text: `you cut their ${beaten}?? we are WRECKING them` });
        out.push({ role: 'beaten', text: `my ${beaten}... i'm actually gonna cry` });
        out.push({ role: 'beaten', text: `bro cut my ${beaten}. uninstall` });
      } else {
        out.push({ role: 'beaten', text: `out of that suit already? convenient` });
      }
    } else if (winnerIsPartner) {
      out.push({ role: 'partner', text: `cut. clean. no notes` });
      out.push({ role: 'partner', text: `been sitting on that hokm all hand ngl` });
      out.push({ role: 'partner', text: `easy clap` });
      if (beatenWasHigh) out.push({ role: 'partner', text: `their ${beaten} goes in the bin. ours` });
    } else {
      out.push({ role: 'winner', text: `hokm > your ${beaten}. them's the rules` });
      out.push({ role: 'winner', text: `cut. sorry not sorry` });
      out.push({ role: 'winner', text: `maybe stick to playing fortnite` });
      if (beatenIsHuman) out.push({ role: 'partner', text: `ok they were void, nothing you could do` });
    }
    return out;
  }

  // --- a high card went down without a cut ---
  if (beatenWasHigh) {
    if (winnerIsHuman) {
      out.push({ role: 'partner', text: `${played} over their ${beaten}. chef's kiss` });
      out.push({ role: 'partner', text: `straight over the top of them LMAO` });
      out.push({ role: 'beaten', text: `not the ${beaten}... i was so attached to it` });
      out.push({ role: 'beaten', text: `respectfully, uninstall` });
    } else if (winnerIsPartner) {
      out.push({ role: 'partner', text: `my ${played} eats their ${beaten}. yum` });
      out.push({ role: 'partner', text: `that one's ours, don't worry about it` });
      out.push({ role: 'partner', text: `their ${beaten} did NOT see that coming` });
    } else {
      out.push({ role: 'winner', text: `your ${beaten}? cute` });
      out.push({ role: 'winner', text: `${played} beats ${beaten}. every single time` });
      out.push({ role: 'winner', text: `have you considered a different hobby` });
      if (beatenIsHuman) out.push({ role: 'partner', text: `save the big ones next time, partner` });
    }
    return out;
  }

  // --- an ordinary trick ---
  if (winnerIsHuman) {
    out.push({ role: 'partner', text: `yep yep, keep them coming` });
    out.push({ role: 'partner', text: `they're locked in` });
    out.push({ role: 'beaten', text: `take it. means nothing` });
    out.push({ role: 'beaten', text: `enjoy it while it lasts buddy` });
  } else if (winnerIsPartner) {
    out.push({ role: 'partner', text: `got it. no thoughts, head empty` });
    out.push({ role: 'partner', text: `we're cooking` });
    out.push({ role: 'partner', text: `free trick tbh` });
  } else {
    out.push({ role: 'winner', text: `mine. thanks` });
    out.push({ role: 'winner', text: `too slow lmao` });
    out.push({ role: 'winner', text: `appreciate the donation` });
    out.push({ role: 'winner', text: `is this your first time playing cards` });
    if (beatenIsPartner) out.push({ role: 'winner', text: `your partner isn't saving you either` });
  }
  return out;
}

export function trumpCallLine(suitName) {
  return pick([
    `hokm is ${suitName.toLowerCase()}. trust the process`,
    `${suitName.toLowerCase()}. lock in`,
    `we're riding ${suitName.toLowerCase()} tonight`,
    `${suitName.toLowerCase()} it is. deal em`,
    `${suitName.toLowerCase()}, obviously. it's not that deep`,
  ]);
}

export function handEndLine(isPartner, won, isKot) {
  if (won) {
    if (isKot) {
      return pick(isPartner
        ? ['KOT!! they got NOTHING', 'seven nil. absolutely cooked', "they didn't win a single one LMAO"]
        : ['KOT. not one trick for you', 'seven zero. uninstall buddy', 'flawless victory, stay humble']);
    }
    return pick(isPartner
      ? ["that's the hand!", 'gg partner, we ate', 'we take those']
      : ['seven. done. next', 'book it', 'told you', 'this is just how it goes', 'gg go next']);
  }
  return isKot ? pick(['...not a single trick. i need a minute', 'we never speak of this hand again', "ok that one's on me"]) : null;
}

export { pick };
