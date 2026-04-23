// ─────────────────────────────────────────────────────────────────────────────
// consumables.js — Deck modification tools
//
// Chakra Tools: shop-only instant-apply deck tools (replace Four Practices).
// Three Marks: kept for backward compatibility with any save state.
// ─────────────────────────────────────────────────────────────────────────────

/** Primary deck tool set. Shop-only, instant-apply. All cost 4 ki. */
export const CHAKRA_TOOLS = [
  {
    id:          'chakra_root',
    name:        'Root Chakra',
    description: 'Toggle the day/night axis of up to 3 cards.',
    cost:        4,
    maxTargets:  3,
    category:    'chakra',
  },
  {
    id:          'chakra_sacral',
    name:        'Sacral Chakra',
    description: 'Advance the month of up to 3 cards (December cycles back to January).',
    cost:        4,
    maxTargets:  3,
    category:    'chakra',
  },
  {
    id:          'chakra_solar_plexus',
    name:        'Solar Plexus Chakra',
    description: 'Cycle the type of up to 2 cards (plain→ribbon→animal→bright→plain).',
    cost:        4,
    maxTargets:  2,
    category:    'chakra',
  },
  {
    id:          'chakra_heart',
    name:        'Heart Chakra',
    description: 'Apply a random edition to 1 card (60% Gold +20pts / 30% Crystal +5×mult / 10% Ghost ×1.5 mult).',
    cost:        4,
    maxTargets:  1,
    category:    'chakra',
  },
  {
    id:          'chakra_throat',
    name:        'Throat Chakra',
    description: 'Duplicate 1 card — add an exact copy to your deck.',
    cost:        4,
    maxTargets:  1,
    category:    'chakra',
  },
  {
    id:          'chakra_third_eye',
    name:        'Third Eye Chakra',
    description: 'Permanently delete up to 2 cards from your deck.',
    cost:        4,
    maxTargets:  2,
    category:    'chakra',
  },
  {
    id:          'chakra_crown',
    name:        'Crown Chakra',
    description: 'Copy the identity (month/type/name) of one card onto another, preserving its enhancements.',
    cost:        4,
    maxTargets:  2,
    category:    'chakra',
  },
];

/** @deprecated — kept for backward compatibility; use CHAKRA_TOOLS instead. */
export const FOUR_PRACTICES = [
  {
    id:          'practice_path',
    name:        'Path',
    description: 'Change up to 4 cards to a target card\'s month.',
    cost:        6,
    maxTargets:  4,
    category:    'four_practices',
  },
  {
    id:          'practice_fasting',
    name:        'Fasting',
    description: 'Promote the type of up to 3 cards (plain→ribbon→animal→bright).',
    cost:        6,
    maxTargets:  3,
    category:    'four_practices',
  },
  {
    id:          'practice_mind',
    name:        'Mind',
    description: 'Delete up to 2 cards from your deck permanently.',
    cost:        5,
    maxTargets:  2,
    category:    'four_practices',
  },
  {
    id:          'practice_tree',
    name:        'Tree',
    description: 'Transform one card into an exact copy of a target card.',
    cost:        7,
    maxTargets:  1,
    category:    'four_practices',
  },
];

/** @deprecated — kept for backward compatibility with any save state. */
export const THREE_MARKS = [
  {
    id:          'mark_impermanence',
    name:        'Impermanence',
    description: 'Promote one card to the next card type in its month.',
    cost:        5,
    category:    'three_marks',
  },
  {
    id:          'mark_nonbeing',
    name:        'Non-being',
    description: 'Remove one card permanently from your deck.',
    cost:        5,
    category:    'three_marks',
  },
  {
    id:          'mark_transcendence',
    name:        'Transcendence',
    description: 'Copy all properties from a target card onto a source card.',
    cost:        5,
    category:    'three_marks',
  },
];

/**
 * Look up a mark definition by its id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const getMarkDef = (id) => THREE_MARKS.find(m => m.id === id);

// ── Wu Xing element consumables ───────────────────────────────────────────────
//
// Five element consumables.  Apply to any card in the deck (via booster pack at
// shrine or card targeting during a round).  Interaction rules:
//   Generative cycle upgrades base form: Metal→Water, Water→Wood, Wood→Fire, Fire→Earth, Earth→Metal
//   Destructive cycle strips enhancement: Earth→Water, Metal→Wood, Water→Fire, Wood→Earth, Fire→Metal
// ─────────────────────────────────────────────────────────────────────────────

export const WUXING_CONSUMABLES = [
  {
    id:          'element_water',
    name:        'Water',
    description: 'Apply Snow (2× pts, depreciates). Metal upgrades Snow→Ice (4×). Earth destroys.',
    cost:        5,
    category:    'wuxing',
    element:     'water',
  },
  {
    id:          'element_wood',
    name:        'Wood',
    description: 'Apply Leaf (bypasses field slot limit). Water upgrades Leaf→Silk (immune to stranding).',
    cost:        5,
    category:    'wuxing',
    element:     'wood',
  },
  {
    id:          'element_fire',
    name:        'Fire',
    description: 'Apply Ember (wildcard 30 pts, all yaku, 20% break). Wood upgrades Ember→Charcoal (100 pts, 10% break).',
    cost:        5,
    category:    'wuxing',
    element:     'fire',
  },
  {
    id:          'element_earth',
    name:        'Earth',
    description: 'Apply Clay (10% ki/round interest). Fire upgrades Clay→Pottery (20% ki/round).',
    cost:        5,
    category:    'wuxing',
    element:     'earth',
  },
  {
    id:          'element_metal',
    name:        'Metal',
    description: 'Apply Iron (×1.5 mult when captured, 5% jackpot +30 ki). Earth upgrades Iron→Meteorite (×3.0 mult).',
    cost:        5,
    category:    'wuxing',
    element:     'metal',
  },
];

/**
 * Look up a Wu Xing element consumable by its id.
 * @param {string} id
 * @returns {object|undefined}
 */
export const getElementDef = (id) => WUXING_CONSUMABLES.find(c => c.id === id);
