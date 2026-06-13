import { describe, it, expect, vi } from 'vitest';
import { makeRound, equipSpiritWithState } from './helpers.js';
import logger from '../src/systems/GameplayLogger.js';
import { baseCards } from '../src/data/cards.js';

// Regression for the legend_* → engine_*/util_* ID rename (test-blind campaign).
// The 6 demoted rares + northern_lion had ZERO test coverage — which is how the stale
// `legend_` prefix misled a recon into a phantom "legendary engine bug". This pins the
// heaviest renamed unit: engine_wuji (formerly legend_wuji), an accumulator with the
// NEGATIVE_SNAPSHOT + ACCUMULATOR_SPIRIT_IDS + init-state triple-registry. If any of those
// keys had failed to flip with the def, its applyEngine would silently no-op here.

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

describe('ID rename regression — renamed spirits still fire after legend_ → engine_/util_', () => {
  it('engine_wuji (was legend_wuji): accumulator applyEngine lands multiplyMult in the breakdown', () => {
    const { grm } = makeRound({ spiritIds: ['engine_wuji'], deckCardIds: DECK });
    equipSpiritWithState('engine_wuji', { elements: [{ destroyed: 2 }] });
    const spy = vi.spyOn(logger, 'logCaptureScoring');

    grm._addCapture(FOUR());

    const payload = spy.mock.calls[0][0];
    const eng = payload.captureLevel.engineSpirits.find(e => e.name === 'engine_wuji');
    expect(eng).toBeDefined();              // effect key + accumulator id resolved under the NEW id
    expect(eng).toMatchObject({ kind: 'spirit', name: 'engine_wuji', power: 1, phase: 'engine' });
    expect(eng.multiplyMult).toBeCloseTo(1.6, 5); // 1 + destroyed(2) × 0.3

    spy.mockRestore();
  });

  it('engine_chi (was legend_chi): stateless flow engine still fires', () => {
    const { grm } = makeRound({ spiritIds: ['engine_chi'], deckCardIds: DECK });
    const spy = vi.spyOn(logger, 'logCaptureScoring');

    grm._addCapture(FOUR());

    const payload = spy.mock.calls[0][0];
    const eng = payload.captureLevel.engineSpirits.find(e => e.name === 'engine_chi');
    expect(eng).toBeDefined();              // multiplyMult = flow × stacks (flow ≥ 0 → entry present)
    spy.mockRestore();
  });
});
