import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';

// Consumable-block A2: chakra application migrated RunManager.applyChakra* →
// ConsumableEffects (card mutation) + RunManager primitives (deleteCard,
// duplicateCardToDeck) + getBaseCard (cards.js). [PRESERVE] — behavior identical.
// INVARIANT 1: chakras charge NO ki at apply (paid at shop purchase).

const DECK = [
  'january_crane', 'january_plain_1', 'february_plain_1', 'march_plain_1',
  'april_plain_1', 'may_plain_1', 'june_plain_1', 'july_plain_1',
  'august_plain_1', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const chakra = (id, params) => ConsumableEffects.get(id).execute({ params });
const deckCard = (id) => run._deck.find(c => c.id === id);

describe('Consumable A2 — chakra application via ConsumableEffects', () => {
  it('Root toggles temporal (day↔night) and flags the card', () => {
    makeRound({ deckCardIds: DECK });
    const before = deckCard('january_plain_1').temporal;
    const r = chakra('chakra_root', { cardIds: ['january_plain_1'] });
    expect(r.success).toBe(true);
    const after = deckCard('january_plain_1').temporal;
    expect(after).not.toBe(before);
    expect(['day', 'night']).toContain(after);
    expect(deckCard('january_plain_1').rootConverted).toBe(true);
  });

  it('Root rejects more than 3 targets', () => {
    makeRound({ deckCardIds: DECK });
    const r = chakra('chakra_root', { cardIds: ['january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1'] });
    expect(r.success).toBe(false);
  });

  it('Solar Plexus cycles type → points → name (plain→ribbon)', () => {
    makeRound({ deckCardIds: DECK });
    expect(deckCard('january_plain_1').type).toBe('plain');
    const r = chakra('chakra_solar_plexus', { cardIds: ['january_plain_1'] });
    expect(r.success).toBe(true);
    const c = deckCard('january_plain_1');
    expect(c.type).toBe('ribbon');
    expect(c.points).toBe(10);
    expect(c.name).toBe('January Ribbon');
    expect(c.solarPlexusConverted).toBe(true);
  });

  it('Heart applies an edition, then guards an already-editioned card', () => {
    makeRound({ deckCardIds: DECK });
    const r1 = chakra('chakra_heart', { cardId: 'january_plain_1' });
    expect(r1.success).toBe(true);
    expect(['gold', 'crystal', 'ghost']).toContain(r1.edition);
    expect(deckCard('january_plain_1').edition).toBe(r1.edition);
    const r2 = chakra('chakra_heart', { cardId: 'january_plain_1' });
    expect(r2.success).toBe(false);
    expect(r2.existingEdition).toBe(r1.edition);
  });

  it('Sacral advances month with Dec→Jan wrap via the extracted base-card lookup', () => {
    makeRound({ deckCardIds: DECK });
    expect(deckCard('december_plain_1').month).toBe(12);
    const r = chakra('chakra_sacral', { cardIds: ['december_plain_1'] });
    expect(r.success).toBe(true);
    const c = deckCard('december_plain_1');
    expect(c.month).toBe(1);            // 12 % 12 + 1
    expect(c.monthName).toBe('January');
    expect(c.sacralConverted).toBe(true);
  });

  it('Crown copies source identity while preserving the target id', () => {
    makeRound({ deckCardIds: DECK });
    expect(deckCard('january_plain_1').type).toBe('plain');
    const r = chakra('chakra_crown', { sourceId: 'january_crane', targetId: 'january_plain_1' });
    expect(r.success).toBe(true);
    const t = deckCard('january_plain_1');
    expect(t.id).toBe('january_plain_1');   // id preserved
    expect(t.type).toBe('bright');          // crane's identity copied
    expect(t.crownConverted).toBe(true);
    expect(t.baseImageId).toBe('january_crane');
  });

  it('Crown rejects identical source/target', () => {
    makeRound({ deckCardIds: DECK });
    const r = chakra('chakra_crown', { sourceId: 'january_plain_1', targetId: 'january_plain_1' });
    expect(r.success).toBe(false);
  });

  it('Third Eye deletes cards from the deck (membership drops)', () => {
    makeRound({ deckCardIds: DECK });
    const before = run._deck.length;
    const r = chakra('chakra_third_eye', { cardIds: ['january_plain_1', 'february_plain_1'] });
    expect(r.success).toBe(true);
    expect(run._deck.length).toBe(before - 2);
    expect(deckCard('january_plain_1')).toBeUndefined();
    expect(deckCard('february_plain_1')).toBeUndefined();
  });

  it('Throat duplicates a card (deck +1, _throat_ suffix) and bumps engine_palace', () => {
    makeRound({ spiritIds: ['engine_palace'], deckCardIds: DECK });
    const palace = equipSpiritWithState('engine_palace', { elements: [{ cardsAdded: 0 }] });
    const before = run._deck.length;
    const r = chakra('chakra_throat', { cardId: 'january_plain_1' });
    expect(r.success).toBe(true);
    expect(run._deck.length).toBe(before + 1);
    expect(r.newCard.id).toMatch(/^january_plain_1_throat_\d+$/);
    expect(run._deck.some(c => c.id === r.newCard.id)).toBe(true);
    expect(aggregateNumericState(palace, 'cardsAdded')).toBe(1);
  });

  // INVARIANT 1 regression guard — no chakra handler may deduct ki at apply.
  it('charges NO ki at apply (any chakra)', () => {
    makeRound({ spiritIds: ['engine_palace'], deckCardIds: DECK });
    run._devMode = false; run._ki = 100;
    chakra('chakra_root',        { cardIds: ['january_plain_1'] });
    chakra('chakra_sacral',      { cardIds: ['february_plain_1'] });
    chakra('chakra_solar_plexus',{ cardIds: ['march_plain_1'] });
    chakra('chakra_heart',       { cardId: 'april_plain_1' });
    chakra('chakra_throat',      { cardId: 'may_plain_1' });
    chakra('chakra_third_eye',   { cardIds: ['june_plain_1'] });
    chakra('chakra_crown',       { sourceId: 'january_crane', targetId: 'july_plain_1' });
    expect(run._ki).toBe(100);
  });
});
