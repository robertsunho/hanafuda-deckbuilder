// ─────────────────────────────────────────────────────────────────────────────
// Spirit hook interface (F2.1.b)
//
// Lifecycle hooks fire at specific game events. All receive:
//   { spirit, spirits, run, roundManager }
//
//   onRoundStart(ctx)  — after state reset, before scoring state init
//   onRoundEnd(ctx)    — at round-over (both bank and natural end)
//   onBank(ctx)        — at explicit bank only (NOT natural/forced/consumable round-end)
//   onPushFailure(ctx) — at natural round-over with active push penalty only
//   onPushSuccess(ctx) — when a push succeeds (a new yaku completes while the push
//                        penalty is active), fired in _finalizeTurn (Reward)
//
// Event-data hooks (carry event payload instead of the standard ctx):
//   onCaptureComplete({ cards, run })             — once after a capture resolves (Glory)
//   onFieldDiscard({ card, source, spirit, run }) — once per discarded card; post-commit
//                                                   side-effects only (Recycling, Ship)
//
// Hooks fire once per equipped spirit instance (regular + Negative). Use
// effectivePower(spirit) inside for per-stack scaling. A hook that should ignore
// Negatives (e.g. those mirroring a prior run.activeSpirits-only path) guards on
// spirit.isNegative.
// ─────────────────────────────────────────────────────────────────────────────
//
// SpiritEffects — per-card spirit scoring registry
//
// New interface (three optional hooks per spirit):
//
//   onCardScored({ card, spirit, spirits }) → { addPoints?, addMult?, multiplyMult? } | null
//     Fires once for EACH card in the current capture group, in spirit slot order.
//     Per-card spirits (foundations, seasonal, axis, cross-fusions) use this.
//
//   onCardSeen({ card, spirit }) → void
//     Fires once per card to update engine internal state WITHOUT applying effects.
//     Runs alongside onCardScored in Phase 1.
//
//   applyEngine({ spirit, mult, points, spirits }) → { addPoints?, addMult?, multiplyMult? } | null
//     Fires once per capture event in Phase 2 (after all cards processed).
//     Engine spirits accumulate state via onCardSeen, then apply in Phase 2.
//     ORDER MATTERS: engines are applied left-to-right by spirit slot index.
//
// Scoring formula per capture event:
//   Phase 1: for each card — process onCardScored + onCardSeen → accumulate points, mult
//   Phase 2: for each engine — applyEngine → further adjust mult
//   Score = round(points × mult × run.flow)
//
// Fire-enhanced cards have no month, vertical, or temporal identity.
// All factory functions skip them so they can't trigger seasonal/axis spirit effects.
// ─────────────────────────────────────────────────────────────────────────────

import run, { effectivePower, aggregateNumericState, aggregateArrayLength,
               incrementPerElement, addUniqueToElements } from './RunManager.js';
import { addCardBonusPoints } from './CardMutations.js';
import { getStampDef } from '../data/stamps.js';

/** Maps ribbon card IDs to the stamp color they generate for Festival. */
const RIBBON_STAMP_MAP = {
  // Poetry ribbons → red
  january_ribbon: 'stamp_red', february_ribbon: 'stamp_red', march_ribbon: 'stamp_red',
  // Blue ribbons → blue
  june_ribbon: 'stamp_blue', september_ribbon: 'stamp_blue', october_ribbon: 'stamp_blue',
  // Plain ribbons → yellow
  april_ribbon: 'stamp_yellow', may_ribbon: 'stamp_yellow', july_ribbon: 'stamp_yellow',
  // Special ribbon → white
  november_ribbon: 'stamp_white',
};

// ── Factory helpers ───────────────────────────────────────────────────────────

function monthPointAdd(months, flatAmt) {
  const set = new Set(months);
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (set.has(card.month)) return { addPoints: flatAmt };
      return null;
    },
  };
}

function monthMultAdd(months, bonusPerCard) {
  const set = new Set(months);
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (set.has(card.month)) return { addMult: bonusPerCard };
      return null;
    },
  };
}

function monthFusion(months, flatAmt, bonusPerCard) {
  const set = new Set(months);
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (set.has(card.month)) return { addPoints: flatAmt, addMult: bonusPerCard };
      return null;
    },
  };
}

function verticalPointAdd(vertical, flatAmt) {
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.vertical === vertical) return { addPoints: flatAmt };
      return null;
    },
  };
}

function verticalMultAdd(vertical, bonusPerCard) {
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.vertical === vertical) return { addMult: bonusPerCard };
      return null;
    },
  };
}

function verticalFusion(vertical, flatAmt, bonusPerCard) {
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.vertical === vertical) return { addPoints: flatAmt, addMult: bonusPerCard };
      return null;
    },
  };
}

function temporalPointAdd(temporal, flatAmt) {
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.temporal === temporal) return { addPoints: flatAmt };
      return null;
    },
  };
}

function temporalMultAdd(temporal, bonusPerCard) {
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.temporal === temporal) return { addMult: bonusPerCard };
      return null;
    },
  };
}

function temporalFusion(temporal, flatAmt, bonusPerCard) {
  return {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.temporal === temporal) return { addPoints: flatAmt, addMult: bonusPerCard };
      return null;
    },
  };
}

// ── Meta spirit helpers ─────────────────────────────────────────────────────

/** Recursion guard for Memory↔Mirror cross-references. */
const _metaInProgress = new Set();

function _evaluateWithGuard(spirit, fn) {
  if (_metaInProgress.has(spirit)) return null;
  _metaInProgress.add(spirit);
  try {
    return fn();
  } finally {
    _metaInProgress.delete(spirit);
  }
}

/**
 * Memory target resolver: returns the rightmost spirit, excluding self.
 * If the rightmost non-self slot is another Memory, returns null (inert).
 */
function _getMemoryTarget(memorySpirit, allSpirits) {
  for (let i = allSpirits.length - 1; i >= 0; i--) {
    const s = allSpirits[i];
    if (s === memorySpirit) continue;        // skip own slot
    if (s.id === 'engine_memory') return null; // STOP — inert
    return s;
  }
  return null;
}

