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
  // Phase 3B effects
  // ──────────────────────────────────────────────────────────────────────────

  // ── Wu Xing cycle boosts (5) ──────────────────────────────────────────────
  // Each element boosts its own enhancement and weakens the element it destroys
  // in the destructive cycle (Wood→Earth, Earth→Water, Water→Fire, Fire→Metal,
  // Metal→Wood).

  boost_wood: {
    modifyFirePoints:      (tier) => tier === 'upgraded' ? 50  : 15,
    modifyFireBreakChance: (tier) => tier === 'upgraded' ? 0.20 : 0.40,
    modifyWoodScoring:     (tier) => tier === 'upgraded' ? 1.5  : 1.3,
  },

  boost_fire: {
    modifyFirePoints:      (tier) => tier === 'upgraded' ? 200 : 60,
    modifyFireBreakChance: (tier) => tier === 'upgraded' ? 0.05 : 0.10,
    modifyEarthInterest:   (tier) => tier === 'upgraded' ? 0.10 : 0.05,
  },

  boost_earth: {
    modifyEarthHeld:        (tier) => tier === 'upgraded' ? 1.5  : 1.2,
    modifyMetalHeldMult:    (tier) => tier === 'upgraded' ? 2.5  : 1.25,
    modifyMeteoriteJackpot: ()     => 0.02,
  },

  boost_metal: {
    modifyMetalHeldMult:     (tier) => tier === 'upgraded' ? 3.5  : 1.75,
    modifyMeteoriteJackpot:  ()     => 0.15,
    modifyWaterDepreciation: (tier) => tier === 'upgraded' ? 0.7  : 0.4,
  },

  boost_water: {
    modifyWaterDepreciation: (tier) => tier === 'upgraded' ? 0.3  : 0.15,
    modifyWoodScoring:       (tier) => tier === 'upgraded' ? 0.5  : 0.7,
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
      const spiritCount = run.spirits.length;
      const TAX_BY_COUNT = { 5: 1, 6: 3, 7: 6, 8: 10 };
      const totalTax = TAX_BY_COUNT[spiritCount] ?? 0;
      if (totalTax > 0) run.spendKi(Math.min(totalTax, run.ki));
    },
  },

  // ── Phase 3C — Deck composition modifiers ────────────────────────────────

  no_brights_plain_threshold_minus: {
    modifyDeck(cards) {
      return cards.filter(c => c.type !== 'bright');
    },
    modifyYakuThreshold(yakuName, base) {
      if (yakuName === 'kasu') return base - 1;
      return base;
    },
  },

  deck_36_field_plus: {
    modifyDeck(cards) {
      const modified = [...cards];
      for (let month = 1; month <= 12; month++) {
        const idx = modified.findIndex(c => c.month === month && c.type === 'plain');
        if (idx >= 0) modified.splice(idx, 1);
      }
      return modified;
    },
    modifyFieldSlots: (base) => base + 1,
  },

  deck_60_hand_plus: {
    modifyDeck(cards) {
      const modified = [...cards];
      for (let month = 1; month <= 12; month++) {
        const plain = cards.find(c => c.month === month && c.type === 'plain');
        if (plain) {
          modified.push({
            ...JSON.parse(JSON.stringify(plain)),
            id: plain.id + '_guan_duplicate',
            hexDuplicate: true,
          });
        }
      }
      return modified;
    },
    modifyHandSize: (base) => base + 1,
  },

  no_plains_double_others: {
    modifyDeck(cards) {
      const nonPlains = cards.filter(c => c.type !== 'plain');
      const modified = [];
      for (const card of nonPlains) {
        modified.push(card);
        modified.push({
          ...JSON.parse(JSON.stringify(card)),
          id: card.id + '_bo_duplicate',
          hexDuplicate: true,
        });
      }
      return modified;
    },
  },

  animal_deck: {
    modifyDeck(cards) {
      const rankOrder = { bright: 4, animal: 3, ribbon: 2, plain: 1 };
      const modified  = [];

      for (let month = 1; month <= 12; month++) {
        const monthCards = cards.filter(c => c.month === month);
        let animal = monthCards.find(c => c.type === 'animal');

        if (!animal) {
          // Nearest month with an animal
          for (let offset = 1; offset < 12 && !animal; offset++) {
            const prevMonth = ((month - 1 - offset + 12) % 12) + 1;
            const nextMonth = ((month - 1 + offset)      % 12) + 1;
            animal = cards.find(c =>
              (c.month === prevMonth || c.month === nextMonth) && c.type === 'animal'
            );
          }
        }

        if (!animal) { modified.push(...monthCards); continue; }

        const nonAnimals = monthCards
          .filter(c => c.type !== 'animal')
          .sort((a, b) => rankOrder[b.type] - rankOrder[a.type]);

        if (nonAnimals.length === 0) { modified.push(...monthCards); continue; }

        const toReplace = nonAnimals[0].id;
        for (const card of monthCards) {
          if (card.id === toReplace) {
            modified.push({
              ...JSON.parse(JSON.stringify(animal)),
              id: `${animal.id}_sui_${month}`,
              month,
              hexReplaced: true,
            });
          } else {
            modified.push(card);
          }
        }
      }
      return modified;
    },
  },

  ribbon_deck: {
    modifyDeck(cards) {
      const rankOrder = { bright: 4, animal: 3, ribbon: 2, plain: 1 };
      const modified  = [];

      for (let month = 1; month <= 12; month++) {
        const monthCards = cards.filter(c => c.month === month);
        let ribbon = monthCards.find(c => c.type === 'ribbon');

        if (!ribbon) {
          for (let offset = 1; offset < 12 && !ribbon; offset++) {
            const prevMonth = ((month - 1 - offset + 12) % 12) + 1;
            const nextMonth = ((month - 1 + offset)      % 12) + 1;
            ribbon = cards.find(c =>
              (c.month === prevMonth || c.month === nextMonth) && c.type === 'ribbon'
            );
          }
        }

        if (!ribbon) { modified.push(...monthCards); continue; }

        const nonRibbons = monthCards
          .filter(c => c.type !== 'ribbon')
          .sort((a, b) => rankOrder[b.type] - rankOrder[a.type]);

        if (nonRibbons.length === 0) { modified.push(...monthCards); continue; }

        const toReplace = nonRibbons[0].id;
        for (const card of monthCards) {
          if (card.id === toReplace) {
            modified.push({
              ...JSON.parse(JSON.stringify(ribbon)),
              id: `${ribbon.id}_xian_${month}`,
              month,
              hexReplaced: true,
            });
          } else {
            modified.push(card);
          }
        }
      }
      return modified;
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

  no_banking_ki_plus_capture: {
    modifyKiReward:     () => 0,
    modifyInterestRate: () => 0,
    onCaptureComplete({ run: r }) {
      r.addKi(1);
    },
  },

  push_ki_swing: {
    onPushSuccess(r) {
      r.addKi(10);
    },
    onPushFailure(r) {
      r.spendKi(Math.min(10, r.ki));
    },
  },

  price_increase_more_consumable_slots: {
    modifyShopPrice: (basePrice) => Math.ceil(basePrice * 1.25),
    onRunStart(runManager) {
      runManager._maxConsumableSlots = 5;
    },
  },

  // TODO: Phase 3E — Radical mode changes
  deck_flip_revealed:                 {},
  yaku_ends_round:                    {},
  play_two_cards:                     {},
  match_by_rank: {
    overridesCaptureRule: () => 'rank',
    disablesYaku: () => true,
  },
  match_by_adjacent_month: {
    overridesCaptureRule: () => 'adjacent_month',
  },
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
