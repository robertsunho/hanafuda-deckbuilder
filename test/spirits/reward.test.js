import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import run from '../../src/systems/RunManager.js';

// Filler deck (content irrelevant to the direct-dispatch + pre-push cases).
const ALL_PLAINS_DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

// Reaches a yaku (Hikari) on turn 1 so yaku_decision is hit without any push.
const YAKU_DECK = [
  'january_plain_1', 'march_plain_1', 'april_plain_1', 'may_plain_1',
  'june_plain_1', 'july_plain_1', 'august_plain_1', 'september_plain_1',
  'january_crane', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'february_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

describe('F4.20 — econ_reward via onPushSuccess spirit hook', () => {
  it('hook pays +10% of current ki per stack (direct dispatch)', () => {
    const { grm } = makeRound({ spirits: [{ id: 'econ_reward', stackCount: 2 }], deckCardIds: ALL_PLAINS_DECK });
    run._ki = 100;
    grm._fireSpiritHook('onPushSuccess');
    expect(run.ki).toBe(120);   // floor(100 * 0.10 * 2 stacks)
  });

  it('single stack pays +10%', () => {
    const { grm } = makeRound({ spirits: [{ id: 'econ_reward', stackCount: 1 }], deckCardIds: ALL_PLAINS_DECK });
    run._ki = 250;
    grm._fireSpiritHook('onPushSuccess');
    expect(run.ki).toBe(275);   // floor(250 * 0.10 * 1)
  });

  it('Negative econ_reward does NOT fire (mirrors the prior activeSpirits-only path)', () => {
    const { grm } = makeRound({ spiritIds: [], deckCardIds: ALL_PLAINS_DECK });
    run.addSpiritDirect({ id: 'econ_reward', name: 'Reward', isNegative: true, stackCount: 1, powerLevel: 2 });
    run._ki = 100;
    grm._fireSpiritHook('onPushSuccess');
    expect(run.ki).toBe(100);   // negative excluded
  });

  it('does NOT fire on a pre-push yaku (newYaku>0 but _pushCount===0)', () => {
    const { grm } = makeRound({ spirits: [{ id: 'econ_reward', stackCount: 1 }], deckCardIds: YAKU_DECK });
    run._ki = 100;
    grm.playHandCards([grm.hand.getAll()[0].id]);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');   // yaku reached, never pushed
    expect(run.ki).toBe(100);                  // econ_reward did NOT fire (no push success)
  });

  it('DOES fire on a real push success (firing point in _finalizeTurn)', () => {
    // White-box: yaku thresholds are proportional to deck composition, so a
    // hand-crafted multi-yaku deck is fragile. Instead, reach a real yaku + push,
    // then make the standing yaku register as "new" on the next turn (clear the
    // spent-card set the push marked, and the before-turn snapshot) so the REAL
    // pushSucceeded branch — and its _fireSpiritHook('onPushSuccess') — fires.
    const { grm } = makeRound({ spirits: [{ id: 'econ_reward', stackCount: 1 }], deckCardIds: YAKU_DECK });

    grm.playHandCards([grm.hand.getAll()[0].id]);
    grm.playDeckPhase();
    expect(grm.phase).toBe('yaku_decision');   // first yaku reached

    grm.pushOn();                              // penalty active, _pushCount = 1
    expect(grm.pushCount).toBe(1);
    expect(grm._pushPenaltyActive).toBe(true);

    run._ki = 100;
    grm.playHandCards([grm.hand.getAll()[0].id]);
    grm._spentCardIds = new Set();             // un-spend the standing yaku's cards…
    grm._yakuBeforeTurn = new Set();           // …and let it count as new this turn
    grm.playDeckPhase();                        // _finalizeTurn → pushSucceeded → onPushSuccess
    expect(run.ki).toBe(110);                  // econ_reward fired: floor(100 * 0.10 * 1)
  });
});
