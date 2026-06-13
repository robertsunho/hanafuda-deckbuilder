import { describe, it, expect } from 'vitest';
import { makeRound } from './helpers.js';
import run from '../src/systems/RunManager.js';
import SpiritEffects from '../src/systems/SpiritEffects.js';
import { getSpiritContrib } from '../src/scenes/shared/spiritTooltip.js';

// ─────────────────────────────────────────────────────────────────────────────
// F4.37 C1+C2 — Tooltip value-equality harness ([PRESERVE value] net for Arch B).
//
// Architecture B keeps the tooltip's input-count narration but DERIVES the
// displayed VALUE from applyEngine instead of hand-computing it. This harness is
// the safety net: it asserts the value the tooltip RENDERS equals what
// applyEngine returns (or the identity ×1.00 / +0 on a null/inert engine), at
// several stack/state configs per engine-block branch. It must be GREEN against
// the hardcoded branches (proving it measures the right thing — no pre-existing
// drift) AND after the B rewrite (proving B preserves the displayed value).
//
// Headless: getSpiritContrib is a pure function of spirit/state + the run
// singleton; the import graph is browser-free (same as the existing suite).
// Branch-agnostic: assertVE reads the rendered value token (× or +), compares it
// to applyEngine's matching field at the token's OWN precision, so it works for
// every shape (multiplyMult/addMult, any toFixed) without per-branch encoding.
// ─────────────────────────────────────────────────────────────────────────────

const DECK = ['september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1'];

/** Equip a regular spirit (optionally multi-stack), seed its state via `mutate`, return it live. */
function regular(id, mutate, stackCount = 1) {
  makeRound({ spirits: [{ id, stackCount }], deckCardIds: DECK });
  const s = run.allSpirits.find(x => x.id === id);
  mutate(s);
  return s;
}

/** Add a Negative copy directly with explicit state; return it live. */
function negative(spec) {
  makeRound({ spiritIds: [], deckCardIds: DECK });
  run.addSpiritDirect({ stackCount: 1, ...spec });
  return run.allSpirits.find(x => x.id === spec.id && x.isNegative);
}

/**
 * The [PRESERVE value] assertion. Parse the rendered "×N mult" / "+N mult" value
 * token, then assert applyEngine's matching field — formatted to the token's own
 * decimal precision — produces the SAME string. Identity on null: ×→1, +→0.
 * Returns the engine value (so callers can also assert the identity numerically).
 */
function assertVE(spirit, opts = {}) {
  const contrib = getSpiritContrib(spirit, opts);
  // Engine value lines are "<narration>  →  ×N mult" / "+N mult". Anchor on the
  // arrow so a per-card spirit's DESCRIPTION line (e.g. kintaro's onCardScored
  // fallback "×0.1 mult-mult per Gold") can't be mistaken for the engine value.
  // Take the LAST such line — the engine block runs after the per-card block.
  const matches = [...(contrib ?? '').matchAll(/→\s*([×+])([\d.]+)\s+mult/g)];
  const m = matches.at(-1);
  if (!m) throw new Error(`No "→ ×N mult" value line for ${spirit.id}${spirit.isNegative ? ' (neg)' : ''}:\n${contrib}`);
  const [, symbol, token] = m;
  const decimals = (token.split('.')[1] ?? '').length;
  const r = SpiritEffects.get(spirit.id).applyEngine({ spirit, mult: 1.0, points: 0, spirits: run.spirits });
  const field = symbol === '×' ? 'multiplyMult' : 'addMult';
  const identity = symbol === '×' ? 1 : 0;
  const engineVal = r?.[field] ?? identity;
  expect(engineVal.toFixed(decimals)).toBe(token);
  return engineVal;
}

// ── Dual-tier multiplyMult: glacier (C1 pilot) + carbon/fossil/moths ──────────
describe('F4.37 — dual-tier multiplyMult engines', () => {
  for (const id of ['engine_glacier', 'engine_carbon', 'engine_fossil', 'engine_moths']) {
    it(`${id} regular (t1=3, t2=2)`, () => {
      assertVE(regular(id, s => { s.elements = [{ t1Procs: 3, t2Procs: 2 }]; }));
    });
    it(`${id} regular 2-stack aggregates across elements`, () => {
      assertVE(regular(id, s => { s.elements = [{ t1Procs: 2, t2Procs: 1 }, { t1Procs: 1, t2Procs: 1 }]; }, 2));
    });
    it(`${id} regular zero → identity ×1.00 (applyEngine null)`, () => {
      expect(assertVE(regular(id, s => { s.elements = [{ t1Procs: 0, t2Procs: 0 }]; }))).toBe(1);
    });
    it(`${id} negative transcended`, () => {
      assertVE(negative({ id, name: id, isNegative: true, powerLevel: 2,
        state: { key1: 't1Procs', key2: 't2Procs', preTranscendTotal: 1.5, oldestAtTranscend: 0, newEvents1: 2, newEvents2: 1 } }));
    });
    it(`${id} negative sub-threshold (t<=1) → identity ×1.00`, () => {
      expect(assertVE(negative({ id, name: id, isNegative: true, powerLevel: 1,
        state: { key1: 't1Procs', key2: 't2Procs', preTranscendTotal: 1, oldestAtTranscend: 0, newEvents1: 0, newEvents2: 0 } }))).toBe(1);
    });
  }
});

