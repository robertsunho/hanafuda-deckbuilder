// ─────────────────────────────────────────────────────────────────────────────
// consumables.js — Deck modification tools + Wu Xing elements
//
// Chakra Tools: shop-only instant-apply deck tools.
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
    description: 'Apply a random edition to 1 card (60% Gold +20pts / 30% Crystal +5 additive mult / 10% Ghost \xD71.5 mult).',
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
    description: 'Copy all attributes (rank, month, axes, enhancement, stamp, edition) of one card onto another. The target becomes an exact duplicate of the source.',
    cost:        4,
    maxTargets:  2,
    category:    'chakra',
  },
];

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
    description: 'Apply Snow (\u00D72 capture mult, depreciates per use). Metal upgrades Snow\u2192Ice (\u00D74). Earth destroys.',
    cost:        5,
    category:    'wuxing',
    element:     'water',
  },
  {
    id:          'element_wood',
    name:        'Wood',
    description: 'Apply Leaf (bypasses field slot limit). Water upgrades Leaf\u2192Silk (immune to stranding). Metal destroys.',
    cost:        5,
    category:    'wuxing',
    element:     'wood',
  },
  {
    id:          'element_fire',
    name:        'Fire',
    description: 'Apply Ember (wildcard 30 pts, all yaku, 20% break). Wood upgrades Ember\u2192Charcoal (100 pts, 10% break). Water destroys.',
    cost:        5,
    category:    'wuxing',
    element:     'fire',
  },
  {
    id:          'element_earth',
    name:        'Earth',
    description: 'Apply Clay (10% ki/round interest when held in hand). Fire upgrades Clay\u2192Pottery (20% ki/round). Wood destroys.',
    cost:        5,
    category:    'wuxing',
    element:     'earth',
  },
  {
    id:          'element_metal',
    name:        'Metal',
    description: 'Apply Iron (\xD71.5 mult when held in hand during scoring, 5% jackpot +30 ki). Earth upgrades Iron\u2192Meteorite (\xD73.0 mult). Fire destroys.',
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

// ── Alchemical Consumables ──────────────────────────────────────────────────

export const ALCHEMICAL_CONSUMABLES = [
  { id: 'alch_cinnabar', name: 'Cinnabar', description: 'Fuse 2 selected spirits into a Tier 2 or Tier 3 fusion.', cost: 30, category: 'alchemical' },
  { id: 'alch_mercury',  name: 'Mercury',  description: 'De-fuse a Tier 2/3 fusion into its 2 ingredients. Requires 2 open spirit slots.', cost: 20, category: 'alchemical' },
  { id: 'alch_jade',     name: 'Jade',     description: 'Add 1 stack to a selected spirit (max 3).', cost: 15, category: 'alchemical' },
  { id: 'alch_sulfur',   name: 'Sulfur',   description: 'Duplicate a random occupied slot, then clear another random occupied slot.', cost: 25, category: 'alchemical' },
  { id: 'alch_amber',    name: 'Amber',    description: 'Transcend any spirit (creates a Negative copy preserving stack power). Cost: -1 permanent field slot.', cost: 35, category: 'alchemical' },
  { id: 'alch_lead',     name: 'Lead',     description: 'Summon a random Rare spirit. Cost: half your current ki.', cost: 20, category: 'alchemical' },
  { id: 'alch_pearl',    name: 'Pearl',    description: 'Fuse 2 Tier 3 cross-fusions into a Tier 4 Capstone (Legendary slot). Components preserved.', cost: 50, category: 'alchemical' },
];

export const getAlchemicalDef = (id) => ALCHEMICAL_CONSUMABLES.find(c => c.id === id);
