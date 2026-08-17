// Suit artwork drawn as inline SVG rather than Unicode glyphs.
//
// Font glyphs for ♠♥♦♣ are small, blobby and inconsistent between platforms —
// at card size a heart and a diamond, or a spade and a club, collapse into
// near-identical shapes. These paths keep each silhouette distinct, and the
// four-colour scheme below means suit is readable from colour alone.

const PATHS = {
  // Pointed crown, deep shoulders, flared pedestal foot.
  S: '<path d="M50 6C41 20 26 31 18 41c-9 11-10 25-2 33 7 8 19 8 26 1 3-3 5-6 6-10 1 14-3 25-11 32h26c-8-7-12-18-11-32 1 4 3 7 6 10 7 7 19 7 26-1 8-8 7-22-2-33C74 31 59 20 50 6z"/>',
  // Two full lobes and a long tapered point.
  H: '<path d="M50 92C34 79 8 60 8 36 8 21 19 10 33 10c8 0 15 4 17 10 2-6 9-10 17-10 14 0 25 11 25 26 0 24-26 43-42 56z"/>',
  // Hard straight edges — deliberately angular so it never reads as a heart.
  D: '<path d="M50 4 92 50 50 96 8 50z"/>',
  // Three clear lobes with visible gaps, plus a wide foot.
  C: `<circle cx="50" cy="27" r="19"/>
      <circle cx="24" cy="60" r="19"/>
      <circle cx="76" cy="60" r="19"/>
      <path d="M44 58h12c0 16 4 28 12 36H32c8-8 12-20 12-36z"/>`,
};

export const SUIT_NAME = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };

/** Inline SVG for a suit, inheriting colour from its parent via currentColor. */
export function suitSVG(suit, className = '') {
  return `<svg class="suit-ico ${className}" viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="currentColor">${PATHS[suit]}</svg>`;
}

/** Replace any element carrying data-suit with that suit's artwork. */
export function hydrateSuitIcons(root = document) {
  root.querySelectorAll('[data-suit-icon]').forEach((node) => {
    const suit = node.dataset.suitIcon;
    if (PATHS[suit]) node.innerHTML = suitSVG(suit);
  });
}
