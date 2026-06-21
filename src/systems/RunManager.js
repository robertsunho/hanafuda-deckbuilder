// ─────────────────────────────────────────────────────────────────────────────
// RunManager — singleton that persists state across rounds and scenes
//
// Manages the ki economy, spirit loadout, consumable inventory, deck state,
// and run progression for the entire run.  Import the exported instance:
import { getSpiritDef, SPIRIT_CATALOG }          from '../data/spirits.js';
import { baseCards, getBaseCard }                 from '../data/cards.js';
import { WUXING_CONSUMABLES, CHAKRA_TOOLS, getElementDef,
         getStampDef, PRIMARY_STAMPS, ZODIAC_CONSUMABLES, getZodiacDef } from '../data/consumables.js';
import logger                                   from './GameplayLogger.js';
import { resolveHexagram }                      from './HexagramGenerator.js';
import { getHexagram as getHexagramDef }        from '../data/hexagrams.js';
import { getActiveEffect, applyHook }          from './HexagramEffects.js';
// NOTE: RunManager ↔ SpiritEffects is a deliberate, accepted import cycle (accept-and-contain,
// D-F4-SCOPE Part 2). Both directions resolve at call-time (ES-module circular-ref timing);
// nothing is load-bearing at module-eval. Not broken: the shared spirit-math helpers
// (effectivePower/aggregate*/incrementPerElement/addUniqueToElements) are used by BOTH modules,
// so relocating them only re-imports them back — only a neutral module would clarify ownership,
// and even that leaves the run import. If ever cut, sever the light edge (RM→SpiritEffects, ~2
// sites: NEGATIVE_SNAPSHOT + SpiritEffects.get), not the heavy one (~25 sites). See
// docs/archive/phase4/destination_audit_recon_pass1.md Part 2.
import SpiritEffects, { NEGATIVE_SNAPSHOT, isElementMature }     from './SpiritEffects.js';
import { getBlessingDef }                      from '../data/blessings.js';
//
//   import run from './systems/RunManager.js';
//   run.addKi(5);
//   run.advanceRound();
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Per-element accumulator model ────────────────────────────────────────────

/** Spirit IDs that use the per-element accumulator model. */
export const ACCUMULATOR_SPIRIT_IDS = new Set([
  'sym_ants', 'sym_snails', 'sym_algae', 'sym_badger',
  'engine_devotion', 'engine_habitat', 'engine_ceremony', 'engine_agriculture',
  'engine_lincoln', 'engine_palace',
  'engine_glacier', 'engine_carbon', 'engine_fossil', 'engine_moths',
  'engine_velocity',
  'engine_kintaro', 'engine_bullseye', 'engine_missing_number',
  'engine_ship', 'engine_napoleon',
  'engine_wuji',
  'engine_wildlife', 'engine_plenty',
  'engine_radiance', 'engine_banner',
  'util_northern_lion',
  'util_past_life',
  'sym_cuckoo_egg',
]);

/** Initial per-element state shape for each accumulator spirit. */
const ACCUMULATOR_INIT = {
  sym_ants:        () => ({ totalPlayed: 0 }),
  sym_snails:      () => ({ totalUnplayed: 0 }),
  sym_algae:       () => ({ summonCount: 0 }),
  sym_badger:      () => ({ consumablesUsed: 0 }),
  engine_devotion: () => ({ totalScored: 0 }),
  engine_habitat:  () => ({ totalScored: 0 }),
  engine_ceremony: () => ({ totalScored: 0 }),
  engine_agriculture: () => ({ totalScored: 0 }),
  engine_lincoln:  () => ({ banks: 0 }),
  engine_palace:   () => ({ cardsAdded: 0 }),
  engine_glacier:  () => ({ t1Procs: 0, t2Procs: 0 }),
  engine_carbon:   () => ({ t1Procs: 0, t2Procs: 0 }),
  engine_fossil:   () => ({ t1Procs: 0, t2Procs: 0 }),
  engine_moths:    () => ({ t1Procs: 0, t2Procs: 0 }),
  engine_velocity: () => ({ t2Procs: 0 }),
  engine_kintaro:  () => ({ goldsConsumed: 0 }),
  engine_bullseye: () => ({ qualifiedCount: 0 }),
  engine_missing_number: () => ({ totalStacks: 0 }),
  engine_ship:     () => ({ cardsDiscarded: 0 }),
  engine_napoleon: () => ({ pushFails: 0 }),
  engine_wuji:     () => ({ destroyed: 0 }),
  engine_wildlife: () => ({ seenAnimals: [] }),
  engine_plenty:   () => ({ seenPlains: [] }),
  engine_radiance: () => ({ seenBrights: [] }),
  engine_banner:   () => ({ seenRibbons: [] }),
  util_northern_lion: () => ({ pushesWitnessed: 0 }),
  util_past_life:  () => ({}),  // only acquiredRound
  sym_cuckoo_egg:  () => ({}),  // only acquiredRound; maturity = 3 rounds held
};

/**
 * Sum a numeric per-element key across a spirit's elements array.
 * Falls back to spirit.state for negatives / non-accumulators.
 */
export function aggregateNumericState(spirit, key) {
  if (spirit.elements) {
    return spirit.elements.reduce((sum, el) => sum + (el[key] ?? 0), 0);
  }
  return spirit.state?.[key] ?? 0;
}

/**
 * Get the longest-held element's value (first in array) for display.
 */
export function longestHeldValue(spirit, key) {
  if (spirit.elements && spirit.elements.length > 0) {
    return spirit.elements[0][key] ?? 0;
  }
  return spirit.state?.[key] ?? 0;
}

/**
 * Increment a key on every element of an accumulator spirit.
 * Falls back to spirit.state for negatives / non-accumulators.
 */
export function incrementPerElement(spirit, key, amount = 1) {
  if (spirit.isNegative) {
    if (!spirit.state) spirit.state = {};
    // Cat 1 single-key
    if (spirit.state.key !== undefined && spirit.state.key === key) {
      spirit.state.newEvents = (spirit.state.newEvents ?? 0) + amount;
    }
    // Cat 1 dual-key (Glacier/Carbon/Fossil/Moths)
    else if (spirit.state.key1 !== undefined && spirit.state.key1 === key) {
      spirit.state.newEvents1 = (spirit.state.newEvents1 ?? 0) + amount;
    } else if (spirit.state.key2 !== undefined && spirit.state.key2 === key) {
      spirit.state.newEvents2 = (spirit.state.newEvents2 ?? 0) + amount;
    }
    // Cat 1' exponential (Velocity)
    else if (spirit.state.t2ProcsAtTranscend !== undefined && key === 't2Procs') {
      spirit.state.newT2Procs = (spirit.state.newT2Procs ?? 0) + amount;
    }
    // Fallback for negatives without key markers (Cat 2/4/5)
    else if (spirit.state.key === undefined && spirit.state.key1 === undefined) {
      spirit.state[key] = (spirit.state[key] ?? 0) + amount;
    }
    return;
  }
  if (spirit.elements) {
    for (const el of spirit.elements) el[key] = (el[key] ?? 0) + amount;
  } else {
    if (!spirit.state) spirit.state = {};
    spirit.state[key] = (spirit.state[key] ?? 0) + amount;
  }
}

/**
 * Append a unique value to a per-element array key.
 * Each element tracks its own unique set independently.
 */
