// ─────────────────────────────────────────────────────────────────────────────
// consumables.js — twelve zodiac consumable items
//
// Each consumable:
//   id          unique string identifier
//   name        display name
//   zodiac      zodiac animal name
//   description human-readable effect summary (runtime logic implemented separately)
//   cost        ki cost to purchase at the shrine shop
//   rarity      'common' | 'uncommon' | 'rare' | 'legendary'
//   effect      machine-readable effect key (hooks implemented later)
// ─────────────────────────────────────────────────────────────────────────────

export const consumables = [

  {
    id:          'consumable_rat',
    name:        'Rat',
    zodiac:      'Rat',
    description: 'Capture one field card directly without matching.',
    cost:        2,
    rarity:      'common',
    effect:      'direct_capture:1',
  },
  {
    id:          'consumable_ox',
    name:        'Ox',
    zodiac:      'Ox',
    description: 'Lock one hand card; persists across pushes.',
    cost:        2,
    rarity:      'common',
    effect:      'lock_hand_card:1',
  },
  {
    id:          'consumable_tiger',
    name:        'Tiger',
    zodiac:      'Tiger',
    description: 'Force-capture any field card regardless of month.',
    cost:        3,
    rarity:      'uncommon',
    effect:      'force_capture:1',
  },
  {
    id:          'consumable_rabbit',
    name:        'Rabbit',
    zodiac:      'Rabbit',
    description: 'Peek at top 3 deck cards and reorder them.',
    cost:        2,
    rarity:      'common',
    effect:      'peek_reorder_deck:3',
  },
  {
    id:          'consumable_dragon',
    name:        'Dragon',
    zodiac:      'Dragon',
    description: 'Instantly complete your closest yaku.',
    cost:        8,
    rarity:      'legendary',
    effect:      'complete_closest_yaku',
  },
  {
    id:          'consumable_snake',
    name:        'Snake',
    zodiac:      'Snake',
    description: "Shift one captured card's month to an adjacent month.",
    cost:        3,
    rarity:      'uncommon',
    effect:      'shift_card_month:1',
  },
  {
    id:          'consumable_horse',
    name:        'Horse',
    zodiac:      'Horse',
    description: 'Gain one extra play this round.',
    cost:        3,
    rarity:      'uncommon',
    effect:      'extra_play:1',
  },
  {
    id:          'consumable_goat',
    name:        'Goat',
    zodiac:      'Goat',
    description: 'Upgrade one captured plain to a ribbon of the same month.',
    cost:        4,
    rarity:      'rare',
    effect:      'upgrade_plain_to_ribbon:1',
  },
  {
    id:          'consumable_monkey',
    name:        'Monkey',
    zodiac:      'Monkey',
    description: 'Swap one hand card with one field card.',
    cost:        2,
    rarity:      'common',
    effect:      'swap_hand_field:1',
  },
  {
    id:          'consumable_rooster',
    name:        'Rooster',
    zodiac:      'Rooster',
    description: 'Reveal all deck cards matching months on the field.',
    cost:        2,
    rarity:      'common',
    effect:      'reveal_matching_deck_cards',
  },
  {
    id:          'consumable_dog',
    name:        'Dog',
    zodiac:      'Dog',
    description: 'Nullify push penalty this round.',
    cost:        5,
    rarity:      'rare',
    effect:      'nullify_push_penalty',
  },
  {
    id:          'consumable_pig',
    name:        'Pig',
    zodiac:      'Pig',
    description: 'Double ki earned from this round.',
    cost:        4,
    rarity:      'rare',
    effect:      'double_ki_reward',
  },
];

/**
 * Look up a consumable by its id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const consumableById = Object.fromEntries(consumables.map(c => [c.id, c]));
