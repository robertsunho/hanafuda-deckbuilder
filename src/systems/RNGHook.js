// ─────────────────────────────────────────────────────────────────────────────
// RNGHook — centralized probability hook for spirit-modified RNG events
// ─────────────────────────────────────────────────────────────────────────────

import run from './RunManager.js';

/**
 * Roll a probability check, applying any active probability modifiers.
 * Currently affected by econ_lucky_charm (+15% per stack, additive).
 * @param {number} baseProbability - Base probability in [0, 1]
 * @param {string} [context] - Optional context tag for logging/debugging
 * @returns {boolean} - True if roll succeeded
 */
export function rollProbability(baseProbability, context) {
  let totalStacks = 0;
  for (const spirit of run.spirits) {
    if (spirit.id === 'econ_lucky_charm') {
      totalStacks += (spirit.stackCount ?? 1);
    }
  }
  const bonus = totalStacks * 0.15;
  const adjustedProbability = Math.min(1.0, baseProbability + bonus);
  return Math.random() < adjustedProbability;
}
