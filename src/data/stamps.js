// ─────────────────────────────────────────────────────────────────────────────
// stamps.js — 9-stamp system
//
// Three tiers:
//   Primary   (4) — purchasable at any shrine
//   Secondary (3) — Sacred Grove only
//   Tertiary  (2) — craft-only (not in any shop pool)
//
// Triggers: 'captured' | 'discarded' | 'yaku'
// ─────────────────────────────────────────────────────────────────────────────

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
export const TERTIARY_STAMPS    = STAMPS.filter(s => s.tier === 'tertiary');
export const QUATERNARY_STAMPS  = STAMPS.filter(s => s.tier === 'quaternary');

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
