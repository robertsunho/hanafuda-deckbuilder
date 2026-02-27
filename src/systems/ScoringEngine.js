// ─────────────────────────────────────────────────────────────────────────────
// ScoringEngine — 6-yaku evaluation (multiplier-based)
//
// Call evaluate(capturedCards) with any array of card objects from cards.js.
// Returns an array of matched yaku, each as:
//   { name: string, multiplier: number, cards: object[] }
//
// All yaku are independent and compound multiplicatively via
// calculateTotalMultiplier().  No yaku → returns 1.0 (base points unchanged).
//
// Yaku summary:
//   Tane        ×1.3 base  (+0.2/animal beyond 3; +0.5 for Boar+Deer+Butterflies)
//   Tanzaku     ×1.3 base  (+0.2/ribbon beyond 4; +0.4 for red set; +0.4 for blue set)
//   Hikari      ×1.5 base  (+0.3/bright beyond 2; Rain Man −0.2; all 5 → ×5.0)
//   Kasu        ×1.3 base  (+0.15/plain beyond 5)
//   Tsuki-narabi×1.4 base  (+0.2/month beyond 4; longest consecutive month run)
//   Full Month  ×1.5+0.5n  single entry; 1 month=×1.5, 2=×2.0, … 12=×7.0
// ─────────────────────────────────────────────────────────────────────────────

// ── Fixed card sets ───────────────────────────────────────────────────────────

const BRIGHT_IDS = new Set([
  "january_crane",
  "march_curtain",
  "august_moon",
  "november_rainman",
  "december_phoenix",
]);

const RAIN_MAN_ID = "november_rainman";

/** The three Inoshikacho animals — boar, deer, butterflies */
const INO_SHIKA_CHO_IDS = new Set([
  "july_boar",
  "october_deer",
  "june_butterflies",
]);

/** Red poetry ribbons: Pine, Plum, Cherry */
const AKATAN_IDS = new Set([
  "january_ribbon",
  "february_ribbon",
  "march_ribbon",
]);

/** Blue ribbons: Peony, Chrysanthemum, Maple */
const AOTAN_IDS = new Set([
  "june_ribbon",
  "september_ribbon",
  "october_ribbon",
]);

// ── Public yaku catalogue ─────────────────────────────────────────────────────

/**
 * Static reference for every recognised yaku.
 * `multiplier` shows the base value; scaling yaku go higher at runtime.
 */
export const YAKU_INFO = {
  TANE:         { name: "Tane",          multiplier: 1.3,
                  description: "3+ Animals (×1.3, +0.2× each extra). +0.5× for Boar + Deer + Butterflies." },
  TANZAKU:      { name: "Tanzaku",       multiplier: 1.3,
                  description: "4+ Ribbons (×1.3, +0.2× each extra). +0.4× for red set, +0.4× for blue set." },
  HIKARI:       { name: "Hikari",        multiplier: 1.5,
                  description: "2+ Brights (×1.5, +0.3× each extra). Rain Man −0.2×. All 5 Brights = ×5.0." },
  KASU:         { name: "Kasu",          multiplier: 1.3,
                  description: "5+ Plains (×1.3, +0.15× each extra)." },
  TSUKI_NARABI: { name: "Tsuki-narabi",  multiplier: 1.4,
                  description: "4+ consecutive months represented (×1.4, +0.2× each extra month)." },
  FULL_MONTH:   { name: "Full Month",    multiplier: 1.5,
                  description: "All 4 cards from any one month. ×1.5 for first; +0.5× each additional (max ×7.0 for all 12)." },
};

// ─────────────────────────────────────────────────────────────────────────────

import SpiritEffects from './SpiritEffects.js';

export default class ScoringEngine {

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Evaluate an array of captured cards against all yaku, then apply any
   * spirit scoring hooks from the provided loadout.
   *
   * @param {object[]} capturedCards  Card objects from cards.js
   * @param {object[]} [spirits=[]]   Spirit objects from the active loadout
   * @returns {{ name: string, multiplier: number, cards: object[] }[]}
   */
  evaluate(capturedCards, spirits = []) {
    const results = [];
    const byType  = this._partition(capturedCards);

    this._push(results, this._checkTane(byType.animal));
    this._push(results, this._checkTanzaku(byType.ribbon));
    this._push(results, this._checkHikari(byType.bright));
    this._push(results, this._checkKasu(byType.plain));
    this._push(results, this._checkTsukiNarabi(capturedCards));

    // Full Month can fire for multiple months simultaneously.
    for (const entry of this._checkFullMonth(capturedCards)) {
      results.push(entry);
    }

    // Spirit scoring hooks — appended after all standard yaku so hooks can
    // inspect allYaku (e.g. threshold spirits skip if standard yaku fired).
    for (const spirit of spirits) {
      const hook = SpiritEffects.get(spirit.id)?.modifyScoring;
      if (hook) {
        for (const extra of hook(capturedCards, results)) {
          results.push(extra);
        }
      }
    }

    return results;
  }

