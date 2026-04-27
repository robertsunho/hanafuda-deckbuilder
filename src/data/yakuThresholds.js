// ─────────────────────────────────────────────────────────────────────────────
// yakuThresholds.js — proportional yaku threshold computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the proportional yaku threshold for a rank.
 * Threshold scales with the rank's share of total deck composition.
 *
 * Brackets (rank proportion p of deck):
 *   p < 1/12         → 1
 *   1/12 ≤ p < 1/6   → 2
 *   1/6  ≤ p < 1/4   → 3
 *   1/4  ≤ p < 1/3   → 4
 *   1/3  ≤ p < 1/2   → 5
 *   1/2  ≤ p < 2/3   → 6
 *   2/3  ≤ p < 3/4   → 7
 *   3/4  ≤ p         → 8
 *
 * @param {number} rankCount - Number of cards of this rank in the deck.
 * @param {number} deckSize - Total cards in the deck.
 * @returns {number} - Threshold (always >= 1).
 */
export function getProportionalYakuThreshold(rankCount, deckSize) {
  if (deckSize <= 0) return 1;
  const p = rankCount / deckSize;
  if (p < 1/12) return 1;
  if (p < 1/6)  return 2;
  if (p < 1/4)  return 3;
  if (p < 1/3)  return 4;
  if (p < 1/2)  return 5;
  if (p < 2/3)  return 6;
  if (p < 3/4)  return 7;
  return 8;
}
