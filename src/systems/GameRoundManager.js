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
import ScoringEngine from "./ScoringEngine.js";
import ConsumableEffects from "./ConsumableEffects.js";
import StyleEngine      from "./StyleEngine.js";
import SpiritEffects    from "./SpiritEffects.js";
import run, { RunManager, effectivePower, incrementPerElement, ACCUMULATOR_SPIRIT_IDS, getPushMultiplier } from "./RunManager.js";
import { getActiveEffect, applyHook,
  getFireFlatPoints, getFireBreakChance, getWaterMult,
  getMetalHeldMult, getMeteoriteJackpotChance,
  getEarthInterestRate, getWoodScoringMult, getEarthHeldMult,
} from "./HexagramEffects.js";
import { rollProbability } from "./RNGHook.js";
import { getCardPoints }  from "./CardMutations.js";
import logger           from "./GameplayLogger.js";
import { SPIRIT_CATALOG, getSpiritDef, ANIMAL_SYMBIONT_MAP } from "../data/spirits.js";
import { getProportionalYakuThreshold } from "../data/yakuThresholds.js";

/** Maps yaku names to card rank categories for Bullseye tracking. */
const YAKU_RANK = {
  Hikari:  'bright',
  Tane:    'animal',
  Tanzaku: 'ribbon',
  Kasu:    'plain',
};
const BULLSEYE_RANKS = ['bright', 'animal', 'ribbon', 'plain'];

export default class GameRoundManager {

  // ── Round configuration (adjust freely for playtesting) ────────────────────
  static PLAYS_PER_ROUND = 5;   // how many hand cards the player may play
  static HAND_SIZE       = 8;   // cards dealt to the player's hand at deal time
  static FIELD_DEAL      = 8;   // cards dealt face-up to the field at deal time
  static MAX_DISCARDS    = 2;   // free discards available per round

