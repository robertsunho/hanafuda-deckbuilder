// ─────────────────────────────────────────────────────────────────────────────
// HexagramEffects — run-level modifier registry
//
// Each key is an effect ID from hexagrams.js.  Values are objects with optional
// hook functions.  Only the hooks an effect needs should be defined.
//
// Hook signatures (all optional):
//
//   onRunStart(runManager)        — called once when setHexagram() assigns a hex
//   onRoundStart(roundManager)    — called at startRound()
//   onRoundEnd(roundManager)      — called when phase transitions to 'round_over'
//
//   onCardScored(card, context)   — return { addPoints?, addMult?, multiplyMult? } | null
//     context: { currentPoints, currentMult }
//
//   modifyYakuThreshold(yakuName, baseThreshold) → modifiedThreshold
//   modifyFieldSlots(baseSlots) → modifiedSlots
//   modifyHandSize(baseSize) → modifiedSize
//   modifySpiritSlots(baseSlots) → modifiedSlots
//   modifyCardsDealt(baseCount, phase) → modifiedCount
//     phase: 'initial' | 'push1' | 'push2' | 'push3plus'
//
//   pushCurveSuccessAmplifier(baseAmp) → modifiedAmp   (default: 1.0)
//   pushCurveFailureAmplifier(baseAmp) → modifiedAmp   (default: 1.0)
//   modifyFlowDecay(baseMultiplier) → modifiedMultiplier     (default: 0.95)
//   modifyInitialFlow(baseFlow) → modifiedFlow
//
//   modifyKiReward(baseKi, context) → modifiedKi
//   modifyInterestRate(baseRate) → modifiedRate
//   modifyHandKi(baseHandKi) → modifiedHandKi
//   modifyShopCount(baseCount, section) → modifiedCount
//   modifyShopPrice(basePrice, item) → modifiedPrice
//   modifyRerollCost(baseCost, rerollIndex) → modifiedCost
//
//   modifyDeck(cards) → modifiedCards   — applied once at run start
//
//   overridesCaptureRule() → 'month' | 'rank' | 'adjacent_month'
//
//   computeFinalScore(points, mult, flow) → score
//     overrides the per-capture formula: Math.round(points * mult * flow)
//
//   modifyStyleKi(baseKi) → modifiedKi
//   modifyStyleFlow(baseFlow) → modifiedFlow
//
// ─────────────────────────────────────────────────────────────────────────────

import run from './RunManager.js';
import { cards as ALL_CARDS_WITH_SPEC } from '../data/cards.js';

// ── Deck composition helpers ──────────────────────────────────────────────────

/** Fisher-Yates in-place shuffle. */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Seasonal helpers ──────────────────────────────────────────────────────────

/**
 * Hanafuda seasons aligned with design doc and spirit-side definitions.
 * Spring = Mar-May, Summer = Jun-Aug, Autumn = Sep-Nov, Winter = Dec-Feb.
 */
function getSeason(month) {
  if (month >= 3 && month <= 5)  return 'spring';
  if (month >= 6 && month <= 8)  return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';  // Dec, Jan, Feb
}

// ── Effect registry ───────────────────────────────────────────────────────────

