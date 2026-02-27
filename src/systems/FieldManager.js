// ─────────────────────────────────────────────────────────────────────────────
// FieldManager — slot-based field (river/table) for Koi-Koi
//
// The field has MAX_SLOTS (8) fixed positions.  Each position is either:
//   • null                    — empty (captured or not yet filled)
//   • { month, cards, state } — an occupied slot
//
// Positions are stable: captured slots become null rather than being removed,
// so every other slot keeps its visual grid index for the rest of the round.
// New cards always fill the first null position (lowest index).
//
// Slot structure:
//   { month: number, cards: Card[], state: 'normal' | 'pending' }
//
// Deal phase  — dealCard() stacks same-month cards up to DEAL_STACK_CAP (3).
//               A 4th same-month deal card starts a new slot.
//
// Hand phase  — playHandCard() merges the played card with any matching field
//               slots into the first matching slot (in-place, index preserved).
//               If no match, the card fills the first null/empty position.
//
// Deck phase  — addFlippedCard() pushes the flipped card into a matching
//               *normal* slot (never into the pending slot), or fills the first
//               empty position.  addToPendingMatch() is used instead when the
//               flipped card shares the pending month.
//
// Auto-capture — any method that would push a slot to 4 cards nulls out that
//               position immediately and returns the 4 cards as `captured`.
// ─────────────────────────────────────────────────────────────────────────────

export default class FieldManager {
  // The deal can produce up to 8 distinct-month slots (8 cards, all different
  // months), so MAX_SLOTS = 8 guarantees no deal card is ever discarded.
  static MAX_SLOTS      = 8;
  static DEAL_STACK_CAP = 3;

  constructor() {
    /**
     * Up to MAX_SLOTS entries.  null = empty position.
     * @type {Array<{month:number, cards:object[], state:'normal'|'pending'}|null>}
     */
    this._slots = [];
  }

  // ── Read-only accessors ────────────────────────────────────────────────────

  /** Number of occupied (non-null) field positions. */
  get slotCount() { return this._slots.filter(Boolean).length; }

  /** True when there is no empty position available for a new slot. */
  get isFull()    { return this._firstEmptyIndex() === -1; }

  /** True when every position is empty (or the array is empty). */
  isEmpty()       { return this._slots.every(s => s === null); }

  // ── Slot access ────────────────────────────────────────────────────────────

  /**
   * Shallow copy of the fixed-position array.  Entries may be null for empty
   * positions.  Callers (renderers) must guard against null entries.
   * @returns {Array<{month, cards, state}|null>}
   */
  getSlots() { return [...this._slots]; }

  /**
   * The first occupied slot for a given month, or null.
   * @param {number} month
   * @returns {{month, cards, state}|null}
   */
  getSlotForMonth(month) {
    return this._slots.find(s => s && s.month === month) ?? null;
  }

  /**
   * All occupied slots for a given month (normally 0 or 1; at most 2 if the
   * deal produced a 3-cap overflow).
   * @param {number} month
   * @returns {Array<{month, cards, state}>}
   */
  getSlotsForMonth(month) {
    return this._slots.filter(s => s && s.month === month);
  }

  /**
   * The current pending-match slot, or null if none exists.
   * @returns {{month, cards, state}|null}
   */
  getPendingSlot() {
    return this._slots.find(s => s && s.state === 'pending') ?? null;
  }

  /** True if there is an active pending-match slot. */
  hasPendingMatch() {
    return this._slots.some(s => s && s.state === 'pending');
  }

  /**
   * Flat list of every card across all occupied slots.
   * @returns {object[]}
   */
  getAll() {
    return this._slots.flatMap(s => s ? s.cards : []);
  }

  // ── Deal phase ─────────────────────────────────────────────────────────────

  /**
   * Add a card during the initial deal.
   *
   * Stacking rules:
   *   - Same-month cards stack up to DEAL_STACK_CAP (3).
   *   - A 4th same-month deal card starts a new slot.
   *   - If the field is already at MAX_SLOTS the card is silently discarded.
   *
   * @param {object} card
   * @returns {this}
   */
  dealCard(card) {
    const existing = this._slots.find(
      s => s && s.month === card.month && s.cards.length < FieldManager.DEAL_STACK_CAP
    );
    if (existing) {
      existing.cards.push(card);
      return this;
    }
    // No slot limit during the deal — all dealt cards must land on the field.
    this._slots.push({ month: card.month, cards: [card], state: 'normal' });
    return this;
  }

