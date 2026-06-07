import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import run from '../../src/systems/RunManager.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';

// Transcend-placement fix + mirror/memory ctx swap (F4.20-FIX2 site-#6 follow-up) [FIX].
// Part 1: transcendence PRESERVES chain position (no append-to-end).
// Part 2: the mirror/memory targeting ctx is the negatives-included chain in placement
//   order, so transcended spirits are valid adjacency targets AND targeters.

const BRIGHT_CAPTURE_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// --- Part 1: placement preservation ----------------------------------------

describe('Part 1 — transcendence preserves chain position', () => {
  it('_acquireSpiritStack transcends IN PLACE (not appended to the end)', () => {
    run.reset();
    run._acquireSpiritStack({ id: 'sym_wolf',   name: 'sym_wolf' },   1, { skipSlotCheck: true }); // idx 0
    run._acquireSpiritStack({ id: 'sym_magpie', name: 'sym_magpie' }, 1, { skipSlotCheck: true }); // idx 1
    // Push sym_wolf to 4 stacks → cascade-transcend.
    run._acquireSpiritStack({ id: 'sym_wolf',   name: 'sym_wolf' },   3, { skipSlotCheck: true });

    const all = run.allSpirits;
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('sym_wolf');       // still at index 0, NOT pushed to the end
    expect(all[0].isNegative).toBe(true);     // and it transcended
    expect(all[1].id).toBe('sym_magpie');     // neighbour untouched
    expect(all[1].isNegative).toBeFalsy();
  });

  it('Amber transcends IN PLACE (not appended to the end)', () => {
    run.reset();
    run._acquireSpiritStack({ id: 'sym_wolf',   name: 'sym_wolf' },   1, { skipSlotCheck: true }); // idx 0
    run._acquireSpiritStack({ id: 'sym_magpie', name: 'sym_magpie' }, 1, { skipSlotCheck: true }); // idx 1

    // Amber transcends run.spirits[0] (sym_wolf) at the cost of a field slot.
    ConsumableEffects.get('alch_amber').execute({ roundManager: null, params: { spiritIndex: 0 } });

    const all = run.allSpirits;
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('sym_wolf');
    expect(all[0].isNegative).toBe(true);
    expect(all[1].id).toBe('sym_magpie');
  });
});

// --- Part 2: mirror/memory target / are targeted by Negatives ---------------
// sym_wolf.onCardScored returns { multiplyMult: 2 } on a bright. A Mirror/Memory
// that successfully targets a wolf therefore emits a spirit_effect step with
// multiplyMult 2. We drive a real bright capture and read the scoring steps —
// this exercises the GRM targeting ctx (now run.allSpirits) end-to-end.

function seedBrightCaptureRound() {
  return makeRound({ spiritIds: [], deckCardIds: BRIGHT_CAPTURE_DECK });
}

function mirrorStepFor(grm, id) {
  const steps = [];
  grm.setScoringStepCallback(e => steps.push(e));
  grm.playHandCards(['january_plain_1']);
  grm.playDeckPhase();
  return steps.find(e => e.type === 'spirit_effect' && e.spirit?.id === id);
}

describe('Part 2 — mirror/memory adjacency includes Negatives', () => {
  it('a regular Mirror targets a Negative immediately to its left', () => {
    const { grm } = seedBrightCaptureRound();
    run.addSpiritDirect({ id: 'sym_wolf', name: 'sym_wolf', isNegative: true, stackCount: 1, powerLevel: 1 }); // idx 0
    run.addSpirit({ id: 'game_mirror', name: 'game_mirror', stackCount: 1 });                                  // idx 1

    const step = mirrorStepFor(grm, 'game_mirror');
    expect(step).toBeDefined();
    expect(step.multiplyMult).toBe(2); // copied the Negative wolf's bright x2
  });

  it('a Negative Mirror targets its regular left neighbour', () => {
    const { grm } = seedBrightCaptureRound();
    run.addSpirit({ id: 'sym_wolf', name: 'sym_wolf', stackCount: 1 });                                            // idx 0
    run.addSpiritDirect({ id: 'game_mirror', name: 'game_mirror', isNegative: true, stackCount: 1, powerLevel: 1 }); // idx 1

    const step = mirrorStepFor(grm, 'game_mirror');
    expect(step).toBeDefined();
    expect(step.multiplyMult).toBe(2);
  });

  it('a regular Mirror still targets a regular left neighbour (unchanged)', () => {
    const { grm } = seedBrightCaptureRound();
    run.addSpirit({ id: 'sym_wolf',   name: 'sym_wolf',   stackCount: 1 }); // idx 0
    run.addSpirit({ id: 'game_mirror', name: 'game_mirror', stackCount: 1 }); // idx 1

    const step = mirrorStepFor(grm, 'game_mirror');
    expect(step).toBeDefined();
    expect(step.multiplyMult).toBe(2);
  });

  it('Memory targets a Negative to its right (rightmost non-self)', () => {
    const { grm } = seedBrightCaptureRound();
    run.addSpirit({ id: 'engine_memory', name: 'engine_memory', stackCount: 1 });                                  // idx 0
    run.addSpiritDirect({ id: 'sym_wolf', name: 'sym_wolf', isNegative: true, stackCount: 1, powerLevel: 1 });     // idx 1

    const step = mirrorStepFor(grm, 'engine_memory');
    expect(step).toBeDefined();
    expect(step.multiplyMult).toBe(2);
  });
});
