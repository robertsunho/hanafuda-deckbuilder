import { describe, it, expect } from 'vitest';
import run from '../src/systems/RunManager.js';

// G0-028 [FIX]: Sacred Groves must fire BEFORE rounds {3,6,...,36} (gear up before
// each act-closing round + the final round), and all 12 must occur. The old code
// used `_round - 1`, which fired Groves AFTER those rounds and let the run-complete
// check eat the 12th (before R36) — yielding only 11, after-not-before.

const GROVE_BEFORE = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

describe('G0-028 — Sacred Grove cadence (before-rounds, exactly 12)', () => {
  it('a Grove precedes each of rounds 3,6,...,36 — exactly 12 — and the run still ends after R36', () => {
    run.reset();
    expect(run.round).toBe(1);

    const groveBefore = [];
    // Finish rounds 1..36; advanceRound() sets _round to the next round to play.
    for (let played = 1; played <= 36; played++) {
      run.advanceRound(0);
      if (run.isRunComplete) break;          // after R36 -> _round 37 -> run over
      if (run.nextIsGrove) groveBefore.push(run.round);
    }

    expect(groveBefore).toEqual(GROVE_BEFORE); // before-not-after AND all 12 present
    expect(run.isRunComplete).toBe(true);      // run terminates after R36 (no endless run)
    expect(run.round).toBe(37);
  });

  it('the 12th Grove (before R36) is not preempted by the run-complete check', () => {
    run.reset();
    for (let played = 1; played <= 35; played++) run.advanceRound(0);
    expect(run.round).toBe(36);
    expect(run.isRunComplete).toBe(false);
    expect(run.nextIsGrove).toBe(true);        // Grove fires before the final round
  });
});
