// ─────────────────────────────────────────────────────────────────────────────
// ConsumableEffects — runtime effect registry for consumable items
//
// Each entry defines:
//   execute({ roundManager, params }) → result
//     roundManager  GameRoundManager instance for the current round.
//     params        Optional caller-supplied data (e.g. chosen card ids).
//     result        { success: boolean, message?: string, [extra]? }
//
// Implemented consumables (13 zodiac):
//   Zodiac — 13 tactical items (rat, ox, tiger, rabbit, dragon, snake,
//            horse, goat, monkey, rooster, dog, pig, cat)
//
// Card-targeting consumables (Wu Xing elements) are handled directly in
// GameScene and ShrineScene via the _cardTargetMode system, not here.
// ─────────────────────────────────────────────────────────────────────────────

import run, { incrementPerElement } from './RunManager.js';
import { getSpiritDef, SPIRIT_CATALOG } from '../data/spirits.js';
import { findFusionRecipe, findFusionRecipeByResult } from '../data/fusionRecipes.js';
import FieldManager from './FieldManager.js';

const _effects = {

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
      const cards = roundManager._field.clearSlot(params.slotIndex);
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
      roundManager._dogProtection = true;
      return { success: true, message: 'Rabbit: push penalty removed.' };
    },
  },

  zodiac_dragon: {
    /** Ki lottery: gain 0–30 ki (random). */
    execute() {
      const gain = Math.floor(Math.random() * 31);
      run.addKi(gain, 'dragon_lottery');
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
    /** Discard your hand and draw an equal number of fresh cards. */
    execute({ roundManager }) {
      const oldHand = roundManager._hand.getAll();
      const handSize = oldHand.length;

      // Push to discard pile, then clear hand BEFORE stamp dispatch
      // so stamp draw effects fire onto the empty hand.
      roundManager._allDiscards.push(...oldHand);
      roundManager._hand.clear();

      // engine_ship + stamp dispatch per discarded card.
      for (const card of oldHand) {
        for (const spirit of run.activeSpirits) {
          if (spirit.id === 'engine_ship') {
            incrementPerElement(spirit, 'cardsDiscarded', 1);
          }
        }
        roundManager._dispatchStampDiscardEffects(card);
      }

      // Refill to original hand size (or deck size if smaller).
      const drawCount = Math.min(handSize, roundManager.deck.drawPileSize);
      if (drawCount > 0) {
        const drawn = roundManager.deck.draw(drawCount);
        roundManager._hand.add(drawn);
      }

      if (roundManager._checkRoundEndOnEmptyHand()) {
        return { success: true, message: 'Horse: deck exhausted, round ended.' };
      }
      return { success: true, message: `Horse: hand refreshed (${drawCount} drawn).` };
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
      const cards = roundManager._field.clearSlot(params.slotIndex);
      if (!cards || cards.length === 0) return { success: false, message: 'Slot is empty.' };

      // Route through full scoring pipeline.
      roundManager._addCapture(cards);

      // Discard equal number from hand (oldest first).
      const handCards = roundManager._hand.getAll();
      const discardCount = Math.min(cards.length, handCards.length);
      const toDiscard = handCards.slice(0, discardCount);
      for (const c of toDiscard) roundManager._hand.remove(c.id);
      roundManager._allDiscards.push(...toDiscard);
      for (const card of toDiscard) roundManager._dispatchStampDiscardEffects(card);

      // Empty-hand check — Monkey may have spent the player's last cards.
      roundManager._checkRoundEndOnEmptyHand();

      return {
        success: true,
        message: `Monkey: captured ${cards.length} card(s), discarded ${discardCount} from hand.`,
        capturedCards: cards,
        discardedCards: toDiscard,
      };
    },
  },

  zodiac_rooster: {
    /** +1 field slot for this round (stackable, resets at round end). */
    execute({ roundManager }) {
      roundManager._roosterBonusThisRound += 1;
      roundManager._recomputeFieldSlots();
      return { success: true, message: 'Rooster: +1 field slot this round.' };
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
      run.addKi(10, 'pig_zodiac');
      return { success: true, message: '+10 ki.' };
    },
  },

  zodiac_cat: {
    /** Summon a random Common spirit to an open slot. Excludes symbionts. */
    execute() {
      const COMMON_POOL = SPIRIT_CATALOG
        .filter(s => s.rarity === 'common')
        .filter(s => s.channel !== 'symbiont' && s.category !== 'symbiont')
        .map(s => s.id);
      let id;
      if (run._forceCatTarget) {
        id = run._forceCatTarget;
        run._forceCatTarget = null;
      } else {
        id = COMMON_POOL[Math.floor(Math.random() * COMMON_POOL.length)];
      }
      const spiritDef = getSpiritDef(id);
      if (!spiritDef) return { success: false, message: 'Spirit definition not found.' };
      const result = run.summonSpirit(id);
      if (result.success) {
        return { success: true, message: `Cat summoned ${spiritDef.name}.`, spiritId: id };
      }
      return { success: false, message: result.reason ?? 'Could not summon spirit.' };
    },
  },

  // ── Alchemical Consumables ──────────────────────────────────────────────────

  alch_cinnabar: {
    requiresInput: true,
    inputType: 'spirit_pair',
    execute({ params }) {
      const { spiritIndices } = params ?? {};
      if (!spiritIndices || spiritIndices.length !== 2) return { success: false, message: 'Select 2 spirits' };
      const spirits = run.spirits;
      const a = spirits[spiritIndices[0]];
      const b = spirits[spiritIndices[1]];
      if (!a || !b) return { success: false, message: 'Invalid selection' };
      const recipe = findFusionRecipe(a.id, b.id);
      if (!recipe) return { success: false, message: 'Selected spirits cannot be fused' };
      const fusionDef = getSpiritDef(recipe.output);
      if (!fusionDef || (fusionDef.tier !== 2 && fusionDef.tier !== 3)) {
        return { success: false, message: 'Selected spirits cannot be fused into Tier 2/3' };
      }
      const fusionStacks = Math.min(a.stackCount ?? 1, b.stackCount ?? 1);
      a.stackCount = (a.stackCount ?? 1) - fusionStacks;
      b.stackCount = (b.stackCount ?? 1) - fusionStacks;
      if (a.elements) for (let i = 0; i < fusionStacks && a.elements.length > 0; i++) a.elements.pop();
      if (b.elements) for (let i = 0; i < fusionStacks && b.elements.length > 0; i++) b.elements.pop();
      const freed = (a.stackCount <= 0 ? 1 : 0) + (b.stackCount <= 0 ? 1 : 0);
      const slotsAfter = (run.spiritSlots - spirits.length) + freed;
      if (slotsAfter < 1) {
        a.stackCount += fusionStacks; b.stackCount += fusionStacks;
        return { success: false, message: 'No spirit slot for fusion result' };
      }
      run.removeZeroStackSpirits();
      const acq = run._acquireSpiritStack(fusionDef, fusionStacks);
      if (!acq.success) return { success: false, message: acq.reason ?? 'Could not acquire fusion' };
      return { success: true, message: `Fused into ${fusionDef.name}!` };
    },
  },

  alch_mercury: {
    requiresInput: true,
    inputType: 'spirit_single_fusion',
    execute({ params }) {
      const { spiritIndex } = params ?? {};
      const fusion = run.spirits[spiritIndex];
      if (!fusion) return { success: false };
      const fusionDef = getSpiritDef(fusion.id);
      if (!fusionDef || (fusionDef.tier !== 2 && fusionDef.tier !== 3)) {
        return { success: false, message: 'Mercury only works on Tier 2/3 fusions' };
      }
      const recipe = findFusionRecipeByResult(fusion.id);
      if (!recipe) return { success: false, message: 'No defusion recipe found' };
      const freed = (fusion.stackCount ?? 1) === 1 ? 1 : 0;
      const openSlots = (run.spiritSlots - run.spirits.length) + freed;
      const hasExistingA = run.spirits.some(s => s.id === recipe.input[0] && !s.isNegative);
      const hasExistingB = run.spirits.some(s => s.id === recipe.input[1] && !s.isNegative);
      const newSlotsNeeded = (hasExistingA ? 0 : 1) + (hasExistingB ? 0 : 1);
      if (newSlotsNeeded > openSlots) {
        return { success: false, message: newSlotsNeeded === 1 ? 'Need 1 open spirit slot' : 'Need 2 open spirit slots' };
      }
      fusion.stackCount = (fusion.stackCount ?? 1) - 1;
      if (fusion.elements && fusion.elements.length > 0) fusion.elements.pop();
      if (fusion.stackCount <= 0) run.removeSpiritObj(fusion);
      const defA = getSpiritDef(recipe.input[0]);
      const defB = getSpiritDef(recipe.input[1]);
      if (defA) run._acquireSpiritStack(defA, 1);
      if (defB) run._acquireSpiritStack(defB, 1);
      return { success: true, message: `De-fused into ${defA?.name} + ${defB?.name}` };
    },
  },

  alch_jade: {
    requiresInput: true,
    inputType: 'spirit_single_stackable',
    execute({ params }) {
      const { spiritIndex } = params ?? {};
      const target = run.spirits[spiritIndex];
      if (!target) return { success: false };
      if ((target.stackCount ?? 1) >= 3) return { success: false, message: 'Already at max stack' };
      const targetDef = getSpiritDef(target.id) ?? target;
      const result = run._acquireSpiritStack(targetDef, 1);
      if (!result.success) return { success: false, message: result.reason ?? 'Could not add stack' };
      return { success: true, message: `${target.name} +1 stack` };
    },
  },

  alch_sulfur: {
    requiresInput: false,
    execute() {
      const spirits = run.allSpirits;
      if (spirits.length === 0) return { success: false, message: 'No spirits to duplicate' };
      const dupIdx = Math.floor(Math.random() * spirits.length);
      const dupTarget = spirits[dupIdx];
      let clearIdx = null;
      if (spirits.length > 1) {
        do { clearIdx = Math.floor(Math.random() * spirits.length); }
        while (clearIdx === dupIdx);
      }
      const slotsAfter = (run.spiritSlots - spirits.length) + (clearIdx !== null ? 1 : 0);
      if (slotsAfter < 1) return { success: false, message: 'No slot for duplicate' };

      // Clear chosen victim first to free its slot.
      if (clearIdx !== null) {
        run.removeSpiritObj(spirits[clearIdx]);
      }

      // Negative targets: direct-create parallel entry (negatives don't stack-merge).
      if (dupTarget.isNegative) {
        run.addSpiritDirect({
          id: dupTarget.id, name: dupTarget.name,
          stackCount: 1, isNegative: true,
          powerLevel: dupTarget.powerLevel,
          state: dupTarget.state ? JSON.parse(JSON.stringify(dupTarget.state)) : undefined,
          acquiredRound: run._round ?? 0,
        });
        return { success: true, message: `Duplicated ${dupTarget.name}` };
      }

      // Regular target: route through helper for stack merging + cascade transcendence.
      const dupCount = dupTarget.stackCount ?? 1;
      const targetDef = getSpiritDef(dupTarget.id) ?? dupTarget;
      const result = run._acquireSpiritStack(targetDef, dupCount);
      if (!result.success) return { success: false, message: result.reason ?? 'Could not duplicate' };
      return { success: true, message: `Duplicated ${dupTarget.name}` };
    },
  },

  alch_amber: {
    requiresInput: true,
    inputType: 'spirit_single_transcendable',
    execute({ roundManager, params }) {
      const { spiritIndex } = params ?? {};
      const target = run.spirits[spiritIndex];
      if (!target) return { success: false };
      const mod = run._permanentFieldSlotMod ?? 0;
      if (FieldManager.MAX_SLOTS + mod - 1 < 1) return { success: false, message: 'Cannot reduce field slots below 1' };
      const snapshotPower = target.stackCount ?? 1;
      const inheritedState = target.state ?? null;
      run.removeSpiritObj(target);
      run.addSpiritDirect({ id: target.id, name: target.name, isNegative: true, stackCount: 1, powerLevel: snapshotPower, state: inheritedState });
      run._permanentFieldSlotMod = mod - 1;
      if (roundManager) roundManager._recomputeFieldSlots();
      return { success: true, message: `${target.name} transcended! Field -1 slot.` };
    },
  },

  alch_lead: {
    requiresInput: false,
    execute() {
      if (!run.canAddSpirit) return { success: false, message: 'No spirit slot available' };
      const available = SPIRIT_CATALOG.filter(s => s.rarity === 'rare');
      if (available.length === 0) return { success: false, message: 'No Rare spirits available' };
      const pick = available[Math.floor(Math.random() * available.length)];
      run._addPastLifeCopy(pick);
      run._ki = Math.floor(run._ki / 2);
      return { success: true, message: `Summoned ${pick.name}! Ki halved.` };
    },
  },

  alch_pearl: {
    requiresInput: true,
    inputType: 'spirit_pair_tier3',
    execute({ params }) {
      const { spiritIndices } = params ?? {};
      if (!spiritIndices || spiritIndices.length !== 2) return { success: false };
      const spirits = run.spirits;
      const a = spirits[spiritIndices[0]];
      const b = spirits[spiritIndices[1]];
      if (!a || !b) return { success: false };
      const defA = getSpiritDef(a.id);
      const defB = getSpiritDef(b.id);
      if (!defA || defA.tier !== 3 || !defB || defB.tier !== 3) {
        return { success: false, message: 'Pearl requires 2 Tier 3 cross-fusions' };
      }
      const recipe = findFusionRecipe(a.id, b.id);
      if (!recipe) return { success: false, message: 'No Capstone recipe for these fusions' };
      const capstoneDef = getSpiritDef(recipe.output);
      if (!capstoneDef?.capstone) return { success: false, message: 'Recipe does not produce a Capstone' };
      if (!run.canAddLegendary) return { success: false, message: 'No Legendary slot available' };
      // Consume inputs (decrement stackCount + pop element; remove if zero).
      a.stackCount = (a.stackCount ?? 1) - 1;
      b.stackCount = (b.stackCount ?? 1) - 1;
      if (a.elements && a.elements.length > 0) a.elements.pop();
      if (b.elements && b.elements.length > 0) b.elements.pop();
      run.removeZeroStackSpirits();
      run.addLegendarySpirit(capstoneDef);
      return { success: true, message: `Created ${capstoneDef.name}!` };
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
