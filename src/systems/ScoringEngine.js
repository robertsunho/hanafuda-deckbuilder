// ─────────────────────────────────────────────────────────────────────────────
// ScoringEngine — 6-yaku evaluation (additive bonus system)
//
// Call evaluate(capturedCards) with any array of card objects from cards.js.
// Returns an array of matched yaku, each as:
//   { name: string, bonus: number, count: number, threshold: number }
//
// Yaku bonuses stack additively via calculateTotalMultiplier():
//   total multiplier = 1.0 + sum(all yaku bonuses)
// No yaku → total multiplier of 1.0 (base points unchanged).
//
// Yaku summary:
//   Kasu        +0.3 base  (+0.1/plain beyond 5)
//   Tanzaku     +0.3 base  (+0.15/ribbon beyond 3)
//   Tane        +0.4 base  (+0.1/animal beyond 3)
//   Tsuki-narabi+0.3 base  (+0.05/month beyond 5; longest consecutive run)
//   Full Month  +0.6 first (+0.3 second, +0.15 third, +0.1 each after)
//   Hikari      +0.7 base  (+0.3/bright beyond 2)
// ─────────────────────────────────────────────────────────────────────────────

// ── Fixed card sets ───────────────────────────────────────────────────────────

const BRIGHT_IDS = new Set([
  "january_crane",
  "march_curtain",
  "august_moon",
  "november_rainman",
  "december_phoenix",
]);

// ── Public yaku catalogue ─────────────────────────────────────────────────────

/**
 * Static reference for every recognised yaku.
 * `baseBonus` shows the minimum additive bonus; scaling yaku go higher at runtime.
 */
export const YAKU_INFO = {
  TANE:         { name: "Tane",          baseBonus: 0.4,
                  description: "3+ Animals (+0.4, +0.1 each extra)." },
  TANZAKU:      { name: "Tanzaku",       baseBonus: 0.3,
                  description: "3+ Ribbons (+0.3, +0.15 each extra)." },
  HIKARI:       { name: "Hikari",        baseBonus: 0.7,
                  description: "2+ Brights (+0.7, +0.3 each extra)." },
  KASU:         { name: "Kasu",          baseBonus: 0.3,
                  description: "5+ Plains (+0.3, +0.1 each extra)." },
  TSUKI_NARABI: { name: "Tsuki-narabi",  baseBonus: 0.3,
                  description: "5+ consecutive months represented (+0.3, +0.05 each extra)." },
  FULL_MONTH:   { name: "Full Month",    baseBonus: 0.6,
                  description: "All 4 cards from one month. +0.6 first, +0.3 second, +0.15 third, +0.1 each after." },
};

// ─────────────────────────────────────────────────────────────────────────────

import SpiritEffects from './SpiritEffects.js';

