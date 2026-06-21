import { describe, it, expect } from 'vitest';
import { makeRound, playRoundToEnd, equipSpiritWithState } from '../helpers.js';
import SpiritEffects from '../../src/systems/SpiritEffects.js';
import run from '../../src/systems/RunManager.js';
import { getSpiritDef } from '../../src/data/spirits.js';

// Deck that triggers Hikari yaku (bright capture) so bankScore() is reachable.
const YAKU_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// All-plains deck — round ends naturally when hand empties, no yaku.
const ALL_PLAINS_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Deck with exactly 16 cards (0 draw pile) — Horse empties hand → 1D round end.
const EMPTY_DECK_FOR_HORSE = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'september_plain_1', 'september_plain_2', 'october_plain_1', 'october_plain_2',
  'december_plain_1', 'december_plain_2', 'january_plain_2', 'february_plain_2',
];

// G0-005: the start value is single-sourced from tooltipBase (was a hardcoded
// literal in _initSpiritState). _initSpiritState is the production seed path;
// the harness's addSpirit does NOT call it, so invoke it directly here.
describe('decay seed — single-sourced from tooltipBase (G0-005)', () => {
  it('decay_persimmon seeds remaining from tooltipBase.startMult (30)', () => {
    run.reset();
    const spirit = { id: 'decay_persimmon', name: 'Persimmon', stackCount: 1 };
    run._initSpiritState(spirit);
    expect(spirit.state.remaining).toBe(getSpiritDef('decay_persimmon').tooltipBase.startMult);
    expect(spirit.state.remaining).toBe(30);
  });

  it('decay_pear seeds remaining from tooltipBase.startPoints (150)', () => {
    run.reset();
    const spirit = { id: 'decay_pear', name: 'Pear', stackCount: 1 };
    run._initSpiritState(spirit);
    expect(spirit.state.remaining).toBe(getSpiritDef('decay_pear').tooltipBase.startPoints);
    expect(spirit.state.remaining).toBe(150);
  });
});

describe('decay_persimmon — onRoundEnd decrement (F4.18b #2)', () => {
  it('decrements by 3 on bank (exactly once)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_persimmon', { state: { remaining: 100 } });

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');
    grm.bankScore();

    expect(spirit.state.remaining).toBe(97); // exactly -3, once
  });

  it('decrements by 3 on natural round-over (exactly once)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: ALL_PLAINS_DECK });
    const spirit = equipSpiritWithState('decay_persimmon', { state: { remaining: 100 } });

    playRoundToEnd(grm);
    expect(grm.phase).toBe('round_over');

    expect(spirit.state.remaining).toBe(97); // exactly -3, once
  });

  it('floors at 0 (does not go negative)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_persimmon', { state: { remaining: 2 } });

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(0); // Math.max(0, 2-3) = 0
  });

  it('decrements on consumable-empty-hand path 1D (bug fix)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: EMPTY_DECK_FOR_HORSE });
    const spirit = equipSpiritWithState('decay_persimmon', { state: { remaining: 100 } });

    grm.useConsumable({ id: 'zodiac_horse', name: 'Horse' });
    expect(grm.phase).toBe('round_over');
    expect(spirit.state.remaining).toBe(97); // now fires on 1D path
  });
});

describe('decay_pear — onRoundEnd decrement (F4.18b #2)', () => {
  it('decrements by 5 on bank (exactly once)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_pear'], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_pear', { state: { remaining: 100 } });

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(95); // exactly -5, once
  });

  it('floors at 0', () => {
    const { grm } = makeRound({ spiritIds: ['decay_pear'], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_pear', { state: { remaining: 3 } });

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(0); // Math.max(0, 3-5) = 0
  });
});

// F4.37 C3 [FIX]: per-member loss scaling. The loss (not just the output) now
// scales by stack count — a 2-stack Persimmon loses 6/round, a 2-stack Pear 10.
// This is a deliberate behavior change (a correct-per-ruling nerf), so these
// assertions flip from the 1-stack values above.
describe('F4.37 C3 — decay loss scales per-member [FIX]', () => {
  it('2-stack Persimmon loses 6/round (3 × 2), not 3', () => {
    const { grm } = makeRound({ spirits: [{ id: 'decay_persimmon', stackCount: 2 }], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_persimmon', { state: { remaining: 100 } });
    // Output still scales as n × stacks (unchanged).
    expect(SpiritEffects.get('decay_persimmon').applyEngine({ spirit }).addMult).toBe(200);

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(94); // 100 - (3 × 2)
  });

  it('2-stack Persimmon clamps at 0 when remaining < scaled loss', () => {
    const { grm } = makeRound({ spirits: [{ id: 'decay_persimmon', stackCount: 2 }], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_persimmon', { state: { remaining: 4 } });

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(0); // Math.max(0, 4 - 6) = 0, never negative
  });

  it('2-stack Pear loses 10/round (5 × 2), not 5', () => {
    const { grm } = makeRound({ spirits: [{ id: 'decay_pear', stackCount: 2 }], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_pear', { state: { remaining: 100 } });
    expect(SpiritEffects.get('decay_pear').applyEngine({ spirit }).addPoints).toBe(200);

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(90); // 100 - (5 × 2)
  });

  it('2-stack Pear clamps at 0 when remaining < scaled loss', () => {
    const { grm } = makeRound({ spirits: [{ id: 'decay_pear', stackCount: 2 }], deckCardIds: YAKU_DECK });
    const spirit = equipSpiritWithState('decay_pear', { state: { remaining: 8 } });

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(0); // Math.max(0, 8 - 10) = 0
  });
});
