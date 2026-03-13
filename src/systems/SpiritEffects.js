// ─────────────────────────────────────────────────────────────────────────────
// SpiritEffects — three-channel scoring registry for all spirits
//
// Each entry may implement any combination of:
//
//   getPointBoosts({ capturedCards, spirits })
//     → Map<cardId, flatBonus> | null
//     Channel 1: flat addition to the base point value of specific captured cards.
//     In capture mode: pts += boosts.get(card.id)
//     In additive/multiplicative modes (ScoringEngine): pts *= boosts.get(card.id)
//
//   getAdditiveMult({ capturedCards, yakuList, spirits })
//     → number (default 0)
//     Channel 2: flat addition to the yaku multiplier layer.
//     Stacks additively: two +5 effects = +10 total.
//
//   getMultMult({ capturedCards, yakuList, spirits })
//     → number (default 1.0)
//     Channel 3: multiplies the entire (Yaku + Additive) layer.
//     Stacks multiplicatively: two ×2 effects = ×4.
//
// Axis spirits use card.vertical ('sky' | 'ground') and card.temporal ('day' | 'night').
// Note: Land cards use 'ground' internally; the display name is 'Land'.
// ─────────────────────────────────────────────────────────────────────────────

// ── Factory helpers ───────────────────────────────────────────────────────────

// Fire-enhanced cards have no month, vertical, or temporal identity.
// All factory functions skip them so they can't trigger seasonal/axis spirit effects.

function monthPointBoost(months, flatAmt) {
  const set = new Set(months);
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (set.has(card.month)) boosts.set(card.id, flatAmt);
      }
      return boosts.size > 0 ? boosts : null;
    },
  };
}

function monthAdditiveMult(months, bonusPerCard) {
  const set = new Set(months);
  return {
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (set.has(card.month)) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function monthFusion(months, flatAmt, bonusPerCard) {
  const set = new Set(months);
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (set.has(card.month)) boosts.set(card.id, flatAmt);
      }
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (set.has(card.month)) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function verticalPointBoost(vertical, flatAmt) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.vertical === vertical) boosts.set(card.id, flatAmt);
      }
      return boosts.size > 0 ? boosts : null;
    },
  };
}

function verticalAdditiveMult(vertical, bonusPerCard) {
  return {
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.vertical === vertical) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function verticalFusion(vertical, flatAmt, bonusPerCard) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.vertical === vertical) boosts.set(card.id, flatAmt);
      }
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.vertical === vertical) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function temporalPointBoost(temporal, flatAmt) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.temporal === temporal) boosts.set(card.id, flatAmt);
      }
      return boosts.size > 0 ? boosts : null;
    },
  };
}

function temporalAdditiveMult(temporal, bonusPerCard) {
  return {
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.temporal === temporal) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function temporalFusion(temporal, flatAmt, bonusPerCard) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.temporal === temporal) boosts.set(card.id, flatAmt);
      }
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.enhancement?.element === 'fire') continue;
        if (card.temporal === temporal) n++;
      }
      return n * bonusPerCard;
    },
  };
}

// ── Spirit effect registry ────────────────────────────────────────────────────

