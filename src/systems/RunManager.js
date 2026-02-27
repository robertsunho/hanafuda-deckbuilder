// ─────────────────────────────────────────────────────────────────────────────
// RunManager — singleton that persists state across rounds and scenes
//
// Manages the ki economy, spirit loadout, consumable inventory, and run
// progression for the entire run.  Import the exported instance, not the class:
//
//   import run from './systems/RunManager.js';
//   run.addKi(5);
//   run.advanceRound();
//
// ─────────────────────────────────────────────────────────────────────────────

class RunManager {

  static MAX_SPIRIT_SLOTS     = 4;
  static MAX_CONSUMABLE_SLOTS = 3;

  constructor() {
    // ── Ki economy ───────────────────────────────────────────────────────────
    /** @type {number} */
    this._ki = 0;

    // ── Spirit loadout ───────────────────────────────────────────────────────
    /** @type {object[]} */
    this._spirits = [];

    // ── Consumable inventory ─────────────────────────────────────────────────
    /** @type {object[]} */
    this._consumables = [];

    // ── Run progression ──────────────────────────────────────────────────────
    /** Current round number (1-based). */
    this._round = 1;

    /** Cumulative score across all completed rounds. */
    this._totalScore = 0;

    /**
     * Style Base — the player's skill expression multiplier.
     * Starts at 1.0.  Grows +0.1 per resonance (style) play during a round.
     * Decays 30% toward 1.0 between rounds: newStyle = 1.0 + (old − 1.0) × 0.7.
     * Cannot be boosted by spirits — it is the player-skill layer only.
     */
    this._styleBase = 1.0;
  }

  // ── Ki economy ─────────────────────────────────────────────────────────────

  get ki()        { return this._ki; }
  get styleBase() { return this._styleBase; }

  /**
   * Add ki to the balance.
   * @param {number} amount  Must be a positive integer.
   */
  addKi(amount) {
    this._ki += amount;
  }

  /**
   * Spend ki from the balance.
   * @param {number} amount
   * @throws {Error} if the balance would go negative.
   */
  spendKi(amount) {
    if (amount > this._ki) {
      throw new Error(`Cannot spend ${amount} ki — balance is only ${this._ki}.`);
    }
    this._ki -= amount;
  }

  // ── Spirit loadout ─────────────────────────────────────────────────────────

  get spirits() { return [...this._spirits]; }

  /**
   * Equip a spirit into the loadout.
   * @param {object} spirit
   * @throws {Error} if all slots are occupied.
   */
  addSpirit(spirit) {
    if (this._spirits.length >= RunManager.MAX_SPIRIT_SLOTS) {
      throw new Error(`Spirit loadout is full (max ${RunManager.MAX_SPIRIT_SLOTS} slots).`);
    }
    this._spirits.push(spirit);
  }

  /**
   * Remove the spirit at the given slot index.
   * @param {number} index
   * @returns {object} The removed spirit.
   * @throws {Error} if the index is out of range.
   */
  removeSpirit(index) {
    if (index < 0 || index >= this._spirits.length) {
      throw new Error(`No spirit at index ${index}.`);
    }
    return this._spirits.splice(index, 1)[0];
  }

  // ── Consumable inventory ───────────────────────────────────────────────────

  get consumables() { return [...this._consumables]; }

  /**
   * Add a consumable to the inventory.
   * @param {object} consumable
   * @throws {Error} if all slots are occupied.
   */
  addConsumable(consumable) {
    if (this._consumables.length >= RunManager.MAX_CONSUMABLE_SLOTS) {
      throw new Error(`Consumable inventory is full (max ${RunManager.MAX_CONSUMABLE_SLOTS} slots).`);
    }
    this._consumables.push(consumable);
  }

  /**
   * Remove (drop) the consumable at the given index without using it.
   * @param {number} index
   * @returns {object} The removed consumable.
   * @throws {Error} if the index is out of range.
   */
  removeConsumable(index) {
    if (index < 0 || index >= this._consumables.length) {
      throw new Error(`No consumable at index ${index}.`);
    }
    return this._consumables.splice(index, 1)[0];
  }

