// ─────────────────────────────────────────────────────────────────────────────
// ShrineScene — between-round shop where the player spends ki on spirits and
// consumables.
//
// Layout (1280 × 720):
//   Top bar       — title (Shrine / Sacred Grove), round, ki balance
//   Left half     — Spirit Altar: 3 weighted-random offer cards + loadout row
//   Right half    — Offering Table: 3 weighted-random consumable cards + held row
//   Bottom centre — Meditate (escalating-cost reroll) + Continue buttons
// ─────────────────────────────────────────────────────────────────────────────

import run, { RunManager } from '../systems/RunManager.js';
import { spirits     } from '../data/spirits.js';
import { consumables } from '../data/consumables.js';

// ── Slot caps sourced from RunManager so both scenes stay in sync ─────────────
const MAX_SPIRIT_SLOTS     = RunManager.MAX_SPIRIT_SLOTS;
const MAX_CONSUMABLE_SLOTS = RunManager.MAX_CONSUMABLE_SLOTS;

// ── Rarity palette ────────────────────────────────────────────────────────────
const RARITY_BORDER = {
  common:    0x667788,
  uncommon:  0x44aa44,
  rare:      0x4488ff,
  legendary: 0xddaa22,
};
const RARITY_TEXT = {
  common:    '#889aaa',
  uncommon:  '#88dd88',
  rare:      '#88aaff',
  legendary: '#ffcc44',
};

// Weighted selection probability (relative, not summing to 1).
const RARITY_WEIGHT = { common: 50, uncommon: 30, rare: 15, legendary: 5 };

// ── Layout constants ──────────────────────────────────────────────────────────
const OFFER_SLOTS  = 3;     // cards shown per section per visit

const LEFT_CX   = 320;     // horizontal centre of spirit section
const RIGHT_CX  = 960;     // horizontal centre of consumable section
const DIVIDER_X = 640;     // vertical divider between sections

const CARD_W    = 155;
const CARD_H    = 205;
const CARD_STEP = CARD_W + 18;   // centre-to-centre x spacing for offer cards
// Offer card row:  i=0 → cx−step, i=1 → cx, i=2 → cx+step

const SMALL_W    = 108;
const SMALL_H    = 68;
const SMALL_STEP = SMALL_W + 10;

const TOP_BAR_H   = 60;
const OFFER_Y     = 250;   // vertical centre of offer card row
const SECTION_DIV = 390;   // y of the divider between offers and loadout
const LOADOUT_Y   = 460;   // vertical centre of the small loadout cards
const BTN_Y       = 648;   // y of bottom action buttons

// ─────────────────────────────────────────────────────────────────────────────

export class ShrineScene extends Phaser.Scene {

  constructor() {
    super({ key: 'ShrineScene' });
  }

  create() {
    const { isGrove }          = this.scene.settings.data || {};
    this._isGrove              = isGrove ?? false;
    this._meditateCount        = 0;
    this._spiritPurchased      = new Array(OFFER_SLOTS).fill(false);
    this._consumablePurchased  = new Array(OFFER_SLOTS).fill(false);

    this._rollOffers();
    this._buildUI();
  }

  // ── Offer rolling ─────────────────────────────────────────────────────────

  _rollOffers() {
    // Filter spirits already in the loadout so they are never offered twice.
    const equippedIds    = new Set(run.spirits.map(s => s.id));
    const availableSpirits = spirits.filter(s => !equippedIds.has(s.id));

    this._offeredSpirits      = this._weightedSample(availableSpirits, OFFER_SLOTS);
    this._offeredConsumables  = this._weightedSample(consumables, OFFER_SLOTS);

    this._spiritPurchased     = new Array(OFFER_SLOTS).fill(false);
    this._consumablePurchased = new Array(OFFER_SLOTS).fill(false);
  }

