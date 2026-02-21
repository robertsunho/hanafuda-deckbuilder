// ─────────────────────────────────────────────────────────────────────────────
// CaptureManager — tracks one player's captured cards for a round
//
// Responsibilities:
//   • Accumulate cards captured from the field over the course of a round
//   • Provide filtered views by type / month / tag for UI display
//   • Delegate yaku evaluation and point totals to ScoringEngine
//   • Maintain a capture log so the game loop can react to each capture event
//     (animations, mid-turn yaku checks, undo support)
//
// One CaptureManager instance = one player's capture pile.
// Create a second instance for the opponent in two-player Koi-Koi.
//
// Usage:
//   const capture = new CaptureManager();
//   capture.add([fieldCard, playedCard]);          // typical pair capture
//   const yaku  = capture.evaluateYaku();          // all matched yaku
//   const score = capture.yakuPoints();            // sum of yaku points
//   capture.clear();                               // reset for next round
// ─────────────────────────────────────────────────────────────────────────────

import ScoringEngine from "./ScoringEngine.js";

const _engine = new ScoringEngine();   // stateless — one instance is enough

export default class CaptureManager {

  constructor() {
    /** @type {Map<string, object>}  id → card, insertion-ordered */
    this._cards = new Map();

    /**
     * Ordered log of every capture event this round.
     * Each entry records which cards arrived together and on which turn.
     * @type {{ cards: object[], turn: number }[]}
     */
    this._log = [];

    /** Turn counter incremented by the game loop via recordTurn(). */
    this._turn = 0;

    /**
     * The cards added in the most recent add() call.
     * Useful for triggering capture animations without inspecting the full log.
     * @type {object[]}
     */
    this._lastCaptured = [];
  }

  // ── Read-only accessors ────────────────────────────────────────────────────

  /** Total number of cards in the capture pile. */
  get size() {
    return this._cards.size;
  }

  /** The cards added during the most recent add() call. */
  get lastCaptured() {
    return [...this._lastCaptured];
  }

  /**
   * Full capture log for the round, oldest event first.
   * Each entry: { cards: object[], turn: number }
   */
  get log() {
    return this._log.map((entry) => ({ ...entry, cards: [...entry.cards] }));
  }

  /** True when no cards have been captured yet. */
  isEmpty() {
    return this._cards.size === 0;
  }

  // ── Card access ────────────────────────────────────────────────────────────

  /**
   * All captured cards, in capture order.
   * @returns {object[]}
   */
  getAll() {
    return [...this._cards.values()];
  }

  /**
   * Look up a captured card by id.
   * @param {string} id
   * @returns {object|undefined}
   */
  getById(id) {
    return this._cards.get(id);
  }

  /**
   * True if a card with this id has been captured.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._cards.has(id);
  }

  /**
   * Captured cards filtered to a specific type.
   * @param {"bright"|"animal"|"ribbon"|"plain"} type
   * @returns {object[]}
   */
  getByType(type) {
    return this.getAll().filter((c) => c.type === type);
  }

  /**
   * Captured cards belonging to a specific month (1–12).
   * @param {number} month
   * @returns {object[]}
   */
  getByMonth(month) {
    return this.getAll().filter((c) => c.month === month);
  }

  /**
   * Captured cards that include a specific tag.
   * @param {string} tag
   * @returns {object[]}
   */
  getByTag(tag) {
    return this.getAll().filter((c) => c.tags.includes(tag));
  }

  /**
   * How many cards of each type have been captured.
   * @returns {{ bright: number, animal: number, ribbon: number, plain: number }}
   */
  typeCounts() {
    const counts = { bright: 0, animal: 0, ribbon: 0, plain: 0 };
    for (const card of this._cards.values()) counts[card.type]++;
    return counts;
  }

  /**
   * Captured cards sorted by month (ascending), then points (descending).
   * Returns a new array; does not change internal order.
   * @returns {object[]}
   */
  getSorted() {
    return this.getAll().sort(
      (a, b) => a.month - b.month || b.points - a.points
    );
  }