  // ── Hand-card phase ────────────────────────────────────────────────────────

  /**
   * Play a card from the player's hand onto the field.
   *
   * Match found: all same-month field slots are merged together with the hand
   * card into the first matching slot, mutated in-place (index unchanged).
   * If the merged total reaches 4 cards, all four are auto-captured and the
   * position becomes null (empty gap).
   *
   * No match: the card fills the first empty (null) position, or is discarded
   * if the field is full.
   *
   * @param {object} card
   * @returns {{ matched: boolean, discarded: boolean, captured: null }}
   *   matched   — true when a pending slot was formed (1–4 cards merged)
   *   discarded — true when no match and the field was full (card lost)
   *   captured  — always null; 4-card stacks stay pending until the deck phase
   */
  playHandCard(card) {
    const matchingSlots = this.getSlotsForMonth(card.month);

    if (matchingSlots.length === 0) {
      const idx = this._firstEmptyIndex();
      if (idx === -1) {
        return { matched: false, discarded: true, captured: null };
      }
      this._placeAt(idx, { month: card.month, cards: [card], state: 'normal' });
      return { matched: false, discarded: false, captured: null };
    }

    // Merge all same-month slots + hand card into the FIRST matching slot,
    // mutating it in-place so its grid index never changes.
    const target        = matchingSlots[0];
    const allFieldCards = matchingSlots.flatMap(s => s.cards);

    // If the deal produced a second same-month slot (3-cap overflow edge case),
    // null it out so its grid position becomes an empty gap.
    for (let i = 1; i < matchingSlots.length; i++) {
      this._nullify(matchingSlots[i]);
    }

    target.cards = [...allFieldCards, card];
    target.state = 'pending';

    // Even if the stack now holds all 4 cards of the month, do NOT capture
    // here.  Leave it as a pending slot so the cards remain visible on the
    // field during the hand-phase pause and the deck-flip animation.  The
    // capture is resolved in the deck phase (_doDeckPhase / capturePendingMatch).
    return { matched: true, discarded: false, captured: null };
  }

  // ── Hand-card phase (multi-card) ───────────────────────────────────────────

  /**
   * Play one or more same-month cards from the player's hand onto the field.
   * All cards must share the same month.
   *
   * Outcome after merging into the target slot:
   *   • total >= 4              → immediate capture (full month set assembled)
   *   • fieldCount > 0
   *     && played === 1
   *     && total === 2          → slot marked 'pending'; capture deferred to the
   *                               deck-flip phase (standard 1-for-1 match)
   *   • total === 3             → leave as normal 3-stack (waiting for 4th)
   *   • played > 1, total === 2 → leave as normal stack (placement, not match)
   *
   * No match: all played cards fill the first empty position as a new stack,
   * or are discarded if the field is full.
   *
   * @param {object[]} cards  One or more cards sharing the same month.
   * @returns {{ matched: boolean, discarded: boolean, captured: object[]|null }}
   */
  playHandCards(cards) {
    const month         = cards[0].month;
    const matchingSlots = this.getSlotsForMonth(month);

    if (matchingSlots.length === 0) {
      const idx = this._firstEmptyIndex();
      if (idx === -1) {
        return { matched: false, discarded: true, captured: null };
      }
      this._placeAt(idx, { month, cards: [...cards], state: 'normal' });
      return { matched: false, discarded: false, captured: null };
    }

    // Merge all same-month field slots into the first, then add played cards.
    const target         = matchingSlots[0];
    const allFieldCards  = matchingSlots.flatMap(s => s.cards);
    const fieldCardCount = allFieldCards.length;

    // Null out any overflow slots (3-cap edge case from the deal).
    for (let i = 1; i < matchingSlots.length; i++) {
      this._nullify(matchingSlots[i]);
    }

    target.cards = [...allFieldCards, ...cards];
    const total  = target.cards.length;

    if (total >= 4) {
      // Full month set assembled — mark pending so the cards remain visible
      // on the field through the hand-phase pause and deck-flip animation.
      // Capture is deferred to the deck phase (capturePendingMatch).
      target.state = 'pending';
      return { matched: true, discarded: false, captured: null };
    }

    if (fieldCardCount > 0 && cards.length === 1 && total === 2) {
      // Standard 1-for-1 match — mark pending so the deck-flip phase can
      // resolve it: either capture the pair or grow to a 3-stack.
      target.state = 'pending';
      return { matched: true, discarded: false, captured: null };
    }

    // total === 3, or multi-card placement — leave as normal stack.
    return { matched: true, discarded: false, captured: null };
  }