  /**
   * Weighted random sample without replacement.
   * Common=50 / Uncommon=30 / Rare=15 / Legendary=5.
   * Returns fewer items than requested when the pool is smaller.
   *
   * @param {object[]} pool
   * @param {number}   count
   * @returns {object[]}
   */
  _weightedSample(pool, count) {
    const result    = [];
    const remaining = [...pool];

    while (result.length < count && remaining.length > 0) {
      const totalWeight = remaining.reduce(
        (sum, item) => sum + (RARITY_WEIGHT[item.rarity] ?? 10), 0
      );
      let roll   = Math.random() * totalWeight;
      let chosen = remaining[remaining.length - 1];

      for (let i = 0; i < remaining.length; i++) {
        roll -= (RARITY_WEIGHT[remaining[i].rarity] ?? 10);
        if (roll <= 0) { chosen = remaining[i]; break; }
      }

      result.push(chosen);
      remaining.splice(remaining.indexOf(chosen), 1);
    }

    return result;
  }

  // ── UI build / rebuild ────────────────────────────────────────────────────

  /**
   * Tear down and redraw the entire scene.
   * Called on create, on purchase, and on meditate.
   */
  _buildUI() {
    this.children.removeAll(true);

    this._drawBackground();
    this._drawTopBar();
    this._drawSectionLabels();
    this._drawOfferCards();
    this._drawLoadouts();
    this._drawBottomButtons();
  }

  // ── Background ────────────────────────────────────────────────────────────

  _drawBackground() {
    // Base fill
    this.add.rectangle(640, 360, 1280, 720, 0x060c18);
    // Subtle vertical divider between sections
    this.add.rectangle(DIVIDER_X, 390, 1, 660, 0x1e2d40);
  }

  // ── Top bar ───────────────────────────────────────────────────────────────

