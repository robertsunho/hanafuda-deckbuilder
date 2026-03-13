// ─────────────────────────────────────────────────────────────────────────────
// GameRoundManager — orchestrates a single round of Koi-Koi gameplay
//
// Turn flow (split into two calls so the UI can animate intermediate states):
//
//   HAND PHASE
//     The played card is applied to the field via field.playHandCard():
//       • Match found  → a 'pending' slot is formed on the field.
//       • 4-card total → immediate auto-capture; no pending slot.
//       • No match     → card placed in a new field slot (or discarded).
//
//   DECK PHASE  (runs immediately after hand phase)
//     The top deck card is flipped.
//       • Pending match exists AND deck month === pending month
//           → deck card joins the pending slot.
//           → If 4 cards now: auto-capture.
//           → Otherwise: slot strands on the field (state reverts to 'normal').
//       • Pending match exists AND deck month ≠ pending month
//           → 2-card pending: both cards captured immediately.
//           → 3-card pending: stranded (reverts to 'normal'; waits for 4th).
//           → Deck card goes to the field normally (stacks with same-month
//             normal slot, or starts a new slot; 4-card auto-capture applies).
//       • No pending match
//           → Deck card goes to the field normally.
//
//   After both phases, ScoringEngine is run and the turn is finalised.
//
// Turn is split into two callable phases so the UI can animate them
// separately:
//
//   playHandCards(cardIds) → { status: 'awaiting_deck', handCards, matched,
//                               autoCaptured, discarded }
//     Removes the card from hand, applies the hand phase, sets phase to
//     'awaiting_deck'.  The UI re-renders the board (pending match visible)
//     before continuing.
//
//   playDeckPhase() → { status: 'ok'|'round_over', newYaku, allYaku,
//                        yakuPoints, turn, deckCard, discarded,
//                        roundDiscardCount }
//     Flips the deck card, resolves the pending match, finalises the turn.
//
// Phase state machine:
//   'idle'          → ready for playHandCard()
//   'awaiting_deck' → hand phase complete; ready for playDeckPhase()
//   'round_over'    → hand is empty; call startRound() to begin again
// ─────────────────────────────────────────────────────────────────────────────

import DeckManager      from "./DeckManager.js";
import HandManager      from "./HandManager.js";
import FieldManager     from "./FieldManager.js";
import CaptureManager   from "./CaptureManager.js";
import ScoringEngine, { SNOW_MULT, ICE_MULT } from "./ScoringEngine.js";
import ConsumableEffects from "./ConsumableEffects.js";
import StyleEngine      from "./StyleEngine.js";
import SpiritEffects    from "./SpiritEffects.js";
import run              from "./RunManager.js";
import logger           from "./GameplayLogger.js";
import { SPIRIT_CATALOG, getSpiritDef, ANIMAL_SYMBIONT_MAP } from "../data/spirits.js";

export default class GameRoundManager {

  // ── Round configuration (adjust freely for playtesting) ────────────────────
  static PLAYS_PER_ROUND = 5;   // how many hand cards the player may play
  static HAND_SIZE       = 8;   // cards dealt to the player's hand at deal time
  static FIELD_DEAL      = 8;   // cards dealt face-up to the field at deal time
  static MAX_DISCARDS    = 2;   // free discards available per round

  constructor() {
    this._deck    = new DeckManager();
    this._hand    = new HandManager({ maxSize: 16 }); // 16 allows push accumulation in capture mode
    this._field   = new FieldManager();
    this._capture = new CaptureManager();
    this._scoring = new ScoringEngine();
    this._style   = new StyleEngine();

    /** @type {'idle'|'awaiting_deck'|'round_over'} */
    this._phase = "idle";

    /**
     * Yaku name → bonus snapshot taken at the start of the current turn.
     * Used to diff against post-turn evaluation: a yaku is "new" if its name
     * was absent OR its bonus grew by >0.3.
     * @type {Map<string, number>}
     */
    this._yakuBeforeTurn = new Map();

    /** 1-based turn counter, incremented after each complete turn. */
    this._turn = 0;

    /**
     * The most recently flipped deck card, exposed for the UI to display.
     * @type {object|null}
     */
    this._lastDeckCard = null;

    /** Running count of cards discarded (field full) this round. */
    this._discardCount = 0;

    /**
     * Cards discarded during the current turn (cleared at turn start).
     * Exposed in the playCard() return value so the UI can animate them.
     * @type {object[]}
     */
    this._discardedThisTurn = [];

    /**
     * All cards discarded this round (field-full + player intentional).
     * Accumulates across turns; reset by startRound().
     * @type {object[]}
     */
    this._allDiscards = [];

    /** Plays remaining this round (counts down from PLAYS_PER_ROUND). */
    this._playsRemaining = GameRoundManager.PLAYS_PER_ROUND;

    /** Discards remaining this round (counts down from MAX_DISCARDS). */
    this._discardsRemaining = GameRoundManager.MAX_DISCARDS;

    /**
     * Groups of cards that were auto-captured at round start because the
     * opening hand contained all 4 cards of the same month.
     * Each entry is an array of 4 card objects.
     * @type {object[][]}
     */
    this._naturalCaptures = [];

    /**
     * Running total of base capture points earned this round.
     * Incremented immediately whenever cards are captured (both phases).
     * Full-month captures (4 cards at once) earn a +5 bonus on top of card values.
     */
    this._basePoints = 0;

    /**
     * The finalScore recorded at the moment the player chose to push rather
     * than bank.  Informational — used by the UI to show what is at risk.
     */
    this._atRiskScore = 0;

    /**
     * True while the player is exposed to the push penalty.
     * Set by pushOn(); cleared the next time a new yaku is completed.
     */
    this._pushPenaltyActive = false;

    /** Number of times the player has pushed this round. */
    this._pushCount = 0;

    /**
     * Style Base snapshot for this round — copied from run.styleBase at round
     * start via setStyleBase().  Updated by recordStyleHand() when the player
     * makes a resonance play.  Used to compute Flow at round end.
     */
    this._styleBase = 1.0;

    /**
     * True when the round would normally end (hand empty or plays exhausted)
     * but a new yaku was also completed on that same turn.  The round-over
     * transition is deferred until the player resolves the Bank/Push decision:
     *   bankScore() → clears flag, moves to 'round_over' as usual.
     *   pushOn()    → clears flag, resets plays/hand, continues play.
     */
    this._roundEndingAfterDecision = false;

    /** Set by Dog consumable; suppresses the push penalty for this round. */
    this._dogProtection = false;

    /** Set by Pig consumable; doubles ki earned at round end. */
    this._pigDoubleKi = false;

    /**
     * Style combos newly triggered on the most recent capture event.
     * Read (and cleared) by GameScene via the lastStyleCombos getter.
     * @type {{ id: string, name: string, bonus: number }[]}
     */
    this._lastStyleCombos = [];

    /**
     * Active spirit loadout for this round — used by ScoringEngine to run
     * spirit scoring hooks.  Set via setSpirits() before startRound().
     * @type {object[]}
     */
    this._spirits = [];
  }

