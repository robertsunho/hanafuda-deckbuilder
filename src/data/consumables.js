// ─────────────────────────────────────────────────────────────────────────────
// consumables.js — Three Marks of Existence consumable items
//
// Each mark is a deck-modification consumable usable at the shrine (preview)
// or during a round (interactive card targeting via GameScene mark mode).
// ─────────────────────────────────────────────────────────────────────────────

export const THREE_MARKS = [
  {
    id:          'mark_impermanence',
    name:        'Impermanence',
    description: 'Promote one card to the next card type in its month. If the next type is missing, stores progress for the following use.',
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
    description: 'Copy all properties from a target card onto a source card. The source card becomes the target.',
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
