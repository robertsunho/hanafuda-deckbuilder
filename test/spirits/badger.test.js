import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// zodiac_rat: no params, draws up to 2 cards → returns { success: true } → badger counts it.
const RAT = { id: 'zodiac_rat', name: 'Rat' };

describe('F4.20-FIX — sym_badger (useConsumable, GRM:793) accrues for negatives', () => {
  it('regular copy: +1 consumablesUsed per in-round consumable use', () => {
    const { grm } = makeRound({ spiritIds: ['sym_badger'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('sym_badger', { elements: [{ consumablesUsed: 0 }] });
    grm.useConsumable(RAT);
    expect(aggregateNumericState(spirit, 'consumablesUsed')).toBe(1);
  });

  it('NEGATIVE copy: newEvents advances per in-round consumable use (was frozen pre-fix)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'sym_badger', name: 'Badger', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key: 'consumablesUsed', preTranscendTotal: 0, oldestAtTranscend: 0, newEvents: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'sym_badger' && s.isNegative);
    grm.useConsumable(RAT);
    grm.useConsumable(RAT);
    expect(neg.state.newEvents).toBe(2);
  });

  // Guard against regressing the OTHER (already-correct) badger site: _notifyBadger
  // (RunManager) was verified to iterate allSpirits and must KEEP crediting negatives.
  it('NEGATIVE copy: _notifyBadger path still accrues (verified-correct, must not regress)', () => {
    makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'sym_badger', name: 'Badger', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key: 'consumablesUsed', preTranscendTotal: 0, oldestAtTranscend: 0, newEvents: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'sym_badger' && s.isNegative);
    run._notifyBadger();
    expect(neg.state.newEvents).toBe(1);
  });
});
