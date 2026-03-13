// ─────────────────────────────────────────────────────────────────────────────
// ConsumableEffects — runtime effect registry for consumable items
//
// Each entry defines:
//   execute({ roundManager, params }) → result
//     roundManager  GameRoundManager instance for the current round.
//     params        Optional caller-supplied data (e.g. chosen card ids).
//     result        { success: boolean, message?: string, [extra]? }
//
// Implemented consumables (4 legacy + 12 zodiac):
//   Horse   — gain one extra play this round
//   Dog     — nullify push penalty for this round
//   Pig     — double ki earned from this round
//   Rooster — reveal all draw-pile cards whose month appears on the field
//   Zodiac  — 12 tactical items (rat, ox, tiger, rabbit, dragon, snake,
//              horse2, goat, monkey, rooster2, dog2, pig2)
//
// Three Marks consumables (mark_impermanence, mark_nonbeing, mark_transcendence)
// are handled directly in GameScene and ShrineScene, not here.
// ─────────────────────────────────────────────────────────────────────────────

import run from './RunManager.js';

const _effects = {

  // ── Legacy consumables ────────────────────────────────────────────────────

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

  // ── Zodiac consumables ────────────────────────────────────────────────────

  zodiac_rat: {
    /** Draw 2 extra cards from the deck. */
    execute({ roundManager }) {
      const drawn = roundManager.deck.drawPileSize > 0
        ? roundManager.deck.draw(Math.min(2, roundManager.deck.drawPileSize))
        : [];
      if (drawn.length > 0) roundManager._hand.add(drawn);
      return { success: true, message: `Drew ${drawn.length} card(s).`, drawnCards: drawn };
    },
  },

  zodiac_ox: {
    /**
     * Clear a stranded stack from one field slot.
     * Requires params.slotIndex.  Without it returns needsTarget='slot'.
     */
    execute({ roundManager, params }) {
      if (params?.slotIndex == null) {
        return { success: false, needsTarget: 'slot' };
      }
      const cards = roundManager.field.clearSlot(params.slotIndex);
      if (!cards) return { success: false, message: 'Slot is empty.' };
      // Cleared cards go to the discard pile.
      roundManager._allDiscards.push(...cards);
      return { success: true, message: `Cleared ${cards.length} card(s) from slot ${params.slotIndex}.`, clearedCards: cards };
    },
  },

  zodiac_tiger: {
    /** Force a push without meeting a yaku threshold. */
    execute({ roundManager }) {
      roundManager._tigerPushActive = true;
      return { success: true, message: 'Tiger: free push granted this round.' };
    },
  },

  zodiac_rabbit: {
    /** Remove push penalty for this round. */
    execute({ roundManager }) {
      roundManager._rabbitActive = true;
      roundManager._dogProtection = true;  // reuse dog protection flag
      return { success: true, message: 'Rabbit: push penalty removed.' };
    },
  },

  zodiac_dragon: {
    /** Ki lottery: gain 0–30 ki (random). */
    execute() {
      const gain = Math.floor(Math.random() * 31);
      run.addKi(gain);
      return { success: true, message: `Dragon lottery: +${gain} ki!`, kiGained: gain };
    },
  },

  zodiac_snake: {
    /**
     * Lower one yaku threshold by 1 this round.
     * Requires params.yakuName.  Without it returns needsTarget='yaku'.
     */
    execute({ roundManager, params }) {
      if (!params?.yakuName) {
        return { success: false, needsTarget: 'yaku' };
      }
      const key = params.yakuName.toLowerCase();
      if (!roundManager._snakeThresholdMods) roundManager._snakeThresholdMods = {};
      roundManager._snakeThresholdMods[key] = (roundManager._snakeThresholdMods[key] ?? 0) + 1;
      return { success: true, message: `Snake: ${params.yakuName} threshold lowered by 1.` };
    },
  },

  zodiac_horse: {
    /** Discard your hand and draw 8 fresh cards. */
    execute({ roundManager }) {
      const oldHand = roundManager._hand.getAll();
      roundManager._allDiscards.push(...oldHand);
      roundManager._hand.clear();
      const drawCount = Math.min(8, roundManager.deck.drawPileSize);
      if (drawCount > 0) {
        const drawn = roundManager.deck.draw(drawCount);
        roundManager._hand.add(drawn);
      }
      return { success: true, message: `Horse: hand refreshed (${drawCount} new cards).` };
    },
  },

  zodiac_goat: {
    /** +1 ki per capture for the rest of this round. */
    execute({ roundManager }) {
      roundManager._goatActive = true;
      return { success: true, message: 'Goat: +1 ki per capture activated.' };
    },
  },

  zodiac_monkey: {
    /**
     * Capture all cards on a field slot; discard equal number from hand.
     * Requires params.slotIndex.  Without it returns needsTarget='slot'.
     */
    execute({ roundManager, params }) {
      if (params?.slotIndex == null) {
        return { success: false, needsTarget: 'slot' };
      }
      const cards = roundManager.field.clearSlot(params.slotIndex);
      if (!cards || cards.length === 0) return { success: false, message: 'Slot is empty.' };

      // Add cards to capture pile.
      roundManager._capture.add(cards);
      run.onCardsCaptured(cards);

      // Discard equal number from hand (oldest first).
      const handCards = roundManager._hand.getAll();
      const discardCount = Math.min(cards.length, handCards.length);
      const toDiscard = handCards.slice(0, discardCount);
      for (const c of toDiscard) roundManager._hand.remove(c.id);
      roundManager._allDiscards.push(...toDiscard);

      return {
        success: true,
        message: `Monkey: captured ${cards.length} card(s), discarded ${discardCount} from hand.`,
        capturedCards: cards,
        discardedCards: toDiscard,
      };
    },
  },

  zodiac_rooster: {
    /** Open a 9th field slot for this round. */
    execute({ roundManager }) {
      roundManager.field.setMaxSlots(9);
      return { success: true, message: 'Rooster: 9th field slot opened.' };
    },
  },

  zodiac_dog: {
    /** Retrieve 2 cards from the discard pile. */
    execute({ roundManager }) {
      const discards = roundManager._allDiscards;
      const count = Math.min(2, discards.length);
      if (count === 0) return { success: false, message: 'No cards in discard pile.' };
      const retrieved = discards.splice(discards.length - count, count);
      roundManager._hand.add(retrieved);
      return { success: true, message: `Dog: retrieved ${count} card(s) from discard.`, retrievedCards: retrieved };
    },
  },

  zodiac_pig: {
    /** +10 ki immediately. */
    execute() {
      run.addKi(10);
      return { success: true, message: '+10 ki.' };
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
