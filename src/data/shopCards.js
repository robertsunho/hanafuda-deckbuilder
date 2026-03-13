// ─────────────────────────────────────────────────────────────────────────────
// shopCards.js — Generates random card offers for the shrine shop
// ─────────────────────────────────────────────────────────────────────────────

import { cards as ALL_CARDS } from './cards.js';

const BASE_PRICE = { plain: 2, ribbon: 4, animal: 5, bright: 8 };

/**
 * Generate a random selection of card offers for purchase at the shrine.
 *
 * @param {number}  count    Number of cards to offer.
 * @param {boolean} isGrove  Sacred Grove offers more cards and better enhancement odds.
 * @returns {Array<{ card: object, price: number, preEnhancement: object|null, preRibbon: string|null }>}
 */
export function generateShopCards(count = 3, isGrove = false) {
  const pool       = [...ALL_CARDS].sort(() => Math.random() - 0.5);
  const offerCount = Math.min(isGrove ? count + 1 : count, pool.length);
  const offers     = [];

  const ELEMENTS = ['water', 'wood', 'fire', 'earth', 'metal'];
  const TIERS    = ['base', 'base', 'base', 'upgraded'];  // 75% base, 25% upgraded
  const STAMPS   = ['red', 'blue', 'green', 'yellow'];
  const STAMP_W  = [3, 3, 2, 1];

  for (let i = 0; i < offerCount; i++) {
    const baseCard = pool[i];
    let price          = BASE_PRICE[baseCard.type] ?? 3;
    let preEnhancement = null;
    let preRibbon      = null;

    if (Math.random() < (isGrove ? 0.40 : 0.20)) {
      preEnhancement = {
        element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
        tier:    TIERS[Math.floor(Math.random() * TIERS.length)],
      };
      price += 3;
    } else if (Math.random() < (isGrove ? 0.30 : 0.15)) {
      let roll = Math.random() * STAMP_W.reduce((a, b) => a + b, 0);
      for (let j = 0; j < STAMPS.length; j++) {
        roll -= STAMP_W[j];
        if (roll <= 0) { preRibbon = STAMPS[j]; break; }
      }
      price += 2;
    }

    const cardCopy = JSON.parse(JSON.stringify(baseCard));
    if (preEnhancement) cardCopy.enhancement  = preEnhancement;
    if (preRibbon)      cardCopy.ribbonStamp   = preRibbon;

    offers.push({ card: cardCopy, price, preEnhancement, preRibbon });
  }

  return offers;
}
