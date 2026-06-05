import { describe, it, expect } from 'vitest';
import { makeRound, playRoundToEnd } from '../helpers.js';
import run from '../../src/systems/RunManager.js';

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

/** Helper: equip a decay spirit with a known starting remaining value. */
function equipDecay(id, remaining) {
  const spirit = run.allSpirits.find(s => s.id === id);
  if (!spirit) throw new Error(`Spirit ${id} not found after makeRound`);
  spirit.state = { remaining };
  return spirit;
}

describe('decay_persimmon — onRoundEnd decrement (F4.18b #2)', () => {
  it('decrements by 3 on bank (exactly once)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: YAKU_DECK });
    const spirit = equipDecay('decay_persimmon', 100);

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');
    grm.bankScore();

    expect(spirit.state.remaining).toBe(97); // exactly -3, once
  });

  it('decrements by 3 on natural round-over (exactly once)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: ALL_PLAINS_DECK });
    const spirit = equipDecay('decay_persimmon', 100);

    playRoundToEnd(grm);
    expect(grm.phase).toBe('round_over');

    expect(spirit.state.remaining).toBe(97); // exactly -3, once
  });

  it('floors at 0 (does not go negative)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: YAKU_DECK });
    const spirit = equipDecay('decay_persimmon', 2);

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(0); // Math.max(0, 2-3) = 0
  });

  it('decrements on consumable-empty-hand path 1D (bug fix)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_persimmon'], deckCardIds: EMPTY_DECK_FOR_HORSE });
    const spirit = equipDecay('decay_persimmon', 100);

    grm.useConsumable({ id: 'zodiac_horse', name: 'Horse' });
    expect(grm.phase).toBe('round_over');
    expect(spirit.state.remaining).toBe(97); // now fires on 1D path
  });
});

describe('decay_pear — onRoundEnd decrement (F4.18b #2)', () => {
  it('decrements by 5 on bank (exactly once)', () => {
    const { grm } = makeRound({ spiritIds: ['decay_pear'], deckCardIds: YAKU_DECK });
    const spirit = equipDecay('decay_pear', 100);

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(95); // exactly -5, once
  });

  it('floors at 0', () => {
    const { grm } = makeRound({ spiritIds: ['decay_pear'], deckCardIds: YAKU_DECK });
    const spirit = equipDecay('decay_pear', 3);

    grm.playHandCards(['january_plain_1']);
    grm.playDeckPhase();
    grm.bankScore();

    expect(spirit.state.remaining).toBe(0); // Math.max(0, 3-5) = 0
  });
});
