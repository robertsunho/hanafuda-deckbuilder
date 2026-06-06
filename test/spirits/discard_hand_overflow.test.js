import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

// Field-full deck: 8 distinct-month field cards (Jan–Aug → 8 occupied slots = full),
// hand[0] = September which matches no field slot, so playing it overflows → discard.
// All three cases drive the PUBLIC playHandCards() API to exercise the real overflow
// branch (not a focused _discardCard call).
const FIELD_FULL_DECK = [
  // hand (8): september first (the overflow card), rest are unplayed filler
  'september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
  // field (8): distinct months Jan–Aug → 8 full slots, none is September
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
];

describe('F4.17#3 — hand-play overflow routes through _discardCards (public API)', () => {
  it('econ_recycling fires on hand-overflow (+5 ki/stack; card actually discarded)', () => {
    const { grm } = makeRound({
      spirits: [{ id: 'econ_recycling', stackCount: 2 }],
      deckCardIds: FIELD_FULL_DECK,
    });
    const kiBefore = run.ki;
    const result = grm.playHandCards(['september_plain_1']);
    expect(run.ki - kiBefore).toBe(10);                                   // 5 * 2 stacks
    expect(result.discarded.map(c => c.id)).toContain('september_plain_1'); // really lost
    expect(grm.discardCount).toBe(1);
  });

  it('engine_ship increments cardsDiscarded on hand-overflow', () => {
    const { grm } = makeRound({ spiritIds: ['engine_ship'], deckCardIds: FIELD_FULL_DECK });
    const spirit = equipSpiritWithState('engine_ship', { elements: [{ cardsDiscarded: 0 }] });
    grm.playHandCards(['september_plain_1']);
    expect(aggregateNumericState(spirit, 'cardsDiscarded')).toBe(1);
  });

  // THE RESCUE — proves the [FIX]: hand-overflow now gains catcher interception.
  it('game_catcher rescues the overflowed card to hand instead of discarding it', () => {
    const { grm } = makeRound({ spiritIds: ['game_catcher'], deckCardIds: FIELD_FULL_DECK });
    equipSpiritWithState('game_catcher', { state: { catchesUsedThisRound: 0 } });
    const result = grm.playHandCards(['september_plain_1']);

    expect(grm.discardCount).toBe(0);                                       // not discarded
    expect(result.discarded).toHaveLength(0);                              // not reported as discard
    expect(grm.hand.getAll().map(c => c.id)).toContain('september_plain_1'); // rescued to hand
    expect(grm.allDiscards.map(c => c.id)).not.toContain('september_plain_1');
    // catch budget consumed
    const catcher = run.allSpirits.find(s => s.id === 'game_catcher');
    expect(catcher.state.catchesUsedThisRound).toBe(1);
  });
});
