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
//   playHandCard(cardId) → { status: 'awaiting_deck', handCard, matched,
//                             autoCaptured, discarded }
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

import DeckManager    from "./DeckManager.js";
import HandManager    from "./HandManager.js";
import FieldManager   from "./FieldManager.js";
import CaptureManager from "./CaptureManager.js";
import ScoringEngine  from "./ScoringEngine.js";

export default class GameRoundManager {

  // ── Round configuration (adjust freely for playtesting) ────────────────────
  static PLAYS_PER_ROUND = 5;   // how many hand cards the player may play
  static HAND_SIZE       = 8;   // cards dealt to the player's hand at deal time
  static FIELD_DEAL      = 8;   // cards dealt face-up to the field at deal time

  constructor() {
    this._deck    = new DeckManager();
    this._hand    = new HandManager({ maxSize: GameRoundManager.HAND_SIZE });
    this._field   = new FieldManager();
    this._capture = new CaptureManager();
    this._scoring = new ScoringEngine();

    /** @type {'idle'|'awaiting_deck'|'round_over'} */
    this._phase = "idle";

    /**
     * Yaku name → multiplier snapshot taken at the start of the current turn.
     * Used to diff against post-turn evaluation: a yaku is "new" if its name
     * was absent OR its multiplier grew by ≥0.3 (subset bonus activated).
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
     * Fraction of the final score lost when the round ends under penalty.
     * Escalates with each push: push 1 = 0.3, push 2 = 0.5, push 3 = 0.7, …
     * Capped at 0.9.
     */
    this._pushPenaltyRate = 0;

    /**
     * True when the round would normally end (hand empty or plays exhausted)
     * but a new yaku was also completed on that same turn.  The round-over
     * transition is deferred until the player resolves the Bank/Push decision:
     *   bankScore() → clears flag, moves to 'round_over' as usual.
     *   pushOn()    → clears flag, resets plays/hand, continues play.
     */
    this._roundEndingAfterDecision = false;
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

  /**
   * Live scoring snapshot — evaluates the current capture pile and returns
   * the full picture needed to render the score HUD.
   *
   * @returns {{ allYaku: object[], totalMultiplier: number,
   *             basePoints: number, finalScore: number }}
   */
  getCurrentScoring() {
    const allYaku         = this._scoring.evaluate(this._capture.getAll());
    const totalMultiplier = this._scoring.calculateTotalMultiplier(allYaku);
    return {
      allYaku,
      totalMultiplier,
      basePoints:  this._basePoints,
      finalScore:  Math.round(this._basePoints * totalMultiplier),
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
    this._basePoints         = 0;
    this._naturalCaptures    = [];
    this._atRiskScore        = 0;
    this._pushPenaltyActive        = false;
    this._pushCount                = 0;
    this._pushPenaltyRate          = 0;
    this._roundEndingAfterDecision = false;

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
   * Phase 1 of a turn: remove a card from the player's hand and apply it to
   * the field (hand phase only — the deck is NOT flipped yet).
   *
   * After this call the field will show the pending-match slot (gold tint) if
   * the card matched, giving the UI a chance to re-render before the deck flip.
   *
   * @param {string} cardId  id of a card currently in the player's hand
   * @returns {{ status: 'awaiting_deck', handCard: object,
   *             matched: boolean, autoCaptured: boolean, discarded: object[] }}
   * @throws {Error} if called outside the 'idle' phase, or if cardId not in hand
   */
  playHandCard(cardId) {
    if (this._phase !== "idle") {
      throw new Error(
        `playHandCard() called while phase is "${this._phase}".` +
        (this._phase === "round_over" ? " The round is over." : "")
      );
    }

    const card = this._hand.remove(cardId);
    if (!card) {
      throw new Error(`Card "${cardId}" is not in the player's hand.`);
    }

    // Count this play against the round limit.
    this._playsRemaining--;

    // Snapshot active yaku (name → multiplier) so _finalizeTurn() can diff.
    this._yakuBeforeTurn = new Map(
      this._scoring.evaluate(this._capture.getAll()).map(y => [y.name, y.multiplier])
    );

    this._discardedThisTurn = [];   // reset each turn

    const handResult = this._field.playHandCard(card);
    if (handResult.captured) {
      // 4-card auto-capture assembled during the hand phase.
      this._addCapture(handResult.captured);
    } else if (handResult.discarded) {
      // Hand card couldn't land — field was full and no match.
      this._discardedThisTurn.push(card);
      this._discardCount++;
    }

    this._phase = "awaiting_deck";

    return {
      status:       "awaiting_deck",
      handCard:     card,
      matched:      handResult.matched,
      autoCaptured: handResult.captured != null,
      discarded:    handResult.discarded ? [card] : [],
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
    const allYaku         = this._scoring.evaluate(this._capture.getAll());
    const totalMultiplier = this._scoring.calculateTotalMultiplier(allYaku);
    const finalScore      = Math.round(this._basePoints * totalMultiplier);
    this._roundEndingAfterDecision = false;
    this._phase = "round_over";
    return {
      status:         "banked",
      newYaku:        [],
      allYaku,
      totalMultiplier,
      basePoints:     this._basePoints,
      finalScore,
      penaltyApplied: false,
      penaltyRate:    0,
      pushCount:      this._pushCount,
      turn:           this._turn,
      deckCard:       this._lastDeckCard,
    };
  }

  /**
   * Push decision: accept the risk and continue playing.
   * Each successive push shrinks the hand dealt, reduces available plays,
   * and escalates the penalty rate.
   *
   * Scaling (pushCount after increment):
   *   Hand cards  = max(2, HAND_SIZE − pushCount × 2)   → 6, 4, 2, 2, …
   *   Plays       = max(2, PLAYS_PER_ROUND − pushCount)  → 4, 3, 2, 2, …
   *   Penalty     = min(0.9, 0.3 + (pushCount−1) × 0.2) → 30%, 50%, 70%, 90%
   *
   * @returns {{ pushPenaltyPct: number }}  The penalty rate now in effect.
   */
  pushOn() {
    if (this._phase !== "yaku_decision") {
      throw new Error(`pushOn() called while phase is "${this._phase}".`);
    }

    this._roundEndingAfterDecision = false;   // round continues
    this._pushCount++;
    this._pushPenaltyRate   = Math.min(0.9, 0.3 + (this._pushCount - 1) * 0.2);

    const allYaku         = this._scoring.evaluate(this._capture.getAll());
    const totalMultiplier = this._scoring.calculateTotalMultiplier(allYaku);
    this._atRiskScore       = Math.round(this._basePoints * totalMultiplier);
    this._pushPenaltyActive = true;

    // Deal a scaled hand — fewer cards with each successive push.
    const targetHand = Math.max(2, GameRoundManager.HAND_SIZE - this._pushCount * 2);
    const handCount  = Math.min(targetHand, this._deck.drawPileSize, this._hand.availableSlots);
    if (handCount > 0) this._hand.add(this._deck.draw(handCount));

    // Fewer plays available with each successive push.
    this._playsRemaining = Math.max(2, GameRoundManager.PLAYS_PER_ROUND - this._pushCount);
    this._phase = "idle";

    return { pushPenaltyPct: Math.round(this._pushPenaltyRate * 100) };
  }

  /**
   * Discard selected hand cards and draw replacements from the deck.
   * Costs 1 play (decrements _playsRemaining).
   * Only callable during the 'idle' phase.
   *
   * @param {string[]} cardIds  IDs of cards currently in hand to discard.
   * @returns {{ status: 'ok'|'round_over', removed: object[], drawn: object[], ... }}
   */
  discardCards(cardIds) {
    if (this._phase !== "idle") {
      throw new Error(`discardCards() called while phase is "${this._phase}".`);
    }

    const removed = this._hand.removeMany(cardIds);
    if (removed.length === 0) {
      return { status: "ok", removed: [], drawn: [], playsRemaining: this._playsRemaining };
    }

    this._playsRemaining--;

    // Draw replacements (capped by deck size and remaining hand capacity).
    const drawCount = Math.min(removed.length, this._deck.drawPileSize, this._hand.availableSlots);
    const drawn     = drawCount > 0 ? this._deck.draw(drawCount) : [];
    if (drawn.length > 0) this._hand.add(drawn);

    const roundOver = this._hand.isEmpty() || this._playsRemaining <= 0;

    if (roundOver) {
      this._phase = "round_over";
      const allYaku         = this._scoring.evaluate(this._capture.getAll());
      const totalMultiplier = this._scoring.calculateTotalMultiplier(allYaku);
      const penaltyApplied  = this._pushPenaltyActive;
      const finalScore      = Math.round(
        this._basePoints * totalMultiplier * (penaltyApplied ? 0.5 : 1.0)
      );
      return {
        status: "round_over",
        removed, drawn,
        newYaku:      [],
        allYaku,
        totalMultiplier,
        basePoints:   this._basePoints,
        finalScore,
        penaltyApplied,
        penaltyRate:  penaltyApplied ? this._pushPenaltyRate : 0,
        turn:         this._turn,
        deckCard:     null,
      };
    }

    return { status: "ok", removed, drawn, playsRemaining: this._playsRemaining };
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
   * Cards are worth their face `points` value (bright=20, animal=10,
   * ribbon=5, plain=1).  A full-month capture (exactly 4 cards) earns a
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

    const allYaku = this._scoring.evaluate(this._capture.getAll());
    // A yaku counts as "new" if its name wasn't present before, OR if its
    // multiplier jumped by more than the largest single incremental step
    // (+0.3 for Hikari).  Subset bonuses (Inoshikacho +0.5, Akatan/Aotan
    // +0.4) clear that bar; plain extra-card growth (+0.2 Tane/Tanzaku,
    // +0.3 Hikari, +0.15 Kasu) does not → no spurious Bank/Push decision.
    // _yakuBeforeTurn is always the previous turn's snapshot (refreshed
    // below), so growth never accumulates across turns.
    const newYaku = allYaku.filter(y => {
      const prev = this._yakuBeforeTurn.get(y.name);
      return prev === undefined || y.multiplier - prev > 0.3;
    });
    // Refresh baseline so next turn compares against current state, not stale state.
    this._yakuBeforeTurn = new Map(allYaku.map(y => [y.name, y.multiplier]));
    const totalMultiplier = this._scoring.calculateTotalMultiplier(allYaku);

    // Completing a new yaku clears the push penalty regardless of outcome.
    if (newYaku.length > 0) this._pushPenaltyActive = false;

    // Round ends when the hand is empty OR the play limit is reached.
    const roundOver = this._hand.isEmpty() || this._playsRemaining <= 0;

    // Apply the escalating penalty only when the round ends under penalty.
    const penaltyApplied = roundOver && this._pushPenaltyActive;
    const finalScore     = Math.round(
      this._basePoints * totalMultiplier * (penaltyApplied ? (1 - this._pushPenaltyRate) : 1.0)
    );

    // The rate the player would face if they choose to push on this turn.
    const nextPushPenaltyPct = Math.round(Math.min(0.9, 0.3 + this._pushCount * 0.2) * 100);

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
      allYaku,
      totalMultiplier,
      basePoints:          this._basePoints,
      finalScore,
      penaltyApplied,
      penaltyRate:         penaltyApplied ? this._pushPenaltyRate : 0,
      pushCount:           this._pushCount,
      nextPushPenaltyPct,
      turn:                this._turn,
      deckCard:            this._lastDeckCard,
      discarded:           [...this._discardedThisTurn],
      roundDiscardCount:   this._discardCount,
    };
  }
}
