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
import ScoringEngine    from "./ScoringEngine.js";
import ConsumableEffects from "./ConsumableEffects.js";

export default class GameRoundManager {

  // ── Round configuration (adjust freely for playtesting) ────────────────────
  static PLAYS_PER_ROUND = 5;   // how many hand cards the player may play
  static HAND_SIZE       = 8;   // cards dealt to the player's hand at deal time
  static FIELD_DEAL      = 8;   // cards dealt face-up to the field at deal time
  static MAX_DISCARDS    = 2;   // free discards available per round

  constructor() {
    this._deck    = new DeckManager();
    this._hand    = new HandManager({ maxSize: GameRoundManager.HAND_SIZE });
    this._field   = new FieldManager();
    this._capture = new CaptureManager();
    this._scoring = new ScoringEngine();

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
    const sc = this._scoring.calculateFinalScore(this._capture.getAll(), this._spirits, flow);
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
    this._deck.fullReset().shuffle();
    this._hand.clear();
    this._field.clear();
    this._capture.clear();

    this._phase              = "idle";
    this._yakuBeforeTurn     = new Map();
    this._turn               = 0;
    this._lastDeckCard       = null;
    this._discardCount       = 0;
    this._discardedThisTurn  = [];
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

    this._hand.add(this._deck.draw(GameRoundManager.HAND_SIZE));

    // Auto-capture any month where the opening hand holds all 4 cards.
    this._checkNaturalCaptures();

    // Deal field cards one at a time so stacking rules are applied per card.
    for (const card of this._deck.draw(GameRoundManager.FIELD_DEAL)) {
      this._field.dealCard(card);
    }

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
  playHandCards(cardIds) {
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

    // Count this play against the round limit.
    this._playsRemaining--;

    // Snapshot active yaku (name → bonus) so _finalizeTurn() can diff.
    this._yakuBeforeTurn = new Map(
      this._scoring.evaluate(this._capture.getAll()).map(y => [y.name, y.bonus])
    );

    this._discardedThisTurn = [];   // reset each turn

    const handResult = this._field.playHandCards(cards);
    if (handResult.captured) {
      // All 4 cards of the month assembled — capture immediately.
      this._addCapture(handResult.captured);
    } else if (handResult.discarded) {
      // No room on the field — all played cards are lost.
      for (const card of cards) {
        this._discardedThisTurn.push(card);
        this._discardCount++;
      }
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
    // Banking counts as a successful outcome — Push Factor is positive.
    const pushFactor = Math.min(1.5, 1.0 + this._pushCount * 0.1);
    const flow       = Math.max(1.0, this._styleBase * pushFactor);
    const sc = this._scoring.calculateFinalScore(this._capture.getAll(), this._spirits, flow);
    this._roundEndingAfterDecision = false;
    this._phase = "round_over";
    return {
      status:          "banked",
      newYaku:         [],
      ...sc,
      allYaku:         sc.yakuList,
      totalMultiplier: sc.yakuMult,
      basePoints:      sc.boostedBasePoints,
      pushFactor,
      styleBase:       this._styleBase,
      penaltyApplied:  false,
      pushCount:       this._pushCount,
      pigDoubleKi:     this._pigDoubleKi,
      turn:            this._turn,
      deckCard:        this._lastDeckCard,
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

    const allYaku         = this._scoring.evaluate(this._capture.getAll());
    const totalMultiplier = this._scoring.calculateTotalMultiplier(allYaku);
    this._atRiskScore       = Math.round(this._basePoints * totalMultiplier);
    this._pushPenaltyActive = true;

    // Deal a scaled hand — fewer cards with each successive push.
    const targetHand = Math.max(2, GameRoundManager.HAND_SIZE - this._pushCount * 2);
    const handCount  = Math.min(targetHand, this._deck.drawPileSize, this._hand.availableSlots);
    if (handCount > 0) this._hand.add(this._deck.draw(handCount));

    // Fewer plays available with each successive push.
    this._playsRemaining    = Math.max(2, GameRoundManager.PLAYS_PER_ROUND - this._pushCount);
    this._discardsRemaining = GameRoundManager.MAX_DISCARDS;
    this._phase = "idle";

    // Return the Flow that would apply if this push fails (for the status bar).
    const failedPushFactor = this._dogProtection
      ? 1.0
      : Math.max(0.5, 1.0 - this._pushCount * 0.1);
    const failedFlow = Math.max(1.0, this._styleBase * failedPushFactor);
    return { failedPushFactor, failedFlow };
  }

  /**
   * Discard selected hand cards and draw replacements from the deck.
   * Free action — costs 1 discard (decrements _discardsRemaining), NOT a play.
   * Only callable during the 'idle' phase.
   *
   * @param {string[]} cardIds  IDs of cards currently in hand to discard.
   * @returns {{ status: 'ok', removed: object[], drawn: object[], discardsRemaining: number }}
   * @throws {Error} if no discards remain or called outside the 'idle' phase
   */
  discardCards(cardIds) {
    if (this._phase !== "idle") {
      throw new Error(`discardCards() called while phase is "${this._phase}".`);
    }
    if (this._discardsRemaining <= 0) {
      throw new Error("No discards remaining.");
    }

    const removed = this._hand.removeMany(cardIds);
    if (removed.length === 0) {
      return { status: "ok", removed: [], drawn: [], discardsRemaining: this._discardsRemaining };
    }

    this._discardsRemaining--;

    // Draw replacements (capped by deck size and remaining hand capacity).
    const drawCount = Math.min(removed.length, this._deck.drawPileSize, this._hand.availableSlots);
    const drawn     = drawCount > 0 ? this._deck.draw(drawCount) : [];
    if (drawn.length > 0) this._hand.add(drawn);

    return { status: "ok", removed, drawn, discardsRemaining: this._discardsRemaining };
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
  _addCapture(cards) {
    this._capture.add(cards);
    this._basePoints += cards.reduce((sum, c) => sum + c.points, 0);
    if (cards.length === 4) this._basePoints += 5;   // full-month bonus
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
      return this._finalizeTurn();
    }

    const deckCard = this._deck.draw(1)[0];
    this._lastDeckCard = deckCard;

    const pending = this._field.getPendingSlot();

    if (pending) {
      if (deckCard.month === pending.month) {
        // Deck card is the same month as the pending match → add to it.
        // addToPendingMatch handles both the 4-card auto-capture and stranding.
        const { captured } = this._field.addToPendingMatch(deckCard);
        if (captured) {
          this._addCapture(captured);
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
        }

        // Deck card goes to the field normally (stack or new slot).
        const flipResult = this._field.addFlippedCard(deckCard);
        if (flipResult.captured) {
          this._addCapture(flipResult.captured);
        } else if (flipResult.discarded) {
          this._discardedThisTurn.push(deckCard);
          this._discardCount++;
        }
      }
    } else {
      // No pending match — deck card simply goes to the field.
      const flipResult = this._field.addFlippedCard(deckCard);
      if (flipResult.captured) {
        this._addCapture(flipResult.captured);
      } else if (flipResult.discarded) {
        this._discardedThisTurn.push(deckCard);
        this._discardCount++;
      }
    }

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

    // Evaluate yaku (spirits excluded) for the Bank/Push new-yaku diff.
    // A yaku counts as "new" if its name wasn't present before, OR if its
    // bonus jumped by more than 0.3 (no sub-combinations exist in the current
    // system, so in practice only newly appearing yaku trigger a decision).
    const yakuForDiff = this._scoring.evaluate(this._capture.getAll());
    const newYaku = yakuForDiff.filter(y => {
      const prev = this._yakuBeforeTurn.get(y.name);
      return prev === undefined || y.bonus - prev > 0.3;
    });
    this._yakuBeforeTurn = new Map(yakuForDiff.map(y => [y.name, y.bonus]));

    // Completing a new yaku clears the push penalty regardless of outcome.
    if (newYaku.length > 0) this._pushPenaltyActive = false;

    // Round ends when the hand is empty OR the play limit is reached.
    const roundOver = this._hand.isEmpty() || this._playsRemaining <= 0;

    // Dog consumable suppresses the push penalty (treats the outcome as success).
    const penaltyApplied = roundOver && this._pushPenaltyActive && !this._dogProtection;

    // ── Push Factor ───────────────────────────────────────────────────────────
    // Success (or no push): +0.1 per push, capped at ×1.5 after 5 pushes.
    // Failure (round ends under penalty): −0.1 per push, floored at ×0.5.
    const pushFactor = penaltyApplied
      ? Math.max(0.5, 1.0 - this._pushCount * 0.1)
      : Math.min(1.5, 1.0 + this._pushCount * 0.1);

    // ── Flow = Style Base × Push Factor, floored at 1.0 ─────────────────────
    const flow = Math.max(1.0, this._styleBase * pushFactor);

    // ── Full three-channel score ──────────────────────────────────────────────
    const sc = this._scoring.calculateFinalScore(this._capture.getAll(), this._spirits, flow);

    // For the Bank/Push decision overlay: what Flow would result if the NEXT
    // push also fails?  Used by the UI to show the downside risk.
    const nextPushCount      = this._pushCount + 1;
    const nextFailPushFactor = this._dogProtection
      ? 1.0
      : Math.max(0.5, 1.0 - nextPushCount * 0.1);
    const nextFailFlow = Math.max(1.0, this._styleBase * nextFailPushFactor);

    if (newYaku.length > 0) {
      // A new yaku always triggers a Bank/Push decision, even on the final play.
      // If the round would also end, defer that transition until after the decision.
      this._roundEndingAfterDecision = roundOver;
      this._phase = "yaku_decision";
    } else if (roundOver) {
      this._phase = "round_over";
    } else {
      this._phase = "idle";
    }

    const status = newYaku.length > 0 ? "yaku_decision" :
                   roundOver          ? "round_over"    : "ok";
    return {
      status,
      newYaku,
      ...sc,
      allYaku:         sc.yakuList,
      totalMultiplier: sc.yakuMult,
      basePoints:      sc.boostedBasePoints,
      pushFactor,
      styleBase:       this._styleBase,
      penaltyApplied,
      pushCount:       this._pushCount,
      pigDoubleKi:     this._pigDoubleKi,
      nextFailFlow,
      turn:            this._turn,
      deckCard:        this._lastDeckCard,
      discarded:       [...this._discardedThisTurn],
      roundDiscardCount: this._discardCount,
    };
  }
}
