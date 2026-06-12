import { describe, it, expect } from 'vitest';
import {
  isPairInputType,
  computeSpiritEligibility,
  buildSpiritParams,
} from '../../src/scenes/shared/spiritTargetPicker.js';

// F4.35 — shared spirit-target SELECTION logic, used by both scene pickers.
// Locks the per-inputType eligibility predicate (the consistency surface GameScene
// now shares with the shrine) and the Amber-any-stack invariant.
// Tiers: spring_pollen=1, fusion_bloom=2, cross_yang=3.

const sp = (id, stackCount = 1) => ({ id, stackCount });

describe('isPairInputType', () => {
  it('true for the two pair input types, false otherwise', () => {
    expect(isPairInputType('spirit_pair')).toBe(true);
    expect(isPairInputType('spirit_pair_tier3')).toBe(true);
    expect(isPairInputType('spirit_single_fusion')).toBe(false);
    expect(isPairInputType('spirit_single_transcendable')).toBe(false);
  });
});

describe('computeSpiritEligibility', () => {
  it('spirit_single_transcendable (Amber) is ANY-stack — every spirit ok (the invariant)', () => {
    const spirits = [sp('spring_pollen', 1), sp('spring_pollen', 2), sp('spring_pollen', 3)];
    const elig = computeSpiritEligibility(spirits, 'spirit_single_transcendable');
    expect(elig.every(e => e.ok)).toBe(true); // do NOT re-gate Amber to >=3
  });

  it('spirit_single_stackable gates on stackCount < 3', () => {
    const spirits = [sp('spring_pollen', 1), sp('spring_pollen', 2), sp('spring_pollen', 3)];
    const elig = computeSpiritEligibility(spirits, 'spirit_single_stackable');
    expect(elig.map(e => e.ok)).toEqual([true, true, false]);
  });

  it('spirit_single_fusion gates on tier 2 or 3', () => {
    const spirits = [sp('spring_pollen'), sp('fusion_bloom'), sp('cross_yang')];
    const elig = computeSpiritEligibility(spirits, 'spirit_single_fusion');
    expect(elig.map(e => e.ok)).toEqual([false, true, true]); // tier 1 excluded
  });

  it('spirit_pair_tier3 gates on tier 3', () => {
    const spirits = [sp('fusion_bloom'), sp('cross_yang')];
    const elig = computeSpiritEligibility(spirits, 'spirit_pair_tier3');
    expect(elig.map(e => e.ok)).toEqual([false, true]);
  });

  it('preserves run.spirits order via the i field', () => {
    const spirits = [sp('cross_yang'), sp('fusion_bloom')];
    const elig = computeSpiritEligibility(spirits, 'spirit_single_fusion');
    expect(elig.map(e => e.i)).toEqual([0, 1]);
  });
});

describe('buildSpiritParams', () => {
  it('pair → spiritIndices (the full selection); single → spiritIndex (the first)', () => {
    expect(buildSpiritParams(true, [2, 5])).toEqual({ spiritIndices: [2, 5] });
    expect(buildSpiritParams(false, [3])).toEqual({ spiritIndex: 3 });
  });
});
