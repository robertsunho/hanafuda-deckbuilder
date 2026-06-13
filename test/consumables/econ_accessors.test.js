import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import run, { couponDiscountPct, piggybankHandKiMult } from '../../src/systems/RunManager.js';
import { getSpiritContrib } from '../../src/scenes/shared/spiritTooltip.js';

// ─────────────────────────────────────────────────────────────────────────────
// F4.37 C3 Part 3 — econ value accessors + new tooltip branches.
//
// couponDiscountPct / piggybankHandKiMult were extracted from getEffectiveCost /
// calculateKiReward as a PURE refactor (the computed value is unchanged). These
// tests pin both the RunManager formula behavior (the extraction guard) AND the
// new tooltip branches reading the SAME source (no hardcoded 4th copy).
// ─────────────────────────────────────────────────────────────────────────────

const DECK = ['september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1'];

describe('F4.37 C3 — econ accessors are pure extractions', () => {
  it('couponDiscountPct: 15% per stack', () => {
    expect(couponDiscountPct(1)).toBe(15);
    expect(couponDiscountPct(3)).toBe(45);
  });
  it('piggybankHandKiMult: 1 + stacks (×1 when absent)', () => {
    expect(piggybankHandKiMult(0)).toBe(1);
    expect(piggybankHandKiMult(1)).toBe(2);
    expect(piggybankHandKiMult(3)).toBe(4);
  });

  it('getEffectiveCost applies the coupon discount unchanged (2 stacks → 30% off)', () => {
    makeRound({ spirits: [{ id: 'econ_coupon', stackCount: 2 }], deckCardIds: DECK });
    // 100 × (100 - 30)/100 = 70 — identical to the pre-refactor inline formula.
    expect(run.getEffectiveCost(100)).toBe(70);
  });

  it('calculateKiReward applies the piggybank hand-ki multiplier unchanged (2 stacks → ×3)', () => {
    makeRound({ spirits: [{ id: 'econ_piggybank', stackCount: 2 }], deckCardIds: DECK });
    const { breakdown } = run.calculateKiReward({ cardsInHand: 5, pushDepth: 0 });
    expect(breakdown.piggyMult).toBe(3);
    expect(breakdown.handKi).toBe(15); // 5 × 3
  });
});

describe('F4.37 C3 — econ tooltip branches read the real value [NEW display]', () => {
  it('econ_coupon shows the discount from couponDiscountPct', () => {
    makeRound({ spirits: [{ id: 'econ_coupon', stackCount: 2 }], deckCardIds: DECK });
    const s = run.allSpirits.find(x => x.id === 'econ_coupon');
    expect(getSpiritContrib(s)).toContain(`${couponDiscountPct(2)}% shop discount`);
  });

  it('econ_piggybank shows the hand-ki mult from piggybankHandKiMult', () => {
    makeRound({ spirits: [{ id: 'econ_piggybank', stackCount: 2 }], deckCardIds: DECK });
    const s = run.allSpirits.find(x => x.id === 'econ_piggybank');
    expect(getSpiritContrib(s)).toContain(`×${piggybankHandKiMult(2)} hand ki`);
  });

  it('econ_grace shows ×(1+stacks) derived from applyKiBonus', () => {
    makeRound({ spirits: [{ id: 'econ_grace', stackCount: 2 }], deckCardIds: DECK });
    const s = run.allSpirits.find(x => x.id === 'econ_grace');
    expect(getSpiritContrib(s)).toContain('×3 running ki per combo'); // 1 × (1 + 2)
  });
});