  // ── Read-only accessors ────────────────────────────────────────────────────

  get deck()           { return this._deck; }
  get hand()           { return this._hand; }
  get field()          { return this._field; }
  get capture()        { return this._capture; }
  get phase()          { return this._phase; }
  get turn()           { return this._turn; }
  get lastDeckCard()   { return this._lastDeckCard; }
  /** Total cards discarded (field full) since the round started. */
  get discardCount()   { return this._discardCount; }
  /** All cards discarded this round: field-full + player intentional. */
  get allDiscards()    { return [...this._allDiscards]; }
  /** Plays remaining before the round ends (counts down each turn). */
  get playsRemaining() { return this._playsRemaining; }
  /** Free discards remaining this round (counts down from MAX_DISCARDS). */
  get discardsRemaining() { return this._discardsRemaining; }
  /** Running base capture points earned so far this round. */
  get basePoints()     { return this._basePoints; }
  /** Number of times the player has pushed this round. */
  get pushCount()      { return this._pushCount; }
  /**
   * Cards auto-captured at round start due to a natural full month in hand.
   * Each element is an array of 4 cards (one group per captured month).
   * Empty until startRound() has been called.
   * @type {object[][]}
   */
  get naturalCaptures() { return this._naturalCaptures; }

  /** True when the Dog consumable has nullified the push penalty. */
  get dogProtection() { return this._dogProtection; }

  /** True when the Pig consumable has queued a ki-reward double. */
  get pigDoubleKi()   { return this._pigDoubleKi; }

  /** True when the Goat consumable is active (+1 ki per capture). */
  get goatActive()    { return this._goatActive; }

  /**
   * Returns the effective capture-mode yaku thresholds, accounting for any
   * Snake consumable modifier applied this round.
   */
  _getCaptureThresholds() {
    const base = { kasu: 6, tanzaku: 3, tane: 3, hikari: 2 };
    if (!this._snakeThresholdMods) return base;
    const result = { ...base };
    for (const [key, reduction] of Object.entries(this._snakeThresholdMods)) {
      if (key in result) result[key] = Math.max(1, result[key] - reduction);
    }
    return result;
  }

  /**
   * Style combos newly triggered on the last capture event.
   * Clears the internal buffer after reading so each event is consumed once.
   * @returns {{ id: string, name: string, bonus: number }[]}
   */
  get lastStyleCombos() {
    const combos = this._lastStyleCombos;
    this._lastStyleCombos = [];
    return combos;
  }

  /** Total style bonus accumulated from combos triggered so far this round. */
  get roundStyleTotal() { return this._style.getRoundStyleTotal(); }

  /** Ki gained from Earth enhancements at the start of this round (0 if none). */
  get lastEarthKiGain() { return this._lastEarthKiGain ?? 0; }
  /** Ki gained from base interest at the start of this round (0 if none). */
  get lastInterestGain() { return this._lastInterestGain ?? 0; }

  /** All style combos triggered this round (for end-of-round display). */
  get triggeredStyleCombos() { return this._style.getTriggeredCombos(); }

  /** Running total of score accumulated this round (capture events). */
  get runningScore() { return this._runningScore; }
  /** Set of card IDs already spent by yaku scoring. */
  get spentCardIds()  { return new Set(this._spentCardIds); }
  /** Number of yaku scoring events fired this round. */
  get eventCount()    { return this._eventCount; }
  /** All scoring events fired this round. */
  get scoringEvents() { return [...(this._scoringEvents ?? [])]; }

  /**
   * Set the active spirit loadout for scoring.  Call before startRound().
   * @param {object[]} spirits  Spirit objects from RunManager.spirits.
   */
  setSpirits(spirits) { this._spirits = [...spirits]; }

  /**
   * Set the Style Base for this round.  Call before startRound() with the
   * run's current styleBase so scoring uses the up-to-date value.
   * @param {number} styleBase
   */
  setStyleBase(styleBase) { this._styleBase = styleBase; }

  /**
   * Record a resonance (style) hand — increments the round's Style Base by 0.1.
   * Also call run.accumulateStyle() from the game scene so the RunManager
   * stays in sync for cross-round decay.
   * @returns {number} The updated styleBase.
   */
  recordStyleHand() {
    this._styleBase += 0.1;
    return this._styleBase;
  }

