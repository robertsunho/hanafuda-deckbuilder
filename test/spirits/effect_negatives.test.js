import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';

// F4.20-FIX2 — effect sites must include Negatives.
// Each test seeds a TRANSCENDED (Negative) copy of a spirit and drives its event,
// asserting the Negative now fires/scores/resets like a regular. Pre-fix these sites
// iterated run.activeSpirits (Negatives excluded) and the Negative was silently inert.
// See docs/process/SPIRIT_SET_ITERATION_RULE.md.

// Deck that captures the bright pair (january_crane + january_plain_1):
// play january_plain_1 → pending vs january_crane; deck flip february_plain_1 (diff month)
// resolves the pending pair as a capture.
const BRIGHT_CAPTURE_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Strand deck: same as bright-capture but the deck flip is a THIRD january
// (january_plain_2), so the 2-card pending slot grows to 3 (< autoCapture threshold 4)
// and STRANDS instead of capturing → sym_ducks −1 multValue path.
const DUCKS_STRAND_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'january_plain_2', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Match deck: NO january on the field, so january_plain_1 plays to an empty slot;
// the deck then flips january_plain_2 (same month as the lone played card) → the
// Fix-D single-play-to-empty-slot capture → sym_ducks +1 multValue path.
const DUCKS_MATCH_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'february_plain_2', 'march_plain_2', 'april_plain_2', 'may_plain_2',
  'june_plain_2', 'july_plain_2', 'august_plain_2', 'september_plain_2',
  'january_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'february_plain_1',
];

function negative(id, extra = {}) {
  return { id, name: id, isNegative: true, stackCount: 1, powerLevel: 1, sellPriceBonus: 0, ...extra };
}

describe('F4.20-FIX2 — effect sites include Negatives', () => {
  it('#1 a transcended Glory still draws on a bright capture (onCaptureComplete)', () => {
    const { grm, run } = makeRound({ spiritIds: [], deckCardIds: BRIGHT_CAPTURE_DECK });
    run.addSpiritDirect(negative('util_glory'));
    const deckBefore = grm.deck.drawPileSize;

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    expect(grm.capture.getAll().some(c => c.type === 'bright')).toBe(true);
    const glory = grm.scoringEvents.find(e => e.type === 'glory_draw');
    expect(glory).toBeDefined();
    expect(glory.count).toBe(2);
    expect(grm.deck.drawPileSize).toBe(deckBefore - 1 - 2); // 1 flip + 2 Glory draw
  });

  it('#2 a transcended golden_toad resets per capture (no jam) and gilds a card', () => {
    const { grm, run } = makeRound({ spiritIds: [], deckCardIds: BRIGHT_CAPTURE_DECK });
    const toad = negative('engine_golden_toad');
    run.addSpiritDirect(toad);
    toad._captureAppliedCount = 5; // simulate a jam left over from a prior capture

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    // Pre-fix the reset loop skipped the Negative → counter stays ≥ max → no gold applied.
    // Post-fix the reset brings it to 0 → the toad gilds a freshly-captured card.
    expect(grm.capture.getAll().some(c => c.edition === 'gold')).toBe(true);
  });

  it('#3 a transcended caterpillar eats a Wood-enhanced captured card', () => {
    const { grm, run } = makeRound({ spiritIds: [], deckCardIds: BRIGHT_CAPTURE_DECK });
    const cat = negative('sym_caterpillar', { state: { leafsEaten: 0 } });
    run.addSpiritDirect(cat);
    // Make the captured bright a Wood "leaf" so the caterpillar has something to eat.
    grm.field.getAll().find(c => c.id === 'january_crane').enhancement = { element: 'wood', tier: 'base' };

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    expect(cat.state.leafsEaten).toBe(1);
  });

  it('#4 a transcended ducks loses multValue on a strand', () => {
    const { grm, run } = makeRound({ spiritIds: [], deckCardIds: DUCKS_STRAND_DECK });
    const ducks = negative('sym_ducks', { state: { multValue: 5 } });
    run.addSpiritDirect(ducks);

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    expect(ducks.state.multValue).toBe(4); // −1 on strand (would stay 5 pre-fix)
  });

  it('#5 a transcended ducks gains multValue on a deck-flip match', () => {
    const { grm, run } = makeRound({ spiritIds: [], deckCardIds: DUCKS_MATCH_DECK });
    const ducks = negative('sym_ducks', { state: { multValue: 0 } });
    run.addSpiritDirect(ducks);
    // Free a field slot so january_plain_1 plays to an EMPTY slot (arming Fix-D),
    // rather than overflow-discarding off a full 8-card field.
    grm.field.removeCardById('september_plain_2');

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();

    expect(ducks.state.multValue).toBe(1); // +1 on deck-flip match (would stay 0 pre-fix)
  });
});
