import GameRoundManager      from '../systems/GameRoundManager.js';
import { YAKU_INFO }         from '../systems/ScoringEngine.js';
import run                   from '../systems/RunManager.js';

// ── Layout constants ───────────────────────────────────────────────────────────
// Canvas is 1280 × 720.
// Left panel  (x   0–170): deck + discard + capture stack  (all centred at x=85)
// Play area   (x 170–1120): field + hand, centred at PLAY_CX
// Right panel (x 1120–1280): spirit column + (consumables right of hand)

const CARD_W     = 105;   // natural image width
const CARD_H     = 159;   // natural image height
const CARD_SCALE = 0.85;  // all card sprites rendered at 85 %

const PLAY_CX = 530;   // horizontal centre of the field + hand area

// ── Left panel: three face-down piles ─────────────────────────────────────
// Each pile occupies: label (12 px text) + 15 px gap + card (CARD_SCALE) = ~155 px.
// Inter-pile gap: ~15 px.  Total span: 3 × 155 + 2 × 15 = 495 px, y 80 → 575.
//
// Pile card centres (same x for all, at DECK_X = 85):
//   Deck      : 80 (label) → 163 (card centre)
//   Discard   : 245 (label) → 330 (card centre)
//   Captured  : 412 (label) → 497 (card centre)

const DECK_X      = 85;    // left-panel x for all three piles
const DECK_Y      = 163;   // deck card centre y
const DISCARD_Y   = 330;   // discard card centre y  (also used for anim target)
const CAP_STACK_X = DECK_X;
const CAP_STACK_Y = 497;   // captured card centre y

// When the deck flips, the face-up card is revealed here for FLIP_HOLD ms.
const FLIP_X    = DECK_X;
const FLIP_Y    = DECK_Y;
const FLIP_HOLD = 800;   // ms

// ── Field ──────────────────────────────────────────────────────────────────
const SLOT_COLS  = 4;
const SLOT_XS    = [260, 415, 570, 725]; // 4 columns, ~155 px apart
const SLOT_YS    = [160, 400];           // 2 row centres
const SLOT_FAN_X = 12;
const SLOT_FAN_Y = 15;

const SLOT_BG_W = Math.round(CARD_W * CARD_SCALE) + 8;   // ≈ 97 px
const SLOT_BG_H = Math.round(CARD_H * CARD_SCALE) + 8;   // ≈ 143 px

// ── Hand ───────────────────────────────────────────────────────────────────
const HAND_STEP = 88;
const HAND_Y    = 638;

// ── Right panel: spirit column ────────────────────────────────────────────
// Cards are rendered as rectangles matching card proportions at
// CARD_SCALE × 0.85 so that 5 slots fit without overlap in the column.
//   SPIRIT_SCALE ≈ 0.7225  →  76 × 115 px per card
//   SPIRIT_STEP  = 127 px  →  centres at 127, 254, 381, 508, 635
const SPIRIT_SCALE  = CARD_SCALE * 0.85;
const SPIRIT_CARD_W = Math.round(CARD_W * SPIRIT_SCALE);  // 76
const SPIRIT_CARD_H = Math.round(CARD_H * SPIRIT_SCALE);  // 115
const SPIRIT_X      = 1195;
const SPIRIT_TOP    = 127;                    // y centre of first slot
const SPIRIT_STEP   = SPIRIT_CARD_H + 12;     // 127

// ── Consumable cards (right of hand area) ─────────────────────────────────
// Same proportions as spirit cards (same SPIRIT_SCALE).
const CONS_CARD_W  = SPIRIT_CARD_W;           // 76
const CONS_CARD_H  = SPIRIT_CARD_H;           // 115
const CONS_X_START = 920;                     // centre x of first slot
const CONS_STEP    = CONS_CARD_W + 10;        // 86

// ── Rarity colours ────────────────────────────────────────────────────────
const RARITY_COLOR = {
  common:    0x667788,
  uncommon:  0x44aa44,
  rare:      0x4488ff,
  legendary: 0xddaa22,
};

// ── Slot counts (mirrors RunManager statics) ──────────────────────────────
const MAX_SPIRIT_SLOTS     = 5;
const MAX_CONSUMABLE_SLOTS = 3;

// ── Tints ──────────────────────────────────────────────────────────────────
const TINT_PENDING = 0xffee33;  // gold  — pending-match slot
const TINT_DIM     = 0x445566;  // slate — non-interactive
const TINT_HOVER   = 0xddeeff;  // ice   — hover highlight
const TINT_DISCARD = 0xff2222;  // red   — discarded card flash