export function addUniqueToElements(spirit, key, value) {
  if (spirit.isNegative) {
    if (!spirit.state) spirit.state = {};
    // Cat 2/4: state[key] is array-of-arrays; add value to each sub-array if not present.
    if (Array.isArray(spirit.state[key])) {
      for (const arr of spirit.state[key]) {
        if (!arr.includes(value)) arr.push(value);
      }
    }
    return;
  }
  if (spirit.elements) {
    for (const el of spirit.elements) {
      if (!el[key]) el[key] = [];
      if (!el[key].includes(value)) el[key].push(value);
    }
  } else {
    if (!spirit.state) spirit.state = {};
    if (!spirit.state[key]) spirit.state[key] = [];
    if (!spirit.state[key].includes(value)) spirit.state[key].push(value);
  }
}

/**
 * Sum array lengths across elements (for uniqueness-tracker spirits).
 */
export function aggregateArrayLength(spirit, key) {
  if (spirit.elements) {
    return spirit.elements.reduce((sum, el) => sum + (el[key]?.length ?? 0), 0);
  }
  return spirit.state?.[key]?.length ?? 0;
}

/** Count truly-unique values across all elements/sub-arrays. For tooltip display. */
export function aggregateUniqueCount(spirit, key) {
  if (spirit.isNegative) {
    const arrays = spirit.state?.[key] ?? [];
    return new Set(arrays.flat()).size;
  }
  if (spirit.elements) {
    return new Set(spirit.elements.flatMap(el => el[key] ?? [])).size;
  }
  return spirit.state?.[key]?.length ?? 0;
}

// ── Economy value accessors ────────────────────────────────────────────────────
// F4.37 C3: keep the coupon discount and piggybank hand-ki multiplier in ONE place,
// read by BOTH the RunManager formulas (getEffectiveCost / calculateKiReward) AND the
// spirit tooltips — so the displayed value can never drift from the applied one.

/** econ_coupon: shop discount percentage for N stacks (stacks to 45% at 3). */
export function couponDiscountPct(stacks) {
  return stacks * 15;
}

/** econ_piggybank: hand-ki multiplier for N stacks (×2/×3/×4; ×1 when absent). */
export function piggybankHandKiMult(stacks) {
  return stacks > 0 ? 1 + stacks : 1;
}

// ── Card promotion helpers ────────────────────────────────────────────────────

/** Ascending point order for card type promotion. */
const TYPE_ORDER = ['plain', 'ribbon', 'animal', 'bright'];


// ─────────────────────────────────────────────────────────────────────────────

class RunManager {

  static MAX_SPIRIT_SLOTS     = 6;
  static MAX_CONSUMABLE_SLOTS = 3;

  static TOTAL_ROUNDS   = 36;
  static ROUNDS_PER_ACT = 6;
  static TOTAL_ACTS     = 6;

  /**
   * Grove appears after completing every 3rd round (rounds 3, 6, 9, … 36).
   * Pattern: Wayside, Wayside, Grove — repeating across all 36 rounds.
   */
  static GROVE_ROUNDS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  static FLOW_DECAY_RATE = 0.95;

  /**
   * Push outcome multipliers indexed by resolution depth — the FLOW curve, indexed by GRM's
   * `_pushDepth` (successful push depth). Distinct from GRM's `_pushCount`-indexed DEAL curve
   * (_getNextPushDealCount, how many cards a push deals).
   * On bank: resolution depth = _pushDepth. On fail: depth = _pushDepth + 1.
   */
  static PUSH_CURVE = {
    0: { success: 1.00 },
    1: { success: 1.10, failure: 0.90 },
    2: { success: 1.25, failure: 0.80 },
    3: { success: 1.50, failure: 0.65 },
    4: { success: 2.00, failure: 0.50 },
  };

  /**
   * Minimum score required to survive each round (index 0 = Round 1).
   * Failing to meet the threshold ends the run immediately.
   */
  static THRESHOLDS = [
    // Act 1 (R1-6): Survivable without spirits
    50, 70, 90, 120, 160, 200,
    // Act 2 (R7-12): Spirits essential
    300, 450, 650, 900, 1200, 1600,
    // Act 3 (R13-18): Build must be online
    2000, 2500, 3200, 4000, 5000, 6500,
    // Act 4 (R19-24): Optimization phase
    8000, 10000, 13000, 17000, 22000, 28000,
    // Act 5 (R25-30): Push mastery
    35000, 45000, 58000, 75000, 95000, 120000,
    // Act 6 (R31-36): Endgame
    150000, 190000, 240000, 300000, 380000, 500000,
  ];

  constructor() {
    this.reset();
  }

  /**
   * Reset ALL run state to starting values.
   * Call this before starting a new run so no stale data carries over.
   */
  reset() {
    // ── Dev mode ───────────────────────────────────────────────────────────
    this._devMode = false;
    this._forceCatTarget = null; // debug: force next Cat summon to this spirit id
    this._forcedPastLifeTarget = null; // debug: force next Past Life copy target
    this._forcedCuckooHatchTarget = null; // debug: force next Cuckoo Egg hatch target

    // ── Ki economy ───────────────────────────────────────────────────────────
    /** @type {number} */
    this._ki = 0;

    // ── Spirit loadout ───────────────────────────────────────────────────────
    /**
     * Unified spirit array — canonical storage for both regular and negative spirits.
     * Display order = scoring chain order. Negatives have `isNegative: true`.
     * @type {object[]}
     */
    this._allSpirits = [];
    /** @type {object[]} Legendary spirits (separate slot category). */
    this._legendarySpirits = [];
    /** Permanent field slot modifier (Amber alchemical reduces by 1). */
    this._permanentFieldSlotMod = 0;

    // ── Blessings (permanent run modifiers) ───────────────────────────────────
    /** @type {object[]} */
    this._blessings = [];

    // ── Consumable inventory ─────────────────────────────────────────────────
    /** @type {object[]} */
    this._consumables = [];
    /** @type {object[]} Negative consumables (slot-free, single-use). */
    this._negativeConsumables = [];
    /** @type {number} Mutable max consumable slots (hexagram can override). */
    this._maxConsumableSlots = RunManager.MAX_CONSUMABLE_SLOTS;

    // ── Run progression ──────────────────────────────────────────────────────
    /** Current round number (1-based). */
    this._round = 1;

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
    /** True if the run ended in victory (all 36 rounds cleared). */
    this._runWon  = false;

    // ── Persistent deck ──────────────────────────────────────────────────────
    /**
     * The canonical deck array — deep-copied from baseCards at run start.
     * Survives across rounds.  Deck mutations are applied in-place.
     * DeckManager.resetWithCards() receives a shallow copy each round so
     * card object references are shared (mutations propagate automatically).
     * @type {object[]}
     */
    this._deck = JSON.parse(JSON.stringify(baseCards));

    /** Monotone counter for Throat Chakra duplicates — guarantees unique IDs. */
    this._throatCounter = 0;

    // ── Hexagram ─────────────────────────────────────────────────────────────
    /**
     * The id of the hexagram active for this run (e.g. 'hex_01'), or null when
     * no hexagram has been assigned (first ever run).
     * @type {string|null}
     */
    this._hexagramId = null;

    /**
     * Arbitrary state bucket for hexagram effects that need run-level
     * persistence (e.g. one_yaku_disabled round rotation counter).
     * Populated by each effect's onRunStart hook.
     * @type {object|null}
     */
    this._hexagramState = null;

    logger.logRunStart();
  }

  // ── Ki economy ─────────────────────────────────────────────────────────────

  get ki()        { return this._ki; }
  /** The current flow multiplier — applied to every capture score. */
  get flow()      { return this._flow; }
  get devMode()   { return this._devMode; }

