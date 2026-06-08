import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';
import { getStampDef } from '../../src/data/consumables.js';

// Consumable-block A1: stamp application migrated RunManager.applyStamp →
// ConsumableEffects (card mutation) + run.spendKiForConsumable (ki + Badger).
// [PRESERVE] tests — behavior must be byte-identical to the old applyStamp.

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const TARGET = 'january_plain_1';
const stamp = (cardId, stampId) =>
  ConsumableEffects.get(stampId).execute({ params: { cardId, stampId } });
const deckCard = (id) => run._deck.find(c => c.id === id);

describe('Consumable A1 — stamp application via ConsumableEffects', () => {
  it('(a) applying a stamp to an unstamped card sets ribbonStamp', () => {
    makeRound({ deckCardIds: DECK });
    run._devMode = false; run._ki = 100;
    expect(deckCard(TARGET).ribbonStamp).toBeUndefined();
    const r = stamp(TARGET, 'stamp_red');
    expect(r.success).toBe(true);
    expect(deckCard(TARGET).ribbonStamp).toBe('stamp_red');
  });

  it('(b) a second stamp mixes per mixStamps (red + yellow → orange)', () => {
    makeRound({ deckCardIds: DECK });
    run._devMode = false; run._ki = 100;
    stamp(TARGET, 'stamp_red');
    stamp(TARGET, 'stamp_yellow');
    expect(deckCard(TARGET).ribbonStamp).toBe('stamp_orange');
  });

  it('(c) ki is deducted by getEffectiveCost', () => {
    makeRound({ deckCardIds: DECK });
    run._devMode = false; run._ki = 100;
    const cost = run.getEffectiveCost(getStampDef('stamp_red').cost);
    stamp(TARGET, 'stamp_red');
    expect(run._ki).toBe(100 - cost);
  });

  it('(c2) insufficient ki: no spend, no mutation, success=false', () => {
    makeRound({ deckCardIds: DECK });
    run._devMode = false; run._ki = 1; // stamp_red costs 4
    const r = stamp(TARGET, 'stamp_red');
    expect(r.success).toBe(false);
    expect(run._ki).toBe(1);
    expect(deckCard(TARGET).ribbonStamp).toBeUndefined();
  });

  it('(d) Badger consumablesUsed increments on a successful stamp', () => {
    makeRound({ spiritIds: ['sym_badger'], deckCardIds: DECK });
    run._devMode = false; run._ki = 100;
    const badger = equipSpiritWithState('sym_badger', { elements: [{ consumablesUsed: 0 }] });
    stamp(TARGET, 'stamp_red');
    expect(aggregateNumericState(badger, 'consumablesUsed')).toBe(1);
  });

  it('unknown card id fails cleanly without spending ki', () => {
    makeRound({ deckCardIds: DECK });
    run._devMode = false; run._ki = 100;
    const r = stamp('no_such_card', 'stamp_red');
    expect(r.success).toBe(false);
    expect(run._ki).toBe(100);
  });
});
