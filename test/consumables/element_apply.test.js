import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';

// Consumable-block A3: Wu Xing element ATTACH migrated RunManager.applyElement →
// ConsumableEffects (one shared handler for all 5 element_* ids). [PRESERVE] — the
// card.enhancement field contract procs depend on (Recon 2, SHARED-STATE) must be
// byte-identical. Badger fires on a real mutation only, NOT on no_effect/not-found.

const DECK = [
  'january_crane', 'january_plain_1', 'february_plain_1', 'march_plain_1',
  'april_plain_1', 'may_plain_1', 'june_plain_1', 'july_plain_1',
  'august_plain_1', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const applyEl = (element, cardId) =>
  ConsumableEffects.get(`element_${element}`).execute({ params: { cardId, element } });
const deckCard = (id) => run._deck.find(c => c.id === id);

describe('Consumable A3 — Wu Xing element attach via ConsumableEffects', () => {
  it('applied_base (water) writes { element, tier:base, depLevel:0 }', () => {
    makeRound({ deckCardIds: DECK });
    const r = applyEl('water', 'january_plain_1');
    expect(r.action).toBe('applied_base');
    expect(deckCard('january_plain_1').enhancement).toEqual({ element: 'water', tier: 'base', depLevel: 0 });
  });

  it('applied_base (non-water) has NO depLevel field', () => {
    makeRound({ deckCardIds: DECK });
    const r = applyEl('wood', 'january_plain_1');
    expect(r.action).toBe('applied_base');
    const enh = deckCard('january_plain_1').enhancement;
    expect(enh).toEqual({ element: 'wood', tier: 'base' });
    expect('depLevel' in enh).toBe(false);
  });

  it('generative upgrade sets tier:upgraded and RESETS depLevel to 0', () => {
    makeRound({ deckCardIds: DECK });
    applyEl('water', 'january_plain_1');           // water base, depLevel 0
    deckCard('january_plain_1').enhancement.depLevel = 3;  // simulate post-round depreciation
    const r = applyEl('metal', 'january_plain_1'); // parentOf[water]=metal → upgrade
    expect(r.action).toBe('upgraded');
    const enh = deckCard('january_plain_1').enhancement;
    expect(enh.tier).toBe('upgraded');
    expect(enh.depLevel).toBe(0);
  });

  it('generative on already-upgraded → no_effect', () => {
    makeRound({ deckCardIds: DECK });
    applyEl('water', 'january_plain_1');
    applyEl('metal', 'january_plain_1');           // → upgraded
    const r = applyEl('metal', 'january_plain_1'); // metal not same as water; but already upgraded → no_effect
    expect(r.action).toBe('no_effect');
  });

  it('destructive strip nulls enhancement and returns the base consumable', () => {
    makeRound({ deckCardIds: DECK });
    applyEl('fire', 'january_plain_1');            // fire base
    const r = applyEl('water', 'january_plain_1'); // destroys[water]=fire → strip
    expect(r.action).toBe('stripped');
    expect(r.returnedConsumable).toBe('element_fire');
    expect(deckCard('january_plain_1').enhancement).toBeNull();
  });

  it('overwrite with an unrelated element installs a fresh base', () => {
    makeRound({ deckCardIds: DECK });
    applyEl('wood', 'january_plain_1');            // wood base
    const r = applyEl('fire', 'january_plain_1');  // fire: not same/generative/destructive vs wood → overwrite
    expect(r.action).toBe('overwritten');
    expect(deckCard('january_plain_1').enhancement).toEqual({ element: 'fire', tier: 'base' });
  });

  it('card-not-found → no_effect', () => {
    makeRound({ deckCardIds: DECK });
    const r = applyEl('water', 'no_such_card');
    expect(r.action).toBe('no_effect');
  });

  // Badger-on-mutation-only [PRESERVE] detail — differs from A2 (chakras always notify).
  it('Badger increments on a mutating outcome but NOT on no_effect', () => {
    makeRound({ spiritIds: ['sym_badger'], deckCardIds: DECK });
    const badger = equipSpiritWithState('sym_badger', { elements: [{ consumablesUsed: 0 }] });
    applyEl('water', 'january_plain_1');           // applied_base → +1
    expect(aggregateNumericState(badger, 'consumablesUsed')).toBe(1);
    applyEl('water', 'january_plain_1');           // same element → no_effect → no badger
    expect(aggregateNumericState(badger, 'consumablesUsed')).toBe(1);
  });

  it('Badger does NOT fire on card-not-found', () => {
    makeRound({ spiritIds: ['sym_badger'], deckCardIds: DECK });
    const badger = equipSpiritWithState('sym_badger', { elements: [{ consumablesUsed: 0 }] });
    applyEl('water', 'no_such_card');
    expect(aggregateNumericState(badger, 'consumablesUsed')).toBe(0);
  });
});