  // ── Mutation ───────────────────────────────────────────────────────────────

  /**
   * Add one or more captured cards to the pile.
   * Silently skips cards already present (no duplicate captures).
   * Records the event in the capture log under the current turn number.
   *
   * @param {object|object[]} cards
   * @returns {this} for chaining
   */
  add(cards) {
    const list = Array.isArray(cards) ? cards : [cards];
    const added = [];

    for (const card of list) {
      if (this._cards.has(card.id)) continue;
      this._cards.set(card.id, card);
      added.push(card);
    }

    if (added.length > 0) {
      this._lastCaptured = added;
      this._log.push({ cards: added, turn: this._turn });
    } else {
      this._lastCaptured = [];
    }

    return this;
  }

  /**
   * Advance the internal turn counter.
   * Call once per game turn so the capture log timestamps stay meaningful.
   * @returns {this} for chaining
   */
  recordTurn() {
    this._turn++;
    return this;
  }

  /**
   * Undo the most recent capture event — remove the last-logged cards from
   * the pile and pop the log entry. Returns the un-captured cards so the
   * caller can return them to wherever they came from.
   *
   * Only undoes one event at a time; call repeatedly to walk back further.
   * Returns an empty array if the log is empty.
   *
   * @returns {object[]}
   */
  undoLastCapture() {
    if (this._log.length === 0) return [];
    const { cards } = this._log.pop();
    for (const card of cards) this._cards.delete(card.id);
    this._lastCaptured = [];
    return cards;
  }

  /**
   * Reset the capture pile, log, and turn counter for the start of a new round.
   * @returns {this} for chaining
   */
  clear() {
    this._cards.clear();
    this._log = [];
    this._turn = 0;
    this._lastCaptured = [];
    return this;
  }

  // ── Scoring ────────────────────────────────────────────────────────────────

  /**
   * Evaluate all captured cards against every Koi-Koi yaku.
   * Delegates to ScoringEngine; returns the same structure it does:
   *   [{ name, points, cards }, …]
   *
   * @returns {{ name: string, points: number, cards: object[] }[]}
   */
  evaluateYaku() {
    return _engine.evaluate(this.getAll());
  }

  /**
   * Sum of points from all matched yaku (what actually goes on the scoreboard).
   * @returns {number}
   */
  yakuPoints() {
    return _engine.totalPoints(this.getAll());
  }

  /**
   * Sum of the raw point values printed on each captured card
   * (bright=20, animal=10, ribbon=5, plain=1).
   * Used for tiebreakers and some scoring variants.
   * @returns {number}
   */
  rawCardPoints() {
    let total = 0;
    for (const card of this._cards.values()) total += card.points;
    return total;
  }

  /**
   * Check whether capturing a specific additional card would complete or
   * improve any yaku, without mutating the pile.
   * Returns the yaku that would be active after the hypothetical capture.
   *
   * @param {object|object[]} hypotheticalCards  Card(s) not yet captured.
   * @returns {{ name: string, points: number, cards: object[] }[]}
   */
  previewYaku(hypotheticalCards) {
    const extra = Array.isArray(hypotheticalCards)
      ? hypotheticalCards
      : [hypotheticalCards];
    // Exclude ids already captured to avoid double-counting.
    const fresh = extra.filter((c) => !this._cards.has(c.id));
    return _engine.evaluate([...this.getAll(), ...fresh]);
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────

  /**
   * Plain-object snapshot — for serialisation, save states, or debug logging.
   * @returns {{ cards: object[], yaku: object[], yakuPoints: number, rawCardPoints: number, log: object[] }}
   */
  toSnapshot() {
    return {
      cards:          this.getAll(),
      yaku:           this.evaluateYaku(),
      yakuPoints:     this.yakuPoints(),
      rawCardPoints:  this.rawCardPoints(),
      log:            this.log,
    };
  }
}
