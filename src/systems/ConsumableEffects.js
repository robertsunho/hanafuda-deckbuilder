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
// Stamp consumables are handled here too (shared handler at the bottom); the
// scenes' _cardTargetMode only does target-picking. Wu Xing element + chakra
// application still live on RunManager (consumable-block migration in progress).
// ─────────────────────────────────────────────────────────────────────────────

import run from './RunManager.js';
import { getSpiritDef, SPIRIT_CATALOG } from '../data/spirits.js';
import { findFusionRecipe, findFusionRecipeByResult } from '../data/fusionRecipes.js';
import FieldManager from './FieldManager.js';
import { getBaseCard } from '../data/cards.js';
import { WUXING_CONSUMABLES, STAMPS, getStampDef, mixStamps } from '../data/consumables.js';
import logger from './GameplayLogger.js';

// Every handler declares an `inputType` — the universal target-mode discriminator
// the scene dispatch switches on (F4.15a). Closed set:
//   'none'        — fires immediately, no target (most zodiac)
//   'slot'        — needs a field-slot index (Ox, Monkey)
//   'yaku'        — needs a yaku name (Snake)
//   'card'        — one deck card (element_*, stamp_*, chakra_heart/throat)
//   'card_multi'  — up to N deck cards (chakra root/sacral/solar_plexus/third_eye)
//   'card_pair'   — source + target deck cards (chakra_crown)
//   'spirit_none' — alchemical, no spirit selection (Sulfur, Lead)
//   'spirit_single_*' / 'spirit_pair*' — alchemical spirit selection (Cinnabar/Mercury/Jade/Amber/Pearl)
const _effects = {

  // ── Zodiac consumables ────────────────────────────────────────────────────

  zodiac_rat: {
    inputType: 'none',
    /** Draw 2 extra cards from the deck. */
    execute({ roundManager }) {
      const { drawn } = roundManager._drawIntoHand(2);
      return { success: true, message: `Drew ${drawn.length} card(s).`, drawnCards: drawn };
    },
  },

  zodiac_ox: {
    inputType: 'slot',
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
      // F4.17#5: route cleared field cards through the canonical discard pipeline.
      // Gains catcher (stranded cards can be RESCUED TO HAND — Ox's signature recovery
      // mechanic), recycling, ship, stamps, and full bookkeeping. Was _allDiscards-only.
      // No empty-hand check: Ox never touches the hand, so it can't empty it.
      const actuallyDiscarded = roundManager._discardCards(cards, 'consumable');
      return {
        success: true,
        message: `Cleared ${cards.length} card(s) from slot ${params.slotIndex}.`,
        clearedCards: cards,
        discardedCards: actuallyDiscarded,
      };
    },
  },

  zodiac_tiger: {
    inputType: 'none',
    /** Force a push without meeting a yaku threshold. */
    execute({ roundManager }) {
      roundManager._tigerPushActive = true;
      return { success: true, message: 'Tiger: free push granted this round.' };
    },
  },

  zodiac_rabbit: {
    inputType: 'none',
    /** Waive the push penalty for this round. */
    execute({ roundManager }) {
      roundManager._pushPenaltyWaived = true;
      return { success: true, message: 'Rabbit: push penalty waived.' };
    },
  },

  zodiac_dragon: {
    inputType: 'none',
    /** Ki lottery: gain 0–30 ki (random). */
    execute() {
      const gain = Math.floor(Math.random() * 31);
      run.addKi(gain, 'dragon_lottery');
      return { success: true, message: `Dragon lottery: +${gain} ki!`, kiGained: gain };
    },
  },

  zodiac_snake: {
    inputType: 'yaku',
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
    inputType: 'none',
    /** Discard your hand and draw an equal number of fresh cards. */
    execute({ roundManager }) {
      const oldHand = roundManager._hand.getAll();
      const handSize = oldHand.length;

      // Clear hand FIRST — so stamp draws / catcher rescues land on an empty hand and a
      // catcher rescue re-adds cleanly without duplication — THEN route the old cards
      // through the canonical discard pipeline.
      // F4.17#5: gains catcher (rescue → hand), recycling, and full bookkeeping
      // (_discardCount/_discardedThisTurn — was _allDiscards-only). Ship + stamps now fire
      // INSIDE _discardCard; the old inline ship loop is removed (it would double-count).
      roundManager._hand.clear();
      roundManager._discardCards(oldHand, 'consumable');

      // Redraw the number discarded, but never beyond the hand's remaining room. If catcher
      // rescued any cards, the redraw fills only the leftover slots and the un-drawable cards
      // STAY IN THE DECK (the _drawIntoHand convention — draw() splices the pile, so drawing
      // more than fits would lose them). availableSlots reflects the post-rescue hand (catcher
      // already ran inside _discardCards). With no catcher the hand is empty here, so this is
      // identical to the old flat redraw.
      const { drawn } = roundManager._drawIntoHand(handSize);

      if (roundManager._checkRoundEndOnEmptyHand()) {
        return { success: true, message: 'Horse: deck exhausted, round ended.' };
      }
      return { success: true, message: `Horse: hand refreshed (${drawn.length} drawn).` };
    },
  },

  zodiac_goat: {
    inputType: 'none',
    /** +1 ki per capture for the rest of this round. */
    execute({ roundManager }) {
      roundManager._goatActive = true;
      return { success: true, message: 'Goat: +1 ki per capture activated.' };
    },
  },

  zodiac_monkey: {
    inputType: 'slot',
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

      // Discard equal number from hand (oldest first). Remove from hand BEFORE the
      // canonical discard so a catcher rescue cleanly re-adds the card (no duplication).
      const handCards = roundManager._hand.getAll();
      const discardCount = Math.min(cards.length, handCards.length);
      const toDiscard = handCards.slice(0, discardCount);
      for (const c of toDiscard) roundManager._hand.remove(c.id);
      // F4.17#4: route through the canonical pipeline — gains catcher (rescue → hand),
      // econ_recycling, engine_ship, and full bookkeeping (_discardCount/_discardedThisTurn).
      // Stamp dispatch still fires inside _discardCard. actuallyDiscarded excludes rescues.
      const actuallyDiscarded = roundManager._discardCards(toDiscard, 'consumable');

      // Empty-hand check — Monkey may have spent the player's last cards. Runs AFTER any
      // catcher rescue so it sees the true post-rescue hand.
      roundManager._checkRoundEndOnEmptyHand();

      return {
        success: true,
        message: `Monkey: captured ${cards.length} card(s), discarded ${actuallyDiscarded.length} from hand.`,
        capturedCards: cards,
        discardedCards: actuallyDiscarded,
      };
    },
  },

  zodiac_rooster: {
    inputType: 'none',
    /** +1 field slot for this round (stackable, resets at round end). */
    execute({ roundManager }) {
      roundManager._roosterBonusThisRound += 1;
      roundManager._recomputeFieldSlots();
      return { success: true, message: 'Rooster: +1 field slot this round.' };
    },
  },

  zodiac_dog: {
    inputType: 'none',
    /** Retrieve 2 cards from the discard pile. */
    execute({ roundManager }) {
      const discards = roundManager._allDiscards;
      if (discards.length === 0) return { success: false, message: 'No cards in discard pile.' };
      // Clamp to hand room BEFORE the splice so un-retrievable cards STAY in the discard pile
      // (the splice is the only path out of _allDiscards — splicing more than fits would lose
      // them permanently, since the discard pile has no per-round reset). LIFO order preserved.
      const count = Math.min(2, discards.length, roundManager._hand.availableSlots);
      if (count === 0) return { success: false, message: 'Hand is full.' };
      const retrieved = discards.splice(discards.length - count, count);
      roundManager._hand.add(retrieved);
      return { success: true, message: `Dog: retrieved ${count} card(s) from discard.`, retrievedCards: retrieved };
    },
  },

  zodiac_pig: {
    inputType: 'none',
    /** +10 ki immediately. */
    execute() {
      run.addKi(10, 'pig_zodiac');
      return { success: true, message: '+10 ki.' };
    },
  },

  zodiac_cat: {
    inputType: 'none',
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
      // One Cinnabar = one fusion (Robert's ruling). Decrement each input by 1, acquire
      // one fusion stack — regardless of input stack depth. Pearl/Mercury already do this.
      a.stackCount = (a.stackCount ?? 1) - 1;
      b.stackCount = (b.stackCount ?? 1) - 1;
      if (a.elements && a.elements.length > 0) a.elements.pop();
      if (b.elements && b.elements.length > 0) b.elements.pop();
      const freed = (a.stackCount <= 0 ? 1 : 0) + (b.stackCount <= 0 ? 1 : 0);
      const slotsAfter = (run.spiritSlots - spirits.length) + freed;
      if (slotsAfter < 1) {
        a.stackCount += 1; b.stackCount += 1;   // rollback the single decrement
        return { success: false, message: 'No spirit slot for fusion result' };
      }
      run.removeZeroStackSpirits();
      const acq = run._acquireSpiritStack(fusionDef, 1);
      if (!acq.success) return { success: false, message: acq.reason ?? 'Could not acquire fusion' };
      run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
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
      run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
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
      run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
      return { success: true, message: `${target.name} +1 stack` };
    },
  },

  alch_sulfur: {
    requiresInput: false,
    inputType: 'spirit_none',
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
        run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
        return { success: true, message: `Duplicated ${dupTarget.name}` };
      }

      // Regular target: route through helper for stack merging + cascade transcendence.
      const dupCount = dupTarget.stackCount ?? 1;
      const targetDef = getSpiritDef(dupTarget.id) ?? dupTarget;
      const result = run._acquireSpiritStack(targetDef, dupCount);
      if (!result.success) return { success: false, message: result.reason ?? 'Could not duplicate' };
      run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
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
      // Build the negative through the canonical shared path (RunManager._buildTranscendedNegative) so
      // Amber aggregates the spirit's accumulator .elements (was silently dropping them via a raw
      // target.state read) and carries acquiredRound/symbiont. Amber transcends at ANY stack count
      // (powerLevel = stackCount) — the weaker negative is its intended tradeoff. Chain position is
      // preserved via replaceSpiritObj (in-place; SPIRIT_SET_ITERATION_RULE §1).
      run.replaceSpiritObj(target, run._buildTranscendedNegative(target, target.stackCount ?? 1));
      run._permanentFieldSlotMod = mod - 1;
      if (roundManager) roundManager._recomputeFieldSlots();
      run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
      return { success: true, message: `${target.name} transcended! Field -1 slot.` };
    },
  },

  alch_lead: {
    requiresInput: false,
    inputType: 'spirit_none',
    execute() {
      if (!run.canAddSpirit) return { success: false, message: 'No spirit slot available' };
      const available = SPIRIT_CATALOG.filter(s => s.rarity === 'rare');
      if (available.length === 0) return { success: false, message: 'No Rare spirits available' };
      const pick = available[Math.floor(Math.random() * available.length)];
      run._addPastLifeCopy(pick);
      run._ki = Math.floor(run._ki / 2);
      run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
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
      run.notifyConsumableUsed();   // Candidate H: alchemical success counts for Badger (used ⟺ Badger)
      return { success: true, message: `Created ${capstoneDef.name}!` };
    },
  },

  // ── Chakra consumables ──────────────────────────────────────────────────────
  // Card-level mutation is the canonical consumable-block concern and lives here.
  // Chakras charge NO ki at apply (paid at shop purchase; ShrineScene refunds on
  // cancel) — handlers fire run.notifyConsumableUsed() only, NEVER
  // spendKiForConsumable (that would double-charge). Deck-collection ops delegate
  // to RunManager primitives (deleteCard, duplicateCardToDeck) which own their own
  // spirit-event + Badger firing.

  chakra_root: {
    requiresInput: true,
    inputType: 'card_multi',
    execute({ params }) {
      const cardIds = params?.cardIds ?? [];
      if (cardIds.length > 3) return { success: false, reason: 'Root Chakra can toggle up to 3 cards' };
      for (const id of cardIds) {
        const card = run._deck.find(c => c.id === id);
        if (!card) continue;
        card.temporal = card.temporal === 'day' ? 'night' : 'day';
        card.rootConverted = true;
      }
      run.notifyConsumableUsed();
      return { success: true };
    },
  },

  chakra_sacral: {
    requiresInput: true,
    inputType: 'card_multi',
    execute({ params }) {
      const cardIds = params?.cardIds ?? [];
      if (cardIds.length > 3) return { success: false, reason: 'Sacral Chakra can advance up to 3 cards' };
      for (const id of cardIds) {
        const card = run._deck.find(c => c.id === id);
        if (!card) continue;
        const newMonth = (card.month % 12) + 1;
        const sameType = getBaseCard(newMonth, card.type);
        if (sameType) {
          card.month     = sameType.month;
          card.monthName = sameType.monthName;
          card.vertical  = sameType.vertical;
          // temporal (day/night) is preserved — a symbolic axis independent of month
          card.name      = sameType.name;
        } else {
          const fallback = getBaseCard(newMonth, 'plain')
                        ?? getBaseCard(newMonth, 'ribbon')
                        ?? getBaseCard(newMonth, 'animal')
                        ?? getBaseCard(newMonth, 'bright');
          card.month = newMonth;
          if (fallback) {
            card.monthName = fallback.monthName;
            card.vertical  = fallback.vertical;
            // temporal preserved
          }
        }
        card.sacralConverted = true;
      }
      run.notifyConsumableUsed();
      return { success: true };
    },
  },

  chakra_solar_plexus: {
    requiresInput: true,
    inputType: 'card_multi',
    execute({ params }) {
      const cardIds = params?.cardIds ?? [];
      if (cardIds.length > 2) return { success: false, reason: 'Solar Plexus Chakra can cycle up to 2 cards' };
      const CYCLE      = { plain: 'ribbon', ribbon: 'animal', animal: 'bright', bright: 'plain' };
      const POINTS     = { plain: 3, ribbon: 10, animal: 12, bright: 20 };
      const TYPE_NAMES = { bright: 'Bright', animal: 'Animal', ribbon: 'Ribbon', plain: 'Plain' };
      for (const id of cardIds) {
        const card = run._deck.find(c => c.id === id);
        if (!card) continue;
        const newType = CYCLE[card.type] ?? card.type;
        card.type   = newType;
        card.points = POINTS[newType];
        card.name   = `${card.monthName ?? card.month} ${TYPE_NAMES[newType]}`;
        card.solarPlexusConverted = true;
      }
      run.notifyConsumableUsed();
      return { success: true };
    },
  },

  chakra_heart: {
    requiresInput: true,
    inputType: 'card',
    execute({ params }) {
      const card = run._deck.find(c => c.id === params?.cardId);
      if (!card) return { success: false, reason: 'Card not found' };
      if (card.edition) {
        return { success: false, reason: 'Card already has an edition', existingEdition: card.edition };
      }
      const roll   = Math.random();
      card.edition = roll < 0.6 ? 'gold' : roll < 0.9 ? 'crystal' : 'ghost';
      run.notifyConsumableUsed();
      return { success: true, edition: card.edition };
    },
  },

  chakra_throat: {
    requiresInput: true,
    inputType: 'card',
    execute({ params }) {
      // Deck duplication + engine_palace counter + Badger are collection-invariant
      // work owned by RunManager; the scene inserts newCard into the round draw pile.
      return run.duplicateCardToDeck(params?.cardId);
    },
  },

  chakra_third_eye: {
    requiresInput: true,
    inputType: 'card_multi',
    execute({ params }) {
      const cardIds = params?.cardIds ?? [];
      if (cardIds.length > 2) return { success: false, reason: 'Third Eye Chakra can delete up to 2 cards' };
      // deleteCard fires _fireCardDestroyedEvent + Badger — do NOT re-notify here.
      for (const id of cardIds) run.deleteCard(id);
      return { success: true };
    },
  },

  chakra_crown: {
    requiresInput: true,
    inputType: 'card_pair',
    execute({ params }) {
      const source = run._deck.find(c => c.id === params?.sourceId);
      const target = run._deck.find(c => c.id === params?.targetId);
      if (!source || !target) return { success: false, reason: 'Card not found' };
      if (source.id === target.id) return { success: false, reason: 'Source and target must be different' };
      const savedId = target.id;
      // Clear all properties so no stale state persists from the old identity.
      for (const key of Object.keys(target)) delete target[key];
      // Deep-clone source and assign all properties (identity, enhancement, stamps,
      // editions, mutations, conversion flags — no whitelist needed).
      Object.assign(target, JSON.parse(JSON.stringify(source)));
      target.id = savedId;
      target.baseImageId = source.baseImageId ?? source.id;
      target.crownConverted = true;
      run.notifyConsumableUsed();
      return { success: true };
    },
  },
};

