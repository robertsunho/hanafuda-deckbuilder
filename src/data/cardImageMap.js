// ─────────────────────────────────────────────────────────────────────────────
// cardImageMap — maps every card id from cards.js to its image file
//
// Images live in assets/cards/ and are named <cardId>.png, so the mapping
// is a direct derivation from the card data — no separate lookup table needed.
//
// Usage:
//   import { cardImageMap, cardImagePath } from "./data/cardImageMap.js";
//   cardImageMap["january_crane"]   // → "assets/cards/january_crane.png"
//   cardImagePath("august_moon")    // → "assets/cards/august_moon.png"
// ─────────────────────────────────────────────────────────────────────────────

import { cards } from "./cards.js";

/**
 * Flat mapping of card id → image path (relative to the project root /
 * web-server public root).
 *
 * @type {Record<string, string>}
 */
export const cardImageMap = Object.fromEntries(
  cards.map(card => [card.id, `assets/cards/${card.id}.png`])
);

/**
 * Convenience helper — look up the image path for a card id.
 * Throws if the id is not recognised, so missing mappings surface at runtime
 * rather than silently rendering a broken image.
 *
 * @param {string} cardId  A card id from cards.js (e.g. "august_moon").
 * @returns {string}       The image path (e.g. "assets/cards/august_moon.png").
 */
export function cardImagePath(cardId) {
  const path = cardImageMap[cardId];
  if (!path) throw new Error(`cardImageMap: unknown card id "${cardId}"`);
  return path;
}
