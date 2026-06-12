import { describe, it, expect } from 'vitest';
import run from '../../src/systems/RunManager.js';
import GameRoundManager from '../../src/systems/GameRoundManager.js';
import SpiritEffects from '../../src/systems/SpiritEffects.js';
import { SPIRIT_CATALOG } from '../../src/data/spirits.js';

// F4.27-C — negative Cat-5 maturation pipeline (Past Life + Cuckoo Egg).
// Closes the transcend-continuity gap: a transcended Cat-5 spirit must mature
// (numerator >= denominator, accrued each round) and, on sale, fire its
// copy/hatch source-aware. The recon found this path inert four ways; these
// tests prove each piece (C1–C5) and the end-to-end (#6). Zero prior coverage.

const FUSION = SPIRIT_CATALOG.find(s => s.category === 'fusion_t2');

// ── C1: snapshot reseed (numerator from acquiredRound, not the dead roundsHeld) ──
describe('C1 — transcend snapshot seeds numerator from rounds held', () => {
  it('a Cat-5 spirit held N rounds transcends with a non-zero numerator', () => {
    run.reset();
    run._round = 0;
    // 3 stacks acquired at round 0 …
    run._acquireSpiritStack({ id: 'util_past_life', name: 'Past Life' }, 3, { skipSlotCheck: true });
    run._round = 3;
    // … 4th stack at round 3 cascade-transcends (snapshotPower = 3).
    run._acquireSpiritStack({ id: 'util_past_life', name: 'Past Life' }, 1, { skipSlotCheck: true });

    const neg = run.allSpirits.find(s => s.id === 'util_past_life');
    expect(neg.isNegative).toBe(true);
    expect(neg.powerLevel).toBe(4); // F4.26 Option B: powerLevel = stackCount (all 4 contribute, lossless)
    // 4 snapshotted elements (Option B): first 3 held 3 rounds, the 4th (catalyst) held 0 →
    // numerator 9 (NOT 0, the old roundsHeld bug).
    expect(neg.state.numerator).toBe(9);
    expect(neg.state.denominator).toBe(12); // powerLevel 4 × CAT5_MATURITY_ROUNDS 3
  });
});

// ── C2: negative onRoundEnd increments numerator; regular is a no-op ──
describe('C2 — round-end increments a negative numerator (regular no-op)', () => {
  it('onRoundEnd grows a negative numerator by 1 (direct hook + real dispatch)', () => {
    run.reset();
    run._round = 5;
    run.addSpiritDirect({
      id: 'util_past_life', name: 'Past Life', isNegative: true,
      stackCount: 1, powerLevel: 2, state: { numerator: 2, denominator: 6 }, acquiredRound: 0,
    });
    const neg = run.allSpirits[0];

    SpiritEffects.get('util_past_life').onRoundEnd({ spirit: neg });
    expect(neg.state.numerator).toBe(3);

    // Through the real GRM dispatch (_fireSpiritHook), as fired at round-over.
    new GameRoundManager()._fireSpiritHook('onRoundEnd');
    expect(neg.state.numerator).toBe(4);
  });

  it('a regular Cat-5 spirit is untouched by onRoundEnd (maturity derives from acquiredRound)', () => {
    run.reset();
    run._round = 2;
    run._acquireSpiritStack({ id: 'sym_cuckoo_egg', name: 'Cuckoo' }, 1, { skipSlotCheck: true });
    const reg = run.allSpirits.find(s => s.id === 'sym_cuckoo_egg' && !s.isNegative);
    const before = JSON.stringify(reg.elements);

    SpiritEffects.get('sym_cuckoo_egg').onRoundEnd({ spirit: reg });
    expect(JSON.stringify(reg.elements)).toBe(before); // no roundsHeld mutation
  });
});

// ── C3: Past Life negative sale gives an applyEngine negative copy valid (non-null) state ──
describe('C3 — negative Past Life sale creates a fresh-state negative copy (decision 5)', () => {
  it('an applyEngine negative target gets category-appropriate state, not null', () => {
    run.reset();
    run._round = 1;
    // Target: a Wildlife NEGATIVE (applyEngine — null state would break it).
    run.addSpiritDirect({
      id: 'engine_wildlife', name: 'Wildlife', isNegative: true,
      stackCount: 1, powerLevel: 1, state: { seenAnimals: [['x']] }, acquiredRound: 0,
    });
    // Copier: a matured negative Past Life at powerLevel 2.
    run.addSpiritDirect({
      id: 'util_past_life', name: 'Past Life', isNegative: true,
      stackCount: 1, powerLevel: 2, state: { numerator: 6, denominator: 6 }, acquiredRound: 0,
    });
    const pastLife = run.allSpirits.find(s => s.id === 'util_past_life');

    run.forcePastLifeTarget('engine_wildlife');
    run.fireCat5SaleEffects(pastLife);

    const copies = run.allSpirits.filter(s => s.id === 'engine_wildlife' && s.isNegative);
    expect(copies.length).toBe(2); // original + the parallel copy
    const copy = copies[copies.length - 1];
    expect(copy.powerLevel).toBe(2);                       // copier's powerLevel
    expect(copy.state).not.toBeNull();                     // the [FIX] — was state: null
    expect(Array.isArray(copy.state.seenAnimals)).toBe(true);
    expect(copy.state.seenAnimals.length).toBe(2);         // 2 fresh (empty) per-power arrays
    expect(copy.state.seenAnimals.every(a => a.length === 0)).toBe(true); // fresh zero-state (Option A)
  });
});

