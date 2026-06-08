import { describe, it, expect, beforeEach } from 'vitest';
import run from '../../src/systems/RunManager.js';
import { getWaterMult } from '../../src/systems/HexagramEffects.js';

// Water-dep single source of truth: getWaterMult is now the SOLE representation
// (scoring + tooltips + badges + the playtest logger all read it; the ScoringEngine
// SNOW_MULT/ICE_MULT arrays were deleted in F4.34, and GameplayLogger re-derives
// from here). Lock the default-rate curve the logger now depends on.

describe('getWaterMult — Water-dep single source of truth (no active hex)', () => {
  beforeEach(() => run.reset());

  it('Snow (base): 2.0 − 0.25·dep, floor 0.5', () => {
    expect(getWaterMult('base', 0)).toBe(2.0);
    expect(getWaterMult('base', 1)).toBe(1.75);
    expect(getWaterMult('base', 4)).toBe(1.0);
    expect(getWaterMult('base', 6)).toBe(0.5);   // floor
    expect(getWaterMult('base', 99)).toBe(0.5);  // floored
  });

  it('Ice (upgraded): 4.0 − 0.5·dep, floor 0.25', () => {
    expect(getWaterMult('upgraded', 0)).toBe(4.0);
    expect(getWaterMult('upgraded', 1)).toBe(3.5);
    expect(getWaterMult('upgraded', 8)).toBe(0.25);   // floor
    expect(getWaterMult('upgraded', 99)).toBe(0.25);  // floored
  });
});
