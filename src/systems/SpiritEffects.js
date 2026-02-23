// ─────────────────────────────────────────────────────────────────────────────
// SpiritEffects — scoring hook registry for all spirits
//
// Each entry may define:
//   modifyScoring(capturedCards, allYaku) → extraYaku[]
//     Called by ScoringEngine.evaluate() after all standard yaku have been
//     checked.  Returns zero or more additional yaku entries to append.
//     Entry shape: { name: string, multiplier: number, cards: object[],
//                    isSpiritBonus: true }
//     The isSpiritBonus flag prevents these entries from triggering the
//     Bank/Push yaku_decision phase in GameRoundManager.
//
// Spirits whose effects are entirely in-play (deal-time or round-end) appear
// as empty stubs — they have no scoring hook but are still registered so
// SpiritEffects.get() never returns null for a known spirit id.
// ─────────────────────────────────────────────────────────────────────────────

const _effects = {

  // ── Seasonal spirits (common) ─────────────────────────────────────────────
  // +0.3× per captured card whose month falls in the matching season.

  spirit_spring: {
    modifyScoring(capturedCards) {
      const months = new Set([3, 4, 5]);
      const count  = capturedCards.filter(c => months.has(c.month)).length;
      if (count === 0) return [];
      return [{ name: 'Spring Spirit', multiplier: 1.0 + 0.3 * count, cards: [], isSpiritBonus: true }];
    },
  },

  spirit_summer: {
    modifyScoring(capturedCards) {
      const months = new Set([6, 7, 8]);
      const count  = capturedCards.filter(c => months.has(c.month)).length;
      if (count === 0) return [];
      return [{ name: 'Summer Spirit', multiplier: 1.0 + 0.3 * count, cards: [], isSpiritBonus: true }];
    },
  },

  spirit_autumn: {
    modifyScoring(capturedCards) {
      const months = new Set([9, 10, 11]);
      const count  = capturedCards.filter(c => months.has(c.month)).length;
      if (count === 0) return [];
      return [{ name: 'Autumn Spirit', multiplier: 1.0 + 0.3 * count, cards: [], isSpiritBonus: true }];
    },
  },

  spirit_winter: {
    modifyScoring(capturedCards) {
      const months = new Set([12, 1, 2]);
      const count  = capturedCards.filter(c => months.has(c.month)).length;
      if (count === 0) return [];
      return [{ name: 'Winter Spirit', multiplier: 1.0 + 0.3 * count, cards: [], isSpiritBonus: true }];
    },
  },

  // ── Yaku threshold spirits (uncommon) ─────────────────────────────────────
  // Each lowers the activation threshold for its target yaku.
  // The spirit entry only fires when the standard yaku has NOT already triggered
  // (to avoid double-counting the same card type).

  spirit_tane_no_kami: {
    /**
     * Tane threshold lowered to 2 animals.
     * Multiplier: ×1.3 base, +0.1× per animal beyond 2.
     * Skips if standard Tane (3+) already fired this evaluation.
     */
    modifyScoring(capturedCards, allYaku) {
      const animals = capturedCards.filter(c => c.type === 'animal');
      if (animals.length < 2) return [];
      if (allYaku.some(y => y.name === 'Tane')) return [];
      const multiplier = 1.3 + (animals.length - 2) * 0.1;
      return [{ name: 'Tane (Spirit)', multiplier, cards: animals, isSpiritBonus: true }];
    },
  },

  spirit_tanzaku_no_kami: {
    /**
     * Tanzaku threshold lowered to 3 ribbons.
     * Multiplier: ×1.3 base, +0.1× per ribbon beyond 3.
     * Skips if standard Tanzaku (4+) already fired this evaluation.
     */
    modifyScoring(capturedCards, allYaku) {
      const ribbons = capturedCards.filter(c => c.type === 'ribbon');
      if (ribbons.length < 3) return [];
      if (allYaku.some(y => y.name === 'Tanzaku')) return [];
      const multiplier = 1.3 + (ribbons.length - 3) * 0.1;
      return [{ name: 'Tanzaku (Spirit)', multiplier, cards: ribbons, isSpiritBonus: true }];
    },
  },

  spirit_kasu_no_kami: {
    /**
     * Kasu threshold lowered to 4 plains.
     * Multiplier: ×1.3 base, +0.1× per plain beyond 4.
     * Skips if standard Kasu (5+) already fired this evaluation.
     */
    modifyScoring(capturedCards, allYaku) {
      const plains = capturedCards.filter(c => c.type === 'plain');
      if (plains.length < 4) return [];
      if (allYaku.some(y => y.name === 'Kasu')) return [];
      const multiplier = 1.3 + (plains.length - 4) * 0.1;
      return [{ name: 'Kasu (Spirit)', multiplier, cards: plains, isSpiritBonus: true }];
    },
  },

  // ── Rare spirits (in-play effects — no scoring hook) ──────────────────────

  spirit_kitsune:  {},  // wild_hand_card: one hand card goes wild at deal time (stub)
  spirit_dokkaebi: {},  // double_random_yaku: doubles one yaku multiplier at round end (stub)

  // ── Legendary spirits (complex cross-type effect — no scoring hook) ────────

  spirit_yin_yang: {},  // multi_type_yaku_bonus: +0.5× per type if 2+ types scored (stub)
};

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Look up the effect definition for a spirit.
 * @param {string} spiritId
 * @returns {{ modifyScoring?: Function }|null}  null if the id is unrecognised.
 */
const SpiritEffects = {
  get(spiritId) { return _effects[spiritId] ?? null; },
};

export default SpiritEffects;
