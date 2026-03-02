// ─────────────────────────────────────────────────────────────────────────────
// SpiritEffects — three-channel scoring registry for all 24 spirits
//
// Each entry may implement any combination of:
//
//   getPointBoosts({ capturedCards, spirits })
//     → Map<cardId, multiplier> | null
//     Channel 1: multiply the base point value of specific captured cards.
//     Boosts stack multiplicatively across spirits (two ×2 effects = ×4).
//
//   getAdditiveMult({ capturedCards, yakuList, spirits })
//     → number (default 0)
//     Channel 2: flat addition to the yaku multiplier layer.
//     Stacks additively: two +0.3 effects = +0.6 total.
//
//   getMultMult({ capturedCards, yakuList, spirits })
//     → number (default 1.0)
//     Channel 3: multiplies the entire (Yaku + Additive) layer.
//     Stacks multiplicatively: two ×1.3 effects = ×1.69.
//
// Axis spirits use card.vertical ('sky' | 'ground') and card.temporal ('day' | 'night').
// Note: Land cards use 'ground' internally; the display name is 'Land'.
// ─────────────────────────────────────────────────────────────────────────────

// ── Factory helpers ───────────────────────────────────────────────────────────

function monthPointBoost(months, mult) {
  const set = new Set(months);
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (set.has(card.month)) boosts.set(card.id, mult);
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
        if (set.has(card.month)) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function monthFusion(months, mult, bonusPerCard) {
  const set = new Set(months);
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (set.has(card.month)) boosts.set(card.id, mult);
      }
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (set.has(card.month)) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function verticalPointBoost(vertical, mult) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.vertical === vertical) boosts.set(card.id, mult);
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
        if (card.vertical === vertical) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function verticalFusion(vertical, mult, bonusPerCard) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.vertical === vertical) boosts.set(card.id, mult);
      }
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.vertical === vertical) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function temporalPointBoost(temporal, mult) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.temporal === temporal) boosts.set(card.id, mult);
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
        if (card.temporal === temporal) n++;
      }
      return n * bonusPerCard;
    },
  };
}

function temporalFusion(temporal, mult, bonusPerCard) {
  return {
    getPointBoosts({ capturedCards }) {
      const boosts = new Map();
      for (const card of capturedCards) {
        if (card.temporal === temporal) boosts.set(card.id, mult);
      }
      return boosts.size > 0 ? boosts : null;
    },
    getAdditiveMult({ capturedCards }) {
      let n = 0;
      for (const card of capturedCards) {
        if (card.temporal === temporal) n++;
      }
      return n * bonusPerCard;
    },
  };
}

// ── Spirit effect registry ────────────────────────────────────────────────────

const _effects = {

  // ── Seasonal Point Boost ──────────────────────────────────────────────────

  spring_pollen:  monthPointBoost([3, 4, 5],   1.5),
  summer_heat:    monthPointBoost([6, 7, 8],   1.5),
  autumn_harvest: monthPointBoost([9, 10, 11], 1.5),
  winter_cold:    monthPointBoost([12, 1, 2],  1.5),

  // ── Seasonal Additive Mult ────────────────────────────────────────────────

  spring_bees:     monthAdditiveMult([3, 4, 5],   0.1),
  summer_humidity: monthAdditiveMult([6, 7, 8],   0.1),
  autumn_leaves:   monthAdditiveMult([9, 10, 11], 0.1),
  winter_aridity:  monthAdditiveMult([12, 1, 2],  0.1),

  // ── Axis Point Boost ──────────────────────────────────────────────────────
  // Land uses card.vertical === 'ground' internally.

  sky_clouds: verticalPointBoost('sky',    1.7),
  land_soil:  verticalPointBoost('ground', 1.2),
  day_light:  temporalPointBoost('day',    1.4),
  night_dark: temporalPointBoost('night',  1.3),

  // ── Axis Additive Mult ────────────────────────────────────────────────────

  sky_wind:        verticalAdditiveMult('sky',    0.15),
  land_rock:       verticalAdditiveMult('ground', 0.05),
  day_movement:    temporalAdditiveMult('day',    0.07),
  night_stillness: temporalAdditiveMult('night',  0.07),

  // ── Seasonal Fusion Spirits ───────────────────────────────────────────────
  // Both channels active with reduced values vs. holding both base spirits.

  fusion_bloom:        monthFusion([3, 4, 5],   1.4, 0.08),
  fusion_thunderstorm: monthFusion([6, 7, 8],   1.4, 0.08),
  fusion_decay:        monthFusion([9, 10, 11], 1.4, 0.08),
  fusion_blizzard:     monthFusion([12, 1, 2],  1.4, 0.08),

  // ── Axis Fusion Spirits ───────────────────────────────────────────────────

  fusion_atmosphere: verticalFusion('sky',    1.5,  0.12),
  fusion_continent:  verticalFusion('ground', 1.15, 0.04),
  fusion_sun:        temporalFusion('day',    1.3,  0.05),
  fusion_moon:       temporalFusion('night',  1.2,  0.05),

  // ── Yaku Scoring Spirits — multiplicative channel ─────────────────────────

  /**
   * Abundance: persistent accumulator.  Each plain captured (any round) adds
   * +0.03 to the mult-mult permanently.  State lives on the spirit object.
   */
  kasu_abundance: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'kasu_abundance');
      const n    = self?.state?.plainsCaptured ?? 0;
      return 1.0 + n * 0.03;
    },
  },

  /**
   * Wildlife: persistent collection tracker.  Each NEW unique animal species
   * captured (any round) adds +0.1 to the mult-mult permanently.
   */
  tane_wildlife: {
    getMultMult({ spirits }) {
      const self = spirits.find(s => s.id === 'tane_wildlife');
      const n    = self?.state?.seenAnimals?.length ?? 0;
      return 1.0 + n * 0.1;
    },
  },

  /**
   * Festival: per-round calculator.  ×1.15 per unique ribbon subgroup present
   * in the capture pile this round.
   *   Subgroup A — red writing (poetry): january, february, march ribbons
   *   Subgroup B — blue:                 june, september, october ribbons
   *   Subgroup C — plain red:            all other ribbons (apr, may, jul, nov)
   */
  tanzaku_festival: {
    getMultMult({ capturedCards }) {
      const RED_WRITING = new Set(['january_ribbon', 'february_ribbon', 'march_ribbon']);
      const BLUE        = new Set(['june_ribbon', 'september_ribbon', 'october_ribbon']);
      const ids = new Set(capturedCards.map(c => c.id));
      let subgroups = 0;
      if ([...RED_WRITING].some(id => ids.has(id))) subgroups++;
      if ([...BLUE].some(id => ids.has(id)))        subgroups++;
      const hasPlainRed = capturedCards.some(
        c => c.type === 'ribbon' && !RED_WRITING.has(c.id) && !BLUE.has(c.id)
      );
      if (hasPlainRed) subgroups++;
      return subgroups > 0 ? Math.pow(1.15, subgroups) : 1.0;
    },
  },

  /**
   * Radiance: per-round calculator.  ×1.4 per bright in the capture pile.
   * 0 brights = ×1.0, 1 = ×1.4, 2 = ×1.96, 3 = ×2.744, 4 = ×3.842, 5 = ×5.378.
   */
  hikari_radiance: {
    getMultMult({ capturedCards }) {
      const n = capturedCards.filter(c => c.type === 'bright').length;
      return n > 0 ? Math.pow(1.4, n) : 1.0;
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