  constructor() {
    this._deck    = new DeckManager();
    this._hand    = new HandManager(); // real cap set every round at startRound (modifyHandSize)
    this._field   = new FieldManager();
    this._capture = new CaptureManager();
    this._scoring = new ScoringEngine();
    this._style   = new StyleEngine();

    // Per-round state — initialized here for first-shape, then re-applied every round by
    // startRound() through the SAME helpers, so the two field lists can't drift (item 4 dedup).
    this._resetRoundState();
    this._resetScoringState();

    /** Scoring step callback — set by GameScene via setScoringStepCallback().
     *  NOT round state: a GameScene callback that must survive across rounds, so it is
     *  set here only and never touched by _resetRoundState()/startRound(). */
    this._onScoringStep = null;
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
  /** Successful push depth (commitment-based curve index). */
  get pushDepth()      { return this._pushDepth; }
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
    // Proportional baseline from deck composition.
    const deck = run.getDeck();
    const deckSize = deck.length;
    const counts = { bright: 0, animal: 0, ribbon: 0, plain: 0 };
    for (const c of deck) { if (c.type in counts) counts[c.type]++; }
    const result = {
      hikari:  getProportionalYakuThreshold(counts.bright, deckSize),
      tane:    getProportionalYakuThreshold(counts.animal, deckSize),
      tanzaku: getProportionalYakuThreshold(counts.ribbon, deckSize),
      kasu:    getProportionalYakuThreshold(counts.plain,  deckSize),
    };
    // Snake consumable: lower specific thresholds by the consumed amount.
    if (this._snakeThresholdMods) {
      for (const [key, reduction] of Object.entries(this._snakeThresholdMods)) {
        if (key in result) result[key] = Math.max(1, result[key] - reduction);
      }
    }
    // Hexagram modifier — applied per-yaku after snake mods.
    // TODO(PostD-9a): Hexagram threshold modifiers were designed for fixed thresholds.
    // Under proportional model, relative impact may shift. Review during balance tuning.
    for (const key of Object.keys(result)) {
      result[key] = applyHook('modifyYakuThreshold', result[key], key, result[key]);
    }
    // Hotei Blessing: -1 per stack to all yaku thresholds.
    const hoteiStacks = run.countBlessingsByEffect('minus_yaku_threshold');
    if (hoteiStacks > 0) {
      for (const key of Object.keys(result)) result[key] -= hoteiStacks;
    }
    // Floor at 1.
    for (const key of Object.keys(result)) {
      result[key] = Math.max(1, result[key]);
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

  /** Ki gained from Earth enhancements at the start of this round (0 if none). */
  get lastEarthKiGain() { return this._lastEarthKiGain ?? 0; }
  /** Ki gained from base interest at the start of this round (0 if none). */
  get lastInterestGain() { return this._lastInterestGain ?? 0; }

  /** All style combos triggered this round (for end-of-round display). */
  get triggeredStyleCombos() { return this._style.getTriggeredCombos(); }

  /** Revealed next deck flip card (when deck_flip_revealed hexagram is active). */
  get nextDeckFlip() { return this._nextDeckFlip; }
  /** Number of plays required per turn (1 normally, 2 with play_two_cards hex). */
  get requiredPlaysPerTurn() { return this._requiredPlaysPerTurn; }
  /** Number of plays made so far in the current turn. */
  get playsThisTurn() { return this._playsThisTurn; }

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

  setScoringStepCallback(fn) { this._onScoringStep = fn; }

  /**
   * Reset all per-round state to round-start defaults. Called from BOTH the constructor
   * (first-shape) and startRound() (every round) so the two field lists stay in sync —
   * formerly drifted across the two sites (item 4 dedup). Plain field assignments only;
   * the interleaved calls (_deck/_hand/_field/_capture.clear, _style.resetRound, the
   * onRoundStart hooks) stay in startRound() at their existing positions. Does NOT touch
   * _onScoringStep (a cross-round GameScene callback) or the scoring-state fields (those
   * reset AFTER the onRoundStart hooks — see _resetScoringState).
   */
  _resetRoundState() {
    this._lastEarthKiGain    = 0;          // Earth ki bonus — computed at round-end (_computeEarthKiBonus)
    this._phase              = "idle";     // round phase: 'idle' | 'awaiting_deck' | 'round_over'
    this._yakuBeforeTurn     = new Set();  // yaku names present at the start of the current turn
    this._turn               = 0;          // 1-based turn counter
    this._lastDeckCard       = null;       // most recently flipped deck card (UI)
    this._discardCount       = 0;          // field-full discards this round
    this._discardedThisTurn  = [];         // cards discarded this turn (UI animation)
    this._allDiscards        = [];         // all cards discarded this round (field-full + intentional)
    this._playsRemaining     = GameRoundManager.PLAYS_PER_ROUND;
    this._discardsRemaining  = GameRoundManager.MAX_DISCARDS;
    this._basePoints         = 0;          // running base capture points this round
    this._naturalCaptures    = [];         // round-start all-4-of-a-month auto-captures
    this._atRiskScore              = 0;     // finalScore recorded at push (UI: at-risk)
    this._pushPenaltyActive        = false; // exposed to the push penalty
    this._pushCount                = 0;     // times pushed this round
    this._pushDepth                = 0;     // successful push depth (commitment curve index)
    this._bullseyeInventory        = { bright: 0, animal: 0, ribbon: 0, plain: 0 }; // engine_bullseye rank tracker
    this._roundEndingAfterDecision = false; // round-over deferred pending Bank/Push decision
    this._dogProtection            = false; // Dog consumable: suppress push penalty this round
    this._pigDoubleKi              = false; // Pig consumable: double round-end ki
    this._goatActive               = false; // Goat consumable: +1 ki per capture
    this._tigerPushActive          = false; // Tiger consumable: forced-push one-shot
    this._roosterBonusThisRound    = 0;     // Rooster zodiac: +1 field slot this round
    this._snakeThresholdMods       = {};    // Snake consumable: per-yaku threshold mods
    this._lastStyleCombos          = [];    // style combos triggered on the most recent capture (UI)
    this._nextDeckFlip             = null;  // peeked next deck card (reveal hexagram)
    this._playsThisTurn            = 0;     // plays made in the current turn
    this._requiredPlaysPerTurn     = applyHook('modifyPlaysPerTurn', 1, 1); // hex may raise; default 1
  }

  /**
   * Reset per-round SCORING state. Split from _resetRoundState() because in startRound() this
   * runs AFTER the onRoundStart hooks (the documented "onRoundStart fires after state reset,
   * before scoring-state init" contract — SpiritEffects.js header), whereas _resetRoundState()
   * runs before them. Called from the constructor (first-shape) and from startRound() at the
   * post-hook position. (No onRoundStart hook reads these fields today — verified — but the
   * split preserves the timing contract exactly rather than relying on that.)
   */
  _resetScoringState() {
    this._runningScore      = 0;
    this._cumulativePoints  = 0;     // capstone_nature: carries across captures
    this._scoringEvents     = [];
    this._eventCount        = 0;
    this._captureEventCount = 0;
    this._spentCardIds      = new Set();
    this._lastHandPlayToEmptySlot = null;  // empty-slot play tracking (Fix D/E capture rules)
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
    this._deck.resetWithCards(run.getDeck()).shuffle();
    this._hand.clear();
    this._field.clear();
    this._capture.clear();

    this._resetRoundState();
    this._style.resetRound();

    // Hexagram round-start hook
    const _hexEffect = getActiveEffect();
    if (_hexEffect?.onRoundStart) _hexEffect.onRoundStart(this);

    // ── Symbiont per-round resets (includes negatives) ────────────────────
    for (const spirit of run.allSpirits) {
      if (spirit.id === 'sym_osprey'  && spirit.state) spirit.state.flipsUsedThisRound = 0;
      if (spirit.id === 'game_catcher' && spirit.state) spirit.state.catchesUsedThisRound = 0;
    }

    // ── Spirit round-start hooks ──────────────────────────────────────────
    this._fireSpiritHook('onRoundStart');

    // ── Scoring state (reset AFTER the onRoundStart hooks — see _resetScoringState) ──
    this._resetScoringState();

    // Blessing patron bonuses.
    const _handSizeBonus    = run.countBlessingsByEffect('plus_hand_size');
    const _dealCountBonus   = run.countBlessingsByEffect('plus_deal_count');

    // Field slot count: hexagram, Blessings, Amber, and Rooster may adjust from base.
    this._roosterBonusThisRound = 0;
    this._recomputeFieldSlots();
    this._field.setCaptureRule(applyHook('overridesCaptureRule', 'month'));

    // Gankyil legendary: auto-capture at 3-stack instead of 4-stack.
    // Bucket-B (F4.20): legend_gankyil's autoCaptureThreshold is a field state-machine concern —
    // intentionally in place (structural, not a scoring hook), not seepage. See F4.16_F4.20_triage_ledger.md.
    this._field.autoCaptureThreshold = run.activeSpirits.some(s => s.id === 'legend_gankyil') ? 3 : 4;

    const _baseHandSize   = applyHook('modifyHandSize', GameRoundManager.HAND_SIZE + _handSizeBonus, GameRoundManager.HAND_SIZE + _handSizeBonus);
    this._hand.maxSize    = _baseHandSize;
    const _initialDeal    = applyHook('modifyCardsDealt', _baseHandSize + _dealCountBonus, _baseHandSize + _dealCountBonus, 'initial');
    this._drawIntoHand(_initialDeal);

    // Deal field cards one at a time so stacking rules are applied per card.
    for (const card of this._deck.draw(GameRoundManager.FIELD_DEAL)) {
      this._field.dealCard(card);
    }

    logger.logRoundStart(
      run.round, run.act, run.threshold,
      this._hand.getAll(), this._field.getAll(),
      this._lastEarthKiGain ?? 0, run.ki, run.getDeck().length
    );
    logger.logSpiritLoadout(run.spirits, run.negativeSpirits, run.legendarySpirits);

    // Peek at next deck card if reveal hexagram is active.
    this._peekNextDeckFlip();

    // Log yaku thresholds at round start.
    const _thresholds = this._getCaptureThresholds();
    const _deck = run.getDeck();
    const _comp = { bright: 0, animal: 0, ribbon: 0, plain: 0, total: _deck.length };
    for (const c of _deck) { if (c.type in _comp) _comp[c.type]++; }
    logger.logYakuThresholds(_thresholds, _comp);

    return this;
  }

  /**
   * Score all remaining field cards (score_field_at_round_end hexagram).
   * Runs through the same per-card scoring pipeline as _addCapture.
   */
  _scoreFieldCards() {
    if (!applyHook('scoreFieldAtRoundEnd', false)) return;
    const fieldCards = this._field.getAll();
    if (fieldCards.length === 0) return;

    if (this._onScoringStep) this._onScoringStep({ type: 'capture_start' });

    const _fieldSpirits = run.scoringSpirits;
    let points = 0;
    let mult   = 1.0;
    const _bd = { cards: [], heldEffects: [], engines: [] };

    // ── Per-card scoring (enhancements + editions + hex + spirit onCardScored) ──
    for (const card of fieldCards) {
      const _cb = {
        cardName: card.name ?? card.id,
        meta: `${card.type}, month ${card.month}`,
        basePoints: getCardPoints(card),
        contributions: [],
        totalCardPts: 0,
      };
      let cardPts = getCardPoints(card);
      ({ cardPts, mult } = this._applyCardEnhancements(card, cardPts, mult, _cb.contributions));

      const _hexFieldRes = this._applyHexCardScored(card, cardPts, mult);
      cardPts = _hexFieldRes.cardPts;
      mult    = _hexFieldRes.mult;
      if (_hexFieldRes.mod) {
        _cb.contributions.push({
          source: `hexagram ${run.getHexagram()?.englishName ?? 'hex'}`,
          addPoints: _hexFieldRes.mod.addPoints ?? 0, addMult: _hexFieldRes.mod.addMult ?? 0, multiplyMult: _hexFieldRes.mod.multiplyMult ?? 1,
        });
      }

      for (const spirit of _fieldSpirits) {
        const effect = SpiritEffects.get(spirit.id);
        if (!effect?.onCardScored) continue;
        const count = ACCUMULATOR_SPIRIT_IDS.has(spirit.id) ? 1 : effectivePower(spirit);
        const r = effect.onCardScored({ card, spirit, spirits: _fieldSpirits });
        if (r) {
          if (r.addPoints)    cardPts += r.addPoints    * count;
          if (r.addMult)      mult    += r.addMult      * count;
          if (r.multiplyMult) mult    *= r.multiplyMult * count;
          _cb.contributions.push({
            source: `${spirit.name}${count > 1 ? ` \xD7${count}` : ''}`,
            addPoints: (r.addPoints ?? 0) * count, addMult: (r.addMult ?? 0) * count,
            multiplyMult: r.multiplyMult ?? 1,
          });
        }
      }

      points += cardPts;
      _cb.totalCardPts = cardPts;
      _bd.cards.push(_cb);
      if (this._onScoringStep) {
        this._onScoringStep({ type: 'card_points', card, cardPts, points, mult });
      }
    }

    // ── Engine spirits (applyEngine — per scoring event) ──
    for (const spirit of _fieldSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (!effect?.applyEngine) continue;
      const r = effect.applyEngine({ spirit, mult, points, spirits: _fieldSpirits, cards: fieldCards });
      if (r) {
        if (r.addPoints)    points += r.addPoints;
        if (r.addMult)      mult   += r.addMult;
        if (r.multiplyMult) mult   *= r.multiplyMult;
        _bd.engines.push({
          source: `${spirit.name} (stack ${effectivePower(spirit)})`,
          addPoints: r.addPoints ?? 0, addMult: r.addMult ?? 0, multiplyMult: r.multiplyMult ?? 1,
        });
      }
    }

    const flow = run.flow;
    const _hexCompute = getActiveEffect();
    const fieldScore = this._computeCaptureScore(_hexCompute, points, mult, flow);
    this._runningScore += fieldScore;

    // ── Field scoring log (parity with capture scoring) ──
    const _captureNum = ++this._captureEventCount;
    logger.logCaptureScoring({
      captureNumber: _captureNum, turn: this._turn, phase: 'field_end',
      cardBreakdowns: _bd.cards,
      captureLevel: { heldEffects: _bd.heldEffects, engineSpirits: _bd.engines },
      totalPoints: points, totalMult: mult, flow,
      captureScore: fieldScore, runningRoundTotal: this._runningScore,
      customFormula: _hexCompute?.computeFinalScore ? 'hex computeFinalScore' : null,
    });

    if (this._onScoringStep) {
      this._onScoringStep({
        type: 'capture_complete', points, mult, flow, captureScore: fieldScore,
        runningTotal: this._runningScore,
      });
    }
    this._scoringEvents.push({
      type: 'field_score', cards: fieldCards, capturePoints: points, mult, flow,
      captureScore: fieldScore, runningTotal: this._runningScore,
    });
  }

  /** Peek at the top card of the deck for the reveal hexagram. */
  _peekNextDeckFlip() {
    if (applyHook('revealsDeckFlip', false) && !this._deck.isEmpty()) {
      this._nextDeckFlip = this._deck.peek(1)[0] ?? null;
    } else {
      this._nextDeckFlip = null;
    }
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

    // sym_ants counts cards played (mult applied in engine output) via onCardPlayed.
    this._fireCardPlayedHooks(cards);

    // Multi-play turn: resolve any pending match from a previous play this turn.
    if (this._playsThisTurn > 0) {
      const pending = this._field.getPendingSlot();
      if (pending) {
        const captured = this._field.capturePendingMatch();
        if (captured.length > 0) this._addCapture(captured);
      }
    }

    // Snapshot yaku and reset discards only on the first play of a turn.
    if (this._playsThisTurn === 0) {
      const _snapThresholds = this._getCaptureThresholds();
      const _snapCards = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
      this._yakuBeforeTurn = new Set(
        this._scoring.evaluate(_snapCards, _snapThresholds).map(y => y.name)
      );
      this._discardedThisTurn = [];
    }

    const handResult = this._field.playHandCards(cards, targetMonth);
    // engine_moths: Wood (Leaf or Silk) field slot creation → onWoodSlotCreated.
    if (handResult.woodSlotCreated) this._fireWoodSlotCreatedHooks();
    let lostToDiscard = [];
    if (handResult.captured) {
      // All 4 cards of the month assembled — capture immediately.
      this._addCapture(handResult.captured);
    } else if (handResult.discarded) {
      // No room on the field — route through the canonical discard pipeline.
      // F4.17#3: gains catcher (an overflowed card may be rescued to hand instead
      // of lost) + unified recycling reason; ship/stamps unchanged. lostToDiscard
      // is the subset actually discarded (not caught) — drives result.discarded below.
      lostToDiscard = this._discardCards(cards, 'hand_overflow');
    }

    // Track whether the play went to an empty slot (no field match, no capture,
    // no discard) — used in _doDeckPhase for Fix D/E capture rules.
    if (!handResult.matched && !handResult.captured && !handResult.discarded) {
      this._lastHandPlayToEmptySlot = { cards, month: cards[0].month };
    } else {
      this._lastHandPlayToEmptySlot = null;
    }

    this._playsThisTurn++;
    const morePlays = this._playsThisTurn < this._requiredPlaysPerTurn && !this._hand.isEmpty();

    this._phase = morePlays ? "idle" : "awaiting_deck";

    return {
      status:       morePlays ? "awaiting_play" : "awaiting_deck",
      handCards:    cards,
      matched:      handResult.matched,
      autoCaptured: handResult.captured != null,
      discarded:    lostToDiscard,
      basePoints:   this._basePoints,
      playsRemaining: this._requiredPlaysPerTurn - this._playsThisTurn,
    };
  }

  /**
   * Phase 2 of a turn: flip the top deck card and resolve the pending match
   * (if any), then finalise the turn.
   *
   * Must be called after playHandCard().
   *
   * @returns {{ status: string, newYaku: object[], allYaku: object[],
   *             turn: number, deckCard: object|null,
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
    return this._endRound('banked');
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
    // Hand cards carry over; deal a fixed number of additional cards.
    const dealCount = this._getNextPushDealCount();
    const { drawn: pushDrawn } = this._drawIntoHand(dealCount);
    this._peekNextDeckFlip();
    // Re-snapshot yaku using only unspent cards so spent yaku can re-trigger.
    const unspentAfterPush = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
    this._yakuBeforeTurn = new Set(
      this._scoring.evaluate(unspentAfterPush, this._getCaptureThresholds())
        .map(y => y.name)
    );
    this._phase = "idle";
    // Preview: if the next yaku succeeds we'll bank at depth+1; if it fails, depth+1 failure.
    const nextDepth = this._pushDepth + 1;
    return {
      failedPushFactor: 1.0,
      failedFlow:       run.flow * getPushMultiplier(nextDepth, 'failure'),
      successFlow:      run.flow * getPushMultiplier(nextDepth, 'success'),
      dealCount:        pushDrawn.length,
    };
  }

  /**
   * Continue playing without push mechanics (used when yaku is disabled).
   * Simply returns to the idle phase so the player can play their next card.
   */
  continuePlay() {
    if (this._phase !== "yaku_decision") {
      throw new Error(`continuePlay() called while phase is "${this._phase}".`);
    }
    this._roundEndingAfterDecision = false;
    this._phase = "idle";
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
    const result = effect.execute({ roundManager: this, params });
    // sym_badger: count zodiac/consumable activations.
    // F4.20-FIX: iterate allSpirits so transcended (Negative) copies accrue too. (The
    // RunManager._notifyBadger path already iterates allSpirits; this in-round path lagged.)
    if (result.success !== false) {
      for (const spirit of run.allSpirits) {
        if (spirit.id === 'sym_badger') {
          incrementPerElement(spirit, 'consumablesUsed', 1);
        }
      }
    }
    return result;
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
   */
  _applyPostRoundEnhancements(capturedCards) {
    const events = [];
    for (const card of capturedCards) {
      if (card.enhancement?.element === 'water') {
        const tier = card.enhancement.tier;
        card.enhancement.depLevel = (card.enhancement.depLevel ?? 0) + 1;
        events.push(`${card.id} Water dep → level ${card.enhancement.depLevel}`);
        // engine_glacier: tier-aware depreciation tracking.
        // F4.20-FIX: iterate allSpirits so transcended (Negative) copies accrue too
        // (incrementPerElement routes them to newEvents1/2 per the locked F2.5 design).
        for (const spirit of run.allSpirits) {
          if (spirit.id === 'engine_glacier') {
            if (tier === 'base')     incrementPerElement(spirit, 't1Procs', 1);
            if (tier === 'upgraded') incrementPerElement(spirit, 't2Procs', 1);
          }
        }
      }
      if (card.enhancement?.element === 'fire') {
        const tier = card.enhancement.tier;
        const breakChance = getFireBreakChance(tier);
        if (rollProbability(breakChance, 'fire_break')) {
          // engine_carbon: tier-aware break tracking (read tier before destruction).
          // F4.20-FIX: iterate allSpirits so transcended (Negative) copies accrue too.
          for (const spirit of run.allSpirits) {
            if (spirit.id === 'engine_carbon') {
              if (tier === 'base')     incrementPerElement(spirit, 't1Procs', 1);
              if (tier === 'upgraded') incrementPerElement(spirit, 't2Procs', 1);
            }
          }
          run.deleteCard(card.id);
          card._broken = true;
          events.push(`${card.id} Fire BROKE — card destroyed`);
        }
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
   * Compute Earth (Clay/Pottery) ki bonus based on cards held in hand.
   * Clay: 10% of current ki per Clay card in hand.
   * Pottery: 20% of current ki per Pottery card in hand.
   * Called at round end before ki is applied so it scales with accumulated wealth.
   * @returns {number}
   */
  _computeEarthKiBonus() {
    let rate = 0;
    for (const card of this._hand.getAll()) {
      if (card.enhancement?.element !== 'earth') continue;
      const _heldTriggers = 1 + this._computeRetriggerCount(card, 'held_in_hand');
      for (let _ht = 0; _ht < _heldTriggers; _ht++) {
        rate += getEarthInterestRate(card.enhancement.tier);
        // engine_fossil: tier-aware Earth interest proc tracking.
        // F4.20-FIX: iterate allSpirits so transcended (Negative) copies accrue too.
        for (const spirit of run.allSpirits) {
          if (spirit.id === 'engine_fossil') {
            const tier = card.enhancement.tier;
            if (tier === 'base')     incrementPerElement(spirit, 't1Procs', 1);
            if (tier === 'upgraded') incrementPerElement(spirit, 't2Procs', 1);
          }
        }
      }
    }
    return Math.floor(run.ki * rate);
  }

  /**
   * Returns the number of cards to deal on the next push in capture mode.
   * Push 1: +4, Push 2: +2, Push 3+: +1.
   */
  _getNextPushDealCount() {
    const dealBonus = run.countBlessingsByEffect('plus_deal_count');
    let base;
    if      (this._pushCount === 1) base = 4 + dealBonus;
    else if (this._pushCount === 2) base = 2 + dealBonus;
    else                            base = 1 + dealBonus;
    const phase = this._pushCount === 1 ? 'push1' : this._pushCount === 2 ? 'push2' : 'push3plus';
    return applyHook('modifyCardsDealt', base, base, phase);
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
   * ribbon=10, plain=3).
   *
   * @param {object[]} cards
   */
  /**
   * Fire onRoundEndUnplayed (round-end unplayed-hand tally) for every equipped spirit.
   * Fired in the teardown BEFORE _scoreFieldCards so the count is visible to round-end field
   * scoring — NOT via the generic onRoundEnd (which fires later, post-field-score). Iterates
   * allSpirits (incl. Negatives) — incrementPerElement routes Negatives to their newEvents.
   * (F4.20 counter wave: replaced the inline sym_snails _trackSnailsUnplayed.)
   */
  _fireRoundEndUnplayedHooks(handCount) {
    if (handCount === 0) return;
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.onRoundEndUnplayed) {
        effect.onRoundEndUnplayed({ spirit, handCount, run, roundManager: this });
      }
    }
  }

  /**
   * Recompute and apply the field's max slot count from all active modifiers:
   * MAX_SLOTS base + blessing bonus + Amber permanent mod + Rooster in-round bonus,
   * then the hexagram modifyFieldSlots hook on top.
   */
  _recomputeFieldSlots() {
    const _fieldSlotBonus = run.countBlessingsByEffect('plus_field_slot');
    const _amberMod = run._permanentFieldSlotMod ?? 0;
    const _roosterBonus = this._roosterBonusThisRound ?? 0;
    const _fieldBase = Math.max(1,
      FieldManager.MAX_SLOTS + _fieldSlotBonus + _amberMod + _roosterBonus
    );
    this._field.setMaxSlots(applyHook('modifyFieldSlots', _fieldBase, _fieldBase));
  }

  /**
   * Universal retrigger count for a card under a specific trigger type.
   * Combines stamp-driven (white/gray — universal) with spirit-driven retriggers.
   * @param {object} card
   * @param {string} triggerType  'scoring' | 'held_in_hand' | 'capture' | 'discard' | 'yaku'
   * @returns {number} Additional retriggers (total fires = 1 + this).
   */
  _computeRetriggerCount(card, triggerType, isFirstCardOfCapture = false) {
    let count = 0;
    if (card.ribbonStamp === 'stamp_white') count += 1;
    if (card.ribbonStamp === 'stamp_gray')  count += 3;
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.getRetriggerCount) {
        count += effect.getRetriggerCount({
          // [FIX] allSpirits = chain in placement order so Mirror/Memory can target/be-targeted
          // by Negatives (was run.activeSpirits). See SPIRIT_SET_ITERATION_RULE.md.
          card, spirit, spirits: run.allSpirits, triggerType, isFirstCardOfCapture,
        });
      }
    }
    return count;
  }

  /**
   * Fire a named lifecycle hook for every equipped spirit whose effect implements it.
   * @param {string} hookName  e.g. 'onRoundStart', 'onRoundEnd'
   */
  _fireSpiritHook(hookName) {
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.[hookName]) {
        effect[hookName]({ spirit, spirits: run.activeSpirits, run, roundManager: this });
      }
    }
  }

