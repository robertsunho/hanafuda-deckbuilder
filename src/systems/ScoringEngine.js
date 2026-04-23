// ─────────────────────────────────────────────────────────────────────────────
// ScoringEngine — 5-yaku evaluation (flat additive bonus system)
//
// Call evaluate(capturedCards) with any array of card objects from cards.js.
// Returns an array of matched yaku, each as:
//   { name: string, bonus: number, count: number, threshold: number }
//
// Yaku bonuses stack additively via calculateTotalMultiplier():
//   total multiplier = 1.0 + sum(all yaku bonuses)
// No yaku → total multiplier of 1.0 (base points unchanged).
//
// Yaku summary (all flat — no per-extra scaling):
//   Kasu        +0.3  (5+ plains)
//   Tanzaku     +0.3  (3+ ribbons)
//   Tane        +0.4  (3+ animals)
//   Tsuki-narabi+0.3  (5+ consecutive months; longest run)
//   Hikari      +0.7  (2+ brights)
//
// Maximum yaku mult: 1.0 + 0.3 + 0.3 + 0.4 + 0.3 + 0.7 = 3.0 (all 5 active)
//
// Full Month is NOT a yaku. Capturing all 4 cards of a month still adds +5
// to base points (handled in calculateFinalScore), but triggers no yaku,
// no Bank/Push decision, and no multiplier bonus.
// ─────────────────────────────────────────────────────────────────────────────

// ── Wu Xing Water depreciation multiplier tables ──────────────────────────────
// depLevel indexes into the array.  Floored at the last entry.

// Snow: −0.25 per use, floor 0.5
export const SNOW_MULT = [2.0, 1.75, 1.5, 1.25, 1.0, 0.75, 0.5];
// Ice: −0.5 per use, floor 0.25
export const ICE_MULT  = [4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.5, 0.25];

// ── Public yaku catalogue ─────────────────────────────────────────────────────

/**
 * Static reference for every recognised yaku.
 * `baseBonus` is the flat additive bonus — the same regardless of how many
 * qualifying cards are captured beyond the threshold.
 */
export const YAKU_INFO = {
  TANE:         { name: "Tane",         baseBonus: 0.4,
                  description: "3+ Animals. Flat +0.4 bonus." },
  TANZAKU:      { name: "Tanzaku",      baseBonus: 0.3,
                  description: "3+ Ribbons. Flat +0.3 bonus." },
  HIKARI:       { name: "Hikari",       baseBonus: 0.7,
                  description: "2+ Brights. Flat +0.7 bonus." },
  KASU:         { name: "Kasu",         baseBonus: 0.3,
                  description: "5+ Plains. Flat +0.3 bonus." },
  // TSUKI_NARABI removed from active scoring (kept as dead reference)
};

// ─────────────────────────────────────────────────────────────────────────────

import SpiritEffects from './SpiritEffects.js';

export default class ScoringEngine {

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Evaluate captured cards against all 5 standard yaku.
   * Spirits operate via the three channels in calculateFinalScore(), not here.
   * Full Month completion does NOT produce a yaku entry.
   *
   * @param {object[]} capturedCards  Card objects from cards.js
   * @param {object}   [upgrades={}]  Yaku upgrade counts keyed by yakuId
   *                                  (kasu, tanzaku, tane, hikari).
   *                                  Each level adds +0.2 to the base bonus.
   * @returns {{ name: string, bonus: number, count: number, threshold: number }[]}
   */
  evaluate(capturedCards, upgrades = {}, thresholds = null) {
    const results = [];
    const byType  = this._partition(capturedCards);

    this._push(results, this._checkKasu(byType.plain, upgrades, thresholds?.kasu ?? 5));
    this._push(results, this._checkTanzaku(byType.ribbon, upgrades, thresholds?.tanzaku ?? 3));
    this._push(results, this._checkTane(byType.animal, upgrades, thresholds?.tane ?? 3));
    // this._push(results, this._checkTsukiNarabi(capturedCards));  // removed
    this._push(results, this._checkHikari(byType.bright, upgrades, thresholds?.hikari ?? 2));

    return results;
  }

  /**
   * Stack all yaku bonuses additively.
   * Returns 1.0 when the array is empty (no bonus).
   *
   * @param {{ bonus: number }[]} yakuArray
   * @returns {number}
   */
  calculateTotalMultiplier(yakuArray) {
    return 1.0 + yakuArray.reduce((sum, y) => sum + y.bonus, 0);
  }

