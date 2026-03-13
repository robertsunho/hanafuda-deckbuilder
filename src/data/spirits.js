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
  },
  {
    id:          'summer_heat',
    name:        'Heat',
    description: 'Summer cards (months 6–8) worth +20 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'summer',
  },
  {
    id:          'autumn_harvest',
    name:        'Harvest',
    description: 'Autumn cards (months 9–11) worth +20 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'autumn',
  },
  {
    id:          'winter_cold',
    name:        'Cold',
    description: 'Winter cards (months 12, 1, 2) worth +20 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'winter',
  },

  // ── Seasonal Additive Mult (Tier 1) ───────────────────────────────────────

  {
    id:          'spring_bees',
    name:        'Bees',
    description: '+5 additive mult per spring card (months 3–5) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'spring',
  },
  {
    id:          'summer_humidity',
    name:        'Wet',
    description: '+5 additive mult per summer card (months 6–8) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'summer',
  },
  {
    id:          'autumn_leaves',
    name:        'Changing Leaves',
    description: '+5 additive mult per autumn card (months 9–11) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'autumn',
  },
  {
    id:          'winter_aridity',
    name:        'Dry',
    description: '+5 additive mult per winter card (months 12, 1, 2) captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'winter',
  },

  // ── Axis Point Boost (Tier 1) ─────────────────────────────────────────────

  {
    id:          'sky_clouds',
    name:        'Clouds',
    description: 'Sky cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'sky',
  },
  {
    id:          'land_soil',
    name:        'Soil',
    description: 'Land cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'land',
  },
  {
    id:          'day_light',
    name:        'Light',
    description: 'Day cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'day',
  },
  {
    id:          'night_dark',
    name:        'Dark',
    description: 'Night cards worth +10 base points.',
    channel:     'point',
    cost:        3,
    tier:        1,
    fusionGroup: 'night',
  },

  // ── Axis Additive Mult (Tier 1) ───────────────────────────────────────────

  {
    id:          'sky_wind',
    name:        'Wind',
    description: '+5 additive mult per sky card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'sky',
  },
  {
    id:          'land_rock',
    name:        'Rock',
    description: '+5 additive mult per land card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'land',
  },
  {
    id:          'day_movement',
    name:        'Movement',
    description: '+5 additive mult per day card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'day',
  },
  {
    id:          'night_stillness',
    name:        'Stillness',
    description: '+5 additive mult per night card captured.',
    channel:     'additive',
    cost:        3,
    tier:        1,
    fusionGroup: 'night',
  },

  // ── Seasonal Fusion Spirits (Tier 2 — Sacred Grove only, never sold) ──────

  {
    id:          'fusion_bloom',
    name:        'Bloom',
    description: 'Spring cards +15 base points, +3 additive mult per spring card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'spring',
  },
  {
    id:          'fusion_thunderstorm',
    name:        'Thunderstorm',
    description: 'Summer cards +15 base points, +3 additive mult per summer card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'summer',
  },
  {
    id:          'fusion_decay',
    name:        'Decay',
    description: 'Autumn cards +15 base points, +3 additive mult per autumn card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'autumn',
  },
  {
    id:          'fusion_blizzard',
    name:        'Blizzard',
    description: 'Winter cards +15 base points, +3 additive mult per winter card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'winter',
  },

  // ── Axis Fusion Spirits (Tier 2 — Sacred Grove only, never sold) ──────────

  {
    id:          'fusion_atmosphere',
    name:        'Atmosphere',
    description: 'Sky cards +8 base points, +3 additive mult per sky card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'sky',
  },
  {
    id:          'fusion_continent',
    name:        'Continent',
    description: 'Land cards +8 base points, +3 additive mult per land card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'land',
  },
  {
    id:          'fusion_sun',
    name:        'Sun',
    description: 'Day cards +8 base points, +3 additive mult per day card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'day',
  },
  {
    id:          'fusion_moon',
    name:        'Moon',
    description: 'Night cards +8 base points, +3 additive mult per night card.',
    channel:     'both',
    cost:        0,
    tier:        2,
    fusionGroup: 'night',
  },

  // ── Rank Foundation Spirits (Tier 1) ──────────────────────────────────────

  {
    id:          'rank_shine',
    name:        'Shine',
    description: 'Bright cards worth +80 base points, +8 additive mult per bright.',
    channel:     'rank',
    cost:        3,
    tier:        1,
  },
  {
    id:          'rank_pulse',
    name:        'Pulse',
    description: 'Animal cards worth +50 base points, +5 additive mult per animal.',
    channel:     'rank',
    cost:        3,
    tier:        1,
  },
  {
    id:          'rank_poem',
    name:        'Poem',
    description: 'Ribbon cards worth +40 base points, +4 additive mult per ribbon.',
    channel:     'rank',
    cost:        3,
    tier:        1,
  },
  {
    id:          'rank_salt',
    name:        'Salt',
    description: 'Plain cards worth +20 base points, +2 additive mult per plain.',
    channel:     'rank',
    cost:        3,
    tier:        1,
  },

  // ── Rank Engine Spirits (Tier 1) ──────────────────────────────────────────

  {
    id:          'engine_radiance',
    name:        'Radiance',
    description: '\xD72.0 mult per bright captured this round (exponential stacking).',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
  },
  {
    id:          'engine_wildlife',
    name:        'Wildlife',
    description: 'Permanently gains +0.5 mult for each unique animal species captured.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
  },
  {
    id:          'engine_banner',
    name:        'Banner',
    description: '+1.0 mult per ribbon captured this round.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
  },
  {
    id:          'engine_plenty',
    name:        'Plenty',
    description: 'Permanently gains +0.1 mult for each unique plain card captured.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
  },

  // ── Rank Utility Spirits (Tier 1) ─────────────────────────────────────────

  {
    id:          'util_glory',
    name:        'Glory',
    description: 'Whenever you capture a bright card, draw 3 cards.',
    channel:     'utility',
    cost:        3,
    tier:        1,
  },
  {
    id:          'util_festival',
    name:        'Festival',
    description: '(Coming soon) Capturing a ribbon card stamps a bonus.',
    channel:     'utility',
    cost:        3,
    tier:        1,
  },
  {
    id:          'util_irrigation',
    name:        'Irrigation',
    description: 'Whenever you capture a plain card, gain +10 bonus points.',
    channel:     'utility',
    cost:        3,
    tier:        1,
  },
  {
    id:          'util_symbiosis',
    name:        'Symbiosis',
    description: 'Capturing an animal card summons a symbiont spirit into an open slot.',
    channel:     'utility',
    cost:        7,
    tier:        1,
  },

  // ── Symbiont Spirits (generated by Symbiosis, not purchasable) ─────────────

  {
    id: 'sym_caterpillar', name: 'Caterpillar',
    description: 'Eats leaf-enhanced cards on capture (removed from deck, no yaku credit). After 3, metamorphoses into a copy of a random equipped spirit.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'warbler',
  },
  {
    id: 'sym_cuckoo_egg', name: 'Cuckoo Egg',
    description: 'Blocks this slot for 3 rounds. Hatches into a random Tier 2 fusion spirit.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'cuckoo',
  },
  {
    id: 'sym_algae', name: 'Algae',
    description: '+0.3 mult-mult each time a symbiont is summoned.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'dragonfly',
  },
  {
    id: 'sym_ants', name: 'Ants',
    description: '×1.0 mult per spirit equipped.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'butterflies',
  },
  {
    id: 'sym_crow', name: 'Crow',
    description: 'First deck flip each round is captured instead of placed.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'boar',
  },
  {
    id: 'sym_ducks', name: 'Ducks',
    description: '+0.3 mult-mult per pair captured (2-card captures). Resets each round.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'geese',
  },
  {
    id: 'sym_snails', name: 'Snails',
    description: '+0.2 mult-mult per card NOT played when round ends. Permanent across run.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'fireflies',
  },
  {
    id: 'sym_magpie', name: 'Magpie',
    description: '+3 ki each time a style combo triggers.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'deer',
  },
  {
    id: 'sym_osprey', name: 'Osprey',
    description: 'Once per round, capture 1 card directly from the field before playing.',
    channel: 'symbiont', cost: 0, tier: 0, sourceAnimal: 'swallow',
  },

  // ── Cross-Fusion Spirits (Tier 3 — Sacred Grove only) ─────────────────────

  // Polarity Path
  { id: 'cross_yang',    name: 'Yang',     description: 'Sky and Day cards score at ×2.0 mult.',       channel: 'cross', cost: 0, tier: 3, fusionGroup: 'polarity' },
  { id: 'cross_yin',     name: 'Yin',      description: 'Land and Night cards score at ×2.0 mult.',    channel: 'cross', cost: 0, tier: 3, fusionGroup: 'polarity' },

  // Quadrant Path
  { id: 'cross_space',   name: 'Space',    description: 'Sky and Night cards score at ×1.5 mult.',     channel: 'cross', cost: 0, tier: 3, fusionGroup: 'quadrant' },
  { id: 'cross_core',    name: 'Core',     description: 'Land and Day cards score at ×1.5 mult.',      channel: 'cross', cost: 0, tier: 3, fusionGroup: 'quadrant' },

  // Seasonal Extremes
  { id: 'cross_solstice', name: 'Solstice', description: 'Summer and Winter cards score at ×2.0 mult.', channel: 'cross', cost: 0, tier: 3, fusionGroup: 'seasonal_extreme' },
  { id: 'cross_equinox',  name: 'Equinox',  description: 'Spring and Autumn cards score at ×2.0 mult.', channel: 'cross', cost: 0, tier: 3, fusionGroup: 'seasonal_extreme' },

  // Half-Year
  { id: 'cross_tropic',  name: 'Tropic',   description: 'Spring and Summer cards score at ×1.5 mult.',  channel: 'cross', cost: 0, tier: 3, fusionGroup: 'halfyear' },
  { id: 'cross_arctic',  name: 'Arctic',   description: 'Autumn and Winter cards score at ×1.5 mult.',  channel: 'cross', cost: 0, tier: 3, fusionGroup: 'halfyear' },

  // ── Unity Spirits (Tier 4 — Sacred Grove only) ─────────────────────────────

  { id: 'unity_yinyang', name: 'Yin-Yang', description: 'Ultimate axis spirit. Effect TBD.',      channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_axis' },
  { id: 'unity_gravity', name: 'Gravity',  description: 'Ultimate quadrant spirit. Effect TBD.',  channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_axis' },
  { id: 'unity_time',    name: 'Time',     description: 'Ultimate seasonal spirit. Effect TBD.',  channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_seasonal' },
  { id: 'unity_planet',  name: 'Planet',   description: 'Ultimate half-year spirit. Effect TBD.', channel: 'unity', cost: 0, tier: 4, fusionGroup: 'unity_seasonal' },

  // ── Economy Spirits ────────────────────────────────────────────────────────

  {
    id:          'econ_bonds',
    name:        'Bonds',
    description: '+10% interest rate on ki at the start of each round.',
    channel:     'economy',
    cost:        4,
    tier:        1,
  },
  {
    id:          'econ_ingot',
    name:        'Ingot',
    description: '+0.1% interest per 1 ki held (scales with wealth).',
    channel:     'economy',
    cost:        4,
    tier:        1,
  },
  {
    id:          'econ_grace',
    name:        'Grace',
    description: 'Style combos earn double ki at round end.',
    channel:     'economy',
    cost:        3,
    tier:        1,
  },
  {
    id:          'econ_recycling',
    name:        'Recycling',
    description: 'Gain +5 ki whenever a card is discarded due to a full field.',
    channel:     'economy',
    cost:        3,
    tier:        1,
  },
  {
    id:          'econ_lucky_charm',
    name:        'Lucky Charm',
    description: 'When you push on, gain ki equal to 50% of current balance (max 20).',
    channel:     'economy',
    cost:        4,
    tier:        1,
  },
  {
    id:          'econ_piggybank',
    name:        'Piggy Bank',
    description: 'Leftover hand cards earn 3× ki at round end instead of 1×.',
    channel:     'economy',
    cost:        3,
    tier:        1,
  },
  {
    id:          'econ_coupon',
    name:        'Coupon',
    description: 'All shrine shop prices are 20% cheaper.',
    channel:     'economy',
    cost:        5,
    tier:        1,
  },
  {
    id:          'econ_replica',
    name:        'Replica',
    description: '(Coming soon) Duplicate a consumable at the start of each round.',
    channel:     'economy',
    cost:        5,
    tier:        1,
  },
  {
    id:          'econ_print',
    name:        'Print',
    description: '(Coming soon) Generate bonus ki each time ki is spent in the shop.',
    channel:     'economy',
    cost:        4,
    tier:        1,
  },
  {
    id:          'econ_present',
    name:        'Present',
    description: '(Coming soon) Receive a random consumable when a yaku first triggers.',
    channel:     'economy',
    cost:        4,
    tier:        1,
  },
  {
    id:          'econ_collector',
    name:        'Collector',
    description: '(Coming soon) Each round held earns +3 ki bonus at round end.',
    channel:     'economy',
    cost:        3,
    tier:        1,
  },

  // ── Gameplay Spirits ───────────────────────────────────────────────────────

  {
    id:          'game_expanse',
    name:        'Expanse',
    description: 'Field holds 2 extra card slots (10 total).',
    channel:     'gameplay',
    cost:        4,
    tier:        1,
  },
  {
    id:          'game_well',
    name:        'Well',
    description: 'Draw 1 extra card whenever you capture.',
    channel:     'gameplay',
    cost:        3,
    tier:        1,
  },
  {
    id:          'game_catcher',
    name:        'Catcher',
    description: 'Cards discarded due to a full hand go to the field instead of lost.',
    channel:     'gameplay',
    cost:        4,
    tier:        1,
  },
  {
    id:          'game_surplus',
    name:        'Surplus',
    description: 'Start each round with 2 extra cards in hand.',
    channel:     'gameplay',
    cost:        4,
    tier:        1,
  },
  {
    id:          'game_gankyil',
    name:        'Gankyil',
    description: 'A stack of 3 cards on the field can be captured immediately.',
    channel:     'gameplay',
    cost:        5,
    tier:        1,
  },
  {
    id:          'game_angel',
    name:        'Angel',
    description: 'Each push deals 1 extra card.',
    channel:     'gameplay',
    cost:        3,
    tier:        1,
  },
  {
    id:          'game_mirror',
    name:        'Mirror',
    description: '(Coming soon) An adjacent spirit\'s scoring channel triggers twice.',
    channel:     'gameplay',
    cost:        6,
    tier:        1,
  },
  {
    id:          'game_echo',
    name:        'Echo',
    description: '(Coming soon) The first card captured each round scores twice.',
    channel:     'gameplay',
    cost:        4,
    tier:        1,
  },

  // ── Wu Xing Engine Spirits ─────────────────────────────────────────────────

  {
    id:          'engine_glacier',
    name:        'Glacier',
    description: 'Permanently gains +0.3 mult for each Water card that depreciates.',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
  },
  {
    id:          'engine_carbon',
    name:        'Carbon',
    description: 'Permanently gains +0.5 mult for each Fire card that combusts.',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
  },
  {
    id:          'engine_velocity',
    name:        'Velocity',
    description: 'Permanently gains +0.3 mult for each Metal card proc.',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
  },
  {
    id:          'engine_fossil',
    name:        'Fossil',
    description: 'Permanently gains +0.2 mult for each Earth (Clay/Pottery) card in deck.',
    channel:     'multiplicative',
    cost:        3,
    tier:        1,
  },
  {
    id:          'engine_moths',
    name:        'Moths',
    description: 'Permanently gains +0.4 mult for each Wood Silk card that prevents stranding.',
    channel:     'multiplicative',
    cost:        4,
    tier:        1,
  },
];

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
  february_warbler:    'sym_caterpillar',
  april_cuckoo:        'sym_cuckoo_egg',
  may_bridge:          'sym_algae',
  june_butterflies:    'sym_ants',
  july_boar:           'sym_crow',
  august_geese:        'sym_ducks',
  september_sake:      'sym_snails',
  october_deer:        'sym_magpie',
  november_swallow:    'sym_osprey',
};