  /**
   * Use and remove the consumable at the given index.
   * Returns the consumable object so the caller can apply its effect.
   * @param {number} index
   * @returns {object} The used consumable.
   * @throws {Error} if the index is out of range.
   */
  useConsumable(index) {
    return this.removeConsumable(index);
  }

  get round()      { return this._round; }
  get totalScore() { return this._totalScore; }

  /**
   * True when the current round number is divisible by 3.
   * Every third shrine visit includes a spirit fusion opportunity.
   * @returns {boolean}
   */
  get isSacredGrove() { return this._round % 3 === 0; }

  // ── Style Base ─────────────────────────────────────────────────────────────

  /**
   * Increment Style Base by the given amount (default +0.1 per style hand).
   * Called by the game scene whenever the player completes a resonance play.
   * @param {number} [amount=0.1]
   */
  accumulateStyle(amount = 0.1) {
    this._styleBase += amount;
  }

  /**
   * Decay Style Base 30% toward 1.0.  Called automatically by advanceRound().
   * newStyle = 1.0 + (oldStyle − 1.0) × 0.7
   */
  decayStyle() {
    this._styleBase = 1.0 + (this._styleBase - 1.0) * 0.7;
  }

  // ── Run progression ────────────────────────────────────────────────────────

  /**
   * Increment the round counter, add a completed round's score to the
   * cumulative total, and decay Style Base toward 1.0.
   * @param {number} [roundScore=0]  The final score from the completed round.
   * @returns {this}
   */
  advanceRound(roundScore = 0) {
    this._totalScore += roundScore;
    this.decayStyle();
    this._round++;
    return this;
  }

  // ── Ki reward calculation ──────────────────────────────────────────────────

  /**
   * Calculate ki earned after a round and return the amount (does NOT add it
   * automatically — call addKi() with the result to apply it).
   *
   * Formula:
   *   base            = 3
   *   + unique yaku   = result.allYaku.length
   *   + surplus bonus = +1 if finalScore >= threshold × 2
   *                     +2 if finalScore >= threshold × 3
   *   raw total       = base + unique yaku + surplus bonus
   *   × push mult     = × (1.0 + 0.25 × successfulPushCount) on success
   *                     × 0.5 if penaltyApplied (failed push)
   *   × pig double    = × 2 if result.pigDoubleKi is true (Pig consumable)
   *   → round to nearest integer
   *
   * @param {{ allYaku: object[], finalScore: number,
   *            penaltyApplied: boolean, pushCount: number,
   *            pigDoubleKi?: boolean }} result
   * @param {number} threshold  Score threshold for surplus bonus (typically
   *                            the round's base point total before multipliers,
   *                            or a fixed per-round target).
   * @returns {number}  Ki earned (integer ≥ 0).
   */
  calculateKiReward(result, threshold) {
    const { allYaku, finalScore, penaltyApplied, pushCount, pigDoubleKi } = result;

    const base         = 3;
    const yakuBonus    = allYaku.length;
    let   surplusBonus = 0;
    if      (finalScore >= threshold * 3) surplusBonus = 2;
    else if (finalScore >= threshold * 2) surplusBonus = 1;

    const raw = base + yakuBonus + surplusBonus;

    const pushMultiplier = penaltyApplied
      ? 0.5
      : 1.0 + 0.25 * (pushCount ?? 0);

    const pigMultiplier = pigDoubleKi ? 2 : 1;

    return Math.round(raw * pushMultiplier * pigMultiplier);
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────

  /**
   * Plain-object snapshot for save states or debug logging.
   * @returns {object}
   */
  toSnapshot() {
    return {
      ki:           this._ki,
      round:        this._round,
      totalScore:   this._totalScore,
      styleBase:    this._styleBase,
      spirits:      [...this._spirits],
      consumables:  [...this._consumables],
    };
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
// All scenes and systems import this single shared instance.
// The class itself is also exported so callers can read static constants
// (e.g. RunManager.MAX_SPIRIT_SLOTS) without depending on magic numbers.
const run = new RunManager();
export { RunManager };
export default run;
