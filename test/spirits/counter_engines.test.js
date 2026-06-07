import { describe, it, expect } from 'vitest';
import { makeRound, equipSpiritWithState } from '../helpers.js';
import run, { aggregateNumericState } from '../../src/systems/RunManager.js';
import { baseCards } from '../../src/data/cards.js';

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

const fresh = (id) => JSON.parse(JSON.stringify(baseCards.find(c => c.id === id)));
const FOUR = () => [fresh('january_plain_1'), fresh('february_plain_1'),
                    fresh('march_plain_1'), fresh('april_plain_1')];

// ── engine_missing_number — 4-stack counter in _addCapture ──────────────────
describe('F4.20-FIX — engine_missing_number accrues for negatives via _addCapture 4-stack', () => {
  it('regular copy: +1 totalStacks per 4-card capture', () => {
    const { grm } = makeRound({ spiritIds: ['engine_missing_number'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_missing_number', { elements: [{ totalStacks: 0 }] });
    grm._addCapture(FOUR());
    expect(aggregateNumericState(spirit, 'totalStacks')).toBe(1);
  });

  it('NEGATIVE copy: newEvents advances per 4-card capture (was frozen pre-fix)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_missing_number', name: 'Missing Number', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key: 'totalStacks', preTranscendTotal: 0, oldestAtTranscend: 0, newEvents: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_missing_number' && s.isNegative);
    grm._addCapture(FOUR());
    grm._addCapture(FOUR());
    expect(neg.state.newEvents).toBe(2);
  });

  // F4.20 counter wave (onStackCaptured migration) — PRESERVE timing: the dispatcher fires
  // BEFORE Phase 2 applyEngine, so the triggering 4-capture's own +1 is visible to its
  // applyEngine that same capture (1 x 5 = addMult 5, not 0).
  it('PRESERVE timing: the triggering 4-capture counts itself in its own Phase-2 applyEngine', () => {
    const { grm } = makeRound({ spiritIds: ['engine_missing_number'], deckCardIds: DECK });
    equipSpiritWithState('engine_missing_number', { elements: [{ totalStacks: 0 }] });
    const steps = [];
    grm.setScoringStepCallback(e => steps.push(e));
    grm._addCapture(FOUR());
    const step = steps.find(e => e.type === 'engine_effect' && e.spirit?.id === 'engine_missing_number');
    expect(step).toBeDefined();
    expect(step.addMult).toBe(5); // totalStacks incremented to 1 BEFORE Phase 2 read
  });
});

// ── engine_bullseye — all-4-ranks while-loop in _finalizeTurn ────────────────
// Seed _bullseyeInventory to one of each rank; an empty capture pile means
// _finalizeTurn's internal yaku diff adds nothing, so the loop fires exactly once.
describe('F4.20-FIX — engine_bullseye accrues for negatives via _finalizeTurn while-loop', () => {
  it('regular copy: +1 qualifiedCount when all four ranks are covered', () => {
    const { grm } = makeRound({ spiritIds: ['engine_bullseye'], deckCardIds: DECK });
    const spirit = equipSpiritWithState('engine_bullseye', { elements: [{ qualifiedCount: 0 }] });
    grm._bullseyeInventory = { bright: 1, animal: 1, ribbon: 1, plain: 1 };
    grm._finalizeTurn();
    expect(aggregateNumericState(spirit, 'qualifiedCount')).toBe(1);
  });

  it('NEGATIVE copy: newEvents advances when all four ranks are covered (was frozen pre-fix)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: DECK });
    run.addSpiritDirect({
      id: 'engine_bullseye', name: 'Bullseye', isNegative: true, stackCount: 1, powerLevel: 2,
      state: { key: 'qualifiedCount', preTranscendTotal: 1, oldestAtTranscend: 0, newEvents: 0 },
    });
    const neg = run.allSpirits.find(s => s.id === 'engine_bullseye' && s.isNegative);
    grm._bullseyeInventory = { bright: 1, animal: 1, ribbon: 1, plain: 1 };
    grm._finalizeTurn();
    expect(neg.state.newEvents).toBe(1);
  });
});
