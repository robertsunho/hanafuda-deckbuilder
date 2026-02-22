// ─────────────────────────────────────────────────────────────────────────────
// spirits.js — catalogue of all available spirit cards
//
// Each spirit:
//   id          unique string identifier
//   name        display name
//   description human-readable effect summary (runtime logic implemented separately)
//   cost        ki cost to acquire at the shrine shop
//   rarity      'common' | 'uncommon' | 'rare' | 'legendary'
//   effect      machine-readable effect key / descriptor (for the game engine)
// ─────────────────────────────────────────────────────────────────────────────

export const spirits = [

  // ── Seasonal spirits (common) ─────────────────────────────────────────────

  {
    id:          'spirit_spring',
    name:        'Spring Spirit',
    description: '+0.3× per captured card from months 3, 4, 5.',
    cost:        4,
    rarity:      'common',
    effect:      'seasonal_bonus:3,4,5:0.3',
  },
  {
    id:          'spirit_summer',
    name:        'Summer Spirit',
    description: '+0.3× per captured card from months 6, 7, 8.',
    cost:        4,
    rarity:      'common',
    effect:      'seasonal_bonus:6,7,8:0.3',
  },
  {
    id:          'spirit_autumn',
    name:        'Autumn Spirit',
    description: '+0.3× per captured card from months 9, 10, 11.',
    cost:        4,
    rarity:      'common',
    effect:      'seasonal_bonus:9,10,11:0.3',
  },
  {
    id:          'spirit_winter',
    name:        'Winter Spirit',
    description: '+0.3× per captured card from months 12, 1, 2.',
    cost:        4,
    rarity:      'common',
    effect:      'seasonal_bonus:12,1,2:0.3',
  },

  // ── Yaku threshold spirits (uncommon) ─────────────────────────────────────

  {
    id:          'spirit_tane_no_kami',
    name:        'Tane-no-Kami',
    description: 'Tane threshold reduced to 2 animals. +0.1× per animal beyond.',
    cost:        5,
    rarity:      'uncommon',
    effect:      'tane_threshold:2:0.1',
  },
  {
    id:          'spirit_tanzaku_no_kami',
    name:        'Tanzaku-no-Kami',
    description: 'Tanzaku threshold reduced to 3 ribbons. +0.1× per ribbon beyond.',
    cost:        5,
    rarity:      'uncommon',
    effect:      'tanzaku_threshold:3:0.1',
  },
  {
    id:          'spirit_kasu_no_kami',
    name:        'Kasu-no-Kami',
    description: 'Kasu threshold reduced to 4 plains. +0.1× per plain beyond.',
    cost:        5,
    rarity:      'uncommon',
    effect:      'kasu_threshold:4:0.1',
  },

  // ── Rare spirits ──────────────────────────────────────────────────────────

  {
    id:          'spirit_kitsune',
    name:        'Kitsune',
    description: 'One random hand card becomes wild (matches any month) each round.',
    cost:        7,
    rarity:      'rare',
    effect:      'wild_hand_card:1',
  },
  {
    id:          'spirit_dokkaebi',
    name:        'Dokkaebi',
    description: 'Randomly doubles one completed yaku multiplier at round end.',
    cost:        7,
    rarity:      'rare',
    effect:      'double_random_yaku',
  },

  // ── Legendary spirits ─────────────────────────────────────────────────────

  {
    id:          'spirit_yin_yang',
    name:        'Yin-Yang',
    description: 'If you complete yaku from 2+ card types, both get +0.5× bonus.',
    cost:        10,
    rarity:      'legendary',
    effect:      'multi_type_yaku_bonus:2:0.5',
  },
];

/**
 * Look up a spirit by its id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const spiritById = Object.fromEntries(spirits.map(s => [s.id, s]));
