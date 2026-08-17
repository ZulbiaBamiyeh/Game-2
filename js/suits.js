// Suit symbols. The artwork itself is a pixel grid in pixelart.js; this module
// just names the suits and fills in the icon placeholders in the static markup.
import { suitSVG } from './pixelart.js';

export { suitSVG };

export const SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };

/** Replace any element carrying data-suit-icon with that suit's artwork. */
export function hydrateSuitIcons(root = document) {
  root.querySelectorAll('[data-suit-icon]').forEach((node) => {
    const suit = node.dataset.suitIcon;
    if (SUIT_NAME[suit]) node.innerHTML = suitSVG(suit);
  });
}
