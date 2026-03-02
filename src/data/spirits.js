// ─────────────────────────────────────────────────────────────────────────────
// spirits.js — catalogue of all spirits
//
// Tier 1: 16 foundation spirits (available in shops from Act 1)
//   • 4 seasonal point-boost spirits
//   • 4 seasonal additive-mult spirits
//   • 4 axis point-boost spirits
//   • 4 axis additive-mult spirits
//
// Tier 2: 8 fusion spirits (crafted at the Sacred Grove, never sold)
//   • 4 seasonal fusions  (point + additive for season)
//   • 4 axis fusions      (point + additive for axis)
//
// fusionGroup: spirits that share a fusionGroup can be fused together at the
// Sacred Grove.  Two spirits in the same fusionGroup → one fusion spirit.
// ─────────────────────────────────────────────────────────────────────────────

export const SPIRIT_CATALOG = [

  // ── Seasonal Point Boost (Tier 1) ─────────────────────────────────────────

  {
    id:          'spring_pollen',
    name:        'Pollen',
    description: 'Spring cards (months 3–5) worth ×1.5 base points.',
    channel:     'point',
    cost:        6,
    tier:        1,
    fusionGroup: 'spring',
  },
  {
    id:          'summer_heat',
    name:        'Heat',
    description: 'Summer cards (months 6–8) worth ×1.5 base points.',
    channel:     'point',
    cost:        6,
    tier:        1,
    fusionGroup: 'summer',
  },
  {
    id:          'autumn_harvest',
    name:        'Harvest',
    description: 'Autumn cards (months 9–11) worth ×1.5 base points.',
    channel:     'point',
    cost:        6,
    tier:        1,
    fusionGroup: 'autumn',
  },
  {
    id:          'winter_cold',
    name:        'Cold',
    description: 'Winter cards (months 12, 1, 2) worth ×1.5 base points.',
    channel:     'point',
    cost:        6,
    tier:        1,
    fusionGroup: 'winter',
  },

  // ── Seasonal Additive Mult (Tier 1) ───────────────────────────────────────

  {
    id:          'spring_bees',
    name:        'Bees',
    description: '+0.1 additive mult per spring card (months 3–5) captured.',
    channel:     'additive',
    cost:        6,
    tier:        1,
    fusionGroup: 'spring',
  },
  {
    id:          'summer_humidity',
    name:        'Humidity',
    description: '+0.1 additive mult per summer card (months 6–8) captured.',
    channel:     'additive',
    cost:        6,
    tier:        1,
    fusionGroup: 'summer',
  },
  {
    id:          'autumn_leaves',
    name:        'Changing Leaves',
    description: '+0.1 additive mult per autumn card (months 9–11) captured.',
    channel:     'additive',
    cost:        6,
    tier:        1,
    fusionGroup: 'autumn',
  },
  {
    id:          'winter_aridity',
    name:        'Aridity',
    description: '+0.1 additive mult per winter card (months 12, 1, 2) captured.',
    channel:     'additive',
    cost:        6,
    tier:        1,
    fusionGroup: 'winter',
  },

  // ── Axis Point Boost (Tier 1) ─────────────────────────────────────────────
  // Sky is rare (~10 cards) so high multiplier; Land is abundant (~38) so low.

  {
    id:          'sky_clouds',
    name:        'Clouds',
    description: 'Sky cards worth ×1.7 base points.',
    channel:     'point',
    cost:        7,
    tier:        1,
    fusionGroup: 'sky',
  },
  {
    id:          'land_soil',
    name:        'Soil',
    description: 'Land cards worth ×1.2 base points.',
    channel:     'point',
    cost:        5,
    tier:        1,
    fusionGroup: 'land',
  },
  {
    id:          'day_light',
    name:        'Light',
    description: 'Day cards worth ×1.4 base points.',
    channel:     'point',
    cost:        6,
    tier:        1,
    fusionGroup: 'day',
  },
  {
    id:          'night_dark',
    name:        'Dark',
    description: 'Night cards worth ×1.3 base points.',
    channel:     'point',
    cost:        6,
    tier:        1,
    fusionGroup: 'night',
  },

  // ── Axis Additive Mult (Tier 1) ───────────────────────────────────────────

  {
    id:          'sky_wind',
    name:        'Wind',
    description: '+0.15 additive mult per sky card captured.',
    channel:     'additive',
    cost:        7,
    tier:        1,
    fusionGroup: 'sky',
  },
  {
    id:          'land_rock',
    name:        'Rock',
    description: '+0.05 additive mult per land card captured.',
    channel:     'additive',
    cost:        5,
    tier:        1,
    fusionGroup: 'land',
  },
  {
    id:          'day_movement',
    name:        'Movement',
    description: '+0.07 additive mult per day card captured.',
    channel:     'additive',
    cost:        6,
    tier:        1,
    fusionGroup: 'day',
  },
  {
    id:          'night_stillness',
    name:        'Stillness',
    description: '+0.07 additive mult per night card captured.',
    channel:     'additive',
    cost:        6,
    tier:        1,
    fusionGroup: 'night',
  },

  // ── Seasonal Fusion Spirits (Tier 2 — Sacred Grove only, never sold) ──────

  {
    id:          'fusion_bloom',
    name:        'Bloom',
    description: 'Spring cards ×1.4 base points, +0.08 additive mult per spring card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'spring',
  },
  {
    id:          'fusion_thunderstorm',
    name:        'Thunderstorm',
    description: 'Summer cards ×1.4 base points, +0.08 additive mult per summer card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'summer',
  },
  {
    id:          'fusion_decay',
    name:        'Decay',
    description: 'Autumn cards ×1.4 base points, +0.08 additive mult per autumn card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'autumn',
  },
  {
    id:          'fusion_blizzard',
    name:        'Blizzard',
    description: 'Winter cards ×1.4 base points, +0.08 additive mult per winter card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'winter',
  },

  // ── Axis Fusion Spirits (Tier 2 — Sacred Grove only, never sold) ──────────

  {
    id:          'fusion_atmosphere',
    name:        'Atmosphere',
    description: 'Sky cards ×1.5 base points, +0.12 additive mult per sky card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'sky',
  },
  {
    id:          'fusion_continent',
    name:        'Continent',
    description: 'Land cards ×1.15 base points, +0.04 additive mult per land card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'land',
  },
  {
    id:          'fusion_sun',
    name:        'Sun',
    description: 'Day cards ×1.3 base points, +0.05 additive mult per day card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'day',
  },
  {
    id:          'fusion_moon',
    name:        'Moon',
    description: 'Night cards ×1.2 base points, +0.05 additive mult per night card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'night',
  },

  // ── Yaku Scoring Spirits (Tier 1 — multiplicative channel) ───────────────

  {
    id:          'kasu_abundance',
    name:        'Abundance',
    description: '\xD71.0 mult. Permanently gains +0.03 for each plain card captured.',
    channel:     'multiplicative',
    cost:        8,
    tier:        1,
  },
  {
    id:          'tane_wildlife',
    name:        'Wildlife',
    description: '\xD71.0 mult. Permanently gains +0.1 for each unique animal species captured.',
    channel:     'multiplicative',
    cost:        8,
    tier:        1,
  },
  {
    id:          'tanzaku_festival',
    name:        'Festival',
    description: '\xD71.15 mult per unique ribbon type captured this round.',
    channel:     'multiplicative',
    cost:        7,
    tier:        1,
  },
  {
    id:          'hikari_radiance',
    name:        'Radiance',
    description: '\xD71.4 mult per bright captured this round.',
    channel:     'multiplicative',
    cost:        9,
    tier:        1,
  },
];

/**
 * Look up a spirit definition by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const getSpiritDef = (id) => SPIRIT_CATALOG.find(s => s.id === id);