  // ── Deck-flip phase ────────────────────────────────────────────────────────

  /**
   * Add a card flipped from the deck to the field.
   *
   * The card joins a matching *normal* (non-pending) slot if one exists.
   * Otherwise it fills the first empty position (or is discarded if the field
   * is full).  Triggers a 4-card auto-capture when the stack reaches 4 cards;
   * the position becomes null.
   *
   * @param {object} card
   * @returns {{ discarded: boolean, captured: object[]|null }}
   */
  addFlippedCard(card) {
    const slot = this._slots.find(
      s => s && s.month === card.month && s.state === 'normal'
    );
    if (slot) {
      slot.cards.push(card);
      const len = slot.cards.length;
      // Only capture when the full 4-card set is assembled.
      // Pairs and 3-stacks accumulate on the field until the 4th card arrives.
      if (len >= 4) {
        const captured = [...slot.cards];
        this._nullify(slot);
        return { discarded: false, captured };
      }
      return { discarded: false, captured: null };
    }

    const idx = this._firstEmptyIndex();
    if (idx === -1) {
      return { discarded: true, captured: null };
    }
    this._placeAt(idx, { month: card.month, cards: [card], state: 'normal' });
    return { discarded: false, captured: null };
  }

  /**
   * Add the deck-flip card to the pending-match slot (called when the flipped
   * card shares the same month as the pending match).
   *
   * If adding the card completes a set of 4, the position is nulled out and the
   * cards are returned as `captured`.  Otherwise the slot is *stranded* — its
   * state reverts to 'normal' so it stays on the field until the 4th card
   * arrives via a future hand play or deck flip.
   *
   * @param {object} card
   * @returns {{ captured: object[]|null }}
   * @throws {Error} if no pending match exists
   */
  addToPendingMatch(card) {
    const slot = this.getPendingSlot();
    if (!slot) throw new Error('addToPendingMatch: no pending match on the field');
    slot.cards.push(card);
    if (slot.cards.length === 4) {
      const captured = [...slot.cards];
      this._nullify(slot);
      return { captured };
    }
    // Strand: revert to normal — pending state only lives within one turn.
    slot.state = 'normal';
    return { captured: null };
  }

  // ── Pending-match resolution ───────────────────────────────────────────────

  /**
   * Null out the pending-match slot and return its cards for capture.
   * Returns [] if no pending match exists.
   * @returns {object[]}
   */
  capturePendingMatch() {
    const slot = this.getPendingSlot();
    if (!slot) return [];
    const captured = [...slot.cards];
    this._nullify(slot);
    return captured;
  }

  /**
   * Revert the pending-match slot to 'normal' without capturing (strand it).
   * No-op if no pending match exists.
   */
  strandPendingMatch() {
    const slot = this.getPendingSlot();
    if (slot) slot.state = 'normal';
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  /**
   * Clear all positions.
   * @returns {this}
   */
  clear() {
    this._slots = [];
    return this;
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────

  /** Plain-object snapshot for serialisation / debug logging. */
  toSnapshot() {
    return {
      slots: this._slots.map(s => s ? ({
        month: s.month,
        state: s.state,
        cards: [...s.cards],
      }) : null),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Index at which a new slot should be placed:
   *   - First null entry in the existing array (recycled gap), or
   *   - Current length if the array can still grow (< MAX_SLOTS), or
   *   - -1 if the field is truly full.
   * @returns {number}
   */
  _firstEmptyIndex() {
    const i = this._slots.indexOf(null);
    if (i !== -1) return i;
    if (this._slots.length < FieldManager.MAX_SLOTS) return this._slots.length;
    return -1;
  }

  /**
   * Place a slot object at the given index.
   * Pushes when idx === length (growing the array), assigns otherwise.
   * @param {number} idx
   * @param {{month, cards, state}} slot
   */
  _placeAt(idx, slot) {
    if (idx === this._slots.length) this._slots.push(slot);
    else                            this._slots[idx] = slot;
  }

  /**
   * Replace a slot with null (empty gap) by reference.
   * @param {{month, cards, state}} slot
   */
  _nullify(slot) {
    const i = this._slots.indexOf(slot);
    if (i !== -1) this._slots[i] = null;
  }
}
