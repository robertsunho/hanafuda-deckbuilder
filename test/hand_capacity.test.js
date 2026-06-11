import { describe, it, expect } from 'vitest';
import { makeRound } from './helpers.js';
import ConsumableEffects from '../src/systems/ConsumableEffects.js';

// F4-HANDCAP — deck-integrity verification for the hand-growth consolidation.
//
// The single bug fixed by this pass: hand-growth sites did `_hand.add(_deck.draw(n))`.
// `draw(n)` SPLICES n out of the pile; `add` clamps to the cap and drops the overflow → the
// turned-away card was removed from the deck but never reached the hand (a deck leak). The
// canonical `_drawIntoHand(want)` draws only what fits, so turned-away cards STAY in the deck.
//
// The bar (campaign §1): HAND contents identical pre/post (the hand always capped, before and
// after); the FIX is that the deck/discard retains the card it used to splice-and-drop. Every
// routed draw-pile site delegates to `_drawIntoHand`, so testing that primitive at a full hand
// is the unifying proof for all of them (initial deal, stamp fireDraw ×3, Glory, Rat-style).

// 8 hand + 8 field + 4 draw = 20. All ids exist in baseCards (reused from glory.test.js).
const DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
];

describe('_drawIntoHand — the canonical draw-into-hand primitive', () => {
  it('at a FULL hand draws nothing and leaves the deck untouched (no splice-and-drop)', () => {
    const { grm } = makeRound({ deckCardIds: DECK });
    expect(grm.hand.availableSlots).toBe(0);            // 8/8 — full
    const deckBefore = grm.deck.drawPileSize;           // 4

    const { drawn, leftover } = grm._drawIntoHand(2);

    expect(drawn).toEqual([]);                          // nothing landed
    expect(leftover).toBe(2);
    expect(grm.deck.drawPileSize).toBe(deckBefore);     // [FIX] deck UNCHANGED — not spliced
    expect(grm.hand.getAll().length).toBe(8);           // hand still capped
  });

  it('with one free slot draws exactly 1 and the turned-away card STAYS in the deck', () => {
    const { grm } = makeRound({ deckCardIds: DECK });
    grm.hand.remove(grm.hand.getAll()[0].id);           // 7/8 → 1 slot free
    const deckBefore = grm.deck.drawPileSize;

    const { drawn, leftover } = grm._drawIntoHand(2);

    expect(drawn.length).toBe(1);                       // only what fits
    expect(leftover).toBe(1);
    expect(grm.deck.drawPileSize).toBe(deckBefore - 1); // [FIX] 1 spliced; the 2nd stays
    expect(grm.hand.getAll().length).toBe(8);
  });

  it('clamps to the draw-pile size when want exceeds it (with ample hand room)', () => {
    const { grm } = makeRound({ deckCardIds: DECK });
    for (const c of grm.hand.getAll()) grm.hand.remove(c.id);  // empty the hand
    const deckBefore = grm.deck.drawPileSize;           // 4

    const { drawn, leftover } = grm._drawIntoHand(99);

    expect(drawn.length).toBe(deckBefore);              // drained the pile, no more
    expect(leftover).toBe(99 - deckBefore);
    expect(grm.deck.drawPileSize).toBe(0);
  });
});

describe('zodiac_dog — discard-pile retrieval respects the cap (E1b)', () => {
  it('at a FULL hand retrieves nothing and the discard pile retains the cards', () => {
    const { grm } = makeRound({ deckCardIds: DECK });
    expect(grm.hand.availableSlots).toBe(0);
    // Seed the discard pile (LIFO source for Dog).
    grm._allDiscards.push({ id: 'discarded_a' }, { id: 'discarded_b' });
    const discardsBefore = grm._allDiscards.length;

    const r = ConsumableEffects.get('zodiac_dog').execute({ roundManager: grm });

    expect(r.success).toBe(false);                      // nothing to do — hand full
    expect(grm._allDiscards.length).toBe(discardsBefore); // [FIX] discard pile untouched (was a permanent loss)
    expect(grm.hand.getAll().length).toBe(8);
  });

  it('with one free slot retrieves exactly 1 (LIFO) and leaves the rest in the discard pile', () => {
    const { grm } = makeRound({ deckCardIds: DECK });
    grm.hand.remove(grm.hand.getAll()[0].id);           // 1 slot free
    grm._allDiscards.push({ id: 'discarded_a' }, { id: 'discarded_b' });

    const r = ConsumableEffects.get('zodiac_dog').execute({ roundManager: grm });

    expect(r.success).toBe(true);
    expect(r.retrievedCards.map(c => c.id)).toEqual(['discarded_b']); // LIFO: last in, first out
    expect(grm._allDiscards.map(c => c.id)).toEqual(['discarded_a']); // the un-retrievable one stays
    expect(grm.hand.getAll().length).toBe(8);
  });
});