  /**
   * Live scoring snapshot — evaluates the current capture pile and returns
   * the full picture needed to render the score HUD.
   *
   * Push Factor shown here is the optimistic value (assumes no failure).
   *
   * @returns {{ allYaku, totalMultiplier, pushFactor, styleBase,
   *             flow, basePoints, finalScore }}
   */
  getCurrentScoring() {
    // Live estimate: assume best-case (no pending failure) for HUD display.
    const pushFactor = Math.min(1.5, 1.0 + this._pushCount * 0.1);
    const flow       = Math.max(1.0, this._styleBase * pushFactor);
    const sc = this._scoring.calculateFinalScore(this._capture.getAll(), this._spirits, flow, run.yakuUpgrades);
    return {
      ...sc,
      allYaku:         sc.yakuList,
      totalMultiplier: sc.yakuMult,
      basePoints:      sc.boostedBasePoints,
      pushFactor,
      styleBase:       this._styleBase,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Begin a new round: full-reset the deck, shuffle, deal 8 cards to the
   * player's hand, and deal 8 cards face-up to the field.
   *
   * During the field deal, same-month cards automatically stack (up to 3 per
   * slot per the DEAL_STACK_CAP rule).
   *
   * Safe to call on an already-started round — all state is wiped first.
   *
   * @returns {this} for chaining
   */
  startRound() {
    // ── Base interest (10% of ki balance) ────────────────────────────────
    this._lastInterestGain = run.applyInterest();

    // ── Earth enhancement ki generation (before dealing) ─────────────────
    // Each Clay card contributes 2% ki interest; Pottery contributes 5%.
    const deckCards = run.getDeck();
    let earthInterest = 0;
    for (const card of deckCards) {
      if (card.enhancement?.element === 'earth') {
        earthInterest += card.enhancement.tier === 'upgraded' ? 0.05 : 0.02;
      }
    }
    const kiGain = Math.floor(run.ki * earthInterest);
    if (kiGain > 0) run.addKi(kiGain);
    this._lastEarthKiGain = kiGain;

    this._deck.resetWithCards(run.getDeck()).shuffle();
    this._hand.clear();
    this._field.clear();
    this._capture.clear();

    this._phase              = "idle";
    this._yakuBeforeTurn     = new Map();
    this._turn               = 0;
    this._lastDeckCard       = null;
    this._discardCount       = 0;
    this._discardedThisTurn  = [];
    this._allDiscards        = [];
    this._playsRemaining     = GameRoundManager.PLAYS_PER_ROUND;
    this._discardsRemaining  = GameRoundManager.MAX_DISCARDS;
    this._basePoints         = 0;
    this._naturalCaptures    = [];
    this._atRiskScore              = 0;
    this._pushPenaltyActive        = false;
    this._pushCount                = 0;
    this._roundEndingAfterDecision = false;
    this._dogProtection            = false;
    this._pigDoubleKi              = false;
    this._rabbitActive             = false;
    this._goatActive               = false;
    this._tigerPushActive          = false;
    this._snakeThresholdMods       = {};
    this._lastStyleCombos          = [];
    this._style.resetRound();

    // ── Symbiont per-round resets ─────────────────────────────────────────
    for (const spirit of this._spirits) {
      if (spirit.id === 'sym_ducks'   && spirit.state) spirit.state.pairsThisRound = 0;
      if (spirit.id === 'sym_crow'    && spirit.state) spirit.state.usedThisRound  = false;
      if (spirit.id === 'sym_osprey'  && spirit.state) spirit.state.usedThisRound  = false;
      // sym_cuckoo_egg: countdown — hatch when it reaches 0.
      if (spirit.id === 'sym_cuckoo_egg' && spirit.state) {
        spirit.state.roundsRemaining--;
        if (spirit.state.roundsRemaining <= 0) {
          const fusions = SPIRIT_CATALOG.filter(s => s.tier === 2);
          const target  = fusions[Math.floor(Math.random() * fusions.length)];
          if (target) {
            spirit.id    = target.id;
            spirit.name  = target.name;
            spirit.state = null;
          }
        }
      }
    }

    // ── Additive scoring state ────────────────────────────────────────────
    this._runningScore  = 0;
    this._scoringEvents = [];
    this._eventCount    = 0;
    this._spentCardIds  = new Set();

    // ── Empty-slot play tracking (for Fix D/E capture rules) ─────────────
    this._lastHandPlayToEmptySlot = null;

    // game_expanse: +2 field slots (10 total).
    if (this._spirits.some(s => s.id === 'game_expanse')) {
      this._field.setMaxSlots(10);
    }

    const surplusExtra = this._spirits.some(s => s.id === 'game_surplus') ? 2 : 0;
    this._hand.add(this._deck.draw(GameRoundManager.HAND_SIZE + surplusExtra));

    // Deal field cards one at a time so stacking rules are applied per card.
    for (const card of this._deck.draw(GameRoundManager.FIELD_DEAL)) {
      this._field.dealCard(card);
    }

    logger.logRoundStart(
      run.round, run.act, run.threshold,
      this._hand.getAll(), this._field.getAll(),
      this._lastEarthKiGain ?? 0, run.ki, run.getDeck().length
    );
    logger.logSpiritLoadout(this._spirits);

    return this;
  }

  /**
   * Phase 1 of a turn: remove one or more same-month cards from the player's
   * hand and apply them to the field (hand phase only — the deck is NOT
   * flipped yet).
   *
   * All cards in cardIds must be in the hand and share the same month.
   * Costs exactly 1 play regardless of how many cards are played.
   *
   * Match found: played cards are added to the matching field slot.
   * A standard 1-for-1 match (1 played onto 1 field card) sets the slot to
   * 'pending' and defers capture to the deck-flip phase. A full set of 4 is
   * captured immediately. All other totals stay as a normal stack.
   *
   * No match: cards fill the first empty field slot, or are discarded if full.
   *
   * @param {string[]} cardIds  IDs of cards in the player's hand to play.
   * @returns {{ status: 'awaiting_deck', handCards: object[],
   *             matched: boolean, autoCaptured: boolean, discarded: object[] }}
   * @throws {Error} if called outside the 'idle' phase, or validation fails
   */
  playHandCards(cardIds, targetMonth = null) {
    if (this._phase !== "idle") {
      throw new Error(
        `playHandCards() called while phase is "${this._phase}".` +
        (this._phase === "round_over" ? " The round is over." : "")
      );
    }
    if (!cardIds || cardIds.length === 0) {
      throw new Error("playHandCards() requires at least one card ID.");
    }

    // Validate all cards are in hand.
    const handMap = new Map(this._hand.getAll().map(c => [c.id, c]));
    const cards   = cardIds.map(id => {
      const card = handMap.get(id);
      if (!card) throw new Error(`Card "${id}" is not in the player's hand.`);
      return card;
    });

    // Validate same month.
    const month = cards[0].month;
    if (cards.some(c => c.month !== month)) {
      const months = [...new Set(cards.map(c => c.month))].join(", ");
      throw new Error(`All played cards must share the same month (got months: ${months}).`);
    }

    // Remove all played cards from hand.
    this._hand.removeMany(cardIds);

    // Snapshot active yaku (name → bonus) so _finalizeTurn() can diff.
    const _snapThresholds = this._getCaptureThresholds();
    const _snapCards = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
    this._yakuBeforeTurn = new Map(
      this._scoring.evaluate(_snapCards, run.yakuUpgrades, _snapThresholds).map(y => [y.name, y.bonus])
    );

    this._discardedThisTurn = [];   // reset each turn

    const handResult = this._field.playHandCards(cards, targetMonth);
    if (handResult.captured) {
      // All 4 cards of the month assembled — capture immediately.
      this._addCapture(handResult.captured);
    } else if (handResult.discarded) {
      // No room on the field — all played cards are lost.
      for (const card of cards) {
        this._discardedThisTurn.push(card);
        this._allDiscards.push(card);
        this._discardCount++;
        // econ_recycling: +5 ki per field-full discard.
        if (this._spirits.some(s => s.id === 'econ_recycling')) run.addKi(5);
      }
    }

    // Track whether the play went to an empty slot (no field match, no capture,
    // no discard) — used in _doDeckPhase for Fix D/E capture rules.
    if (!handResult.matched && !handResult.captured && !handResult.discarded) {
      this._lastHandPlayToEmptySlot = { cards, month: cards[0].month };
    } else {
      this._lastHandPlayToEmptySlot = null;
    }

    this._phase = "awaiting_deck";

    return {
      status:       "awaiting_deck",
      handCards:    cards,
      matched:      handResult.matched,
      autoCaptured: handResult.captured != null,
      discarded:    handResult.discarded ? [...cards] : [],
      basePoints:   this._basePoints,
    };
  }

  /**
   * Phase 2 of a turn: flip the top deck card and resolve the pending match
   * (if any), then finalise the turn.
   *
   * Must be called after playHandCard().
   *
   * @returns {{ status: string, newYaku: object[], allYaku: object[],
   *             yakuPoints: number, turn: number, deckCard: object|null,
   *             discarded: object[], roundDiscardCount: number }}
   * @throws {Error} if called outside the 'awaiting_deck' phase
   */
  playDeckPhase() {
    if (this._phase !== "awaiting_deck") {
      throw new Error(
        `playDeckPhase() called while phase is "${this._phase}".`
      );
    }
    // _finalizeTurn() will set phase to 'idle' or 'round_over'.
    return this._doDeckPhase();
  }

  /**
   * Bank decision: end the round immediately and keep the full score.
   * Only callable during the 'yaku_decision' phase.
   *
   * @returns {{ status: 'banked', allYaku, totalMultiplier, basePoints,
   *             finalScore, penaltyApplied: false, turn, deckCard }}
   */
  bankScore() {
    if (this._phase !== "yaku_decision") {
      throw new Error(`bankScore() called while phase is "${this._phase}".`);
    }

    const flow = Math.max(1.0, this._styleBase);
    const sc = this._scoring.calculateFinalScore(
      this._capture.getAll(), this._spirits, 1.0, run.yakuUpgrades, true
    );
    this._applyPostRoundEnhancements(this._capture.getAll(), sc.metalConsumableCount);
    logger.logRoundEnd(
      { finalScore: this._runningScore, basePoints: this._runningScore,
        boostedBasePoints: this._runningScore, yakuList: [], yakuMult: 1.0,
        additiveMult: 0, multMult: 1.0, flow,
        pointBoost: 1.0, rawBasePoints: this._runningScore },
      run.threshold, this._runningScore >= run.threshold,
      this._capture.getAll(), this._styleBase,
      this._style.getTriggeredCombos(), this._lastEnhancementEvents ?? []
    );
    this._roundEndingAfterDecision = false;
    this._phase = "round_over";
    return {
      status:          "banked",
      finalScore:      this._runningScore,
      runningScore:    this._runningScore,
      captureEvents:   [...this._scoringEvents],
      newYaku:         [],
      allYaku:         [],
      totalMultiplier: 1.0,
      basePoints:      this._runningScore,
      boostedBasePoints: this._runningScore,
      yakuMult:        1.0,
      effectiveMult:   1.0,
      additiveMult:    0,
      multMult:        1.0,
      flow,
      pushEscalation:  1.0 + this._pushCount * 0.3,
      pointBoost:      1.0,
      rawBasePoints:   this._runningScore,
      pushFactor:      1.0,
      styleBase:       this._styleBase,
      penaltyApplied:  false,
      pushCount:       this._pushCount,
      pigDoubleKi:     this._pigDoubleKi,
      turn:            this._turn,
      deckCard:        this._lastDeckCard,
      cardsInHand:     this._hand.getAll().length,
      styleCombos:     this._style.getTriggeredCombos().length,
    };
  }

  /**
   * Push decision: accept the risk and continue playing.
   * Each successive push shrinks the hand dealt and reduces available plays.
   *
   * Scaling (pushCount after increment):
   *   Hand cards = max(2, HAND_SIZE − pushCount × 2)  → 6, 4, 2, 2, …
   *   Plays      = max(2, PLAYS_PER_ROUND − pushCount) → 4, 3, 2, 2, …
   *
   * Risk: if the round ends without a new yaku, Push Factor = −0.1 per push
   * (floored at 0.5 after 5 pushes).  Dog consumable suppresses the downside.
   *
   * @returns {{ failedPushFactor: number, failedFlow: number }}
   *   The Push Factor and Flow that would apply if THIS push fails.
   */
  pushOn() {
    if (this._phase !== "yaku_decision") {
      throw new Error(`pushOn() called while phase is "${this._phase}".`);
    }

    this._roundEndingAfterDecision = false;
    this._pushCount++;

    this._atRiskScore       = this._runningScore;
    this._pushPenaltyActive = true;
    // econ_lucky_charm: gain ki equal to 50% of current balance (max 20).
    if (this._spirits.some(s => s.id === 'econ_lucky_charm')) {
      run.addKi(Math.min(20, Math.floor(run.ki * 0.5)));
    }
    // Hand cards carry over; deal a fixed number of additional cards.
    const dealCount = this._getNextPushDealCount();
    const handCount = Math.min(dealCount, this._deck.drawPileSize, this._hand.availableSlots);
    if (handCount > 0) this._hand.add(this._deck.draw(handCount));
    // Re-snapshot yaku using only unspent cards so spent yaku can re-trigger.
    const unspentAfterPush = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
    this._yakuBeforeTurn = new Map(
      this._scoring.evaluate(unspentAfterPush, run.yakuUpgrades, this._getCaptureThresholds())
        .map(y => [y.name, y.bonus])
    );
    this._phase = "idle";
    const nextEscalation = 1.0 + this._pushCount * 0.3;
    return {
      failedPushFactor: 1.0,
      failedFlow:       Math.max(1.0, this._styleBase),
      nextEscalation,
      dealCount: handCount,
    };
  }

  /**
   * Execute a consumable's effect and return the result.
   * The caller is responsible for removing the consumable from RunManager
   * inventory after this call succeeds.
   *
   * @param {object} consumable  A consumable object from consumables.js.
   * @param {object} [params={}] Optional extra data forwarded to the effect.
   * @returns {{ success: boolean, message?: string, [extra]?: any }}
   */
  useConsumable(consumable, params = {}) {
    const effect = ConsumableEffects.get(consumable.id);
    if (!effect) return { success: false, message: `Unknown consumable: ${consumable.id}` };
    return effect.execute({ roundManager: this, params });
  }

  // ── Enhancement post-round updates ────────────────────────────────────────

  /**
   * Apply end-of-round mutations to all cards in the capture pile:
   *   • Water/Ice: increment depLevel (floored at the last multiplier index).
   *   • Fire/Ember/Charcoal: roll for permanent card destruction.
   *   • Metal (proc'd for consumable): generate a random consumable via run.
   *
   * Called once by bankScore() or _finalizeTurn() when the round actually ends.
   *
   * @param {object[]} capturedCards
   * @param {number}   metalConsumableCount  Number of Metal consumable procs.
   */
  _applyPostRoundEnhancements(capturedCards, metalConsumableCount = 0) {
    const events = [];
    for (const card of capturedCards) {
      if (card.enhancement?.element === 'water') {
        const multArr = card.enhancement.tier === 'upgraded' ? ICE_MULT : SNOW_MULT;
        const maxLevel = multArr.length - 1;
        card.enhancement.depLevel = Math.min((card.enhancement.depLevel ?? 0) + 1, maxLevel);
        events.push(`${card.id} Water dep → level ${card.enhancement.depLevel}`);
        // engine_glacier: +0.3 mult per water depreciation.
        for (const spirit of this._spirits) {
          if (spirit.id === 'engine_glacier' && spirit.state) spirit.state.waterDepCount++;
        }
      }
      if (card.enhancement?.element === 'fire') {
        const breakChance = card.enhancement.tier === 'upgraded' ? 2 / 7 : 1 / 7;
        if (Math.random() < breakChance) {
          run.deleteCard(card.id);
          card._broken = true;
          events.push(`${card.id} Fire BROKE — card destroyed`);
          // engine_carbon: +0.5 mult per fire combustion.
          for (const spirit of this._spirits) {
            if (spirit.id === 'engine_carbon' && spirit.state) spirit.state.fireCombustCount++;
          }
        }
      }
    }
    // Generate any Metal-procced consumables.
    for (let i = 0; i < metalConsumableCount; i++) {
      run.generateRandomConsumable();
      events.push('Metal proc → free consumable generated');
      // engine_velocity: +0.3 mult per metal proc.
      for (const spirit of this._spirits) {
        if (spirit.id === 'engine_velocity' && spirit.state) spirit.state.metalProcCount++;
      }
    }
    // engine_fossil: set earthCardCount = current earth-enhanced cards in deck.
    for (const spirit of this._spirits) {
      if (spirit.id === 'engine_fossil' && spirit.state) {
        spirit.state.earthCardCount = run.getDeck().filter(c => c.enhancement?.element === 'earth').length;
      }
    }
    this._lastEnhancementEvents = events;
  }

  /**
   * Select which unspent cards are attributed to the named yaku for scoring.
   * Returns at most the minimum threshold needed to trigger the yaku.
   *
   * @param {string} yakuName
   * @param {object[]} unspentCards
   * @returns {object[]}
   */
  _selectAdditiveYakuCards(yakuName, unspentCards) {
    const isFireCard = c => c.enhancement?.element === 'fire';
    const t = this._getCaptureThresholds();
    switch (yakuName) {
      case 'Kasu':
        return unspentCards.filter(c => c.type === 'plain'  || isFireCard(c)).slice(0, t.kasu);
      case 'Tanzaku':
        return unspentCards.filter(c => c.type === 'ribbon' || isFireCard(c)).slice(0, t.tanzaku);
      case 'Tane':
        return unspentCards.filter(c => c.type === 'animal' || isFireCard(c)).slice(0, t.tane);
      case 'Hikari':
        return unspentCards.filter(c => c.type === 'bright' || isFireCard(c)).slice(0, t.hikari);
      default:
        return [];
    }
  }

  /**
   * Returns the number of cards to deal on the next push in capture mode.
   * Push 1: +4, Push 2: +2, Push 3+: +1.
   */
  _getNextPushDealCount() {
    const angel = this._spirits.some(s => s.id === 'game_angel') ? 1 : 0;
    if (this._pushCount === 1) return 4 + angel;
    if (this._pushCount === 2) return 2 + angel;
    return 1 + angel;
  }

  // ── Three Marks helpers ────────────────────────────────────────────────────

  /**
   * Remove a card from the current hand by id.
   * Used when Non-being targets a hand card during a round.
   * @param {string} cardId
   */
  removeCardFromHand(cardId) {
    this._hand.removeMany([cardId]);
  }

  /**
   * Remove a card from the current field by id.
   * Used when Non-being targets a field card during a round.
   * @param {string} cardId
   */
  removeCardFromField(cardId) {
    this._field.removeCardById(cardId);
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────

  /**
   * Plain-object snapshot of the full round state.
   * @returns {object}
   */
  toSnapshot() {
    return {
      phase:    this._phase,
      turn:     this._turn,
      deckSize: this._deck.drawPileSize,
      hand:     this._hand.toSnapshot(),
      field:    this._field.toSnapshot(),
      capture:  this._capture.toSnapshot(),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Check the opening hand for any month where all 4 cards are present.
   * Each complete month is immediately moved from hand to the capture pile.
   * Populates this._naturalCaptures with one entry per captured month.
   */
  _checkNaturalCaptures() {
    const byMonth = new Map();
    for (const card of this._hand.getAll()) {
      if (!byMonth.has(card.month)) byMonth.set(card.month, []);
      byMonth.get(card.month).push(card);
    }
    for (const [, cards] of byMonth) {
      if (cards.length === 4) {
        this._hand.removeMany(cards.map(c => c.id));
        this._addCapture(cards);
        this._naturalCaptures.push([...cards]);
      }
    }
  }

  /**
   * Add captured cards to the capture pile and accumulate base points.
   * Cards are worth their face `points` value (bright=20, animal=12,
   * ribbon=10, plain=3).  A full-month capture (exactly 4 cards) earns a
   * +5 bonus on top.
   *
   * @param {object[]} cards
   */
  /** sym_snails: accumulate hand card count at round end (permanent). */
  _trackSnailsUnplayed() {
    const handCount = this._hand.getAll().length;
    if (handCount === 0) return;
    for (const spirit of this._spirits) {
      if (spirit.id === 'sym_snails' && spirit.state) {
        spirit.state.totalUnplayed += handCount;
      }
    }
  }

  /**
   * Handle a field-full discard for a single deck card.
   * Applies econ_recycling (+5 ki) and game_catcher (→hand) if active.
   * @param {object} card  The deck card being discarded.
   * @returns {string} The flip result string ('field_discard' or 'catcher').
   */
  _handleFieldDiscard(card) {
    if (this._spirits.some(s => s.id === 'game_catcher') && this._hand.availableSlots > 0) {
      this._hand.add([card]);
      return 'catcher';
    }
    this._discardedThisTurn.push(card);
    this._allDiscards.push(card);
    this._discardCount++;
    if (this._spirits.some(s => s.id === 'econ_recycling')) run.addKi(5);
    return 'field_discard';
  }

  _addCapture(cards) {
    this._capture.add(cards);
    this._basePoints += cards.reduce((sum, c) => sum + c.points, 0);
    if (cards.length === 4) this._basePoints += 5;   // full-month bonus

    {
      // Score this capture group immediately.
      const allCaptured = this._capture.getAll();
      const allYaku     = this._scoring.evaluate(allCaptured, run.yakuUpgrades, this._getCaptureThresholds());

      // Spirit channels.
      let additiveMult = 0;
      let multMult     = 1.0;
      for (const spirit of this._spirits) {
        const effect = SpiritEffects.get(spirit.id);
        if (effect?.getAdditiveMult)
          additiveMult += effect.getAdditiveMult({ capturedCards: allCaptured, yakuList: allYaku, spirits: this._spirits });
        if (effect?.getMultMult)
          multMult *= effect.getMultMult({ capturedCards: allCaptured, yakuList: allYaku, spirits: this._spirits });
      }

      // Card points — Water mult, Fire override, spirit point boosts.
      let capturePoints = 0;
      for (const card of cards) {
        const enh    = card.enhancement;
        const isFire = enh?.element === 'fire';
        let pts = isFire ? (enh.tier === 'upgraded' ? 20 : 10) : card.points;
        if (!isFire) {
          for (const spirit of this._spirits) {
            const effect = SpiritEffects.get(spirit.id);
            if (effect?.getPointBoosts) {
              const boosts = effect.getPointBoosts({ capturedCards: allCaptured, spirits: this._spirits });
              if (boosts?.has(card.id)) pts += boosts.get(card.id);
            }
          }
        }
        if (enh?.element === 'water') {
          const multArr = enh.tier === 'upgraded' ? ICE_MULT : SNOW_MULT;
          pts = Math.round(pts * multArr[Math.min(enh.depLevel ?? 0, multArr.length - 1)]);
        }
        capturePoints += pts;
      }
      if (cards.length === 4) capturePoints += 5; // full-month bonus

      const pushEscalation = 1.0 + this._pushCount * 0.3;
      const flow           = Math.max(1.0, this._styleBase);
      const captureScore   = Math.round(capturePoints * (1 + additiveMult) * multMult * flow * pushEscalation);

      this._runningScore += captureScore;

      this._scoringEvents.push({
        type: 'capture', cards, capturePoints, additiveMult, multMult,
        flow, pushEscalation, captureScore, runningTotal: this._runningScore,
      });

      // game_well: draw 1 extra card on any capture.
      if (this._spirits.some(s => s.id === 'game_well') && this._deck.drawPileSize > 0) {
        this._hand.add(this._deck.draw(1));
      }

      // util_glory: draw 3 cards on any bright capture.
      for (const spirit of this._spirits) {
        if (spirit.id === 'util_glory') {
          const brightCount = cards.filter(c => c.type === 'bright').length;
          if (brightCount > 0) {
            const drawN = Math.min(3, this._deck.drawPileSize);
            const drawn = drawN > 0 ? this._deck.draw(drawN) : [];
            if (drawn.length > 0) this._hand.add(drawn);
            if (drawn.length > 0)
              this._scoringEvents.push({ type: 'glory_draw', count: drawn.length });
          }
        }
      }

      // util_irrigation: +10 pts per plain captured.
      for (const spirit of this._spirits) {
        if (spirit.id === 'util_irrigation' && spirit.state) {
          const plainCount = cards.filter(c => c.type === 'plain').length;
          if (plainCount > 0) {
            const bonus = plainCount * 10;
            spirit.state.irrigationBonus += bonus;
            this._runningScore += bonus;
          }
        }
      }

      // Ribbon stamp effects.
      for (const card of cards) {
        if (!card.ribbonStamp) continue;
        switch (card.ribbonStamp) {
          case 'red': {
            const drawN = Math.min(1, this._deck.drawPileSize);
            if (drawN > 0) this._hand.add(this._deck.draw(drawN));
            break;
          }
          case 'blue': {
            if (this._deck.drawPileSize > 0) {
              const extraFlip = this._deck.draw(1)[0];
              const flipResult = this._field.addFlippedCard(extraFlip);
              if (flipResult.captured) this._addCapture(flipResult.captured);
            }
            break;
          }
          case 'green': {
            run.onCardsCaptured([card]);
            break;
          }
          case 'yellow': {
            const allCaptured2 = this._capture.getAll();
            let additiveMult2  = 0;
            let multMult2      = 1.0;
            for (const spirit of this._spirits) {
              const effect = SpiritEffects.get(spirit.id);
              if (effect?.getAdditiveMult)
                additiveMult2 += effect.getAdditiveMult({ capturedCards: allCaptured2, yakuList: [], spirits: this._spirits });
              if (effect?.getMultMult)
                multMult2 *= effect.getMultMult({ capturedCards: allCaptured2, yakuList: [], spirits: this._spirits });
            }
            let pts2 = card.points;
            for (const spirit of this._spirits) {
              const effect = SpiritEffects.get(spirit.id);
              if (effect?.getPointBoosts) {
                const boosts = effect.getPointBoosts({ capturedCards: allCaptured2, spirits: this._spirits });
                if (boosts?.has(card.id)) pts2 += boosts.get(card.id);
              }
            }
            const pushEscalation2 = 1.0 + this._pushCount * 0.3;
            const flow2           = Math.max(1.0, this._styleBase);
            const retriggerScore  = Math.round(pts2 * (1 + additiveMult2) * multMult2 * flow2 * pushEscalation2);
            this._runningScore   += retriggerScore;
            this._scoringEvents.push({
              type: 'retrigger', card, retriggerScore, runningTotal: this._runningScore,
            });
            break;
          }
        }
      }
    }

    run.onCardsCaptured(cards);

    // sym_ducks: track 2-card pair captures.
    for (const spirit of this._spirits) {
      if (spirit.id === 'sym_ducks' && spirit.state && cards.length === 2) {
        spirit.state.pairsThisRound++;
      }
    }

    // sym_caterpillar: eat leaf-enhanced cards (Wood element).
    for (const spirit of this._spirits) {
      if (spirit.id === 'sym_caterpillar' && spirit.state) {
        for (const card of cards) {
          if (card.enhancement?.element === 'wood') {
            spirit.state.leafsEaten++;
            run.deleteCard(card.id);
            this._spentCardIds.add(card.id);
            if (spirit.state.leafsEaten >= 3) {
              const others = run.spirits.filter(s => s.id !== 'sym_caterpillar' && s.id !== 'sym_cuckoo_egg');
              if (others.length > 0) {
                const target = others[Math.floor(Math.random() * others.length)];
                const idx = run.spirits.findIndex(s => s.id === 'sym_caterpillar');
                if (idx >= 0) {
                  const copy = JSON.parse(JSON.stringify(target));
                  copy.name += ' (Moth)';
                  copy.metamorphosed = true;
                  run.spirits[idx] = copy;
                }
              }
            }
          }
        }
      }
    }

    // util_symbiosis: generate symbiont spirit on animal capture.
    if (this._spirits.some(s => s.id === 'util_symbiosis')) {
      for (const card of cards) {
        if (card.type === 'animal') {
          const symbiontId = ANIMAL_SYMBIONT_MAP[card.id];
          if (symbiontId && run.canAddSpirit && !run.spirits.some(s => s.id === symbiontId)) {
            const symDef = getSpiritDef(symbiontId);
            if (symDef) {
              run.addSymbiontSpirit(symDef);
              // sym_algae: increment on summon.
              for (const spirit of run.spirits) {
                if (spirit.id === 'sym_algae' && spirit.state) {
                  spirit.state.summonCount = (spirit.state.summonCount ?? 0) + 1;
                }
              }
            }
          }
        }
      }
    }

    // Goat consumable: +1 ki per card captured.
    if (this._goatActive) run.addKi(cards.length);

    logger.logCapture(cards, 'capture');

    // Check for newly triggered style combos against the full capture pile.
    const newCombos = this._style.checkCombos(this._capture.getAll());
    if (newCombos.length > 0) {
      this._onStyleCombos(newCombos);
    }
  }

  /**
   * Called when style combos are newly triggered during a capture event.
   * Updates Style Base in RunManager and stores combo info for UI feedback.
   * Does NOT trigger Bank/Push decisions.
   *
   * @param {{ id: string, name: string, bonus: number }[]} combos
   */
  _onStyleCombos(combos) {
    for (const combo of combos) {
      run.addStyleBase(combo.bonus);
    }
    this._lastStyleCombos = combos;
    logger.logStyleCombos(combos);
    // sym_magpie: +3 ki per style combo triggered.
    if (combos.length > 0 && this._spirits.some(s => s.id === 'sym_magpie')) {
      run.addKi(3 * combos.length);
    }
  }

  /**
   * Draw and apply the top card of the deck (the automatic deck-flip phase).
   * Resolves the pending match (if any) based on whether the deck card shares
   * its month with the pending slot.  If the deck is empty the flip is skipped.
   *
   * @returns {{ status: string, … }}
   */
  _doDeckPhase() {
    if (this._deck.isEmpty()) {
      this._lastDeckCard = null;
      // No deck card to flip — resolve any pending match as a capture.
      const pending = this._field.getPendingSlot();
      if (pending) {
        const captured = this._field.capturePendingMatch();
        if (captured.length > 0) this._addCapture(captured);
      }
      return this._finalizeTurn();
    }

    const deckCard = this._deck.draw(1)[0];
    this._lastDeckCard = deckCard;

    // sym_crow: first deck flip each round is captured directly.
    const crowSpirit = this._spirits.find(s => s.id === 'sym_crow');
    if (crowSpirit?.state && !crowSpirit.state.usedThisRound) {
      crowSpirit.state.usedThisRound = true;
      this._addCapture([deckCard]);
      logger.logDeckFlip(deckCard, 'crow_capture', [deckCard]);
      return this._finalizeTurn();
    }

    // Track the deck flip outcome for logging.
    let _flipResult   = 'field_place';
    let _flipCaptures = [];

    const pending = this._field.getPendingSlot();

    if (pending) {
      if (deckCard.month === pending.month) {
        // Deck card is the same month as the pending match.
        // Silk (Wood upgraded) cards in the pending slot are immune to stranding:
        // they force a capture even when adding the deck card would normally strand.
        const hasSilk = pending.cards.some(
          c => c.enhancement?.element === 'wood' && c.enhancement.tier === 'upgraded'
        );
        if (hasSilk) {
          // Push deck card into the pending slot then capture immediately.
          pending.cards.push(deckCard);
          const captured = this._field.capturePendingMatch();
          if (captured.length > 0) {
            this._addCapture(captured);
            _flipResult   = 'silk_capture';
            _flipCaptures = captured;
            // engine_moths: +0.4 mult per silk trigger.
            for (const spirit of this._spirits) {
              if (spirit.id === 'engine_moths' && spirit.state) spirit.state.silkTriggerCount++;
            }
          }
        } else {
          // Standard addToPendingMatch handles 4-card auto-capture and stranding.
          const { captured } = this._field.addToPendingMatch(deckCard);
          if (captured) {
            this._addCapture(captured);
            _flipResult   = 'capture';
            _flipCaptures = captured;
          } else {
            _flipResult = 'strand';
          }
        }
        // Whether captured or stranded, the pending state is resolved for
        // this turn; _finalizeTurn proceeds normally.
      } else {
        // Deck card is a different month from the pending match.
        // 2-card pending (hand card + 1 field card) → capture now.
        // 4-card pending (hand card completed the month stack) → capture now.
        // 3-card pending → needs the 4th card before it can score; strand it
        //   back to 'normal' so it stays on the field for a future turn.
        if (pending.cards.length === 3) {
          this._field.strandPendingMatch();
        } else {
          // 2 or 4 cards: the match is complete — capture immediately.
          const pendingCards = this._field.capturePendingMatch();
          this._addCapture(pendingCards);
          _flipCaptures = pendingCards;
        }

        // Deck card goes to the field normally (stack or new slot).
        const flipResult = this._field.addFlippedCard(deckCard);
        if (flipResult.captured) {
          this._addCapture(flipResult.captured);
          _flipResult   = 'capture';
          _flipCaptures = [..._flipCaptures, ...flipResult.captured];
        } else if (flipResult.discarded) {
          _flipResult = this._handleFieldDiscard(deckCard);
        }
      }
    } else {
      // No pending match — deck card goes to the field.
      // Fix D: 1 hand card played to empty slot + flip is same month → capture pair.
      if (this._lastHandPlayToEmptySlot?.cards.length === 1 &&
          deckCard.month === this._lastHandPlayToEmptySlot.month) {
        const handCard = this._lastHandPlayToEmptySlot.cards[0];
        this._field.removeCardById(handCard.id);
        this._addCapture([handCard, deckCard]);
        _flipResult   = 'capture';
        _flipCaptures = [handCard, deckCard];
      // Fix E: 2 hand cards played to empty slot + flip is different month → capture the pair.
      } else if (this._lastHandPlayToEmptySlot?.cards.length === 2 &&
                 deckCard.month !== this._lastHandPlayToEmptySlot.month) {
        const handCards = this._lastHandPlayToEmptySlot.cards;
        for (const hc of handCards) this._field.removeCardById(hc.id);
        this._addCapture(handCards);
        _flipCaptures = [...handCards];
        // Still place the flip card on the field normally.
        const flipResult = this._field.addFlippedCard(deckCard);
        if (flipResult.captured) {
          this._addCapture(flipResult.captured);
          _flipResult   = 'capture';
          _flipCaptures = [..._flipCaptures, ...flipResult.captured];
        } else if (flipResult.discarded) {
          _flipResult = this._handleFieldDiscard(deckCard);
        } else {
          _flipResult = 'capture'; // hand pair captured even if flip just placed
        }
      } else {
        // Standard: deck card simply goes to the field.
        const flipResult = this._field.addFlippedCard(deckCard);
        if (flipResult.captured) {
          this._addCapture(flipResult.captured);
          _flipResult   = 'capture';
          _flipCaptures = flipResult.captured;
        } else if (flipResult.discarded) {
          _flipResult = this._handleFieldDiscard(deckCard);
        }
      }
    }

    logger.logDeckFlip(deckCard, _flipResult, _flipCaptures);
    return this._finalizeTurn();
  }

  /**
   * Called once both phases have fully resolved for this turn.
   * Increments the turn counter, evaluates yaku, diffs for new completions,
   * and sets the phase appropriately.
   *
   * @returns {{ status: string, newYaku: object[], allYaku: object[],
   *             yakuPoints: number, turn: number, deckCard: object|null }}
   */
  _finalizeTurn() {
    this._turn++;
    this._capture.recordTurn();

    const _yakuThresholds = this._getCaptureThresholds();
    const yakuForDiff = this._scoring.evaluate(this._capture.getAll(), run.yakuUpgrades, _yakuThresholds);

    {
      // Diff against unspent cards only — spent cards must not re-trigger yaku.
      const unspentForDiff = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
      const yakuFromUnspent = this._scoring.evaluate(unspentForDiff, run.yakuUpgrades, this._getCaptureThresholds());

      const newYaku = yakuFromUnspent.filter(y => {
        const prev = this._yakuBeforeTurn.get(y.name);
        return prev === undefined || y.bonus - prev > 0.3;
      });
      this._yakuBeforeTurn = new Map(yakuFromUnspent.map(y => [y.name, y.bonus]));
      logger.logYakuState(yakuFromUnspent, newYaku);

      if (newYaku.length > 0) this._pushPenaltyActive = false;

      // Spend the minimum qualifying cards for each newly triggered yaku so they
      // disappear from the capture fan and appear in the banked pile.
      if (newYaku.length > 0) {
        const unspent = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
        for (const yaku of newYaku) {
          const yakuCards = this._selectAdditiveYakuCards(yaku.name, unspent);
          for (const card of yakuCards) this._spentCardIds.add(card.id);
        }
        // Update snapshot to post-spend state so same yaku can't re-trigger next turn.
        const unspentAfterSpend = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
        this._yakuBeforeTurn = new Map(
          this._scoring.evaluate(unspentAfterSpend, run.yakuUpgrades, this._getCaptureThresholds())
            .map(y => [y.name, y.bonus])
        );
      }

      // Round ends when hand is empty (no play counter in capture mode).
      const roundOver = this._hand.isEmpty();
      const penaltyApplied = roundOver && this._pushPenaltyActive && !this._dogProtection;
      if (roundOver) this._trackSnailsUnplayed();

      if (roundOver && penaltyApplied) {
        const PENALTY_RATES = [0.3, 0.5, 0.7, 0.9];
        const rate = PENALTY_RATES[Math.min(this._pushCount - 1, 3)];
        this._runningScore = Math.round(this._runningScore * (1 - rate));
      }

      const pushEscalation = 1.0 + this._pushCount * 0.3;
      const flow           = Math.max(1.0, this._styleBase);

      if (newYaku.length > 0) {
        this._roundEndingAfterDecision = roundOver;
        this._phase = "yaku_decision";
      } else if (roundOver) {
        const sc = this._scoring.calculateFinalScore(
          this._capture.getAll(), this._spirits, 1.0, run.yakuUpgrades, true
        );
        this._applyPostRoundEnhancements(this._capture.getAll(), sc.metalConsumableCount);
        logger.logRoundEnd(
          { finalScore: this._runningScore, basePoints: this._runningScore,
            boostedBasePoints: this._runningScore, yakuList: [], yakuMult: 1.0,
            additiveMult: 0, multMult: 1.0, flow,
            pointBoost: 1.0, rawBasePoints: this._runningScore },
          run.threshold, this._runningScore >= run.threshold,
          this._capture.getAll(), this._styleBase,
          this._style.getTriggeredCombos(), this._lastEnhancementEvents ?? []
        );
        this._phase = "round_over";
      } else {
        this._phase = "idle";
      }

      const status = newYaku.length > 0 ? "yaku_decision" : roundOver ? "round_over" : "ok";
      return {
        status,
        newYaku,
        captureEvents:    [...this._scoringEvents],
        runningScore:     this._runningScore,
        allYaku:          yakuForDiff,
        totalMultiplier:  1.0,
        basePoints:       this._runningScore,
        boostedBasePoints: this._runningScore,
        finalScore:       this._runningScore,
        yakuMult:         1.0,
        effectiveMult:    1.0,
        additiveMult:     0,
        multMult:         1.0,
        flow,
        pushEscalation,
        pointBoost:       1.0,
        rawBasePoints:    this._runningScore,
        pushFactor:       1.0,
        styleBase:        this._styleBase,
        penaltyApplied,
        pushCount:        this._pushCount,
        pigDoubleKi:      this._pigDoubleKi,
        nextFailFlow:     Math.max(1.0, this._styleBase),
        turn:             this._turn,
        deckCard:         this._lastDeckCard,
        discarded:        [...this._discardedThisTurn],
        roundDiscardCount: this._discardCount,
        cardsInHand:      this._hand.getAll().length,
        styleCombos:      this._style.getTriggeredCombos().length,
      };
    }
  }
}
