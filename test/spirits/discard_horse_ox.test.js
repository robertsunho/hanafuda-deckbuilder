import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';
import { baseCards } from '../../src/data/cards.js';

function freshCard(id) {
  const c = baseCards.find(c => c.id === id);
  if (!c) throw new Error(`Unknown card id: ${id}`);
  return JSON.parse(JSON.stringify(c));
}

// Place a stranded stack directly into a field slot (clearSlot reads _slots[idx]).
function strand(grm, idx, cardIds, month = 11) {
  grm._field._slots[idx] = { month, cards: cardIds.map(freshCard), state: 'normal' };
}

// 24-card deck → 8 hand + 8 field + 8 draw pile. Horse touches only the hand.
const DECK_24 = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_ribbon', 'february_ribbon',
];

// 16-card deck → 8 hand + 8 field + 0 draw pile (Horse → empty hand → round ends).
const DECK_16 = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
];

const HORSE = { id: 'zodiac_horse', name: 'Horse' };
const OX    = { id: 'zodiac_ox', name: 'Ox' };

describe('F4.17#5 — zodiac_horse routes whole-hand discard through _discardCards', () => {
  it('[FIX] now fires econ_recycling (+5/stack per discarded card)', () => {
    const { grm } = makeRound({ spirits: [{ id: 'econ_recycling', stackCount: 1 }], deckCardIds: DECK_24 });
    const kiBefore = run.ki;
    grm.useConsumable(HORSE);
    expect(run.ki - kiBefore).toBe(40);   // 5 * 1 stack * 8 discarded cards
  });

  it('[FIX/regression] engine_ship is NOT double-counted (hook only, inline loop removed)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_ship'], deckCardIds: DECK_24 });
    const spirit = equipSpiritWithState('engine_ship', { elements: [{ cardsDiscarded: 0 }] });
    grm.useConsumable(HORSE);
    expect(aggregateNumericState(spirit, 'cardsDiscarded')).toBe(8);   // 8, NOT 16
  });

  it('[FIX] bookkeeping now counts the discards (_discardCount / _allDiscards)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_24 });
    expect(grm.discardCount).toBe(0);
    grm.useConsumable(HORSE);
    expect(grm.discardCount).toBe(8);     // was 0 before F4.17#5
    expect(grm.allDiscards.length).toBe(8);
  });

  it('catcher SYNERGY on a 5-card hand: rescue 1 + redraw 5 → end hand 6', () => {
    const { grm } = makeRound({ spiritIds: ['game_catcher'], deckCardIds: DECK_24 });
    equipSpiritWithState('game_catcher', { state: { catchesUsedThisRound: 0 } });
    // Reduce hand to 5 (remove 3) so the redraw has slack under the cap.
    for (const id of grm.hand.getAll().slice(0, 3).map(c => c.id)) grm._hand.remove(id);
    expect(grm.hand.getAll()).toHaveLength(5);

    grm.useConsumable(HORSE);
    expect(grm.hand.getAll()).toHaveLength(6);   // 1 rescued + 5 drawn
    const catcher = run.allSpirits.find(s => s.id === 'game_catcher');
    expect(catcher.state.catchesUsedThisRound).toBe(1);
    expect(grm.deck.drawPileSize).toBe(3);       // 8 - 5 drawn
  });

  it('catcher ANTI-SYNERGY on a full hand: rescue 1, redraw clamps to 7 → end 8, 1 draw stays in deck', () => {
    const { grm } = makeRound({ spiritIds: ['game_catcher'], deckCardIds: DECK_24 });
    equipSpiritWithState('game_catcher', { state: { catchesUsedThisRound: 0 } });
    expect(grm.hand.getAll()).toHaveLength(8);   // full hand at the cap

    grm.useConsumable(HORSE);                    // must not throw (add clamps, no RangeError)
    expect(grm.hand.getAll()).toHaveLength(8);   // capped — rescue is anti-synergy here
    expect(grm.deck.drawPileSize).toBe(1);       // the un-drawable card STAYED in the deck (no-catcher would be 0)
  });

  it('[PRESERVE] empty deck → hand empties → round ends', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_16 });
    const result = grm.useConsumable(HORSE);
    expect(grm.phase).toBe('round_over');
    expect(result.message).toContain('deck exhausted');
  });
});

describe('F4.17#5 — zodiac_ox routes cleared field cards through _discardCards', () => {
  it('[FIX] now fires recycling + ship + bookkeeping on the cleared stack', () => {
    const { grm } = makeRound({
      spirits: [{ id: 'econ_recycling', stackCount: 2 }, { id: 'engine_ship', stackCount: 1 }],
      deckCardIds: DECK_24,
    });
    equipSpiritWithState('engine_ship', { elements: [{ cardsDiscarded: 0 }] });
    strand(grm, 0, ['november_rainman', 'november_swallow']);  // 2-card stranded stack
    const kiBefore = run.ki;

    grm.useConsumable(OX, { slotIndex: 0 });
    expect(run.ki - kiBefore).toBe(20);          // 5 * 2 stacks * 2 cards
    const ship = run.allSpirits.find(s => s.id === 'engine_ship');
    expect(aggregateNumericState(ship, 'cardsDiscarded')).toBe(2);
    expect(grm.discardCount).toBe(2);            // was 0 before F4.17#5
  });

  // HEADLINE: Ox is the only way to recover stranded field cards into HAND.
  it('[FIX] HEADLINE — catcher rescues the stranded stack to HAND instead of discarding', () => {
    const { grm } = makeRound({
      spirits: [{ id: 'game_catcher', stackCount: 3 }],   // budget 3 → can rescue all 3
      deckCardIds: DECK_24,
    });
    equipSpiritWithState('game_catcher', { state: { catchesUsedThisRound: 0 } });
    grm._hand.clear();                                    // make hand room for the rescue
    strand(grm, 0, ['november_rainman', 'november_swallow', 'november_ribbon']);

    const result = grm.useConsumable(OX, { slotIndex: 0 });

    const handIds = grm.hand.getAll().map(c => c.id);
    expect(handIds).toContain('november_rainman');
    expect(handIds).toContain('november_swallow');
    expect(handIds).toContain('november_ribbon');        // all 3 stranded cards recovered to hand
    expect(grm.discardCount).toBe(0);                     // none actually discarded
    expect(result.discardedCards).toHaveLength(0);
    const catcher = run.allSpirits.find(s => s.id === 'game_catcher');
    expect(catcher.state.catchesUsedThisRound).toBe(3);
  });

  it('stamp dispatch fires on a stamped cleared card (stamp_green → +3 ki)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_24 });
    const stamped = freshCard('november_rainman');
    stamped.ribbonStamp = 'stamp_green';
    grm._field._slots[0] = { month: 11, cards: [stamped], state: 'normal' };
    const kiBefore = run.ki;

    grm.useConsumable(OX, { slotIndex: 0 });
    expect(run.ki - kiBefore).toBe(3);           // stamp_green discard → +3 ki
  });
});
