// ─────────────────────────────────────────────────────────────────────────────
// ConsumableEffects — runtime effect registry for consumable items
//
// Each entry defines:
//   execute({ roundManager, params }) → result
//     roundManager  GameRoundManager instance for the current round.
//     params        Optional caller-supplied data (e.g. chosen card ids).
//     result        { success: boolean, message?: string, [extra]? }
//
// Implemented consumables (4):
//   Horse   — gain one extra play this round
//   Dog     — nullify push penalty for this round
//   Pig     — double ki earned from this round
//   Rooster — reveal all draw-pile cards whose month appears on the field
//
// Three Marks consumables (mark_impermanence, mark_nonbeing, mark_transcendence)
// are handled directly in GameScene and ShrineScene, not here.
// ─────────────────────────────────────────────────────────────────────────────

const _effects = {

  // ── Implemented consumables ───────────────────────────────────────────────

  consumable_horse: {
    /** Gain one extra play this round. */
    execute({ roundManager }) {
      roundManager._playsRemaining += 1;
      return { success: true, message: '+1 play granted.' };
    },
  },

  consumable_dog: {
    /** Nullify the push penalty for this round. */
    execute({ roundManager }) {
      roundManager._dogProtection = true;
      return { success: true, message: 'Push penalty nullified.' };
    },
  },

  consumable_pig: {
    /** Double ki earned from this round. */
    execute({ roundManager }) {
      roundManager._pigDoubleKi = true;
      return { success: true, message: 'Ki reward will be doubled.' };
    },
  },

  consumable_rooster: {
    /**
     * Reveal all draw-pile cards whose month matches any field slot.
     * Returns { success, message, revealedCards: object[] }.
     */
    execute({ roundManager }) {
      const fieldMonths = new Set(
        roundManager.field.getSlots()
          .filter(Boolean)
          .map(slot => slot.month)
      );
      const revealedCards = roundManager.deck.drawPile
        .filter(c => fieldMonths.has(c.month));
      const msg = revealedCards.length > 0
        ? `Revealed ${revealedCards.length} matching card(s) in the deck.`
        : 'No matching cards in the deck.';
      return { success: true, message: msg, revealedCards };
    },
  },
};

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Look up the effect definition for a consumable.
 * @param {string} consumableId
 * @returns {{ execute: Function }|null}  null if the id is unrecognised.
 */
const ConsumableEffects = {
  get(consumableId) { return _effects[consumableId] ?? null; },
};

export default ConsumableEffects;
