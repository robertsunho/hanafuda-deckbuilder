import { describe, it, expect } from 'vitest';
import { makeRound, playRoundToEnd } from '../helpers.js';
import run from '../../src/systems/RunManager.js';

// A deck of 22 all-plain cards (unique months, no brights → no yaku triggers on
// the normal path, so the round ends naturally when the hand empties).
// 8 hand + 8 field + 6 draw pile.
const ALL_PLAINS_DECK = [
  // Hand (8)
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  // Field (8) — same months so hand cards match → captures happen
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  // Draw pile (6)
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Deck that triggers a yaku (bright capture → Hikari) so bankScore() is reachable.
const YAKU_DECK = [
  // Hand (8)
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  // Field (8)
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  // Draw pile (6)
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Deck with exactly 16 cards (8 hand + 8 field, 0 draw pile).
// Horse consumable empties hand + deck is empty → _checkRoundEndOnEmptyHand fires.
const EMPTY_DECK_FOR_HORSE = [
  // Hand (8)
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  // Field (8) — different months so nothing matches accidentally
  'september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
];

describe('sym_crow — onRoundEnd consumable generation (F4.18b #1)', () => {
  it('generates 1 consumable on bank (1 stack)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_crow'], deckCardIds: YAKU_DECK });
    const consBefore = run.consumables.length;

    // Play jan_plain_1 → matches jan_crane → capture → Hikari yaku → yaku_decision
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');

    grm.bankScore();
    expect(grm.phase).toBe('round_over');
    expect(run.consumables.length).toBe(consBefore + 1);
  });

  it('generates 1 consumable on natural round-over (1 stack)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_crow'], deckCardIds: ALL_PLAINS_DECK });
    const consBefore = run.consumables.length;

    playRoundToEnd(grm);
    expect(grm.phase).toBe('round_over');
    expect(run.consumables.length).toBe(consBefore + 1);
  });

  it('generates 3 consumables at 3 stacks (bank)', () => {
    const { grm } = makeRound({
      spirits: [{ id: 'sym_crow', stackCount: 3 }],
      deckCardIds: YAKU_DECK,
    });
    const consBefore = run.consumables.length;

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();
    expect(run.consumables.length).toBe(consBefore + 3);
  });

  it('respects inventory cap (does not error when full)', () => {
    const { grm } = makeRound({ spiritIds: ['sym_crow'], deckCardIds: YAKU_DECK });
    // Fill consumable slots to max
    while (run.canAddConsumable) {
      run.addConsumable({ id: 'filler', name: 'Filler', description: '', category: 'test' });
    }
    const consBefore = run.consumables.length;

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();
    // Should not throw, and inventory stays at max
    expect(run.consumables.length).toBe(consBefore);
  });

  it('fires on consumable-empty-hand path (1D bug fix)', () => {
    // Horse empties hand + deck is empty → _checkRoundEndOnEmptyHand → onRoundEnd fires.
    // This is the behavior CHANGE: Crow now generates here (was previously omitted).
    const { grm } = makeRound({
      spiritIds: ['sym_crow'],
      deckCardIds: EMPTY_DECK_FOR_HORSE,
    });
    const consBefore = run.consumables.length;

    // Use Horse consumable to discard hand; deck is empty so no redraw → hand empty → round ends
    const horseResult = grm.useConsumable({ id: 'zodiac_horse', name: 'Horse' });
    expect(horseResult.success).toBe(true);
    expect(grm.phase).toBe('round_over');
    expect(run.consumables.length).toBe(consBefore + 1);
  });
});
