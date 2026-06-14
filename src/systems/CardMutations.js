// ─────────────────────────────────────────────────────────────────────────────
// CardMutations — helpers for per-card persistent mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the effective points for a card, including any persistent mutations.
 * @param {object} card
 * @returns {number}
 */
export function getCardPoints(card) {
  const bonus = card.mutations?.bonusPoints ?? 0;
  return card.points + bonus;
}

/**
 * Add a persistent point bonus to a card.
 * @param {object} card
 * @param {number} amount
 */
export function addCardBonusPoints(card, amount) {
  if (!card.mutations) card.mutations = {};
  card.mutations.bonusPoints = (card.mutations.bonusPoints ?? 0) + amount;
}

/**
 * True if a single card is Silk-enhanced (upgraded Wood) — anti-strand eligible.
 * Shared by FieldManager (hand-play anti-strand) and GameRoundManager
 * (_strandHasSilk, deck-flip anti-strand) so the two never drift.
 * @param {object} card
 * @returns {boolean}
 */
export function isSilk(card) {
  return card?.enhancement?.element === 'wood' && card?.enhancement?.tier === 'upgraded';
}