/**
 * Mirror target resolver: returns the closest occupied slot to the left
 * of mirrorSpirit. Does NOT exclude other Mirrors (chains are allowed).
 */
function _getMirrorTarget(mirrorSpirit, allSpirits) {
  const idx = allSpirits.indexOf(mirrorSpirit);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (allSpirits[i] && allSpirits[i] !== mirrorSpirit) return allSpirits[i];
  }
  return null;
}

/** Scale engine/scoring output by stack count N. addMult/addPoints linear; multiplyMult compounds. */
function _scaleEngineOutput(result, n) {
  const scaled = { ...result };
  if (typeof scaled.addMult === 'number')      scaled.addMult      = scaled.addMult * n;
  if (typeof scaled.addPoints === 'number')    scaled.addPoints    = scaled.addPoints * n;
  if (typeof scaled.multiplyMult === 'number') scaled.multiplyMult = Math.pow(scaled.multiplyMult, n);
  return scaled;
}

/** Count cards with no modifications (no enhancement, stamp, edition, promotion). */
function _countUnalteredCards(deck) {
  return deck.filter(c =>
    !c.enhancement && !c.ribbonStamp && !c.edition && !c.promotionProgress
  ).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// NEGATIVE_SNAPSHOT — per-spirit transcendence state capture (F2.5)
// ─────────────────────────────────────────────────────────────────────────────

function snapshotCat1Linear(spirit, powerLevel, key, scaling, mode) {
  const elements = spirit.elements.slice(0, powerLevel);
  const aggregate = elements.reduce((s, el) => s + (el[key] ?? 0), 0);
  const oldest = elements[0]?.[key] ?? 0;
  const base = mode === 'addMult' ? 0 : 1;
  const preTranscendTotal = base + aggregate * scaling;
  return { preTranscendTotal, oldestAtTranscend: oldest, newEvents: 0, key };
}

function snapshotCat1Dual(spirit, powerLevel, key1, scaling1, key2, scaling2, mode) {
  const elements = spirit.elements.slice(0, powerLevel);
  const agg1 = elements.reduce((s, el) => s + (el[key1] ?? 0), 0);
  const agg2 = elements.reduce((s, el) => s + (el[key2] ?? 0), 0);
  const oldest1 = elements[0]?.[key1] ?? 0;
  const oldest2 = elements[0]?.[key2] ?? 0;
  const base = mode === 'addMult' ? 0 : 1;
  const preTranscendTotal = base + (agg1 * scaling1 + agg2 * scaling2);
  return {
    preTranscendTotal, oldestAtTranscend: oldest1 + oldest2,
    newEvents1: 0, newEvents2: 0,
    key1, scaling1, key2, scaling2,
  };
}

function snapshotCat1Exponential(spirit, powerLevel, key) {
  const elements = spirit.elements.slice(0, powerLevel);
  const aggregate = elements.reduce((s, el) => s + (el[key] ?? 0), 0);
  const oldest = elements[0]?.[key] ?? 0;
  const K = key.charAt(0).toUpperCase() + key.slice(1);
  return {
    [`${key}AtTranscend`]: aggregate,
    [`oldest${K}AtTranscend`]: oldest,
    [`new${K}`]: 0,
  };
}

function snapshotArraysFromElements(spirit, powerLevel, key) {
  const elements = spirit.elements.slice(0, powerLevel);
  const arrays = elements.map(el => [...(el[key] ?? [])]);
  return { [key]: arrays };
}

function snapshotCat5Maturation(spirit, powerLevel, numKey, denomDefault) {
  const elements = spirit.elements.slice(0, powerLevel);
  const numerator = elements.reduce((s, el) => s + (el[numKey] ?? 0), 0);
  const denominator = powerLevel * denomDefault;
  return { numerator, denominator };
}

export const NEGATIVE_SNAPSHOT = {
  // Cat 1 linear: additive-mult
  sym_ants:              (s, p) => snapshotCat1Linear(s, p, 'totalPlayed',      0.5,  'addMult'),
  sym_snails:            (s, p) => snapshotCat1Linear(s, p, 'totalUnplayed',    1,    'addMult'),
  sym_badger:            (s, p) => snapshotCat1Linear(s, p, 'consumablesUsed',  1,    'addMult'),
  engine_devotion:       (s, p) => snapshotCat1Linear(s, p, 'totalScored',      4,    'addMult'),
  engine_habitat:        (s, p) => snapshotCat1Linear(s, p, 'totalScored',      2.5,  'addMult'),
  engine_ceremony:       (s, p) => snapshotCat1Linear(s, p, 'totalScored',      2,    'addMult'),
  engine_agriculture:    (s, p) => snapshotCat1Linear(s, p, 'totalScored',      1,    'addMult'),
  engine_lincoln:        (s, p) => snapshotCat1Linear(s, p, 'banks',            0.1,  'addMult'),
  engine_napoleon:       (s, p) => snapshotCat1Linear(s, p, 'pushFails',        0.2,  'addMult'),
  engine_missing_number: (s, p) => snapshotCat1Linear(s, p, 'totalStacks',      5,    'addMult'),
  engine_northern_lion:  (s, p) => snapshotCat1Linear(s, p, 'pushesWitnessed',  1,    'addMult'),

  // Cat 1 linear: mult-mult
  sym_algae:             (s, p) => snapshotCat1Linear(s, p, 'summonCount',     0.1,  'multiplyMult'),
  engine_palace:         (s, p) => snapshotCat1Linear(s, p, 'cardsAdded',      0.5,  'multiplyMult'),
  engine_ship:           (s, p) => snapshotCat1Linear(s, p, 'cardsDiscarded',  0.3,  'multiplyMult'),
  engine_kintaro:        (s, p) => snapshotCat1Linear(s, p, 'goldsConsumed',   0.1,  'multiplyMult'),
  engine_bullseye:       (s, p) => snapshotCat1Linear(s, p, 'qualifiedCount',  1.0,  'multiplyMult'),
  legend_wuji:           (s, p) => snapshotCat1Linear(s, p, 'destroyed',       0.3,  'multiplyMult'),

  // Cat 1 dual-key
  engine_glacier:  (s, p) => snapshotCat1Dual(s, p, 't1Procs', 0.2, 't2Procs', 0.4, 'multiplyMult'),
  engine_carbon:   (s, p) => snapshotCat1Dual(s, p, 't1Procs', 0.5, 't2Procs', 1.0, 'multiplyMult'),
  engine_fossil:   (s, p) => snapshotCat1Dual(s, p, 't1Procs', 0.1, 't2Procs', 0.3, 'multiplyMult'),
  engine_moths:    (s, p) => snapshotCat1Dual(s, p, 't1Procs', 0.3, 't2Procs', 0.6, 'multiplyMult'),

  // Cat 1' exponential
  engine_velocity: (s, p) => snapshotCat1Exponential(s, p, 't2Procs'),

  // Cat 2 uniqueness
  engine_wildlife: (s, p) => snapshotArraysFromElements(s, p, 'seenAnimals'),
  engine_plenty:   (s, p) => snapshotArraysFromElements(s, p, 'seenPlains'),

  // Cat 4 reset-uniqueness (post-Phase B array keys)
  engine_radiance: (s, p) => snapshotArraysFromElements(s, p, 'seenBrights'),
  engine_banner:   (s, p) => snapshotArraysFromElements(s, p, 'seenRibbons'),

  // Cat 5 maturation
  util_past_life:  (s, p) => snapshotCat5Maturation(s, p, 'roundsHeld', 3),
  sym_cuckoo_egg:  (s, p) => snapshotCat5Maturation(s, p, 'roundsHeld', 3),
};

// ── Spirit effect registry ────────────────────────────────────────────────────

const _effects = {

  // ── Seasonal Point ────────────────────────────────────────────────────────
  // +20 pts per card captured from the matching season.

  spring_pollen:  monthPointAdd([3, 4, 5],   20),
  summer_heat:    monthPointAdd([6, 7, 8],   20),
  autumn_harvest: monthPointAdd([9, 10, 11], 20),
  winter_cold:    monthPointAdd([12, 1, 2],  20),

  // ── Seasonal Mult ─────────────────────────────────────────────────────────
  // +10 mult per card captured from the matching season.

  spring_bees:     monthMultAdd([3, 4, 5],   10),
  summer_humidity: monthMultAdd([6, 7, 8],   10),
  autumn_leaves:   monthMultAdd([9, 10, 11], 10),
  winter_aridity:  monthMultAdd([12, 1, 2],  10),

  // ── Axis Point ────────────────────────────────────────────────────────────

  air_clouds: verticalPointAdd('air',   10),
  land_soil:  verticalPointAdd('land',  10),
  day_light:  temporalPointAdd('day',   10),
  night_dark: temporalPointAdd('night', 10),

  // ── Axis Mult ─────────────────────────────────────────────────────────────

  air_wind:        verticalMultAdd('air',   5),
  land_rock:       verticalMultAdd('land',  5),
  day_movement:    temporalMultAdd('day',   5),
  night_stillness: temporalMultAdd('night', 5),

  // ── Seasonal Fusion Spirits ───────────────────────────────────────────────

  fusion_bloom:        monthFusion([3, 4, 5],   15, 7),
  fusion_thunderstorm: monthFusion([6, 7, 8],   15, 7),
  fusion_decay:        monthFusion([9, 10, 11], 15, 7),
  fusion_blizzard:     monthFusion([12, 1, 2],  15, 7),

  // ── Axis Fusion Spirits ───────────────────────────────────────────────────

  fusion_atmosphere: verticalFusion('air',  8, 3),
  fusion_continent:  verticalFusion('land', 8, 3),
  fusion_sun:        temporalFusion('day',  8, 3),
  fusion_moon:       temporalFusion('night',8, 3),

  // ── Rank Foundation Spirits ───────────────────────────────────────────────
  // Point boost + additive mult per matching card being captured.

  rank_shine: {
    onCardScored({ card }) {
      if (card.type === 'bright') return { addPoints: 80, addMult: 8 };
      return null;
    },
  },

  rank_oxygen: {
    onCardScored({ card }) {
      if (card.type === 'animal') return { addPoints: 50, addMult: 5 };
      return null;
    },
  },

  rank_poem: {
    onCardScored({ card }) {
      if (card.type === 'ribbon') return { addPoints: 40, addMult: 4 };
      return null;
    },
  },

  rank_salt: {
    onCardScored({ card }) {
      if (card.type === 'plain') return { addPoints: 20, addMult: 2 };
      return null;
    },
  },

  // ── Rank Engine Spirits ───────────────────────────────────────────────────
  // Per-round engines: state is reset each round in GameRoundManager.startRound().

  /**
   * Radiance: ×(1 + n×2) per unique bright seen this round.
   * Per-element seenBrights arrays; reset at round end via onRoundEnd hook.
   */
  engine_radiance: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'bright') addUniqueToElements(spirit, 'seenBrights', card.id);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenBrights ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        return sumLengths === 0 ? null : { multiplyMult: 1 + sumLengths * 2 };
      }
      const n = aggregateArrayLength(spirit, 'seenBrights');
      return n === 0 ? null : { multiplyMult: 1 + n * 2 };
    },
    onRoundEnd({ spirit }) {
      if (spirit.isNegative) {
        if (Array.isArray(spirit.state?.seenBrights)) {
          for (const arr of spirit.state.seenBrights) arr.length = 0;
        }
      } else if (spirit.elements) {
        for (const el of spirit.elements) el.seenBrights = [];
      }
    },
  },

  /**
   * Wildlife: persistent cross-round tracker.
   * Each NEW unique animal species captured (any round) adds +0.5 mult.
   * State updated externally via run.onCardsCaptured().
   */
  engine_wildlife: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenAnimals ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        return sumLengths === 0 ? null : { multiplyMult: 1.0 + sumLengths * 0.5 };
      }
      const n = aggregateArrayLength(spirit, 'seenAnimals');
      return n === 0 ? null : { multiplyMult: 1.0 + n * 0.5 };
    },
  },

  /**
   * Banner: ×(1 + n) per unique ribbon seen this round.
   * Per-element seenRibbons arrays; reset at round end via onRoundEnd hook.
   */
  engine_banner: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'ribbon') addUniqueToElements(spirit, 'seenRibbons', card.id);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenRibbons ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        return sumLengths === 0 ? null : { multiplyMult: 1 + sumLengths };
      }
      const n = aggregateArrayLength(spirit, 'seenRibbons');
      return n === 0 ? null : { multiplyMult: 1 + n };
    },
    onRoundEnd({ spirit }) {
      if (spirit.isNegative) {
        if (Array.isArray(spirit.state?.seenRibbons)) {
          for (const arr of spirit.state.seenRibbons) arr.length = 0;
        }
      } else if (spirit.elements) {
        for (const el of spirit.elements) el.seenRibbons = [];
      }
    },
  },

  /**
   * Plenty: persistent cross-round tracker.
   * Each NEW unique plain card captured (any round) adds +0.1 mult.
   * State updated externally via run.onCardsCaptured().
   */
  engine_plenty: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenPlains ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        return sumLengths === 0 ? null : { multiplyMult: 1.0 + sumLengths * 0.1 };
      }
      const n = aggregateArrayLength(spirit, 'seenPlains');
      return n === 0 ? null : { multiplyMult: 1.0 + n * 0.1 };
    },
  },

  // ── Rank Utility Spirits ──────────────────────────────────────────────────
  // Event-triggered effects handled in GameRoundManager._addCapture().

  util_glory: {
    // Migrated from GRM._addCapture (F4.20 #1). Returns a draw intent; GRM executes.
    // TODO(F4.x): tooltip renders draws*stacks but effect draws flat 2 — reconcile (see triage).
    onCaptureComplete({ cards }) {
      const brightCount = cards.filter(c => c.type === 'bright').length;
      if (brightCount === 0) return null;
      return { draw: 2 };   // flat 2 — preserves current behavior exactly (NOT 2×stacks)
    },
  },
  util_symbiosis:  {},  // animal captured → summon symbiont
  util_festival: {
    onCardScored({ card, spirit }) {
      if (card.type !== 'ribbon') return null;
      const stampId = RIBBON_STAMP_MAP[card.id];
      if (!stampId) return null;
      const stacks = effectivePower(spirit);
      const available = run.maxConsumableSlots - run.consumables.length;
      const toGen = Math.min(stacks, available);
      for (let i = 0; i < toGen; i++) {
        const def = getStampDef(stampId);
        if (def) run.addConsumable({ id: def.id, name: def.name, description: def.description, category: 'stamp' });
      }
      return null;
    },
  },

  // ── Economy Spirits ────────────────────────────────────────────────────────

  econ_bonds:        {},  // +5% interest (stacks to +25%) — RunManager.interestRate
  econ_ingot:        {},  // +0.01% interest per ki — RunManager.interestRate
  econ_grace: {
    // mid-round: multiplies running ki by (1 + stacks) on each style combo
    applyKiBonus({ ki, spirit }) {
      const stacks = effectivePower(spirit);
      return ki * (1 + stacks);
    },
  },
  econ_recycling: {
    // +5 ki per stack on every field discard.
    // F4.17#1: migrated off inline _handleFieldDiscard. effectivePower per equipped
    // instance sums to the prior `5 * countStackedById('econ_recycling')` exactly.
    onFieldDiscard({ spirit }) {
      run.addKi(5 * effectivePower(spirit), 'recycling_discard');
    },
  },
  econ_lucky_charm:  {},  // probability modifier — handled in RNGHook.js
  econ_reward: {
    // +10% of current ki per stack, each time a push succeeds (F4.20: migrated off
    // inline _finalizeTurn). effectivePower per merged instance reproduces the prior
    // summed `totalRewardStacks` exactly. Negatives excluded — the old path iterated
    // run.activeSpirits, which omits Negatives.
    onPushSuccess({ spirit }) {
      if (spirit.isNegative) return;
      const bonus = Math.floor(run.ki * 0.10 * effectivePower(spirit));
      if (bonus > 0) run.addKi(bonus, 'reward_push');
    },
  },
  econ_piggybank:    {},  // ×2/×3/×4 hand ki (additive stacking)
  econ_coupon:       {},  // 15% shop discount (stacks to 45%)
  econ_replica: {
    onRoundStart({ spirit, run: r }) {
      if (r._consumables.length === 0) return;
      const picked = r._consumables[Math.floor(Math.random() * r._consumables.length)];
      const count = effectivePower(spirit);
      for (let i = 0; i < count; i++) {
        if (!r.canAddConsumable) break;
        r.addConsumable({
          id: picked.id, name: picked.name, description: picked.description,
          category: picked.category, sellPriceBonus: 0,
        });
      }
    },
  },
  econ_print:        {},

  econ_collector: {
    onRoundEnd({ spirit, run: r }) {
      const bonus = effectivePower(spirit);
      for (const s of r.allSpirits) s.sellPriceBonus = (s.sellPriceBonus ?? 0) + bonus;
      for (const c of r._consumables) c.sellPriceBonus = (c.sellPriceBonus ?? 0) + bonus;
    },
  },

  // ── Gameplay Spirits ───────────────────────────────────────────────────────

  game_catcher:  {},  // overflow → hand
  game_mirror: {
    onCardScored({ card, spirit, spirits }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMirrorTarget(spirit, spirits);
        if (!target) return null;
        const fx = _effects[target.id];
        if (!fx?.onCardScored) return null;
        const result = fx.onCardScored({ card, spirit: target, spirits });
        if (!result) return null;
        const n = effectivePower(spirit);
        return n <= 1 ? result : _scaleEngineOutput(result, n);
      });
    },
    onCardSeen({ card, spirit, spirits }) {
      _evaluateWithGuard(spirit, () => {
        const target = _getMirrorTarget(spirit, spirits);
        if (!target) return;
        const fx = _effects[target.id];
        if (!fx?.onCardSeen) return;
        fx.onCardSeen({ card, spirit: target, spirits });
      });
    },
    applyEngine({ spirit, spirits, mult, points, cards }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMirrorTarget(spirit, spirits);
        if (!target) return null;
        const fx = _effects[target.id];
        if (!fx?.applyEngine) return null;
        const result = fx.applyEngine({ spirit: target, spirits, mult, points, cards });
        if (!result) return null;
        const n = effectivePower(spirit);
        return n <= 1 ? result : _scaleEngineOutput(result, n);
      });
    },
    getRetriggerCount({ card, spirit, spirits, triggerType }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMirrorTarget(spirit, spirits ?? []);
        if (!target) return 0;
        const fx = _effects[target.id];
        if (!fx?.getRetriggerCount) return 0;
        return fx.getRetriggerCount({ card, spirit: target, spirits, triggerType });
      }) ?? 0;
    },
  },
  game_echo: {
    getRetriggerCount({ spirit, triggerType, isFirstCardOfCapture }) {
      if (triggerType !== 'capture') return 0;
      if (!isFirstCardOfCapture) return 0;
      return 2 * effectivePower(spirit);
    },
  },

  // ── Meta Spirits ─────────────────────────────────────────────────────────

  util_past_life: {},  // sell-time duplication — handled in RunManager.releaseSpirit

  engine_memory: {
    onCardScored({ card, spirit, spirits }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMemoryTarget(spirit, spirits);
        if (!target) return null;
        const fx = _effects[target.id];
        if (!fx?.onCardScored) return null;
        const result = fx.onCardScored({ card, spirit: target, spirits });
        if (!result) return null;
        const n = effectivePower(spirit);
        return n <= 1 ? result : _scaleEngineOutput(result, n);
      });
    },
    onCardSeen({ card, spirit, spirits }) {
      _evaluateWithGuard(spirit, () => {
        const target = _getMemoryTarget(spirit, spirits);
        if (!target) return;
        const fx = _effects[target.id];
        if (!fx?.onCardSeen) return;
        fx.onCardSeen({ card, spirit: target, spirits });
      });
    },
    applyEngine({ spirit, spirits, mult, points, cards }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMemoryTarget(spirit, spirits);
        if (!target) return null;
        const fx = _effects[target.id];
        if (!fx?.applyEngine) return null;
        const result = fx.applyEngine({ spirit: target, spirits, mult, points, cards });
        if (!result) return null;
        const n = effectivePower(spirit);
        return n <= 1 ? result : _scaleEngineOutput(result, n);
      });
    },
    getRetriggerCount({ card, spirit, spirits, triggerType }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMemoryTarget(spirit, spirits ?? []);
        if (!target) return 0;
        const fx = _effects[target.id];
        if (!fx?.getRetriggerCount) return 0;
        return fx.getRetriggerCount({ card, spirit: target, spirits, triggerType });
      }) ?? 0;
    },
  },

  // ── Symbiont Spirits ───────────────────────────────────────────────────────

  sym_caterpillar: {},  // eats leaf cards

  sym_cuckoo_egg:  {},  // countdown hatch

  sym_algae: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) + (spirit.state?.newEvents ?? 0) * 0.1 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const total = aggregateNumericState(spirit, 'summonCount');
      return total === 0 ? null : { multiplyMult: 1 + total * 0.1 };
    },
  },

  sym_ants: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 0.5 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const total = aggregateNumericState(spirit, 'totalPlayed');
      return total === 0 ? null : { addMult: total * 0.5 };
    },
  },

  sym_crow: {
    // Migrated from GRM bankScore + _finalizeTurn inline blocks (F4.18b campaign step 1).
    // Generates one random consumable per Crow stack at round end, respecting inventory slots.
    // NOTE: now also fires on the consumable-empty-hand round-end path (was a bug omission).
    onRoundEnd({ run: r }) {
      const stacks = r.countStackedById('sym_crow');
      for (let i = 0; i < stacks; i++) {
        if (r.canAddConsumable) r.generateRandomConsumable();
      }
    },
  },

  sym_ducks: {
    // Non-accumulator: net (deck-flip matches - strands) as multValue.
    applyEngine({ spirit }) {
      const v = spirit.state?.multValue ?? 0;
      if (v === 0) return null;
      const stacks = effectivePower(spirit);
      return { multiplyMult: 1 + v * 0.2 * stacks };
    },
  },

  sym_snails: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 1 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const total = aggregateNumericState(spirit, 'totalUnplayed');
      return total === 0 ? null : { addMult: total * 1 };
    },
  },

  sym_magpie: {
    // mid-round: +3 ki additive per stack on each style combo
    applyKiBonus({ ki, spirit }) {
      const stacks = effectivePower(spirit);
      return ki + (3 * stacks);
    },
  },
  sym_osprey: {},  // first N deck flips go to hand

  sym_wolf: {
    onCardScored({ card }) {
      if (card.type !== 'bright') return null;
      return { multiplyMult: 2 };
    },
  },

  sym_garden: {
    applyEngine({ spirit }) {
      const deck = run.getDeck();
      const sigs = new Set();
      for (const card of deck) {
        sigs.add([
          card.month, card.type, card.temporal,
          card.enhancement?.element ?? '', card.enhancement?.tier ?? '',
          card.ribbonStamp ?? '', card.edition ?? '',
        ].join('|'));
      }
      const n = sigs.size;
      if (n === 0) return null;
      const scaling = effectivePower(spirit);
      return { addMult: n * 0.2 * scaling };
    },
  },

  sym_badger: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 1 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'consumablesUsed');
      return n === 0 ? null : { addMult: n * 1 };
    },
  },

  // ── Cross-Fusion Spirits (Tier 3) ─────────────────────────────────────────
  // Per-card multiplyMult: each qualifying card being captured multiplies mult.
  // ×2.0 spirits = powerful; ×1.5 = moderate.  Slot ordering matters.

  cross_yang: {
    // Yang: Air ×2.0, Day ×2.0. Compounds: Air+Day cards score ×4.0.
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      let mult = 1.0;
      if (card.vertical === 'air')  mult *= 2.0;
      if (card.temporal === 'day')  mult *= 2.0;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  cross_yin: {
    // Yin: Land ×2.0, Night ×2.0. Compounds: Land+Night cards score ×4.0.
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      let mult = 1.0;
      if (card.vertical === 'land')  mult *= 2.0;
      if (card.temporal === 'night') mult *= 2.0;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  cross_space: {
    // Space: Air ×2.0, Night ×2.0. Compounds: Air+Night cards score ×4.0.
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      let mult = 1.0;
      if (card.vertical === 'air')   mult *= 2.0;
      if (card.temporal === 'night') mult *= 2.0;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  cross_energy: {
    // Energy: Land ×2.0, Day ×2.0. Compounds: Land+Day cards score ×4.0.
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      let mult = 1.0;
      if (card.vertical === 'land')  mult *= 2.0;
      if (card.temporal === 'day')   mult *= 2.0;
      return mult !== 1.0 ? { multiplyMult: mult } : null;
    },
  },

  cross_solstice: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      const months = new Set([6, 7, 8, 12, 1, 2]);
      if (months.has(card.month)) return { multiplyMult: 2.0 };
      return null;
    },
  },

  cross_equinox: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      const months = new Set([3, 4, 5, 9, 10, 11]);
      if (months.has(card.month)) return { multiplyMult: 2.0 };
      return null;
    },
  },

  cross_tropic: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      const months = new Set([3, 4, 5, 6, 7, 8]);
      if (months.has(card.month)) return { multiplyMult: 2.0 };
      return null;
    },
  },

  cross_arctic: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      const months = new Set([9, 10, 11, 12, 1, 2]);
      if (months.has(card.month)) return { multiplyMult: 2.0 };
      return null;
    },
  },

  // ── Unity Spirits (Tier 4) ─────────────────────────────────────────────────

  capstone_yinyang:  {},  // doubling handled in scoring loop
  capstone_universe: {},  // point-mirroring handled in scoring loop
  capstone_time:     {},  // flow modifiers handled in RunManager
  capstone_nature:   {},  // cumulative points handled in scoring loop

  // ── Wu Xing Engine Spirits ─────────────────────────────────────────────────
  // State incremented in _applyPostRoundEnhancements; read here in Phase 2.

  engine_glacier: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) +
                  (spirit.state?.newEvents1 ?? 0) * 0.2 * (spirit.powerLevel ?? 1) +
                  (spirit.state?.newEvents2 ?? 0) * 0.4 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const t1 = aggregateNumericState(spirit, 't1Procs');
      const t2 = aggregateNumericState(spirit, 't2Procs');
      return (t1 === 0 && t2 === 0) ? null : { multiplyMult: 1 + (t1 * 0.2 + t2 * 0.4) };
    },
  },

  engine_carbon: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) +
                  (spirit.state?.newEvents1 ?? 0) * 0.5 * (spirit.powerLevel ?? 1) +
                  (spirit.state?.newEvents2 ?? 0) * 1.0 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const t1 = aggregateNumericState(spirit, 't1Procs');
      const t2 = aggregateNumericState(spirit, 't2Procs');
      return (t1 === 0 && t2 === 0) ? null : { multiplyMult: 1 + (t1 * 0.5 + t2 * 1.0) };
    },
  },

  engine_velocity: {
    applyEngine({ spirit }) {
      const ironCount = run.getDeck().filter(c =>
        c.enhancement?.element === 'metal' && c.enhancement?.tier === 'base'
      ).length;
      if (spirit.isNegative) {
        const effectiveT2 = (spirit.state?.t2ProcsAtTranscend ?? 0) +
                            (spirit.state?.newT2Procs ?? 0) * (spirit.powerLevel ?? 1);
        const t1Mult = ironCount * 0.1 * (spirit.powerLevel ?? 1);
        const t2Mult = Math.pow(1.5, effectiveT2);
        if (t1Mult === 0 && effectiveT2 === 0) return null;
        return { multiplyMult: (1 + t1Mult) * t2Mult };
      }
      const t2 = aggregateNumericState(spirit, 't2Procs');
      const scaling = effectivePower(spirit);
      const t1Mult = ironCount * 0.1 * scaling;
      const t2Mult = Math.pow(1.5, t2);
      if (t1Mult === 0 && t2 === 0) return null;
      return { multiplyMult: (1 + t1Mult) * t2Mult };
    },
  },

  engine_fossil: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) +
                  (spirit.state?.newEvents1 ?? 0) * 0.1 * (spirit.powerLevel ?? 1) +
                  (spirit.state?.newEvents2 ?? 0) * 0.3 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const t1 = aggregateNumericState(spirit, 't1Procs');
      const t2 = aggregateNumericState(spirit, 't2Procs');
      return (t1 === 0 && t2 === 0) ? null : { multiplyMult: 1 + (t1 * 0.1 + t2 * 0.3) };
    },
  },

  engine_moths: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) +
                  (spirit.state?.newEvents1 ?? 0) * 0.3 * (spirit.powerLevel ?? 1) +
                  (spirit.state?.newEvents2 ?? 0) * 0.6 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const t1 = aggregateNumericState(spirit, 't1Procs');
      const t2 = aggregateNumericState(spirit, 't2Procs');
      return (t1 === 0 && t2 === 0) ? null : { multiplyMult: 1 + (t1 * 0.3 + t2 * 0.6) };
    },
  },

  // ── Rank Additive Engine Spirits ─────────────────────────────────────────
  // Permanent counters: onCardSeen increments per matching rank scored;
  // applyEngine returns addMult based on total count.
  // Stacking: stackCount copies means onCardSeen fires N times per card,
  // so the counter accumulates N× faster.

  engine_devotion: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'bright') incrementPerElement(spirit, 'totalScored', 1);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 4 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'totalScored');
      return n === 0 ? null : { addMult: n * 4 };
    },
  },

  engine_habitat: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'animal') incrementPerElement(spirit, 'totalScored', 1);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 2.5 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'totalScored');
      return n === 0 ? null : { addMult: n * 2.5 };
    },
  },

  engine_ceremony: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'ribbon') incrementPerElement(spirit, 'totalScored', 1);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 2 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'totalScored');
      return n === 0 ? null : { addMult: n * 2 };
    },
  },

  engine_agriculture: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'plain') incrementPerElement(spirit, 'totalScored', 1);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 1 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'totalScored');
      return n === 0 ? null : { addMult: n * 1 };
    },
  },

  // ── Conditional Spirits ──────────────────────────────────────────────────
  // Per-capture conditionals: check the captured cards array (passed as `cards`
  // to applyEngine).  Each copy compounds multiplicatively via stackCount.

  cond_horizon: {
    applyEngine({ spirit, cards }) {
      if (!cards) return null;
      const hasAir  = cards.some(c => c.enhancement?.element !== 'fire' && c.vertical === 'air');
      const hasLand = cards.some(c => c.enhancement?.element !== 'fire' && c.vertical === 'land');
      if (!hasAir || !hasLand) return null;
      return { multiplyMult: Math.pow(2.0, effectivePower(spirit)) };
    },
  },

  cond_dream: {
    applyEngine({ spirit, cards }) {
      if (!cards) return null;
      const hasDay   = cards.some(c => c.enhancement?.element !== 'fire' && c.temporal === 'day');
      const hasNight = cards.some(c => c.enhancement?.element !== 'fire' && c.temporal === 'night');
      if (!hasDay || !hasNight) return null;
      return { multiplyMult: Math.pow(2.0, effectivePower(spirit)) };
    },
  },

  cond_hierarchy: {
    applyEngine({ spirit, cards }) {
      if (!cards) return null;
      const ranks = new Set(cards.map(c => c.type));
      const n = ranks.size;
      if (n === 0) return null;
      const stacks = effectivePower(spirit);
      return { multiplyMult: Math.pow(1.5, n * stacks) };
    },
  },

  // ── Counter Engine Spirits ───────────────────────────────────────────────
  // State incremented by event hooks in GameRoundManager; read here in Phase 2.

  engine_lincoln: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 0.1 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'banks');
      return n === 0 ? null : { addMult: n * 0.1 };
    },
    // Migrated from GRM bankScore inline block (F4.18b #3).
    // Fires ONLY on explicit bank (via _fireSpiritHook('onBank') in bankScore).
    // NOTE: description says "bank without pushing" but current behavior increments on
    //   every bank regardless of push. Preserved as-is; reconcile separately (see ledger).
    onBank({ spirit }) {
      incrementPerElement(spirit, 'banks', 1);
    },
  },

  engine_napoleon: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 0.2 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'pushFails');
      return n === 0 ? null : { addMult: n * 0.2 };
    },
    // Migrated from GRM _finalizeTurn push-failure block (F4.18b #4).
    // Fires ONLY on natural round-over with active push penalty
    // (via _fireSpiritHook('onPushFailure') in the push-failure branch).
    onPushFailure({ spirit }) {
      incrementPerElement(spirit, 'pushFails', 1);
    },
  },

  // ── Decay Spirits ────────────────────────────────────────────────────────
  // Strong initial bonus that decreases each round. State decremented at round end.

  decay_persimmon: {
    // state.remaining decays 3/round; stack multiplier on output only.
    applyEngine({ spirit }) {
      const n = spirit.state?.remaining ?? 0;
      if (n === 0) return null;
      const stacks = effectivePower(spirit);
      return { addMult: n * stacks };
    },
    // Migrated from GRM bank + natural inline decrement blocks (F4.18b #2).
    // Now also fires on the consumable-empty-hand path (was a bug omission).
    onRoundEnd({ spirit }) {
      if (spirit.state) spirit.state.remaining = Math.max(0, spirit.state.remaining - 3);
    },
  },

  decay_pear: {
    // state.remaining decays 5/round; stack multiplier on output only.
    applyEngine({ spirit }) {
      const n = spirit.state?.remaining ?? 0;
      if (n === 0) return null;
      const stacks = effectivePower(spirit);
      return { addPoints: n * stacks };
    },
    // Migrated from GRM bank + natural inline decrement blocks (F4.18b #2).
    onRoundEnd({ spirit }) {
      if (spirit.state) spirit.state.remaining = Math.max(0, spirit.state.remaining - 5);
    },
  },

  // ── Rank Retrigger Spirits ───────────────────────────────────────────────
  // getRetriggerCount: returns extra triggers for a matching card + trigger type.
  // triggerType: 'capture' (scoring math + capture-trigger stamps), 'held_in_hand', 'discard', 'yaku'

  retrigger_rainbow: {
    getRetriggerCount({ card, spirit, triggerType }) {
      if (triggerType !== 'capture') return 0;
      return card.type === 'bright' ? effectivePower(spirit) : 0;
    },
  },

  retrigger_family: {
    getRetriggerCount({ card, spirit, triggerType }) {
      if (triggerType !== 'capture') return 0;
      return card.type === 'animal' ? effectivePower(spirit) : 0;
    },
  },

  retrigger_wish: {
    getRetriggerCount({ card, spirit, triggerType }) {
      if (triggerType !== 'capture') return 0;
      return card.type === 'ribbon' ? effectivePower(spirit) : 0;
    },
  },

  retrigger_dew: {
    getRetriggerCount({ card, spirit, triggerType }) {
      if (triggerType !== 'capture') return 0;
      return card.type === 'plain' ? effectivePower(spirit) : 0;
    },
  },

  // ── Event-Hook Engine Spirits (E2b) ──────────────────────────────────────

  engine_missing_number: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 0) + (spirit.state?.newEvents ?? 0) * 5 * (spirit.powerLevel ?? 1);
        return t === 0 ? null : { addMult: t };
      }
      const n = aggregateNumericState(spirit, 'totalStacks');
      return n === 0 ? null : { addMult: n * 5 };
    },
  },

  engine_palace: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) + (spirit.state?.newEvents ?? 0) * 0.5 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const n = aggregateNumericState(spirit, 'cardsAdded');
      return n === 0 ? null : { multiplyMult: 1 + n * 0.5 };
    },
  },

  engine_ship: {
    // +1 cardsDiscarded per field discard (drives +0.3 mult-mult/card).
    // F4.17#1: migrated off inline _handleFieldDiscard. Negatives (transcended)
    // are excluded to match the prior activeSpirits-only increment — the negative
    // form tracks via its own preTranscendTotal/newEvents in applyEngine.
    onFieldDiscard({ spirit }) {
      if (!spirit.isNegative) incrementPerElement(spirit, 'cardsDiscarded', 1);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) + (spirit.state?.newEvents ?? 0) * 0.3 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const n = aggregateNumericState(spirit, 'cardsDiscarded');
      return n === 0 ? null : { multiplyMult: 1 + n * 0.3 };
    },
  },

  engine_surplus: {
    applyEngine({ spirit }) {
      const ki = run.ki;
      const stacks = effectivePower(spirit);
      const bonus = Math.floor(ki / 3) * stacks;
      if (bonus === 0) return null;
      return { addMult: bonus };
    },
  },

  engine_northern_lion: {},  // utility — handled in shop reroll logic

  engine_kintaro: {
    onCardScored({ card, spirit }) {
      if (card.edition === 'gold') {
        card.edition = null;  // consume the Gold edition
        incrementPerElement(spirit, 'goldsConsumed', 1);
      }
      return null;
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) + (spirit.state?.newEvents ?? 0) * 0.1 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const consumed = aggregateNumericState(spirit, 'goldsConsumed');
      return consumed === 0 ? null : { multiplyMult: 1 + consumed * 0.1 };
    },
  },

  engine_golden_toad: {
    onCardScored({ card, spirit }) {
      spirit._captureAppliedCount = spirit._captureAppliedCount ?? 0;
      const maxApplications = effectivePower(spirit);
      if (spirit._captureAppliedCount >= maxApplications) return null;
      if (!card.edition) {
        card.edition = 'gold';
        spirit._captureAppliedCount++;
      }
      return null;
    },
  },

  util_irrigation: {
    onCardScored({ card, spirit }) {
      if (card.type === 'plain') {
        const bonus = 3 * effectivePower(spirit);
        addCardBonusPoints(card, bonus);
        return { addPoints: bonus };
      }
      return null;
    },
  },

  engine_bullseye: {
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) + (spirit.state?.newEvents ?? 0) * 1.0 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const count = aggregateNumericState(spirit, 'qualifiedCount');
      return count === 0 ? null : { multiplyMult: 1 + count * 1.0 };
    },
  },

  engine_applause: {
    getRetriggerCount({ spirit, triggerType }) {
      if (triggerType !== 'held_in_hand') return 0;
      return effectivePower(spirit);
    },
  },

  // ── Unique Legendary ────────────────────────────────────────────────────

  legend_gankyil: {},  // auto-capture at 3-stack — handled in FieldManager

  // ── Demoted Rares ─────────────────────────────────────────────────────

  legend_wuji: {
    onCardDestroyed({ spirit }) {
      incrementPerElement(spirit, 'destroyed', 1);
    },
    applyEngine({ spirit }) {
      if (spirit.isNegative) {
        const t = (spirit.state?.preTranscendTotal ?? 1) + (spirit.state?.newEvents ?? 0) * 0.3 * (spirit.powerLevel ?? 1);
        return t <= 1 ? null : { multiplyMult: t };
      }
      const destroyed = aggregateNumericState(spirit, 'destroyed');
      return destroyed === 0 ? null : { multiplyMult: 1 + destroyed * 0.3 };
    },
  },

  legend_dao: {
    applyEngine({ spirit }) {
      const n = _countUnalteredCards(run.getDeck());
      const stacks = effectivePower(spirit);
      if (n === 0) return null;
      return { multiplyMult: 1 + n * 0.1 * stacks };
    },
  },

  legend_chi: {
    applyEngine({ spirit }) {
      const stacks = effectivePower(spirit);
      return { multiplyMult: run.flow * stacks };
    },
  },

  legend_tengu: {
    applyEngine({ spirit }) {
      const stacks = effectivePower(spirit);
      const spiritCount = run.spirits.length + run.negativeSpirits.length;
      if (spiritCount === 0) return null;
      return { multiplyMult: 1 + 0.3 * spiritCount * stacks };
    },
  },

  legend_waidan: {},  // Sacred Grove exit — handled in ShrineScene

  legend_feng_shui: {
    applyEngine({ spirit }) {
      const stacks = effectivePower(spirit);
      const fengShuiSlotCount = run.spirits.filter(s => s.id === 'legend_feng_shui').length;
      const occupiedNonFengShui = run.spirits.length - fengShuiSlotCount;
      const emptySlots = run.spiritSlots - occupiedNonFengShui;
      return { multiplyMult: 1 + 0.5 * emptySlots * stacks };
    },
  },
};

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Look up the effect definition for a spirit.
 * @param {string} spiritId
 * @returns {{ onCardScored?: Function, onCardSeen?: Function,
 *             applyEngine?: Function }|null}
 *   null if the id is unrecognised.
 */
const SpiritEffects = {
  get(spiritId) { return _effects[spiritId] ?? null; },
};

export default SpiritEffects;