// ── Stamp consumables ───────────────────────────────────────────────────────
// Card-level mutation (mix + write) is the canonical consumable-block concern and
// lives here. The ki spend + Badger activation are run-economy concerns owned by
// RunManager (run.spendKiForConsumable). All stamp ids share this one handler;
// the specific stamp is supplied via params.stampId.
const _applyStamp = {
  requiresInput: true,
  inputType: 'card',
  execute({ params }) {
    const { cardId, stampId } = params ?? {};
    const card = run._deck.find(c => c.id === cardId);
    if (!card) return { success: false, reason: 'Card not found' };
    const stampDef = getStampDef(stampId);
    if (!stampDef) return { success: false, reason: 'Unknown stamp type' };
    if (!run.spendKiForConsumable(stampDef.cost)) return { success: false, reason: 'Not enough ki' };
    const resultStampId = mixStamps(card.ribbonStamp, stampId);
    card.ribbonStamp = resultStampId;
    logger.logCardStamped(card.name ?? card.id, resultStampId);
    return { success: true };
  },
};
for (const _s of STAMPS) _effects[_s.id] = _applyStamp;

// ── Wu Xing element consumables (ATTACH surface) ─────────────────────────────
// Card-level enhancement mutation is the canonical consumable-block concern and
// lives here. This is the ATTACH half only; the per-scoring/round-end PROC half
// (Water depLevel++, Fire break, Earth interest, Metal jackpot, Wood slots) stays
// in GameRoundManager/ScoringEngine — F4.38's territory. Per Recon 2 (SHARED-STATE)
// the two halves share the `card.enhancement` field contract, preserved here
// byte-identically. Badger fires on a real mutation only — NOT on no_effect.
// All 5 element ids share this one handler; the element arrives via params.element.

