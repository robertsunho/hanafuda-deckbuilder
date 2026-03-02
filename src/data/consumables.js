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
