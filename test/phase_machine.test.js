import { describe, it, expect } from 'vitest';
import { makeRound, playRoundToEnd } from './helpers.js';

// Item-5 guardrail: _setPhase() validates every round-phase transition against
// GameRoundManager.PHASE_TRANSITIONS and throws on an illegal move. These tests prove
// (a) the guard actually throws on a bad transition, and (b) every real gameplay exit
// — the 9 legal pairs (F4.19 added idle → yaku_decision) — passes through it without
// throwing. _resetRoundState bypasses the setter by design (reset is initialization), so
// startRound never throws.

// Reaches Hikari (bright capture january_crane) → yaku_decision is offered.
const YAKU_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// All plains → round ends naturally with no yaku.
const ALL_PLAINS_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

describe('_setPhase — illegal-transition guard (item 5)', () => {
  it('THROWS on an illegal transition (awaiting_deck → awaiting_deck)', () => {
    const { grm } = makeRound({ deckCardIds: YAKU_DECK });
    grm.playHandCards(['january_plain_1']);   // idle → awaiting_deck (legal)
    expect(grm.phase).toBe('awaiting_deck');
    // awaiting_deck → awaiting_deck is NOT legal (→ idle / yaku_decision / round_over only).
    expect(() => grm._setPhase('awaiting_deck')).toThrow(/Illegal phase transition/);
    expect(grm.phase).toBe('awaiting_deck'); // phase unchanged after the throw
  });

  it('[F4.19 FIX] idle → yaku_decision is now LEGAL (a consumable can complete a yaku from idle)', () => {
    const { grm } = makeRound({ deckCardIds: ALL_PLAINS_DECK });
    expect(grm.phase).toBe('idle');
    // Pre-F4.19 this threw (Monkey bypassed yaku detection); now Monkey can complete a yaku
    // from the player's turn → the round legally enters the decision. The visible [FIX] flip.
    expect(() => grm._setPhase('yaku_decision')).not.toThrow();
    expect(grm.phase).toBe('yaku_decision');
  });

  it('allows the idle → idle self-transition (multi-play turn)', () => {
    const { grm } = makeRound({ deckCardIds: ALL_PLAINS_DECK });
    expect(() => grm._setPhase('idle')).not.toThrow();
    expect(grm.phase).toBe('idle');
  });

  it('round_over is a sink — no transition out of it via the setter', () => {
    const { grm } = makeRound({ deckCardIds: ALL_PLAINS_DECK });
    playRoundToEnd(grm);
    expect(grm.phase).toBe('round_over');
    expect(() => grm._setPhase('idle')).toThrow(/Illegal phase transition/);
  });
});

describe('_setPhase — every real gameplay exit passes through without throwing', () => {
  it('normal turn loop: idle → awaiting_deck → (idle | yaku_decision)', () => {
    const { grm } = makeRound({ deckCardIds: YAKU_DECK });
    expect(grm.phase).toBe('idle');
    expect(() => grm.playHandCards(['january_plain_1'])).not.toThrow();
    expect(grm.phase).toBe('awaiting_deck');
    expect(() => grm.playDeckPhase()).not.toThrow();
    expect(grm.phase).toBe('yaku_decision'); // bright capture → Hikari → decision offered
  });

  it('yaku decision → BANK → round_over (no throw)', () => {
    const { grm } = makeRound({ deckCardIds: YAKU_DECK });
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');
    expect(() => grm.bankScore()).not.toThrow();
    expect(grm.phase).toBe('round_over');
  });

  it('yaku decision → PUSH → idle (no throw)', () => {
    const { grm } = makeRound({ deckCardIds: YAKU_DECK });
    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');
    expect(() => grm.pushOn()).not.toThrow();
    expect(grm.phase).toBe('idle');
  });

  it('natural round end (no yaku) reaches round_over without throwing', () => {
    const { grm } = makeRound({ deckCardIds: ALL_PLAINS_DECK });
    expect(() => playRoundToEnd(grm)).not.toThrow();
    expect(grm.phase).toBe('round_over');
  });

  it('reset BYPASSES the setter: startRound from round_over → idle does not throw', () => {
    const { grm } = makeRound({ deckCardIds: ALL_PLAINS_DECK });
    playRoundToEnd(grm);
    expect(grm.phase).toBe('round_over'); // round_over → idle is NOT a legal setter pair...
    expect(() => grm.startRound()).not.toThrow(); // ...but reset assigns directly, so no throw
    expect(grm.phase).toBe('idle');
  });
});
