// ─────────────────────────────────────────────────────────────────────────────
// spirits.js — catalogue of all available spirits
//
// Each entry:
//   id          unique string identifier (matches SpiritEffects.js key)
//   name        display name
//   description human-readable effect summary
//   channel     'point' | 'additive' | 'multiplicative'
//   cost        ki cost to purchase at the shop
//   tier        1 = available from Act 1
//               2 = appears Act 3+
//               3 = appears Act 5+
// ─────────────────────────────────────────────────────────────────────────────

export const SPIRIT_CATALOG = [

  // ── Seasonal spirits — Channel 1: Point Boost ─────────────────────────────

  {
    id:          'spirit_spring',
    name:        'Spring Spirit',
    description: 'Cards from months 3–5 (Cherry, Wisteria, Iris) worth ×1.5 base points.',
    channel:     'point',
    cost:        8,
    tier:        1,
  },
  {
    id:          'spirit_summer',
    name:        'Summer Spirit',
    description: 'Cards from months 6–8 (Peony, Clover, Pampas) worth ×1.5 base points.',
    channel:     'point',
    cost:        8,
    tier:        1,
  },
  {
    id:          'spirit_autumn',
    name:        'Autumn Spirit',
    description: 'Cards from months 9–11 (Chrysanthemum, Maple, Rain) worth ×1.5 base points.',
    channel:     'point',
    cost:        8,
    tier:        1,
  },
  {
    id:          'spirit_winter',
    name:        'Winter Spirit',
    description: 'Cards from months 12–2 (Paulownia, Pine, Plum) worth ×1.5 base points.',
    channel:     'point',
    cost:        8,
    tier:        1,
  },

  // ── Yaku spirits — Channel 2: Additive Multiplier ─────────────────────────

  {
    id:          'spirit_tane_no_kami',
    name:        'Tane-no-Kami',
    description: '+0.3 additive multiplier when Tane (Animals) yaku is scored.',
    channel:     'additive',
    cost:        7,
    tier:        1,
  },
  {
    id:          'spirit_tanzaku_no_kami',
    name:        'Tanzaku-no-Kami',
    description: '+0.3 additive multiplier when Tanzaku (Ribbons) yaku is scored.',
    channel:     'additive',
    cost:        7,
    tier:        1,
  },
  {
    id:          'spirit_kasu_no_kami',
    name:        'Kasu-no-Kami',
    description: '+0.3 additive multiplier when Kasu (Plains) yaku is scored.',
    channel:     'additive',
    cost:        7,
    tier:        1,
  },
];

/**
 * Look up a spirit definition by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const getSpiritDef = (id) => SPIRIT_CATALOG.find(s => s.id === id);

// Backward-compat alias for any remaining imports.
export const spirits = SPIRIT_CATALOG;
