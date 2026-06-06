import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

const ALL_PLAINS_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

describe('F4.20 — sym_ants via onCardPlayed spirit hook', () => {
  it('increments totalPlayed by 1 on a single-card play (public API)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_ants'], deckCardIds: ALL_PLAINS_DECK });
    const spirit = equipSpiritWithState('sym_ants', { elements: [{ totalPlayed: 0 }] });
    grm.playHandCards([grm.hand.getAll()[0].id]);
    expect(aggregateNumericState(spirit, 'totalPlayed')).toBe(1);
  });

  it('counts cards.length per play (direct dispatch, multi-card)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_ants'], deckCardIds: ALL_PLAINS_DECK });
    const spirit = equipSpiritWithState('sym_ants', { elements: [{ totalPlayed: 0 }] });
    grm._fireCardPlayedHooks([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(aggregateNumericState(spirit, 'totalPlayed')).toBe(3);
  });

  it('accumulates across plays', () => {
    const { grm } = makeRound({ spiritIds: ['sym_ants'], deckCardIds: ALL_PLAINS_DECK });
    const spirit = equipSpiritWithState('sym_ants', { elements: [{ totalPlayed: 0 }] });
    grm._fireCardPlayedHooks([{ id: 'a' }, { id: 'b' }]);
    grm._fireCardPlayedHooks([{ id: 'c' }]);
    expect(aggregateNumericState(spirit, 'totalPlayed')).toBe(3);
  });

  it('Negative sym_ants routes to newEvents (not excluded — matches the prior allSpirits path)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: ALL_PLAINS_DECK });
    run.addSpiritDirect({
      id: 'sym_ants', name: 'Ants', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key: 'totalPlayed', preTranscendTotal: 1, oldestAtTranscend: 0, newEvents: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'sym_ants' && s.isNegative);
    grm._fireCardPlayedHooks([{ id: 'a' }, { id: 'b' }]);
    expect(neg.state.newEvents).toBe(2);
  });
});
