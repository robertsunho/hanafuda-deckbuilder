export const ZODIAC_CONSUMABLES = [
  { id: 'zodiac_rat',     name: 'Rat',     description: 'Draw 2 extra cards from the deck.',                           category: 'hand',  cost: 3 },
  { id: 'zodiac_ox',      name: 'Ox',      description: 'Clear a stranded stack from one field slot.',                  category: 'field', cost: 2 },
  { id: 'zodiac_tiger',   name: 'Tiger',   description: 'Force a push without meeting a yaku threshold.',              category: 'yaku',  cost: 8 },
  { id: 'zodiac_rabbit',  name: 'Rabbit',  description: 'Remove push penalty for this round.',                         category: 'yaku',  cost: 5 },
  { id: 'zodiac_dragon',  name: 'Dragon',  description: 'Ki lottery: gain 0–30 ki (random).',                          category: 'ki',    cost: 4 },
  { id: 'zodiac_snake',   name: 'Snake',   description: 'Lower one yaku threshold by 1 this round.',                   category: 'yaku',  cost: 4 },
  { id: 'zodiac_horse',   name: 'Horse',   description: 'Discard your hand and draw 8 fresh cards.',                   category: 'hand',  cost: 5 },
  { id: 'zodiac_goat',    name: 'Goat',    description: '+1 ki per capture for the rest of this round.',               category: 'ki',    cost: 4 },
  { id: 'zodiac_monkey',  name: 'Monkey',  description: 'Capture all cards on a field slot; discard equal from hand.', category: 'field', cost: 4 },
  { id: 'zodiac_rooster', name: 'Rooster', description: 'Open a 9th field slot for this round.',                       category: 'field', cost: 3 },
  { id: 'zodiac_dog',     name: 'Dog',     description: 'Retrieve 2 cards from the discard pile.',                     category: 'hand',  cost: 3 },
  { id: 'zodiac_pig',     name: 'Pig',     description: '+10 ki immediately.',                                         category: 'ki',    cost: 3 },
];

export const getZodiacDef = (id) => ZODIAC_CONSUMABLES.find(c => c.id === id) ?? null;
