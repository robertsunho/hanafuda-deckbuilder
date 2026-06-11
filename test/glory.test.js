import { describe, it, expect } from 'vitest';
import { makeRound } from './helpers.js';
import SpiritEffects from '../src/systems/SpiritEffects.js';

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

    // [FIX] F4-HANDCAP-E1: hand is full (8/8); after playing 1 card exactly 1 slot is free,
    // so Glory's flat-2 intent lands only 1 and the 2nd card STAYS in the deck (was spliced-
    // and-leaked pre-fix: deck −2, event count 2, but only 1 card ever reached the hand).
    // Hand contents are identical pre/post; the count + deck assertions are the deck-integrity proof.
    const glory = grm.scoringEvents.find(e => e.type === 'glory_draw');
    expect(glory).toBeDefined();
    expect(glory.count).toBe(1);
    expect(grm.deck.drawPileSize).toBe(deckBefore - 1 - 1); // 1 flip + 1 Glory draw (1 slot free)
  });

  it('does not draw on a non-bright capture', () => {
    const { grm } = makeRound({ spiritIds: ['util_glory'], deckCardIds: PLAIN_CAPTURE_DECK });
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    const captured = grm.capture.getAll();
    expect(captured.some(c => c.type === 'bright')).toBe(false);
    expect(grm.scoringEvents.find(e => e.type === 'glory_draw')).toBeUndefined();
  });

  it('draws a FLAT 2 intent on a bright capture (behavior preservation — NOT 2×stacks)', () => {
    // The flat-vs-×stacks property lives in the effect INTENT (onCaptureComplete returns a
    // fixed draw count, ignoring stacks). Post F4-HANDCAP-E1 the _drawIntoHand clamp lands
    // only what fits (1 in the full-hand integration scenario), so the in-hand count can no
    // longer distinguish 2 from 4 — assert the intent directly (smallest enclosing site).
    const intent = SpiritEffects.get('util_glory').onCaptureComplete({
      cards: [{ type: 'bright' }],
    });
    expect(intent.draw).toBe(2);                       // flat 2, NOT 2×stacks = 4
  });
});
