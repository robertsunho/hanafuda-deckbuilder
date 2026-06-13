import { describe, it, expect, vi } from 'vitest';
import { makeRound, equipSpiritWithState } from './helpers.js';
import run from '../src/systems/RunManager.js';
import logger from '../src/systems/GameplayLogger.js';
import { getCardPoints } from '../src/systems/CardMutations.js';
import { baseCards } from '../src/data/cards.js';

// F3.16a characterization — the [PRESERVE] safety net for the struct-only breakdown dedup.
// Locks the logCaptureScoring payload fields produced by the two extracted helpers
// (_initCardBreakdown → per-card cardName/meta/basePoints; _engineBreakdownEntry →
// engineSpirits source/addPoints/addMult/multiplyMult) across BOTH scoring paths
// (_addCapture and _scoreFieldCards). Green before AND after the extraction.

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const fresh = (id) => JSON.parse(JSON.stringify(baseCards.find(c => c.id === id)));
const FOUR = () => ['january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1'].map(fresh);

describe('_addCapture threading characterization (capstones + held + spirit) [PRESERVE]', () => {
  // Pins the THREADED numbers (not just struct fields): held-in-hand metal mult, capstone
  // universe mirroring + yin-yang 2x triggers, the points-direct model. Closes a coverage gap
  // (the threading was previously untested) — the safety net for any scoring-pipeline refactor.
  // Deterministic: Iron (base) held card has no Meteorite jackpot RNG.
  it('totals are stable (188 pts × 17.5 mult × 1.0 flow = 3290)', () => {
    const { grm } = makeRound({ spiritIds: ['rank_salt'], deckCardIds: DECK });
    run.addLegendarySpirit({ id: 'capstone_universe', name: 'Universe' });
    run.addLegendarySpirit({ id: 'capstone_yinyang', name: 'Yin-Yang' });
    grm.hand.getAll()[0].enhancement = { element: 'metal', tier: 'base' }; // held Iron
    const spy = vi.spyOn(logger, 'logCaptureScoring');

    grm._addCapture(FOUR());

    const p = spy.mock.calls[0][0];
    // Golden values pinned from the pre-extraction baseline (flow 1.0 → 188 × 17.5 = 3290).
    expect(p.totalPoints).toBe(188);
    expect(p.totalMult).toBeCloseTo(17.5, 5);
    expect(p.captureScore).toBe(3290);
    spy.mockRestore();
  });
});

describe('F3.16a — breakdown-struct characterization (logCaptureScoring payload)', () => {
  it('capture path: _initCardBreakdown fields + _engineBreakdownEntry (regular, stack 1)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_missing_number'], deckCardIds: DECK });
    equipSpiritWithState('engine_missing_number', { elements: [{ totalStacks: 0 }] });
    const spy = vi.spyOn(logger, 'logCaptureScoring');

    const cards = FOUR();
    grm._addCapture(cards);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // _initCardBreakdown output — one entry per captured card.
    expect(payload.cardBreakdowns).toHaveLength(4);
    payload.cardBreakdowns.forEach((cb, i) => {
      expect(cb.cardName).toBe(cards[i].name ?? cards[i].id);
      expect(cb.meta).toBe(`${cards[i].type}, month ${cards[i].month}`);
      expect(cb.basePoints).toBe(getCardPoints(cards[i]));
      expect(Array.isArray(cb.contributions)).toBe(true);
      expect(typeof cb.totalCardPts).toBe('number');
    });

    // _engineBreakdownEntry output — missing_number fires at stack 1 → addMult 5.
    const eng = payload.captureLevel.engineSpirits.find(e => e.name === 'engine_missing_number');
    expect(eng).toEqual({
      kind: 'spirit', name: 'engine_missing_number', power: 1, phase: 'engine',
      addPoints: 0, addMult: 5, multiplyMult: 1,
    });

    spy.mockRestore();
  });

  it('capture path: _engineBreakdownEntry labels a transcended copy (power 4 = effectivePower)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_missing_number', name: 'Missing Number', isNegative: true, stackCount: 1, powerLevel: 4,
      state: { key: 'totalStacks', preTranscendTotal: 1, oldestAtTranscend: 0, newEvents: 0 },
    });
    const spy = vi.spyOn(logger, 'logCaptureScoring');

    grm._addCapture(FOUR());

    const payload = spy.mock.calls[0][0];
    const eng = payload.captureLevel.engineSpirits.find(e => e.name === 'Missing Number');
    expect(eng).toBeDefined();
    // powerLevel 4 → effectivePower 4 → power: 4 (structured); r passes through unchanged.
    expect(eng.kind).toBe('spirit');
    expect(eng.power).toBe(4);
    expect(eng.phase).toBe('engine');
    expect(eng.addPoints).toBe(0);
    expect(eng.multiplyMult).toBe(1);
    expect(typeof eng.addMult).toBe('number');
    expect(eng.addMult).toBeGreaterThan(0);

    spy.mockRestore();
  });

  it('field path: _scoreFieldCards emits the same struct shapes (phase field_end)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_missing_number'], deckCardIds: DECK });
    equipSpiritWithState('engine_missing_number', { elements: [{ totalStacks: 1 }] });
    run.setHexagram('hex_01'); // score_field_at_round_end
    const spy = vi.spyOn(logger, 'logCaptureScoring');

    const fieldCards = grm.field.getAll();
    grm._scoreFieldCards();

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];
    expect(payload.phase).toBe('field_end');

    // _initCardBreakdown output — one entry per field card.
    expect(payload.cardBreakdowns).toHaveLength(fieldCards.length);
    payload.cardBreakdowns.forEach((cb, i) => {
      expect(cb.cardName).toBe(fieldCards[i].name ?? fieldCards[i].id);
      expect(cb.meta).toBe(`${fieldCards[i].type}, month ${fieldCards[i].month}`);
      expect(cb.basePoints).toBe(getCardPoints(fieldCards[i]));
    });

    // _engineBreakdownEntry output — same shape on the field path.
    const eng = payload.captureLevel.engineSpirits.find(e => e.name === 'engine_missing_number');
    expect(eng).toEqual({
      kind: 'spirit', name: 'engine_missing_number', power: 1, phase: 'engine',
      addPoints: 0, addMult: 5, multiplyMult: 1,
    });

    spy.mockRestore();
  });
});
