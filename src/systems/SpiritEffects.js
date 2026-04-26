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

import run from './RunManager.js';

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

/** Count cards with no modifications (no enhancement, stamp, edition, promotion). */
function _countUnalteredCards(deck) {
  return deck.filter(c =>
    !c.enhancement && !c.ribbonStamp && !c.edition && !c.promotionProgress
  ).length;
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
  econ_grace:        {},  // ×2/×3/×4 style combo ki (additive stacking)
  econ_recycling:    {},  // +5 ki per overflow discard
  econ_lucky_charm:  {},  // probability modifier — handled in RNGHook.js
  econ_reward:       {},  // push-success ki bonus — handled in GameRoundManager
  econ_piggybank:    {},  // ×2/×3/×4 hand ki (additive stacking)
  econ_coupon:       {},  // 15% shop discount (stacks to 45%)
  econ_replica:      {},
  econ_print:        {},

  econ_collector:    {},

  // ── Gameplay Spirits ───────────────────────────────────────────────────────

  game_catcher:  {},  // overflow → hand
  game_mirror: {
    onCardScored({ card, spirit, spirits }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMirrorTarget(spirit, spirits);
        if (!target) return null;
        const fx = _effects[target.id];
        if (!fx?.onCardScored) return null;
        return fx.onCardScored({ card, spirit: target, spirits });
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
        return fx.applyEngine({ spirit: target, spirits, mult, points, cards });
      });
    },
    getRetriggerCount({ card, spirit, spirits }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMirrorTarget(spirit, spirits ?? []);
        if (!target) return 0;
        const fx = _effects[target.id];
        if (!fx?.getRetriggerCount) return 0;
        return fx.getRetriggerCount({ card, spirit: target, spirits });
      }) ?? 0;
    },
  },
  game_echo:     {},

  // ── Meta Spirits ─────────────────────────────────────────────────────────

  util_past_life: {},  // sell-time duplication — handled in RunManager.releaseSpirit

  engine_memory: {
    onCardScored({ card, spirit, spirits }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMemoryTarget(spirit, spirits);
        if (!target) return null;
        const fx = _effects[target.id];
        if (!fx?.onCardScored) return null;
        return fx.onCardScored({ card, spirit: target, spirits });
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
        return fx.applyEngine({ spirit: target, spirits, mult, points, cards });
      });
    },
    getRetriggerCount({ card, spirit, spirits }) {
      return _evaluateWithGuard(spirit, () => {
        const target = _getMemoryTarget(spirit, spirits ?? []);
        if (!target) return 0;
        const fx = _effects[target.id];
        if (!fx?.getRetriggerCount) return 0;
        return fx.getRetriggerCount({ card, spirit: target, spirits });
      }) ?? 0;
    },
  },

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
    applyEngine({ spirit }) {
      const add = spirit.state?.totalPlayed ?? 0;
      if (add === 0) return null;
      return { addMult: add * 0.5 };
    },
  },

  sym_crow:   {},  // consumable generation at round end

  sym_ducks: {
    applyEngine({ spirit }) {
      const add = spirit.state?.multValue ?? 1;
      return { addMult: add };
    },
  },

  sym_snails: {
    applyEngine({ spirit }) {
      const add = spirit.state?.totalUnplayed ?? 0;
      if (add === 0) return null;
      return { addMult: add };
    },
  },

  sym_magpie: {},  // +3 ki per style combo
  sym_osprey: {},  // first N deck flips go to hand

  sym_wolf: {
    onCardScored({ card }) {
      if (card.type !== 'bright') return null;
      return { multiplyMult: 2 };
    },
  },

  sym_garden: {
    applyEngine() {
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
      return { addMult: n * 0.2 };
    },
  },

  sym_badger: {
    applyEngine({ spirit }) {
      const n = spirit.state?.consumablesUsed ?? 0;
      if (n === 0) return null;
      return { addMult: n };
    },
  },

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

  capstone_yinyang:  {},  // doubling handled in scoring loop
  capstone_universe: {},  // point-mirroring handled in scoring loop
  capstone_time:     {},  // flow modifiers handled in RunManager
  capstone_nature:   {},  // cumulative points handled in scoring loop

  // ── Wu Xing Engine Spirits ─────────────────────────────────────────────────
  // State incremented in _applyPostRoundEnhancements; read here in Phase 2.

  engine_glacier: {
    applyEngine({ spirit }) {
      const t1 = spirit.state?.t1Procs ?? 0;
      const t2 = spirit.state?.t2Procs ?? 0;
      const total = t1 * 0.2 + t2 * 0.4;
      if (total === 0) return null;
      return { multiplyMult: 1 + total };
    },
  },

  engine_carbon: {
    applyEngine({ spirit }) {
      const t1 = spirit.state?.t1Procs ?? 0;
      const t2 = spirit.state?.t2Procs ?? 0;
      const total = t1 * 0.5 + t2 * 1.0;
      if (total === 0) return null;
      return { multiplyMult: 1 + total };
    },
  },

  engine_velocity: {
    applyEngine({ spirit }) {
      // Tier 1: live count of base Iron cards in deck.
      const ironCount = run.getDeck().filter(c =>
        c.enhancement?.element === 'metal' && c.enhancement?.tier === 'base'
      ).length;
      // Tier 2: multiplicative compounding per Meteorite jackpot.
      const t2 = spirit.state?.t2Procs ?? 0;
      const t1Mult = ironCount * 0.1;
      const t2Mult = Math.pow(1.5, t2);
      if (t1Mult === 0 && t2 === 0) return null;
      return { multiplyMult: (1 + t1Mult) * t2Mult };
    },
  },

  engine_fossil: {
    applyEngine({ spirit }) {
      const t1 = spirit.state?.t1Procs ?? 0;
      const t2 = spirit.state?.t2Procs ?? 0;
      const total = t1 * 0.1 + t2 * 0.3;
      if (total === 0) return null;
      return { multiplyMult: 1 + total };
    },
  },

  engine_moths: {
    applyEngine({ spirit }) {
      const t1 = spirit.state?.t1Procs ?? 0;
      const t2 = spirit.state?.t2Procs ?? 0;  // 0 until Silk wired (PostD-2)
      const total = t1 * 0.3 + t2 * 0.6;
      if (total === 0) return null;
      return { multiplyMult: 1 + total };
    },
  },

  // ── Rank Additive Engine Spirits ─────────────────────────────────────────
  // Permanent counters: onCardSeen increments per matching rank scored;
  // applyEngine returns addMult based on total count.
  // Stacking: stackCount copies means onCardSeen fires N times per card,
  // so the counter accumulates N× faster.

  engine_devotion: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'bright') {
        if (!spirit.state) spirit.state = { totalScored: 0 };
        spirit.state.totalScored++;
      }
    },
    applyEngine({ spirit }) {
      const n = spirit.state?.totalScored ?? 0;
      if (n === 0) return null;
      return { addMult: n * 4 };
    },
  },

  engine_habitat: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'animal') {
        if (!spirit.state) spirit.state = { totalScored: 0 };
        spirit.state.totalScored++;
      }
    },
    applyEngine({ spirit }) {
      const n = spirit.state?.totalScored ?? 0;
      if (n === 0) return null;
      return { addMult: n * 2.5 };
    },
  },

  engine_ceremony: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'ribbon') {
        if (!spirit.state) spirit.state = { totalScored: 0 };
        spirit.state.totalScored++;
      }
    },
    applyEngine({ spirit }) {
      const n = spirit.state?.totalScored ?? 0;
      if (n === 0) return null;
      return { addMult: n * 2 };
    },
  },

  engine_agriculture: {
    onCardSeen({ card, spirit }) {
      if (card.type === 'plain') {
        if (!spirit.state) spirit.state = { totalScored: 0 };
        spirit.state.totalScored++;
      }
    },
    applyEngine({ spirit }) {
      const n = spirit.state?.totalScored ?? 0;
      if (n === 0) return null;
      return { addMult: n * 1 };
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
      return { multiplyMult: Math.pow(2.0, spirit.stackCount ?? 1) };
    },
  },

  cond_dream: {
    applyEngine({ spirit, cards }) {
      if (!cards) return null;
      const hasDay   = cards.some(c => c.enhancement?.element !== 'fire' && c.temporal === 'day');
      const hasNight = cards.some(c => c.enhancement?.element !== 'fire' && c.temporal === 'night');
      if (!hasDay || !hasNight) return null;
      return { multiplyMult: Math.pow(2.0, spirit.stackCount ?? 1) };
    },
  },

  cond_hierarchy: {
    applyEngine({ spirit, cards }) {
      if (!cards) return null;
      const ranks = new Set(cards.map(c => c.type));
      const n = ranks.size;
      if (n === 0) return null;
      const stacks = spirit.stackCount ?? 1;
      return { multiplyMult: Math.pow(1.5, n * stacks) };
    },
  },

  // ── Counter Engine Spirits ───────────────────────────────────────────────
  // State incremented by event hooks in GameRoundManager; read here in Phase 2.

  engine_lincoln: {
    applyEngine({ spirit }) {
      const n = spirit.state?.banks ?? 0;
      if (n === 0) return null;
      return { addMult: n * 0.1 };
    },
  },

  engine_napoleon: {
    applyEngine({ spirit }) {
      const n = spirit.state?.pushFails ?? 0;
      if (n === 0) return null;
      return { addMult: n * 0.2 };
    },
  },

  // ── Decay Spirits ────────────────────────────────────────────────────────
  // Strong initial bonus that decreases each round. State decremented at round end.

  decay_persimmon: {
    applyEngine({ spirit }) {
      const n = spirit.state?.remaining ?? 0;
      if (n === 0) return null;
      return { addMult: n };
    },
  },

  decay_pear: {
    applyEngine({ spirit }) {
      const n = spirit.state?.remaining ?? 0;
      if (n === 0) return null;
      return { addPoints: n };
    },
  },

  // ── Rank Retrigger Spirits ───────────────────────────────────────────────
  // getRetriggerCount: returns extra triggers for a matching card.
  // Called by Phase 1.5 in _addCapture; the card fully re-scores.

  retrigger_rainbow: {
    getRetriggerCount({ card, spirit }) {
      return card.type === 'bright' ? (spirit.stackCount ?? 1) : 0;
    },
  },

  retrigger_family: {
    getRetriggerCount({ card, spirit }) {
      return card.type === 'animal' ? (spirit.stackCount ?? 1) : 0;
    },
  },

  retrigger_wish: {
    getRetriggerCount({ card, spirit }) {
      return card.type === 'ribbon' ? (spirit.stackCount ?? 1) : 0;
    },
  },

  retrigger_dew: {
    getRetriggerCount({ card, spirit }) {
      return card.type === 'plain' ? (spirit.stackCount ?? 1) : 0;
    },
  },

  // ── Event-Hook Engine Spirits (E2b) ──────────────────────────────────────

  engine_missing_number: {
    applyEngine({ spirit }) {
      const n = spirit.state?.totalStacks ?? 0;
      if (n === 0) return null;
      return { addMult: n * 5 };
    },
  },

  engine_palace: {
    applyEngine({ spirit }) {
      const n = spirit.state?.cardsAdded ?? 0;
      if (n === 0) return null;
      return { multiplyMult: 1 + n * 0.5 };
    },
  },

  engine_ship: {
    applyEngine({ spirit }) {
      const n = spirit.state?.cardsDiscarded ?? 0;
      if (n === 0) return null;
      return { multiplyMult: 1 + n * 0.3 };
    },
  },

  engine_surplus: {
    applyEngine({ spirit }) {
      const ki = run.ki;
      const stacks = spirit.stackCount ?? 1;
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
        spirit.state.goldsConsumed += (spirit.stackCount ?? 1);
      }
      return null;
    },
    applyEngine({ spirit }) {
      const consumed = spirit.state?.goldsConsumed ?? 0;
      if (consumed === 0) return null;
      return { multiplyMult: 1 + consumed * 0.1 };
    },
  },

  engine_golden_toad: {
    onCardScored({ card, spirit }) {
      spirit._captureAppliedCount = spirit._captureAppliedCount ?? 0;
      const maxApplications = spirit.stackCount ?? 1;
      if (spirit._captureAppliedCount >= maxApplications) return null;
      if (!card.edition) {
        card.edition = 'gold';
        spirit._captureAppliedCount++;
      }
      return null;
    },
  },

  engine_void: {
    onCardDestroyed({ spirit }) {
      spirit.state.destroyed += (spirit.stackCount ?? 1);
    },
    applyEngine({ spirit }) {
      const destroyed = spirit.state?.destroyed ?? 0;
      if (destroyed === 0) return null;
      return { multiplyMult: 1 + destroyed * 0.3 };
    },
  },

  engine_applause: {},  // retrigger handled inline at held-in-hand proc sites

  // ── Patron Legendaries ───────────────────────────────────────────────────
  // Patrons modify game-state values — most have no scoring handler.

  legend_ebisu:        {},  // +1 to all deals — handled in GameRoundManager
  legend_daikokuten:   {},  // +1 shop item — handled in ShrineScene
  legend_bishamonten:  {},  // +1 spirit slot — handled in RunManager.spiritSlots getter
  legend_benzaiten:    {},  // +1 consumable slot — handled in RunManager.maxConsumableSlots getter
  legend_fukurokuju:   {},  // +1 hand size — handled in GameRoundManager
  legend_jurojin:      {},  // +1 field slot — handled in GameRoundManager

  // ── Unique Legendaries ───────────────────────────────────────────────────

  legend_wuji: {
    applyEngine() {
      const emptySlots = run.spiritSlots - run.spirits.length;
      if (emptySlots <= 0) return null;
      return { multiplyMult: Math.pow(2, emptySlots) };
    },
  },

  legend_dao: {
    applyEngine() {
      const n = _countUnalteredCards(run.getDeck());
      if (n === 0) return null;
      return { addMult: n };
    },
  },

  legend_chi: {
    applyEngine() {
      const flow = run.flow;
      if (flow <= 0) return null;
      return { multiplyMult: flow };
    },
  },

  legend_gankyil: {},  // auto-capture at 3-stack — handled in FieldManager
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
