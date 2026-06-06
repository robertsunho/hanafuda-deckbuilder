import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

// 8 distinct-month field cards → slots 0–7 each hold 1 card. Monkey on slot 0
// captures january_plain_1 and discards 1 from hand (oldest first = december_plain_1).
// All cases drive the public useConsumable() API.
const DECK = [
  // hand (8): hand[0] = december_plain_1 is the one Monkey discards
  'december_plain_1', 'december_plain_2', 'october_plain_1', 'october_plain_2',
  'september_plain_1', 'september_plain_2', 'january_plain_2', 'february_plain_2',
  // field (8): distinct months Jan–Aug
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
];

const MONKEY = { id: 'zodiac_monkey', name: 'Monkey' };

describe('F4.17#4 — zodiac_monkey routes hand discards through _discardCards (public API)', () => {
  it('[FIX] econ_recycling now fires (+5 ki/stack per discarded card)', () => {
    const { grm } = makeRound({ spirits: [{ id: 'econ_recycling', stackCount: 2 }], deckCardIds: DECK });
    const kiBefore = run.ki;
    const result = grm.useConsumable(MONKEY, { slotIndex: 0 });
    expect(result.success).toBe(true);
    expect(run.ki - kiBefore).toBe(10);                  // 5 * 2 stacks * 1 discarded card
    expect(result.message).toContain('discarded 1 from hand');
  });

  it('[FIX] engine_ship now increments cardsDiscarded', () => {
    const { grm } = makeRound({ spiritIds: ['engine_ship'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_ship', { elements: [{ cardsDiscarded: 0 }] });
    grm.useConsumable(MONKEY, { slotIndex: 0 });
    expect(aggregateNumericState(spirit, 'cardsDiscarded')).toBe(1);
  });

  it('[FIX] bookkeeping now counts the discard (_discardCount / _discardedThisTurn)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    expect(grm.discardCount).toBe(0);
    grm.useConsumable(MONKEY, { slotIndex: 0 });
    expect(grm.discardCount).toBe(1);                     // was 0 before F4.17#4
    expect(grm.allDiscards.map(c => c.id)).toContain('december_plain_1');
  });

  it('[FIX] game_catcher rescues the discarded hand card instead of losing it', () => {
    const { grm } = makeRound({ spiritIds: ['game_catcher'], deckCardIds: DECK });
    equipSpiritWithState('game_catcher', { state: { catchesUsedThisRound: 0 } });
    const result = grm.useConsumable(MONKEY, { slotIndex: 0 });

    expect(grm.discardCount).toBe(0);                                       // nothing actually discarded
    expect(result.discardedCards).toHaveLength(0);
    expect(result.message).toContain('discarded 0 from hand');
    expect(grm.hand.getAll().map(c => c.id)).toContain('december_plain_1'); // rescued back
    expect(grm.allDiscards.map(c => c.id)).not.toContain('december_plain_1');
    const catcher = run.allSpirits.find(s => s.id === 'game_catcher');
    expect(catcher.state.catchesUsedThisRound).toBe(1);
  });

  it('still captures the field slot (capture unaffected by the discard migration)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    const result = grm.useConsumable(MONKEY, { slotIndex: 0 });
    expect(result.capturedCards.map(c => c.id)).toContain('january_plain_1');
    expect(grm.capture.getAll().map(c => c.id)).toContain('january_plain_1');
  });
});
