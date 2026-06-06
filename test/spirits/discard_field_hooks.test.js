import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';
import { baseCards } from '../../src/data/cards.js';

// 22-card all-plains deck (8 hand, 8 field, 6 draw) — startRound succeeds; the
// tests drive _discardCard directly so the deal contents don't matter.
const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

function freshCard(id) {
  const c = baseCards.find(c => c.id === id);
  return JSON.parse(JSON.stringify(c)); // deep copy; no ribbonStamp → stamp dispatch is a no-op
}

describe('F4.17#1/#2 — onFieldDiscard hook fires via _discardCard (deck overflow)', () => {
  it('econ_recycling adds +5 ki per stack on a field discard', () => {
    const { grm } = makeRound({ spirits: [{ id: 'econ_recycling', stackCount: 2 }], deckCardIds: DECK });
    const kiBefore = run.ki;
    grm._discardCard(freshCard('december_plain_1'), 'deck_overflow');
    expect(run.ki - kiBefore).toBe(10); // 5 * 2 stacks — identical to the prior inline payout
  });

  it('engine_ship increments cardsDiscarded by 1 per field discard', () => {
    const { grm } = makeRound({ spiritIds: ['engine_ship'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_ship', { elements: [{ cardsDiscarded: 0 }] });
    grm._discardCard(freshCard('december_plain_1'), 'deck_overflow');
    expect(aggregateNumericState(spirit, 'cardsDiscarded')).toBe(1);
  });

  it('bookkeeping is unchanged (counts the discard, returns field_discard)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    const before = grm.discardCount;
    const result = grm._discardCard(freshCard('december_plain_1'), 'deck_overflow');
    expect(result).toBe('field_discard');
    expect(grm.discardCount).toBe(before + 1);
    expect(grm.allDiscards.map(c => c.id)).toContain('december_plain_1');
  });

  it('no recycling/ship spirits → no ki change, discard still recorded', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    const kiBefore = run.ki;
    grm._discardCard(freshCard('december_plain_1'), 'deck_overflow');
    expect(run.ki).toBe(kiBefore);
  });

  it('game_catcher intercepts (→ hand, not discarded) when it has room + a catch left', () => {
    const { grm } = makeRound({ spiritIds: ['game_catcher'], deckCardIds: DECK });
    equipSpiritWithState('game_catcher', { state: { catchesUsedThisRound: 0 } });
    grm._hand.clear(); // guarantee hand room for the catch
    const before = grm.discardCount;
    const card = freshCard('december_plain_1');
    const result = grm._discardCard(card, 'deck_overflow');
    expect(result).toBe('catcher');
    expect(grm.discardCount).toBe(before);                       // not counted as a discard
    expect(grm.hand.getAll().map(c => c.id)).toContain('december_plain_1');
    expect(grm.allDiscards.map(c => c.id)).not.toContain('december_plain_1');
  });
});
