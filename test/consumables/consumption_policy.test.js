import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';
import { consumableHadEffect } from '../../src/scenes/shared/consumePolicy.js';

// Candidate H: used ⟺ spent ⟺ Badger. A consumable is consumed (consumeById) iff it
// produced a real effect — the SAME signal each family's Badger gate fires on, so consume
// and Badger can never diverge. consumableHadEffect is the shared predicate every scene
// result-tail consults. These tests pin (1) the predicate's family-by-family verdicts and
// (2) that the engine's Badger increment agrees with the predicate for each family —
// including the previously test-blind element-no_effect case and the alchemical fold-in.

const FILLER_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const badgerCount = () =>
  aggregateNumericState(run.allSpirits.find(s => s.id === 'sym_badger'), 'consumablesUsed');

function seedBadger() {
  run.addSpirit({ id: 'sym_badger', name: 'Badger', stackCount: 1 });
}

describe('Candidate H — the consume predicate (real-effect verdict)', () => {
  it('element: no_effect is the sole non-consume; every other action consumes', () => {
    expect(consumableHadEffect({ action: 'no_effect' })).toBe(false);
    for (const a of ['applied_base', 'upgraded', 'stripped', 'overwritten']) {
      expect(consumableHadEffect({ action: a })).toBe(true);
    }
  });

  it('success-shaped families: only success:false is non-consume', () => {
    expect(consumableHadEffect({ success: false })).toBe(false);
    expect(consumableHadEffect({ success: true })).toBe(true);
    // partial + deliberate-cost both return success → they consume (buckets b & c)
    expect(consumableHadEffect({ success: true, message: 'Dog: retrieved 1 card(s).' })).toBe(true);
    expect(consumableHadEffect({ success: true, message: 'transcended! Field -1 slot.' })).toBe(true);
  });

  it('a missing/empty result is never consumed', () => {
    expect(consumableHadEffect(null)).toBe(false);
    expect(consumableHadEffect(undefined)).toBe(false);
  });
});

describe('Candidate H — Badger fires on the same signal the predicate gates on', () => {
  it('element no_effect: predicate false AND Badger does not fire (the smoking-gun fix)', () => {
    run.reset();
    seedBadger();
    // Reapplying the same element is a no-op (handler returns no_effect, withholds Badger).
    run._deck = [{ id: 'january_crane', enhancement: { element: 'water', tier: 'base' } }];
    const res = ConsumableEffects.get('element_water').execute({ params: { cardId: 'january_crane', element: 'water' } });
    expect(res.action).toBe('no_effect');
    expect(consumableHadEffect(res)).toBe(false);   // → scene tail must NOT consumeById
    expect(badgerCount()).toBe(0);                  // consume and Badger agree (both skip)
  });

  it('element applied_base: predicate true AND Badger fires', () => {
    run.reset();
    seedBadger();
    run._deck = [{ id: 'january_crane' }];          // no existing enhancement → applies base
    const res = ConsumableEffects.get('element_water').execute({ params: { cardId: 'january_crane', element: 'water' } });
    expect(res.action).toBe('applied_base');
    expect(consumableHadEffect(res)).toBe(true);
    expect(badgerCount()).toBe(1);
  });

  it('alchemical success now counts for Badger (the fold-in) and predicate agrees', () => {
    run.reset();
    seedBadger();
    run._acquireSpiritStack({ id: 'sym_wolf', name: 'Wolf' }, 1, { skipSlotCheck: true });
    const idx = run.spirits.findIndex(s => s.id === 'sym_wolf');
    const res = ConsumableEffects.get('alch_jade').execute({ params: { spiritIndex: idx } });
    expect(res.success).toBe(true);
    expect(consumableHadEffect(res)).toBe(true);
    expect(badgerCount()).toBe(1);                  // was 0 before the fold-in (alchemicals fired no Badger)
  });

  it('Dog at full hand: genuine fail → predicate false, retained, no Badger (provisional ruling, now permanent)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_badger'], deckCardIds: FILLER_DECK });
    grm._allDiscards.push({ id: 'january_plain_1' });   // non-empty discard → reach the hand-full branch
    const res = grm.useConsumable({ id: 'zodiac_dog', name: 'Dog' }, {});   // hand is full right after the deal
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/Hand is full/);
    expect(consumableHadEffect(res)).toBe(false);   // → _executeAndFinalize would NOT consume
    expect(badgerCount()).toBe(0);                  // useConsumable's success-gate already skipped Badger
  });
});