export const HEXAGRAM_EFFECTS = {

  // ──────────────────────────────────────────────────────────────────────────
  // Implemented Phase 3A effects
  // ──────────────────────────────────────────────────────────────────────────

  // ── No effect ─────────────────────────────────────────────────────────────

  no_effect: {},

  // ── Individual axis boosts (4) ────────────────────────────────────────────

  boost_air: {
    onCardScored(card) {
      if (card.vertical === 'air')  return { multiplyMult: 1.5 };
      if (card.vertical === 'land') return { multiplyMult: 0.75 };
      return null;
    },
  },

  boost_land: {
    onCardScored(card) {
      if (card.vertical === 'land') return { multiplyMult: 1.5 };
      if (card.vertical === 'air')  return { multiplyMult: 0.75 };
      return null;
    },
  },

  boost_day: {
    onCardScored(card) {
      if (card.temporal === 'day')   return { multiplyMult: 1.5 };
      if (card.temporal === 'night') return { multiplyMult: 0.75 };
      return null;
    },
  },

  boost_night: {
    onCardScored(card) {
      if (card.temporal === 'night') return { multiplyMult: 1.5 };
      if (card.temporal === 'day')   return { multiplyMult: 0.75 };
      return null;
    },
  },

  // ── Combined axis boosts (4) ──────────────────────────────────────────────
  // OR-logic compounding: each axis is evaluated independently and stacked
  // multiplicatively.  A card matching both buff axes: ×2.25; both debuff
  // axes: ×0.5625; mixed (one buff + one debuff): ×1.125.

  boost_yang: {
    // Yang: Air ×1.5, Day ×1.5; Land ×0.75, Night ×0.75
    onCardScored(card) {
      let mult = 1.0;
      if (card.vertical === 'air')   mult *= 1.5;
      if (card.vertical === 'land')  mult *= 0.75;
      if (card.temporal === 'day')   mult *= 1.5;
      if (card.temporal === 'night') mult *= 0.75;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  boost_yin: {
    // Yin: Land ×1.5, Night ×1.5; Air ×0.75, Day ×0.75
    onCardScored(card) {
      let mult = 1.0;
      if (card.vertical === 'land')  mult *= 1.5;
      if (card.vertical === 'air')   mult *= 0.75;
      if (card.temporal === 'night') mult *= 1.5;
      if (card.temporal === 'day')   mult *= 0.75;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  boost_space: {
    // Space: Air ×1.5, Night ×1.5; Land ×0.75, Day ×0.75
    onCardScored(card) {
      let mult = 1.0;
      if (card.vertical === 'air')   mult *= 1.5;
      if (card.vertical === 'land')  mult *= 0.75;
      if (card.temporal === 'night') mult *= 1.5;
      if (card.temporal === 'day')   mult *= 0.75;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  boost_energy: {
    // Energy: Land ×1.5, Day ×1.5; Air ×0.75, Night ×0.75
    onCardScored(card) {
      let mult = 1.0;
      if (card.vertical === 'land')  mult *= 1.5;
      if (card.vertical === 'air')   mult *= 0.75;
      if (card.temporal === 'day')   mult *= 1.5;
      if (card.temporal === 'night') mult *= 0.75;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  // ── Combined seasonal boosts (4) ─────────────────────────────────────────

  boost_equinox: {
    // Equinox months: Mar (3) and Sep (9) — ×3.0
    // Solstice months: Jun (6) and Dec (12) — ×0.5
    onCardScored(card) {
      const m = card.month;
      if (m === 3 || m === 9)  return { multiplyMult: 3.0 };
      if (m === 6 || m === 12) return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_solstice: {
    // Solstice months: Jun (6) and Dec (12) — ×3.0
    // Equinox months: Mar (3) and Sep (9) — ×0.5
    onCardScored(card) {
      const m = card.month;
      if (m === 6 || m === 12) return { multiplyMult: 3.0 };
      if (m === 3 || m === 9)  return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_tropic: {
    // Tropic months: Apr (4), May (5), Jul (7), Aug (8) — ×2.5
    // Arctic months: Oct (10), Nov (11), Jan (1), Feb (2) — ×0.5
    onCardScored(card) {
      const m = card.month;
      if (m === 4 || m === 5 || m === 7 || m === 8)  return { multiplyMult: 2.5 };
      if (m === 10 || m === 11 || m === 1 || m === 2) return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_arctic: {
    // Arctic months: Oct (10), Nov (11), Jan (1), Feb (2) — ×2.5
    // Tropic months: Apr (4), May (5), Jul (7), Aug (8) — ×0.5
    onCardScored(card) {
      const m = card.month;
      if (m === 10 || m === 11 || m === 1 || m === 2) return { multiplyMult: 2.5 };
      if (m === 4 || m === 5 || m === 7 || m === 8)   return { multiplyMult: 0.5 };
      return null;
    },
  },

  // ── Individual seasonal boosts (4) ────────────────────────────────────────
  // Each season boosts itself and debuffs its opposite season.

  boost_spring: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'spring') return { multiplyMult: 2.0 };
      if (s === 'autumn') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_summer: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'summer') return { multiplyMult: 2.0 };
      if (s === 'winter') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_autumn: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'autumn') return { multiplyMult: 2.0 };
      if (s === 'spring') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_winter: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'winter') return { multiplyMult: 2.0 };
      if (s === 'summer') return { multiplyMult: 0.5 };
      return null;
    },
  },

  // ── Rank boosts (4) ───────────────────────────────────────────────────────
  // Each rank boost amplifies its named rank and debuffs a cross-paired rank.
  // Buff scales inversely with rank rarity; debuff strength scales inversely
  // with the debuff target's deck count.

  boost_brights: {
    onCardScored(card) {
      if (card.type === 'bright') return { multiplyMult: 1.5 };
      if (card.type === 'plain')  return { multiplyMult: 0.9 };
      return null;
    },
  },

  boost_animals: {
    onCardScored(card) {
      if (card.type === 'animal') return { multiplyMult: 2.0 };
      if (card.type === 'bright') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_ribbons: {
    onCardScored(card) {
      if (card.type === 'ribbon') return { multiplyMult: 2.0 };
      if (card.type === 'animal') return { multiplyMult: 0.7 };
      return null;
    },
  },

  boost_plains: {
    onCardScored(card) {
      if (card.type === 'plain')  return { multiplyMult: 3.0 };
      if (card.type === 'ribbon') return { multiplyMult: 0.7 };
      return null;
    },
  },

  // ── Flow variants (2) ─────────────────────────────────────────────────────

  volatile_flow: {
    pushCurveSuccessAmplifier: () => 1.5,
    pushCurveFailureAmplifier: () => 1.5,
    modifyFlowDecay:           () => 0.85,
  },

  stable_flow: {
    pushCurveSuccessAmplifier: () => 0.5,
    pushCurveFailureAmplifier: () => 0.5,
    modifyFlowDecay:           () => 0.98,
  },

  // ── Style combo variants (2) ──────────────────────────────────────────────

  style_ki_double: {
    modifyStyleKi:   (baseKi)   => baseKi * 2,
    modifyStyleFlow: ()         => 0,
  },

  style_flow_double: {
    modifyStyleFlow: (baseFlow) => baseFlow * 2,
    modifyStyleKi:   ()         => 0,
  },

  // ── Balanced scoring (1) ──────────────────────────────────────────────────

  balanced_scoring: {
    // Replaces per-capture formula: Math.round(points * mult * flow)
    computeFinalScore(points, mult, flow) {
      return Math.round(((points + mult) / 2) ** 2 * flow);
    },
  },

  // ── One yaku disabled (1) ─────────────────────────────────────────────────
  // Cycles through kasu → tanzaku → tane → hikari each round.
  // The disabled yaku gets Infinity threshold (unreachable).
  // All other yaku get baseThreshold − 1.

  one_yaku_disabled: {
    onRunStart(runManager) {
      runManager._hexagramState = { lastDisabledYaku: null, disabledYakuThisRound: null };
    },
    onRoundStart() {
      const YAKU = ['kasu', 'tanzaku', 'tane', 'hikari'];
      if (!run._hexagramState) {
        run._hexagramState = { lastDisabledYaku: null, disabledYakuThisRound: null };
      }
      const state = run._hexagramState;
      const candidates = YAKU.filter(y => y !== state.lastDisabledYaku);
      state.disabledYakuThisRound = candidates[Math.floor(Math.random() * candidates.length)];
      state.lastDisabledYaku = state.disabledYakuThisRound;
    },
    modifyYakuThreshold(yakuName, baseThreshold) {
      const disabled = run._hexagramState?.disabledYakuThisRound;
      if (yakuName === disabled) return Infinity;
      return baseThreshold;
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 3B effects
  // ──────────────────────────────────────────────────────────────────────────

  // ── Wu Xing cycle boosts (5) ──────────────────────────────────────────────
  // Each element boosts its own enhancement and weakens its predator
  // (the element that destroys it in the destructive cycle):
  //   boost_wood  → weakens Metal  (Metal destroys Wood)
  //   boost_fire  → weakens Water  (Water destroys Fire)
  //   boost_earth → weakens Wood   (Wood destroys Earth)
  //   boost_metal → weakens Fire   (Fire destroys Metal)
  //   boost_water → weakens Earth  (Earth destroys Water)

  boost_wood: {
    modifyWoodScoring:      (tier) => tier === 'upgraded' ? 1.5  : 1.3,
    modifyMetalHeldMult:    (tier) => tier === 'upgraded' ? 2.5  : 1.25,
    modifyMeteoriteJackpot: ()     => 0.02,
  },

  boost_fire: {
    modifyFirePoints:        (tier) => tier === 'upgraded' ? 200 : 60,
    modifyFireBreakChance:   (tier) => tier === 'upgraded' ? 0.05 : 0.10,
    modifyWaterDepreciation: (tier) => tier === 'upgraded' ? 0.7  : 0.4,
  },

  boost_earth: {
    modifyEarthHeld:    (tier) => tier === 'upgraded' ? 1.5  : 1.2,
    modifyWoodScoring:  (tier) => tier === 'upgraded' ? 0.5  : 0.7,
  },

  boost_metal: {
    modifyMetalHeldMult:    (tier) => tier === 'upgraded' ? 3.5  : 1.75,
    modifyMeteoriteJackpot: ()     => 0.15,
    modifyFirePoints:       (tier) => tier === 'upgraded' ? 50  : 15,
    modifyFireBreakChance:  (tier) => tier === 'upgraded' ? 0.20 : 0.40,
  },

  boost_water: {
    modifyWaterDepreciation: (tier) => tier === 'upgraded' ? 0.3  : 0.15,
    modifyEarthInterest:     (tier) => tier === 'upgraded' ? 0.10 : 0.05,
  },

  // ── Field/hand modifier effects (4) ──────────────────────────────────────

  field_plus_hand_minus: {
    modifyFieldSlots: (base) => base + 1,
    modifyHandSize:   (base) => base - 1,
  },

  field_minus_hand_plus: {
    modifyFieldSlots: (base) => base - 1,
    modifyHandSize:   (base) => base + 1,
  },

  field_plus_two_double_flip: {
    modifyFieldSlots:       (base) => base + 2,
    modifyDeckFlipsPerTurn: ()     => 2,
  },

  field_minus_two_threshold_minus: {
    modifyFieldSlots:    (base)           => base - 2,
    modifyYakuThreshold: (yakuName, base) => base - 1,
  },

  // ── Spirit slot modifier effects (4) ─────────────────────────────────────

  spirit_plus_cards_minus: {
    modifySpiritSlots: (base) => base + 1,
    modifyCardsDealt:  (base) => Math.max(0, base - 1),
  },

  spirit_minus_cards_plus: {
    modifySpiritSlots: (base) => base - 1,
    modifyCardsDealt:  (base) => base + 1,
  },

  four_spirits_fire_twice: {
    modifySpiritSlots:      () => 4,
    shouldSpiritsFireTwice: () => true,
  },

  eight_spirits_graduated_tax: {
    modifySpiritSlots: () => 8,
    onRoundEnd() {
      const spiritCount = run.scoringSpirits.length;
      const excess = Math.max(0, spiritCount - 4);
      const tax = excess * 3;
      if (tax > 0) run.spendKi(Math.min(tax, run.ki));
    },
  },

  // ── Phase 3C — Deck composition modifiers ────────────────────────────────

  bright_and_plains: {
    modifyDeck() {
      const deck = [];
      for (let month = 1; month <= 12; month++) {
        const bright = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'bright');
        if (bright) deck.push(bright);
        const plains = ALL_CARDS_WITH_SPEC.filter(c => c.month === month && c.type === 'plain');
        if (plains[0]) deck.push(plains[0]);
        if (plains[1]) deck.push(plains[1], plains[1]);
      }
      return deck;
    },
  },

  deck_36: {
    modifyDeck() {
      const deck = [];
      for (let month = 1; month <= 12; month++) {
        const bright = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'bright');
        const animal = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'animal');
        const ribbon = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'ribbon');
        if (bright) deck.push(bright);
        if (animal) deck.push(animal);
        if (ribbon) deck.push(ribbon);
      }
      return deck;
    },
    modifyFieldSlots: (base) => base + 1,
  },

  deck_60: {
    modifyDeck() {
      const deck = [];
      for (let month = 1; month <= 12; month++) {
        const bright = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'bright');
        const animal = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'animal');
        const ribbon = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'ribbon');
        const plains = ALL_CARDS_WITH_SPEC.filter(c => c.month === month && c.type === 'plain');
        if (bright) deck.push(bright);
        if (animal) deck.push(animal);
        if (ribbon) deck.push(ribbon);
        deck.push(...plains.slice(0, 2));
      }
      return deck;
    },
    modifyHandSize: (base) => base + 1,
  },

  all_plains_doubled: {
    modifyDeck() {
      const deck = [];
      for (let month = 1; month <= 12; month++) {
        const plains = ALL_CARDS_WITH_SPEC.filter(c => c.month === month && c.type === 'plain');
        if (plains[0]) deck.push(plains[0], plains[0]);
        if (plains[1]) deck.push(plains[1], plains[1]);
      }
      return deck;
    },
  },

  animal_deck: {
    modifyDeck() {
      const deck = [];
      for (let month = 1; month <= 12; month++) {
        const animal = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'animal');
        if (animal) deck.push(animal, animal);
        const plains = ALL_CARDS_WITH_SPEC.filter(c => c.month === month && c.type === 'plain');
        deck.push(...plains.slice(0, 2));
      }
      return deck;
    },
  },

  ribbon_deck: {
    modifyDeck() {
      const deck = [];
      for (let month = 1; month <= 12; month++) {
        const ribbon = ALL_CARDS_WITH_SPEC.find(c => c.month === month && c.type === 'ribbon');
        if (ribbon) deck.push(ribbon, ribbon);
        const plains = ALL_CARDS_WITH_SPEC.filter(c => c.month === month && c.type === 'plain');
        deck.push(...plains.slice(0, 2));
      }
      return deck;
    },
  },

  day_deck: {
    modifyDeck(cards) {
      const dayCards = cards.filter(c => c.temporal === 'day');
      return [
        ...dayCards,
        ...dayCards.map(c => ({
          ...JSON.parse(JSON.stringify(c)),
          id: c.id + '_wuwang_duplicate',
          baseImageId: c.id,
          hexDuplicate: true,
        })),
      ];
    },
  },

  night_deck: {
    modifyDeck(cards) {
      const nightCards = cards.filter(c => c.temporal === 'night');
      return [
        ...nightCards,
        ...nightCards.map(c => ({
          ...JSON.parse(JSON.stringify(c)),
          id: c.id + '_jian_duplicate',
          baseImageId: c.id,
          hexDuplicate: true,
        })),
      ];
    },
  },

  air_deck: {
    modifyDeck(cards) {
      const airCards = cards.filter(c => c.vertical === 'air');
      return [
        ...airCards,
        ...airCards.map(c => ({
          ...JSON.parse(JSON.stringify(c)),
          id: c.id + '_gou_duplicate',
          baseImageId: c.id,
          hexDuplicate: true,
        })),
      ];
    },
  },

  land_deck: {
    modifyDeck(cards) {
      const landCards = cards.filter(c => c.vertical === 'land');
      return [
        ...landCards,
        ...landCards.map(c => ({
          ...JSON.parse(JSON.stringify(c)),
          id: c.id + '_jiaren_duplicate',
          baseImageId: c.id,
          hexDuplicate: true,
        })),
      ];
    },
  },

  // ── Phase 3D — Economy modifiers ──────────────────────────────────────────

  no_hand_ki_double_interest: {
    modifyHandKi:       () => 0,
    modifyInterestRate: (baseRate) => baseRate * 2,
  },

  start_50_ki_no_income: {
    onRunStart(runManager) {
      runManager._ki = 50;
    },
    modifyHandKi:       () => 0,
    modifyInterestRate: () => 0,
    modifyKiReward:     () => 0,
  },

  plus_offerings_double_reroll: {
    modifyShopCount:  (baseCount) => baseCount + 1,
    modifyRerollCost: (baseCost)  => baseCost * 2,
  },

  minus_offerings_discount: {
    modifyShopCount: (baseCount) => Math.max(1, baseCount - 1),
    modifyShopPrice: (basePrice) => Math.ceil(basePrice * 0.75),
  },

  no_hand_ki_plus_capture: {
    modifyHandKi: () => 0,
    onCaptureComplete({ run: r }) {
      r.addKi(3, 'hex_capture_bonus');
    },
  },

  push_ki_swing: {
    onPushSuccess(r) {
      r.addKi(10, 'hex_push_ki_success');
    },
    onPushFailure(r) {
      r.spendKi(Math.min(10, r.ki));
    },
    onBank(r) {
      r.spendKi(Math.min(5, r.ki));
    },
  },

  price_increase_more_consumable_slots: {
    modifyShopPrice: (basePrice) => Math.ceil(basePrice * 1.25),
    onRunStart(runManager) {
      runManager._maxConsumableSlots = 5;
    },
  },

  // ── Phase 3E — Radical mode changes ──────────────────────────────────────

  deck_flip_revealed: {
    revealsDeckFlip: () => true,
    discardUnmatchedDeckFlip: () => true,
  },
  yaku_ends_round: {
    forceAutoBankOnYaku: () => true,
    modifyFlowDecay: () => 1.0,
  },
  play_two_cards: {
    modifyPlaysPerTurn: () => 2,
  },
  match_by_rank: {
    overridesCaptureRule: () => 'rank',
    disablesYaku: () => true,
  },
  match_by_adjacent_month: {
    overridesCaptureRule: () => 'adjacent_month',
  },
  score_field_at_round_end: {
    disableCaptureScoring: () => true,
    scoreFieldAtRoundEnd: () => true,
  },
  randomized_deck: {
    modifyDeck(cards) {
      const months = cards.map(c => c.month);
      const types  = cards.map(c => c.type);

      shuffleArray(months);
      shuffleArray(types);

      return cards.map((card, i) => ({
        ...JSON.parse(JSON.stringify(card)),
        month: months[i],
        type: types[i],
        hexRandomized: true,
      }));
    },
  },
};

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Return the active effect definition for the current run, or null when no
 * hexagram has been assigned or the effect id is unknown.
 * @returns {object|null}
 */
export function getActiveEffect() {
  const hex = run.getHexagram();
  if (!hex) return null;
  const effect = HEXAGRAM_EFFECTS[hex.effect];
  if (!effect) {
    console.warn(`[HexagramEffects] Unknown effect id: "${hex.effect}" — running as no_effect.`);
    return null;
  }
  return effect;
}

/**
 * Call a named hook on the active effect if it exists; otherwise return
 * the fallback value.
 *
 * @param {string}  hookName   e.g. 'modifyFieldSlots'
 * @param {*}       fallback   Returned when no effect or hook is not defined.
 * @param {...*}    args       Passed directly to the hook function.
 * @returns {*}
 *
 * @example
 *   const slots = applyHook('modifyFieldSlots', MAX_FIELD_SLOTS);
 *   const amp   = applyHook('pushCurveSuccessAmplifier', 1.0);
 */
export function applyHook(hookName, fallback, ...args) {
  const effect = getActiveEffect();
  if (!effect || typeof effect[hookName] !== 'function') return fallback;
  return effect[hookName](...args);
}

// ── Wu Xing value helpers ─────────────────────────────────────────────────────
// These replace every hardcoded enhancement constant in the codebase.
// Each reads the base default and delegates to any active hexagram override.

export function getFireFlatPoints(tier) {
  return applyHook('modifyFirePoints', tier === 'upgraded' ? 100 : 30, tier);
}

export function getFireBreakChance(tier) {
  return applyHook('modifyFireBreakChance', tier === 'upgraded' ? 0.10 : 0.20, tier);
}

/**
 * Compute the current Water mult for a card.
 * Mirrors SNOW_MULT/ICE_MULT arrays at default rates; hexagram can alter the
 * depreciation rate via modifyWaterDepreciation.
 */
export function getWaterMult(tier, depLevel) {
  const base  = tier === 'upgraded' ? 4.0 : 2.0;
  const floor = tier === 'upgraded' ? 0.25 : 0.5;
  const rate  = applyHook('modifyWaterDepreciation', tier === 'upgraded' ? 0.5 : 0.25, tier);
  return Math.max(floor, base - (depLevel ?? 0) * rate);
}

export function getMetalHeldMult(tier) {
  return applyHook('modifyMetalHeldMult', tier === 'upgraded' ? 3.0 : 1.5, tier);
}

export function getMeteoriteJackpotChance() {
  return applyHook('modifyMeteoriteJackpot', 0.05, 0.05);
}

export function getEarthInterestRate(tier) {
  return applyHook('modifyEarthInterest', tier === 'upgraded' ? 0.20 : 0.10, tier);
}

export function getWoodScoringMult(tier) {
  return applyHook('modifyWoodScoring', 1.0, tier);
}

export function getEarthHeldMult(tier) {
  return applyHook('modifyEarthHeld', 1.0, tier);
}
