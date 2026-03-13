// ─────────────────────────────────────────────────────────────────────────────
// consumables.js — Deck modification tools
//
// Four Practices: shop-only instant-apply deck tools (replace old Three Marks).
// Three Marks: kept for backward compatibility with any save state.
// ─────────────────────────────────────────────────────────────────────────────

/** Primary deck tool set (replaces Three Marks). Shop-only, instant-apply. */
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

/** @deprecated — kept for backward compatibility; use FOUR_PRACTICES instead. */
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
    description: 'Apply Ember (wildcard 10 pts, all yaku, 1/7 break). Wood upgrades Ember→Charcoal (20 pts, 2/7).',
    cost:        5,
    category:    'wuxing',
    element:     'fire',
  },
  {
    id:          'element_earth',
    name:        'Earth',
    description: 'Apply Clay (2% ki/round interest). Fire upgrades Clay→Pottery (5% ki/round).',
    cost:        5,
    category:    'wuxing',
    element:     'earth',
  },
  {
    id:          'element_metal',
    name:        'Metal',
    description: 'Apply Iron (10% chance 5× pts, 5% free consumable). Earth upgrades Iron→Meteorite (20%/10%).',
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
