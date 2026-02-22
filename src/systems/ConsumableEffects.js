// ─────────────────────────────────────────────────────────────────────────────
// ConsumableEffects — runtime effect registry for all consumable items
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
// All other consumables are stubs returning success: false.
// ─────────────────────────────────────────────────────────────────────────────

const _stub = { execute: () => ({ success: false, message: 'Not yet implemented.' }) };

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

  // ── Stubs (not yet implemented) ───────────────────────────────────────────

  consumable_rat:    _stub,
  consumable_ox:     _stub,
  consumable_tiger:  _stub,
  consumable_rabbit: _stub,
  consumable_dragon: _stub,
  consumable_snake:  _stub,
  consumable_goat:   _stub,
  consumable_monkey: _stub,
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