function _createBaseEnhancement(element) {
  const enh = { element, tier: 'base' };
  if (element === 'water') enh.depLevel = 0;   // depLevel is water-only (proc contract)
  return enh;
}

// Generative cycle — applying an element's parent upgrades it:
//   parentOf[fire]=wood, earth=fire, metal=earth, water=metal, wood=water
function _isGenerativeElement(currentElement, appliedElement) {
  const parentOf = {
    fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal', wood: 'water',
  };
  return parentOf[currentElement] === appliedElement;
}

// Destructive cycle — wood destroys earth, earth water, water fire, fire metal, metal wood.
function _isDestructiveElement(currentElement, appliedElement) {
  const destroys = {
    wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
  };
  return destroys[appliedElement] === currentElement;
}

const _applyElement = {
  requiresInput: true,
  inputType: 'card',
  execute({ params }) {
    const { cardId, element } = params ?? {};
    const card = run._deck.find(c => c.id === cardId);
    if (!card) return { action: 'no_effect' };

    const current = card.enhancement;

    // No existing enhancement — apply base.
    if (!current) {
      card.enhancement = _createBaseEnhancement(element);
      run.notifyConsumableUsed();
      return { action: 'applied_base' };
    }

    const currentElement = current.element;

    // Same element — no effect (no Badger).
    if (currentElement === element) return { action: 'no_effect' };

    // Generative: the applied element upgrades the current enhancement.
    if (_isGenerativeElement(currentElement, element)) {
      if (current.tier === 'upgraded') return { action: 'no_effect' };   // already at max (no Badger)
      current.tier = 'upgraded';
      if (current.depLevel !== undefined) current.depLevel = 0;   // reset Water dep
      run.notifyConsumableUsed();
      return { action: 'upgraded' };
    }

    // Destructive: the applied element strips the current enhancement.
    if (_isDestructiveElement(currentElement, element)) {
      const returnedElement = currentElement;
      card.enhancement = null;
      run.notifyConsumableUsed();
      return { action: 'stripped', returnedConsumable: `element_${returnedElement}` };
    }

    // Any other element — overwrite with new base.
    card.enhancement = _createBaseEnhancement(element);
    run.notifyConsumableUsed();
    return { action: 'overwritten' };
  },
};
for (const _e of WUXING_CONSUMABLES) _effects[_e.id] = _applyElement;

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
