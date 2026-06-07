import { describe, it, expect, vi } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

// 22-card all-plains deck so startRound succeeds; tests drive the post-round
// enhancement pass directly (increment-level / dispatcher-level — no full round).
const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const water = (tier) => ({ id: `w_${tier}`, enhancement: { element: 'water', tier } });
const fire  = (tier) => ({ id: `f_${tier}`, enhancement: { element: 'fire',  tier } });

const DUAL_NEG_STATE = {
  key1: 't1Procs', key2: 't2Procs',
  preTranscendTotal: 1, oldestAtTranscend: 0, newEvents1: 0, newEvents2: 0,
};

describe('F4.20-FIX — engine_glacier (Water dep) accrues for negatives via _applyPostRoundEnhancements', () => {
  it('regular copy: base→t1Procs, upgraded→t2Procs', () => {
    const { grm } = makeRound({ spiritIds: ['engine_glacier'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_glacier', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    grm._applyPostRoundEnhancements([water('base'), water('upgraded')]);
    expect(aggregateNumericState(spirit, 't1Procs')).toBe(1);
    expect(aggregateNumericState(spirit, 't2Procs')).toBe(1);
  });

  it('NEGATIVE copy: base→newEvents1, upgraded→newEvents2 (was frozen pre-fix)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_glacier', name: 'Glacier', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { ...DUAL_NEG_STATE },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_glacier' && s.isNegative);
    grm._applyPostRoundEnhancements([water('base'), water('base'), water('upgraded')]);
    expect(neg.state.newEvents1).toBe(2);
    expect(neg.state.newEvents2).toBe(1);
  });
});

describe('F4.20-FIX — engine_carbon (Fire break) accrues for negatives via _applyPostRoundEnhancements', () => {
  it('regular copy: base→t1Procs, upgraded→t2Procs (Math.random forced → break fires)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_carbon'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_carbon', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0); // force fire_break true
    grm._applyPostRoundEnhancements([fire('base'), fire('upgraded')]);
    spy.mockRestore();
    expect(aggregateNumericState(spirit, 't1Procs')).toBe(1);
    expect(aggregateNumericState(spirit, 't2Procs')).toBe(1);
  });

  it('NEGATIVE copy: base→newEvents1, upgraded→newEvents2 (was frozen pre-fix)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_carbon', name: 'Carbon', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { ...DUAL_NEG_STATE },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_carbon' && s.isNegative);
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0); // force fire_break true
    grm._applyPostRoundEnhancements([fire('base'), fire('upgraded')]);
    spy.mockRestore();
    expect(neg.state.newEvents1).toBe(1);
    expect(neg.state.newEvents2).toBe(1);
  });
});

// fossil lives in a DIFFERENT method (_computeEarthKiBonus, Earth-interest pass) — NOT
// _applyPostRoundEnhancements. Drive it directly with earth cards seeded into the hand.
describe('F4.20-FIX — engine_fossil (Earth interest) accrues for negatives via _computeEarthKiBonus', () => {
  it('regular copy: base→t1Procs, upgraded→t2Procs', () => {
    const { grm } = makeRound({ spiritIds: ['engine_fossil'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_fossil', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    const hand = grm.hand.getAll();
    hand[0].enhancement = { element: 'earth', tier: 'base' };
    hand[1].enhancement = { element: 'earth', tier: 'upgraded' };
    grm._computeEarthKiBonus();
    expect(aggregateNumericState(spirit, 't1Procs')).toBe(1);
    expect(aggregateNumericState(spirit, 't2Procs')).toBe(1);
  });

  it('NEGATIVE copy: base→newEvents1, upgraded→newEvents2 (was frozen pre-fix)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_fossil', name: 'Fossil', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { ...DUAL_NEG_STATE },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_fossil' && s.isNegative);
    const hand = grm.hand.getAll();
    hand[0].enhancement = { element: 'earth', tier: 'base' };
    hand[1].enhancement = { element: 'earth', tier: 'base' };
    hand[2].enhancement = { element: 'earth', tier: 'upgraded' };
    grm._computeEarthKiBonus();
    expect(neg.state.newEvents1).toBe(2);
    expect(neg.state.newEvents2).toBe(1);
  });
});
