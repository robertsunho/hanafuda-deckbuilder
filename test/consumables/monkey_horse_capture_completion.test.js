import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import run from '../../src/systems/RunManager.js';

// F4.19 [FIX] — Monkey/Horse run the shared capture-completion coordinator
// (_processCaptureCompletion), so a Monkey-completed yaku surfaces a yaku_decision and an
// emptied hand/deck ends the round (round_over) — the same path the deck phase uses. Before
// this fix the consumable path called _addCapture but never ran yaku detection, and discarded
// the round-end result (fire-and-forget _checkRoundEndOnEmptyHand) → the round soft-locked.
// These were test-blind (the F2.3-era issues were ruled out of scope until now).

const MONKEY = { id: 'zodiac_monkey', name: 'Monkey' };
const HORSE  = { id: 'zodiac_horse',  name: 'Horse' };

// 8 plain hand cards; field = 3 animals (slots 0-2) + 5 plains. 3 animals / 16 cards = 0.1875
// → proportional Tane threshold = 3 (see getProportionalYakuThreshold). 0 draw pile.
const DECK_16 = [
  // hand (8 plains)
  'january_plain_1', 'january_plain_2', 'february_plain_1', 'february_plain_2',
  'march_plain_1', 'march_plain_2', 'april_plain_1', 'april_plain_2',
  // field (8): slots 0-2 animals, 3-7 plains
  'february_warbler', 'april_cuckoo', 'may_bridge',
  'may_plain_1', 'may_plain_2', 'june_plain_1', 'june_plain_2', 'july_plain_1',
];
// Same, plus an 8-card draw pile so Horse can refill the hand.
const DECK_24 = [
  ...DECK_16,
  'july_plain_2', 'august_plain_1', 'august_plain_2', 'september_plain_1',
  'september_plain_2', 'october_plain_1', 'october_plain_2', 'december_plain_1',
];

describe('F4.19 — Monkey/Horse capture-completion surfacing', () => {
  it('Issue #1/#3: Monkey-completed yaku is detected → yaku_decision + scored', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_16 });
    expect(grm._getCaptureThresholds().tane).toBe(3);     // sanity: deck composition gives Tane 3

    // Seed 2 animals into the capture pile (slots 0,1) — below the Tane threshold, no yaku yet.
    grm._addCapture(grm._field.clearSlot(0));             // february_warbler
    grm._addCapture(grm._field.clearSlot(1));             // april_cuckoo
    grm._yakuBeforeTurn = new Set();                      // clean diff baseline (no prior yaku)

    // Monkey captures slot 2 (may_bridge) → 3 animals → Tane completes via the coordinator.
    const result = grm.useConsumable(MONKEY, { slotIndex: 2 });
    expect(result.success).toBe(true);
    expect(result.captureResult).toBeDefined();
    expect(result.captureResult.status).toBe('yaku_decision');
    expect(result.captureResult.newYaku.map(y => y.name)).toContain('Tane');
    expect(grm.phase).toBe('yaku_decision');             // UI would surface Bank/Push (Issue #3)
  });

  it('Issue #2: Monkey emptying the hand ends the round (full teardown)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_16 });
    // Trim hand to a single card so Monkey's 1-card discard empties it.
    const hand = grm.hand.getAll();
    for (const c of hand.slice(1)) grm._hand.remove(c.id);
    expect(grm.hand.getAll().length).toBe(1);

    // Capture a lone plain (slot 3) → no yaku, but the discard empties the hand → round_over.
    const result = grm.useConsumable(MONKEY, { slotIndex: 3 });
    expect(result.captureResult.status).toBe('round_over');
    expect(grm.phase).toBe('round_over');                // full _endRound teardown ran (phase set)
    expect(result.captureResult.finalScore).toBeTypeOf('number'); // round-end result shape
  });

  it('Issue #2: Horse with an exhausted deck ends the round', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_16 }); // 0 draw pile
    const result = grm.useConsumable(HORSE, {});
    expect(result.captureResult.status).toBe('round_over');
    expect(grm.phase).toBe('round_over');
    expect(result.message).toContain('deck exhausted');
  });

  it('Horse with cards remaining → ok (no false round-over)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_24 }); // 8-card draw pile
    const result = grm.useConsumable(HORSE, {});
    expect(result.captureResult.status).toBe('ok');
    expect(grm.phase).not.toBe('round_over');
    expect(grm.hand.getAll().length).toBeGreaterThan(0);
  });

  it('Monkey with cards remaining + no yaku → ok (no false round-over)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_16 });
    // Capture a lone plain; hand still has 7 cards after the 1-card discard → ok.
    const result = grm.useConsumable(MONKEY, { slotIndex: 3 });
    expect(result.captureResult.status).toBe('ok');
    expect(grm.phase).not.toBe('round_over');
    expect(grm.hand.getAll().length).toBeGreaterThan(0);   // cards remain → no round-over
  });
});

// [PRESERVE] deck path: _finalizeTurn now delegates to _processCaptureCompletion, but the deck
// phase's behavior is byte-identical (preamble + same coordinator). The existing deck-phase /
// finalize tests (round_end_unification, phase_machine, glory, counter_engines, hand_capacity,
// etc.) stay green UNCHANGED — they are the [PRESERVE] net for this extraction.
describe('F4.19 [PRESERVE] — deck path still finalizes through the coordinator', () => {
  it('a normal deck-phase turn still returns a status', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_24 });
    const hand = grm.hand.getAll();
    grm.playHandCards([hand[0].id]);
    const result = grm.playDeckPhase();
    expect(['ok', 'yaku_decision', 'round_over']).toContain(result.status);
  });
});
