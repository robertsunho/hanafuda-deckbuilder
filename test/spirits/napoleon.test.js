import { describe, it, expect } from 'vitest';
import { makeRound, playRoundToEnd, equipSpiritWithState } from '../helpers.js';
import { aggregateNumericState } from '../../src/systems/RunManager.js';

// Deck that triggers Hikari yaku (bright capture) so yaku_decision is reachable.
const YAKU_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// All-plains deck — round ends naturally, no yaku.
const ALL_PLAINS_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// 16-card deck (0 draw pile) for Horse → 1D path.
const EMPTY_DECK_FOR_HORSE = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
];

function getFails(spirit) {
  return aggregateNumericState(spirit, 'pushFails');
}

describe('engine_napoleon — onPushFailure increment (F4.18b #4, push-failure-only)', () => {
  it('increments on push failure (push then no new yaku)', () => {
    // Deck where first capture triggers Hikari, then post-push hand empties
    // quickly without enough captures for a second yaku.
    // Strategy: field has NO matching months for the post-push hand cards
    // (hand months 3-9, field months 2-8 after jan capture — some overlap).
    // Use a minimal draw pile (only 2 cards) so the post-push hand is tiny
    // and empties before Kasu can trigger.
    const pushFailDeck = [
      // Hand (8)
      'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
      'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
      // Field (8): jan_crane (bright) + months 2-8
      'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
      'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
      // Draw pile (2): only 2 cards — push deals min(4, drawPile) = 2
      // Use months already in hand so they go to field (no new capture)
      'october_plain_1', 'december_plain_1',
    ];

    const { grm } = makeRound({ spiritIds: ['engine_napoleon'], deckCardIds: pushFailDeck });
    const spirit = equipSpiritWithState('engine_napoleon', { elements: [{ pushFails: 0 }] });
    expect(getFails(spirit)).toBe(0);

    // Capture bright → Hikari yaku
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');

    // Push — sets _pushPenaltyActive
    grm.pushOn();
    expect(getFails(spirit)).toBe(0); // push itself is not a failure

    // Play remaining hand to empty — push again on any yaku (keeps penalty active)
    while (grm.phase !== 'round_over') {
      if (grm.phase === 'yaku_decision') {
        grm.pushOn(); // keep pushing — penalty stays active until no new yaku
        continue;
      }
      const hand = grm.hand.getAll();
      if (hand.length === 0) break;
      grm.playHandCards([hand[0].id]);
      if (grm.phase === 'awaiting_deck') {
        grm.playDeckPhase();
      }
    }

    expect(grm.phase).toBe('round_over');
    expect(getFails(spirit)).toBe(1); // push failure → incremented
  });

  it('does NOT increment on explicit bank (no push)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_napoleon'], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('engine_napoleon', { elements: [{ pushFails: 0 }] });

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');
    grm.bankScore();

    expect(getFails(spirit)).toBe(0); // bank is not a push failure
  });

  it('does NOT increment on clean natural round (no push)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_napoleon'], deckCardIds: ALL_PLAINS_DECK });
    const spirit = equipSpiritWithState('engine_napoleon', { elements: [{ pushFails: 0 }] });

    // Drive manually — no yaku, hand empties naturally
    while (grm.phase !== 'round_over') {
      const hand = grm.hand.getAll();
      if (hand.length === 0) break;
      grm.playHandCards([hand[0].id]);
      if (grm.phase === 'awaiting_deck') {
        const r = grm.playDeckPhase();
        if (r.status === 'round_over') break;
        if (r.status === 'yaku_decision') {
          grm.continuePlay();
        }
      }
    }

    expect(getFails(spirit)).toBe(0); // no push → no push failure
  });

  it('does NOT increment on 1D consumable path', () => {
    const { grm } = makeRound({ spiritIds: ['engine_napoleon'], deckCardIds: EMPTY_DECK_FOR_HORSE });
    const spirit = equipSpiritWithState('engine_napoleon', { elements: [{ pushFails: 0 }] });

    grm.useConsumable({ id: 'zodiac_horse', name: 'Horse' });
    expect(grm.phase).toBe('round_over');
    expect(getFails(spirit)).toBe(0); // 1D path → no onPushFailure
  });
});