// ── C4: source-aware Cuckoo hatch (negative source → negative fusion) ──
describe('C4 — Cuckoo hatch is source-aware (decision 7)', () => {
  it('a negative Cuckoo hatches a NEGATIVE fusion at the copier powerLevel', () => {
    run.reset();
    run._round = 1;
    run.addSpiritDirect({
      id: 'sym_cuckoo_egg', name: 'Cuckoo', isNegative: true,
      stackCount: 1, powerLevel: 2, state: { numerator: 6, denominator: 6 }, acquiredRound: 0,
    });
    const cuckoo = run.allSpirits[0];

    run.forceCuckooHatchTarget(FUSION.id);
    run.fireCat5SaleEffects(cuckoo);

    const hatched = run.allSpirits.find(s => s.id === FUSION.id);
    expect(hatched).toBeDefined();
    expect(hatched.isNegative).toBe(true); // NEGATIVE fusion (was always regular before)
    expect(hatched.powerLevel).toBe(2);    // copier's powerLevel
  });

  it('a regular Cuckoo still hatches a REGULAR fusion (unchanged) [PRESERVE]', () => {
    run.reset();
    run._round = 5;
    run._acquireSpiritStack({ id: 'sym_cuckoo_egg', name: 'Cuckoo' }, 1, { skipSlotCheck: true });
    const reg = run.allSpirits.find(s => s.id === 'sym_cuckoo_egg' && !s.isNegative);
    reg.elements[0].acquiredRound = 0; // held 5 rounds → mature

    run.forceCuckooHatchTarget(FUSION.id);
    run.fireCat5SaleEffects(reg, { soldElements: reg.elements.slice(-1) });

    const hatched = run.allSpirits.find(s => s.id === FUSION.id);
    expect(hatched).toBeDefined();
    expect(hatched.isNegative).toBeFalsy(); // regular path unchanged
  });
});

// ── C5: regular Past Life sale [PRESERVE] + maturity gate ──
describe('C5 — shared sale-effects helper preserves the regular path', () => {
  it('a matured regular Past Life sold fires one copy per mature element', () => {
    run.reset();
    run._round = 5;
    run._acquireSpiritStack({ id: 'util_past_life', name: 'Past Life' }, 2, { skipSlotCheck: true });
    run._acquireSpiritStack({ id: 'sym_wolf', name: 'sym_wolf' }, 1, { skipSlotCheck: true });
    const pastLife = run.allSpirits.find(s => s.id === 'util_past_life');
    pastLife.elements.forEach(el => { el.acquiredRound = 0; }); // both mature (held 5)

    run.forcePastLifeTarget('sym_wolf');
    run.fireCat5SaleEffects(pastLife, { soldElements: pastLife.elements.slice(-2) });

    const wolf = run.allSpirits.find(s => s.id === 'sym_wolf' && !s.isNegative);
    expect(wolf.stackCount).toBe(3); // 1 base + 2 copies (one per mature element)
  });

  it('an immature negative does NOT fire on sale (the maturity gate)', () => {
    run.reset();
    run._round = 1;
    run.addSpiritDirect({
      id: 'sym_cuckoo_egg', name: 'Cuckoo', isNegative: true,
      stackCount: 1, powerLevel: 2, state: { numerator: 2, denominator: 6 }, acquiredRound: 0,
    });
    const cuckoo = run.allSpirits[0];
    run.forceCuckooHatchTarget(FUSION.id);
    run.fireCat5SaleEffects(cuckoo);

    expect(run.allSpirits.find(s => s.id === FUSION.id)).toBeUndefined(); // not mature → no hatch
  });
});

// ── #6: end-to-end — the transcend-continuity gap, closed ──
describe('#6 — transcend → hold → mature → sell fires the negative hatch', () => {
  it('a transcended Cuckoo accrues to maturity over rounds, then hatches a negative fusion', () => {
    run.reset();
    run._round = 0;
    run._acquireSpiritStack({ id: 'sym_cuckoo_egg', name: 'Cuckoo' }, 3, { skipSlotCheck: true });
    run._round = 1;
    run._acquireSpiritStack({ id: 'sym_cuckoo_egg', name: 'Cuckoo' }, 1, { skipSlotCheck: true }); // transcend

    const neg = run.allSpirits.find(s => s.id === 'sym_cuckoo_egg');
    expect(neg.isNegative).toBe(true);
    // C1: seeded from rounds held — 4 elements (Option B, powerLevel 4): first 3 held 1 round, the
    // 4th (catalyst) held 0 → numerator 3, denom 12 (powerLevel 4 × 3). Not yet mature.
    expect(neg.state.numerator).toBe(3);
    expect(neg.state.numerator < neg.state.denominator).toBe(true);

    // C2: accrue through the real round-end dispatch until mature (denom 12 now → 9 accruals to 3+9=12).
    const grm = new GameRoundManager();
    for (let i = 0; i < 9; i++) grm._fireSpiritHook('onRoundEnd');
    expect(neg.state.numerator).toBe(12);
    expect(neg.state.numerator >= neg.state.denominator).toBe(true); // mature

    // C5 + C4: sell the matured negative → negative fusion hatches at copier powerLevel.
    run.forceCuckooHatchTarget(FUSION.id);
    run.fireCat5SaleEffects(neg);
    const hatched = run.allSpirits.find(s => s.id === FUSION.id && s.isNegative);
    expect(hatched).toBeDefined();
    expect(hatched.powerLevel).toBe(neg.powerLevel);
  });
});
