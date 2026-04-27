// ─────────────────────────────────────────────────────────────────────────────
// spirits.js — catalogue of all spirits
//
// Tier 1: 28 foundation spirits (available in shops from Act 1)
//   • 4 seasonal point-boost spirits
//   • 4 seasonal additive-mult spirits
//   • 4 axis point-boost spirits
//   • 4 axis additive-mult spirits
//   • 4 rank foundation spirits (type-specific flat bonus + additive)
//   • 4 rank engine spirits     (persistent / per-round mult-mult)
//   • 4 rank utility spirits    (event-triggered effects)
//
// Tier 2: 8 fusion spirits (crafted at the Sacred Grove, never sold)
//   • 4 seasonal fusions  (point + additive for season)
//   • 4 axis fusions      (point + additive for axis)
//
// fusionGroup: spirits that share a fusionGroup can be fused together at the
// Sacred Grove.  Two spirits in the same fusionGroup → one fusion spirit.
//
// rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | null
//   null = not in the rarity-based RNG pool (symbionts, fusions)
//
// category: taxonomy classification for filtering and grouping
// ─────────────────────────────────────────────────────────────────────────────

export const SPIRIT_CATALOG = [

  // ── Seasonal Point Boost (Tier 1) ─────────────────────────────────────────

  {
    id:          'spring_pollen',
    name:        'Pollen',
    description: 'Spring cards (months 3–5) worth +20 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'spring',
    rarity:      'common',
    category:    'foundation_seasonal',
  },
  {
    id:          'summer_heat',
    name:        'Heat',
    description: 'Summer cards (months 6–8) worth +20 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'summer',
    rarity:      'common',
    category:    'foundation_seasonal',
  },
  {
    id:          'autumn_harvest',
    name:        'Harvest',
    description: 'Autumn cards (months 9–11) worth +20 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'autumn',
    rarity:      'common',
    category:    'foundation_seasonal',
  },
  {
    id:          'winter_cold',
    name:        'Cold',
    description: 'Winter cards (months 12, 1, 2) worth +20 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'winter',
    rarity:      'common',
    category:    'foundation_seasonal',
  },

  // ── Seasonal Additive Mult (Tier 1) ───────────────────────────────────────

  {
    id:          'spring_bees',
    name:        'Bees',
    description: '+10 additive mult per spring card (months 3–5) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'spring',
    rarity:      'common',
    category:    'foundation_seasonal',
  },
  {
    id:          'summer_humidity',
    name:        'Wet',
    description: '+10 additive mult per summer card (months 6–8) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'summer',
    rarity:      'common',
    category:    'foundation_seasonal',
  },
  {
    id:          'autumn_leaves',
    name:        'Changing Leaves',
    description: '+10 additive mult per autumn card (months 9–11) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'autumn',
    rarity:      'common',
    category:    'foundation_seasonal',
  },
  {
    id:          'winter_aridity',
    name:        'Dry',
    description: '+10 additive mult per winter card (months 12, 1, 2) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'winter',
    rarity:      'common',
    category:    'foundation_seasonal',
  },

  // ── Axis Point Boost (Tier 1) ─────────────────────────────────────────────

  {
    id:          'air_clouds',
    name:        'Clouds',
    description: 'Air cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'air',
    rarity:      'common',
    category:    'foundation_axis',
  },
  {
    id:          'land_soil',
    name:        'Soil',
    description: 'Land cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'land',
    rarity:      'common',
    category:    'foundation_axis',
  },
  {
    id:          'day_light',
    name:        'Light',
    description: 'Day cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'day',
    rarity:      'common',
    category:    'foundation_axis',
  },
  {
    id:          'night_dark',
    name:        'Dark',
    description: 'Night cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'night',
    rarity:      'common',
    category:    'foundation_axis',
  },

  // ── Axis Additive Mult (Tier 1) ───────────────────────────────────────────

  {
    id:          'air_wind',
    name:        'Wind',
    description: '+5 additive mult per air card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'air',
    rarity:      'common',
    category:    'foundation_axis',
  },
  {
    id:          'land_rock',
    name:        'Rock',
    description: '+5 additive mult per land card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'land',
    rarity:      'common',
    category:    'foundation_axis',
  },
  {
    id:          'day_movement',
    name:        'Movement',
    description: '+5 additive mult per day card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'day',
    rarity:      'common',
    category:    'foundation_axis',
  },
  {
    id:          'night_stillness',
    name:        'Stillness',
    description: '+5 additive mult per night card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'night',
    rarity:      'common',
    category:    'foundation_axis',
  },

  // ── Seasonal Fusion Spirits (Tier 2 — Sacred Grove only, never sold) ──────

  {
    id:          'fusion_bloom',
    name:        'Bloom',
    description: 'Spring cards +15 base points, +7 additive mult per spring card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'spring',
    rarity:      null,
    category:    'fusion_t2',
  },
  {
    id:          'fusion_thunderstorm',
    name:        'Thunderstorm',
    description: 'Summer cards +15 base points, +7 additive mult per summer card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'summer',
    rarity:      null,
    category:    'fusion_t2',
  },
  {
    id:          'fusion_decay',
    name:        'Decay',
    description: 'Autumn cards +15 base points, +7 additive mult per autumn card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'autumn',
    rarity:      null,
    category:    'fusion_t2',
  },
  {
    id:          'fusion_blizzard',
    name:        'Blizzard',
    description: 'Winter cards +15 base points, +7 additive mult per winter card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'winter',
    rarity:      null,
    category:    'fusion_t2',
  },

  // ── Axis Fusion Spirits (Tier 2 — Sacred Grove only, never sold) ──────────

  {
    id:          'fusion_atmosphere',
    name:        'Atmosphere',
    description: 'Air cards +8 base points, +3 additive mult per air card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'air',
    rarity:      null,
    category:    'fusion_t2',
  },
  {
    id:          'fusion_continent',
    name:        'Continent',
    description: 'Land cards +8 base points, +3 additive mult per land card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'land',
    rarity:      null,
    category:    'fusion_t2',
  },
  {
    id:          'fusion_sun',
    name:        'Sun',
    description: 'Day cards +8 base points, +3 additive mult per day card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'day',
    rarity:      null,
    category:    'fusion_t2',
  },
  {
    id:          'fusion_moon',
    name:        'Moon',
    description: 'Night cards +8 base points, +3 additive mult per night card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'night',
    rarity:      null,
    category:    'fusion_t2',
  },

  // ── Rank Foundation Spirits (Tier 1) ──────────────────────────────────────

  {
    id:          'rank_shine',
    name:        'Shine',
    description: 'Bright cards worth +80 base points, +8 additive mult per bright.',
    channel:     'rank',
    cost:        3,
    tier:        1,
    rarity:      'common',
    category:    'foundation_rank',
  },
  {
    id:          'rank_oxygen',
    name:        'Oxygen',
    description: 'Animal cards worth +50 base points, +5 additive mult per animal.',
    channel:     'rank',
    cost:        3,
    tier:        1,
    rarity:      'common',
    category:    'foundation_rank',
  },
  {
    id:          'rank_poem',
    name:        'Poem',
    description: 'Ribbon cards worth +40 base points, +4 additive mult per ribbon.',
    channel:     'rank',
    cost:        3,
    tier:        1,
    rarity:      'common',
    category:    'foundation_rank',
  },
  {
    id:          'rank_salt',
    name:        'Salt',
    description: 'Plain cards worth +20 base points, +2 additive mult per plain.',
    channel:     'rank',
    cost:        3,
    tier:        1,
    rarity:      'common',
    category:    'foundation_rank',
  },

  // ── Rank Engine Spirits (Tier 1) ──────────────────────────────────────────

  {
    id:          'engine_radiance',
    name:        'Radiance',
    description: '\xD72.0 mult per bright captured this round (exponential stacking).',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_mult',
  },
  {
    id:          'engine_wildlife',
    name:        'Wildlife',
    description: 'Permanently gains +0.5 mult for each unique animal species captured.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_mult',
  },
  {
    id:          'engine_banner',
    name:        'Banner',
    description: '+1.0 mult per ribbon captured this round.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_mult',
  },
  {
    id:          'engine_plenty',
    name:        'Plenty',
    description: 'Permanently gains +0.1 mult for each unique plain card captured.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_mult',
  },

  // ── Rank Utility Spirits (Tier 1) ─────────────────────────────────────────

  {
    id:          'util_glory',
    name:        'Glory',
    description: 'Whenever you capture a bright card, draw 2 cards.',
    channel:     'utility',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'utility',
  },
  {
    id:          'util_festival',
    name:        'Festival',
    description: 'Capturing a colored ribbon generates a stamp of that color (per stack, slot-gated).',
    channel:     'utility',
    cost:        5,
    tier:        1,
    rarity:      'uncommon',
    category:    'utility',
  },
  {
    id:          'util_irrigation',
    name:        'Irrigation',
    description: 'Whenever you capture a plain card, gain +10 bonus points.',
    channel:     'utility',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'utility',
  },
  {
    id:          'util_symbiosis',
    name:        'Symbiosis',
    description: 'Capturing an animal summons a symbiont. 3 stacks summon 3 different symbionts per capture.',
    channel:     'utility',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'utility',
  },

  // ── Symbiont Spirits (generated by Symbiosis, not purchasable) ─────────────

  {
    id: 'sym_caterpillar', name: 'Caterpillar',
    description: 'Eats leaf-enhanced cards on capture (removed from deck, no yaku credit). After 3, metamorphoses into a copy of a random equipped spirit.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'warbler',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_cuckoo_egg', name: 'Cuckoo Egg',
    description: 'Blocks this slot for 3 rounds. Hatches into a random Tier 2 fusion spirit.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'cuckoo',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_algae', name: 'Algae',
    description: '+0.1 mult-mult each time a symbiont is summoned.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'dragonfly',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_ants', name: 'Ants',
    description: '+0.5 additive mult per card played (permanent across run).',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'butterflies',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_crow', name: 'Crow',
    description: 'Generate a random consumable at end of round (if slot available).',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'boar',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_ducks', name: 'Ducks',
    description: 'Starts at +1 additive mult. Doubles per deck-flip pair, halves per stranded pair. Permanent.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'geese',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_snails', name: 'Snails',
    description: '+1 additive mult per card NOT played at round end. Permanent across run.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'fireflies',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_magpie', name: 'Magpie',
    description: '+3 ki each time a style combo triggers.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'deer',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_osprey', name: 'Osprey',
    description: 'Draw the first deck flip into your hand instead of field. Stacks: first N flips.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'swallow',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_wolf', name: 'Wolf',
    description: '\xD72 mult per scored bright (stacks: \xD74/\xD76).',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'january_bear',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_garden', name: 'Garden',
    description: '+0.2 additive mult per unique card in deck.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'march_ladybugs',
    rarity: null, category: 'symbiont',
  },
  {
    id: 'sym_badger', name: 'Badger',
    description: '+1 additive mult per consumable used (permanent across run).',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'december_fox',
    rarity: null, category: 'symbiont',
  },

  // ── Cross-Fusion Spirits (Tier 3 — Sacred Grove only) ─────────────────────

  // Polarity Path
  { id: 'cross_yang',    name: 'Yang',     description: 'Air and Day cards score at ×2.0 mult.',       channel: 'cross', cost: 0, tier: 3, fusionGroup: 'polarity',         rarity: null, category: 'fusion_t3' },
  { id: 'cross_yin',     name: 'Yin',      description: 'Land and Night cards score at ×2.0 mult.',    channel: 'cross', cost: 0, tier: 3, fusionGroup: 'polarity',         rarity: null, category: 'fusion_t3' },

  // Quadrant Path
  { id: 'cross_space',   name: 'Space',    description: 'Air and Night cards score at ×2.0 mult.',     channel: 'cross', cost: 0, tier: 3, fusionGroup: 'quadrant',         rarity: null, category: 'fusion_t3' },
  { id: 'cross_energy',  name: 'Energy',   description: 'Land and Day cards score at ×2.0 mult.',      channel: 'cross', cost: 0, tier: 3, fusionGroup: 'quadrant',         rarity: null, category: 'fusion_t3' },

  // Seasonal Extremes
  { id: 'cross_solstice', name: 'Solstice', description: 'Summer and Winter cards score at ×2.0 mult.', channel: 'cross', cost: 0, tier: 3, fusionGroup: 'seasonal_extreme', rarity: null, category: 'fusion_t3' },
  { id: 'cross_equinox',  name: 'Equinox',  description: 'Spring and Autumn cards score at ×2.0 mult.', channel: 'cross', cost: 0, tier: 3, fusionGroup: 'seasonal_extreme', rarity: null, category: 'fusion_t3' },

  // Half-Year
  { id: 'cross_tropic',  name: 'Tropic',   description: 'Spring and Summer cards score at ×2.0 mult.',  channel: 'cross', cost: 0, tier: 3, fusionGroup: 'halfyear',         rarity: null, category: 'fusion_t3' },
  { id: 'cross_arctic',  name: 'Arctic',   description: 'Autumn and Winter cards score at ×2.0 mult.',  channel: 'cross', cost: 0, tier: 3, fusionGroup: 'halfyear',         rarity: null, category: 'fusion_t3' },

  // ── Unity Spirits (Tier 4 — Sacred Grove only) ─────────────────────────────

  { id: 'capstone_yinyang',  name: 'Yin-Yang',  description: 'Each spirit slot fires its effect twice in chain order.',                channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_axis',     rarity: null, category: 'fusion_t4', legendary: true, capstone: true },
  { id: 'capstone_universe', name: 'Universe', description: 'Mult-modifying spirits also affect points by the same value.',       channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_axis',     rarity: null, category: 'fusion_t4', legendary: true, capstone: true },
  { id: 'capstone_time',    name: 'Time',     description: 'Push success \xD71.3, fail \xD70.95, round decay \xD70.98.',          channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_seasonal', rarity: null, category: 'fusion_t4', legendary: true, capstone: true },
  { id: 'capstone_nature',  name: 'Nature',   description: 'Points carry across captures within a round (mult still resets).',    channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_seasonal', rarity: null, category: 'fusion_t4', legendary: true, capstone: true },

  // ── Economy Spirits ────────────────────────────────────────────────────────

  {
    id:          'econ_bonds',
    name:        'Bonds',
    description: '+5% addition to interest rate (stacks up to +25% additional).',
    channel:     'economy',
    cost:        4,
    tier:        1,
    rarity:      'uncommon',
    category:    'economy_ki',
  },
  {
    id:          'econ_ingot',
    name:        'Ingot',
    description: '+0.01% interest per 1 ki held (scales with wealth).',
    channel:     'economy',
    cost:        4,
    tier:        1,
    rarity:      'common',
    category:    'economy_ki',
  },
  {
    id:          'econ_grace',
    name:        'Grace',
    description: 'Multiplies style combo ki: ×2 / ×3 / ×4 (additive stacking).',
    channel:     'economy',
    cost:        3,
    tier:        1,
    rarity:      'common',
    category:    'economy_ki',
  },
  {
    id:          'econ_recycling',
    name:        'Recycling',
    description: 'Gain +5 ki whenever a card is discarded due to a full field.',
    channel:     'economy',
    cost:        3,
    tier:        1,
    rarity:      'common',
    category:    'economy_ki',
  },
  {
    id:          'econ_lucky_charm',
    name:        'Lucky Charm',
    description: '+15% to all probability rolls (Fire breakage, Meteorite jackpot, etc.) per stack.',
    channel:     'economy',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'economy_chance',
  },
  {
    id:          'econ_reward',
    name:        'Reward',
    description: 'Gain 10% of current ki each time a push succeeds (additive stacking, per push).',
    channel:     'economy',
    cost:        5,
    tier:        1,
    rarity:      'uncommon',
    category:    'economy_pushing',
  },
  {
    id:          'econ_piggybank',
    name:        'Piggy Bank',
    description: 'Multiplies hand-card ki: ×2 / ×3 / ×4 (additive stacking).',
    channel:     'economy',
    cost:        3,
    tier:        1,
    rarity:      'common',
    category:    'economy_ki',
  },
  {
    id:          'econ_coupon',
    name:        'Coupon',
    description: '15% discount on all shop prices (stacks up to 45%).',
    channel:     'economy',
    cost:        5,
    tier:        1,
    rarity:      'uncommon',
    category:    'economy_ki',
  },
  {
    id:          'econ_replica',
    name:        'Replica',
    description: '(Coming soon) Duplicate a consumable at the start of each round.',
    channel:     'economy',
    cost:        5,
    tier:        1,
    rarity:      'uncommon',
    category:    'economy_consumable',
  },
  {
    id:          'econ_print',
    name:        'Print',
    description: '(Coming soon) Generate bonus ki each time ki is spent in the shop.',
    channel:     'economy',
    cost:        4,
    tier:        1,
    rarity:      'rare',
    category:    'economy_consumable',
  },
  {
    id:          'econ_collector',
    name:        'Collector',
    description: '(Coming soon) Each round held earns +3 ki bonus at round end.',
    channel:     'economy',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'economy_consumable',
  },

  // ── Gameplay Spirits ───────────────────────────────────────────────────────

  {
    id:          'game_catcher',
    name:        'Catcher',
    description: 'Cards discarded due to a full hand go to the field instead of lost.',
    channel:     'gameplay',
    cost:        4,
    tier:        1,
    rarity:      'uncommon',
    category:    'gameplay',
  },
  {
    id:          'game_mirror',
    name:        'Mirror',
    description: 'Copies the effect of the closest spirit to its left.',
    channel:     'meta',
    cost:        6,
    tier:        1,
    rarity:      'rare',
    category:    'meta',
  },
  {
    id:          'util_past_life',
    name:        'Past Life',
    description: 'When released, creates 1 copy of a random spirit from another occupied slot.',
    channel:     'utility',
    cost:        5,
    tier:        1,
    rarity:      'rare',
    category:    'meta',
  },
  {
    id:          'engine_memory',
    name:        'Memory',
    description: 'Copies the effect of the rightmost non-Memory spirit.',
    channel:     'meta',
    cost:        8,
    tier:        1,
    rarity:      'rare',
    category:    'meta',
  },
  {
    id:          'game_echo',
    name:        'Echo',
    description: '(Coming soon) The first card captured each round scores twice.',
    channel:     'gameplay',
    cost:        4,
    tier:        1,
    rarity:      'common',
    category:    'retrigger',
  },

  // ── Wu Xing Engine Spirits ─────────────────────────────────────────────────

  {
    id:          'engine_glacier',
    name:        'Glacier',
    description: '+0.2 mult-mult per Snow depreciation, +0.4 per Ice depreciation.',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_wuxing',
  },
  {
    id:          'engine_carbon',
    name:        'Carbon',
    description: '+0.5 mult-mult per Ember break, +1.0 per Charcoal break.',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_wuxing',
  },
  {
    id:          'engine_velocity',
    name:        'Velocity',
    description: '+0.1 mult-mult per Iron card in deck, \u00D71.5 per Meteorite jackpot (compounds).',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_wuxing',
  },
  {
    id:          'engine_fossil',
    name:        'Fossil',
    description: '+0.1 mult-mult per Clay interest proc, +0.3 per Pottery proc.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_wuxing',
  },
  {
    id:          'engine_moths',
    name:        'Moths',
    description: '+0.3 mult-mult per Wood field slot creation, +0.6 per Silk stranding avoidance.',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_wuxing',
  },

  // ── Rank Additive Engine Spirits ──────────────────────────────────────────

  {
    id:          'engine_devotion',
    name:        'Devotion',
    description: '+4 additive mult per bright captured (permanent across run).',
    channel:     'additive',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_additive',
  },
  {
    id:          'engine_habitat',
    name:        'Habitat',
    description: '+2.5 additive mult per animal captured (permanent across run).',
    channel:     'additive',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_additive',
  },
  {
    id:          'engine_ceremony',
    name:        'Ceremony',
    description: '+2 additive mult per ribbon captured (permanent across run).',
    channel:     'additive',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_additive',
  },
  {
    id:          'engine_agriculture',
    name:        'Agriculture',
    description: '+1 additive mult per plain captured (permanent across run).',
    channel:     'additive',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_rank_additive',
  },

  // ── Conditional Spirits ───────────────────────────────────────────────────

  {
    id:          'cond_horizon',
    name:        'Horizon',
    description: '\xD72 mult if capture contains both air and land cards.',
    channel:     'multiplicative',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'conditional',
  },
  {
    id:          'cond_dream',
    name:        'Dream',
    description: '\xD72 mult if capture contains both day and night cards.',
    channel:     'multiplicative',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'conditional',
  },
  {
    id:          'cond_hierarchy',
    name:        'Hierarchy',
    description: '\xD71.5 mult per unique rank in capture (compounds).',
    channel:     'multiplicative',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'conditional',
  },

  // ── Counter Engine Spirits ────────────────────────────────────────────────

  {
    id:          'engine_missing_number',
    name:        'Missing Number',
    description: '+5 additive mult each time a 4-stack is scored (permanent across run).',
    channel:     'additive',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_misc',
  },
  {
    id:          'engine_palace',
    name:        'Palace',
    description: '+0.5 mult-mult per card added to the deck (permanent across run).',
    channel:     'multiplicative',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_misc',
  },
  {
    id:          'engine_ship',
    name:        'Ship',
    description: '+0.3 mult-mult per card discarded (permanent across run).',
    channel:     'multiplicative',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_misc',
  },
  {
    id:          'engine_surplus',
    name:        'Surplus',
    description: '+1 additive mult per 3 ki currently owned (recalculated per capture).',
    channel:     'additive',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_misc',
  },
  {
    id:          'engine_northern_lion',
    name:        'Northern Lion',
    description: 'Gains a free reroll each time you push successfully.',
    channel:     'utility',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_misc',
  },
  {
    id:          'engine_kintaro',
    name:        'Kintaro',
    description: '+0.1 mult-mult per Gold edition consumed (consumes Gold from scored cards, card remains).',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_edition',
  },
  {
    id:          'engine_golden_toad',
    name:        'Golden Toad',
    description: 'Applies Gold edition to up to N scored cards per capture (N = stack count). Skips cards with existing edition.',
    channel:     'utility',
    cost:        5,
    tier:        1,
    rarity:      'uncommon',
    category:    'utility_edition',
  },
  {
    id:          'engine_irrigation',
    name:        'Irrigation',
    description: 'Each plain card captured permanently gains +3 points (stacks across captures).',
    channel:     'utility',
    cost:        5,
    tier:        1,
    rarity:      'uncommon',
    category:    'utility_card',
  },
  {
    id:          'engine_void',
    name:        'Void',
    description: '+0.3 mult-mult per destroyed card (permanent).',
    channel:     'multiplicative',
    cost:        8,
    tier:        1,
    rarity:      'rare',
    category:    'engine_destruction',
  },
  {
    id:          'engine_bullseye',
    name:        'Bullseye',
    description: '+1 mult-mult per round where all 4 yaku ranks (Hikari, Tane, Tanzaku, Kasu) are completed.',
    channel:     'multiplicative',
    cost:        8,
    tier:        1,
    rarity:      'rare',
    category:    'engine_round',
  },
  {
    id:          'engine_lincoln',
    name:        'Lincoln',
    description: '+0.1 additive mult each time you bank (permanent engine).',
    channel:     'additive',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_misc',
  },
  {
    id:          'engine_napoleon',
    name:        'Napoleon',
    description: '+0.2 additive mult each time a push fails (permanent engine).',
    channel:     'additive',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'engine_misc',
  },

  // ── Decay Spirits ─────────────────────────────────────────────────────────

  {
    id:          'decay_persimmon',
    name:        'Persimmon',
    description: 'Starts at +30 additive mult, loses 3 per round.',
    channel:     'additive',
    cost:        4,
    tier:        1,
    rarity:      'common',
    category:    'decay',
  },
  {
    id:          'decay_pear',
    name:        'Pear',
    description: 'Starts at +150 points, loses 5 per round.',
    channel:     'point',
    cost:        5,
    tier:        1,
    rarity:      'common',
    category:    'decay',
  },

  // ── Rank Retrigger Spirits ────────────────────────────────────────────────

  {
    id:          'retrigger_rainbow',
    name:        'Rainbow',
    description: 'Retrigger scored brights (1 extra trigger per copy).',
    channel:     'retrigger',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'retrigger',
  },
  {
    id:          'retrigger_family',
    name:        'Family',
    description: 'Retrigger scored animals (1 extra trigger per copy).',
    channel:     'retrigger',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'retrigger',
  },
  {
    id:          'retrigger_wish',
    name:        'Wish',
    description: 'Retrigger scored ribbons (1 extra trigger per copy).',
    channel:     'retrigger',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'retrigger',
  },
  {
    id:          'retrigger_dew',
    name:        'Dew',
    description: 'Retrigger scored plains (1 extra trigger per copy).',
    channel:     'retrigger',
    cost:        6,
    tier:        1,
    rarity:      'uncommon',
    category:    'retrigger',
  },
  {
    id:          'engine_applause',
    name:        'Applause',
    description: 'Retrigger held-in-hand effects (Iron, Meteorite, Clay, Pottery).',
    channel:     'retrigger',
    cost:        7,
    tier:        1,
    rarity:      'uncommon',
    category:    'retrigger',
  },

  // ── Unique Legendaries ──────────────────────────────────────────────────────

  {
    id: 'legend_wuji', name: 'Wuji',
    description: 'Each empty spirit slot gives \xD72 mult.',
    channel: 'multiplicative', cost: 0, tier: 1,
    rarity: 'legendary', category: 'legendary_unique', legendary: true,
  },
  {
    id: 'legend_dao', name: 'Dao',
    description: '+1 mult per unaltered card in deck (no enhancement, stamp, edition, or promotion).',
    channel: 'additive', cost: 0, tier: 1,
    rarity: 'legendary', category: 'legendary_unique', legendary: true,
  },
  {
    id: 'legend_chi', name: 'Chi',
    description: "Mult-mult equals current flow value. Effectively doubles flow's scoring impact.",
    channel: 'multiplicative', cost: 0, tier: 1,
    rarity: 'legendary', category: 'legendary_unique', legendary: true,
  },
  {
    id: 'legend_gankyil', name: 'Gankyil',
    description: 'Auto-capture activates at 3-stack instead of 4-stack.',
    channel: 'utility', cost: 0, tier: 1,
    rarity: 'legendary', category: 'legendary_unique', legendary: true,
  },
  {
    id: 'legend_waidan', name: 'Waidan',
    description: 'At shop exit, creates a negative copy of a random consumable in inventory.',
    channel: 'utility', cost: 0, tier: 1,
    rarity: 'legendary', category: 'legendary_economy', legendary: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a spirit definition by id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const getSpiritDef = (id) => SPIRIT_CATALOG.find(s => s.id === id);

/**
 * Maps animal card IDs to the symbiont spirit they generate when captured
 * by a player with Symbiosis equipped.
 */
export const ANIMAL_SYMBIONT_MAP = {
  january_bear:        'sym_wolf',
  february_warbler:    'sym_caterpillar',
  march_ladybugs:      'sym_garden',
  april_cuckoo:        'sym_cuckoo_egg',
  may_bridge:          'sym_algae',
  june_butterflies:    'sym_ants',
  july_boar:           'sym_crow',
  august_geese:        'sym_ducks',
  september_sake:      'sym_snails',
  october_deer:        'sym_magpie',
  november_swallow:    'sym_osprey',
  december_fox:        'sym_badger',
};

// ─────────────────────────────────────────────────────────────────────────────
// Rarity & category helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Spirits filtered by rarity (excludes null rarity). */
export const spiritsByRarity = {
  common:    SPIRIT_CATALOG.filter(s => s.rarity === 'common'),
  uncommon:  SPIRIT_CATALOG.filter(s => s.rarity === 'uncommon'),
  rare:      SPIRIT_CATALOG.filter(s => s.rarity === 'rare'),
  legendary: SPIRIT_CATALOG.filter(s => s.rarity === 'legendary'),
};

/** All spirits with non-null rarity (eligible for Cat Zodiac, Lead, etc.). */
export const rarityPoolSpirits = SPIRIT_CATALOG.filter(s => s.rarity !== null);

/** Spirits filtered by category. Returns array per category. */
export const spiritsByCategory = SPIRIT_CATALOG.reduce((acc, s) => {
  if (!acc[s.category]) acc[s.category] = [];
  acc[s.category].push(s);
  return acc;
}, {});
