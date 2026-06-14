import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';

// F4.32 — Silk anti-strand, hand-play case. A hand play that forms a strandable 3-stack
// containing Silk (upgraded Wood) must mark the slot `pending` (NOT `normal`), so the
// deck-flip phase resolves it as a capture — same timing as every other capture. Before
// the fix, FieldManager.playHandCards left every total===3 stack `normal`, so a Silk card
// in a hand-formed 3-stack stranded. This path was test-blind.
//
// makeRound deck order: [ 0-7 hand, 8-15 field, 16+ draw pile ].

const SILK = { element: 'wood', tier: 'upgraded' };

// (i) 1-onto-2: field has a 2-card January slot; play a 3rd January card from hand.
// Draw[16] = September (different month) → deck-flip different-month path captures the
// Silk 3-stack and fires _fireSilkAntiStrandHooks (Moths t2 credit).
const DECK_1_ONTO_2 = [
  // hand 0-7 (hand[0] is the lone January card, played as Silk)
  'january_crane', 'february_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'october_plain_1',
  // field 8-15: two January cards (stack into one 2-card slot) + 6 distinct months
  'january_plain_1', 'january_plain_2', 'february_plain_2', 'march_plain_1',
  'april_plain_2', 'may_plain_2', 'june_plain_2', 'july_plain_2',
  // draw 16+
  'september_plain_1', 'september_plain_2', 'october_plain_2',
];

// (ii) 2-onto-1: field has a 1-card January slot; play TWO January cards from hand.
const DECK_2_ONTO_1 = [
  'january_plain_1', 'january_plain_2', 'february_plain_1', 'march_plain_1',
  'april_plain_1', 'may_plain_1', 'june_plain_1', 'july_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_1',
  'september_plain_1', 'september_plain_2',
];

// (iv) carve-out: NO January on the field (one empty slot via a Feb stack); play two
// January cards (one Silk) to the empty slot → 2-card fresh placement, stays normal.
const DECK_2_TO_EMPTY = [
  'january_plain_1', 'january_plain_2', 'october_plain_1', 'december_plain_1',
  'september_plain_1', 'october_plain_2', 'december_plain_2', 'september_plain_2',
  'february_plain_1', 'february_plain_2', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'march_plain_2',
];

const janSlot = grm => grm.field.getSlots().find(s => s.cards.some(c => c.month === 1));

describe('F4.32 — Silk anti-strand on hand play (the fix)', () => {
  it('(i) 1-onto-2 Silk 3-stack → pending → captured on a different-month deck flip', () => {
    const { grm } = makeRound({ spiritIds: ['engine_moths'], deckCardIds: DECK_1_ONTO_2 });
    const moths = equipSpiritWithState('engine_moths', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    const card = grm.hand.getAll().find(c => c.id === 'january_crane');
    card.enhancement = { ...SILK };

    grm.playHandCards([card.id]);

    const pending = grm.field.getPendingSlot();
    expect(pending).toBeTruthy();                 // the fix: marked pending (was normal)
    expect(pending.cards.length).toBe(3);

    grm.playDeckPhase();                          // September flip → different-month Silk capture

    expect(grm.field.getPendingSlot()).toBeFalsy();   // 3-stack captured (slot nullified)
    expect(janSlot(grm)).toBeUndefined();             // no stranded January slot remains
    expect(aggregateNumericState(moths, 't2Procs')).toBe(1);  // _fireSilkAntiStrandHooks ran
  });

  it('(ii) 2-onto-1 Silk 3-stack → pending', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_2_ONTO_1 });
    const hand = grm.hand.getAll();
    const a = hand.find(c => c.id === 'january_plain_1');
    const b = hand.find(c => c.id === 'january_plain_2');
    b.enhancement = { ...SILK };

    grm.playHandCards([a.id, b.id]);              // 2 onto the 1-card January slot → total 3

    const pending = grm.field.getPendingSlot();
    expect(pending).toBeTruthy();
    expect(pending.cards.length).toBe(3);
  });

  it('(iii) non-Silk hand-formed 3-stack still strands (stays normal — no regression)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_1_ONTO_2 });
    const card = grm.hand.getAll().find(c => c.id === 'january_crane');
    // no Silk enhancement this time

    grm.playHandCards([card.id]);

    expect(grm.field.getPendingSlot()).toBeFalsy();   // not pending
    const slot = janSlot(grm);
    expect(slot.cards.length).toBe(3);
    expect(slot.state).toBe('normal');                // stranded, as before
  });

  it('(iv) carve-out: 2 cards (one Silk) to an EMPTY slot → stays normal, not pending', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK_2_TO_EMPTY });
    const hand = grm.hand.getAll();
    const a = hand.find(c => c.id === 'january_plain_1');
    const b = hand.find(c => c.id === 'january_plain_2');
    b.enhancement = { ...SILK };

    grm.playHandCards([a.id, b.id]);              // no January field slot → fresh 2-card placement

    expect(grm.field.getPendingSlot()).toBeFalsy();
    const slot = janSlot(grm);
    expect(slot.cards.length).toBe(2);
    expect(slot.state).toBe('normal');                // fresh placement is not a strandable match
  });
});
