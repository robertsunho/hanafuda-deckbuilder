import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import { baseCards } from '../../src/data/cards.js';

// [FIX] — util_irrigation immediate score must scale LINEARLY with stacks (3 × stacks),
// matching its permanent per-card mutation. It was quadratic (3 × stacks²): the hook baked
// `× effectivePower` into its `{addPoints}` return, and the Phase-1 onCardScored loop then
// multiplied that return by `count = effectivePower` again (Irrigation is not an accumulator).
// Origin: §C-1 of docs/investigations/F5.0_family_classification.md.
//
// White-box: we score a single fresh plain straight through grm._scorePipeline so the
// Phase-1 `count` multiplier (and, for the retrigger test, the Phase-1.5 loop) is exercised.
// A bare plain (no enhancement/edition) scores exactly its base points (3), so the capture
// `points` minus the no-Irrigation baseline isolates Irrigation's immediate contribution.

// 16 distinct plains (avoids November — it has no plain card). 8 hand + 8 field, 0 draw.
const PLAINS_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
];

const freshPlain = () =>
  JSON.parse(JSON.stringify(baseCards.find(c => c.id === 'january_plain_1')));

// Score one fresh plain through the real pipeline; return the capture points + the scored card.
function scorePlain(spirits) {
  const { grm } = makeRound({ spirits, deckCardIds: PLAINS_DECK });
  const plain = freshPlain();
  const { points } = grm._scorePipeline([plain], { phase: 'capture', summaryType: 'capture' });
  return { points, plain };
}

describe('util_irrigation — immediate score scales linearly with stacks [FIX]', () => {
  it('anchor: a bare plain scores its base points (3) with no Irrigation', () => {
    expect(freshPlain().points).toBe(3);
    expect(scorePlain([]).points).toBe(3);
  });

  it('1-stack contributes +3 (per-stack base — coincides on both old and new code)', () => {
    expect(scorePlain([{ id: 'util_irrigation', stackCount: 1 }]).points).toBe(6); // 3 base + 3
  });

  it('2-stack contributes +6 (linear), NOT +12 (quadratic) — the [FIX]', () => {
    const points = scorePlain([{ id: 'util_irrigation', stackCount: 2 }]).points;
    expect(points).toBe(9);          // 3 base + (3 × 2)        ← linear (fixed)
    expect(points).not.toBe(15);     // 3 base + (3 × 2) × 2    ← quadratic (the bug)
  });

  it('3-stack contributes +9 (linear), NOT +27 (quadratic)', () => {
    const points = scorePlain([{ id: 'util_irrigation', stackCount: 3 }]).points;
    expect(points).toBe(12);         // 3 base + (3 × 3)
    expect(points).not.toBe(30);     // 3 base + (3 × 3) × 3
  });

  it('[PRESERVE] the permanent card mutation stays +3×stacks (the correct half, untouched)', () => {
    // A 2-stack Irrigation permanently adds +6 to the captured plain — this was already
    // correct and must NOT change. (It holds on both old and new code; guards the fix.)
    const { plain } = scorePlain([{ id: 'util_irrigation', stackCount: 2 }]);
    expect(plain.mutations.bonusPoints).toBe(6);
  });

  it('[FIX] the Phase-1.5 retrigger loop is linear too (Dew retriggers the plain)', () => {
    // 2-stack Irrigation + 1 Dew, scoring one fresh plain. Trace (linear/fixed):
    //   Phase 1:   base 3,        + 3×2 = 6                       → 9   (plain bonus now +6)
    //   Phase 1.5: re-add base+bonus 3+6 = 9, + 3×2 = 6           → 24
    // Quadratic/bug would be: Phase 1 → 15, Phase 1.5 re-add 9 + 12 → 36.
    const points = scorePlain([
      { id: 'util_irrigation', stackCount: 2 },
      { id: 'retrigger_dew',   stackCount: 1 },
    ]).points;
    expect(points).toBe(24);
    expect(points).not.toBe(36);
  });
});