  /**
   * Full three-channel score calculation.
   *
   * Formula:
   *   Score = (rawBasePoints × pointBoost + fullMonthBonus)
   *           × (yakuMult + additiveMult)
   *           × multMult
   *           × flow
   *
   * @param {object[]} capturedCards
   * @param {object[]} spirits          Active spirit loadout
   * @param {number}   [flow=1.0]       Pre-computed Flow (styleBase × pushFactor)
   * @param {object}   [upgrades={}]    Yaku upgrade counts (see evaluate())
   * @param {boolean}  [applyProcs=false]  When true Metal proc rolls fire; pass
   *                                        true only for the final round score.
   * @returns {{
   *   yakuList: object[], yakuMult: number,
   *   rawBasePoints: number, boostedBasePoints: number, pointBoost: number,
   *   additiveMult: number, multMult: number, effectiveMult: number,
   *   flow: number, finalScore: number, metalConsumableCount: number
   * }}
   */
  calculateFinalScore(capturedCards, spirits = [], flow = 1.0, upgrades = {}, applyProcs = false) {
    // ── Step 1: Standard yaku ─────────────────────────────────────────────
    const yakuList = this.evaluate(capturedCards, upgrades);
    const yakuMult = this.calculateTotalMultiplier(yakuList);

    // ── Step 2: Point Boost channel ───────────────────────────────────────
    const rawBasePoints      = capturedCards.reduce((sum, c) => sum + c.points, 0);
    let boostedCardSum       = 0;
    const metalConsumableCount = 0; // Metal procs are now handled per-capture in GameRoundManager
    for (const card of capturedCards) {
      const enh    = card.enhancement;
      const isFire = enh?.element === 'fire';

      // Fire enhancement adds flat points on top of base; spirit boosts are skipped.
      let pts = isFire
        ? card.points + (enh.tier === 'upgraded' ? 100 : 30)
        : card.points;

      // Spirit point boosts — Fire cards have no identity so they're excluded.
      if (!isFire) {
        for (const spirit of spirits) {
          const effect = SpiritEffects.get(spirit.id);
          if (effect?.getPointBoosts) {
            const boosts = effect.getPointBoosts({ capturedCards, spirits });
            if (boosts?.has(card.id)) pts *= boosts.get(card.id);
          }
        }
      }

      // Water: multiply by the current depreciation level.
      if (enh?.element === 'water') {
        const multArr = enh.tier === 'upgraded' ? ICE_MULT : SNOW_MULT;
        const level   = Math.min(enh.depLevel ?? 0, multArr.length - 1);
        pts *= multArr[level];
      }

      boostedCardSum += pts;
    }

    // +5 base points per complete month — not a yaku, not affected by boosts.
    const monthCounts = new Map();
    for (const c of capturedCards) {
      monthCounts.set(c.month, (monthCounts.get(c.month) || 0) + 1);
    }
    let fullMonthBonus = 0;
    for (const [, count] of monthCounts) {
      if (count === 4) fullMonthBonus += 5;
    }

    const boostedBasePoints = Math.round(boostedCardSum + fullMonthBonus);
    const pointBoost        = rawBasePoints > 0 ? boostedBasePoints / rawBasePoints : 1.0;

    // ── Step 3: Additive Mult channel ─────────────────────────────────────
    let additiveMult = 0;
    for (const spirit of spirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.getAdditiveMult) {
        additiveMult += effect.getAdditiveMult({ capturedCards, yakuList, spirits });
      }
    }

    // ── Step 4: Multiplicative Mult channel ───────────────────────────────
    let multMult = 1.0;
    for (const spirit of spirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.getMultMult) {
        multMult *= effect.getMultMult({ capturedCards, yakuList, spirits });
      }
    }

    // ── Step 5: Combine ───────────────────────────────────────────────────
    const effectiveMult = (yakuMult + additiveMult) * multMult;
    const finalScore    = Math.round(boostedBasePoints * effectiveMult * flow);

    return {
      yakuList,
      yakuMult,
      rawBasePoints,
      boostedBasePoints,
      pointBoost,
      additiveMult,
      multMult,
      effectiveMult,
      flow,
      finalScore,
      metalConsumableCount,
    };
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

  /**
   * Kasu — 5+ Plain cards. Flat +0.3 bonus + upgrades.
   */
  _checkKasu(plains, upgrades = {}, threshold = 5) {
    if (plains.length < threshold) return null;
    const bonus = YAKU_INFO.KASU.baseBonus + (upgrades.kasu ?? 0) * 0.2;
    return { name: YAKU_INFO.KASU.name, bonus, count: plains.length, threshold };
  }

  /**
   * Tanzaku — 3+ Ribbon cards. Flat +0.3 bonus + upgrades.
   */
  _checkTanzaku(ribbons, upgrades = {}, threshold = 3) {
    if (ribbons.length < threshold) return null;
    const bonus = YAKU_INFO.TANZAKU.baseBonus + (upgrades.tanzaku ?? 0) * 0.2;
    return { name: YAKU_INFO.TANZAKU.name, bonus, count: ribbons.length, threshold };
  }

  /**
   * Tane — 3+ Animal cards. Flat +0.4 bonus + upgrades.
   */
  _checkTane(animals, upgrades = {}, threshold = 3) {
    if (animals.length < threshold) return null;
    const bonus = YAKU_INFO.TANE.baseBonus + (upgrades.tane ?? 0) * 0.2;
    return { name: YAKU_INFO.TANE.name, bonus, count: animals.length, threshold };
  }

  /**
   * Tsuki-narabi — 5+ consecutive months represented in captured cards.
   * Requires at least one card from each month in the run.
   * Scores the longest consecutive sequence found. Flat +0.3 bonus.
   */
  _checkTsukiNarabi(capturedCards) {
    // Fire-enhanced cards have no month identity — exclude them.
    const capturedMonths = new Set(
      capturedCards.filter(c => c.enhancement?.element !== 'fire').map(c => c.month)
    );
    let longest = 0;
    let current = 0;
    for (let m = 1; m <= 12; m++) {
      if (capturedMonths.has(m)) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    }
    if (longest < 5) return null;
    return { name: YAKU_INFO.TSUKI_NARABI.name, bonus: 0.3, count: longest, threshold: 5 };
  }

  /**
   * Hikari — 2+ Bright cards. Flat +0.7 bonus + upgrades.
   * All 5 brights (Goko) still scores +0.7 base — no special override.
   * Accepts any captured card with type='bright' (covers promoted cards).
   */
  _checkHikari(brights, upgrades = {}, threshold = 2) {
    // brights is already pre-filtered to type='bright' cards by _partition.
    // Original BRIGHT_IDS check is kept for canonical ids; promoted cards
    // that land on a canonical id will also pass.
    if (brights.length < threshold) return null;
    const bonus = YAKU_INFO.HIKARI.baseBonus + (upgrades.hikari ?? 0) * 0.2;
    return { name: YAKU_INFO.HIKARI.name, bonus, count: brights.length, threshold };
  }
}
