import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from './helpers.js';
import run, { aggregateNumericState } from '../src/systems/RunManager.js';

// [FIX] proof for Campaign 1 — _scoreFieldCards now routes through the shared _scorePipeline,
// so the hex_01 (score_field_at_round_end) field-scoring path GAINS the mechanics it lacked.
// Before convergence: onCardSeen never fired in the field path (accumulators frozen — dead-build)
// and capstones no-op'd. After: both apply by construction.

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

describe('Field-path alignment C1 [FIX] — field scoring gains the shared pipeline', () => {
  it('onCardSeen accumulator ADVANCES under field scoring (was frozen — dead-build fix)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_agriculture'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_agriculture', { elements: [{ totalScored: 0 }] });
    run.setHexagram('hex_01'); // score_field_at_round_end

    const plainCount = grm.field.getAll().filter(c => c.type === 'plain').length;
    expect(plainCount).toBeGreaterThan(0);

    grm._scoreFieldCards();

    // Pre-convergence this stayed 0 (onCardSeen never ran in the field path). Now it accrues
    // one per field plain scored — the engine that was silently dead under hex_01 now works.
    expect(aggregateNumericState(spirit, 'totalScored')).toBe(plainCount);
  });

  it('capstone yin-yang now DOUBLES field-scoring triggers (capstones no longer no-op)', () => {
    const { grm } = makeRound({ spiritIds: ['engine_agriculture'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_agriculture', { elements: [{ totalScored: 0 }] });
    run.addLegendarySpirit({ id: 'capstone_yinyang', name: 'Yin-Yang' });
    run.setHexagram('hex_01');

    const plainCount = grm.field.getAll().filter(c => c.type === 'plain').length;
    grm._scoreFieldCards();

    // yin-yang fires each spirit's onCardSeen twice → 2× accumulation. Absent before convergence.
    expect(aggregateNumericState(spirit, 'totalScored')).toBe(plainCount * 2);
  });
});
