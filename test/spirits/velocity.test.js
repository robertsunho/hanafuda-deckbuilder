import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import run, { incrementPerElement } from '../../src/systems/RunManager.js';
import SpiritEffects from '../../src/systems/SpiritEffects.js';

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// engine_velocity is the EXPONENTIAL (Cat-1') accumulator: incrementPerElement routes a
// negative's 't2Procs' to newT2Procs via the t2ProcsAtTranscend marker (NOT newEvents).
//
// The GRM increment site (GRM:1339) lives inside the Meteorite-jackpot branch of _addCapture,
// reachable only by building a metal-held + RNG-jackpot scenario — out of scope per F4.20-FIX
// (no full integration scenarios). So this proves accrual at the increment-routing level: that
// firing 't2Procs' on a negative advances newT2Procs (the GRM loop now reaches negatives, same
// shape as the loop-tested sites). The EXACT exponential output value — in particular whether
// powerLevel should scale inside the 1.5^x exponent — is FLAGGED for design confirm and is NOT
// asserted here; we assert only that accrual moves the score monotonically off a frozen baseline.
describe('F4.20-FIX — engine_velocity (exponential) accrues for negatives', () => {
  it('NEGATIVE copy: firing t2Procs advances newT2Procs (was frozen pre-fix)', () => {
    makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_velocity', name: 'Velocity', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { t2ProcsAtTranscend: 0, oldestT2ProcsAtTranscend: 0, newT2Procs: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_velocity' && s.isNegative);
    incrementPerElement(neg, 't2Procs', 1);
    incrementPerElement(neg, 't2Procs', 1);
    expect(neg.state.newT2Procs).toBe(2);
  });

  it('NEGATIVE copy: accrual moves applyEngine output off the frozen baseline (no exact exponential asserted)', () => {
    makeRound({ spiritIds: [], deckCardIds: DECK }); // plains deck → ironCount 0 → t1Mult 0
    run.addSpiritDirect({
      id: 'engine_velocity', name: 'Velocity', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { t2ProcsAtTranscend: 0, oldestT2ProcsAtTranscend: 0, newT2Procs: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_velocity' && s.isNegative);
    const eff = SpiritEffects.get('engine_velocity');

    expect(eff.applyEngine({ spirit: neg })).toBeNull(); // frozen: no contribution

    incrementPerElement(neg, 't2Procs', 1);
    incrementPerElement(neg, 't2Procs', 1);
    const out = eff.applyEngine({ spirit: neg });
    expect(out).not.toBeNull();
    expect(out.multiplyMult).toBeGreaterThan(1); // score now moves; exact value flagged for design confirm
  });
});
