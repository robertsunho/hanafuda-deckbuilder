import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from './helpers.js';
import run from '../src/systems/RunManager.js';
import SpiritEffects from '../src/systems/SpiritEffects.js';
import { getSpiritContrib } from '../src/scenes/shared/spiritTooltip.js';

// ─────────────────────────────────────────────────────────────────────────────
// F4.37 C1 — Tooltip value-equality harness ([PRESERVE value] net for Architecture B).
//
// Architecture B keeps the tooltip's input-count narration but DERIVES the
// displayed VALUE from applyEngine instead of hand-computing it. This harness is
// the safety net: it asserts the value the tooltip RENDERS equals what
// applyEngine returns (or the identity ×1.00 on a null/inert engine), at several
// stack/state configs. It must be GREEN against the current hardcoded branch
// (proving it measures the right thing — the hardcoded value already equals
// applyEngine) AND after the B rewrite (proving B preserves the displayed value).
//
// Headless: getSpiritContrib is a pure function of spirit/state + the run
// singleton; the import graph is browser-free (same as the existing suite).
// Reusable for C2: drive any engine spirit through `expectTooltipMatchesEngine`.
// ─────────────────────────────────────────────────────────────────────────────

/** Engine value (single source of truth): applyEngine's multiplyMult, or the identity on null/inert. */
function engineMult(spirit) {
  const fx = SpiritEffects.get(spirit.id);
  const r = fx.applyEngine({ spirit, mult: 1.0, points: 0, spirits: run.spirits });
  return r?.multiplyMult ?? 1;
}

/** The value the tooltip actually renders, parsed back out of the "×N.NN mult-mult" line. */
function displayedMult(spirit) {
  const contrib = getSpiritContrib(spirit);
  const m = contrib?.match(/×([\d.]+)\s+mult-mult/);
  if (!m) throw new Error(`No "×N mult-mult" line in tooltip for ${spirit.id}:\n${contrib}`);
  return parseFloat(m[1]);
}

/** The [PRESERVE value] assertion: rendered value === engine value (both rounded to the display's 2dp). */
function expectTooltipMatchesEngine(spirit) {
  const engine = engineMult(spirit);
  expect(displayedMult(spirit)).toBeCloseTo(parseFloat(engine.toFixed(2)), 5);
  return engine;
}

const DECK = ['september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1'];

describe('F4.37 C1 — engine_glacier tooltip value === applyEngine value', () => {
  it('regular, zero state (t1=t2=0) → identity ×1.00 (applyEngine null case)', () => {
    makeRound({ spiritIds: ['engine_glacier'], deckCardIds: DECK });
    const s = equipSpiritWithState('engine_glacier', { elements: [{ t1Procs: 0, t2Procs: 0 }] });
    const v = expectTooltipMatchesEngine(s);
    expect(v).toBe(1);   // null → identity
  });

  it('regular, t1=3 t2=2 → ×(1 + 3*0.2 + 2*0.4) = ×2.40', () => {
    makeRound({ spiritIds: ['engine_glacier'], deckCardIds: DECK });
    const s = equipSpiritWithState('engine_glacier', { elements: [{ t1Procs: 3, t2Procs: 2 }] });
    const v = expectTooltipMatchesEngine(s);
    expect(v).toBeCloseTo(2.4, 5);
  });

  it('regular, 2-stack aggregates t1/t2 across both elements', () => {
    makeRound({ spirits: [{ id: 'engine_glacier', stackCount: 2 }], deckCardIds: DECK });
    const s = equipSpiritWithState('engine_glacier', {
      elements: [{ t1Procs: 2, t2Procs: 1 }, { t1Procs: 1, t2Procs: 1 }],
    });
    // aggregate t1=3, t2=2 → same 2.40; equality is what matters, not the literal.
    const v = expectTooltipMatchesEngine(s);
    expect(v).toBeCloseTo(2.4, 5);
  });

  it('isNegative transcended (preTranscendTotal + newEvents) → transcendence value', () => {
    makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_glacier', name: 'Glacier', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key1: 't1Procs', key2: 't2Procs', preTranscendTotal: 1.5, oldestAtTranscend: 0,
               newEvents1: 2, newEvents2: 1 },
    });
    const s = run.allSpirits.find(x => x.id === 'engine_glacier' && x.isNegative);
    // 1.5 + 2*0.2*2 + 1*0.4*2 = 1.5 + 0.8 + 0.8 = 3.10
    const v = expectTooltipMatchesEngine(s);
    expect(v).toBeCloseTo(3.1, 5);
  });

  it('isNegative sub-threshold (t<=1) → identity ×1.00 (applyEngine null case)', () => {
    makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_glacier', name: 'Glacier', isNegative: true, stackCount: 1, powerLevel: 1,
      state: { key1: 't1Procs', key2: 't2Procs', preTranscendTotal: 1, oldestAtTranscend: 0,
               newEvents1: 0, newEvents2: 0 },
    });
    const s = run.allSpirits.find(x => x.id === 'engine_glacier' && x.isNegative);
    const v = expectTooltipMatchesEngine(s);
    expect(v).toBe(1);   // t === 1 → null → identity
  });
});
