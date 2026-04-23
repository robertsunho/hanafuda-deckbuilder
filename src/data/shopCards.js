// ─────────────────────────────────────────────────────────────────────────────
// shopCards.js — Generates random card offers for the shrine shop
//
// Pricing model (layered, all additive):
//   Base:      3 ki (all card types)
//   Enhancement: +3 (base tier) / +6 (upgraded tier)
//   Stamp (primary):   +3 | (secondary): +6 | (tertiary black): +9 | (gray): +12
//   Edition:   free (applied only via Heart Chakra, never pre-rolled here)
//
// Wu Xing + stamp can coexist on the same card.
// ─────────────────────────────────────────────────────────────────────────────

import { cards as ALL_CARDS } from './cards.js';

const PRIMARY_STAMP_IDS   = ['stamp_red', 'stamp_blue', 'stamp_yellow', 'stamp_white'];
const SECONDARY_STAMP_IDS = ['stamp_orange', 'stamp_green', 'stamp_purple'];

/** Price added for a given stamp id. */
function _stampPrice(stampId) {
  if (PRIMARY_STAMP_IDS.includes(stampId))   return 3;
  if (SECONDARY_STAMP_IDS.includes(stampId)) return 6;
  if (stampId === 'stamp_black') return 9;
  if (stampId === 'stamp_gray')  return 12;
  return 3;
}

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

  // Stamp pool: primary always available; secondary added for Grove.
  const stampPool = isGrove
    ? [...PRIMARY_STAMP_IDS, ...SECONDARY_STAMP_IDS]
    : [...PRIMARY_STAMP_IDS];

  for (let i = 0; i < offerCount; i++) {
    const baseCard = pool[i];
    let price          = 3;  // flat base for all types
    let preEnhancement = null;
    let preRibbon      = null;

    // Enhancement roll — independent of stamp roll.
    if (Math.random() < (isGrove ? 0.40 : 0.20)) {
      preEnhancement = {
        element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
        tier:    TIERS[Math.floor(Math.random() * TIERS.length)],
      };
      price += preEnhancement.tier === 'upgraded' ? 6 : 3;
    }

    // Stamp roll — independent of enhancement roll.
    if (Math.random() < (isGrove ? 0.30 : 0.15)) {
      preRibbon = stampPool[Math.floor(Math.random() * stampPool.length)];
      price += _stampPrice(preRibbon);
    }

    const cardCopy = JSON.parse(JSON.stringify(baseCard));
    if (preEnhancement) cardCopy.enhancement  = preEnhancement;
    if (preRibbon)      cardCopy.ribbonStamp   = preRibbon;

    offers.push({ card: cardCopy, price, preEnhancement, preRibbon });
  }

  return offers;
}
