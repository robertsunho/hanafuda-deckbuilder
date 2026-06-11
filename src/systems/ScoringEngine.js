// ─────────────────────────────────────────────────────────────────────────────
// ScoringEngine — 4-yaku evaluation (bank/push gate system)
//
// Yakus are capture-threshold gates: achieving one triggers a Bank/Push
// decision.  They do NOT contribute to scoring math.
//
// Active yakus:
//   Kasu     — 5+ plains
//   Tanzaku  — 3+ ribbons
//   Tane     — 3+ animals
//   Hikari   — 2+ brights
//
// evaluate() returns { name, count, threshold } for each met yaku.
// Actual scoring is per-capture accumulation in GameRoundManager.
// ─────────────────────────────────────────────────────────────────────────────

// F4.34: the SNOW_MULT/ICE_MULT depreciation tables were removed here — they were
// a dead duplicate of getWaterMult (HexagramEffects.js), the single source of truth.

// ── Public yaku catalogue ─────────────────────────────────────────────────────

/** Static reference for every recognised yaku (bank/push gates only). */
export const YAKU_INFO = {
  TANE:         { name: "Tane",    description: "3+ Animals" },
  TANZAKU:      { name: "Tanzaku", description: "3+ Ribbons" },
  HIKARI:       { name: "Hikari",  description: "2+ Brights" },
  KASU:         { name: "Kasu",    description: "5+ Plains" },
};

// ─────────────────────────────────────────────────────────────────────────────

import { getFireFlatPoints } from './HexagramEffects.js';
import { getCardPoints }     from './CardMutations.js';

export default class ScoringEngine {

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Evaluate captured cards against all 4 standard yaku.
   * Spirits operate via per-capture scoring in GameRoundManager, not here.
   * Full Month completion does NOT produce a yaku entry.
   *
   * @param {object[]} capturedCards  Card objects from cards.js
   * @param {object}   [thresholds]   Optional per-yaku thresholds (hexagram overrides).
   * @returns {{ name: string, count: number, threshold: number }[]}
   */
  evaluate(capturedCards, thresholds = null) {
    const results = [];
    const byType  = this._partition(capturedCards);

    this._push(results, this._checkKasu(byType.plain, thresholds?.kasu ?? 5));
    this._push(results, this._checkTanzaku(byType.ribbon, thresholds?.tanzaku ?? 3));
    this._push(results, this._checkTane(byType.animal, thresholds?.tane ?? 3));
    this._push(results, this._checkHikari(byType.bright, thresholds?.hikari ?? 2));

    return results;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  _push(results, yaku) {
    if (yaku !== null) results.push(yaku);
  }

  _partition(capturedCards) {
    const out = { bright: [], animal: [], ribbon: [], plain: [] };
    for (const card of capturedCards) {
      if (card.enhancement?.element === 'fire') {
        // Fire-enhanced cards count toward ALL four yaku simultaneously.
        out.bright.push(card);
        out.animal.push(card);
        out.ribbon.push(card);
        out.plain.push(card);
      } else if (out[card.type]) {
        out[card.type].push(card);
      }
    }
    return out;
  }

  // ── Yaku checkers ──────────────────────────────────────────────────────────

  _checkKasu(plains, threshold = 5) {
    if (plains.length < threshold) return null;
    return { name: YAKU_INFO.KASU.name, count: plains.length, threshold };
  }

  _checkTanzaku(ribbons, threshold = 3) {
    if (ribbons.length < threshold) return null;
    return { name: YAKU_INFO.TANZAKU.name, count: ribbons.length, threshold };
  }

  _checkTane(animals, threshold = 3) {
    if (animals.length < threshold) return null;
    return { name: YAKU_INFO.TANE.name, count: animals.length, threshold };
  }

  _checkHikari(brights, threshold = 2) {
    if (brights.length < threshold) return null;
    return { name: YAKU_INFO.HIKARI.name, count: brights.length, threshold };
  }
}