  /** Compute effective ki cost (0 in dev mode). */
  getEffectiveCost(baseCost) {
    if (this._devMode) return 0;
    // Hexagram modifier first — establishes the base price for this run.
    const hexAdjusted = applyHook('modifyShopPrice', baseCost, baseCost);
    // Coupon discount applies to the hex-adjusted price.
    // Bucket-B (F4.20): econ_coupon's discount is a term in this RunManager-owned shop-pricing
    // formula — intentionally in place, not seepage. See F4.16_F4.20_triage_ledger.md.
    const couponStacks = this.countStackedById('econ_coupon');
    if (couponStacks <= 0) return hexAdjusted;
    const remainingPct = Math.max(0, 100 - couponDiscountPct(couponStacks));
    return Math.ceil(hexAdjusted * remainingPct / 100);
  }

  /** Start a new run in dev mode (free shop, 999 ki). */
  startDevModeRun() {
    this.reset();
    this._devMode = true;
    this._ki = 999;
  }

  /** Debug: force the next Cat summon to target a specific spirit id (one-shot). */
  forceCatTarget(spiritId) { this._forceCatTarget = spiritId; }

  /**
   * Add ki to the balance.
   * @param {number} amount  Must be a positive integer.
   */
  addKi(amount, reason = 'unspecified') {
    if (amount <= 0) return;
    this._ki += amount;
    logger.logKiChange(amount, reason, this._ki);
  }

  /**
   * Spend ki from the balance.
   * @param {number} amount
   * @throws {Error} if the balance would go negative.
   */
  spendKi(amount, reason = 'unspecified') {
    if (amount > this._ki) {
      throw new Error(`Cannot spend ${amount} ki — balance is only ${this._ki}.`);
    }
    this._ki -= amount;
    if (amount > 0) logger.logKiChange(-amount, reason, this._ki);
  }

  // ── Hexagram ───────────────────────────────────────────────────────────────

  /** The hexagram id active this run, or null. */
  get hexagramId() { return this._hexagramId; }

  /**
   * Assign a hexagram to this run.  Should be called once at run start before
   * any round begins.  Pass null to clear (no hexagram / first run behaviour).
   * @param {string|null} hexagramId  e.g. 'hex_01'
   */
  setHexagram(hexagramId) {
    this._hexagramId    = hexagramId ?? null;
    this._hexagramState = null;
    const hexagram = this._hexagramId ? getHexagramDef(this._hexagramId) : null;
    logger.logHexagramAssignment(hexagram);
    const effect = getActiveEffect();
    if (effect?.onRunStart) effect.onRunStart(this);
    // Dev mode: restore 999 ki after hexagram onRunStart may have overridden it.
    if (this._devMode) this._ki = 999;
    this._applyHexagramDeckModification();
  }

  _applyHexagramDeckModification() {
    const effect = getActiveEffect();
    if (effect?.modifyDeck) {
      this._deck = effect.modifyDeck(this._deck);
    }
  }

  /**
   * Return the full hexagram definition for the current run, or null when none
   * has been assigned (first run) or the id is unrecognised.
   * @returns {object|null}
   */
  getHexagram() {
    return resolveHexagram(this._hexagramId);
  }

  // ── Spirit loadout ─────────────────────────────────────────────────────────

  get spirits()           { return this._allSpirits.filter(s => !s.isNegative && (s.stackCount ?? 1) > 0); }
  get negativeSpirits()   { return this._allSpirits.filter(s => s.isNegative); }
  get allSpirits()        { return [...this._allSpirits]; }
  get legendarySpirits()  { return [...this._legendarySpirits]; }
  /** Active scoring spirits: regulars + legendaries. Used by most engine iteration. */
  get activeSpirits()     { return [...this.spirits, ...this._legendarySpirits]; }
  /** All scoring spirits: regulars + negatives + legendaries. */
  get scoringSpirits()    { return [...this.spirits, ...this.negativeSpirits, ...this._legendarySpirits]; }
  get spiritSlots() {
    let base = applyHook('modifySpiritSlots', RunManager.MAX_SPIRIT_SLOTS, RunManager.MAX_SPIRIT_SLOTS);
    base += this.countBlessingsByEffect('plus_spirit_slot');
    return base;
  }
  get canAddSpirit()      { return this._allSpirits.filter(s => !s.isNegative).length < this.spiritSlots; }
  get maxLegendarySlots() { return 2; }
  get canAddLegendary()   { return this._legendarySpirits.length < this.maxLegendarySlots; }

  /**
   * Sum stackCount across all spirit instances with the given id.
   * Counts both regular and negative spirits.
   * @param {string} id  Spirit id to count.
   * @returns {number}   Total stack count across all matching instances.
   */
  countStackedById(id) {
    return this._allSpirits
      .filter(s => s.id === id)
      .reduce((sum, s) => sum + effectivePower(s), 0);
  }

  get maxConsumableSlots() {
    let base = this._maxConsumableSlots;
    base += this.countBlessingsByEffect('plus_consumable_slot');
    return base;
  }

  /**
   * Purchase a spirit from the shop.
   * Deducts ki and pushes a minimal { id, name } object onto the loadout.
   * @param {object} spiritDef  Entry from SPIRIT_CATALOG.
   * @returns {{ success: boolean, reason?: string }}
   */
  buySpirit(spiritDef) {
    const cost = this.getEffectiveCost(spiritDef.cost);
    if (this._ki < cost) return { success: false, reason: 'Not enough ki' };

    // Pre-check: if buying would require a new slot but none available, fail before charging.
    const existing = this._allSpirits.find(s => s.id === spiritDef.id && !s.isNegative);
    if (!existing && !this.canAddSpirit) {
      return { success: false, reason: 'No spirit slots available' };
    }

    const result = this._acquireSpiritStack(spiritDef, 1);
    if (!result.success) return result;

    this._ki -= cost;

    if (result.result === 'transcended') {
      logger.logSpiritTranscended(spiritDef.name);
    } else if (result.result === 'stacked') {
      const updated = this._allSpirits.find(s => s.id === spiritDef.id && !s.isNegative);
      logger.logSpiritStacked(spiritDef.name, updated?.stackCount ?? 1);
    }

    return { success: true, result: result.result };
  }

  /**
   * Initialize persistent state/elements for a spirit (regular OR symbiont acquisition).
   * Accumulators get an `elements` array sized to stackCount; stateful non-accumulators get their
   * `state` object. Handles the full id union of both acquisition paths — formerly split across
   * `_initSpiritState` (regular branch) + `_initSpiritElements` (symbiont branch), which shared a
   * byte-identical accumulator branch and double-defined `game_catcher`. Routing to the two former
   * methods was strictly by channel/category 'symbiont' (`_acquireSpiritStack`), so each id reaches
   * exactly one path; `game_catcher` (channel 'gameplay') only ever takes the regular path — it
   * appeared in both former methods defensively, with identical state. Mutates spirit in-place.
   */
  _initSpiritState(spirit) {
    if (ACCUMULATOR_SPIRIT_IDS.has(spirit.id)) {
      if (!spirit.elements) {
        const count = spirit.stackCount ?? 1;
        spirit.elements = [];
        for (let i = 0; i < count; i++) spirit.elements.push(this._freshAccumulatorElement(spirit.id));
      }
      return;
    }
    // Non-accumulator state init (full union of the former regular + symbiont paths)
    switch (spirit.id) {
      case 'sym_caterpillar': spirit.state = { leafsEaten: 0 };          break;
      case 'sym_crow':        spirit.state = {};                         break;
      case 'sym_ducks':       spirit.state = { multValue: 0 };           break;
      case 'sym_magpie':      spirit.state = {};                         break;
      case 'sym_osprey':      spirit.state = { flipsUsedThisRound: 0 };  break;
      case 'game_catcher':    spirit.state = { catchesUsedThisRound: 0 }; break;
      case 'decay_persimmon': spirit.state = { remaining: 30 };          break;
      case 'decay_pear':      spirit.state = { remaining: 150 };         break;
    }
  }

