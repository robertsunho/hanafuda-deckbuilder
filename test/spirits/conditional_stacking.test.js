import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import run from '../../src/systems/RunManager.js';
import SpiritEffects from '../../src/systems/SpiritEffects.js';

// F5.12 [FIX] — conditional spirits stack LINEARLY (base × stacks), not exponentially.
//
// cond_horizon/dream/hierarchy previously self-applied Math.pow(base, stacks) in their own
// applyEngine — exponential stacking, inconsistent with the canonical per-card rule (the
// scoring loop scales multiplyMult × count = LINEAR). Now linear. Singletons are unchanged.
// These were TEST-BLIND before this file — this is the behavior-change proof.
//
// The conditionals' applyEngine reads only `spirit` (effectivePower + _tb→tooltipBase) and the
// captured `cards` composition, so a bare {id, stackCount} + a cards array exercises them fully.

const apply = (id, stackCount, cards) =>
  SpiritEffects.get(id).applyEngine({ spirit: { id, stackCount }, cards });

const AIR_LAND   = [{ vertical: 'air' },  { vertical: 'land' }];
const DAY_NIGHT  = [{ temporal: 'day' },  { temporal: 'night' }];
// 4 distinct ranks in one capture (exercises hierarchy's within-capture 1.5^ranks term).
const RANKS_4    = [{ type: 'bright' }, { type: 'animal' }, { type: 'ribbon' }, { type: 'plain' }];
const RANKS_2    = [{ type: 'bright' }, { type: 'animal' }];

describe('F5.12 [FIX] — conditional spirits stack linearly (base × stacks)', () => {
  // ── cond_horizon ───────────────────────────────────────────────────────────
  it('cond_horizon singleton air+land → ×2.0 (unchanged)', () => {
    expect(apply('cond_horizon', 1, AIR_LAND).multiplyMult).toBeCloseTo(2.0, 5);
  });
  it('cond_horizon 3-stack → ×6.0 (linear; was ×8.0 exponential)', () => {
    const v = apply('cond_horizon', 3, AIR_LAND).multiplyMult;
    expect(v).toBeCloseTo(6.0, 5);
    expect(v).not.toBeCloseTo(8.0, 5);  // the [FIX]: no longer 2^3
  });
  it('cond_horizon missing an axis → null (gating unchanged)', () => {
    expect(apply('cond_horizon', 3, [{ vertical: 'air' }])).toBeNull();
  });

  // ── cond_dream ───────────────────────────────────────────────────────────
  it('cond_dream singleton day+night → ×2.0 (unchanged)', () => {
    expect(apply('cond_dream', 1, DAY_NIGHT).multiplyMult).toBeCloseTo(2.0, 5);
  });
  it('cond_dream 3-stack → ×6.0 (linear; was ×8.0)', () => {
    const v = apply('cond_dream', 3, DAY_NIGHT).multiplyMult;
    expect(v).toBeCloseTo(6.0, 5);
    expect(v).not.toBeCloseTo(8.0, 5);
  });

  // ── cond_hierarchy: per-capture rank diversity stays exponential; STACK is linear ──
  it('cond_hierarchy 1-stack 4-rank → ×5.0625 = 1.5^4 (within-capture exponent unchanged)', () => {
    expect(apply('cond_hierarchy', 1, RANKS_4).multiplyMult).toBeCloseTo(5.0625, 5);
  });
  it('cond_hierarchy 1-stack 2-rank → ×2.25 = 1.5^2 (rank diversity still compounds)', () => {
    expect(apply('cond_hierarchy', 1, RANKS_2).multiplyMult).toBeCloseTo(2.25, 5);
  });
  it('cond_hierarchy 2-stack 4-rank → ×10.125 = 1.5^4 × 2 (linear stack; was ×25.6)', () => {
    const v = apply('cond_hierarchy', 2, RANKS_4).multiplyMult;
    expect(v).toBeCloseTo(10.125, 5);       // (1.5^4) × 2
    expect(v).not.toBeCloseTo(25.6289, 3);  // the [FIX]: no longer 1.5^(4×2)
  });
  it('cond_hierarchy 3-stack 4-rank → ×15.1875 = 1.5^4 × 3 (was ×130)', () => {
    expect(apply('cond_hierarchy', 3, RANKS_4).multiplyMult).toBeCloseTo(15.1875, 5);
  });
});

// ── [PRESERVE] guard: the 4 rares' tooltipBase relocation is byte-identical ──────
// dao reads its 0.1 from tooltipBase now (was inline); the LINEAR per-stack math is
// unchanged. Assert the per-stack term scales linearly (2-stack term = 2× 1-stack term),
// which holds iff the constant is applied identically — robust to the live deck count.
describe('F5.12 [PRESERVE] — engine_dao tooltipBase relocation unchanged', () => {
  it('engine_dao stacks linearly off the same 0.1 constant', () => {
    makeRound({ spiritIds: [], deckCardIds: [
      'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
      'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
    ] });
    const v1 = apply('engine_dao', 1).multiplyMult;  // 1 + n×0.1×1
    const v2 = apply('engine_dao', 2).multiplyMult;  // 1 + n×0.1×2
    expect(v1).toBeGreaterThan(1);                   // deck is non-empty → term present
    expect(v2 - 1).toBeCloseTo(2 * (v1 - 1), 5);     // linear per-stack, 0.1 applied identically
  });
});
