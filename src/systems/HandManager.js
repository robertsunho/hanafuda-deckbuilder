// ─────────────────────────────────────────────────────────────────────────────
// HandManager — tracks the player's current hand of cards
//
// Responsibilities:
//   • Hold the live set of cards in hand
//   • Manage a selection set for UI interactions (pick to play, etc.)
//   • Enforce an optional hand-size limit
//   • Provide filtered views (by type, month, tag, selection state)
//
// Cards are stored by id in a Map so all lookups are O(1). Ordered insertion
// is preserved — the iteration order of a Map matches insertion order, which
// keeps cards visually stable as they are added and removed.
//
// Usage:
//   const hand = new HandManager({ maxSize: 8 });
//   hand.add(deck.draw(8));
//   hand.select("january_crane");
//   const played = hand.removeSelected();   // returns selected cards & clears them
// ─────────────────────────────────────────────────────────────────────────────

export default class HandManager {

  /**
   * @param {object} [options]
   * @param {number} [options.maxSize=Infinity]  Maximum cards allowed in hand.
   *   Attempting to add cards beyond this limit throws a RangeError.
   *   Pass Infinity (the default) to disable the limit.
   */
  constructor({ maxSize = Infinity } = {}) {
    if (maxSize < 1) throw new RangeError("maxSize must be at least 1");

    /** @type {number} */
    this.maxSize = maxSize;

    /** @type {Map<string, object>} id → card object */
    this._cards = new Map();

    /** @type {Set<string>} ids of currently selected cards */
    this._selected = new Set();
  }

  // ── Read-only accessors ────────────────────────────────────────────────────

  /** Number of cards currently in hand. */
  get size() {
    return this._cards.size;
  }

  /** Number of currently selected cards. */
  get selectedCount() {
    return this._selected.size;
  }

  /** How many more cards can be added before the limit is reached. */
  get availableSlots() {
    return this.maxSize === Infinity ? Infinity : this.maxSize - this._cards.size;
  }

  /** True when the hand contains no cards. */
  isEmpty() {
    return this._cards.size === 0;
  }

  /** True when the hand has reached maxSize. */
  isFull() {
    return this._cards.size >= this.maxSize;
  }

  // ── Card access ────────────────────────────────────────────────────────────

  /**
   * All cards in hand, in insertion order.
   * @returns {object[]}
   */
  getAll() {
    return [...this._cards.values()];
  }

  /**
   * Look up a single card by id.
   * @param {string} id
   * @returns {object|undefined}
   */
  getById(id) {
    return this._cards.get(id);
  }

  /**
   * True if the hand contains a card with this id.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._cards.has(id);
  }

  /**
   * Cards filtered to a specific type: "bright" | "animal" | "ribbon" | "plain".
   * @param {string} type
   * @returns {object[]}
   */
  getByType(type) {
    return this.getAll().filter((c) => c.type === type);
  }

  /**
   * Cards belonging to a specific month (1–12).
   * @param {number} month
   * @returns {object[]}
   */
  getByMonth(month) {
    return this.getAll().filter((c) => c.month === month);
  }

  /**
   * Cards that include a specific tag.
   * @param {string} tag
   * @returns {object[]}
   */
  getByTag(tag) {
    return this.getAll().filter((c) => c.tags.includes(tag));
  }

  /**
   * Cards sorted by month (ascending), then by point value (descending)
   * within the same month — brights first, plains last.
   * Does not mutate the internal order; returns a new array.
   * @returns {object[]}
   */
  getSorted() {
    return this.getAll().sort(
      (a, b) => a.month - b.month || b.points - a.points
    );
  }

  // ── Mutation ───────────────────────────────────────────────────────────────

  /**
   * Add one card or an array of cards to the hand.
   * Throws RangeError if adding would exceed maxSize.
   * Silently ignores cards whose id is already in the hand.
   *
   * @param {object|object[]} cards
   * @returns {this} for chaining
   */
  add(cards) {
    const list = Array.isArray(cards) ? cards : [cards];
    const incoming = list.filter((c) => !this._cards.has(c.id));

    if (this._cards.size + incoming.length > this.maxSize) {
      throw new RangeError(
        `Cannot add ${incoming.length} card(s): hand limit of ${this.maxSize} would be exceeded ` +
        `(currently holding ${this._cards.size})`
      );
    }

    for (const card of incoming) {
      this._cards.set(card.id, card);
    }
    return this;
  }

  /**
   * Remove and return a single card by id.
   * Also deselects the card if it was selected.
   * Returns undefined if the id is not in hand.
   *
   * @param {string} id
   * @returns {object|undefined} The removed card, or undefined.
   */
  remove(id) {
    const card = this._cards.get(id);
    if (!card) return undefined;
    this._cards.delete(id);
    this._selected.delete(id);
    return card;
  }

  /**
   * Remove and return multiple cards by id.
   * Ids not found in hand are silently skipped.
   *
   * @param {string[]} ids
   * @returns {object[]} The cards that were actually removed.
   */
  removeMany(ids) {
    return ids.map((id) => this.remove(id)).filter(Boolean);
  }

  /**
   * Remove and return all currently selected cards, then clear the selection.
   * Returns an empty array if nothing is selected.
   *
   * @returns {object[]}
   */
  removeSelected() {
    return this.removeMany([...this._selected]);
  }

  /**
   * Remove all cards from hand and clear selection.
   * @returns {this} for chaining
   */
  clear() {
    this._cards.clear();
    this._selected.clear();
    return this;
  }

  // ── Selection management ───────────────────────────────────────────────────

  /**
   * Select a card by id. No-op if the id is not in hand or already selected.
   * @param {string} id
   * @returns {this} for chaining
   */
  select(id) {
    if (this._cards.has(id)) this._selected.add(id);
    return this;
  }

  /**
   * Deselect a card by id. No-op if the card is not selected.
   * @param {string} id
   * @returns {this} for chaining
   */
  deselect(id) {
    this._selected.delete(id);
    return this;
  }

  /**
   * Toggle the selection state of a card by id.
   * No-op if the id is not in hand.
   * @param {string} id
   * @returns {boolean} The new selection state (true = selected).
   */
  toggleSelect(id) {
    if (!this._cards.has(id)) return false;
    if (this._selected.has(id)) {
      this._selected.delete(id);
      return false;
    }
    this._selected.add(id);
    return true;
  }

  /**
   * Select all cards currently in hand.
   * @returns {this} for chaining
   */
  selectAll() {
    for (const id of this._cards.keys()) this._selected.add(id);
    return this;
  }

  /**
   * Clear the entire selection without removing any cards.
   * @returns {this} for chaining
   */
  clearSelection() {
    this._selected.clear();
    return this;
  }

  /**
   * True if the given card id is currently selected.
   * @param {string} id
   * @returns {boolean}
   */
  isSelected(id) {
    return this._selected.has(id);
  }

  /**
   * All currently selected cards, in insertion order.
   * @returns {object[]}
   */
  getSelected() {
    return [...this._selected].map((id) => this._cards.get(id));
  }

  // ── Snapshot ───────────────────────────────────────────────────────────────

  /**
   * A plain-object snapshot of hand state — useful for serialisation,
   * logging, or passing to the ScoringEngine.
   *
   * @returns {{ cards: object[], selectedIds: string[] }}
   */
  toSnapshot() {
    return {
      cards: this.getAll(),
      selectedIds: [...this._selected],
    };
  }
}