  /**
   * Swap two spirits by slot index.
   */
  swapSpirits(indexA, indexB) {
    if (indexA < 0 || indexA >= this._allSpirits.length) return;
    if (indexB < 0 || indexB >= this._allSpirits.length) return;
    const temp = this._allSpirits[indexA];
    this._allSpirits[indexA] = this._allSpirits[indexB];
    this._allSpirits[indexB] = temp;
  }

  /**
   * Move a spirit from one position to another (insertion-based reorder).
   * @param {number} fromIndex  Source index in _allSpirits.
   * @param {number} toIndex    Target index in _allSpirits (before insertion).
   */
  moveSpirit(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this._allSpirits.length) return;
    const spirit = this._allSpirits.splice(fromIndex, 1)[0];
    const adjusted = toIndex > fromIndex ? toIndex - 1 : toIndex;
    this._allSpirits.splice(Math.min(adjusted, this._allSpirits.length), 0, spirit);
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
    for (const spirit of this._allSpirits) {
      if (spirit.id === 'engine_wildlife') {
        for (const card of newlyCapturedCards) {
          if (card.type === 'animal') addUniqueToElements(spirit, 'seenAnimals', card.id);
        }
      }
      if (spirit.id === 'engine_plenty') {
        for (const card of newlyCapturedCards) {
          if (card.type === 'plain') addUniqueToElements(spirit, 'seenPlains', card.id);
        }
      }
    }
  }

  /**
   * Add a symbiont spirit generated during gameplay.
   * Symbionts cost no ki and bypass the normal shop flow.
   *
   * Cascading transcendence: while pendingStacks >= 4, peel off 4 stacks
   * at a time to create a 1-stack Negative. Multiple Negatives can be
   * created in a single call. Negatives don't occupy spirit slots.
   *
   * @param {object} spiritDef  Entry from SPIRIT_CATALOG (tier 0, channel 'symbiont').
   * @param {number} stackCount Number of stacks to add (default 1).
   * @returns {{ success: boolean, result?: string }}
   */
  addSymbiontSpirit(spiritDef, stackCount = 1) {
    return this._acquireSpiritStack(spiritDef, stackCount);
  }

  _buildSymbiontSpirit(spiritDef, stackCount) {
    const spirit = { id: spiritDef.id, name: spiritDef.name, symbiont: true, stackCount, sellPriceBonus: 0 };
    this._initSpiritState(spirit);
    return spirit;
  }

  _freshAccumulatorElement(spiritId) {
    const initFn = ACCUMULATOR_INIT[spiritId];
    return initFn ? { ...initFn(), acquiredRound: this._round ?? 0 } : {};
  }

  /** Add an accumulator element when stacking an existing spirit. */
  _addAccumulatorElement(spirit) {
    if (ACCUMULATOR_SPIRIT_IDS.has(spirit.id)) {
      if (!spirit.elements) spirit.elements = [];
      spirit.elements.push(this._freshAccumulatorElement(spirit.id));
    }
  }

  /**
   * Build category-appropriate zero-state for a freshly-created negative, using the spirit's
   * NEGATIVE_SNAPSHOT against synthetic empty (zero-state) elements. Returns null for spirits
   * without a snapshot entry (non-accumulator negatives keep null state, as before). Used by
   * Past Life negative copies (decision 5) and negative Cuckoo hatches (decision 7) — both want
   * a fresh, non-compounding negative, not the transcend-time aggregate.
   */
  _freshNegativeState(spiritId, powerLevel = 1) {
    const snapshotFn = NEGATIVE_SNAPSHOT[spiritId];
    if (!snapshotFn) return null;
    const elements = [];
    for (let i = 0; i < powerLevel; i++) elements.push(this._freshAccumulatorElement(spiritId));
    return snapshotFn({ id: spiritId, elements }, powerLevel);
  }

  /** Aggregate elements into a single state object for negative creation. */
  _aggregateElementsForNegative(spirit, powerLevel = 3) {
    if (!spirit.elements || spirit.elements.length === 0) return spirit.state ?? null;
    const snapshotFn = NEGATIVE_SNAPSHOT[spirit.id];
    if (!snapshotFn) {
      console.warn(`[F2.5] No NEGATIVE_SNAPSHOT entry for ${spirit.id}; using legacy fallback.`);
      return spirit.state ?? null;
    }
    return snapshotFn(spirit, powerLevel);
  }

  /**
   * Build the canonical transcended-negative object from a live regular spirit.
   * Single source of truth for negative construction — BOTH natural cascade
   * transcendence (_acquireSpiritStack) and Amber (alch_amber) call this so they
   * can't drift. Aggregates `.elements` into negative state (falls back to null
   * for non-accumulators) and carries acquiredRound/symbiont so Cat-5 maturation
   * and symbiosis machinery keep working. sellPriceBonus resets to 0 (fresh
   * negative), matching natural transcendence.
   * @param {object} spirit      The live regular spirit being transcended.
   * @param {number} powerLevel  Snapshot power (stackCount; F4.26 Option B).
   */
  _buildTranscendedNegative(spirit, powerLevel) {
    return {
      id: spirit.id, name: spirit.name,
      stackCount: 1, isNegative: true, powerLevel,
      state: this._aggregateElementsForNegative(spirit, powerLevel),
      acquiredRound: this._round ?? 0,
      symbiont: spirit.symbiont || undefined, sellPriceBonus: 0,
    };
  }

  /**
   * Summon a spirit by id without spending ki (used by Cat zodiac).
   * Follows the same stacking/transcendence rules as buySpirit.
   * @param {string} spiritId
   * @returns {{ success: boolean, result?: string, reason?: string }}
   */
  summonSpirit(spiritId) {
    const spiritDef = getSpiritDef(spiritId);
    if (!spiritDef) return { success: false, reason: 'Unknown spirit' };
    return this._acquireSpiritStack(spiritDef, 1);
  }

  /**
   * Equip a spirit into the loadout.
   * @param {object} spirit
   * @throws {Error} if all slots are occupied.
   */
  addSpirit(spirit) {
    const regularCount = this._allSpirits.filter(s => !s.isNegative).length;
    if (regularCount >= this.spiritSlots) {
      throw new Error(`Spirit loadout is full (max ${this.spiritSlots} slots).`);
    }
    this._allSpirits.push(spirit);
  }

  /**
   * Remove the spirit at the given _allSpirits index.
   * @param {number} index
   * @returns {object} The removed spirit.
   * @throws {Error} if the index is out of range.
   */
  removeSpirit(index) {
    if (index < 0 || index >= this._allSpirits.length) {
      throw new Error(`No spirit at index ${index}.`);
    }
    return this._allSpirits.splice(index, 1)[0];
  }

  /**
   * Release a spirit, removing it from the loadout. No ki refund.
   * @param {number} index  Index into _allSpirits.
   * @returns {{ released: object }}
   * @throws {Error} if the index is out of range.
   */
  releaseSpirit(index) {
    const released = this.removeSpirit(index);
    if (!released) return { released: null, kiRefund: 0 };
    const def = getSpiritDef(released.id);
    const baseCost = def?.cost ?? 0;
    const baseRefund = Math.floor(baseCost / 2);
    const bonusRefund = released.sellPriceBonus ?? 0;
    const kiRefund = baseRefund + bonusRefund;
    if (kiRefund > 0) this._ki += kiRefund;
    return { released, kiRefund };
  }

  /**
   * Fire Past Life copy effect: pick random target, add copy at given power.
   * Targets both regulars and negatives (excludes Past Life itself).
   */
  _firePastLifeCopy(powerLevel) {
    const candidates = this._allSpirits.filter(s => s.id !== 'util_past_life');
    if (candidates.length === 0) return;
    let target;
    if (this._forcedPastLifeTarget) {
      target = candidates.find(s => s.id === this._forcedPastLifeTarget);
      this._forcedPastLifeTarget = null;
    }
    if (!target) target = candidates[Math.floor(Math.random() * candidates.length)];
    this._addPastLifeCopy(target, powerLevel);
  }

  /**
   * Add a Past Life copy of the target at given power level.
   * Regular targets: adds N stacks (may cascade-transcend).
   * Negative targets: creates new negative at powerLevel=N.
   */
  _addPastLifeCopy(target, powerLevel = 1) {
    if (target.isNegative) {
      // Negatives don't stack-merge — create parallel entry.
      this._allSpirits.push({
        id: target.id, name: target.name,
        symbiont: target.symbiont || undefined,
        stackCount: 1, isNegative: true, powerLevel,
        acquiredRound: this._round ?? 0,
        state: this._freshNegativeState(target.id, powerLevel),
      });
      return;
    }
    const def = getSpiritDef(target.id) ?? target;
    this._acquireSpiritStack(def, powerLevel);
  }

  /** Debug: force the next Past Life copy to target a specific spirit id (one-shot). */
  forcePastLifeTarget(spiritId) { this._forcedPastLifeTarget = spiritId; }

  /**
   * Fire Cuckoo Egg hatch: add a random Tier-2 fusion spirit.
   * All mature elements in a single sale produce the SAME fusion (RNG-synced).
   * @param {number} matureStacks  Number of mature elements hatching.
   * @returns {object|null} The hatched fusion def, or null if failed.
   */
  _fireCuckooHatch(matureStacks, source = {}) {
    if (matureStacks <= 0 || !this.canAddSpirit) return null;
    const fusions = SPIRIT_CATALOG.filter(s => s.category === 'fusion_t2');
    if (fusions.length === 0) return null;
    let target;
    if (this._forcedCuckooHatchTarget) {
      target = fusions.find(s => s.id === this._forcedCuckooHatchTarget);
      this._forcedCuckooHatchTarget = null;
    }
    if (!target) target = fusions[Math.floor(Math.random() * fusions.length)];
    if (source.isNegative) {
      // Negative Cuckoo hatches a NEGATIVE Tier-2 fusion at the copier's powerLevel (decision 7).
      const powerLevel = source.powerLevel ?? 1;
      const isSymbiont = target.channel === 'symbiont' || target.category === 'symbiont';
      this.addSpiritDirect({
        id: target.id, name: target.name,
        stackCount: 1, isNegative: true, powerLevel,
        state: this._freshNegativeState(target.id, powerLevel),
        acquiredRound: this._round ?? 0,
        symbiont: isSymbiont || undefined, sellPriceBonus: 0,
      });
    } else {
      this._acquireSpiritStack(target, matureStacks);
    }
    return target;
  }

  /** Debug: force the next Cuckoo Egg hatch target. */
  forceCuckooHatchTarget(fusionId) { this._forcedCuckooHatchTarget = fusionId; }

  /**
   * Fire Cat-5 maturation sale effects (Past Life copy / Cuckoo hatch) for a spirit being sold.
   * The single dispatch both sell branches route through (ruling D3), source-aware:
   *   - Regular source: fires once per mature element among those sold (count from acquiredRound).
   *   - Negative source: fires once if numerator >= denominator, at the copier's powerLevel.
   * Call AFTER the sold stacks are removed, so the freed slot is available to the copy/hatch.
   * @param {object} spirit                      The spirit being sold (state survives removal via ref).
   * @param {object} [opts]
   * @param {object[]|null} [opts.soldElements]  Regulars: the elements being sold, captured BEFORE
   *                                             removal (the partial-sell pop destroys them otherwise).
   */
  fireCat5SaleEffects(spirit, { soldElements = null } = {}) {
    const id = spirit.id;
    if (id !== 'util_past_life' && id !== 'sym_cuckoo_egg') return;

    if (spirit.isNegative) {
      const st = spirit.state;
      if (!st || (st.numerator ?? 0) < (st.denominator ?? Infinity)) return;
      const powerLevel = effectivePower(spirit);
      if (id === 'util_past_life') this._firePastLifeCopy(powerLevel);
      else this._fireCuckooHatch(1, { isNegative: true, powerLevel });
      return;
    }

    if (!soldElements) return;
    let matured = 0;
    for (const el of soldElements) if (isElementMature(el, this.round)) matured++;
    if (matured <= 0) return;
    if (id === 'util_past_life') this._firePastLifeCopy(matured);
    else this._fireCuckooHatch(matured);
  }

  // ── Unified spirit mutation API ───────────────────────────────────────────

  /**
   * Universal spirit-stack acquisition. Adds N stacks of spiritDef:
   *   - Merges into existing same-id non-negative spirit.
   *   - Creates a new entry if none exists (subject to slot validation).
   *   - Cascade-transcends at stackCount 4: negative with powerLevel = stackCount (all 4
   *     contribute, lossless — F4.26 Option B; matches Amber's full-power transcend).
   *   - Iterates one stack at a time so cascade + re-stacking both work.
   *
   * @param {object} spiritDef    Spirit definition (must have id, name).
   * @param {number} stackCount   Stacks to add (default 1).
   * @param {object} [options]
   * @param {boolean} [options.skipSlotCheck=false]  Bypass slot validation.
   * @returns {{ success: boolean, result?: string, reason?: string }}
   */
  _acquireSpiritStack(spiritDef, stackCount = 1, options = {}) {
    const { skipSlotCheck = false } = options;
    const isSymbiont = spiritDef.channel === 'symbiont' || spiritDef.category === 'symbiont';
    let lastResult = null;

    for (let i = 0; i < stackCount; i++) {
      const existing = this._allSpirits.find(s => s.id === spiritDef.id && !s.isNegative);

      if (existing) {
        existing.stackCount = (existing.stackCount ?? 1) + 1;
        this._addAccumulatorElement(existing);

        if (existing.stackCount >= 4) {
          const snapshotPower = existing.stackCount;   // F4.26 Option B: all-4-contribute (lossless), matches Amber
          const idx = this._allSpirits.indexOf(existing);
          // [FIX] Transcendence PRESERVES chain position — replace the transcending spirit
          // IN PLACE at its index, not splice+push-to-end (the prior append relocated the
          // Negative to the chain end). Transcendence frees a slot, it must not move the
          // spirit. See SPIRIT_SET_ITERATION_RULE.md §1.
          this._allSpirits.splice(idx, 1, this._buildTranscendedNegative(existing, snapshotPower));
          lastResult = 'transcended';
        } else {
          lastResult = 'stacked';
        }
      } else {
        if (!skipSlotCheck && !this.canAddSpirit) {
          return { success: false, reason: 'No spirit slots available', result: lastResult };
        }
        let spirit;
        if (isSymbiont) {
          spirit = this._buildSymbiontSpirit(spiritDef, 1);
        } else {
          spirit = { id: spiritDef.id, name: spiritDef.name, stackCount: 1, acquiredRound: this._round ?? 0, sellPriceBonus: 0 };
          this._initSpiritState(spirit);
        }
        this._allSpirits.push(spirit);
        lastResult = 'added';
      }
    }

    return { success: true, result: lastResult };
  }

  /**
   * Push a fully-formed spirit entry directly into _allSpirits without stacking,
   * cascade-transcendence, or symbiont auto-flagging. Use ONLY for:
   *   - Creating specific negatives with explicit powerLevel (Amber)
   *   - Duplicating an existing negative as a parallel entry (Sulfur negative-target)
   *   - Past Life negative-target copies
   *
   * For regular acquisition use _acquireSpiritStack() instead.
   * @param {object} spiritEntry  Full spirit object with all required fields set.
   */
  addSpiritDirect(spiritEntry) {
    this._allSpirits.push(spiritEntry);
  }

  /**
   * Remove a specific spirit object by reference.
   * @param {object} spirit  The spirit object to remove.
   * @returns {boolean} True if found and removed.
   */
  removeSpiritObj(spirit) {
    const idx = this._allSpirits.indexOf(spirit);
    if (idx >= 0) { this._allSpirits.splice(idx, 1); return true; }
    return false;
  }

  /**
   * Remove all spirits with stackCount <= 0.
   */
  removeZeroStackSpirits() {
    this._allSpirits = this._allSpirits.filter(s => (s.stackCount ?? 1) > 0);
  }

  /**
   * Replace a spirit object in-place (by reference lookup).
   * Used for metamorphosis (e.g. Caterpillar → Moth).
   * @param {object} oldSpirit  The spirit to replace.
   * @param {object} newSpirit  The replacement.
   * @returns {boolean} True if found and replaced.
   */
  replaceSpiritObj(oldSpirit, newSpirit) {
    const idx = this._allSpirits.indexOf(oldSpirit);
    if (idx >= 0) { this._allSpirits[idx] = newSpirit; return true; }
    return false;
  }

  /**
   * Insert a spirit at a specific _allSpirits index.
   * @param {number} index
   * @param {object} spiritEntry
   */
  insertSpiritAt(index, spiritEntry) {
    this._allSpirits.splice(index, 0, spiritEntry);
  }

  // ── Legendary spirit slots ─────────────────────────────────────────────────

  static LEGENDARY_PURCHASE_COST = 25;
  static LEGENDARY_SELL_VALUE    = 10;

  addLegendarySpirit(spiritDef) {
    if (this._legendarySpirits.some(s => s.id === spiritDef.id)) {
      return { success: false, reason: 'Legendary already owned' };
    }
    if (!this.canAddLegendary) {
      return { success: false, reason: 'No Legendary slot available' };
    }
    this._legendarySpirits.push({
      id: spiritDef.id, name: spiritDef.name, legendary: true,
    });
    return { success: true };
  }

  removeLegendarySpirit(index) {
    if (index < 0 || index >= this._legendarySpirits.length) return null;
    return this._legendarySpirits.splice(index, 1)[0];
  }

  sellLegendarySpirit(index) {
    const spirit = this._legendarySpirits[index];
    if (!spirit) return { success: false };
    this._legendarySpirits.splice(index, 1);
    this._ki += RunManager.LEGENDARY_SELL_VALUE;
    return { success: true, refund: RunManager.LEGENDARY_SELL_VALUE };
  }

  // ── Blessings ─────────────────────────────────────────────────────────────

  get blessings() { return [...this._blessings]; }

  addBlessing(blessingDefOrId) {
    const def = typeof blessingDefOrId === 'string'
      ? getBlessingDef(blessingDefOrId)
      : blessingDefOrId;
    if (!def) return;
    if (this._blessings.some(b => b.id === def.id)) return;
    this._blessings.push({ id: def.id, name: def.name, tier: def.tier, effect: def.effect });
    logger.logBlessingObtained(def.id, def.name, def.tier);
  }

  hasBlessing(id) {
    return this._blessings.some(b => b.id === id);
  }

  countBlessingsByEffect(effectId) {
    return this._blessings.filter(b => b.effect === effectId).length;
  }

  // ── Consumable inventory ───────────────────────────────────────────────────

  get consumables()      { return [...this._consumables]; }
  get canAddConsumable() { return this._consumables.length < this.maxConsumableSlots; }

  swapConsumables(indexA, indexB) {
    if (indexA < 0 || indexA >= this._consumables.length) return;
    if (indexB < 0 || indexB >= this._consumables.length) return;
    const temp = this._consumables[indexA];
    this._consumables[indexA] = this._consumables[indexB];
    this._consumables[indexB] = temp;
  }

  /**
   * Add a consumable to the inventory.
   * @param {object} consumable
   * @throws {Error} if all slots are occupied.
   */
  addConsumable(consumable) {
    if (this._consumables.length >= this.maxConsumableSlots) {
      throw new Error(`Consumable inventory is full (max ${this.maxConsumableSlots} slots).`);
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
    const cost = this.getEffectiveCost(def.cost);
    if (this._ki < cost) return { success: false, reason: 'Not enough ki' };
    this._ki -= cost;
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
    let baseCost = 0;
    if (cons.id.startsWith('element_'))     baseCost = getElementDef(cons.id)?.cost ?? 0;
    else if (cons.id.startsWith('stamp_'))  baseCost = getStampDef(cons.id)?.cost ?? 0;
    else if (cons.id.startsWith('chakra_')) baseCost = CHAKRA_TOOLS.find(c => c.id === cons.id)?.cost ?? 0;
    else                                    baseCost = getZodiacDef(cons.id)?.cost ?? cons.cost ?? 0;
    const baseRefund = Math.floor(baseCost / 2);
    const bonusRefund = cons.sellPriceBonus ?? 0;
    const refund = baseRefund + bonusRefund;
    this._consumables.splice(index, 1);
    if (refund > 0) this._ki += refund;
    logger.logConsumableSold(cons.name ?? cons.id, refund);
    return { success: true, kiReturned: refund };
  }

  // ── Negative consumable inventory ──────────────────────────────────────────

  get negativeConsumables() { return [...this._negativeConsumables]; }

  addNegativeConsumable(consumableDef, source = 'unspecified') {
    this._negativeConsumables.push({ id: consumableDef.id, name: consumableDef.name, description: consumableDef.description, category: consumableDef.category });
    logger.logNegativeConsumableObtained(consumableDef.name ?? consumableDef.id, source);
  }

  removeNegativeConsumable(index) {
    if (index < 0 || index >= this._negativeConsumables.length) return null;
    return this._negativeConsumables.splice(index, 1)[0];
  }

  /**
   * Use a consumable by id, preferring regular inventory, falling back to negatives.
   * Returns the consumed entry or null if not found.
   * @param {string} consumableId
   * @returns {object|null}
   */
  consumeById(consumableId) {
    const regIdx = this._consumables.findIndex(c => c.id === consumableId);
    if (regIdx !== -1) return this._consumables.splice(regIdx, 1)[0];
    const negIdx = this._negativeConsumables.findIndex(c => c.id === consumableId);
    if (negIdx !== -1) return this._negativeConsumables.splice(negIdx, 1)[0];
    return null;
  }

  // ── Run progression ────────────────────────────────────────────────────────

  get round()      { return this._round; }

  /** Current act number (1-based, 6 total). */
  get act()        { return Math.floor((this._round - 1) / RunManager.ROUNDS_PER_ACT) + 1; }

  /** Round position within the current act (1–6). */
  get roundInAct() { return ((this._round - 1) % RunManager.ROUNDS_PER_ACT) + 1; }

  /** Minimum score required to pass the current round. */
  get threshold()  { return RunManager.THRESHOLDS[this._round - 1] ?? 0; }

  /**
   * True when a Sacred Grove visit should PRECEDE the round about to be played.
   * Query this AFTER calling advanceRound() — _round is then the next round to
   * play, and a Grove precedes each round in GROVE_ROUNDS ({3,6,...,36}), so the
   * player gears up before each act-closing round and the final round.
   */
  get isGroveRound() { return RunManager.GROVE_ROUNDS.includes(this._round); }

  /**
   * True when all 36 rounds have been completed.
   * Query this AFTER calling advanceRound().
   */
  get isRunComplete() { return this._round > RunManager.TOTAL_ROUNDS; }

  /**
   * Alias of isGroveRound — used by GameScene to decide the next transition.
   * After advanceRound(): "the next round to play is a Grove round, so the next
   * destination is the Sacred Grove" — the player gears up BEFORE the hard round.
   */
  get nextIsGrove() { return RunManager.GROVE_ROUNDS.includes(this._round); }

  /** True once the run has ended (won or lost). */
  get runOver() { return this._runOver; }

  /** True if the run ended in victory. */
  get runWon()  { return this._runWon; }

  // ── Flow system ────────────────────────────────────────────────────────────

  /**
   * Called when the player completes a new yaku after pushing. Fires the hexagram onPushSuccess
   * hook. The push-depth increment is owned by the caller (GRM owns the round-local _pushDepth) —
   * flow is not mutated until bank/fail resolution.
   */
  onPushSuccess() {
    const effect = getActiveEffect();
    if (effect?.onPushSuccess) effect.onPushSuccess(this);
  }

  /**
   * Called when the round ends after a push with no new yaku (push failure). Applies the failure
   * multiplier at depth+1 (the would-be depth of the in-flight failed push).
   * @param {number} [depth]  Current resolved push depth; failure resolves at depth+1.
   */
  onPushFailure(depth) {
    if (depth != null) {
      const failDepth = depth + 1;
      const mult  = getPushMultiplier(failDepth, 'failure');
      const oldFlow = this._flow;
      this._flow *= mult;
      logger.logFlowChange(oldFlow, this._flow, `push failure (depth ${failDepth})`);
    }
    const effect = getActiveEffect();
    if (effect?.onPushFailure) effect.onPushFailure(this);
  }

  /**
   * Called when the player banks. Applies the success multiplier from the push curve at the
   * current push depth. At depth 0 the multiplier is 1.0.
   * @param {number} [depth]  Current push depth (resolution depth on bank).
   */
  onBank(depth) {
    if (depth == null) return;
    const mult  = getPushMultiplier(depth, 'success');
    if (mult !== 1.0) {
      const oldFlow = this._flow;
      this._flow *= mult;
      logger.logFlowChange(oldFlow, this._flow, `bank (depth ${depth})`);
    }
  }

  /**
   * Apply end-of-round flow decay. Call after push/bank resolution, before shop.
   * Default: ×0.95 per round.  Hexagram can modify this rate.
   */
  /** Effective flow decay rate after Capstone Time + hexagram modifiers. */
  getEffectiveFlowDecay() {
    const time = this._legendarySpirits.some(s => s.id === 'capstone_time');
    const base = time ? 1.0 : RunManager.FLOW_DECAY_RATE;
    return applyHook('modifyFlowDecay', base, base);
  }

  applyFlowDecay() {
    const rate = this.getEffectiveFlowDecay();
    if (rate !== 1.0) {
      const oldFlow = this._flow;
      this._flow *= rate;
      logger.logFlowChange(oldFlow, this._flow, 'round decay');
    }
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
    const flowBonus = applyHook('modifyStyleFlow', comboValue, comboValue);
    const oldFlow = this._flow;
    this._flow += flowBonus;
    logger.logFlowChange(oldFlow, this._flow, `style combo: ${comboId}`, 'additive');
    return true;
  }

  /**
   * Compute the ki reward for a style combo (hexagram may modify it).
   * Returns the ki amount the caller should grant.
   * @param {number} baseKi  Default ki reward for the combo.
   */
  styleComboKi(baseKi) {
    return applyHook('modifyStyleKi', baseKi, baseKi);
  }

  // ── Round advancement ──────────────────────────────────────────────────────

  /**
   * Increment the round counter for the round just completed.
   * @param {number} [roundScore=0]  Retained for call-site compatibility (unused).
   * @returns {this}
   */
  advanceRound(roundScore = 0) {
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
    const cardsInHand  = result.cardsInHand  ?? 0;
    const earthKiBonus = result.earthKiBonus ?? 0;
    const pushFailed   = result.penaltyApplied ?? false;
    const pushDepth    = result.pushDepth ?? 0;
    const outcome      = pushFailed ? 'failure' : 'success';
    // Bucket-B (F4.20): econ_piggybank's x(1+stacks) on handKi is a term in this RunManager-owned
    // ki-reward formula — intentionally in place, not seepage. See F4.16_F4.20_triage_ledger.md.
    const piggyStacks  = this.countStackedById('econ_piggybank');
    const piggyMult    = piggybankHandKiMult(piggyStacks);
    let handKi         = pushFailed ? 0 : cardsInHand * piggyMult;
    handKi             = applyHook('modifyHandKi', handKi, handKi);
    const pushMult     = getPushMultiplier(pushDepth, outcome);
    const interestKi   = Math.floor(this._ki * this.interestRate * pushMult);
    const flat         = 5;
    const subtotal     = flat + handKi + earthKiBonus + interestKi;
    const total        = applyHook('modifyKiReward', subtotal, subtotal, {
      cardsInHand, baseKi: flat, handKi, earthKiBonus, interestKi,
    });
    const hookDelta    = total - subtotal;
    return {
      total,
      breakdown: {
        flat, handKi, earthKi: earthKiBonus, interest: interestKi,
        hookDelta, pushFailed, cardsInHand, piggyStacks, piggyMult,
      },
    };
  }

  // ── Interest system ────────────────────────────────────────────────────────

  /** Base interest rate applied at the start of each round. */
  get interestRate() {
    let rate = 0.10;
    // Bucket-B (F4.20): econ_bonds (+0.05/stack) and econ_ingot (+ki*0.0001) are terms in this
    // RunManager-owned compounding formula — intentionally in place, not seepage. See F4.16_F4.20_triage_ledger.md.
    const bondsCount = this.countStackedById('econ_bonds');
    rate += bondsCount * 0.05;
    if (this._allSpirits.some(s => s.id === 'econ_ingot'))  rate += this._ki * 0.0001;
    return applyHook('modifyInterestRate', rate, rate);
  }

  // ── Persistent deck ────────────────────────────────────────────────────────

  /**
   * Shallow copy of the canonical deck array.
   * Card objects are shared references — mutations (element enhancements) propagate.
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
    const target    = getBaseCard(card.month, nextType);

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
    this._notifyBadger();
  }

  /**
   * Permanently remove a card from the canonical deck.
   * @param {string} cardId
   */
  deleteCard(cardId) {
    const idx = this._deck.findIndex(c => c.id === cardId);
    if (idx !== -1) {
      const card = this._deck[idx];
      // Fire card-destroyed event BEFORE removal so handlers can inspect card.
      this._fireCardDestroyedEvent(card);
      logger.logCardDestroyed(card.name ?? card.id, 'deleteCard');
      this._deck.splice(idx, 1);
      this._notifyBadger();
    }
  }

  /**
   * Duplicate a deck card: deep-clone it with a unique `_throat_N` id, push it
   * to the persistent deck, and fire the collection-invariant side effects
   * (engine_palace cardsAdded counter, Badger). Backs the Throat Chakra handler
   * in ConsumableEffects; the caller inserts the returned card into the
   * round-local draw pile for same-round availability.
   * @param {string} cardId
   * @returns {{ success: boolean, newCard?: object, reason?: string }}
   */
  duplicateCardToDeck(cardId) {
    const card = this._deck.find(c => c.id === cardId);
    if (!card) return { success: false, reason: 'Card not found' };
    this._throatCounter++;
    const newCard = {
      ...JSON.parse(JSON.stringify(card)),
      id:               card.id + `_throat_${this._throatCounter}`,
      throatDuplicated: true,
    };
    this._deck.push(newCard);
    // engine_palace: increment counter when a card is added to the deck.
    for (const spirit of this._allSpirits) {
      if (spirit.id === 'engine_palace') incrementPerElement(spirit, 'cardsAdded', 1);
    }
    this._notifyBadger();
    return { success: true, newCard };
  }

  /**
   * Fire the card-destroyed event for all spirits with onCardDestroyed handlers.
   * @param {object} card - The card being destroyed
   */
  _fireCardDestroyedEvent(card) {
    for (const spirit of this._allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.onCardDestroyed) {
        effect.onCardDestroyed({ card, spirit, run: this });
      }
    }
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
    this._notifyBadger();
  }

  /** sym_badger: notify that a consumable was used. */
  _notifyBadger() {
    for (const spirit of this._allSpirits) {
      if (spirit.id === 'sym_badger') {
        incrementPerElement(spirit, 'consumablesUsed', 1);
      }
    }
  }

  /**
   * Charge ki for a consumable activation at its effective cost and record the
   * activation (Badger). Run-economy concern owned by RunManager; consumable
   * effect handlers (ConsumableEffects.js) call this after validating their target.
   * @param {number} baseCost
   * @returns {boolean} false if unaffordable — no ki spent, no activation recorded.
   */
  spendKiForConsumable(baseCost) {
    const cost = this.getEffectiveCost(baseCost);
    if (this._ki < cost) return false;
    this._ki -= cost;
    this._notifyBadger();
    return true;
  }

  /**
   * Public entry for consumable effect handlers (ConsumableEffects.js) to record
   * a consumable activation. Used by the chakra handlers, which (unlike stamps)
   * charge no ki at apply — they only need to fire the Badger counter.
   */
  notifyConsumableUsed() { this._notifyBadger(); }

  // ── Card shop ─────────────────────────────────────────────────────────────

  /**
   * Buy a card and add it to the permanent deck.
   * Generates a unique id to avoid conflicts with existing cards.
   * @param {object} cardData  Card object (may include enhancement/ribbonStamp).
   * @param {number} price     Ki cost.
   * @returns {{ success: boolean, reason?: string, card?: object }}
   */
  buyCard(cardData, price) {
    const cost = this.getEffectiveCost(price);
    if (this._ki < cost) return { success: false, reason: 'Not enough ki' };
    this._ki -= cost;
    const suffix  = `_shop_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newCard = {
      ...JSON.parse(JSON.stringify(cardData)),
      id:            cardData.id + suffix,
      shopPurchased: true,
    };
    this._deck.push(newCard);
    logger.logCardAdded(newCard.name ?? newCard.id, 'shop purchase');
    // engine_palace: increment counter when a card is added to the deck.
    for (const spirit of this._allSpirits) {
      if (spirit.id === 'engine_palace') incrementPerElement(spirit, 'cardsAdded', 1);
    }
    return { success: true, card: newCard };
  }

  // ── Chakra Tools ──────────────────────────────────────────────────────────
  // Chakra application migrated to ConsumableEffects.js (consumable-block A2).
  // Card-level mutation lives there; collection-invariant primitives stay here:
  // deleteCard (Third Eye), duplicateCardToDeck (Throat), getBaseCard (cards.js,
  // Sacral). Chakras charge NO ki at apply — handlers fire notifyConsumableUsed.

  // ── Stamps ────────────────────────────────────────────────────────────────
  // Stamp application migrated to ConsumableEffects.js (consumable-block A1).
  // Card-level mutation lives there; ki spend + Badger stay here via
  // spendKiForConsumable(). mixStamps remains the data-owned mixing primitive.

  // ── Wu Xing enhancements ───────────────────────────────────────────────────
  // Element ATTACH (applyElement + _createBaseEnhancement + the generative/
  // destructive cycle helpers) migrated to ConsumableEffects.js (consumable-block
  // A3). The per-scoring/round-end PROC surface (depLevel++/getWaterMult, Fire
  // break, Earth interest, Metal jackpot, Wood slots) remains in GameRoundManager
  // — F4.38's territory. addConsumable/canAddConsumable stay here (inventory
  // economy the scenes call for the strip→return re-add).

  /**
   * Generate a random consumable from the full pool (Wu Xing, Zodiac, Chakra,
   * primary stamps) and add it to the consumable inventory if space is available.
   * Excludes alchemicals (earned/bought, not generated).
   * @returns {object|null}  The consumable added, or null if inventory was full.
   */
  generateRandomConsumable() {
    if (!this.canAddConsumable) return null;
    const pool = [
      ...WUXING_CONSUMABLES,
      ...ZODIAC_CONSUMABLES,
      ...CHAKRA_TOOLS,
      ...PRIMARY_STAMPS,
    ];
    const def  = pool[Math.floor(Math.random() * pool.length)];
    const cons = { id: def.id, name: def.name, description: def.description, category: def.category };
    this._consumables.push(cons);
    return cons;
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────

}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the effective power level of a spirit.
 * Regulars: stackCount. Negatives: powerLevel (defaults to 1 for legacy data).
 */
export function effectivePower(spirit) {
  if (spirit.isNegative) return spirit.powerLevel ?? 1;
  return spirit.stackCount ?? 1;
}

/**
 * Look up the multiplier for a given push resolution depth and outcome.
 * Extrapolates linearly for depths beyond the table.
 * @param {number} depth   Resolution depth (0+)
 * @param {string} outcome 'success' or 'failure'
 * @returns {number}
 */
export function getPushMultiplier(depth, outcome) {
  // Compute base multiplier from curve or extrapolation.
  let baseMult;
  const entry = RunManager.PUSH_CURVE[depth];
  if (entry && entry[outcome] !== undefined) {
    baseMult = entry[outcome];
  } else if (outcome === 'success') {
    baseMult = 2.00 + 0.50 * (depth - 4);
  } else if (outcome === 'failure') {
    baseMult = Math.max(0.05, 0.50 - 0.15 * (depth - 4));
  } else {
    return 1.0;
  }

  // Apply hexagram amplifier hook.
  const hookName = outcome === 'success' ? 'pushCurveSuccessAmplifier' : 'pushCurveFailureAmplifier';
  let amplifier = applyHook(hookName, 1.0, 1.0);

  // Capstone Time: amplify successes 1.5×, dampen failures 0.5×.
  const hasTime = run._legendarySpirits?.some(s => s.id === 'capstone_time') ?? false;
  if (hasTime) {
    amplifier *= (outcome === 'success' ? 1.5 : 0.5);
  }

  // Apply amplifier as delta-from-neutral scaling.
  return 1.0 + (baseMult - 1.0) * amplifier;
}

// ── Singleton export ──────────────────────────────────────────────────────────
// All scenes and systems import this single shared instance.
// The class itself is also exported so callers can read static constants
// (e.g. RunManager.MAX_SPIRIT_SLOTS) without depending on magic numbers.
const run = new RunManager();
export { RunManager };
export default run;

// Dev-only: expose for browser console testing
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.run = run;
}