// ─────────────────────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this._round              = new GameRoundManager();
    this._animating          = false;
    this._yakuGuideOpen      = false;
    this._captureOverlayOpen = false;

    this._handObjs           = [];
    this._fieldObjs          = [];
    this._captureObjs        = [];   // face-down stack + badge
    this._spiritObjs         = [];
    this._consumableObjs     = [];
    this._overlayObjs        = [];
    this._captureOverlayObjs = [];
    this._yakuGuideObjs      = [];
    this._actionBtnObjs      = [];

    this._selectedCardIds         = new Set();
    this._selectedConsumableIndex = null;

    this._createCardBackTexture();
    this._buildStaticUI();

    this._round.startRound();
    this._afterRoundStart();
    this._renderAll();
  }

  // ── Card-back texture ──────────────────────────────────────────────────────

  _createCardBackTexture() {
    const g = this.make.graphics({ add: false });
    const w = CARD_W, h = CARD_H;
    g.fillStyle(0x0d1b2a); g.fillRect(0, 0, w, h);
    g.fillStyle(0x1a3550); g.fillRect(3, 3, w - 6, h - 6);
    g.lineStyle(1, 0x4488aa, 0.9); g.strokeRect(8, 8, w - 16, h - 16);
    g.lineStyle(1, 0x336688, 0.5);
    g.lineBetween(8, 8, w - 8, h - 8);
    g.lineBetween(w - 8, 8, 8, h - 8);
    g.generateTexture('card_back', w, h);
    g.destroy();
  }

  // ── Static UI ─────────────────────────────────────────────────────────────

  _buildStaticUI() {
    const labelStyle = { fontSize: '12px', color: '#556677' };

    // ── Zone labels ───────────────────────────────────────────────────────
    this.add.text(PLAY_CX,  38,  'FIELD',    labelStyle).setOrigin(0.5, 0);
    this.add.text(PLAY_CX,  551, 'HAND',     labelStyle).setOrigin(0.5, 0);
    this.add.text(SPIRIT_X, 50,  'SPIRITS',  labelStyle).setOrigin(0.5, 0);

    // Left-panel pile labels (above each card).
    this.add.text(DECK_X, 80,  'DECK',     labelStyle).setOrigin(0.5, 0);
    this.add.text(DECK_X, 245, 'DISCARD',  labelStyle).setOrigin(0.5, 0);
    this.add.text(DECK_X, 412, 'CAPTURED', labelStyle).setOrigin(0.5, 0);

    // ── Dividers ──────────────────────────────────────────────────────────
    this.add.rectangle(PLAY_CX, 543, 940, 1, 0x2a3a50);  // field / hand
    this.add.rectangle(170,  360, 1, 680, 0x1e2d40);      // left panel edge
    this.add.rectangle(1120, 360, 1, 680, 0x1e2d40);      // right panel edge

    // ── Status bar ────────────────────────────────────────────────────────
    this._statusText = this.add.text(PLAY_CX, 14, '', {
      fontSize: '17px', color: '#e8e8e8',
      stroke: '#0a0f1e', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Score display ─────────────────────────────────────────────────────
    this._baseText = this.add.text(920, 262, '', {
      fontSize: '13px', color: '#aaccee',
    }).setOrigin(0.5, 0);
    this._multiText = this.add.text(920, 280, '', {
      fontSize: '16px', color: '#ffee88',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0);
    this._projText = this.add.text(920, 301, '', {
      fontSize: '13px', color: '#ffffff',
    }).setOrigin(0.5, 0);

    // ── Yaku Guide button ─────────────────────────────────────────────────
    const guideBtn = this.add.rectangle(200, 18, 26, 20, 0x1a3550)
      .setStrokeStyle(1, 0x3a6080).setInteractive({ useHandCursor: true });
    guideBtn.on('pointerover',  () => guideBtn.setFillStyle(0x2a5a80));
    guideBtn.on('pointerout',   () => guideBtn.setFillStyle(0x1a3550));
    guideBtn.on('pointerdown',  () => this._showYakuGuide());
    this.add.text(200, 18, '?', { fontSize: '13px', color: '#aaccee' }).setOrigin(0.5);

    // ── Turn / plays / ki ─────────────────────────────────────────────────
    this._turnText  = this.add.text(10, 10, '', { fontSize: '13px', color: '#556677' });
    this._playsText = this.add.text(10, 26, '', { fontSize: '13px', color: '#556677' });
    this._kiText    = this.add.text(1270, 10, '', {
      fontSize: '13px', color: '#ffee88',
    }).setOrigin(1, 0);

    // ── Deck pile ─────────────────────────────────────────────────────────
    this._deckSprite = this.add.image(DECK_X, DECK_Y, 'card_back').setScale(CARD_SCALE);

    // Count badge overlaid on lower third of card.
    this._deckCountText = this.add.text(DECK_X, DECK_Y + 30, '32', {
      fontSize: '18px', color: '#aaccee',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Discard pile ──────────────────────────────────────────────────────
    // Greyed card-back; hidden when discard count is 0.
    this._discardSprite = this.add.image(DECK_X, DISCARD_Y, 'card_back')
      .setScale(CARD_SCALE)
      .setTint(0x667788)
      .setVisible(false);

    this._discardCountText = this.add.text(DECK_X, DISCARD_Y + 30, '0', {
      fontSize: '18px', color: '#cc6666',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setVisible(false);
  }

  // ── Master render ──────────────────────────────────────────────────────────

  _renderAll() {
    this._clearObjs(this._handObjs);
    this._clearObjs(this._fieldObjs);
    this._clearObjs(this._captureObjs);
    this._clearObjs(this._spiritObjs);
    this._clearObjs(this._consumableObjs);
    this._clearObjs(this._actionBtnObjs);
    this._renderHand();
    this._renderField();
    this._renderSpiritColumn();
    this._renderCaptureStack();
    this._renderConsumables();
    this._renderActionButtons();
    this._updateInfoTexts();
  }

  // ── Hand ──────────────────────────────────────────────────────────────────

  _renderHand() {
    const cards  = this._round.hand.getAll();
    const n      = cards.length;
    const idle   = this._round.phase === 'idle' && !this._animating
                    && !this._yakuGuideOpen && !this._captureOverlayOpen;
    const startX = PLAY_CX - ((n - 1) * HAND_STEP) / 2;

    for (let i = 0; i < n; i++) {
      const card     = cards[i];
      const selected = this._selectedCardIds.has(card.id);
      const x        = startX + i * HAND_STEP;
      const y        = HAND_Y - (selected ? 20 : 0);
      const spr      = this.add.image(x, y, card.id).setScale(CARD_SCALE);

      if (idle) {
        spr.setInteractive({ useHandCursor: true });
        if (selected) spr.setTint(TINT_HOVER);
        spr.on('pointerover',  () => spr.setTint(TINT_HOVER));
        spr.on('pointerout',   () => { if (!selected) spr.clearTint(); });
        spr.on('pointerdown',  () => this._toggleCardSelection(card.id));
      } else {
        spr.setTint(TINT_DIM);
      }
      this._handObjs.push(spr);
    }
  }

  // ── Field ─────────────────────────────────────────────────────────────────

  _renderField() {
    const slots = this._round.field.getSlots();

    for (let i = 0; i < 8; i++) {
      const col = i % SLOT_COLS;
      const row = Math.floor(i / SLOT_COLS);
      this._fieldObjs.push(
        this.add.rectangle(SLOT_XS[col], SLOT_YS[row], SLOT_BG_W, SLOT_BG_H, 0x0a1628)
      );
    }

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const col   = i % SLOT_COLS;
      const row   = Math.floor(i / SLOT_COLS);
      for (let j = 0; j < slot.cards.length; j++) {
        const spr = this.add.image(
          SLOT_XS[col] + j * SLOT_FAN_X,
          SLOT_YS[row] + j * SLOT_FAN_Y,
          slot.cards[j].id
        ).setScale(CARD_SCALE);
        if (slot.state === 'pending') spr.setTint(TINT_PENDING);
        this._fieldObjs.push(spr);
      }
    }
  }

  // ── Spirit column ─────────────────────────────────────────────────────────

  _renderSpiritColumn() {
    const spirits = run.spirits;

    for (let i = 0; i < MAX_SPIRIT_SLOTS; i++) {
      const spirit = spirits[i];
      const y      = SPIRIT_TOP + i * SPIRIT_STEP;

      if (!spirit) {
        this._spiritObjs.push(
          this.add.rectangle(SPIRIT_X, y, SPIRIT_CARD_W, SPIRIT_CARD_H, 0x0a1628)
            .setStrokeStyle(1, 0x1e2d40)
        );
        continue;
      }

      // Card background.
      const card = this.add.rectangle(SPIRIT_X, y, SPIRIT_CARD_W, SPIRIT_CARD_H, 0x0d1b2a)
        .setStrokeStyle(1, 0x2a3a50);
      this._spiritObjs.push(card);

      // Rarity left-border strip.
      const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;
      this._spiritObjs.push(
        this.add.rectangle(SPIRIT_X - SPIRIT_CARD_W / 2 + 2, y, 4, SPIRIT_CARD_H - 4, rarityCol)
      );

      // Name label (left-aligned, vertically centred).
      this._spiritObjs.push(
        this.add.text(SPIRIT_X - SPIRIT_CARD_W / 2 + 10, y, spirit.name, {
          fontSize: '11px', color: '#cce0ff',
        }).setOrigin(0, 0.5)
      );

      // Hover tooltip — appears to the left of the card.
      const tooltip = this.add.text(
        SPIRIT_X - SPIRIT_CARD_W / 2 - 8, y,
        spirit.description,
        {
          fontSize: '11px', color: '#e8e8e8',
          backgroundColor: '#0a0f1e',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 190 },
        }
      ).setOrigin(1, 0.5).setDepth(30).setVisible(false);
      this._spiritObjs.push(tooltip);

      card.setInteractive();
      card.on('pointerover', () => tooltip.setVisible(true));
      card.on('pointerout',  () => tooltip.setVisible(false));
    }
  }

  // ── Captured pile (face-down stack in left panel) ─────────────────────────

  _renderCaptureStack() {
    const count = this._round.capture.getAll().length;

    const stackSpr = this.add.image(CAP_STACK_X, CAP_STACK_Y, 'card_back')
      .setScale(CARD_SCALE)
      .setVisible(count > 0);
    this._captureObjs.push(stackSpr);

    // Count badge overlaid on lower third of card.
    const badge = this.add.text(CAP_STACK_X, CAP_STACK_Y + 30, String(count), {
      fontSize: '18px', color: '#aaccee',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setVisible(count > 0);
    this._captureObjs.push(badge);

    if (count > 0) {
      stackSpr.setInteractive({ useHandCursor: true });
      stackSpr.on('pointerover', () => stackSpr.setTint(TINT_HOVER));
      stackSpr.on('pointerout',  () => stackSpr.clearTint());
      stackSpr.on('pointerdown', () => this._showCaptureOverlay());
    }
  }

  // ── Consumable cards (right of hand) ──────────────────────────────────────

  _renderConsumables() {
    const consumables = run.consumables;
    const idle        = this._round.phase === 'idle' && !this._animating
                          && !this._yakuGuideOpen && !this._captureOverlayOpen;

    for (let i = 0; i < MAX_CONSUMABLE_SLOTS; i++) {
      const cons     = consumables[i];
      const selected = this._selectedConsumableIndex === i && cons !== undefined;
      const x        = CONS_X_START + i * CONS_STEP;
      const y        = HAND_Y - (selected ? 15 : 0);

      if (!cons) {
        this._consumableObjs.push(
          this.add.rectangle(x, HAND_Y, CONS_CARD_W, CONS_CARD_H, 0x0a1628)
            .setStrokeStyle(1, 0x1e2d40)
        );
        continue;
      }

      const rarityCol = RARITY_COLOR[cons.rarity] ?? RARITY_COLOR.common;

      // Card background.
      const card = this.add.rectangle(x, y, CONS_CARD_W, CONS_CARD_H, 0x0d1b2a)
        .setStrokeStyle(2, selected ? rarityCol : 0x2a3a50);
      this._consumableObjs.push(card);

      // Rarity top-border strip.
      this._consumableObjs.push(
        this.add.rectangle(x, y - CONS_CARD_H / 2 + 2, CONS_CARD_W - 4, 4, rarityCol)
      );

      // Name label (centred).
      this._consumableObjs.push(
        this.add.text(x, y, cons.name, { fontSize: '10px', color: '#cce0ff' }).setOrigin(0.5)
      );

      // Hover tooltip — appears above the card.
      const tipY    = HAND_Y - CONS_CARD_H / 2 - 10;
      const tooltip = this.add.text(x, tipY, cons.description, {
        fontSize: '11px', color: '#e8e8e8',
        backgroundColor: '#0a0f1e',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 180 },
      }).setOrigin(0.5, 1).setDepth(30).setVisible(false);
      this._consumableObjs.push(tooltip);

      if (idle) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => tooltip.setVisible(true));
        card.on('pointerout',  () => tooltip.setVisible(false));
        card.on('pointerdown', () => {
          tooltip.setVisible(false);
          this._toggleConsumableSelection(i);
        });
      }
    }
  }

  // ── Captured-cards overlay ─────────────────────────────────────────────────

  _showCaptureOverlay() {
    if (this._captureOverlayOpen) return;
    this._captureOverlayOpen = true;
    this._clearObjs(this._handObjs);
    this._renderHand();

    const cards = this._round.capture.getAll();
    const cx    = PLAY_CX;
    const cy    = 330;
    const objs  = this._captureOverlayObjs;

    objs.push(
      this.add.rectangle(cx, cy, 800, 500, 0x080d1a, 0.95)
        .setStrokeStyle(2, 0x3a6080).setDepth(20)
    );
    objs.push(
      this.add.text(cx, cy - 228, 'Captured Cards', {
        fontSize: '20px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20)
    );
    objs.push(this.add.rectangle(cx, cy - 208, 740, 1, 0x3a6080).setDepth(20));

    if (cards.length === 0) {
      objs.push(
        this.add.text(cx, cy, 'No cards captured yet.', {
          fontSize: '15px', color: '#778899',
        }).setOrigin(0.5).setDepth(20)
      );
    } else {
      const TYPES       = ['bright', 'animal', 'ribbon', 'plain'];
      const TYPE_LABELS = { bright: 'Brights', animal: 'Animals', ribbon: 'Ribbons', plain: 'Plains' };
      const byType      = { bright: [], animal: [], ribbon: [], plain: [] };
      for (const card of cards) {
        if (byType[card.type] !== undefined) byType[card.type].push(card);
      }

      const OV_SCALE = 0.45;
      const OV_W     = Math.round(CARD_W * OV_SCALE);
      const OV_H     = Math.round(CARD_H * OV_SCALE);
      const OV_GAP   = 6;
      const ROW_MAX  = 10;
      let y = cy - 190;

      for (const type of TYPES) {
        const group = byType[type];
        if (group.length === 0) continue;

        objs.push(
          this.add.text(cx - 360, y,
            `${TYPE_LABELS[type]}  (${group.length})`,
            { fontSize: '12px', color: '#778899' }
          ).setOrigin(0, 0).setDepth(20)
        );
        y += 18;

        let rowStart = 0;
        while (rowStart < group.length) {
          const rowCards = group.slice(rowStart, rowStart + ROW_MAX);
          const rowW     = rowCards.length * (OV_W + OV_GAP) - OV_GAP;
          const startX   = cx - rowW / 2 + OV_W / 2;
          for (let j = 0; j < rowCards.length; j++) {
            objs.push(
              this.add.image(startX + j * (OV_W + OV_GAP), y + OV_H / 2, rowCards[j].id)
                .setScale(OV_SCALE).setDepth(20)
            );
          }
          y += OV_H + OV_GAP + 4;
          rowStart += ROW_MAX;
        }
        y += 8;
      }
    }

    const closeY   = cy + 224;
    const closeBtn = this.add.rectangle(cx, closeY, 140, 36, 0x1a4a6a)
      .setStrokeStyle(2, 0x4488aa).setInteractive({ useHandCursor: true }).setDepth(20);
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x2a6a9a));
    closeBtn.on('pointerout',  () => closeBtn.setFillStyle(0x1a4a6a));
    closeBtn.on('pointerdown', () => this._closeCaptureOverlay());
    objs.push(closeBtn);
    objs.push(
      this.add.text(cx, closeY, 'Close', { fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(20)
    );
  }

  _closeCaptureOverlay() {
    if (!this._captureOverlayOpen) return;
    this._captureOverlayOpen = false;
    this._clearObjs(this._captureOverlayObjs);
    this._clearObjs(this._handObjs);
    this._renderHand();
  }

  // ── Card selection ─────────────────────────────────────────────────────────

  _toggleCardSelection(cardId) {
    if (this._selectedCardIds.has(cardId)) {
      this._selectedCardIds.delete(cardId);
    } else {
      this._selectedCardIds.add(cardId);
      this._selectedConsumableIndex = null;   // mutual exclusivity
    }
    this._clearObjs(this._handObjs);
    this._clearObjs(this._consumableObjs);
    this._clearObjs(this._actionBtnObjs);
    this._renderHand();
    this._renderConsumables();
    this._renderActionButtons();
  }

  // ── Consumable selection ───────────────────────────────────────────────────

  _toggleConsumableSelection(index) {
    if (this._selectedConsumableIndex === index) {
      this._selectedConsumableIndex = null;
    } else {
      this._selectedConsumableIndex = index;
      this._selectedCardIds.clear();          // mutual exclusivity
    }
    this._clearObjs(this._handObjs);
    this._clearObjs(this._consumableObjs);
    this._clearObjs(this._actionBtnObjs);
    this._renderHand();
    this._renderConsumables();
    this._renderActionButtons();
  }

  // ── Action buttons ────────────────────────────────────────────────────────

  _renderActionButtons() {
    const idle  = this._round.phase === 'idle' && !this._animating
                    && !this._yakuGuideOpen && !this._captureOverlayOpen;
    const count = this._selectedCardIds.size;

    // ── Use button (consumable selected) ──────────────────────────────────
    if (idle && this._selectedConsumableIndex !== null) {
      const cons = run.consumables[this._selectedConsumableIndex];
      if (cons) {
        const y = 700;
        const useBtn = this.add.rectangle(PLAY_CX, y, 180, 40, 0x1a2a5a)
          .setStrokeStyle(2, 0x4466cc).setInteractive({ useHandCursor: true }).setDepth(5);
        useBtn.on('pointerover',  () => useBtn.setFillStyle(0x2a4a8a));
        useBtn.on('pointerout',   () => useBtn.setFillStyle(0x1a2a5a));
        useBtn.on('pointerdown',  () => {
          const idx = this._selectedConsumableIndex;
          this._selectedConsumableIndex = null;
          console.log(`Used ${cons.name}`);
          run.useConsumable(idx);
          this._clearObjs(this._consumableObjs);
          this._clearObjs(this._actionBtnObjs);
          this._renderConsumables();
          this._renderActionButtons();
        });
        this._actionBtnObjs.push(useBtn);
        this._actionBtnObjs.push(
          this.add.text(PLAY_CX, y, `Use: ${cons.name}`, {
            fontSize: '15px', color: '#aaddff',
          }).setOrigin(0.5).setDepth(5)
        );
      }
      return;
    }

    if (!idle || count === 0) return;

    const y           = 700;
    const playEnabled = count === 1;

    // ── Play button ───────────────────────────────────────────────────────
    const playBtn = this.add.rectangle(PLAY_CX - 90, y, 160, 40,
      playEnabled ? 0x1a6a1a : 0x222a22)
      .setStrokeStyle(2, playEnabled ? 0x44aa44 : 0x334433).setDepth(5);
    if (playEnabled) {
      playBtn.setInteractive({ useHandCursor: true });
      playBtn.on('pointerover',  () => playBtn.setFillStyle(0x2a9a2a));
      playBtn.on('pointerout',   () => playBtn.setFillStyle(0x1a6a1a));
      playBtn.on('pointerdown',  () => this._onPlayButton());
    }
    this._actionBtnObjs.push(playBtn);
    this._actionBtnObjs.push(
      this.add.text(PLAY_CX - 90, y, 'Play', {
        fontSize: '16px', color: playEnabled ? '#ffffff' : '#445544',
      }).setOrigin(0.5).setDepth(5)
    );

    // ── Discard button ────────────────────────────────────────────────────
    const discardBtn = this.add.rectangle(PLAY_CX + 90, y, 160, 40, 0x6a3a1a)
      .setStrokeStyle(2, 0xaa7744).setInteractive({ useHandCursor: true }).setDepth(5);
    discardBtn.on('pointerover',  () => discardBtn.setFillStyle(0x9a5a2a));
    discardBtn.on('pointerout',   () => discardBtn.setFillStyle(0x6a3a1a));
    discardBtn.on('pointerdown',  () => this._onDiscardButton());
    this._actionBtnObjs.push(discardBtn);
    this._actionBtnObjs.push(
      this.add.text(PLAY_CX + 90, y, 'Discard', {
        fontSize: '16px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(5)
    );
  }

  _onPlayButton() {
    const [cardId] = [...this._selectedCardIds];
    this._selectedCardIds.clear();
    this._clearObjs(this._actionBtnObjs);
    this._playCard(cardId);
  }

  _onDiscardButton() {
    if (this._animating) return;
    const cardIds = [...this._selectedCardIds];
    this._selectedCardIds.clear();
    this._clearObjs(this._actionBtnObjs);

    let result;
    try {
      result = this._round.discardCards(cardIds);
    } catch (e) {
      console.error('[GameScene] discardCards error:', e.message);
      return;
    }

    if (result.status === 'round_over') {
      this._renderAll();
      this._showEndScreen(result);
    } else {
      const n = result.removed.length;
      this._setStatus(`Discarded ${n} card${n > 1 ? 's' : ''}  —  play your next card.`);
      this._renderAll();
    }
  }

  // ── Play a card ────────────────────────────────────────────────────────────

  _playCard(cardId) {
    if (this._animating) return;

    let handResult;
    try {
      handResult = this._round.playHandCard(cardId);
    } catch (e) {
      console.error('[GameScene] playHandCard error:', e.message);
      return;
    }

    this._animating = true;
    this._renderAll();

    const handDiscardSprs = handResult.discarded.map((card, i) =>
      this.add.image(DECK_X, DISCARD_Y - 40 + i * 20, card.id)
        .setScale(CARD_SCALE).setTint(TINT_DISCARD).setDepth(10)
    );

    this.time.delayedCall(500, () => {
      for (const spr of handDiscardSprs) spr.destroy();

      let deckResult;
      try {
        deckResult = this._round.playDeckPhase();
      } catch (e) {
        console.error('[GameScene] playDeckPhase error:', e.message);
        this._animating = false;
        return;
      }

      this._showDeckAnimation(deckResult, () => {
        this._animating = false;
        this._handleResult(deckResult);
      });
    });
  }

  // ── Deck-flip animation ────────────────────────────────────────────────────

  _showDeckAnimation(result, onComplete) {
    const temp = [];

    if (result.deckCard) {
      const spr = this.add.image(FLIP_X, FLIP_Y, result.deckCard.id)
        .setScale(CARD_SCALE * 0.5).setDepth(10);
      temp.push(spr);
      this.tweens.add({
        targets: spr, scaleX: CARD_SCALE * 1.15, scaleY: CARD_SCALE * 1.15,
        duration: 220, ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: spr, alpha: 0,
            delay: FLIP_HOLD - 470, duration: 250, ease: 'Linear',
          });
        },
      });
    }

    for (let i = 0; i < result.discarded.length; i++) {
      const card = result.discarded[i];
      const spr  = this.add.image(DECK_X, DISCARD_Y - 40 + i * 20, card.id)
        .setScale(CARD_SCALE).setTint(TINT_DISCARD).setDepth(10);
      temp.push(spr);
      this.tweens.add({ targets: spr, alpha: 0, duration: FLIP_HOLD - 100, ease: 'Linear' });
    }

    this.time.delayedCall(FLIP_HOLD, () => {
      for (const obj of temp) obj.destroy();
      onComplete();
    });
  }

  // ── Result dispatcher ─────────────────────────────────────────────────────

  _handleResult(result) {
    switch (result.status) {
      case 'ok':
        if (result.discarded.length > 0) {
          this._setStatus('Card discarded (field full)  —  play your next card.');
        } else {
          const dn = result.deckCard ? result.deckCard.name : '—';
          this._setStatus(`Deck: ${dn}  —  play your next card.`);
        }
        this._renderAll();
        break;

      case 'yaku_decision':
        this._renderAll();
        this._showYakuDecision(result);
        break;

      case 'round_over':
      case 'banked':
        this._renderAll();
        this._showEndScreen(result);
        break;
    }
  }

  // ── Info text updates ─────────────────────────────────────────────────────

  _updateInfoTexts() {
    const sc           = this._round.getCurrentScoring();
    const drawSize     = this._round.deck.drawPileSize;
    const discardCount = this._round.discardCount;

    this._baseText.setText(`Base: ${sc.basePoints}`);
    this._multiText.setText(`\xD7${sc.totalMultiplier.toFixed(2)}`);
    this._projText.setText(`= ${sc.finalScore}`);

    this._turnText.setText(`Turn: ${this._round.turn}`);
    this._playsText.setText(`Plays: ${this._round.playsRemaining}`);
    this._kiText.setText(`Ki: ${run.ki}`);

    // Deck pile.
    this._deckSprite.setVisible(drawSize > 0);
    this._deckCountText.setText(String(drawSize));

    // Discard pile.
    this._discardSprite.setVisible(discardCount > 0);
    this._discardCountText.setVisible(discardCount > 0);
    this._discardCountText.setText(String(discardCount));
  }

  // ── End screen ────────────────────────────────────────────────────────────

  _showEndScreen(result) {
    this._clearObjs(this._overlayObjs);

    const cx = PLAY_CX, cy = 330;
    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 720, 480, 0x080d1a, 0.93).setStrokeStyle(2, 0x3a6080)
    );

    const title = result.status === 'banked' ? 'Score Banked!' : 'Round Over';
    this._overlayObjs.push(
      this.add.text(cx, cy - 210, title, {
        fontSize: '34px',
        color: result.status === 'banked' ? '#88dd88' : '#e8c96a',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5)
    );

    let y = cy - 158;

    this._overlayObjs.push(
      this.add.text(cx, y, `Base Points: ${result.basePoints}`, {
        fontSize: '18px', color: '#aaccee',
      }).setOrigin(0.5)
    );
    y += 34;

    if (result.allYaku.length === 0) {
      this._overlayObjs.push(
        this.add.text(cx, y, 'No yaku scored this round.', {
          fontSize: '15px', color: '#778899',
        }).setOrigin(0.5)
      );
      y += 26;
    } else {
      for (const yaku of result.allYaku) {
        this._overlayObjs.push(
          this.add.text(cx, y, `${yaku.name}  \xD7${yaku.multiplier.toFixed(1)}`, {
            fontSize: '16px', color: '#cce0ff',
          }).setOrigin(0.5)
        );
        y += 25;
      }
    }
    y += 10;

    this._overlayObjs.push(
      this.add.text(cx, y, `Combined Multiplier: \xD7${result.totalMultiplier.toFixed(2)}`, {
        fontSize: '17px', color: '#ffee88',
      }).setOrigin(0.5)
    );
    y += 32;

    if (result.penaltyApplied) {
      const lossPct  = Math.round(result.penaltyRate * 100);
      const keepMult = (1 - result.penaltyRate).toFixed(1);
      this._overlayObjs.push(
        this.add.text(cx, y, `\u26A0 Push penalty: ${lossPct}% lost (\xD7${keepMult})`, {
          fontSize: '15px', color: '#ff8866',
        }).setOrigin(0.5)
      );
      y += 28;
    }

    this._overlayObjs.push(
      this.add.text(cx, y, `Final Score: ${result.finalScore}`, {
        fontSize: '24px', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5)
    );
    y += 36;

    const kiEarned = run.calculateKiReward(result, 100);
    this._overlayObjs.push(
      this.add.text(cx, y, `Ki earned: +${kiEarned}`, {
        fontSize: '16px', color: '#ffee88',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5)
    );

    const btnY = cy + 188;
    const btn  = this.add.rectangle(cx, btnY, 230, 46, 0x1a4a6a)
      .setStrokeStyle(2, 0x4488aa).setInteractive({ useHandCursor: true });
    btn.on('pointerover',  () => btn.setFillStyle(0x2a6a9a));
    btn.on('pointerout',   () => btn.setFillStyle(0x1a4a6a));
    btn.on('pointerdown',  () => {
      run.addKi(kiEarned);
      run.advanceRound(result.finalScore);
      this.scene.start('ShrineScene');
    });
    this._overlayObjs.push(btn);
    this._overlayObjs.push(
      this.add.text(cx, btnY, 'Visit Shrine', { fontSize: '18px', color: '#ffffff' })
        .setOrigin(0.5)
    );
  }

  _restartRound() {
    this._closeCaptureOverlay();
    this._closeYakuGuide();
    this._clearObjs(this._overlayObjs);
    this._selectedCardIds.clear();
    this._selectedConsumableIndex = null;
    this._round.startRound();
    this._afterRoundStart();
    this._renderAll();
  }

  // ── Yaku decision overlay ─────────────────────────────────────────────────

  _showYakuDecision(result) {
    this._clearObjs(this._overlayObjs);
    const cx = PLAY_CX, cy = 270;

    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 490, 230, 0x080d1a, 0.96)
        .setStrokeStyle(2, 0x6a9a3a).setDepth(25)
    );
    this._overlayObjs.push(
      this.add.text(cx, cy - 97, 'Yaku Completed!', {
        fontSize: '20px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25)
    );

    let y = cy - 68;
    for (const yaku of result.newYaku) {
      this._overlayObjs.push(
        this.add.text(cx, y, `${yaku.name}  \xD7${yaku.multiplier.toFixed(1)}`, {
          fontSize: '16px', color: '#ffee88',
        }).setOrigin(0.5).setDepth(25)
      );
      y += 23;
    }

    y += 6;
    this._overlayObjs.push(
      this.add.text(cx, y,
        `Base ${result.basePoints}  \xD7  ${result.totalMultiplier.toFixed(2)}  =  ${result.finalScore} pts`,
        { fontSize: '15px', color: '#cce0ff' }
      ).setOrigin(0.5).setDepth(25)
    );

    const btnY = cy + 86;

    const bankBtn = this.add.rectangle(cx - 118, btnY, 206, 42, 0x1a6a1a)
      .setStrokeStyle(2, 0x44aa44).setInteractive({ useHandCursor: true }).setDepth(25);
    bankBtn.on('pointerover',  () => bankBtn.setFillStyle(0x2a9a2a));
    bankBtn.on('pointerout',   () => bankBtn.setFillStyle(0x1a6a1a));
    bankBtn.on('pointerdown',  () => {
      const bankedResult = this._round.bankScore();
      this._clearObjs(this._overlayObjs);
      this._renderAll();
      this._showEndScreen(bankedResult);
    });
    this._overlayObjs.push(bankBtn);
    this._overlayObjs.push(
      this.add.text(cx - 118, btnY, `Bank  (keep ${result.finalScore})`, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(25)
    );

    const pushBtn = this.add.rectangle(cx + 118, btnY, 206, 42, 0x6a1a1a)
      .setStrokeStyle(2, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(25);
    pushBtn.on('pointerover',  () => pushBtn.setFillStyle(0x9a2a2a));
    pushBtn.on('pointerout',   () => pushBtn.setFillStyle(0x6a1a1a));
    pushBtn.on('pointerdown',  () => {
      const { pushPenaltyPct } = this._round.pushOn();
      this._clearObjs(this._overlayObjs);
      this._setStatus(`Pushed! Complete another yaku or lose ${pushPenaltyPct}% of your score.`);
      this._renderAll();
    });
    this._overlayObjs.push(pushBtn);
    this._overlayObjs.push(
      this.add.text(cx + 118, btnY, `Push  (new hand, risk ${result.nextPushPenaltyPct}%)`, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(25)
    );
  }

  // ── Round-start helper ────────────────────────────────────────────────────

  _afterRoundStart() {
    const naturals = this._round.naturalCaptures;
    if (naturals.length > 0) {
      const names = naturals.map(cards => {
        const prefix = cards[0].id.split('_')[0];
        return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      });
      this._setStatus(
        `Natural full month${naturals.length > 1 ? 's' : ''} captured: ` +
        `${names.join(', ')}!  Play a card.`
      );
    } else {
      this._setStatus('Play a card from your hand.');
    }
  }

  // ── Yaku Guide overlay ────────────────────────────────────────────────────

  _showYakuGuide() {
    if (this._yakuGuideOpen) return;
    this._yakuGuideOpen = true;
    this._clearObjs(this._handObjs);
    this._renderHand();

    const cx = 640, cy = 360;
    const objs = this._yakuGuideObjs;

    objs.push(
      this.add.rectangle(cx, cy, 820, 490, 0x080d1a, 0.96)
        .setStrokeStyle(2, 0x3a6080).setDepth(20)
    );
    objs.push(
      this.add.text(cx, cy - 215, 'Yaku Reference', {
        fontSize: '22px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20)
    );
    objs.push(this.add.rectangle(cx, cy - 195, 760, 1, 0x3a6080).setDepth(20));

    let y = cy - 178;
    for (const yaku of Object.values(YAKU_INFO)) {
      objs.push(
        this.add.text(cx - 360, y, `${yaku.name}  \xD7${yaku.multiplier.toFixed(1)}`, {
          fontSize: '14px', color: '#ffee88',
        }).setOrigin(0, 0.5).setDepth(20)
      );
      objs.push(
        this.add.text(cx - 165, y, yaku.description, {
          fontSize: '13px', color: '#aabbcc',
        }).setOrigin(0, 0.5).setDepth(20)
      );
      y += 27;
    }

    const closeY   = cy + 215;
    const closeBtn = this.add.rectangle(cx, closeY, 140, 36, 0x1a4a6a)
      .setStrokeStyle(2, 0x4488aa).setInteractive({ useHandCursor: true }).setDepth(20);
    closeBtn.on('pointerover',  () => closeBtn.setFillStyle(0x2a6a9a));
    closeBtn.on('pointerout',   () => closeBtn.setFillStyle(0x1a4a6a));
    closeBtn.on('pointerdown',  () => this._closeYakuGuide());
    objs.push(closeBtn);
    objs.push(
      this.add.text(cx, closeY, 'Close', { fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(20)
    );
  }

  _closeYakuGuide() {
    if (!this._yakuGuideOpen) return;
    this._yakuGuideOpen = false;
    this._clearObjs(this._yakuGuideObjs);
    this._clearObjs(this._handObjs);
    this._renderHand();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _clearObjs(arr) {
    for (const obj of arr) obj.destroy();
    arr.length = 0;
  }

  _setStatus(msg) {
    this._statusText.setText(msg);
  }
}
