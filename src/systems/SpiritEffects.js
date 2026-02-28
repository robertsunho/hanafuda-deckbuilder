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
