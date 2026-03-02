// ─────────────────────────────────────────────────────────────────────────────
// StyleEngine — detects style combos from the capture pile
//
// 12 combos trigger once per round each.  Detection is incremental: call
// checkCombos() after every capture event with the full capture pile so
// feedback is immediate rather than deferred to round end.
//
// Style combos accumulate Style Base (via run.addStyleBase), which feeds Flow.
// They do NOT trigger Bank/Push decisions.
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_COMBOS = [

  // ── Specific-card combos ──────────────────────────────────────────────────

  {
    id:    'hanami_zake',
    name:  'Hanami-zake',
    bonus: 0.2,
    test:  (ids) => ids.has('march_curtain') && ids.has('september_sake'),
  },
  {
    id:    'tsukimi_zake',
    name:  'Tsukimi-zake',
    bonus: 0.2,
    test:  (ids) => ids.has('august_moon') && ids.has('september_sake'),
  },
  {
    id:    'inoshikacho',
    name:  'Inoshikacho',
    bonus: 0.3,
    test:  (ids) => ids.has('july_boar') && ids.has('october_deer') && ids.has('june_butterflies'),
  },

  // ── Subgroup combos ───────────────────────────────────────────────────────

  {
    id:    'akatan',
    name:  'Akatan',
    bonus: 0.4,
    test:  (ids) => ids.has('january_ribbon') && ids.has('february_ribbon') && ids.has('march_ribbon'),
  },
  {
    id:    'aotan',
    name:  'Aotan',
    bonus: 0.4,
    test:  (ids) => ids.has('june_ribbon') && ids.has('september_ribbon') && ids.has('october_ribbon'),
  },

  // ── Full Month ────────────────────────────────────────────────────────────
  // Triggers once per round even if multiple months are complete.

  {
    id:     'full_month',
    name:   'Full Month',
    bonus:  0.3,
    testFn: (ids, cards) => {
      const monthCounts = new Map();
      for (const c of cards) {
        monthCounts.set(c.month, (monthCounts.get(c.month) || 0) + 1);
      }
      for (const [, count] of monthCounts) {
        if (count === 4) return true;
      }
      return false;
    },
  },

  // ── Seasonal combos ───────────────────────────────────────────────────────
  // Require at least one card from each month in the season.

  {
    id:     'spring',
    name:   'Spring',
    bonus:  0.2,
    testFn: (ids, cards) => {
      const months = new Set(cards.map(c => c.month));
      return months.has(3) && months.has(4) && months.has(5);
    },
  },
  {
    id:     'summer',
    name:   'Summer',
    bonus:  0.2,
    testFn: (ids, cards) => {
      const months = new Set(cards.map(c => c.month));
      return months.has(6) && months.has(7) && months.has(8);
    },
  },
  {
    id:     'autumn',
    name:   'Autumn',
    bonus:  0.2,
    testFn: (ids, cards) => {
      const months = new Set(cards.map(c => c.month));
      return months.has(9) && months.has(10) && months.has(11);
    },
  },
  {
    id:     'winter',
    name:   'Winter',
    bonus:  0.2,
    testFn: (ids, cards) => {
      const months = new Set(cards.map(c => c.month));
      return months.has(12) && months.has(1) && months.has(2);
    },
  },

  // ── Ultimate combos ───────────────────────────────────────────────────────

  {
    id:     'full_year',
    name:   'Full Year',
    bonus:  0.8,
    testFn: (ids, cards) => {
      const months = new Set(cards.map(c => c.month));
      return months.size === 12;
    },
  },
  {
    id:     'goko',
    name:   'Goko',
    bonus:  1.0,
    testFn: (ids, cards) => cards.filter(c => c.type === 'bright').length === 5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export default class StyleEngine {

  constructor() {
    /** Set of combo IDs that have already triggered this round. */
    this._triggeredThisRound = new Set();
  }

  /**
   * Reset triggered combos at the start of a new round.
   * Call this from GameRoundManager.startRound().
   */
  resetRound() {
    this._triggeredThisRound.clear();
  }

  /**
   * Check for newly completed style combos given the full capture pile.
   * Call this after every capture event.
   *
   * @param {object[]} capturedCards  Full capture pile (all cards so far this round).
   * @returns {{ id: string, name: string, bonus: number }[]}
   *   Newly triggered combos only.  Empty if none.
   */
  checkCombos(capturedCards) {
    const ids            = new Set(capturedCards.map(c => c.id));
    const newlyTriggered = [];

    for (const combo of STYLE_COMBOS) {
      if (this._triggeredThisRound.has(combo.id)) continue;

      const passed = combo.test
        ? combo.test(ids)
        : combo.testFn(ids, capturedCards);

      if (passed) {
        this._triggeredThisRound.add(combo.id);
        newlyTriggered.push({ id: combo.id, name: combo.name, bonus: combo.bonus });
      }
    }

    return newlyTriggered;
  }

  /**
   * Sum of all style bonuses accumulated this round.
   * @returns {number}
   */
  getRoundStyleTotal() {
    let total = 0;
    for (const combo of STYLE_COMBOS) {
      if (this._triggeredThisRound.has(combo.id)) total += combo.bonus;
    }
    return total;
  }

  /**
   * All combos triggered this round (for end-of-round display).
   * @returns {{ id: string, name: string, bonus: number }[]}
   */
  getTriggeredCombos() {
    return STYLE_COMBOS
      .filter(c => this._triggeredThisRound.has(c.id))
      .map(c => ({ id: c.id, name: c.name, bonus: c.bonus }));
  }
}
