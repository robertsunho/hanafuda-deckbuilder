/**
 * Ribbon stamp definitions.
 * Each stamp has a unique effect triggered when the stamped card is captured.
 */
export const RIBBON_STAMPS = {
  red: {
    id: 'red',
    name: 'Red Ribbon',
    description: 'Draw +1 card when this card is captured.',
    color: '#cc3333',
    hexColor: 0xcc3333,
    cost: 4,
  },
  blue: {
    id: 'blue',
    name: 'Blue Ribbon',
    description: 'Trigger an extra deck flip when this card is captured.',
    color: '#3366cc',
    hexColor: 0x3366cc,
    cost: 4,
  },
  green: {
    id: 'green',
    name: 'Green Ribbon',
    description: 'This card counts as 2 captures for spirit scaling purposes.',
    color: '#33aa55',
    hexColor: 0x33aa55,
    cost: 5,
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow Ribbon',
    description: 'Retrigger — this card scores twice when captured.',
    color: '#ccaa33',
    hexColor: 0xccaa33,
    cost: 8,
  },
};

export const getRibbonStampDef = (id) => RIBBON_STAMPS[id] ?? null;
