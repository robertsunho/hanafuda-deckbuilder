import { describe, it, expect } from 'vitest';
import { makeRound } from './helpers.js';

// Shared deck layout that produces a bright capture:
// hand[0] = january_plain_1 matches field january_crane (bright) → pending;
// deck flip february_plain_1 (different month) resolves the pending pair as a capture.
const BRIGHT_CAPTURE_DECK = [
  // Hand (8)
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  // Field (8) — january_crane is the bright; rest unique months to avoid stacking
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  // Draw pile (6)
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Same as above but field[0] is a PLAIN (january_plain_2), so the capture has no bright.
const PLAIN_CAPTURE_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

describe('util_glory — onCaptureComplete draw intent (F4.20 #1)', () => {
  it('draws 2 on a bright capture', () => {
    const { grm } = makeRound({ spiritIds: ['util_glory'], deckCardIds: BRIGHT_CAPTURE_DECK });
    const deckBefore = grm.deck.drawPileSize; // 6
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    const captured = grm.capture.getAll();
    expect(captured.some(c => c.type === 'bright')).toBe(true);

    const glory = grm.scoringEvents.find(e => e.type === 'glory_draw');
    expect(glory).toBeDefined();
    expect(glory.count).toBe(2);
    expect(grm.deck.drawPileSize).toBe(deckBefore - 1 - 2); // 1 flip + 2 Glory draw
  });

  it('does not draw on a non-bright capture', () => {
    const { grm } = makeRound({ spiritIds: ['util_glory'], deckCardIds: PLAIN_CAPTURE_DECK });
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    const captured = grm.capture.getAll();
    expect(captured.some(c => c.type === 'bright')).toBe(false);
    expect(grm.scoringEvents.find(e => e.type === 'glory_draw')).toBeUndefined();
  });

  it('draws a FLAT 2 at 2 stacks (behavior preservation — NOT 2×stacks)', () => {
    const { grm } = makeRound({
      spirits: [{ id: 'util_glory', stackCount: 2 }],
      deckCardIds: BRIGHT_CAPTURE_DECK,
    });
    const deckBefore = grm.deck.drawPileSize;
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    const glory = grm.scoringEvents.find(e => e.type === 'glory_draw');
    expect(glory).toBeDefined();
    expect(glory.count).toBe(2);                       // flat 2, NOT 4
    expect(grm.deck.drawPileSize).toBe(deckBefore - 1 - 2);
  });
});
