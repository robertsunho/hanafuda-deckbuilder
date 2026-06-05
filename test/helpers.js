import run from '../src/systems/RunManager.js';
import GameRoundManager from '../src/systems/GameRoundManager.js';
import { baseCards } from '../src/data/cards.js';
import { vi } from 'vitest';

/**
 * Set up a deterministic headless round for testing engine behavior.
 *
 * The deck is seeded EXACTLY in the order given by deckCardIds:
 *   [ ...8 hand cards, ...8 field cards, ...remaining draw pile ]
 * Math.random is stubbed during startRound so the shuffle is a no-op and the
 * deal order is exactly as specified. The stub is restored before the round
 * is driven, so any in-round randomness (procs, etc.) behaves normally.
 *
 * @param {object} opts
 * @param {string[]} [opts.spiritIds=[]]  Spirit IDs to equip (stackCount 1 each).
 * @param {Array<{id:string,stackCount:number}>} [opts.spirits]  Alternative to
 *   spiritIds when a test needs a specific stackCount (e.g. multi-stack Glory).
 * @param {string[]} opts.deckCardIds  Ordered card IDs (hand, then field, then draw pile).
 * @returns {{ grm: GameRoundManager, run: object }}
 */
export function makeRound({ spiritIds = [], spirits = [], deckCardIds }) {
  run.reset();

  for (const id of spiritIds) {
    run.addSpirit({ id, name: id, stackCount: 1 });
  }
  for (const s of spirits) {
    run.addSpirit({ id: s.id, name: s.id, stackCount: s.stackCount ?? 1 });
  }

  const deck = deckCardIds.map(id => {
    const c = baseCards.find(c => c.id === id);
    if (!c) throw new Error(`Unknown card id in deckCardIds: ${id}`);
    return JSON.parse(JSON.stringify(c));  // deep copy so tests don't mutate baseCards
  });
  run._deck = deck;

  const grm = new GameRoundManager();
  const spy = vi.spyOn(Math, 'random').mockReturnValue(0.999); // 0.999 → Fisher-Yates no-op
  grm.startRound();
  spy.mockRestore();

  return { grm, run };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSERTION GUIDANCE (read before writing a new test):
//
// Do NOT assert on grm.hand.size to measure a spirit's draw effect. Hand size is
// net of draws + plays + yaku-spends (cards moved to spentCardIds) + the
// Blessing-adjustable hand-size CAP. Too many systems touch it; it is a noisy
// target and will give false failures.
//
// DO assert on the SPECIFIC scoring event the effect emits, plus the resource it
// DIRECTLY moves:
//   - the event:  grm.scoringEvents.find(e => e.type === 'glory_draw')
//   - the delta:  grm.deck.drawPileSize  (down by exactly flips + draws)
// This isolates the effect under test from everything else the turn does.
// ─────────────────────────────────────────────────────────────────────────────
