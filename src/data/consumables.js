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

// ── Zodiac Consumables ──────────────────────────────────────────────────────
// 13 tactical in-round items (merged from zodiacConsumables.js, consumable-block
// data consolidation). `category` here is a functional tag, not 'zodiac'.

export const ZODIAC_CONSUMABLES = [
  { id: 'zodiac_rat',     name: 'Rat',     description: 'Draw 2 extra cards from the deck.',                           category: 'hand',  cost: 3 },
  { id: 'zodiac_ox',      name: 'Ox',      description: 'Clear a stranded stack from one field slot.',                  category: 'field', cost: 2 },
  { id: 'zodiac_tiger',   name: 'Tiger',   description: 'Force a push without meeting a yaku threshold.',              category: 'yaku',  cost: 8 },
  { id: 'zodiac_rabbit',  name: 'Rabbit',  description: 'Waive the push penalty for this round.',                       category: 'yaku',  cost: 5 },
  { id: 'zodiac_dragon',  name: 'Dragon',  description: 'Ki lottery: gain 0–30 ki (random).',                          category: 'ki',    cost: 4 },
  { id: 'zodiac_snake',   name: 'Snake',   description: 'Lower one yaku threshold by 1 this round.',                   category: 'yaku',  cost: 4 },
  { id: 'zodiac_horse',   name: 'Horse',   description: 'Discard your hand and draw an equal number of fresh cards.',  category: 'hand',  cost: 5 },
  { id: 'zodiac_goat',    name: 'Goat',    description: '+1 ki per capture for the rest of this round.',               category: 'ki',    cost: 4 },
  { id: 'zodiac_monkey',  name: 'Monkey',  description: 'Capture all cards on a field slot; discard equal from hand.', category: 'field', cost: 4 },
  { id: 'zodiac_rooster', name: 'Rooster', description: 'Open a 9th field slot for this round.',                       category: 'field', cost: 3 },
  { id: 'zodiac_dog',     name: 'Dog',     description: 'Retrieve 2 cards from the discard pile.',                     category: 'hand',  cost: 3 },
  { id: 'zodiac_pig',     name: 'Pig',     description: '+10 ki immediately.',                                         category: 'ki',    cost: 3 },
  { id: 'zodiac_cat',    name: 'Cat',     description: 'Summon a random Tier 1 Foundation spirit to an open slot.',     category: 'spirit', cost: 3 },
];

export const getZodiacDef = (id) => ZODIAC_CONSUMABLES.find(c => c.id === id) ?? null;

// ── Stamps — 9-stamp system ─────────────────────────────────────────────────
// Merged from stamps.js (consumable-block data consolidation). Three tiers:
//   Primary (4) — any shrine · Secondary (3) — Sacred Grove · Tertiary/Quaternary — craft-only.
// Triggers: 'captured' | 'discarded' | 'yaku'.

export const STAMPS = [
  // ── Primary ───────────────────────────────────────────────────────────────
  {
    id:          'stamp_red',
    name:        'Red Stamp',
    tier:        'primary',
    description: 'When this card contributes to a new yaku, draw +1 card.',
    trigger:     'yaku',
    color:       '#cc3333',
    hexColor:    0xcc3333,
    cost:        4,
  },
  {
    id:          'stamp_blue',
    name:        'Blue Stamp',
    tier:        'primary',
    description: 'When this card is discarded to a full field, gain a free consumable.',
    trigger:     'discarded',
    color:       '#3366cc',
    hexColor:    0x3366cc,
    cost:        4,
  },
  {
    id:          'stamp_yellow',
    name:        'Yellow Stamp',
    tier:        'primary',
    description: 'When captured, gain +3 ki.',
    trigger:     'captured',
    color:       '#ccaa33',
    hexColor:    0xccaa33,
    cost:        4,
  },
  {
    id:          'stamp_white',
    name:        'White Stamp',
    tier:        'primary',
    description: 'When captured, retrigger — this card scores twice.',
    trigger:     'captured',
    color:       '#cccccc',
    hexColor:    0xcccccc,
    cost:        6,
  },

  // ── Secondary (Sacred Grove only) ─────────────────────────────────────────
  {
    id:          'stamp_orange',
    name:        'Orange Stamp',
    tier:        'secondary',
    description: 'Captured: draw +1 card. Yaku contribution: +3 ki.',
    trigger:     'captured',
    color:       '#cc7733',
    hexColor:    0xcc7733,
    cost:        6,
  },
  {
    id:          'stamp_green',
    name:        'Green Stamp',
    tier:        'secondary',
    description: 'Captured: gain a free consumable. Discarded to full field: +3 ki.',
    trigger:     'captured',
    color:       '#33aa55',
    hexColor:    0x33aa55,
    cost:        5,
  },
  {
    id:          'stamp_purple',
    name:        'Purple Stamp',
    tier:        'secondary',
    description: 'Discarded to full field: draw +1 card. Yaku contribution: gain a free consumable.',
    trigger:     'yaku',
    color:       '#aa44cc',
    hexColor:    0xaa44cc,
    cost:        6,
  },

  // ── Tertiary (craft-only) ─────────────────────────────────────────────────
  {
    id:          'stamp_black',
    name:        'Black Stamp',
    tier:        'tertiary',
    description: 'Captured: gain a free consumable. Discarded to full field: draw +1 card. Yaku contribution: +3 ki.',
    trigger:     'captured',
    color:       '#222222',
    hexColor:    0x222222,
    cost:        9,
  },
  {
    id:          'stamp_gray',
    name:        'Gray Stamp',
    tier:        'quaternary',
    description: 'Captured: free consumable. Discarded: draw +1. Yaku: +3 ki. All effects retrigger 3 additional times.',
    trigger:     'captured',
    color:       '#aabbcc',
    hexColor:    0xaabbcc,
    cost:        12,
  },
];

export const PRIMARY_STAMPS   = STAMPS.filter(s => s.tier === 'primary');
export const SECONDARY_STAMPS = STAMPS.filter(s => s.tier === 'secondary');

/**
 * Look up a stamp definition by its id.
 * @param {string} id  e.g. 'stamp_red'
 * @returns {object|null}
 */
export const getStampDef = (id) => STAMPS.find(s => s.id === id) ?? null;

// ── Stamp mixing matrix ─────────────────────────────────────────────────────
// Keys are sorted-alphabetically pairs of stamp IDs joined by '|'.
// Any combination not listed here falls through to overwrite behavior.
const STAMP_MIX = {
  'stamp_red|stamp_yellow':    'stamp_orange',
  'stamp_blue|stamp_yellow':   'stamp_green',
  'stamp_blue|stamp_red':      'stamp_purple',
  'stamp_green|stamp_red':     'stamp_black',
  'stamp_purple|stamp_yellow': 'stamp_black',
  'stamp_blue|stamp_orange':   'stamp_black',
  'stamp_black|stamp_white':   'stamp_gray',
};

/**
 * Determine the result of applying a stamp to a card that may already have one.
 * @param {string|null|undefined} existingStampId
 * @param {string} appliedStampId
 * @returns {string} The resulting stamp ID.
 */
export const mixStamps = (existingStampId, appliedStampId) => {
  if (!existingStampId) return appliedStampId;
  const [a, b] = [existingStampId, appliedStampId].sort();
  return STAMP_MIX[`${a}|${b}`] ?? appliedStampId;
};
