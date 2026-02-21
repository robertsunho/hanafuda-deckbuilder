import { cards as ALL_CARDS } from "../data/cards.js";

/**
 * DeckManager
 *
 * Manages a Hanafuda deck: draw pile, discard pile, and all mutations
 * (shuffle, draw, discard, reset, peek, removeById).
 *
 * The canonical 48-card set is used as the source of truth; the manager
 * works on shallow copies so the original data objects are never mutated.
 *
 * Usage:
 *   const deck = new DeckManager();
 *   deck.shuffle();
 *   const hand = deck.draw(8);
 *   deck.discard(hand);
 *   deck.reset();          // shuffles discard back into draw pile
 */
export default class DeckManager {
  constructor() {
    /** @type {object[]} Cards available to draw, ordered top-to-bottom. */
    this._drawPile = [...ALL_CARDS];

    /** @type {object[]} Cards that have been discarded. */
    this._discardPile = [];
  }

  // ── Read-only accessors ────────────────────────────────────────────────────

  /** Cards remaining in the draw pile. */
  get drawPileSize() {
    return this._drawPile.length;
  }

  /** Cards in the discard pile. */
  get discardPileSize() {
    return this._discardPile.length;
  }

  /** Shallow copy of the current draw pile (index 0 = top). */
  get drawPile() {
    return [...this._drawPile];
  }

  /** Shallow copy of the current discard pile. */
  get discardPile() {
    return [...this._discardPile];
  }

  // ── Core operations ────────────────────────────────────────────────────────

  /**
   * Shuffle the draw pile in-place using the Fisher-Yates algorithm.
   * Does not touch the discard pile.
   * @returns {this} for chaining
   */
  shuffle() {
    const pile = this._drawPile;
    for (let i = pile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pile[i], pile[j]] = [pile[j], pile[i]];
    }
    return this;
  }

  /**
   * Draw N cards from the top of the draw pile.
   * If fewer than N cards remain, all remaining cards are returned.
   * @param {number} [n=1] Number of cards to draw.
   * @returns {object[]} The drawn cards (first element was on top of the pile).
   */
  draw(n = 1) {
    if (n < 1) return [];
    const count = Math.min(n, this._drawPile.length);
    return this._drawPile.splice(0, count);
  }

  /**
   * Move one or more cards to the discard pile.
   * Accepts a single card object or an array of card objects.
   * @param {object|object[]} cards Card or cards to discard.
   * @returns {this} for chaining
   */
  discard(cards) {
    const list = Array.isArray(cards) ? cards : [cards];
    this._discardPile.push(...list);
    return this;
  }

  /**
   * Shuffle the discard pile back into the draw pile, then clear the
   * discard pile. Existing draw-pile cards are preserved at the bottom.
   * @returns {this} for chaining
   */
  reset() {
    // Shuffle discard before merging so the result isn't predictable.
    const shuffled = [...this._discardPile];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this._drawPile = [...this._drawPile, ...shuffled];
    this._discardPile = [];
    return this;
  }

  /**
   * Look at the top N cards without removing them from the draw pile.
   * @param {number} [n=1] Number of cards to peek at.
   * @returns {object[]} Shallow copies of the top N cards (index 0 = top).
   */
  peek(n = 1) {
    return this._drawPile.slice(0, Math.max(0, n));
  }

  /**
   * Permanently remove cards from the draw pile by their `id` property.
   * Removed cards are not added to the discard pile — they leave the game.
   * @param {string|string[]} ids A single id string or an array of id strings.
   * @returns {object[]} The cards that were actually removed.
   */
  removeById(ids) {
    const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
    const removed = [];

    this._drawPile = this._drawPile.filter((card) => {
      if (idSet.has(card.id)) {
        removed.push(card);
        return false;
      }
      return true;
    });

    return removed;
  }

  // ── Convenience helpers ────────────────────────────────────────────────────

  /**
   * Restore the full 48-card set into the draw pile and clear the discard
   * pile. Useful for starting a fresh game without creating a new instance.
   * @returns {this} for chaining
   */
  fullReset() {
    this._drawPile = [...ALL_CARDS];
    this._discardPile = [];
    return this;
  }

  /**
   * Return true when the draw pile is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this._drawPile.length === 0;
  }
}
