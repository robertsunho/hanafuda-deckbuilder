// ─────────────────────────────────────────────────────────────────────────────
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
   * Radiance: ×2.0 per bright card seen in the current round (exponential).
   * Tracks brights via onCardSeen; applies in Phase 2.
   */
  engine_radiance: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'bright') {
        if (!spirit.state) spirit.state = { count: 0 };
        spirit.state.count = (spirit.state.count ?? 0) + 1;
      }
    },
    applyEngine({ spirit }) {
      const n = spirit.state?.count ?? 0;
      if (n === 0) return null;
      return { multiplyMult: Math.pow(2.0, n) };
    },
  },

  /**
   * Wildlife: persistent cross-round tracker.
   * Each NEW unique animal species captured (any round) adds +0.5 mult.
   * State updated externally via run.onCardsCaptured().
   */
  engine_wildlife: {
    applyEngine({ spirit }) {
      const n = spirit.state?.seenAnimals?.length ?? 0;
      if (n === 0) return null;
      return { multiplyMult: 1.0 + n * 0.5 };
    },
  },

  /**
   * Banner: +1.0 mult per ribbon card seen in the current round.
   * State is reset each round in GameRoundManager.startRound().
   */
  engine_banner: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'ribbon') {
        if (!spirit.state) spirit.state = { count: 0 };
        spirit.state.count = (spirit.state.count ?? 0) + 1;
      }
    },
    applyEngine({ spirit }) {
      const n = spirit.state?.count ?? 0;
      if (n === 0) return null;
      return { multiplyMult: 1.0 + n };
    },
  },

  /**
   * Plenty: persistent cross-round tracker.
   * Each NEW unique plain card captured (any round) adds +0.1 mult.
   * State updated externally via run.onCardsCaptured().
   */
  engine_plenty: {
    applyEngine({ spirit }) {
      const n = spirit.state?.seenPlains?.length ?? 0;
      if (n === 0) return null;
      return { multiplyMult: 1.0 + n * 0.1 };
    },
  },

  // ── Rank Utility Spirits ──────────────────────────────────────────────────
  // Event-triggered effects handled in GameRoundManager._addCapture().

  util_glory:      {},  // bright captured → draw 2 cards
  util_symbiosis:  {},  // animal captured → summon symbiont
  util_festival:   {},  // ribbon captured → stamp (TBD)
  util_irrigation: {},  // plain captured → +10 pts to running score

  // ── Economy Spirits ────────────────────────────────────────────────────────

  econ_bonds:        {},  // +5% interest (stacks to +25%) — RunManager.interestRate
  econ_ingot:        {},  // +0.01% interest per ki — RunManager.interestRate
  econ_grace:        {},  // double style combo ki — RunManager.calculateKiReward
  econ_recycling:    {},  // +5 ki per overflow discard
  econ_lucky_charm:  {},  // +50% ki on push
  econ_piggybank:    {},  // 3× hand ki at round end
  econ_coupon:       {},  // 15% shop discount (stacks to 45%)
  econ_replica:      {},
  econ_print:        {},
  econ_present:      {},
  econ_collector:    {},

  // ── Gameplay Spirits ───────────────────────────────────────────────────────

  game_expanse:  {},  // +2 field slots
  game_well:     {},  // draw +1 on capture
  game_catcher:  {},  // overflow → hand
  game_surplus:  {},  // +2 starting hand cards
  game_gankyil:  {},  // 3-stack capture
  game_angel:    {},  // +1 card per push
  game_mirror:   {},
  game_echo:     {},

  // ── Symbiont Spirits ───────────────────────────────────────────────────────

  sym_caterpillar: {},  // eats leaf cards

  sym_cuckoo_egg:  {},  // countdown hatch

  sym_algae: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.summonCount ?? 0) * 0.1;
      if (m === 1.0) return null;
      return { multiplyMult: m };
    },
  },

  sym_ants: {
    applyEngine({ spirit, spirits }) {
      const add = spirits?.length ?? 0;
      if (add === 0) return null;
      return { addMult: add };
    },
  },

  sym_crow:   {},  // first deck flip is captured directly

  sym_ducks: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.pairsThisRound ?? 0) * 0.3;
      if (m === 1.0) return null;
      return { multiplyMult: m };
    },
  },

  sym_snails: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.totalUnplayed ?? 0) * 0.2;
      if (m === 1.0) return null;
      return { multiplyMult: m };
    },
  },

  sym_magpie: {},  // +3 ki per style combo
  sym_osprey: {},  // pre-play field capture

  // ── Cross-Fusion Spirits (Tier 3) ─────────────────────────────────────────
  // Per-card multiplyMult: each qualifying card being captured multiplies mult.
  // ×2.0 spirits = powerful; ×1.5 = moderate.  Slot ordering matters.

  cross_yang: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.vertical === 'air' || card.temporal === 'day') return { multiplyMult: 2.0 };
      return null;
    },
  },

  cross_yin: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.vertical === 'land' || card.temporal === 'night') return { multiplyMult: 2.0 };
      return null;
    },
  },

  cross_space: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.vertical === 'air' || card.temporal === 'night') return { multiplyMult: 2.0 };
      return null;
    },
  },

  cross_energy: {
    onCardScored({ card }) {
      if (card.enhancement?.element === 'fire') return null;
      if (card.vertical === 'land' || card.temporal === 'day') return { multiplyMult: 2.0 };
      return null;
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

  capstone_yinyang:  {},
  capstone_universe: {},
  capstone_time:     {},
  capstone_nature:   {},

  // ── Wu Xing Engine Spirits ─────────────────────────────────────────────────
  // State incremented in _applyPostRoundEnhancements; read here in Phase 2.

  engine_glacier: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.waterDepCount ?? 0) * 0.3;
      if (m === 1.0) return null;
      return { multiplyMult: m };
    },
  },

  engine_carbon: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.fireCombustCount ?? 0) * 0.5;
      if (m === 1.0) return null;
      return { multiplyMult: m };
    },
  },

  engine_velocity: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.metalProcCount ?? 0) * 0.3;
      if (m === 1.0) return null;
      return { multiplyMult: m };
    },
  },

  engine_fossil: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.earthCardCount ?? 0) * 0.2;
      if (m === 1.0) return null;
      return { multiplyMult: m };
    },
  },

  engine_moths: {
    applyEngine({ spirit }) {
      const m = 1.0 + (spirit.state?.silkTriggerCount ?? 0) * 0.4;
      if (m === 1.0) return null;
      return { multiplyMult: m };
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
