import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from './helpers.js';
import run from '../src/systems/RunManager.js';
import { baseCards } from '../src/data/cards.js';

// Campaign 2 — card-reactive region-K effects (onCardsCaptured / caterpillar / symbiosis / goat).
// The "capture [PRESERVE] anchor" block pins them THROUGH the _addCapture post-score path being
// extracted into _applyCaptureCardEffects (the persistent side-effects — deleteCard, roster add —
// are unguarded at the integration point today). The "field [FIX]" block proves they now also fire
// on field cards under hex_01 (score_field_at_round_end). Kept low-stack so no transcend cascade /
// metamorphose RNG fires — deterministic.

const DECK = [
  'july_boar', 'january_plain_1', 'february_plain_1', 'march_plain_1',
  'april_plain_1', 'may_plain_1', 'june_plain_1', 'july_plain_1',
  'august_plain_1', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Field positions (deckCardIds[8..15]) put july_boar (animal) on the field for the [FIX] block.
const FIELD_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'july_boar', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const fresh = (id) => JSON.parse(JSON.stringify(baseCards.find(c => c.id === id)));
const leaf = (id) => { const c = fresh(id); c.enhancement = { element: 'wood', tier: 'base' }; return c; };

describe('Capture card-reactive effects [PRESERVE anchor] — via _addCapture', () => {
  it('sym_caterpillar eats a wood-enhanced captured card (leafsEaten++ + deleteCard)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_caterpillar'], deckCardIds: DECK });
    const cat = equipSpiritWithState('sym_caterpillar', { state: { leafsEaten: 0 } });

    grm._addCapture([leaf('january_plain_1')]);

    expect(cat.state.leafsEaten).toBe(1);
    expect(run.getDeck().some(c => c.id === 'january_plain_1')).toBe(false); // persistent deck deletion
  });

  it('util_symbiosis summons a symbiont from a captured animal (roster add)', () => {
    const { grm } = makeRound({ spiritIds: ['util_symbiosis'], deckCardIds: DECK });

    grm._addCapture([fresh('july_boar')]); // july_boar → sym_crow

    expect(run.allSpirits.some(s => s.id === 'sym_crow')).toBe(true);
  });

  it('onCardsCaptured feeds engine_wildlife uniqueness from a captured animal', () => {
    const { grm } = makeRound({ spiritIds: ['engine_wildlife'], deckCardIds: DECK });
    const wild = equipSpiritWithState('engine_wildlife', { elements: [{ seenAnimals: [] }] });

    grm._addCapture([fresh('july_boar')]);

    expect(wild.elements[0].seenAnimals).toContain('july_boar');
  });
});

describe('Field card-reactive effects [FIX] — via _scoreFieldCards under hex_01', () => {
  it('sym_caterpillar eats a wood-enhanced FIELD card (PERSISTENT deck deletion)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_caterpillar'], deckCardIds: FIELD_DECK });
    const cat = equipSpiritWithState('sym_caterpillar', { state: { leafsEaten: 0 } });
    run.setHexagram('hex_01'); // score_field_at_round_end
    const target = grm.field.getAll().find(c => c.type === 'plain');
    target.enhancement = { element: 'wood', tier: 'base' };
    const targetId = target.id;

    grm._scoreFieldCards();

    expect(cat.state.leafsEaten).toBe(1);
    expect(run.getDeck().some(c => c.id === targetId)).toBe(false); // field card removed from deck
  });

  it('util_symbiosis summons from a FIELD animal (PERSISTENT roster add)', () => {
    const { grm } = makeRound({ spiritIds: ['util_symbiosis'], deckCardIds: FIELD_DECK });
    run.setHexagram('hex_01');

    grm._scoreFieldCards(); // july_boar is on the field → sym_crow

    expect(run.allSpirits.some(s => s.id === 'sym_crow')).toBe(true);
  });

  it('onCardsCaptured feeds engine_wildlife uniqueness from a FIELD animal', () => {
    const { grm } = makeRound({ spiritIds: ['engine_wildlife'], deckCardIds: FIELD_DECK });
    const wild = equipSpiritWithState('engine_wildlife', { elements: [{ seenAnimals: [] }] });
    run.setHexagram('hex_01');

    grm._scoreFieldCards();

    expect(wild.elements[0].seenAnimals).toContain('july_boar');
  });
});
