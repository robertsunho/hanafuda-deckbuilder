import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState, playRoundToEnd } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

// F4.20 counter wave — sym_snails migrated from the inline GRM._trackSnailsUnplayed to the
// onRoundEndUnplayed hook, fired by _fireRoundEndUnplayedHooks at the SAME teardown position
// (before _scoreFieldCards). [PRESERVE] — counter values + timing byte-identical.

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

describe('F4.20 counter wave — sym_snails onRoundEndUnplayed', () => {
  it('regular copy: totalUnplayed += handCount', () => {
    const { grm } = makeRound({ spiritIds: ['sym_snails'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('sym_snails', { elements: [{ totalUnplayed: 0 }] });
    grm._fireRoundEndUnplayedHooks(3);
    expect(aggregateNumericState(spirit, 'totalUnplayed')).toBe(3);
  });

  it('handCount 0 is a no-op (matches the old early-return)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_snails'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('sym_snails', { elements: [{ totalUnplayed: 2 }] });
    grm._fireRoundEndUnplayedHooks(0);
    expect(aggregateNumericState(spirit, 'totalUnplayed')).toBe(2);
  });

  it('NEGATIVE copy: newEvents advances by handCount (accrues post-transcendence)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'sym_snails', name: 'Snails', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key: 'totalUnplayed', preTranscendTotal: 0, oldestAtTranscend: 0, newEvents: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'sym_snails' && s.isNegative);
    grm._fireRoundEndUnplayedHooks(3);
    expect(neg.state.newEvents).toBe(3);
  });

  // PRESERVE timing: the unplayed tally must fire BEFORE _scoreFieldCards (the only round-end
  // reader of snails' count, under the scoreFieldAtRoundEnd hexagram). Proving the call order
  // is the timing guarantee — riding the generic onRoundEnd (fires after _scoreFieldCards) would
  // have broken this.
  it('PRESERVE timing: tally fires before _scoreFieldCards in the teardown', () => {
    const { grm } = makeRound({ spiritIds: ['sym_snails'], deckCardIds: DECK });
    const order = [];
    const origTally = grm._fireRoundEndUnplayedHooks.bind(grm);
    const origScore = grm._scoreFieldCards.bind(grm);
    grm._fireRoundEndUnplayedHooks = (n) => { order.push('tally'); return origTally(n); };
    grm._scoreFieldCards = () => { order.push('score'); return origScore(); };

    playRoundToEnd(grm);

    expect(order).toEqual(['tally', 'score']);
  });
});
