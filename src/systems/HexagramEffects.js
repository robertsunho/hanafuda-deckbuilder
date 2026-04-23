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
//   modifyPushSuccess(baseMultiplier) → modifiedMultiplier   (default: 1.1)
//   modifyPushFailure(baseMultiplier) → modifiedMultiplier   (default: 0.9)
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

// ── Seasonal helpers ──────────────────────────────────────────────────────────

/**
 * Traditional hanafuda seasons (by month 1–12).
 * Spring = Jan–Mar, Summer = Apr–Jun, Autumn = Jul–Sep, Winter = Oct–Dec.
 */
function getSeason(month) {
  if (month <= 3) return 'spring';
  if (month <= 6) return 'summer';
  if (month <= 9) return 'autumn';
  return 'winter';
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
      if (card.vertical === 'land') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_land: {
    onCardScored(card) {
      if (card.vertical === 'land') return { multiplyMult: 1.5 };
      if (card.vertical === 'air')  return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_day: {
    onCardScored(card) {
      if (card.temporal === 'day')   return { multiplyMult: 1.5 };
      if (card.temporal === 'night') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_night: {
    onCardScored(card) {
      if (card.temporal === 'night') return { multiplyMult: 1.5 };
      if (card.temporal === 'day')   return { multiplyMult: 0.5 };
      return null;
    },
  },

  // ── Combined axis boosts (4) ──────────────────────────────────────────────
  // Each targets the INTERSECTION of two axes.  Cards that hit both axes of the
  // boosted quadrant are boosted; cards that hit both axes of the opposite
  // quadrant are debuffed.  Cards in the other two quadrants are unaffected.

  boost_yang: {
    // Yang = Air ∩ Day (months 3 Mar, 6 Jun)
    // Opposite = Yin = Land ∩ Night (months 1 Jan, 10 Oct)
    onCardScored(card) {
      const isYang = card.vertical === 'air'  && card.temporal === 'day';
      const isYin  = card.vertical === 'land' && card.temporal === 'night';
      if (isYang) return { multiplyMult: 1.5 };
      if (isYin)  return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_yin: {
    // Yin = Land ∩ Night; opposite = Yang = Air ∩ Day
    onCardScored(card) {
      const isYin  = card.vertical === 'land' && card.temporal === 'night';
      const isYang = card.vertical === 'air'  && card.temporal === 'day';
      if (isYin)  return { multiplyMult: 1.5 };
      if (isYang) return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_space: {
    // Space = Air ∩ Night (months 9 Sep, 12 Dec)
    // Opposite = Energy = Land ∩ Day (months 4 Apr, 7 Jul)
    onCardScored(card) {
      const isSpace  = card.vertical === 'air'  && card.temporal === 'night';
      const isEnergy = card.vertical === 'land' && card.temporal === 'day';
      if (isSpace)  return { multiplyMult: 1.5 };
      if (isEnergy) return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_energy: {
    // Energy = Land ∩ Day; opposite = Space = Air ∩ Night
    onCardScored(card) {
      const isEnergy = card.vertical === 'land' && card.temporal === 'day';
      const isSpace  = card.vertical === 'air'  && card.temporal === 'night';
      if (isEnergy) return { multiplyMult: 1.5 };
      if (isSpace)  return { multiplyMult: 0.5 };
      return null;
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
  // Each season boosts itself and debuffs the next season in the cycle.

  boost_spring: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'spring') return { multiplyMult: 2.5 };
      if (s === 'summer') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_summer: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'summer') return { multiplyMult: 2.5 };
      if (s === 'autumn') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_autumn: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'autumn') return { multiplyMult: 2.5 };
      if (s === 'winter') return { multiplyMult: 0.5 };
      return null;
    },
  },

  boost_winter: {
    onCardScored(card) {
      const s = getSeason(card.month);
      if (s === 'winter') return { multiplyMult: 2.5 };
      if (s === 'spring') return { multiplyMult: 0.5 };
      return null;
    },
  },

  // ── Rank boosts (4) ───────────────────────────────────────────────────────
  // Each rank boost raises that rank's yaku threshold by 1 (harder to trigger)
  // while making its cards more valuable.

  boost_brights: {
    onCardScored(card) {
      if (card.type === 'bright') return { multiplyMult: 2.0 };
      return null;
    },
    modifyYakuThreshold(yakuName, baseThreshold) {
      if (yakuName === 'hikari') return baseThreshold + 1;
      return baseThreshold;
    },
  },

  boost_animals: {
    onCardScored(card) {
      if (card.type === 'animal') return { multiplyMult: 1.5 };
      return null;
    },
    modifyYakuThreshold(yakuName, baseThreshold) {
      if (yakuName === 'tane') return baseThreshold + 1;
      return baseThreshold;
    },
  },

  boost_ribbons: {
    onCardScored(card) {
      if (card.type === 'ribbon') return { multiplyMult: 1.3 };
      return null;
    },
    modifyYakuThreshold(yakuName, baseThreshold) {
      if (yakuName === 'tanzaku') return baseThreshold + 1;
      return baseThreshold;
    },
  },

  boost_plains: {
    onCardScored(card) {
      if (card.type === 'plain') return { multiplyMult: 1.2 };
      return null;
    },
    modifyYakuThreshold(yakuName, baseThreshold) {
      if (yakuName === 'kasu') return baseThreshold + 1;
      return baseThreshold;
    },
  },

  // ── Flow variants (2) ─────────────────────────────────────────────────────

  volatile_flow: {
    modifyPushSuccess: () => 1.2,
    modifyPushFailure: () => 0.7,
    modifyFlowDecay:   () => 0.85,
  },

  stable_flow: {
    modifyPushSuccess: () => 1.05,
    modifyPushFailure: () => 0.95,
    modifyFlowDecay:   () => 0.98,
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
      runManager._hexagramState = { disabledYakuIndex: 0, disabledYakuThisRound: null };
    },
    onRoundStart() {
      const YAKU = ['kasu', 'tanzaku', 'tane', 'hikari'];
      if (!run._hexagramState) {
        run._hexagramState = { disabledYakuIndex: 0, disabledYakuThisRound: null };
      }
      const state = run._hexagramState;
      state.disabledYakuThisRound = YAKU[state.disabledYakuIndex % 4];
      state.disabledYakuIndex++;
    },
    modifyYakuThreshold(yakuName, baseThreshold) {
      const disabled = run._hexagramState?.disabledYakuThisRound;
      if (yakuName === disabled) return Infinity;
      return baseThreshold - 1;
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Stubbed effects — implemented in later phases
  // (Empty objects keep applyHook from throwing for any rolled hexagram.)
  // ──────────────────────────────────────────────────────────────────────────

  // TODO: Phase 3B — Wu Xing cycle boosts
  boost_wood:  {},
  boost_fire:  {},
  boost_earth: {},
  boost_metal: {},
  boost_water: {},

  // TODO: Phase 3B — Field/hand modifiers
  field_plus_hand_minus:              {},
  field_minus_hand_plus:              {},
  field_plus_two_double_flip:         {},
  field_minus_two_threshold_minus:    {},

  // TODO: Phase 3B — Spirit slot modifiers
  spirit_plus_cards_minus:            {},
  spirit_minus_cards_plus:            {},
  four_spirits_fire_twice:            {},
  eight_spirits_graduated_tax:        {},

  // TODO: Phase 3C — Deck composition modifiers
  no_brights_plain_threshold_minus:   {},
  deck_36_field_plus:                 {},
  deck_60_hand_plus:                  {},
  no_plains_double_others:            {},
  animal_deck:                        {},
  ribbon_deck:                        {},
  day_deck:                           {},
  night_deck:                         {},
  air_deck:                           {},
  land_deck:                          {},

  // TODO: Phase 3D — Economy modifiers
  no_hand_ki_double_interest:         {},
  start_50_ki_no_income:              {},
  plus_offerings_double_reroll:       {},
  minus_offerings_discount:           {},
  no_banking_ki_plus_capture:         {},
  push_ki_swing:                      {},
  price_increase_more_consumable_slots: {},

  // TODO: Phase 3E — Radical mode changes
  deck_flip_revealed:                 {},
  yaku_ends_round:                    {},
  play_two_cards:                     {},
  match_by_rank:                      {},
  match_by_adjacent_month:            {},
  score_field_at_round_end:           {},
  randomized_deck:                    {},
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
 *   const mult  = applyHook('modifyPushSuccess', 1.1);
 */
export function applyHook(hookName, fallback, ...args) {
  const effect = getActiveEffect();
  if (!effect || typeof effect[hookName] !== 'function') return fallback;
  return effect[hookName](...args);
}