  _drawTopBar() {
    this.add.rectangle(640, TOP_BAR_H / 2, 1280, TOP_BAR_H, 0x0a1628);
    this.add.rectangle(640, TOP_BAR_H,     1280, 1,         0x2a3a50);

    const isGrove = this._isGrove;
    this.add.text(640, TOP_BAR_H / 2,
      isGrove ? 'Sacred Grove' : 'Shrine',
      {
        fontSize: '24px',
        color:    isGrove ? '#ffcc44' : '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }
    ).setOrigin(0.5);

    this.add.text(20, TOP_BAR_H / 2,
      `Act ${run.act}  —  Round ${run.round}`,
      { fontSize: '14px', color: '#556677' }
    ).setOrigin(0, 0.5);

    this.add.text(1260, TOP_BAR_H / 2,
      `Ki: ${run.ki}`,
      { fontSize: '17px', color: '#ffee88', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(1, 0.5);
  }

  // ── Section labels + loadout headers ─────────────────────────────────────

  _drawSectionLabels() {
    this.add.text(LEFT_CX,  78, 'Spirit Altar',   { fontSize: '15px', color: '#aaccee' }).setOrigin(0.5);
    this.add.text(RIGHT_CX, 78, 'Offering Table', { fontSize: '15px', color: '#aaccee' }).setOrigin(0.5);

    // Horizontal dividers above the loadout rows
    this.add.rectangle(LEFT_CX,  SECTION_DIV, 580, 1, 0x1e2d40);
    this.add.rectangle(RIGHT_CX, SECTION_DIV, 580, 1, 0x1e2d40);

    this.add.text(LEFT_CX,  SECTION_DIV + 8, 'Equipped Spirits',  { fontSize: '11px', color: '#445566' }).setOrigin(0.5, 0);
    this.add.text(RIGHT_CX, SECTION_DIV + 8, 'Held Consumables',  { fontSize: '11px', color: '#445566' }).setOrigin(0.5, 0);

    // "Slots full" warnings
    if (run.spirits.length >= MAX_SPIRIT_SLOTS) {
      this.add.text(LEFT_CX, 98, 'Spirit slots full', { fontSize: '11px', color: '#cc4444' }).setOrigin(0.5);
    }
    if (run.consumables.length >= MAX_CONSUMABLE_SLOTS) {
      this.add.text(RIGHT_CX, 98, 'Consumable slots full', { fontSize: '11px', color: '#cc4444' }).setOrigin(0.5);
    }
  }

  // ── Offer cards ───────────────────────────────────────────────────────────

  _drawOfferCards() {
    const spiritsFull     = run.spirits.length     >= MAX_SPIRIT_SLOTS;
    const consumablesFull = run.consumables.length  >= MAX_CONSUMABLE_SLOTS;

    this._offeredSpirits.forEach((spirit, i) => {
      const cx = LEFT_CX + (i - 1) * CARD_STEP;
      this._drawOfferCard(cx, OFFER_Y, spirit,
        this._spiritPurchased[i], spiritsFull,
        () => this._purchaseSpirit(i));
    });

    if (this._offeredSpirits.length === 0) {
      this.add.text(LEFT_CX, OFFER_Y, 'All spirits acquired.', { fontSize: '14px', color: '#445566' }).setOrigin(0.5);
    }

    this._offeredConsumables.forEach((consumable, i) => {
      const cx = RIGHT_CX + (i - 1) * CARD_STEP;
      this._drawOfferCard(cx, OFFER_Y, consumable,
        this._consumablePurchased[i], consumablesFull,
        () => this._purchaseConsumable(i));
    });
  }

  /**
   * Draw a single shop offer card.
   *
   * @param {number}   cx
   * @param {number}   cy
   * @param {object}   item       spirit or consumable definition
   * @param {boolean}  purchased  already bought this reroll
   * @param {boolean}  slotsFull  player's slot category is full
   * @param {Function} onBuy      called when the player clicks to purchase
   */
  _drawOfferCard(cx, cy, item, purchased, slotsFull, onBuy) {
    const canAfford  = run.ki >= item.cost;
    const buyable    = !purchased && !slotsFull && canAfford;
    const dimmed     = purchased || slotsFull;
    const cardAlpha  = dimmed ? 0.45 : 1.0;

    const borderColor = RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common;
    const bgColor     = dimmed ? 0x0c1520 : 0x0f1e30;

    // Card background / hit area
    const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, bgColor)
      .setStrokeStyle(2, borderColor)
      .setAlpha(cardAlpha);

    if (buyable) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(0x1a2d45));
      bg.on('pointerout',  () => bg.setFillStyle(bgColor));
      bg.on('pointerdown', onBuy);
    }

    const half = CARD_H / 2;

    // Name
    this.add.text(cx, cy - half + 12, item.name, {
      fontSize: '13px', color: '#e8e8e8',
      wordWrap: { width: CARD_W - 16 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(cardAlpha);

    // Rarity label
    this.add.text(cx, cy - half + 30, item.rarity, {
      fontSize: '10px', color: RARITY_TEXT[item.rarity] ?? RARITY_TEXT.common,
    }).setOrigin(0.5, 0).setAlpha(cardAlpha);

    // Description
    this.add.text(cx, cy - 20, item.description, {
      fontSize: '11px', color: '#9aadbb',
      wordWrap: { width: CARD_W - 16 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(cardAlpha);

    // Cost badge
    const costColor = (!purchased && canAfford) ? '#ffee88' : '#cc6644';
    this.add.text(cx, cy + half - 20, `${item.cost} ki`, {
      fontSize: '13px', color: costColor,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setAlpha(cardAlpha);

    // State overlays
    if (purchased) {
      this.add.text(cx, cy, 'Purchased', {
        fontSize: '13px', color: '#667788',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);
    } else if (slotsFull) {
      this.add.text(cx, cy - half + 48, 'Slots full', {
        fontSize: '10px', color: '#cc4444',
      }).setOrigin(0.5, 0);
    } else if (!canAfford) {
      this.add.text(cx, cy - half + 48, 'Not enough ki', {
        fontSize: '10px', color: '#886644',
      }).setOrigin(0.5, 0);
    }
  }

  // ── Loadout rows ──────────────────────────────────────────────────────────

  _drawLoadouts() {
    // ── Spirit slots (5) ──────────────────────────────────────────────────
    const equippedSpirits = run.spirits;
    for (let i = 0; i < MAX_SPIRIT_SLOTS; i++) {
      const cx = LEFT_CX + (i - 2) * SMALL_STEP;
      this._drawSmallSlot(cx, LOADOUT_Y, equippedSpirits[i] ?? null);
    }

    // ── Consumable slots (3) ──────────────────────────────────────────────
    const heldConsumables = run.consumables;
    for (let i = 0; i < MAX_CONSUMABLE_SLOTS; i++) {
      const cx = RIGHT_CX + (i - 1) * SMALL_STEP;
      this._drawSmallSlot(cx, LOADOUT_Y, heldConsumables[i] ?? null);
    }
  }

  /**
   * Draw one small loadout slot card.
   * @param {number}      cx
   * @param {number}      cy
   * @param {object|null} item  null → empty slot
   */
  _drawSmallSlot(cx, cy, item) {
    const borderColor = item
      ? (RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common)
      : 0x1e2d40;

    this.add.rectangle(cx, cy, SMALL_W, SMALL_H, 0x0a1220)
      .setStrokeStyle(1, borderColor);

    if (item) {
      this.add.text(cx, cy - SMALL_H / 2 + 6, item.name, {
        fontSize: '10px', color: '#ccdde8',
        wordWrap: { width: SMALL_W - 8 }, align: 'center',
      }).setOrigin(0.5, 0);
    } else {
      this.add.text(cx, cy, '—', { fontSize: '14px', color: '#2a3a50' }).setOrigin(0.5);
    }
  }

  // ── Bottom buttons ────────────────────────────────────────────────────────

  _drawBottomButtons() {
    this._drawMeditateButton();
    this._drawContinueButton();
  }

  _drawMeditateButton() {
    const cost        = this._meditateCount + 1;
    const canMeditate = run.ki >= cost;
    const bgColor     = canMeditate ? 0x1a3a5a : 0x111a28;
    const borderColor = canMeditate ? 0x4488aa : 0x2a3a50;
    const textColor   = canMeditate ? '#aaccee' : '#445566';

    const btn = this.add.rectangle(430, BTN_Y, 230, 44, bgColor)
      .setStrokeStyle(2, borderColor);

    if (canMeditate) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setFillStyle(0x2a5a8a));
      btn.on('pointerout',  () => btn.setFillStyle(bgColor));
      btn.on('pointerdown', () => this._meditate());
    }

    this.add.text(430, BTN_Y, `Meditate  (${cost} ki)`, {
      fontSize: '14px', color: textColor,
    }).setOrigin(0.5);
  }

  _drawContinueButton() {
    const btn = this.add.rectangle(850, BTN_Y, 230, 44, 0x1a4a2a)
      .setStrokeStyle(2, 0x44aa66)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setFillStyle(0x2a6a3a));
    btn.on('pointerout',  () => btn.setFillStyle(0x1a4a2a));
    btn.on('pointerdown', () => this._continue());

    this.add.text(850, BTN_Y, 'Continue', {
      fontSize: '16px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  _purchaseSpirit(index) {
    const spirit = this._offeredSpirits[index];
    if (!spirit)                                    return;
    if (run.ki < spirit.cost)                       return;
    if (run.spirits.length >= MAX_SPIRIT_SLOTS)     return;
    if (this._spiritPurchased[index])               return;

    run.spendKi(spirit.cost);
    run.addSpirit(spirit);
    this._spiritPurchased[index] = true;
    this._buildUI();
  }

  _purchaseConsumable(index) {
    const consumable = this._offeredConsumables[index];
    if (!consumable)                                       return;
    if (run.ki < consumable.cost)                         return;
    if (run.consumables.length >= MAX_CONSUMABLE_SLOTS)   return;
    if (this._consumablePurchased[index])                 return;

    run.spendKi(consumable.cost);
    run.addConsumable(consumable);
    this._consumablePurchased[index] = true;
    this._buildUI();
  }

  _meditate() {
    const cost = this._meditateCount + 1;
    if (run.ki < cost) return;

    run.spendKi(cost);
    this._meditateCount++;
    this._rollOffers();
    this._buildUI();
  }

  _continue() {
    this.scene.start('GameScene');
  }
}