// ── velocity: exponential multiplyMult (1 + iron*k)*pow(1.5,t2) ───────────────
describe('F4.37 — engine_velocity (exponential)', () => {
  it('regular, t2 procs, no iron', () => {
    assertVE(regular('engine_velocity', s => { s.elements = [{ t2Procs: 2 }]; }));
  });
  it('regular, with iron in deck (exercises the (1+iron*k) term)', () => {
    const s = regular('engine_velocity', x => { x.elements = [{ t2Procs: 1 }]; });
    run.getDeck()[0].enhancement = { element: 'metal', tier: 'base' };
    assertVE(s);
  });
  it('regular zero → identity ×1.00', () => {
    expect(assertVE(regular('engine_velocity', s => { s.elements = [{ t2Procs: 0 }]; }))).toBe(1);
  });
  it('negative transcended', () => {
    assertVE(negative({ id: 'engine_velocity', name: 'Velocity', isNegative: true, powerLevel: 2,
      state: { t2ProcsAtTranscend: 1, newT2Procs: 1 } }));
  });
  it('negative inert → identity ×1.00', () => {
    expect(assertVE(negative({ id: 'engine_velocity', name: 'Velocity', isNegative: true, powerLevel: 1,
      state: { t2ProcsAtTranscend: 0, newT2Procs: 0 } }))).toBe(1);
  });
});

// ── Accumulator multiplyMult: radiance/wildlife/banner/plenty (1 + n*k) ───────
describe('F4.37 — accumulator multiplyMult engines', () => {
  const ACC = { engine_radiance: 'seenBrights', engine_wildlife: 'seenAnimals',
                engine_banner: 'seenRibbons', engine_plenty: 'seenPlains' };
  for (const [id, key] of Object.entries(ACC)) {
    it(`${id} regular (3 seen)`, () => {
      assertVE(regular(id, s => { s.elements = [{ [key]: ['a', 'b', 'c'] }]; }));
    });
    it(`${id} regular empty → identity ×1.00`, () => {
      expect(assertVE(regular(id, s => { s.elements = [{ [key]: [] }]; }))).toBe(1);
    });
    it(`${id} negative (3 seen)`, () => {
      assertVE(negative({ id, name: id, isNegative: true, powerLevel: 1, state: { [key]: [['a', 'b', 'c']] } }));
    });
  }
});

// ── Single-key linear multiplyMult: palace/ship/kintaro/algae + bullseye ──────
describe('F4.37 — single-key linear multiplyMult engines', () => {
  const LIN = { engine_palace: 'cardsAdded', engine_ship: 'cardsDiscarded',
                engine_kintaro: 'goldsConsumed', sym_algae: 'summonCount' };
  for (const [id, key] of Object.entries(LIN)) {
    it(`${id} regular`, () => {
      assertVE(regular(id, s => { s.elements = [{ [key]: 4 }]; }));
    });
    it(`${id} zero → identity ×1.00`, () => {
      expect(assertVE(regular(id, s => { s.elements = [{ [key]: 0 }]; }))).toBe(1);
    });
    it(`${id} negative transcended`, () => {
      assertVE(negative({ id, name: id, isNegative: true, powerLevel: 2,
        state: { key, preTranscendTotal: 1.5, oldestAtTranscend: 0, newEvents: 2 } }));
    });
  }

  it('engine_bullseye regular (extra progress narration retained)', () => {
    assertVE(regular('engine_bullseye', s => { s.elements = [{ qualifiedCount: 2 }]; }));
  });
  it('engine_bullseye zero → identity ×1.00', () => {
    expect(assertVE(regular('engine_bullseye', s => { s.elements = [{ qualifiedCount: 0 }]; }))).toBe(1);
  });
  it('engine_bullseye negative transcended', () => {
    assertVE(negative({ id: 'engine_bullseye', name: 'Bullseye', isNegative: true, powerLevel: 2,
      state: { key: 'qualifiedCount', preTranscendTotal: 1, oldestAtTranscend: 0, newEvents: 2 } }));
  });

  it('sym_ducks regular (net deck-flip)', () => {
    assertVE(regular('sym_ducks', s => { s.state = { multValue: 3 }; }));
  });
  it('sym_ducks zero → identity ×1.00', () => {
    expect(assertVE(regular('sym_ducks', s => { s.state = { multValue: 0 }; }))).toBe(1);
  });
});

