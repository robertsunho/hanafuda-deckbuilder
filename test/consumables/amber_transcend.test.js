import { describe, it, expect } from 'vitest';
import run from '../../src/systems/RunManager.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';

// Amber correctness [FIX] — Amber now builds its negative through the canonical shared
// path (RunManager._buildTranscendedNegative), the same one natural cascade transcendence
// uses. Before the fix Amber read `target.state ?? null` (dropping accumulator .elements →
// null-state inert negative) and omitted acquiredRound/symbiont. It is also intentionally
// usable at ANY stack count (no >=3 gate). These tests prove each piece — the powerLevel
// 1-2 range was never exercised before (natural transcend was >=3).
//
// Reference: sym_algae uses snapshotCat1Linear('summonCount', 0.1, 'multiplyMult'), so a
// transcended negative's state.preTranscendTotal = 1 (mult-mult base) + aggregate × 0.1,
// where aggregate = Σ summonCount over elements.slice(0, powerLevel).

const amber = () => ConsumableEffects.get('alch_amber').execute({ roundManager: null, params: { spiritIndex: 0 } });

describe('Amber preserves accumulator state (the real bug — was null)', () => {
  it('a 3-stack accumulator Amber’d carries aggregated .elements state, not null', () => {
    run.reset();
    run._round = 5;
    run._acquireSpiritStack({ id: 'sym_algae', name: 'Algae' }, 3, { skipSlotCheck: true });
    const algae = run.allSpirits.find(s => s.id === 'sym_algae' && !s.isNegative);
    // Seed accumulated progress across the 3 elements (staggered, like real play).
    algae.elements[0].summonCount = 11;
    algae.elements[1].summonCount = 6;
    algae.elements[2].summonCount = 1;

    const res = amber();
    expect(res.success).toBe(true);

    const neg = run.allSpirits.find(s => s.id === 'sym_algae');
    expect(neg.isNegative).toBe(true);
    expect(neg.powerLevel).toBe(3);                      // powerLevel = stackCount
    expect(neg.state).not.toBeNull();                    // the [FIX] — was null before
    expect(neg.state.preTranscendTotal).toBeCloseTo(2.8); // 1 + (11+6+1)*0.1
    expect(neg.state.oldestAtTranscend).toBe(11);
    expect(neg.state.newEvents).toBe(0);
  });
});

describe('Amber low-power aggregation (powerLevel 1 and 2 — the previously-untested range)', () => {
  it('powerLevel 1: aggregates slice(0,1)', () => {
    run.reset();
    run._round = 2;
    run._acquireSpiritStack({ id: 'sym_algae', name: 'Algae' }, 1, { skipSlotCheck: true });
    const a = run.allSpirits.find(s => s.id === 'sym_algae' && !s.isNegative);
    a.elements[0].summonCount = 7;

    amber();
    const neg = run.allSpirits.find(s => s.id === 'sym_algae');
    expect(neg.powerLevel).toBe(1);
    expect(neg.state.preTranscendTotal).toBeCloseTo(1.7); // 1 + 7*0.1
  });

  it('powerLevel 2: aggregates slice(0,2)', () => {
    run.reset();
    run._round = 2;
    run._acquireSpiritStack({ id: 'sym_algae', name: 'Algae' }, 2, { skipSlotCheck: true });
    const a = run.allSpirits.find(s => s.id === 'sym_algae' && !s.isNegative);
    a.elements[0].summonCount = 4;
    a.elements[1].summonCount = 3;

    amber();
    const neg = run.allSpirits.find(s => s.id === 'sym_algae');
    expect(neg.powerLevel).toBe(2);
    expect(neg.state.preTranscendTotal).toBeCloseTo(1.7); // 1 + (4+3)*0.1
  });
});

describe('Amber restores the previously-dropped fields', () => {
  it('carries acquiredRound and symbiont (were omitted before the fix)', () => {
    run.reset();
    run._round = 4;
    run._acquireSpiritStack({ id: 'sym_algae', name: 'Algae' }, 1, { skipSlotCheck: true });
    const a = run.allSpirits.find(s => s.id === 'sym_algae' && !s.isNegative);
    a.symbiont = true; // a real symbiont carries this; it must survive transcendence

    amber();
    const neg = run.allSpirits.find(s => s.id === 'sym_algae');
    expect(neg.acquiredRound).toBe(4); // was undefined before (Cat-5 maturation would mis-seed)
    expect(neg.symbiont).toBe(true);   // was dropped before (symbiosis machinery reads it)
    expect(neg.sellPriceBonus).toBe(0);
  });
});

describe('Amber transcends at ANY stack count (Thread 1 — no >=3 gate)', () => {
  it('a stack-1 spirit Amber’d succeeds at powerLevel 1', () => {
    run.reset();
    run._acquireSpiritStack({ id: 'sym_wolf', name: 'sym_wolf' }, 1, { skipSlotCheck: true });

    const res = amber();
    expect(res.success).toBe(true);
    const neg = run.allSpirits.find(s => s.id === 'sym_wolf');
    expect(neg.isNegative).toBe(true);
    expect(neg.powerLevel).toBe(1);
  });
});
