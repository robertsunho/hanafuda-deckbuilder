// ─────────────────────────────────────────────────────────────────────────────
// RunManager — singleton that persists state across rounds and scenes
//
// Manages the ki economy, spirit loadout, consumable inventory, deck state,
// and run progression for the entire run.  Import the exported instance:
import { findFusionRecipe }                     from '../data/fusionRecipes.js';
import { getSpiritDef }                         from '../data/spirits.js';
import { cards as ALL_CARDS }                   from '../data/cards.js';
import { THREE_MARKS, WUXING_CONSUMABLES }      from '../data/consumables.js';
import { getRibbonStampDef }                    from '../data/ribbonStamps.js';
import { ZODIAC_CONSUMABLES, getZodiacDef }     from '../data/zodiacConsumables.js';
import logger                                   from './GameplayLogger.js';
//
//   import run from './systems/RunManager.js';
//   run.addKi(5);
//   run.advanceRound();
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Card promotion helpers ────────────────────────────────────────────────────

/** Ascending point order for card type promotion. */
const TYPE_ORDER = ['plain', 'ribbon', 'animal', 'bright'];

/**
 * Map from `${month}_${type}` → first card of that month/type in ALL_CARDS.
 * Used by promoteCard() to look up target card properties.
 */
const _baseCardLookup = new Map();
for (const card of ALL_CARDS) {
  const key = `${card.month}_${card.type}`;
  if (!_baseCardLookup.has(key)) {
    _baseCardLookup.set(key, card);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class RunManager {

  static MAX_SPIRIT_SLOTS     = 6;
  static MAX_CONSUMABLE_SLOTS = 3;

  static TOTAL_ROUNDS   = 18;
  static ROUNDS_PER_ACT = 3;
  static TOTAL_ACTS     = 6;

  /**
   * Grove appears after completing each of these rounds (end of acts 1–5).
   * After round 15 the player visits the Grove, then plays the final act.
   */
  static GROVE_ROUNDS = [3, 6, 9, 12, 15];

  /**
   * Minimum score required to survive each round (index 0 = Round 1).
   * Failing to meet the threshold ends the run immediately.
   */
  static THRESHOLDS = [
     50,  70,   90,   // Act 1
    100, 160,  275,   // Act 2
    275, 500,  825,   // Act 3
    775, 1600, 2700,  // Act 4
   2900, 6250, 9500,  // Act 5
   9500, 17000, 25000, // Act 6
  ];

  constructor() {
    this.reset();
  }

  /**
   * Reset ALL run state to starting values.
   * Call this before starting a new run so no stale data carries over.
   */
  reset() {
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
     * Style Base — legacy; kept for UI display only (no longer used in scoring).
     * @deprecated Use this._flow for all scoring.
     */
    this._styleBase = 1.0;

    /**
     * Flow — the single persistent scoring multiplier for the run.
     * Starts at 1.0.  Modified by push outcomes and one-time style combo milestones.
     *   Push success (new yaku after push): flow × 1.1
     *   Push failure (round ends under penalty): flow × 0.9
     *   Style combo (first time only per run): flow + combo_value
     */
    this._flow = 1.0;

    /**
     * Set of style combo IDs whose flow bonus has already been collected this run.
     * Prevents the same combo from adding to flow more than once.
     * @type {Set<string>}
     */
    this._triggeredCombos = new Set();

    // ── Run state ────────────────────────────────────────────────────────────
    /** True once the run has ended (won or lost). */
    this._runOver = false;
    /** True if the run ended in victory (all 18 rounds cleared). */
    this._runWon  = false;

    // ── Yaku upgrades ────────────────────────────────────────────────────────
    /**
     * Permanent upgrade levels for each yaku (purchased at the shrine).
     * Each level adds +0.2 to the yaku's base bonus.
     * @type {{ kasu: number, tanzaku: number, tane: number, hikari: number }}
     */
    this._yakuUpgrades = { kasu: 0, tanzaku: 0, tane: 0, hikari: 0 };

    // ── Persistent deck ──────────────────────────────────────────────────────
    /**
     * The canonical deck array — deep-copied from ALL_CARDS at run start.
     * Survives across rounds.  Three Marks mutations are applied in-place.
     * DeckManager.resetWithCards() receives a shallow copy each round so
     * card object references are shared (mutations propagate automatically).
     * @type {object[]}
     */
    this._deck = JSON.parse(JSON.stringify(ALL_CARDS));

    logger.logRunStart();
  }

  // ── Ki economy ─────────────────────────────────────────────────────────────

  get ki()        { return this._ki; }
  get styleBase() { return this._styleBase; }
  /** The current flow multiplier — applied to every capture score. */
  get flow()      { return this._flow; }

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

  get spirits()      { return [...this._spirits]; }
  get spiritSlots()  { return RunManager.MAX_SPIRIT_SLOTS; }
  get canAddSpirit() { return this._spirits.length < RunManager.MAX_SPIRIT_SLOTS; }

  /**
   * Purchase a spirit from the shop.
   * Deducts ki and pushes a minimal { id, name } object onto the loadout.
   * @param {object} spiritDef  Entry from SPIRIT_CATALOG.
   * @returns {{ success: boolean, reason?: string }}
   */
  buySpirit(spiritDef) {
    if (!this.canAddSpirit)        return { success: false, reason: 'No spirit slots available' };
    if (this._ki < spiritDef.cost) return { success: false, reason: 'Not enough ki' };
    this._ki -= spiritDef.cost;
    const spirit = { id: spiritDef.id, name: spiritDef.name };
    // Initialize persistent state for stateful spirits.
    if (spiritDef.id === 'engine_wildlife')  spirit.state = { seenAnimals: [] };
    if (spiritDef.id === 'engine_plenty')    spirit.state = { seenPlains: [] };
    if (spiritDef.id === 'util_irrigation')  spirit.state = { irrigationBonus: 0 };
    if (spiritDef.id === 'engine_glacier')   spirit.state = { waterDepCount: 0 };
    if (spiritDef.id === 'engine_carbon')    spirit.state = { fireCombustCount: 0 };
    if (spiritDef.id === 'engine_velocity')  spirit.state = { metalProcCount: 0 };
    if (spiritDef.id === 'engine_fossil')    spirit.state = { earthCardCount: 0 };
    if (spiritDef.id === 'engine_moths')     spirit.state = { silkTriggerCount: 0 };
    this._spirits.push(spirit);
    return { success: true };
  }

  /**
   * Notify spirits of newly captured cards.
   * Call this each time cards are added to the capture pile so that persistent
   * spirit state (Abundance, Wildlife) updates in real-time.
   * Do NOT call at round-end with the full pile — call incrementally per event.
   *
   * @param {object[]} newlyCapturedCards  Card objects just captured.
   */
  onCardsCaptured(newlyCapturedCards) {
    for (const spirit of this._spirits) {
      if (spirit.id === 'engine_wildlife' && spirit.state) {
        for (const card of newlyCapturedCards) {
          if (card.type === 'animal' && !spirit.state.seenAnimals.includes(card.id)) {
            spirit.state.seenAnimals.push(card.id);
          }
        }
      }
      if (spirit.id === 'engine_plenty' && spirit.state) {
        for (const card of newlyCapturedCards) {
          if (card.type === 'plain' && !spirit.state.seenPlains.includes(card.id)) {
            spirit.state.seenPlains.push(card.id);
          }
        }
      }
    }
  }

  /**
   * Add a symbiont spirit generated during gameplay.
   * Symbionts cost no ki and bypass the normal shop flow.
   * @param {object} spiritDef  Entry from SPIRIT_CATALOG (tier 0, channel 'symbiont').
   * @returns {{ success: boolean }}
   */
  addSymbiontSpirit(spiritDef) {
    if (!this.canAddSpirit) return { success: false };
    const spirit = { id: spiritDef.id, name: spiritDef.name, symbiont: true };
    if (spiritDef.id === 'sym_caterpillar') spirit.state = { leafsEaten: 0 };
    if (spiritDef.id === 'sym_cuckoo_egg')  spirit.state = { roundsRemaining: 3 };
    if (spiritDef.id === 'sym_algae')       spirit.state = { summonCount: 0 };
    if (spiritDef.id === 'sym_ducks')       spirit.state = { pairsThisRound: 0 };
    if (spiritDef.id === 'sym_snails')      spirit.state = { totalUnplayed: 0 };
    if (spiritDef.id === 'sym_magpie')      spirit.state = {};
    if (spiritDef.id === 'sym_crow')        spirit.state = { usedThisRound: false };
    if (spiritDef.id === 'sym_osprey')      spirit.state = { usedThisRound: false };
    this._spirits.push(spirit);
    return { success: true };
  }

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

  /**
   * Release a spirit, removing it from the loadout. No ki refund.
   * @param {number} index
   * @returns {{ released: object }}
   * @throws {Error} if the index is out of range.
   */
  releaseSpirit(index) {
    const released = this.removeSpirit(index);
    return { released };
  }

  /**
   * Fuse two equipped spirits into one using a known fusion recipe.
   * Removes both input spirits and adds the fused result, freeing one slot.
   * No ki cost — the cost was purchasing both inputs.
   *
   * @param {string} spiritIdA
   * @param {string} spiritIdB
   * @returns {{ success: boolean, reason?: string, fusedSpirit?: object }}
   */
  fuseSpirits(spiritIdA, spiritIdB) {
    const recipe = findFusionRecipe(spiritIdA, spiritIdB);
    if (!recipe) return { success: false, reason: 'No fusion recipe exists for these spirits.' };

    const indexA = this._spirits.findIndex(s => s.id === spiritIdA);
    const indexB = this._spirits.findIndex(s => s.id === spiritIdB);
    if (indexA === -1 || indexB === -1) return { success: false, reason: 'Spirits not equipped.' };

    // Remove higher index first to keep lower index stable.
    const [first, second] = indexA > indexB ? [indexA, indexB] : [indexB, indexA];
    this._spirits.splice(first, 1);
    this._spirits.splice(second, 1);

    const fusedDef = getSpiritDef(recipe.output);
    this._spirits.push({ id: fusedDef.id, name: fusedDef.name });

    return { success: true, fusedSpirit: fusedDef };
  }

  // ── Consumable inventory ───────────────────────────────────────────────────

  get consumables()      { return [...this._consumables]; }
  get canAddConsumable() { return this._consumables.length < RunManager.MAX_CONSUMABLE_SLOTS; }

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

  /**
   * Purchase a zodiac consumable from the shrine shop.
   * Deducts ki and adds the consumable to the inventory.
   * @param {string} consumableId  e.g. 'zodiac_rat'
   * @returns {{ success: boolean, reason?: string }}
   */
  buyConsumable(consumableId) {
    if (!this.canAddConsumable) return { success: false, reason: 'Consumable inventory full' };
    const def = getZodiacDef(consumableId);
    if (!def) return { success: false, reason: 'Unknown consumable' };
    if (this._ki < def.cost) return { success: false, reason: 'Not enough ki' };
    this._ki -= def.cost;
    this._consumables.push({ id: def.id, name: def.name, description: def.description, category: def.category });
    return { success: true };
  }

  /**
   * Sell (discard) a consumable from the inventory for 50% of its cost.
   * @param {number} index  Inventory slot index.
   * @returns {{ success: boolean, kiReturned?: number, reason?: string }}
   */
  sellConsumable(index) {
    if (index < 0 || index >= this._consumables.length) return { success: false, reason: 'Invalid index' };
    const cons = this._consumables[index];
    const def  = getZodiacDef(cons.id);
    const refund = def ? Math.floor(def.cost / 2) : 0;
    this._consumables.splice(index, 1);
    if (refund > 0) this._ki += refund;
    return { success: true, kiReturned: refund };
  }

  // ── Run progression ────────────────────────────────────────────────────────

  get round()      { return this._round; }
  get totalScore() { return this._totalScore; }

  /** Current act number (1-based, 6 total). */
  get act()        { return Math.floor((this._round - 1) / RunManager.ROUNDS_PER_ACT) + 1; }

  /** Round position within the current act (1–3). */
  get roundInAct() { return ((this._round - 1) % RunManager.ROUNDS_PER_ACT) + 1; }

  /** Minimum score required to pass the current round. */
  get threshold()  { return RunManager.THRESHOLDS[this._round - 1] ?? 0; }

  /**
   * True when a Sacred Grove visit should follow the round just completed.
   * Query this AFTER calling advanceRound() — it checks whether the round
   * that was just finished (now _round − 1) is a Grove round.
   */
  get isGroveRound() { return RunManager.GROVE_ROUNDS.includes(this._round - 1); }

  /**
   * True when all 18 rounds have been completed.
   * Query this AFTER calling advanceRound().
   */
  get isRunComplete() { return this._round > RunManager.TOTAL_ROUNDS; }

  /**
   * Alias of isGroveRound — used by GameScene to decide the next transition.
   * After advanceRound(): "the round I just finished was a Grove round,
   * so the next destination is ShrineScene."
   */
  get nextIsGrove() { return RunManager.GROVE_ROUNDS.includes(this._round - 1); }

  /** True once the run has ended (won or lost). */
  get runOver() { return this._runOver; }

  /** True if the run ended in victory. */
  get runWon()  { return this._runWon; }

  // ── Style Base (legacy) ────────────────────────────────────────────────────

  /** @deprecated Kept for backward compat; no longer used in scoring. */
  accumulateStyle(amount = 0.1) { this._styleBase += amount; }
  /** @deprecated Kept for backward compat; no longer used in scoring. */
  addStyleBase(amount) { this._styleBase += amount; }
  /** @deprecated Kept for backward compat; no longer used in scoring. */
  decayStyle() { this._styleBase = 1.0 + (this._styleBase - 1.0) * 0.7; }

  // ── Flow system ────────────────────────────────────────────────────────────

  /**
   * Called when the player successfully pushes and then completes a new yaku.
   * Permanently increases flow by 10%.
   */
  onPushSuccess() {
    this._flow *= 1.1;
  }

  /**
   * Called when the round ends after a push with no new yaku (push failure).
   * Permanently decreases flow by 10%.  No score penalty is applied.
   */
  onPushFailure() {
    this._flow *= 0.9;
  }

  /**
   * Called when a style combo fires.  Only adds to flow the FIRST TIME per run.
   * @param {string} comboId     e.g. 'akatan'
   * @param {number} comboValue  The bonus to add (e.g. 0.4 for Akatan).
   * @returns {boolean}  True if flow was updated; false if combo already collected.
   */
  onStyleCombo(comboId, comboValue) {
    if (this._triggeredCombos.has(comboId)) return false;
    this._triggeredCombos.add(comboId);
    this._flow += comboValue;
    return true;
  }

  // ── Round advancement ──────────────────────────────────────────────────────

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

  // ── Threshold check ────────────────────────────────────────────────────────

  /**
   * Check whether a round score meets the survival threshold for the current
   * round.  Call BEFORE advanceRound() so the correct threshold is used.
   *
   * @param {number} score
   * @returns {{ passed: boolean, score: number, threshold: number,
   *             margin: number, marginPct: number }}
   */
  checkThreshold(score) {
    const threshold = RunManager.THRESHOLDS[this._round - 1] ?? 0;
    return {
      passed:    score >= threshold,
      score,
      threshold,
      margin:    score - threshold,
      marginPct: threshold > 0 ? ((score - threshold) / threshold * 100) : 100,
    };
  }

  // ── Run state ──────────────────────────────────────────────────────────────

  /**
   * Mark the run as ended.  Called by GameScene once the outcome is decided.
   * @param {boolean} won  True if all rounds cleared; false if a threshold failed.
   */
  endRun(won) {
    this._runOver = true;
    this._runWon  = won;
  }

  // ── Ki reward calculation ──────────────────────────────────────────────────

  /**
   * Calculate ki earned after a round and return the amount (does NOT add it
   * automatically — call addKi() with the result to apply it).
   *
   * Formula:
   *   base          = 5
   *   + cardsInHand = +1 per card remaining in hand when banking
   *   + styleCombos = +1 per style combo triggered this round
   *
   * @param {{ cardsInHand?: number, styleCombos?: number }} result
   * @returns {number}  Ki earned (integer ≥ 0).
   */
  calculateKiReward(result) {
    const cardsInHand = result.cardsInHand ?? 0;
    const styleCombos = result.styleCombos ?? 0;
    const hasPiggyBank = this._spirits.some(s => s.id === 'econ_piggybank');
    const hasGrace     = this._spirits.some(s => s.id === 'econ_grace');
    const handKi   = hasPiggyBank ? cardsInHand * 3 : cardsInHand;
    const comboKi  = hasGrace     ? styleCombos  * 2 : styleCombos;
    return 5 + handKi + comboKi;
  }

  // ── Interest system ────────────────────────────────────────────────────────

  /** Base interest rate applied at the start of each round. */
  get interestRate() {
    let rate = 0.10;
    if (this._spirits.some(s => s.id === 'econ_bonds')) rate += 0.10;
    if (this._spirits.some(s => s.id === 'econ_ingot'))  rate += this._ki * 0.001;
    return rate;
  }

  /**
   * Apply interest to the ki balance at the start of a round.
   * Earns floor(ki × 10%) ki.
   * @returns {number} Interest earned.
   */
  applyInterest() {
    const interest = Math.floor(this._ki * this.interestRate);
    this._ki += interest;
    return interest;
  }

  // ── Yaku upgrades ──────────────────────────────────────────────────────────

  /** Spread copy of the current yaku upgrade levels. */
  get yakuUpgrades() { return { ...this._yakuUpgrades }; }

  /**
   * Purchase one level of a yaku upgrade. Costs 5 ki.
   * @param {'kasu'|'tanzaku'|'tane'|'hikari'} yakuId
   * @throws {Error} if not enough ki or unknown yakuId.
   */
  buyYakuUpgrade(yakuId) {
    if (!(yakuId in this._yakuUpgrades)) {
      throw new Error(`Unknown yaku upgrade id: ${yakuId}`);
    }
    if (this._ki < 5) {
      throw new Error('Not enough ki to buy a yaku upgrade (costs 5).');
    }
    this._ki -= 5;
    this._yakuUpgrades[yakuId]++;
  }

  // ── Persistent deck ────────────────────────────────────────────────────────

  /**
   * Shallow copy of the canonical deck array.
   * Card objects are shared references — mutations (Three Marks) propagate.
   * @returns {object[]}
   */
  getDeck() { return [...this._deck]; }

  /**
   * Promote one card to the next card type within its month.
   * Uses `promotionProgress` to skip missing types automatically.
   *
   * Type order (ascending): plain → ribbon → animal → bright
   * If the target type exists for the card's month, the card is mutated
   * in-place (id, name, type, points, vertical, temporal) and
   * promotionProgress resets to 0.
   * If the target type is absent, promotionProgress increments (the skip
   * will be applied on the next call).
   *
   * @param {string} cardId
   */
  promoteCard(cardId) {
    const card = this._deck.find(c => c.id === cardId);
    if (!card) return;

    const currentIdx = TYPE_ORDER.indexOf(card.type);
    if (currentIdx === -1) return;

    const progress  = card.promotionProgress || 0;
    const nextIdx   = (currentIdx + 1 + progress) % TYPE_ORDER.length;
    const nextType  = TYPE_ORDER[nextIdx];
    const targetKey = `${card.month}_${nextType}`;
    const target    = _baseCardLookup.get(targetKey);

    if (target) {
      card.id                = target.id;
      card.name              = target.name;
      card.type              = target.type;
      card.points            = target.points;
      card.vertical          = target.vertical;
      card.temporal          = target.temporal;
      card.promotionProgress = 0;
    } else {
      card.promotionProgress = (card.promotionProgress || 0) + 1;
    }
  }

  /**
   * Permanently remove a card from the canonical deck.
   * @param {string} cardId
   */
  deleteCard(cardId) {
    const idx = this._deck.findIndex(c => c.id === cardId);
    if (idx !== -1) this._deck.splice(idx, 1);
  }

  /**
   * Copy all properties from the target card onto the source card in-place.
   * The source card object reference is preserved in the deck array so its
   * position is unchanged; it simply becomes an exact copy of the target.
   *
   * @param {string} sourceId
   * @param {string} targetId
   */
  transcendCard(sourceId, targetId) {
    const source = this._deck.find(c => c.id === sourceId);
    const target = this._deck.find(c => c.id === targetId);
    if (!source || !target) return;

    // Clear all current keys.
    for (const key of Object.keys(source)) {
      delete source[key];
    }
    // Copy all target properties (deep enough for plain objects / arrays).
    Object.assign(source, JSON.parse(JSON.stringify(target)));
  }

  // ── Card shop ─────────────────────────────────────────────────────────────

  /**
   * Buy a card and add it to the permanent deck.
   * Generates a unique id to avoid conflicts with existing cards.
   * @param {object} cardData  Card object (may include enhancement/ribbonStamp).
   * @param {number} price     Ki cost.
   * @returns {{ success: boolean, reason?: string, card?: object }}
   */
  buyCard(cardData, price) {
    if (this._ki < price) return { success: false, reason: 'Not enough ki' };
    this._ki -= price;
    const suffix  = `_shop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newCard = {
      ...JSON.parse(JSON.stringify(cardData)),
      id:            cardData.id + suffix,
      shopPurchased: true,
    };
    this._deck.push(newCard);
    return { success: true, card: newCard };
  }

  // ── Four Practices ────────────────────────────────────────────────────────

  /**
   * Path: Change up to 4 cards to share a target card's month.
   * @param {string}   targetCardId  Card whose month will be copied.
   * @param {string[]} cardIds       Up to 4 cards to change.
   */
  applyPath(targetCardId, cardIds) {
    const target = this._deck.find(c => c.id === targetCardId);
    if (!target) throw new Error('Target card not found');
    if (cardIds.length > 4) throw new Error('Path can change up to 4 cards');
    for (const id of cardIds) {
      const card = this._deck.find(c => c.id === id);
      if (card && card.id !== targetCardId) card.month = target.month;
    }
  }

  /**
   * Fasting: Promote the type of up to 3 cards (plain→ribbon→animal→bright).
   * @param {string[]} cardIds  Up to 3 cards to promote.
   */
  applyFasting(cardIds) {
    if (cardIds.length > 3) throw new Error('Fasting can promote up to 3 cards');
    const PROMOTION = { plain: 'ribbon', ribbon: 'animal', animal: 'bright' };
    const POINTS    = { plain: 3, ribbon: 10, animal: 12, bright: 20 };
    for (const id of cardIds) {
      const card = this._deck.find(c => c.id === id);
      if (card && PROMOTION[card.type]) {
        card.type   = PROMOTION[card.type];
        card.points = POINTS[card.type];
      }
    }
  }

  /**
   * Mind: Delete up to 2 cards permanently from the deck.
   * @param {string[]} cardIds  Up to 2 card IDs to remove.
   */
  applyMind(cardIds) {
    if (cardIds.length > 2) throw new Error('Mind can delete up to 2 cards');
    this._deck = this._deck.filter(c => !cardIds.includes(c.id));
  }

  /**
   * Tree: Transform a source card into an exact copy of a target card.
   * The source card's id is preserved so it remains a distinct deck entry.
   * @param {string} sourceCardId  The card to transform.
   * @param {string} targetCardId  The card to copy properties from.
   */
  applyTree(sourceCardId, targetCardId) {
    const source = this._deck.find(c => c.id === sourceCardId);
    const target = this._deck.find(c => c.id === targetCardId);
    if (!source || !target) throw new Error('Card not found');
    const savedId          = source.id;
    const savedEnhancement = source.enhancement;
    const savedRibbonStamp = source.ribbonStamp;
    source.month  = target.month;
    source.type   = target.type;
    source.points = target.points;
    source.name   = target.name + ' (copy)';
    source.id     = savedId;
    if (savedEnhancement !== undefined) source.enhancement = savedEnhancement;
    if (savedRibbonStamp !== undefined) source.ribbonStamp = savedRibbonStamp;
  }

  // ── Ribbon stamps ─────────────────────────────────────────────────────────

  /**
   * Apply a ribbon stamp to a card in the deck.
   * @param {string} cardId
   * @param {string} stampId  'red' | 'blue' | 'green' | 'yellow'
   * @returns {{ success: boolean, reason?: string }}
   */
  applyRibbonStamp(cardId, stampId) {
    const card = this._deck.find(c => c.id === cardId);
    if (!card) return { success: false, reason: 'Card not found' };
    if (card.ribbonStamp) return { success: false, reason: 'Card already has a ribbon stamp' };
    const stampDef = getRibbonStampDef(stampId);
    if (!stampDef) return { success: false, reason: 'Unknown stamp type' };
    if (this._ki < stampDef.cost) return { success: false, reason: 'Not enough ki' };
    this._ki -= stampDef.cost;
    card.ribbonStamp = stampId;
    return { success: true };
  }

  // ── Wu Xing enhancements ───────────────────────────────────────────────────

  /**
   * Apply a Wu Xing element to a card in the persistent deck.
   * Handles all interaction rules: apply base, upgrade (generative), strip
   * (destructive), overwrite (unrelated element), or no-effect (same element
   * or already-upgraded generative).
   *
   * @param {string} cardId
   * @param {string} element  'water' | 'wood' | 'fire' | 'earth' | 'metal'
   * @returns {{ action: 'applied_base'|'upgraded'|'stripped'|'overwritten'|'no_effect',
   *             returnedConsumable?: string }}
   *   returnedConsumable is set only when action === 'stripped'; it is the id
   *   of the base consumable for the stripped element (e.g. 'element_water').
   */
  applyElement(cardId, element) {
    const card = this._deck.find(c => c.id === cardId);
    if (!card) return { action: 'no_effect' };

    const current = card.enhancement;

    // No existing enhancement — apply base.
    if (!current) {
      card.enhancement = this._createBaseEnhancement(element);
      return { action: 'applied_base' };
    }

    const currentElement = current.element;

    // Same element — no effect.
    if (currentElement === element) {
      return { action: 'no_effect' };
    }

    // Generative: the applied element upgrades the current enhancement.
    if (this._isGenerativeElement(currentElement, element)) {
      if (current.tier === 'upgraded') {
        return { action: 'no_effect' };   // already at max
      }
      current.tier = 'upgraded';
      if (current.depLevel !== undefined) current.depLevel = 0;   // reset Water dep
      return { action: 'upgraded' };
    }

    // Destructive: the applied element strips the current enhancement.
    if (this._isDestructiveElement(currentElement, element)) {
      const returnedElement = currentElement;
      card.enhancement = null;
      return { action: 'stripped', returnedConsumable: `element_${returnedElement}` };
    }

    // Any other element — overwrite with new base.
    card.enhancement = this._createBaseEnhancement(element);
    return { action: 'overwritten' };
  }

  /** @private */
  _createBaseEnhancement(element) {
    const enh = { element, tier: 'base' };
    if (element === 'water') enh.depLevel = 0;
    return enh;
  }

  /**
   * Does `appliedElement` upgrade `currentElement` via the generative cycle?
   * Generative: Wood→Fire, Fire→Earth, Earth→Metal, Metal→Water, Water→Wood.
   * To upgrade an element, apply its parent:
   *   parentOf[fire]=wood, parentOf[earth]=fire, parentOf[metal]=earth,
   *   parentOf[water]=metal, parentOf[wood]=water
   * @private
   */
  _isGenerativeElement(currentElement, appliedElement) {
    const parentOf = {
      fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal', wood: 'water',
    };
    return parentOf[currentElement] === appliedElement;
  }

  /**
   * Does `appliedElement` destroy `currentElement` via the destructive cycle?
   * Destructive: Wood destroys Earth, Earth destroys Water, Water destroys Fire,
   *              Fire destroys Metal, Metal destroys Wood.
   * @private
   */
  _isDestructiveElement(currentElement, appliedElement) {
    const destroys = {
      wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
    };
    return destroys[appliedElement] === currentElement;
  }

  /**
   * Generate a random consumable from the full pool (Three Marks + Wu Xing)
   * and add it to the consumable inventory if space is available.
   * @returns {object|null}  The consumable added, or null if inventory was full.
   */
  generateRandomConsumable() {
    if (!this.canAddConsumable) return null;
    const pool = [...THREE_MARKS, ...WUXING_CONSUMABLES];
    const def  = pool[Math.floor(Math.random() * pool.length)];
    const cons = { id: def.id, name: def.name, description: def.description, category: def.category };
    this._consumables.push(cons);
    return cons;
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
      yakuUpgrades: { ...this._yakuUpgrades },
      deck:         JSON.parse(JSON.stringify(this._deck)),
      flow:         this._flow,
      runOver:      this._runOver,
      runWon:       this._runWon,
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