  /**
   * Fire the onFieldDiscard hook for every equipped spirit that implements it.
   * Side-effect hooks that REACT to a committed discard (econ_recycling +5 ki/stack,
   * engine_ship cardsDiscarded++). Catcher interception is NOT here — it decides
   * WHETHER to discard and lives at the call site (see F4.17 campaign ledger).
   * @param {object} card
   * @param {'deck_overflow'|'hand_overflow'|'consumable'|'reveal_miss'} source
   */
  _fireFieldDiscardHooks(card, source) {
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.onFieldDiscard) {
        effect.onFieldDiscard({ card, source, spirit, spirits: run.activeSpirits, run, roundManager: this });
      }
    }
  }

  /**
   * Fire the onCardPlayed hook for every equipped spirit that implements it.
   * Event-data hook carrying the cards played this play (sym_ants counts them).
   * Iterates allSpirits (incl. Negatives) — incrementPerElement routes Negatives
   * to their newEvents accumulator, matching the prior inline behavior.
   * @param {object[]} cards  The cards played in this play.
   */
  _fireCardPlayedHooks(cards) {
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.onCardPlayed) {
        effect.onCardPlayed({ cards, spirit, spirits: run.activeSpirits, run, roundManager: this });
      }
    }
  }

  /**
   * Fire the onWoodSlotCreated hook for every equipped spirit that implements it.
   * Fired once each time a Wood (Leaf/Silk) field slot is created (engine_moths t1).
   * The Silk stranding-avoidance credit (engine_moths t2) is a SEPARATE event —
   * see _fireSilkAntiStrandHooks.
   */
  _fireWoodSlotCreatedHooks() {
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.onWoodSlotCreated) {
        effect.onWoodSlotCreated({ spirit, spirits: run.activeSpirits, run, roundManager: this });
      }
    }
  }

  /**
   * Fire the onSilkAntiStrand hook for every equipped spirit that implements it.
   * Fired once each time a Silk 3-stack is banked instead of stranded (engine_moths t2).
   */
  _fireSilkAntiStrandHooks() {
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.onSilkAntiStrand) {
        effect.onSilkAntiStrand({ spirit, spirits: run.activeSpirits, run, roundManager: this });
      }
    }
  }

  /**
   * Fire the onStackCaptured hook for every equipped spirit that implements it. Fired once per
   * capture, BEFORE Phase 2 applyEngine, so a 4-stack capture's own count is visible to its
   * applyEngine that same capture. Iterates allSpirits (incl. Negatives). The cards.length guard
   * lives in the hook body. (F4.20 counter wave: replaced the inline engine_missing_number block.)
   */
  _fireStackCapturedHooks(cards) {
    for (const spirit of run.allSpirits) {
      const effect = SpiritEffects.get(spirit.id);
      if (effect?.onStackCaptured) {
        effect.onStackCaptured({ cards, spirit, run, roundManager: this });
      }
    }
  }

  /**
   * Dispatch a card's discard-trigger stamp effects with retrigger awareness.
   * Blue → consumable, Green → +3 ki, Purple/Black/Gray → draw +1.
   * @param {object} card  The discarded card.
   */
  /**
   * Draw up to `want` cards from the deck into the hand, clamped to what the deck has AND what
   * the hand can hold. Cards that don't fit STAY IN THE DECK (not spliced-and-dropped). The one
   * home for "draw N into hand" — replaces the scattered add(draw(n)) sites that leaked the deck
   * on a full hand. (Draw-pile source only; zodiac_dog retrieves from the discard pile — see its
   * own clamp.)
   * @returns {{ drawn: object[], leftover: number }}
   */
  _drawIntoHand(want) {
    const n = Math.min(want, this._deck.drawPileSize, this._hand.availableSlots);
    const drawn = n > 0 ? this._deck.draw(n) : [];
    if (drawn.length > 0) this._hand.add(drawn);
    return { drawn, leftover: want - drawn.length };
  }

  _dispatchStampDiscardEffects(card) {
    if (!card.ribbonStamp) return;
    const stamp = card.ribbonStamp;
    const fireCons = stamp === 'stamp_blue';
    const fireKi   = stamp === 'stamp_green';
    const fireDraw = stamp === 'stamp_purple' || stamp === 'stamp_black' || stamp === 'stamp_gray';
    if (!fireCons && !fireKi && !fireDraw) return;
    const fireCount = 1 + this._computeRetriggerCount(card, 'discard');
    for (let rt = 0; rt < fireCount; rt++) {
      if (fireCons) run.generateRandomConsumable();
      if (fireKi) run.addKi(3, `${stamp}_discard`);
      if (fireDraw) this._drawIntoHand(1);
    }
  }

  /**
   * Unified round-end teardown. All four round-end triggers route through here.
   * Steps 1–4 of the F4.18b campaign migrated inline tenants (crow, decay,
   * lincoln, napoleon) into hooks; this step collapses the four duplicate
   * teardown sequences into one.
   *
   * @param {'banked'|'natural'|'forced_auto_bank'|'consumable_empty_hand'} trigger
   * @param {object} [ctx]  Contextual data from the caller.
   * @param {boolean} [ctx.penaltyApplied=false]  True when push penalty is active (natural path).
   * @returns {object} Unified round-end result object.
   */
  _endRound(trigger, ctx = {}) {
    // ── Trigger-specific prologue ─────────────────────────────────────
    if (trigger === 'banked') {
      run.onBank(this);
      const _hexBank = getActiveEffect();
      if (_hexBank?.onBank) _hexBank.onBank(run);
      this._fireSpiritHook('onBank');
    }
    if (trigger === 'natural' && this._pushPenaltyActive && !this._dogProtection) {
      run.onPushFailure(this);
      this._fireSpiritHook('onPushFailure');
    }

    // ── Shared core teardown (runs for ALL triggers, including 1D) ────
    // Order matches bankScore's canonical sequence (the most-exercised path).
    this._fireRoundEndUnplayedHooks(this._hand.getAll().length);
    this._scoreFieldCards();
    run.applyFlowDecay();
    const flow = run.flow;   // POST-decay capture
    this._applyPostRoundEnhancements(this._capture.getAll());
    logger.logRoundEnd(
      { finalScore: this._runningScore, basePoints: this._runningScore, flow },
      run.threshold, this._runningScore >= run.threshold,
      this._capture.getAll(),
      this._style.getTriggeredCombos(), this._lastEnhancementEvents ?? []
    );
    this._roundEndingAfterDecision = false;
    const _hexEnd = getActiveEffect();
    if (_hexEnd?.onRoundEnd) _hexEnd.onRoundEnd(this);
    this._fireSpiritHook('onRoundEnd');
    this._phase = "round_over";

    return this._buildRoundEndResult(trigger, flow, ctx);
  }

  /**
   * Build the unified round-end return object. Superset of fields consumed by
   * GameScene's _showEndScreen and _handleResult.
   * @param {string} trigger
   * @param {number} flow  Post-decay flow value.
   * @param {object} ctx   Contextual data (penaltyApplied, newYaku, etc.).
   */
  _buildRoundEndResult(trigger, flow, ctx = {}) {
    return {
      status:           trigger === 'banked' ? 'banked' : 'round_over',
      finalScore:       this._runningScore,
      runningScore:     this._runningScore,
      basePoints:       this._runningScore,
      captureEvents:    [...this._scoringEvents],
      newYaku:          ctx.newYaku ?? [],
      allYaku:          ctx.allYaku ?? [],
      yakuDisabled:     ctx.yakuDisabled ?? false,
      tigerPush:        ctx.tigerPush ?? false,
      nextDeckFlip:     this._nextDeckFlip,
      flow,
      pushFactor:       1.0,
      penaltyApplied:   ctx.penaltyApplied ?? false,
      pushCount:        this._pushCount,
      pushDepth:        this._pushDepth,
      pigDoubleKi:      this._pigDoubleKi,
      turn:             this._turn,
      deckCard:         this._lastDeckCard,
      discarded:        [...this._discardedThisTurn],
      roundDiscardCount: this._discardCount,
      cardsInHand:      this._hand.getAll().length,
      styleCombos:      this._style.getTriggeredCombos().length,
      earthKiBonus:     this._computeEarthKiBonus(),
    };
  }

  /**
   * Check if hand is empty and trigger round-end transition if so.
   * Used by consumables that may empty the hand (Monkey, Horse with empty deck).
   * @returns {boolean} True if round was ended.
   */
  _checkRoundEndOnEmptyHand() {
    if (this._hand.getAll().length > 0) return false;
    if (this._phase === 'round_over') return false;
    this._endRound('consumable_empty_hand');
    return true;
  }

  /**
   * Catcher interception GATE: decides WHETHER a card is discarded at all.
   * If game_catcher has catches remaining this round and the hand has room,
   * route the card to hand instead and report it consumed. Kept separate from
   * the discard side-effects (recycling/ship) because it prevents the discard
   * rather than reacting to one (F4.17 campaign decision).
   * @param {object} card
   * @returns {boolean} True if the card was caught (→ hand); caller skips the discard.
   */
  _tryCatcherIntercept(card) {
    const catcherSpirits = run.allSpirits.filter(s => s.id === 'game_catcher');
    const catcherMax = run.countStackedById('game_catcher');
    if (catcherMax > 0 && this._hand.availableSlots > 0) {
      const used = catcherSpirits[0]?.state?.catchesUsedThisRound ?? 0;
      if (used < catcherMax) {
        for (const c of catcherSpirits) {
          if (c.state) c.state.catchesUsedThisRound = used + 1;
        }
        this._hand.add([card]);
        return true;
      }
    }
    return false;
  }

  /**
   * Canonical single-card discard. Every discard site routes here.
   * Order: catcher gate (may consume → 'catcher') → bookkeeping →
   * onFieldDiscard side-effects (recycling, ship) → stamp dispatch.
   * @param {object} card
   * @param {'deck_overflow'|'hand_overflow'|'consumable'|'reveal_miss'} source
   * @returns {string} 'catcher' (caught → hand) or 'field_discard' (discarded).
   */
  _discardCard(card, source) {
    if (this._tryCatcherIntercept(card)) return 'catcher';
    this._discardedThisTurn.push(card);
    this._allDiscards.push(card);
    this._discardCount++;
    // econ_recycling (+5 ki/stack) + engine_ship (cardsDiscarded++) via onFieldDiscard.
    this._fireFieldDiscardHooks(card, source);
    // Stamp discard-trigger effects.
    this._dispatchStampDiscardEffects(card);
    return 'field_discard';
  }

  /**
   * Batch convenience around _discardCard for sites that discard a set of cards.
   * @param {object[]} cards
   * @param {'deck_overflow'|'hand_overflow'|'consumable'|'reveal_miss'} source
   * @returns {object[]} The subset actually discarded (i.e. NOT rescued by catcher).
   */
  _discardCards(cards, source) {
    const discarded = [];
    for (const card of cards) {
      if (this._discardCard(card, source) === 'field_discard') discarded.push(card);
    }
    return discarded;
  }

  /**
   * Wrapper around field.addFlippedCard that discards unmatched deck cards
   * when the deck_flip_revealed hexagram is active.
   */
  _addFlippedCardToField(card) {
    if (applyHook('discardUnmatchedDeckFlip', false)) {
      const hasMatch = this._field.getSlots().some(s =>
        s && s.state !== 'pending' && this._field.matchesSlot(card, s)
      );
      if (!hasMatch) {
        return { captured: null, discarded: true, discardSource: 'reveal_miss' };
      }
    }
    const result = this._field.addFlippedCard(card);
    // engine_moths: Wood (Leaf or Silk) field slot creation → onWoodSlotCreated.
    if (result.woodSlotCreated) this._fireWoodSlotCreatedHooks();
    return result;
  }

  /**
   * Apply Wu Xing enhancement (Fire/Water/Wood) + Gold/Crystal/Ghost edition math to a card's
   * running points/mult. The single home for the per-card scoring math that was triplicated across
   * the capture per-card loop, the Phase-1.5 retrigger loop, and _scoreFieldCards (the F4.38 triad).
   * Pushes a telemetry breakdown to `contributions` when provided; the retrigger loop passes null
   * (it emits no per-contribution breakdown — preserved).
   * @returns {{cardPts:number, mult:number}}
   */
  _applyCardEnhancements(card, cardPts, mult, contributions) {
    const enh = card.enhancement;
    if (enh?.element === 'fire') {
      const _fp = getFireFlatPoints(enh.tier);
      cardPts += _fp;
      contributions?.push({ source: `${enh.tier} Fire`, addPoints: _fp });
    }
    if (enh?.element === 'water') {
      const _wm = getWaterMult(enh.tier, enh.depLevel ?? 0);
      mult *= _wm;
      contributions?.push({ source: `${enh.tier} Water (dep ${enh.depLevel ?? 0})`, multiplyMult: _wm });
    }
    if (enh?.element === 'wood') {
      const _wdm = getWoodScoringMult(enh.tier);
      mult *= _wdm;
      contributions?.push({ source: `${enh.tier} Wood`, multiplyMult: _wdm });
    }
    if (card.edition === 'gold')    { cardPts += 20; contributions?.push({ source: 'Gold edition', addPoints: 20 }); }
    if (card.edition === 'crystal') { mult += 5;     contributions?.push({ source: 'Crystal edition', addMult: 5 }); }
    if (card.edition === 'ghost')   { mult *= 1.5;   contributions?.push({ source: 'Ghost edition', multiplyMult: 1.5 }); }
    return { cardPts, mult };
  }

  /**
   * Apply the active hexagram's onCardScored modifier to a card's running points/mult (the X1 hex
   * scoring twin — one math home for _addCapture and _scoreFieldCards). Returns the raw `mod` so each
   * caller can emit its own telemetry (the capture loop also drives the hexagram animation step; the
   * two sites differ only in their contribution fallback label). The Phase-1.5 retrigger loop also
   * calls this (F2.10c, D2) so a retriggered card gets the active hex multiplier the same as its
   * first pass; the retrigger context discards the returned `mod` (no per-retrigger breakdown).
   * @returns {{cardPts:number, mult:number, mod:(object|null)}}
   */
  _applyHexCardScored(card, cardPts, mult) {
    const effect = getActiveEffect();
    if (effect?.onCardScored) {
      const mod = effect.onCardScored(card, { currentPoints: cardPts, currentMult: mult });
      if (mod) {
        if (mod.addPoints    !== undefined) cardPts += mod.addPoints;
        if (mod.addMult      !== undefined) mult    += mod.addMult;
        if (mod.multiplyMult !== undefined) mult    *= mod.multiplyMult;
        return { cardPts, mult, mod };
      }
    }
    return { cardPts, mult, mod: null };
  }

  /**
   * Final per-capture score: the active hexagram's computeFinalScore override, else the standard
   * Math.round(points * mult * flow). The X1 computeFinalScore twin — one home for _addCapture and
   * _scoreFieldCards. Takes the already-fetched active effect so callers can reuse it for logging
   * (avoids a second getActiveEffect() call).
   * @returns {number}
   */
  _computeCaptureScore(effect, points, mult, flow) {
    return effect?.computeFinalScore
      ? effect.computeFinalScore(points, mult, flow)
      : Math.round(points * mult * flow);
  }

  /** Fire the active hexagram's onCaptureComplete hook (if any) for a completed capture. */
  _fireHexOnCaptureComplete(cards) {
    const effect = getActiveEffect();
    if (effect?.onCaptureComplete) effect.onCaptureComplete({ run, capturedCards: cards });
  }

  /**
   * Held-from-hand scoring contribution for one hand card during a capture. Returns a structured
   * contribution object so the F5.8 Earth redesign can add `addKi`/`addInterest` channels without
   * re-opening this seam (see scoring_loop_inventory_pass1.md §6). TODAY only `multiplyMult` is
   * populated: Metal → getMetalHeldMult; Earth → getEarthHeldMult (×1.0 in ordinary play, hex-gated).
   * The Meteorite jackpot RNG is a side-effect of the Metal branch and stays at the call site.
   * @returns {{multiplyMult:number}|null}  null for non-Metal/Earth cards.
   */
  _heldCardContribution(handCard) {
    const henh = handCard.enhancement;
    if (henh?.element === 'metal') return { multiplyMult: getMetalHeldMult(henh.tier) };
    if (henh?.element === 'earth') return { multiplyMult: getEarthHeldMult(henh.tier) };
    return null;
  }

  _addCapture(cards) {
    if (this._onScoringStep) this._onScoringStep({ type: 'capture_start' });

    this._capture.add(cards);
    this._basePoints += cards.reduce((sum, c) => sum + getCardPoints(c), 0);

    // score_field_at_round_end: captures add to pile but don't score.
    if (applyHook('disableCaptureScoring', false)) {
      run.onCardsCaptured(cards);
      if (this._goatActive) run.addKi(cards.length, 'goat_capture');
      logger.logCapture(cards, 'capture');
      const newCombos = this._style.checkCombos(this._capture.getAll());
      if (newCombos.length > 0) this._onStyleCombos(newCombos);
      this._fireHexOnCaptureComplete(cards);
      return;
    }

    {
      // Cache spirit arrays for this capture (same object references as _allSpirits).
      const _activeSpirits  = run.activeSpirits;
      const _scoringSpirits = run.scoringSpirits;
      // The chain in TRUE PLACEMENT ORDER (regulars + Negatives, no legendaries) — the
      // targeting ctx for Mirror/Memory adjacency. [FIX] was _activeSpirits (Negatives
      // excluded); transcended spirits are valid targets/targeters. See SPIRIT_SET_ITERATION_RULE.md.
      const _chainSpirits   = run.allSpirits;

      // Reset Golden Toad per-capture application counter.
      // F4.20-FIX2: iterate allSpirits so a transcended toad resets too (its onCardScored
      // already fires for Negatives; without this reset it jams at max). See SPIRIT_SET_ITERATION_RULE.md.
      for (const spirit of run.allSpirits) {
        if (spirit.id === 'engine_golden_toad') spirit._captureAppliedCount = 0;
      }

      // ── Capstone flags ──────────────────────────────────────────────────────
      const _yinYangActive  = _activeSpirits.some(s => s.id === 'capstone_yinyang');
      const _universeActive = _activeSpirits.some(s => s.id === 'capstone_universe');
      const _natureActive   = _activeSpirits.some(s => s.id === 'capstone_nature');
      const _yinYangTriggers = _yinYangActive ? 2 : 1;

      // ── Phase 1: Process each card through spirits left-to-right ──────────
      let points = _natureActive ? this._cumulativePoints : 0;
      let mult   = 1.0;

      // ── Scoring breakdown tracking (purely additive telemetry) ─────────
      const _captureNum = ++this._captureEventCount;
      const _bd = { cards: [], heldEffects: [], engines: [] };

      // Metal enhancement: mult from cards held in HAND during this capture.
      // Earth enhancement: mult from earth cards held in HAND during this capture.
      for (const handCard of this._hand.getAll()) {
        const _heldTriggers = 1 + this._computeRetriggerCount(handCard, 'held_in_hand');
        for (let _ht = 0; _ht < _heldTriggers; _ht++) {
          const henh = handCard.enhancement;
          // Held contribution object (F5.8 seam — only multiplyMult populated today).
          const _held = this._heldCardContribution(handCard);
          if (henh?.element === 'metal') {
            mult *= _held.multiplyMult;
            if (_ht === 0) _bd.heldEffects.push({ source: `${henh.tier === 'upgraded' ? 'Meteorite' : 'Iron'} (${handCard.name})`, multiplyMult: _held.multiplyMult });
            if (henh.tier === 'upgraded' && rollProbability(getMeteoriteJackpotChance(), 'meteorite_jackpot')) {
              run.addKi(30, 'meteorite_jackpot');
              // engine_velocity: +t2Procs per Meteorite jackpot.
              // F4.20-FIX: iterate allSpirits so transcended (Negative) copies accrue too
              // (incrementPerElement routes them via the t2ProcsAtTranscend marker → newT2Procs).
              for (const spirit of run.allSpirits) {
                if (spirit.id === 'engine_velocity') {
                  incrementPerElement(spirit, 't2Procs', 1);
                }
              }
            }
          } else if (henh?.element === 'earth') {
            mult *= _held.multiplyMult;
            if (_ht === 0) _bd.heldEffects.push({ source: `${henh.tier === 'upgraded' ? 'Pottery' : 'Clay'} (${handCard.name})`, multiplyMult: _held.multiplyMult });
          }
        }
      }

      for (const card of cards) {
        // ── Per-card breakdown tracking ──
        const _cb = {
          cardName: card.name ?? card.id,
          meta: `${card.type}, month ${card.month}`,
          basePoints: getCardPoints(card),
          contributions: [],
          totalCardPts: 0,
        };

        // Base points (includes persistent mutations) + Wu Xing enhancement + edition math.
        let cardPts = getCardPoints(card);
        ({ cardPts, mult } = this._applyCardEnhancements(card, cardPts, mult, _cb.contributions));

        // Hexagram onCardScored modifier — applied after editions, before spirits.
        // prevMult is saved so the animation event can show what the hexagram changed.
        const _hexCardPrevMult = mult;
        const _hexCardPrevPts  = cardPts;
        const _hexCardRes = this._applyHexCardScored(card, cardPts, mult);
        cardPts = _hexCardRes.cardPts;
        mult    = _hexCardRes.mult;
        const _hexCardMod = _hexCardRes.mod;
        if (_hexCardMod) {
          const _hexName = run.getHexagram()?.englishName ?? 'hexagram';
          _cb.contributions.push({
            source: `hexagram ${_hexName}`,
            addPoints: _hexCardMod.addPoints ?? 0,
            addMult: _hexCardMod.addMult ?? 0,
            multiplyMult: _hexCardMod.multiplyMult ?? 1,
          });
        }

        points += cardPts;

        if (this._onScoringStep) {
          this._onScoringStep({ type: 'card_points', card, cardPts, points, mult });
        }

        // Emit hexagram animation step AFTER accumulation so `points` is current.
        if (_hexCardMod && this._onScoringStep) {
          const _hex = run.getHexagram();
          this._onScoringStep({
            type: 'hexagram_card',
            hexagramId:   _hex?.id          ?? null,
            hexagramName: _hex?.englishName ?? 'Hexagram',
            card,
            addPoints:    cardPts - _hexCardPrevPts,
            addMult:      mult    - _hexCardPrevMult,
            multiplyMult: _hexCardMod.multiplyMult ?? 1,
            points, mult,
            prevPts:  points - (cardPts - _hexCardPrevPts),
            prevMult: _hexCardPrevMult,
          });
        }

        // Per-card spirit effects + engine state updates.
        // four_spirits_fire_twice: onCardScored fires twice per card.
        const _spiritFireCount = applyHook('shouldSpiritsFireTwice', false, false) ? 2 : 1;
        for (let _sf = 0; _sf < _spiritFireCount; _sf++) {
          for (const spirit of _scoringSpirits) {
            const effect = SpiritEffects.get(spirit.id);
            if (!effect?.onCardScored) continue;
            // Accumulators handle stack scaling internally; non-accumulators use count multiplier.
            const count = ACCUMULATOR_SPIRIT_IDS.has(spirit.id) ? 1 : effectivePower(spirit);
            for (let _yy = 0; _yy < _yinYangTriggers; _yy++) {
              const r = effect.onCardScored({ card, spirit, spirits: _chainSpirits });
              if (r) {
                const prevPts  = points;
                const prevMult = mult;
                if (r.addPoints)    points += r.addPoints    * count;
                if (r.addMult) {
                  mult += r.addMult * count;
                  if (_universeActive) points += r.addMult * count;
                }
                if (r.multiplyMult) {
                  mult *= r.multiplyMult * count;
                  if (_universeActive) points *= r.multiplyMult * count;
                }
                if (this._onScoringStep) {
                  this._onScoringStep({
                    type: 'spirit_effect', card, spirit,
                    addPoints:    (r.addPoints    ?? 0) * count,
                    addMult:      (r.addMult      ?? 0) * count,
                    multiplyMult: r.multiplyMult ? r.multiplyMult * count : 0,
                    points, mult, prevPts, prevMult,
                  });
                }
                _cb.contributions.push({
                  source: `spirit ${spirit.name} (power ${effectivePower(spirit)})`,
                  addPoints: r.addPoints ? r.addPoints * count : 0,
                  addMult: r.addMult ? r.addMult * count : 0,
                  multiplyMult: r.multiplyMult ? r.multiplyMult * count : 1,
                });
              }
            }
          }
        }
        // Engine state (onCardSeen): accumulators fire once per event; others fire per stack.
        for (const spirit of _scoringSpirits) {
          const effect = SpiritEffects.get(spirit.id);
          if (!effect?.onCardSeen) continue;
          const count = ACCUMULATOR_SPIRIT_IDS.has(spirit.id) ? 1 : effectivePower(spirit);
          const prevState = JSON.stringify(spirit.state ?? spirit.elements);
          for (let copy = 0; copy < count * _yinYangTriggers; copy++) {
            effect.onCardSeen({ card, spirit, spirits: _chainSpirits });
          }
          if (this._onScoringStep && JSON.stringify(spirit.state) !== prevState) {
            this._onScoringStep({ type: 'engine_state_update', spirit, card });
          }
        }

        _cb.totalCardPts = cardPts;
        _bd.cards.push(_cb);
      }

      // ── Phase 1.5: Retriggers ──────────────────────────────────────────────
      for (let _ci = 0; _ci < cards.length; _ci++) {
        const card = cards[_ci];
        const retriggerCount = this._computeRetriggerCount(card, 'capture', _ci === 0);
        for (let rt = 0; rt < retriggerCount; rt++) {
          // Shared enhancement/edition math, then hex onCardScored — same order as the first-pass
          // loop (B). F2.10c (D2): a retrigger scores the card the same way the first pass did, so the
          // active season/axis hex multiplier applies per retrigger too. (`mod` discarded: C emits its
          // own `retrigger` step event and no per-contribution breakdown — telemetry unchanged.)
          let cardPts = getCardPoints(card);
          ({ cardPts, mult } = this._applyCardEnhancements(card, cardPts, mult, null));
          ({ cardPts, mult } = this._applyHexCardScored(card, cardPts, mult));
          points += cardPts;

          if (this._onScoringStep) {
            this._onScoringStep({ type: 'retrigger', card, cardPts, points, mult, triggerIndex: rt + 1 });
          }

          for (const spirit of run.allSpirits) {
            const effect = SpiritEffects.get(spirit.id);
            if (!effect?.onCardScored) continue;
            const count = ACCUMULATOR_SPIRIT_IDS.has(spirit.id) ? 1 : effectivePower(spirit);
            const r = effect.onCardScored({ card, spirit, spirits: _chainSpirits });
            if (r) {
              const prevPts  = points;
              const prevMult = mult;
              if (r.addPoints)    points += r.addPoints    * count;
              if (r.addMult)      mult   += r.addMult      * count;
              if (r.multiplyMult) mult   *= r.multiplyMult * count;
              if (this._onScoringStep) {
                this._onScoringStep({
                  type: 'spirit_effect', card, spirit,
                  addPoints:    (r.addPoints    ?? 0) * count,
                  addMult:      (r.addMult      ?? 0) * count,
                  multiplyMult: r.multiplyMult ? r.multiplyMult * count : 0,
                  points, mult, prevPts, prevMult,
                });
              }
            }
          }
        }
      }

      // engine_missing_number counter (4-stack capture) — fired BEFORE Phase 2 so the
      // triggering capture's own count is visible to its applyEngine this same capture.
      // The cards.length===4 guard lives in the hook body. (F4.20 counter wave.)
      this._fireStackCapturedHooks(cards);

      // ── Phase 2: Apply engine spirits in slot order ────────────────────────
      const allEngineSpirits = run.allSpirits;
      for (const spirit of allEngineSpirits) {
        const effect = SpiritEffects.get(spirit.id);
        if (!effect?.applyEngine) continue;
        for (let _yy = 0; _yy < _yinYangTriggers; _yy++) {
          const r = effect.applyEngine({ spirit, mult, points, spirits: _chainSpirits, cards });
          if (r) {
            const prevPts  = points;
            const prevMult = mult;
            if (r.addPoints)    points += r.addPoints;
            if (r.addMult) {
              mult += r.addMult;
              if (_universeActive) points += r.addMult;
            }
            if (r.multiplyMult) {
              mult *= r.multiplyMult;
              if (_universeActive) points *= r.multiplyMult;
            }
            if (this._onScoringStep) {
              this._onScoringStep({
                type: 'engine_effect', spirit,
                addPoints: r.addPoints ?? 0, addMult: r.addMult ?? 0, multiplyMult: r.multiplyMult ?? 0,
                points, mult, prevPts, prevMult,
              });
            }
            _bd.engines.push({
              source: `${spirit.name} (stack ${effectivePower(spirit)})`,
              addPoints: r.addPoints ?? 0,
              addMult: r.addMult ?? 0,
              multiplyMult: r.multiplyMult ?? 1,
            });
          }
        }
      }

      // capstone_nature: save cumulative points for next capture.
      if (_natureActive) this._cumulativePoints = points;

      const flow = run.flow;
      const _hexCompute = getActiveEffect();
      const captureScore = this._computeCaptureScore(_hexCompute, points, mult, flow);
      this._runningScore += captureScore;

      // ── Emit granular scoring log ──
      logger.logCaptureScoring({
        captureNumber: _captureNum,
        turn: this._turn,
        phase: this._phase,
        cardBreakdowns: _bd.cards,
        captureLevel: { heldEffects: _bd.heldEffects, engineSpirits: _bd.engines },
        totalPoints: points,
        totalMult: mult,
        flow,
        captureScore,
        runningRoundTotal: this._runningScore,
        customFormula: _hexCompute?.computeFinalScore ? (run.getHexagram()?.effect ?? null) : null,
      });

      if (this._onScoringStep) {
        this._onScoringStep({
          type: 'capture_complete', points, mult, flow, captureScore,
          runningTotal: this._runningScore,
        });
      }

      this._scoringEvents.push({
        type: 'capture', cards, capturePoints: points, mult, flow,
        captureScore, runningTotal: this._runningScore,
      });

      // ── Post-capture spirit effects (return-intent hooks) ──────────────────
      // F4.20-FIX2: iterate allSpirits so transcended (Negative) copies fire too
      // (Glory's draw is a chain effect, not a slot effect) — see SPIRIT_SET_ITERATION_RULE.md.
      for (const spirit of run.allSpirits) {
        const effect = SpiritEffects.get(spirit.id);
        if (!effect?.onCaptureComplete) continue;
        const intent = effect.onCaptureComplete({ cards, spirit, run });
        if (!intent) continue;
        if (intent.draw > 0) {
          const { drawn } = this._drawIntoHand(intent.draw);
          if (drawn.length > 0) {
            this._scoringEvents.push({ type: 'glory_draw', count: drawn.length });
          }
        }
      }

      // Stamp captured-trigger effects (Option C shuffle).
      for (let _si = 0; _si < cards.length; _si++) {
        const card = cards[_si];
        if (!card.ribbonStamp) continue;
        const stamp = card.ribbonStamp;
        const fireKi    = stamp === 'stamp_yellow';
        const fireDraw  = stamp === 'stamp_orange';
        const fireCons  = stamp === 'stamp_green' || stamp === 'stamp_black' || stamp === 'stamp_gray';
        if (!fireKi && !fireDraw && !fireCons) continue;
        const fireCount = 1 + this._computeRetriggerCount(card, 'capture', _si === 0);
        for (let rt = 0; rt < fireCount; rt++) {
          if (fireKi) run.addKi(3, `${stamp}_capture`);
          if (fireDraw) this._drawIntoHand(1);
          if (fireCons) run.generateRandomConsumable();
        }
      }
    }

    run.onCardsCaptured(cards);


    // sym_caterpillar: eat leaf-enhanced cards (Wood element).
    // F4.20-FIX2: iterate allSpirits so a transcended caterpillar eats/metamorphoses too —
    // see SPIRIT_SET_ITERATION_RULE.md.
    for (const spirit of run.allSpirits) {
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
                const copy = JSON.parse(JSON.stringify(target));
                copy.name += ' (Moth)';
                copy.metamorphosed = true;
                run.replaceSpiritObj(spirit, copy);
              }
            }
          }
        }
      }
    }

    // util_symbiosis: capturing an animal summons its corresponding symbiont
    // at a stack count equal to Symbiosis's stack count. Excess stacks
    // (over 3) cascade into Negative copies via addSymbiontSpirit.
    const symbiosisStacks = run.countStackedById('util_symbiosis');
    if (symbiosisStacks > 0) {
      for (const card of cards) {
        if (card.type !== 'animal') continue;
        const symbiontId = ANIMAL_SYMBIONT_MAP[card.id];
        if (!symbiontId) continue;
        const symDef = getSpiritDef(symbiontId);
        if (!symDef) continue;
        // Increment pre-existing Algae elements BEFORE the summon fires, so
        // the witnessing event is captured into aggregation if transcendence
        // fires inside addSymbiontSpirit. Only pre-summon elements are bumped.
        const algaeSnap = run.allSpirits
          .filter(s => s.id === 'sym_algae')
          .map(s => ({ spirit: s, preCount: s.elements?.length ?? 0 }));
        for (const snap of algaeSnap) {
          if (snap.spirit.isNegative) {
            incrementPerElement(snap.spirit, 'summonCount', symbiosisStacks);
          } else if (snap.spirit.elements) {
            for (let i = 0; i < snap.preCount; i++) {
              snap.spirit.elements[i].summonCount =
                (snap.spirit.elements[i].summonCount ?? 0) + symbiosisStacks;
            }
          }
        }
        const result = run.addSymbiontSpirit(symDef, symbiosisStacks);
        // Roll back pre-increment if summon failed (slots full + no negatives).
        if (!result.success || result.result === 'failed') {
          for (const snap of algaeSnap) {
            if (!run.allSpirits.includes(snap.spirit)) continue;
            if (snap.spirit.isNegative && snap.spirit.state) {
              snap.spirit.state.newEvents = Math.max(0, (snap.spirit.state.newEvents ?? 0) - symbiosisStacks);
            } else if (snap.spirit.elements) {
              for (let i = 0; i < snap.preCount; i++) {
                if (snap.spirit.elements[i]) {
                  snap.spirit.elements[i].summonCount =
                    Math.max(0, (snap.spirit.elements[i].summonCount ?? 0) - symbiosisStacks);
                }
              }
            }
          }
        }
      }
    }

    // Goat consumable: +1 ki per card captured.
    if (this._goatActive) run.addKi(cards.length, 'goat_capture');

    logger.logCapture(cards, 'capture');

    // Check for newly triggered style combos against the full capture pile.
    const newCombos = this._style.checkCombos(this._capture.getAll());
    if (newCombos.length > 0) {
      this._onStyleCombos(newCombos);
    }

    // Hexagram onCaptureComplete hook (e.g. no_hand_ki_plus_capture: +3 ki per capture).
    this._fireHexOnCaptureComplete(cards);
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
      run.onStyleCombo(combo.id, combo.bonus); // adds to flow only the first time per run
    }
    this._lastStyleCombos = combos;
    logger.logStyleCombos(combos);
    // Per-combo ki bonus chained through spirits in slot order.
    const allSpirits = run.allSpirits;
    for (const combo of combos) {
      let ki = 1; // base style ki per combo
      ki = applyHook('modifyStyleKi', ki, ki); // hexagram hook (style_ki_double / style_flow_double)
      for (const spirit of allSpirits) {
        const effect = SpiritEffects.get(spirit.id);
        if (effect?.applyKiBonus) {
          ki = effect.applyKiBonus({ ki, spirit });
        }
      }
      const finalKi = Math.round(ki);
      if (finalKi > 0) run.addKi(finalKi, `style combo: ${combo.name}`);
    }
  }

  /**
   * Returns true if any card in the array is Silk-enhanced (upgraded Wood).
   * Used to detect anti-stranding eligibility.
   * @param {object[]} cards
   * @returns {boolean}
   */
  _strandHasSilk(cards) {
    return cards.some(c =>
      c.enhancement?.element === 'wood' && c.enhancement?.tier === 'upgraded'
    );
  }

  /**
   * Draw and apply the top card of the deck (the automatic deck-flip phase).
   * Resolves the pending match (if any) based on whether the deck card shares
   * its month with the pending slot.  If the deck is empty the flip is skipped.
   *
   * @returns {{ status: string, … }}
   */
  _doDeckPhase() {
    this._inDeckPhase = true;
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

    // sym_osprey: first N deck flips go to hand instead of field (N = total stacks).
    const ospreySpirits = run.allSpirits.filter(s => s.id === 'sym_osprey');
    const ospreyMax = run.countStackedById('sym_osprey');
    if (ospreyMax > 0) {
      const used = ospreySpirits[0]?.state?.flipsUsedThisRound ?? 0;
      // Respect the hand cap (F4-HANDCAP-E1c): at a full hand the flip is NOT pulled to hand —
      // it falls through to normal field placement below (nothing lost). Was gated on the
      // vestigial _handSizeCap (?? 99, never assigned → effectively no cap), which leaked the
      // flip via add()'s silent clamp when full.
      if (used < ospreyMax && this._hand.availableSlots > 0) {
        for (const os of ospreySpirits) {
          if (os.state) os.state.flipsUsedThisRound = used + 1;
        }
        this._hand.add([deckCard]);
        logger.logDeckFlip(deckCard, 'osprey_to_hand', [deckCard]);
        // Resolve any pending match without the deck card.
        const pending0 = this._field.getPendingSlot();
        if (pending0) {
          const captured = this._field.capturePendingMatch();
          if (captured.length > 0) this._addCapture(captured);
        }
        // Fix E fallback: 2 hand cards played to empty slot form a 'normal' slot
        // that should self-capture regardless of the intercepted card's month.
        if (this._lastHandPlayToEmptySlot?.cards.length === 2) {
          const handCards = this._lastHandPlayToEmptySlot.cards;
          for (const hc of handCards) this._field.removeCardById(hc.id);
          this._addCapture(handCards);
        }
        return this._finalizeTurn();
      }
    }

    // Track the deck flip outcome for logging.
    let _flipResult   = 'field_place';
    let _flipCaptures = [];

    const pending = this._field.getPendingSlot();

    if (pending) {
      if (this._field.matchesSlot(deckCard, pending)) {
        // Deck card is the same month as the pending match.
        // Silk (Wood upgraded) anti-stranding: if ANY card involved is Silk,
        // force a capture instead of stranding.
        const wouldStrand = pending.cards.length + 1 < this._field.autoCaptureThreshold;
        const hasSilk = wouldStrand && this._strandHasSilk([...pending.cards, deckCard]);
        if (hasSilk) {
          // Push deck card into the pending slot then capture immediately.
          pending.cards.push(deckCard);
          const captured = this._field.capturePendingMatch();
          if (captured.length > 0) {
            this._addCapture(captured);
            _flipResult   = 'silk_capture';
            _flipCaptures = captured;
            this._fireSilkAntiStrandHooks();
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
            // sym_ducks: -1 multValue on strand (floor at 0).
            // F4.20-FIX2: iterate allSpirits so a transcended ducks moves too — see SPIRIT_SET_ITERATION_RULE.md.
            for (const spirit of run.allSpirits) {
              if (spirit.id === 'sym_ducks' && spirit.state) {
                spirit.state.multValue = Math.max(0, (spirit.state.multValue ?? 0) - 1);
              }
            }
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
        //   Silk anti-stranding: if any card in the 3-stack is Silk, bank instead.
        if (pending.cards.length === 3) {
          if (this._strandHasSilk(pending.cards)) {
            const captured = this._field.capturePendingMatch();
            if (captured.length > 0) {
              this._addCapture(captured);
              _flipCaptures = [..._flipCaptures, ...captured];
              this._fireSilkAntiStrandHooks();
            }
          } else {
            this._field.strandPendingMatch();
          }
        } else {
          // 2 or 4 cards: the match is complete — capture immediately.
          const pendingCards = this._field.capturePendingMatch();
          this._addCapture(pendingCards);
          _flipCaptures = pendingCards;
        }

        // Deck card goes to the field normally (stack or new slot).
        const flipResult = this._addFlippedCardToField(deckCard);
        if (flipResult.captured) {
          this._addCapture(flipResult.captured);
          _flipResult   = 'capture';
          _flipCaptures = [..._flipCaptures, ...flipResult.captured];
        } else if (flipResult.discarded) {
          _flipResult = this._discardCard(deckCard, flipResult.discardSource ?? 'deck_overflow');
        }
      }
    } else {
      // No pending match — deck card goes to the field.
      // Fix D: 1 hand card played to empty slot + flip is same month → capture pair.
      if (this._lastHandPlayToEmptySlot?.cards.length === 1 &&
          this._field.cardsMatch(deckCard, this._lastHandPlayToEmptySlot.cards[0])) {
        const handCard = this._lastHandPlayToEmptySlot.cards[0];
        this._field.removeCardById(handCard.id);
        this._addCapture([handCard, deckCard]);
        // sym_ducks: +1 multValue when a deck-flip matches a single played card.
        // F4.20-FIX2: iterate allSpirits so a transcended ducks moves too — see SPIRIT_SET_ITERATION_RULE.md.
        for (const spirit of run.allSpirits) {
          if (spirit.id === 'sym_ducks' && spirit.state) {
            spirit.state.multValue = (spirit.state.multValue ?? 0) + 1;
          }
        }
        _flipResult   = 'capture';
        _flipCaptures = [handCard, deckCard];
      // Fix E: 2 hand cards played to empty slot + flip is different month → capture the pair.
      } else if (this._lastHandPlayToEmptySlot?.cards.length === 2 &&
                 !this._field.cardsMatch(deckCard, this._lastHandPlayToEmptySlot.cards[0])) {
        const handCards = this._lastHandPlayToEmptySlot.cards;
        for (const hc of handCards) this._field.removeCardById(hc.id);
        this._addCapture(handCards);
        _flipCaptures = [...handCards];
        // Still place the flip card on the field normally.
        const flipResult = this._addFlippedCardToField(deckCard);
        if (flipResult.captured) {
          this._addCapture(flipResult.captured);
          _flipResult   = 'capture';
          _flipCaptures = [..._flipCaptures, ...flipResult.captured];
        } else if (flipResult.discarded) {
          _flipResult = this._discardCard(deckCard, flipResult.discardSource ?? 'deck_overflow');
        } else {
          _flipResult = 'capture'; // hand pair captured even if flip just placed
        }
      } else {
        // Standard: deck card simply goes to the field.
        const flipResult = this._addFlippedCardToField(deckCard);
        if (flipResult.captured) {
          this._addCapture(flipResult.captured);
          _flipResult   = 'capture';
          _flipCaptures = flipResult.captured;
        } else if (flipResult.discarded) {
          _flipResult = this._discardCard(deckCard, flipResult.discardSource ?? 'deck_overflow');
        }
      }
    }

    logger.logDeckFlip(deckCard, _flipResult, _flipCaptures);

    // field_plus_two_double_flip: flip a second deck card this turn.
    if (!this._deck.isEmpty() && applyHook('modifyDeckFlipsPerTurn', 1, 1) >= 2) {
      const deckCard2     = this._deck.draw(1)[0];
      const flipResult2   = this._addFlippedCardToField(deckCard2);
      let _flip2Result    = 'field_place';
      let _flip2Captures  = [];
      if (flipResult2.captured) {
        this._addCapture(flipResult2.captured);
        _flip2Result   = 'capture';
        _flip2Captures = flipResult2.captured;
      } else if (flipResult2.discarded) {
        _flip2Result = this._discardCard(deckCard2, flipResult2.discardSource ?? 'deck_overflow');
      }
      logger.logDeckFlip(deckCard2, _flip2Result, _flip2Captures);
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
    this._inDeckPhase = false;
    this._turn++;
    this._playsThisTurn = 0;
    this._capture.recordTurn();

    const _yakuThresholds = this._getCaptureThresholds();
    const yakuForDiff = this._scoring.evaluate(this._capture.getAll(), _yakuThresholds);

    {
      // Diff against unspent cards only — spent cards must not re-trigger yaku.
      const unspentForDiff = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
      const yakuFromUnspent = this._scoring.evaluate(unspentForDiff, this._getCaptureThresholds());

      const newYaku = yakuFromUnspent.filter(y => !this._yakuBeforeTurn.has(y.name));
      const _disablesYaku = applyHook('disablesYaku', false);
      if (_disablesYaku) newYaku.length = 0;
      this._yakuBeforeTurn = new Set(yakuFromUnspent.map(y => y.name));
      logger.logYakuState(yakuFromUnspent, newYaku);
      for (const y of newYaku) {
        logger.logYakuAchieved(y.name, y.count, y.threshold);
      }

      const pushSucceeded = this._pushPenaltyActive && newYaku.length > 0;
      if (pushSucceeded) {
        this._pushPenaltyActive = false;
        run.onPushSuccess(this);  // increments _pushDepth + fires hexagram onPushSuccess
        // Bucket-T (F4.20): engine_northern_lion's pushesWitnessed is a shop-utility counter (drives
        // free rerolls), out of accumulator scope — intentionally in place, not seepage. See F4.16_F4.20_triage_ledger.md.
        for (const spirit of run.activeSpirits) {
          if (spirit.id === 'engine_northern_lion') {
            incrementPerElement(spirit, 'pushesWitnessed', 1);
          }
        }
        // Spirit-side push-success hooks (econ_reward). F4.20: replaces the inline
        // econ_reward block that was gated on `newYaku>0 && _pushCount>0`. That gate is
        // EQUIVALENT to `pushSucceeded` here (no behavior change), because:
        //   • _pushPenaltyActive is set ONLY by pushOn() (which also bumps _pushCount) and
        //     cleared on every yaku-completion → _pushPenaltyActive ⟹ _pushCount>0 always.
        //   • The divergent state (_pushPenaltyActive=false ∧ _pushCount>0 ∧ newYaku>0)
        //     needs a yaku reached after a prior push cleared, WITHOUT a new push — i.e.
        //     continuePlay(). The Continue button is offered ONLY when yaku is disabled
        //     (GameScene), and yaku-disabled forces newYaku.length=0 above. So whenever
        //     newYaku>0, continue-without-push is unreachable; after a yaku the player can
        //     only Bank (round ends) or Push. Tiger only triggers on newYaku===0.
        //   ⇒ at newYaku>0, _pushPenaltyActive ⟺ _pushCount>0. Fired here, ordering after
        //     run.onPushSuccess preserves econ_reward seeing post-hexagram ki.
        this._fireSpiritHook('onPushSuccess');
      } else if (newYaku.length > 0) {
        this._pushPenaltyActive = false;
      }

      // engine_bullseye: track yaku rank triggers, fire when all 4 ranks covered.
      for (const yaku of newYaku) {
        const rank = YAKU_RANK[yaku.name];
        if (rank) this._bullseyeInventory[rank]++;
      }
      while (BULLSEYE_RANKS.every(r => this._bullseyeInventory[r] >= 1)) {
        // F4.20-FIX: iterate allSpirits so transcended (Negative) copies accrue too.
        for (const spirit of run.allSpirits) {
          if (spirit.id === 'engine_bullseye') {
            incrementPerElement(spirit, 'qualifiedCount', 1);
          }
        }
        for (const r of BULLSEYE_RANKS) this._bullseyeInventory[r]--;
      }

      // Spend the minimum qualifying cards for each newly triggered yaku so they
      // disappear from the capture fan and appear in the banked pile.
      if (newYaku.length > 0) {
        const unspent = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
        for (const yaku of newYaku) {
          const yakuCards = this._selectAdditiveYakuCards(yaku.name, unspent);
          for (const card of yakuCards) {
            this._spentCardIds.add(card.id);
            // Stamp yaku-trigger effects (Option C shuffle).
            if (card.ribbonStamp) {
              const stamp = card.ribbonStamp;
              const fireDraw = stamp === 'stamp_red';
              const fireKi   = stamp === 'stamp_orange' || stamp === 'stamp_black' || stamp === 'stamp_gray';
              const fireCons = stamp === 'stamp_purple';
              if (fireDraw || fireKi || fireCons) {
                const fireCount = 1 + this._computeRetriggerCount(card, 'yaku');
                for (let rt = 0; rt < fireCount; rt++) {
                  if (fireDraw) this._drawIntoHand(1);
                  if (fireKi) run.addKi(3, `${stamp}_yaku`);
                  if (fireCons) run.generateRandomConsumable();
                }
              }
            }
          }
        }
        // Update snapshot to post-spend state so same yaku can't re-trigger next turn.
        const unspentAfterSpend = this._capture.getAll().filter(c => !this._spentCardIds.has(c.id));
        this._yakuBeforeTurn = new Set(
          this._scoring.evaluate(unspentAfterSpend, this._getCaptureThresholds())
            .map(y => y.name)
        );
      }

      // Round ends when hand is empty (no play counter in capture mode).
      const roundOver = this._hand.isEmpty();
      const penaltyApplied = roundOver && this._pushPenaltyActive && !this._dogProtection;

      const _forceAutoBank = !_disablesYaku && newYaku.length > 0 && applyHook('forceAutoBankOnYaku', false);
      const tigerTriggered = this._tigerPushActive && newYaku.length === 0;
      if (tigerTriggered) this._tigerPushActive = false; // consume one-shot flag

      if ((newYaku.length > 0 && !_forceAutoBank) || tigerTriggered) {
        this._roundEndingAfterDecision = roundOver;
        this._phase = "yaku_decision";
      } else if (roundOver || _forceAutoBank) {
        const trigger = (_forceAutoBank && !roundOver) ? 'forced_auto_bank' : 'natural';
        return this._endRound(trigger, { penaltyApplied, newYaku, allYaku: yakuForDiff,
          yakuDisabled: !!_disablesYaku, tigerPush: false });
      } else if (_disablesYaku) {
        // Yaku disabled — offer free bank/continue each turn
        this._phase = "yaku_decision";
      } else {
        this._phase = "idle";
      }

      const status = (newYaku.length > 0 || tigerTriggered) ? "yaku_decision"
                   : _disablesYaku ? "yaku_decision" : "ok";

      // Refresh deck flip preview for next turn.
      if (status === 'ok' || status === 'yaku_decision') this._peekNextDeckFlip();

      return {
        status,
        newYaku,
        yakuDisabled:     !!_disablesYaku,
        tigerPush:        !!tigerTriggered,
        nextDeckFlip:     this._nextDeckFlip,
        captureEvents:    [...this._scoringEvents],
        runningScore:     this._runningScore,
        allYaku:          yakuForDiff,
        basePoints:       this._runningScore,
        finalScore:       this._runningScore,
        flow:             run.flow,
        pushFactor:       1.0,
        penaltyApplied,
        pushCount:        this._pushCount,
        pushDepth:        this._pushDepth,
        pigDoubleKi:      this._pigDoubleKi,
        turn:             this._turn,
        deckCard:         this._lastDeckCard,
        discarded:        [...this._discardedThisTurn],
        roundDiscardCount: this._discardCount,
        cardsInHand:      this._hand.getAll().length,
        styleCombos:      this._style.getTriggeredCombos().length,
        earthKiBonus:     this._computeEarthKiBonus(),
      };
    }
  }
}
