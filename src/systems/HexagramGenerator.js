// ─────────────────────────────────────────────────────────────────────────────
// HexagramGenerator — coin-flip hexagram generation
//
// Traditional I Ching: 3 coins thrown 6 times, bottom line first.
// Each throw: count heads. 2+ heads = yang (1), 0–1 heads = yin (0).
// Majority-wins gives exactly 50/50 per line → uniform 1/64 over all hexagrams.
// ─────────────────────────────────────────────────────────────────────────────

import { HEXAGRAM_LIST, getHexagram } from '../data/hexagrams.js';

/**
 * Throw 3 coins once and resolve the resulting line.
 *
 * @returns {{ coins: boolean[], headCount: number, line: 0|1 }}
 *   coins     — three booleans (true = heads)
 *   headCount — 0..3
 *   line      — 1 (yang) when headCount >= 2, else 0 (yin)
 */
export function throwCoinsOnce() {
  const coins = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5];
  const headCount = coins.filter(c => c).length;
  const line = headCount >= 2 ? 1 : 0;
  return { coins, headCount, line };
}

/**
 * Perform a full 6-throw coin roll and return the matching hexagram.
 *
 * Lines are built bottom-to-top (throw 1 = line[0], throw 6 = line[5]),
 * matching the lines[] convention in hexagrams.js.
 *
 * @returns {{
 *   throws: Array<{ coins: boolean[], headCount: number, line: 0|1 }>,
 *   lines:  number[],
 *   hexagram: import('../data/hexagrams.js').HexagramDef
 * }}
 */
export function rollFullHexagram() {
  const throws = [];
  for (let i = 0; i < 6; i++) {
    throws.push(throwCoinsOnce());
  }
  const lines = throws.map(t => t.line);

  const hexagram = HEXAGRAM_LIST.find(h =>
    h.lines.length === 6 &&
    h.lines.every((v, i) => v === lines[i])
  ) ?? null;

  return { throws, lines, hexagram };
}

/**
 * Look up a hexagram by its stored id and return it, or null.
 * Convenience wrapper used by RunManager.getHexagram().
 *
 * @param {string|null} id
 * @returns {object|null}
 */
export function resolveHexagram(id) {
  if (!id) return null;
  return getHexagram(id);
}