// ── Single-key linear addMult: devotion/habitat/ceremony/agriculture/lincoln/ ─
//    napoleon/missing_number + sym_ants/sym_snails ────────────────────────────
describe('F4.37 — single-key linear addMult engines', () => {
  const ADD = { engine_devotion: 'totalScored', engine_habitat: 'totalScored',
                engine_ceremony: 'totalScored', engine_agriculture: 'totalScored',
                engine_lincoln: 'banks', engine_napoleon: 'pushFails',
                engine_missing_number: 'totalStacks', sym_ants: 'totalPlayed',
                sym_snails: 'totalUnplayed' };
  for (const [id, key] of Object.entries(ADD)) {
    it(`${id} regular`, () => {
      assertVE(regular(id, s => { s.elements = [{ [key]: 3 }]; }));
    });
    it(`${id} zero → identity +0`, () => {
      expect(assertVE(regular(id, s => { s.elements = [{ [key]: 0 }]; }))).toBe(0);
    });
    it(`${id} negative`, () => {
      assertVE(negative({ id, name: id, isNegative: true, powerLevel: 2,
        state: { key, preTranscendTotal: 0, oldestAtTranscend: 0, newEvents: 2 } }));
    });
  }
});

// ── C3 Part 2: engine_surplus tooltip follows the effect (×stacks) [FIX value] ─
// Value-CHANGING (not PRESERVE): the old tooltip ignored stacks. assertVE asserts
// the new tooltip === applyEngine; the explicit numbers pin the before→after flip.
describe('F4.37 C3 — engine_surplus tooltip ×stacks [FIX]', () => {
  it('2-stack, ki=6 → +4 mult (was +2; now matches applyEngine)', () => {
    makeRound({ spirits: [{ id: 'engine_surplus', stackCount: 2 }], deckCardIds: DECK });
    run._ki = 6;
    const s = run.allSpirits.find(x => x.id === 'engine_surplus');
    expect(SpiritEffects.get('engine_surplus').applyEngine({ spirit: s }).addMult).toBe(4); // floor(6/3)*2
    expect(assertVE(s)).toBe(4);
  });
  it('1-stack, ki=6 → +2 mult (unchanged at 1-stack)', () => {
    makeRound({ spirits: [{ id: 'engine_surplus', stackCount: 1 }], deckCardIds: DECK });
    run._ki = 6;
    expect(assertVE(run.allSpirits.find(x => x.id === 'engine_surplus'))).toBe(2);
  });
});

// ── C3 Part 4: out-of-block engines migrated to B [PRESERVE value] ────────────
// These hardcoded scaling that duplicated their applyEngine. Now derive it.
// (They also render a bare fallback "×N mult" line with no arrow — assertVE
// anchors on the arrow, so it targets the narrated legendary/symbiont line.)
describe('F4.37 C3 Part 4 — wuji + badger (counter engines)', () => {
  it('engine_wuji regular', () => {
    assertVE(regular('engine_wuji', s => { s.elements = [{ destroyed: 4 }]; }));
  });
  it('engine_wuji zero → identity ×1.00', () => {
    expect(assertVE(regular('engine_wuji', s => { s.elements = [{ destroyed: 0 }]; }))).toBe(1);
  });
  it('engine_wuji negative transcended', () => {
    assertVE(negative({ id: 'engine_wuji', name: 'Wuji', isNegative: true, powerLevel: 2,
      state: { key: 'destroyed', preTranscendTotal: 1.5, oldestAtTranscend: 0, newEvents: 2 } }));
  });
  it('sym_badger regular', () => {
    assertVE(regular('sym_badger', s => { s.elements = [{ consumablesUsed: 3 }]; }));
  });
  it('sym_badger zero → identity +0', () => {
    expect(assertVE(regular('sym_badger', s => { s.elements = [{ consumablesUsed: 0 }]; }))).toBe(0);
  });
  it('sym_badger negative', () => {
    assertVE(negative({ id: 'sym_badger', name: 'Badger', isNegative: true, powerLevel: 2,
      state: { key: 'consumablesUsed', preTranscendTotal: 0, oldestAtTranscend: 0, newEvents: 2 } }));
  });
});

describe('F4.37 C3 Part 4 — dao/chi/tengu/feng_shui (run-state engines)', () => {
  // Value derives from run state (deck / flow / spirit count / empty slots);
  // assertVE confirms tooltip === applyEngine since both read the same run state.
  it('engine_dao (unaltered deck count)', () => {
    makeRound({ spirits: [{ id: 'engine_dao', stackCount: 1 }], deckCardIds: DECK });
    assertVE(run.allSpirits.find(x => x.id === 'engine_dao'));
  });
  it('engine_chi (flow × stacks)', () => {
    makeRound({ spirits: [{ id: 'engine_chi', stackCount: 2 }], deckCardIds: DECK });
    assertVE(run.allSpirits.find(x => x.id === 'engine_chi'));
  });
  it('engine_tengu (spirit + negative count)', () => {
    makeRound({ spirits: [{ id: 'engine_tengu', stackCount: 1 }], deckCardIds: DECK });
    assertVE(run.allSpirits.find(x => x.id === 'engine_tengu'));
  });
  it('engine_feng_shui (empty slots)', () => {
    makeRound({ spirits: [{ id: 'engine_feng_shui', stackCount: 1 }], deckCardIds: DECK });
    assertVE(run.allSpirits.find(x => x.id === 'engine_feng_shui'));
  });
});