  /**
   * Compound all yaku multipliers multiplicatively.
   * Returns 1.0 when the array is empty (no bonus).
   *
   * @param {{ multiplier: number }[]} yakuArray
   * @returns {number}
   */
  calculateTotalMultiplier(yakuArray) {
    if (yakuArray.length === 0) return 1.0;
    return yakuArray.reduce((product, y) => product * y.multiplier, 1.0);
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
   * ×1.3 base, +0.2× per animal beyond 3.
   * +0.5× bonus if Boar (july_boar), Deer (october_deer), and
   * Butterflies (june_butterflies) are all present.
   */
  _checkTane(animals) {
    if (animals.length < 3) return null;
    let multiplier = 1.3 + (animals.length - 3) * 0.2;
    const ids = new Set(animals.map(c => c.id));
    if ([...INO_SHIKA_CHO_IDS].every(id => ids.has(id))) multiplier += 0.5;
    return { name: YAKU_INFO.TANE.name, multiplier, cards: [...animals] };
  }

  /**
   * Tanzaku — 4+ Ribbon cards.
   * ×1.3 base, +0.2× per ribbon beyond 4.
   * +0.4× if all three red poetry ribbons (Pine, Plum, Cherry) are present.
   * +0.4× if all three blue ribbons (Peony, Chrysanthemum, Maple) are present.
   * Both bonuses stack.
   */
  _checkTanzaku(ribbons) {
    if (ribbons.length < 4) return null;
    let multiplier = 1.3 + (ribbons.length - 4) * 0.2;
    const ids = new Set(ribbons.map(c => c.id));
    if ([...AKATAN_IDS].every(id => ids.has(id))) multiplier += 0.4;
    if ([...AOTAN_IDS].every(id => ids.has(id)))  multiplier += 0.4;
    return { name: YAKU_INFO.TANZAKU.name, multiplier, cards: [...ribbons] };
  }

  /**
   * Hikari — 2+ Bright cards.
   * ×1.5 base, +0.3× per bright beyond 2.
   * Rain Man (november_rainman) subtracts 0.2× from the base.
   * Goko (all 5 brights captured) overrides everything with a flat ×5.0.
   */
  _checkHikari(brights) {
    const brightCards = brights.filter(c => BRIGHT_IDS.has(c.id));
    if (brightCards.length < 2) return null;

    // Goko — all five brights.
    if (brightCards.length >= 5) {
      return { name: YAKU_INFO.HIKARI.name, multiplier: 5.0, cards: brightCards };
    }

    const hasRainMan = brightCards.some(c => c.id === RAIN_MAN_ID);
    let multiplier   = 1.5 + (brightCards.length - 2) * 0.3;
    if (hasRainMan) multiplier -= 0.2;
    return { name: YAKU_INFO.HIKARI.name, multiplier, cards: brightCards };
  }

  /**
   * Kasu — 5+ Plain cards.
   * ×1.3 base, +0.15× per plain beyond 5.
   */
  _checkKasu(plains) {
    if (plains.length < 5) return null;
    const multiplier = 1.3 + (plains.length - 5) * 0.15;
    return { name: YAKU_INFO.KASU.name, multiplier, cards: [...plains] };
  }

  /**
   * Tsuki-narabi — 4+ consecutive months represented in captured cards.
   * Only requires at least one card from each month in the run.
   * Scores the longest consecutive sequence found.
   * ×1.4 base, +0.2× per month beyond 4.
   *
   * Examples:
   *   Months 3,4,5,6     → ×1.4
   *   Months 1,2,3,4,5   → ×1.6
   *   Months 2,3,4,5,6,7 → ×1.8
   */
  _checkTsukiNarabi(capturedCards) {
    // Collect unique months present
    const months = new Set();
    for (const card of capturedCards) {
      months.add(card.month);
    }

    if (months.size < 4) return null;

    // Sort months numerically and find longest consecutive run
    const sorted = [...months].sort((a, b) => a - b);
    let longestRun   = 1;
    let currentRun   = 1;
    let longestStart = sorted[0];
    let currentStart = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentRun++;
        if (currentRun > longestRun) {
          longestRun   = currentRun;
          longestStart = currentStart;
        }
      } else {
        currentRun   = 1;
        currentStart = sorted[i];
      }
    }

    if (longestRun < 4) return null;

    // Gather all cards belonging to months in the longest run
    const runMonths = new Set();
    for (let m = longestStart; m < longestStart + longestRun; m++) {
      runMonths.add(m);
    }
    const cards = capturedCards.filter(c => runMonths.has(c.month));

    const multiplier = 1.4 + (longestRun - 4) * 0.2;
    return { name: YAKU_INFO.TSUKI_NARABI.name, multiplier, cards };
  }

  /**
   * Full Month — all 4 cards of any single month captured.
   *
   * Returns a SINGLE yaku entry whose multiplier scales additively:
   *   1 month  → ×1.5
   *   2 months → ×2.0
   *   n months → ×(1.0 + 0.5 × n)   max ×7.0 for all 12
   *
   * One combined entry (not one per month) prevents exponential compounding
   * when the player captures multiple complete months across several pushes.
   *
   * @returns {{ name, multiplier, cards }[]}  0 or 1 entries.
   */
  _checkFullMonth(capturedCards) {
    const byMonth = new Map();
    for (const card of capturedCards) {
      if (!byMonth.has(card.month)) byMonth.set(card.month, []);
      byMonth.get(card.month).push(card);
    }
    const completedCards = [];
    let count = 0;
    for (const [, cards] of byMonth) {
      if (cards.length === 4) {
        count++;
        completedCards.push(...cards);
      }
    }
    if (count === 0) return [];
    return [{ name: YAKU_INFO.FULL_MONTH.name, multiplier: 1.0 + 0.5 * count, cards: completedCards }];
  }
}