export default class ScoringEngine {

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Evaluate captured cards against all standard yaku.
   * Spirits operate via the three channels in calculateFinalScore(), not here.
   *
   * @param {object[]} capturedCards  Card objects from cards.js
   * @returns {{ name: string, bonus: number, count: number, threshold: number }[]}
   */
  evaluate(capturedCards) {
    const results = [];
    const byType  = this._partition(capturedCards);

    this._push(results, this._checkTane(byType.animal));
    this._push(results, this._checkTanzaku(byType.ribbon));
    this._push(results, this._checkHikari(byType.bright));
    this._push(results, this._checkKasu(byType.plain));
    this._push(results, this._checkTsukiNarabi(capturedCards));

    // Full Month returns 0 or 1 entries (one combined entry for all full months).
    for (const entry of this._checkFullMonth(capturedCards)) {
      results.push(entry);
    }

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
   * @param {object[]} spirits        Active spirit loadout
   * @param {number}   [flow=1.0]     Pre-computed Flow (styleBase × pushFactor)
   * @returns {{
   *   yakuList: object[], yakuMult: number,
   *   rawBasePoints: number, boostedBasePoints: number, pointBoost: number,
   *   additiveMult: number, multMult: number, effectiveMult: number,
   *   flow: number, finalScore: number
   * }}
   */
  calculateFinalScore(capturedCards, spirits = [], flow = 1.0) {
    // ── Step 1: Standard yaku ─────────────────────────────────────────────
    const yakuList = this.evaluate(capturedCards);
    const yakuMult = this.calculateTotalMultiplier(yakuList);

    // ── Step 2: Point Boost channel ───────────────────────────────────────
    const rawBasePoints = capturedCards.reduce((sum, c) => sum + c.points, 0);
    let boostedCardSum  = 0;
    for (const card of capturedCards) {
      let cardBoost = 1.0;
      for (const spirit of spirits) {
        const effect = SpiritEffects.get(spirit.id);
        if (effect?.getPointBoosts) {
          const boosts = effect.getPointBoosts({ capturedCards, spirits });
          if (boosts?.has(card.id)) cardBoost *= boosts.get(card.id);
        }
      }
      boostedCardSum += card.points * cardBoost;
    }

    // Full-month bonus (+5 per complete month) is not affected by point boosts.
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
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  _push(results, yaku) {
    if (yaku !== null) results.push(yaku);
  }

  _partition(capturedCards) {
    const out = { bright: [], animal: [], ribbon: [], plain: [] };
    for (const card of capturedCards) {
      if (out[card.type]) out[card.type].push(card);
    }
    return out;
  }

  // ── Yaku checkers ──────────────────────────────────────────────────────────

  /**
   * Tane — 3+ Animal cards.
   * +0.4 base, +0.1 per animal beyond 3.
   */
  _checkTane(animals) {
    if (animals.length < 3) return null;
    const bonus = 0.4 + (animals.length - 3) * 0.1;
    return { name: YAKU_INFO.TANE.name, bonus, count: animals.length, threshold: 3 };
  }

  /**
   * Tanzaku — 3+ Ribbon cards.
   * +0.3 base, +0.15 per ribbon beyond 3.
   */
  _checkTanzaku(ribbons) {
    if (ribbons.length < 3) return null;
    const bonus = 0.3 + (ribbons.length - 3) * 0.15;
    return { name: YAKU_INFO.TANZAKU.name, bonus, count: ribbons.length, threshold: 3 };
  }

  /**
   * Hikari — 2+ Bright cards.
   * +0.7 base, +0.3 per bright beyond 2.
   */
  _checkHikari(brights) {
    const brightCards = brights.filter(c => BRIGHT_IDS.has(c.id));
    if (brightCards.length < 2) return null;
    const bonus = 0.7 + (brightCards.length - 2) * 0.3;
    return { name: YAKU_INFO.HIKARI.name, bonus, count: brightCards.length, threshold: 2 };
  }

  /**
   * Kasu — 5+ Plain cards.
   * +0.3 base, +0.1 per plain beyond 5.
   */
  _checkKasu(plains) {
    if (plains.length < 5) return null;
    const bonus = 0.3 + (plains.length - 5) * 0.1;
    return { name: YAKU_INFO.KASU.name, bonus, count: plains.length, threshold: 5 };
  }

  /**
   * Tsuki-narabi — 5+ consecutive months represented in captured cards.
   * Only requires at least one card from each month in the run.
   * Scores the longest consecutive sequence found.
   * +0.3 base, +0.05 per month beyond 5.
   *
   * Examples:
   *   Months 3,4,5,6,7       → +0.30
   *   Months 1,2,3,4,5,6     → +0.35
   *   Months 2,3,4,5,6,7,8   → +0.40
   */
  _checkTsukiNarabi(capturedCards) {
    // Collect unique months present
    const months = new Set();
    for (const card of capturedCards) {
      months.add(card.month);
    }

    if (months.size < 5) return null;

    // Sort months numerically and find longest consecutive run
    const sorted = [...months].sort((a, b) => a - b);
    let longestRun   = 1;
    let currentRun   = 1;
    let currentStart = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentRun++;
        if (currentRun > longestRun) {
          longestRun = currentRun;
        }
      } else {
        currentRun   = 1;
        currentStart = sorted[i];
      }
    }

    if (longestRun < 5) return null;

    const bonus = 0.3 + (longestRun - 5) * 0.05;
    return { name: YAKU_INFO.TSUKI_NARABI.name, bonus, count: longestRun, threshold: 5 };
  }

  /**
   * Full Month — all 4 cards of any single month captured.
   *
   * Returns a single combined yaku entry using diminishing returns:
   *   1 month  → +0.60
   *   2 months → +0.90
   *   3 months → +1.05
   *   4 months → +1.15
   *   n months → +0.10 each beyond 3
   *
   * @returns {{ name, bonus, count, threshold }[]}  0 or 1 entries.
   */
  _checkFullMonth(capturedCards) {
    const byMonth = new Map();
    for (const card of capturedCards) {
      if (!byMonth.has(card.month)) byMonth.set(card.month, []);
      byMonth.get(card.month).push(card);
    }
    let count = 0;
    for (const [, cards] of byMonth) {
      if (cards.length === 4) count++;
    }
    if (count === 0) return [];

    const diminishingBonuses = [0.6, 0.3, 0.15, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1];
    let totalBonus = 0;
    for (let i = 0; i < count; i++) {
      totalBonus += diminishingBonuses[i] || 0.1;
    }
    return [{ name: YAKU_INFO.FULL_MONTH.name, bonus: totalBonus, count, threshold: 1 }];
  }
}
