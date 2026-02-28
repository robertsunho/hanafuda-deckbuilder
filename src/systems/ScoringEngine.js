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
  TSUKI_NARABI: { name: "Tsuki-narabi", baseBonus: 0.3,
                  description: "5+ consecutive months represented. Flat +0.3 bonus." },
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
   * @returns {{ name: string, bonus: number, count: number, threshold: number }[]}
   */
  evaluate(capturedCards) {
    const results = [];
    const byType  = this._partition(capturedCards);

    this._push(results, this._checkKasu(byType.plain));
    this._push(results, this._checkTanzaku(byType.ribbon));
    this._push(results, this._checkTane(byType.animal));
    this._push(results, this._checkTsukiNarabi(capturedCards));
    this._push(results, this._checkHikari(byType.bright));

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
   * Kasu — 5+ Plain cards. Flat +0.3 bonus.
   */
  _checkKasu(plains) {
    if (plains.length < 5) return null;
    return { name: YAKU_INFO.KASU.name, bonus: 0.3, count: plains.length, threshold: 5 };
  }

  /**
   * Tanzaku — 3+ Ribbon cards. Flat +0.3 bonus.
   */
  _checkTanzaku(ribbons) {
    if (ribbons.length < 3) return null;
    return { name: YAKU_INFO.TANZAKU.name, bonus: 0.3, count: ribbons.length, threshold: 3 };
  }

  /**
   * Tane — 3+ Animal cards. Flat +0.4 bonus.
   */
  _checkTane(animals) {
    if (animals.length < 3) return null;
    return { name: YAKU_INFO.TANE.name, bonus: 0.4, count: animals.length, threshold: 3 };
  }

  /**
   * Tsuki-narabi — 5+ consecutive months represented in captured cards.
   * Requires at least one card from each month in the run.
   * Scores the longest consecutive sequence found. Flat +0.3 bonus.
   */
  _checkTsukiNarabi(capturedCards) {
    const capturedMonths = new Set(capturedCards.map(c => c.month));
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
   * Hikari — 2+ Bright cards. Flat +0.7 bonus.
   * All 5 brights (Goko) still scores +0.7 — no special override.
   */
  _checkHikari(brights) {
    const brightCards = brights.filter(c => BRIGHT_IDS.has(c.id));
    if (brightCards.length < 2) return null;
    return { name: YAKU_INFO.HIKARI.name, bonus: 0.7, count: brightCards.length, threshold: 2 };
  }
}
