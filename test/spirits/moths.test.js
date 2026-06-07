import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

// Field-full deck: 8 distinct-month field cards (Jan–Aug → 8 slots full), hand[0] = September
// (no field match). Played as a Wood card it bypasses the cap → woodSlotCreated.
const FIELD_FULL_DECK = [
  'september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
];

describe('F4.20 — engine_moths via onWoodSlotCreated spirit hook', () => {
  it('increments t1Procs when a Wood field slot is created (public API)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_moths'], deckCardIds: FIELD_FULL_DECK });
    const spirit = equipSpiritWithState('engine_moths', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    grm.hand.getAll()[0].enhancement = { element: 'wood', tier: 'base' };  // Leaf
    grm.playHandCards([grm.hand.getAll()[0].id]);
    expect(aggregateNumericState(spirit, 't1Procs')).toBe(1);   // wood slot created
    expect(aggregateNumericState(spirit, 't2Procs')).toBe(0);   // Silk path untouched
  });

  it('direct dispatch increments t1Procs by 1 per call', () => {
    const { grm } = makeRound({ spiritIds: ['engine_moths'], deckCardIds: FIELD_FULL_DECK });
    const spirit = equipSpiritWithState('engine_moths', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    grm._fireWoodSlotCreatedHooks();
    grm._fireWoodSlotCreatedHooks();
    expect(aggregateNumericState(spirit, 't1Procs')).toBe(2);
  });

  it('Negative engine_moths accrues t1 newEvents1 (F4.20-FIX: was excluded, now accrues)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: FIELD_FULL_DECK });
    run.addSpiritDirect({
      id: 'engine_moths', name: 'Moths', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key1: 't1Procs', key2: 't2Procs', preTranscendTotal: 1, oldestAtTranscend: 0, newEvents1: 0, newEvents2: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_moths' && s.isNegative);
    grm._fireWoodSlotCreatedHooks();
    grm._fireWoodSlotCreatedHooks();
    expect(neg.state.newEvents1).toBe(2);   // wood-slot t1 now credited to Negatives (flipped from 0)
    expect(neg.state.newEvents2).toBe(0);   // Silk t2 path untouched
  });

  it('Silk anti-strand credit (t2) fires via onSilkAntiStrand, separate from t1', () => {
    const { grm } = makeRound({ spiritIds: ['engine_moths'], deckCardIds: FIELD_FULL_DECK });
    const spirit = equipSpiritWithState('engine_moths', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    grm._fireSilkAntiStrandHooks();
    expect(aggregateNumericState(spirit, 't2Procs')).toBe(1);
    expect(aggregateNumericState(spirit, 't1Procs')).toBe(0);   // t1 unaffected
  });

  it('Negative engine_moths accrues t2 newEvents2 (F4.20-FIX: was excluded, now accrues)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: FIELD_FULL_DECK });
    run.addSpiritDirect({
      id: 'engine_moths', name: 'Moths', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key1: 't1Procs', key2: 't2Procs', preTranscendTotal: 1, oldestAtTranscend: 0, newEvents1: 0, newEvents2: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_moths' && s.isNegative);
    grm._fireSilkAntiStrandHooks();
    expect(neg.state.newEvents2).toBe(1);   // Silk t2 now credited to Negatives (flipped from 0)
    expect(neg.state.newEvents1).toBe(0);   // wood-slot t1 path untouched
  });
});