const _effects = {

  // ── Seasonal Point Boost ──────────────────────────────────────────────────

  spring_pollen:  monthPointBoost([3, 4, 5],   20),
  summer_heat:    monthPointBoost([6, 7, 8],   20),
  autumn_harvest: monthPointBoost([9, 10, 11], 20),
  winter_cold:    monthPointBoost([12, 1, 2],  20),

  // ── Seasonal Additive Mult ────────────────────────────────────────────────

  spring_bees:     monthAdditiveMult([3, 4, 5],   5),
  summer_humidity: monthAdditiveMult([6, 7, 8],   5),
  autumn_leaves:   monthAdditiveMult([9, 10, 11], 5),
  winter_aridity:  monthAdditiveMult([12, 1, 2],  5),

  // ── Axis Point Boost ──────────────────────────────────────────────────────
  // Land uses card.vertical === 'ground' internally.

  sky_clouds: verticalPointBoost('sky',    10),
  land_soil:  verticalPointBoost('ground', 10),
  day_light:  temporalPointBoost('day',    10),
  night_dark: temporalPointBoost('night',  10),

  // ── Axis Additive Mult ────────────────────────────────────────────────────

  sky_wind:        verticalAdditiveMult('sky',    5),
  land_rock:       verticalAdditiveMult('ground', 5),
  day_movement:    temporalAdditiveMult('day',    5),
  night_stillness: temporalAdditiveMult('night',  5),

  // ── Seasonal Fusion Spirits ───────────────────────────────────────────────

  fusion_bloom:        monthFusion([3, 4, 5],   15, 3),
  fusion_thunderstorm: monthFusion([6, 7, 8],   15, 3),
  fusion_decay:        monthFusion([9, 10, 11], 15, 3),
  fusion_blizzard:     monthFusion([12, 1, 2],  15, 3),

  // ── Axis Fusion Spirits ───────────────────────────────────────────────────

  fusion_atmosphere: verticalFusion('sky',    8, 3),
  fusion_continent:  verticalFusion('ground', 8, 3),
  fusion_sun:        temporalFusion('day',    8, 3),
  fusion_moon:       temporalFusion('night',  8, 3),

  // ── Rank Foundation Spirits ───────────────────────────────────────────────
  // Point boost (flat) + additive mult, gated by card type.

  rank_shine: {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards)
        if (card.type === 'bright') boosts.set(card.id, 80);
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      return capturedCards.filter(c => c.type === 'bright').length * 8;
    },
  },

  rank_pulse: {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards)
        if (card.type === 'animal') boosts.set(card.id, 50);
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      return capturedCards.filter(c => c.type === 'animal').length * 5;
    },
  },

  rank_poem: {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards)
        if (card.type === 'ribbon') boosts.set(card.id, 40);
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      return capturedCards.filter(c => c.type === 'ribbon').length * 4;
    },
  },

  rank_salt: {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards)
        if (card.type === 'plain') boosts.set(card.id, 20);
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      return capturedCards.filter(c => c.type === 'plain').length * 2;
    },
  },

  // ── Rank Engine Spirits ───────────────────────────────────────────────────
  // Pure mult-mult channel; some are persistent across rounds.

  /**
   * Radiance: ×2.0 per bright captured this round (exponential).
   */
  engine_radiance: {
    getMultMult({ capturedCards }) {
      const n = capturedCards.filter(c => c.type === 'bright').length;
      return n > 0 ? Math.pow(2.0, n) : 1.0;
    },
  },

  /**
   * Wildlife: persistent collection tracker.  Each NEW unique animal species
   * captured (any round) adds +0.5 to the mult-mult permanently.
   */
  engine_wildlife: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'engine_wildlife');
      const n    = self?.state?.seenAnimals?.length ?? 0;
      return 1.0 + n * 0.5;
    },
  },

  /**
   * Banner: +1.0 mult-mult per ribbon captured this round.
   */
  engine_banner: {
    getMultMult({ capturedCards }) {
      const n = capturedCards.filter(c => c.type === 'ribbon').length;
      return 1.0 + n;
    },
  },

  /**
   * Plenty: persistent plain tracker.  Each NEW unique plain card captured
   * (any round) adds +0.1 to the mult-mult permanently.
   */
  engine_plenty: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'engine_plenty');
      const n    = self?.state?.seenPlains?.length ?? 0;
      return 1.0 + n * 0.1;
    },
  },

  // ── Rank Utility Spirits ──────────────────────────────────────────────────
  // Event-triggered effects — handled in GameRoundManager._addCapture().
  // No scoring channels here; entries exist so SpiritEffects.get() returns non-null.

  util_glory:      {},  // bright captured → draw 3 cards
  util_symbiosis:  {},  // placeholder
  util_festival:   {},  // ribbon captured → stamp (TBD)
  util_irrigation: {},  // plain captured → +10 pts added to running score

  // ── Economy Spirits ────────────────────────────────────────────────────────
  // Most effects are event-driven (interest, push, round-end) — handled in
  // RunManager / GameRoundManager.  Entries here so SpiritEffects.get() returns non-null.

  econ_bonds:        {},  // +10% interest rate — RunManager.interestRate getter
  econ_ingot:        {},  // +0.1% interest per ki — RunManager.interestRate getter
  econ_grace:        {},  // double style combo ki — RunManager.calculateKiReward
  econ_recycling:    {},  // +5 ki per overflow discard — GameRoundManager._doDeckPhase / playHandCard
  econ_lucky_charm:  {},  // +50% ki on push — GameRoundManager.pushOn
  econ_piggybank:    {},  // 3× hand ki at round end — RunManager.calculateKiReward
  econ_coupon:       {},  // 20% shop discount — ShrineScene price multiplier
  econ_replica:      {},  // placeholder
  econ_print:        {},  // placeholder
  econ_present:      {},  // placeholder
  econ_collector:    {},  // placeholder

  // ── Gameplay Spirits ───────────────────────────────────────────────────────

  game_expanse:  {},  // +2 field slots — GameRoundManager.startRound sets field.maxSlots=10
  game_well:     {},  // draw +1 on capture — GameRoundManager._addCapture
  game_catcher:  {},  // overflow→hand — GameRoundManager field-full discard path
  game_surplus:  {},  // +2 starting hand cards — GameRoundManager.startRound
  game_gankyil:  {},  // 3-stack capture — GameRoundManager capture threshold
  game_angel:    {},  // +1 card per push — GameRoundManager._getNextPushDealCount
  game_mirror:   {},  // placeholder
  game_echo:     {},  // placeholder

  // ── Wu Xing Engine Spirits ─────────────────────────────────────────────────
  // State incremented in _applyPostRoundEnhancements; read here for mult-mult channel.

  engine_glacier: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'engine_glacier');
      return 1.0 + (self?.state?.waterDepCount ?? 0) * 0.3;
    },
  },

  engine_carbon: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'engine_carbon');
      return 1.0 + (self?.state?.fireCombustCount ?? 0) * 0.5;
    },
  },

  engine_velocity: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'engine_velocity');
      return 1.0 + (self?.state?.metalProcCount ?? 0) * 0.3;
    },
  },

  engine_fossil: {
    getMultMult({ spirits }) {
      // Use the cached count updated at round end by _applyPostRoundEnhancements.
      const self = spirits.find(s => s.id === 'engine_fossil');
      return 1.0 + (self?.state?.earthCardCount ?? 0) * 0.2;
    },
  },

  engine_moths: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'engine_moths');
      return 1.0 + (self?.state?.silkTriggerCount ?? 0) * 0.4;
    },
  },
};

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Look up the effect definition for a spirit.
 * @param {string} spiritId
 * @returns {{ getPointBoosts?: Function,
 *             getAdditiveMult?: Function,
 *             getMultMult?: Function }|null}
 *   null if the id is unrecognised.
 */
const SpiritEffects = {
  get(spiritId) { return _effects[spiritId] ?? null; },
};

export default SpiritEffects;
