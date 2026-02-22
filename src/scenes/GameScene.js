import GameRoundManager      from '../systems/GameRoundManager.js';
import { YAKU_INFO }         from '../systems/ScoringEngine.js';
import run                   from '../systems/RunManager.js';

// ── Layout constants ───────────────────────────────────────────────────────────
// Canvas is 1280 × 720.
// Left panel  (x   0–170): deck + discard + capture stack
// Play area   (x 170–1120): field + hand, centred at PLAY_CX
// Right panel (x 1120–1280): spirit column

const CARD_W     = 105;   // natural image size
const CARD_H     = 159;
const CARD_SCALE = 0.85;  // all card sprites rendered at 85 %

const PLAY_CX = 530;   // horizontal centre of the field + hand area

// ── Left panel (deck + discard + capture stack) ────────────────────────────
const DECK_X     = 85;   // deck card back centre x
const DECK_Y     = 210;  // deck card back centre y
const DISCARD_X  = 85;   // discard area centre x
const DISCARD_Y  = 390;  // discard animation / static display y

// When the deck flips, the face-up card is revealed here for FLIP_HOLD ms.
const FLIP_X     = 85;
const FLIP_Y     = 210;
const FLIP_HOLD  = 800;  // ms the flipped card stays visible

// Face-down capture stack (below discard area).
const CAP_STACK_X = DECK_X;
const CAP_STACK_Y = 530;

// ── Field ──────────────────────────────────────────────────────────────────
// Up to 8 slots in a 4-column × 2-row grid.
const SLOT_COLS  = 4;
const SLOT_XS    = [260, 415, 570, 725]; // 4 columns, ~155 px apart
const SLOT_YS    = [160, 400];           // 2 row centres
const SLOT_FAN_X = 12;   // x offset per stacked card (rightward)
const SLOT_FAN_Y = 15;   // y offset per stacked card (downward)

// Slot background — dark placeholder drawn for all 8 positions, empty or not.
// Slightly larger than a single scaled card (105×159 at 0.85 → ~89×135 px).
const SLOT_BG_W  = Math.round(CARD_W * CARD_SCALE) + 8;   // ≈ 97 px
const SLOT_BG_H  = Math.round(CARD_H * CARD_SCALE) + 8;   // ≈ 143 px

// ── Hand ───────────────────────────────────────────────────────────────────
const HAND_STEP  = 88;
const HAND_Y     = 638;

// ── Right panel: spirit column ────────────────────────────────────────────
const SPIRIT_CARD_W = 140;
const SPIRIT_CARD_H = 45;
const SPIRIT_X      = 1195;   // horizontal centre of the right panel
const SPIRIT_TOP    = 80;     // y centre of the first spirit slot
const SPIRIT_STEP   = 60;     // vertical distance between spirit slots

// ── Consumable cards (right of hand area) ─────────────────────────────────
const CONS_CARD_W  = 80;
const CONS_CARD_H  = 50;
const CONS_X_START = 925;    // centre x of first consumable slot
const CONS_STEP    = 88;     // horizontal step between slots
// Consumables share HAND_Y for their vertical centre.

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
const TINT_PENDING  = 0xffee33;  // gold  — pending-match slot
const TINT_DIM      = 0x445566;  // slate — non-interactive
const TINT_HOVER    = 0xddeeff;  // ice   — hand hover
const TINT_DISCARD  = 0xff2222;  // red   — discarded card flash

// ─────────────────────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this._round          = new GameRoundManager();
    this._animating      = false;   // true while a turn animation is playing
    this._yakuGuideOpen  = false;   // true while the Yaku Reference overlay is shown
    this._captureOverlayOpen = false; // true while the captured-cards overlay is shown

    // Mutable sprite arrays — cleared and rebuilt each render.
    this._handObjs           = [];
    this._fieldObjs          = [];
    this._captureObjs        = [];   // face-down stack + badge
    this._spiritObjs         = [];   // spirit column cards
    this._consumableObjs     = [];   // consumable cards near hand
    this._overlayObjs        = [];
    this._captureOverlayObjs = [];
    this._yakuGuideObjs      = [];
    this._actionBtnObjs      = [];

    /** IDs of hand cards currently selected by the player. */
    this._selectedCardIds = new Set();

    /** Index of the selected consumable (null = none). */
    this._selectedConsumableIndex = null;

    this._createCardBackTexture();
    this._buildStaticUI();

    this._round.startRound();
    this._afterRoundStart();
    this._renderAll();
  }

  // ── Card-back texture (generated once at startup) ──────────────────────────

  _createCardBackTexture() {
    const g = this.make.graphics({ add: false });
    const w = CARD_W, h = CARD_H;
    // Outer border / shadow
    g.fillStyle(0x0d1b2a);
    g.fillRect(0, 0, w, h);
    // Card surface
    g.fillStyle(0x1a3550);
    g.fillRect(3, 3, w - 6, h - 6);
    // Inner border
    g.lineStyle(1, 0x4488aa, 0.9);
    g.strokeRect(8, 8, w - 16, h - 16);
    // Diagonal cross
    g.lineStyle(1, 0x336688, 0.5);
    g.lineBetween(8, 8, w - 8, h - 8);
    g.lineBetween(w - 8, 8, 8, h - 8);
    g.generateTexture('card_back', w, h);
    g.destroy();
  }

  // ── Static UI (created once, never destroyed) ──────────────────────────────

  _buildStaticUI() {
    const labelStyle = { fontSize: '12px', color: '#556677' };

    // ── Zone labels ───────────────────────────────────────────────────────
    this.add.text(PLAY_CX,    38,  'FIELD',     labelStyle).setOrigin(0.5, 0);
    this.add.text(PLAY_CX,    551, 'HAND',      labelStyle).setOrigin(0.5, 0);
    this.add.text(SPIRIT_X,   50,  'SPIRITS',   labelStyle).setOrigin(0.5, 0);
    this.add.text(DECK_X,     50,  'DECK',      labelStyle).setOrigin(0.5, 0);
    this.add.text(DISCARD_X,  360, 'DISCARDS',  labelStyle).setOrigin(0.5, 0);
    this.add.text(CAP_STACK_X, 445, 'CAPTURED', labelStyle).setOrigin(0.5, 0);

    // ── Dividers ──────────────────────────────────────────────────────────
    this.add.rectangle(PLAY_CX, 543, 940, 1, 0x2a3a50);  // field / hand
    this.add.rectangle(170,  360, 1, 680, 0x1e2d40);      // left panel edge
    this.add.rectangle(1120, 360, 1, 680, 0x1e2d40);      // right panel edge

    // ── Status bar ────────────────────────────────────────────────────────
    this._statusText = this.add.text(PLAY_CX, 14, '', {
      fontSize: '17px',
      color: '#e8e8e8',
      stroke: '#0a0f1e',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Score display (three lines: base · multiplier · projected) ────────
    // Horizontally between the rightmost field column (x≈725) and the right
    // panel (x=1120); vertically centred in the gap between field rows.
    this._baseText = this.add.text(920, 262, '', {
      fontSize: '13px',
      color: '#aaccee',
    }).setOrigin(0.5, 0);
    this._multiText = this.add.text(920, 280, '', {
      fontSize: '16px',
      color: '#ffee88',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
    this._projText = this.add.text(920, 301, '', {
      fontSize: '13px',
      color: '#ffffff',
    }).setOrigin(0.5, 0);

    // ── Yaku Guide button ("?") — top-left, next to Turn/Plays counters ───
    const guideBtn = this.add.rectangle(200, 18, 26, 20, 0x1a3550)
      .setStrokeStyle(1, 0x3a6080)
      .setInteractive({ useHandCursor: true });
    guideBtn.on('pointerover',  () => guideBtn.setFillStyle(0x2a5a80));
    guideBtn.on('pointerout',   () => guideBtn.setFillStyle(0x1a3550));
    guideBtn.on('pointerdown',  () => this._showYakuGuide());
    this.add.text(200, 18, '?', {
      fontSize: '13px', color: '#aaccee',
    }).setOrigin(0.5);

    // ── Turn counter + plays remaining (top-left) ─────────────────────────
    this._turnText = this.add.text(10, 10, '', {
      fontSize: '13px',
      color: '#556677',
    });
    this._playsText = this.add.text(10, 26, '', {
      fontSize: '13px',
      color: '#556677',
    });

    // ── Ki balance (top-right) ─────────────────────────────────────────────
    this._kiText = this.add.text(1270, 10, '', {
      fontSize: '13px',
      color: '#ffee88',
    }).setOrigin(1, 0);

    // ── Deck display ─────────────────────────────────────────────────────
    // Card-back sprite (hidden when deck is empty).
    this._deckSprite = this.add.image(DECK_X, DECK_Y, 'card_back')
      .setScale(CARD_SCALE);

    // Count badge below the deck sprite.
    this._deckCountText = this.add.text(DECK_X, DECK_Y + 70, '32', {
      fontSize: '18px',
      color: '#aaccee',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Discard display ───────────────────────────────────────────────────
    this._discardCountText = this.add.text(DISCARD_X, DISCARD_Y, '0', {
      fontSize: '18px',
      color: '#cc4444',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0);
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
    // Cards are interactive only when idle, not mid-animation, and no overlay open.
    const idle   = this._round.phase === 'idle' && !this._animating
                    && !this._yakuGuideOpen && !this._captureOverlayOpen;
    const startX = PLAY_CX - ((n - 1) * HAND_STEP) / 2;

    for (let i = 0; i < n; i++) {
      const card     = cards[i];
      const selected = this._selectedCardIds.has(card.id);
      const x        = startX + i * HAND_STEP;
      // Selected cards rise 20 px above the normal hand row.
      const y        = HAND_Y - (selected ? 20 : 0);
      const spr      = this.add.image(x, y, card.id).setScale(CARD_SCALE);

      if (idle) {
        spr.setInteractive({ useHandCursor: true });
        // Selected cards show the highlight tint permanently.
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

    // Draw dark background placeholders for all 8 slot positions so the
    // field grid is always visible, even when slots are empty.
    for (let i = 0; i < 8; i++) {
      const col = i % SLOT_COLS;
      const row = Math.floor(i / SLOT_COLS);
      const bg  = this.add.rectangle(
        SLOT_XS[col], SLOT_YS[row],
        SLOT_BG_W, SLOT_BG_H,
        0x0a1628
      );
      this._fieldObjs.push(bg);
    }

    // Render slot cards on top of the backgrounds.
    // slots[i] may be null for empty (captured) positions — skip those.
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;

      const col   = i % SLOT_COLS;
      const row   = Math.floor(i / SLOT_COLS);
      const slotX = SLOT_XS[col];
      const slotY = SLOT_YS[row];

      for (let j = 0; j < slot.cards.length; j++) {
        const spr = this.add.image(
          slotX + j * SLOT_FAN_X,
          slotY + j * SLOT_FAN_Y,
          slot.cards[j].id
        ).setScale(CARD_SCALE);
        if (slot.state === 'pending') spr.setTint(TINT_PENDING);
        this._fieldObjs.push(spr);
      }
    }
  }

  // ── Spirit column (right panel) ───────────────────────────────────────────

  _renderSpiritColumn() {
    const spirits = run.spirits;

    for (let i = 0; i < MAX_SPIRIT_SLOTS; i++) {
      const spirit = spirits[i];
      const y      = SPIRIT_TOP + i * SPIRIT_STEP;

      if (!spirit) {
        // Empty slot — dim outline only.
        const slot = this.add.rectangle(SPIRIT_X, y, SPIRIT_CARD_W, SPIRIT_CARD_H, 0x0a1628)
          .setStrokeStyle(1, 0x1e2d40);
        this._spiritObjs.push(slot);
        continue;
      }

      // Card background.
      const card = this.add.rectangle(SPIRIT_X, y, SPIRIT_CARD_W, SPIRIT_CARD_H, 0x0d1b2a)
        .setStrokeStyle(1, 0x2a3a50);
      this._spiritObjs.push(card);

      // Rarity left-border strip.
      const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;
      const border    = this.add.rectangle(
        SPIRIT_X - SPIRIT_CARD_W / 2 + 2, y, 4, SPIRIT_CARD_H - 4, rarityCol
      );
      this._spiritObjs.push(border);

      // Name label.
      const nameText = this.add.text(
        SPIRIT_X - SPIRIT_CARD_W / 2 + 10, y,
        spirit.name,
        { fontSize: '11px', color: '#cce0ff' }
      ).setOrigin(0, 0.5);
      this._spiritObjs.push(nameText);

      // Hover tooltip — appears to the left of the card.
      const tooltip = this.add.text(
        SPIRIT_X - SPIRIT_CARD_W / 2 - 8, y,
        spirit.description,
        {
          fontSize: '11px',
          color: '#e8e8e8',
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

  // ── Capture stack (left panel, below discard area) ────────────────────────

  _renderCaptureStack() {
    const count = this._round.capture.getAll().length;

    // Face-down card-back sprite.
    const stackSpr = this.add.image(CAP_STACK_X, CAP_STACK_Y, 'card_back')
      .setScale(CARD_SCALE)
      .setVisible(count > 0);
    this._captureObjs.push(stackSpr);

    // Count badge.
    const badge = this.add.text(CAP_STACK_X, CAP_STACK_Y + 70, String(count), {
      fontSize: '18px',
      color: '#aaccee',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0);
    this._captureObjs.push(badge);

    // Click to open captured-cards overlay.
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
        // Empty slot — dim outline.
        const slot = this.add.rectangle(x, HAND_Y, CONS_CARD_W, CONS_CARD_H, 0x0a1628)
          .setStrokeStyle(1, 0x1e2d40);
        this._consumableObjs.push(slot);
        continue;
      }

      // Card background, highlighted when selected.
      const rarityCol = RARITY_COLOR[cons.rarity] ?? RARITY_COLOR.common;
      const card = this.add.rectangle(x, y, CONS_CARD_W, CONS_CARD_H, 0x0d1b2a)
        .setStrokeStyle(2, selected ? rarityCol : 0x2a3a50);
      this._consumableObjs.push(card);

      // Rarity top-border strip.
      const border = this.add.rectangle(
        x, y - CONS_CARD_H / 2 + 2, CONS_CARD_W - 4, 4, rarityCol
      );
      this._consumableObjs.push(border);

      // Name label.
      const nameText = this.add.text(x, y + 4, cons.name, {
        fontSize: '10px', color: '#cce0ff',
      }).setOrigin(0.5, 0.5);
      this._consumableObjs.push(nameText);

      // Hover tooltip — appears above the card.
      const tooltip = this.add.text(x, HAND_Y - CONS_CARD_H - 8, cons.description, {
        fontSize: '11px',
        color: '#e8e8e8',
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

    // Dim hand while overlay is open.
    this._clearObjs(this._handObjs);
    this._renderHand();

    const cards = this._round.capture.getAll();
    const cx    = PLAY_CX;
    const cy    = 330;
    const objs  = this._captureOverlayObjs;

    // Background panel.
    objs.push(
      this.add.rectangle(cx, cy, 800, 500, 0x080d1a, 0.95)
        .setStrokeStyle(2, 0x3a6080)
        .setDepth(20)
    );

    objs.push(
      this.add.text(cx, cy - 228, 'Captured Cards', {
        fontSize: '20px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20)
    );

    objs.push(
      this.add.rectangle(cx, cy - 208, 740, 1, 0x3a6080).setDepth(20)
    );

    if (cards.length === 0) {
      objs.push(
        this.add.text(cx, cy, 'No cards captured yet.', {
          fontSize: '15px', color: '#778899',
        }).setOrigin(0.5).setDepth(20)
      );
    } else {
      // Organise cards by type.
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

        // Lay out in rows of up to ROW_MAX.
        let rowStart = 0;
        while (rowStart < group.length) {
          const rowCards = group.slice(rowStart, rowStart + ROW_MAX);
          const rowW     = rowCards.length * (OV_W + OV_GAP) - OV_GAP;
          const startX   = cx - rowW / 2 + OV_W / 2;
          for (let j = 0; j < rowCards.length; j++) {
            const spr = this.add.image(
              startX + j * (OV_W + OV_GAP),
              y + OV_H / 2,
              rowCards[j].id
            ).setScale(OV_SCALE).setDepth(20);
            objs.push(spr);
          }
          y      += OV_H + OV_GAP + 4;
          rowStart += ROW_MAX;
        }
        y += 8;
      }
    }

    // Close button.
    const closeY   = cy + 224;
    const closeBtn = this.add.rectangle(cx, closeY, 140, 36, 0x1a4a6a)
      .setStrokeStyle(2, 0x4488aa)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x2a6a9a));
    closeBtn.on('pointerout',  () => closeBtn.setFillStyle(0x1a4a6a));
    closeBtn.on('pointerdown', () => this._closeCaptureOverlay());
    objs.push(closeBtn);
    objs.push(
      this.add.text(cx, closeY, 'Close', {
        fontSize: '15px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(20)
    );
  }

  _closeCaptureOverlay() {
    if (!this._captureOverlayOpen) return;
    this._captureOverlayOpen = false;
    this._clearObjs(this._captureOverlayObjs);
    // Restore hand interactivity.
    this._clearObjs(this._handObjs);
    this._renderHand();
  }

  // ── Card selection ─────────────────────────────────────────────────────────

  _toggleCardSelection(cardId) {
    if (this._selectedCardIds.has(cardId)) {
      this._selectedCardIds.delete(cardId);
    } else {
      this._selectedCardIds.add(cardId);
      // Mutual exclusivity: deselect any selected consumable.
      this._selectedConsumableIndex = null;
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
      // Mutual exclusivity: deselect all hand cards.
      this._selectedCardIds.clear();
    }
    this._clearObjs(this._handObjs);
    this._clearObjs(this._consumableObjs);
    this._clearObjs(this._actionBtnObjs);
    this._renderHand();
    this._renderConsumables();
    this._renderActionButtons();
  }

  _renderActionButtons() {
    const idle  = this._round.phase === 'idle' && !this._animating
                    && !this._yakuGuideOpen && !this._captureOverlayOpen;
    const count = this._selectedCardIds.size;

    // ── Use button for selected consumable ────────────────────────────────
    if (idle && this._selectedConsumableIndex !== null) {
      const cons = run.consumables[this._selectedConsumableIndex];
      if (cons) {
        const y = 700;
        const useBtn = this.add.rectangle(PLAY_CX, y, 180, 40, 0x1a2a5a)
          .setStrokeStyle(2, 0x4466cc)
          .setInteractive({ useHandCursor: true })
          .setDepth(5);
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
      .setStrokeStyle(2, playEnabled ? 0x44aa44 : 0x334433)
      .setDepth(5);
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
      .setStrokeStyle(2, 0xaa7744)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);
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

  // ── Play a card (Phase 1 + Phase 2) ───────────────────────────────────────

  _playCard(cardId) {
    if (this._animating) return;

    // ── Phase 1: hand phase ───────────────────────────────────────────────
    let handResult;
    try {
      handResult = this._round.playHandCard(cardId);
    } catch (e) {
      console.error('[GameScene] playHandCard error:', e.message);
      return;
    }

    this._animating = true;

    // Re-render board showing the intermediate state:
    //   • hand has one fewer card (dimmed, not interactive)
    //   • field shows the pending-match slot (gold tint) or a new slot
    //   • capture pile updated if 4-card auto-capture occurred
    this._renderAll();

    // Flash hand-phase discard (field was full, card couldn't land).
    const handDiscardSprs = handResult.discarded.map((card, i) =>
      this.add.image(DISCARD_X, DISCARD_Y - 40 + i * 20, card.id)
        .setScale(CARD_SCALE)
        .setTint(TINT_DISCARD)
        .setDepth(10)
    );

    // ── Phase 2: deck phase after a 500 ms pause ──────────────────────────
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

  /**
   * Reveal the flipped deck card (and any deck-phase discard) for FLIP_HOLD ms,
   * then call onComplete so the board re-renders to its final state.
   *
   * All temporary sprites are destroyed before onComplete fires.
   */
  _showDeckAnimation(result, onComplete) {
    const temp = [];

    // ── Deck flip reveal ──────────────────────────────────────────────────
    if (result.deckCard) {
      const spr = this.add.image(FLIP_X, FLIP_Y, result.deckCard.id)
        .setScale(CARD_SCALE * 0.5)
        .setDepth(10);
      temp.push(spr);

      // Pop in quickly, hold, then fade out over the last 250 ms.
      this.tweens.add({
        targets:  spr,
        scaleX:   CARD_SCALE * 1.15,
        scaleY:   CARD_SCALE * 1.15,
        duration: 220,
        ease:     'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets:  spr,
            alpha:    0,
            delay:    FLIP_HOLD - 470,
            duration: 250,
            ease:     'Linear',
          });
        },
      });
    }

    // ── Deck-phase discard flash ───────────────────────────────────────────
    for (let i = 0; i < result.discarded.length; i++) {
      const card = result.discarded[i];
      const spr  = this.add.image(DISCARD_X, DISCARD_Y - 40 + i * 20, card.id)
        .setScale(CARD_SCALE)
        .setTint(TINT_DISCARD)
        .setDepth(10);
      temp.push(spr);

      this.tweens.add({
        targets:  spr,
        alpha:    0,
        duration: FLIP_HOLD - 100,
        ease:     'Linear',
      });
    }

    // ── Cleanup ───────────────────────────────────────────────────────────
    this.time.delayedCall(FLIP_HOLD, () => {
      for (const obj of temp) obj.destroy();
      onComplete();
    });
  }

  // ── Result dispatcher ─────────────────────────────────────────────────────

  _handleResult(result) {
    switch (result.status) {

      case 'ok': {
        if (result.discarded.length > 0) {
          this._setStatus(`Card discarded (field full)  —  play your next card.`);
        } else {
          const dn = result.deckCard ? result.deckCard.name : '—';
          this._setStatus(`Deck: ${dn}  —  play your next card.`);
        }
        this._renderAll();
        break;
      }

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
    const sc       = this._round.getCurrentScoring();
    const drawSize = this._round.deck.drawPileSize;

    this._baseText.setText(`Base: ${sc.basePoints}`);
    this._multiText.setText(`\xD7${sc.totalMultiplier.toFixed(2)}`);
    this._projText.setText(`= ${sc.finalScore}`);

    this._turnText.setText(`Turn: ${this._round.turn}`);
    this._playsText.setText(`Plays: ${this._round.playsRemaining}`);
    this._kiText.setText(`Ki: ${run.ki}`);

    // Deck visual
    this._deckSprite.setVisible(drawSize > 0);
    this._deckCountText.setText(String(drawSize));

    // Discard counter
    this._discardCountText.setText(String(this._round.discardCount));
  }

  // ── End screen ────────────────────────────────────────────────────────────

  _showEndScreen(result) {
    this._clearObjs(this._overlayObjs);

    const cx = PLAY_CX;
    const cy = 330;

    const bg = this.add
      .rectangle(cx, cy, 720, 480, 0x080d1a, 0.93)
      .setStrokeStyle(2, 0x3a6080);
    this._overlayObjs.push(bg);

    const title = result.status === 'banked' ? 'Score Banked!' : 'Round Over';
    this._overlayObjs.push(
      this.add.text(cx, cy - 210, title, {
        fontSize: '34px',
        color: result.status === 'banked' ? '#88dd88' : '#e8c96a',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5)
    );

    let y = cy - 158;

    // ── Base points ───────────────────────────────────────────────────────
    this._overlayObjs.push(
      this.add.text(cx, y, `Base Points: ${result.basePoints}`, {
        fontSize: '18px', color: '#aaccee',
      }).setOrigin(0.5)
    );
    y += 34;

    // ── Yaku list ─────────────────────────────────────────────────────────
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

    // ── Combined multiplier ───────────────────────────────────────────────
    this._overlayObjs.push(
      this.add.text(cx, y, `Combined Multiplier: \xD7${result.totalMultiplier.toFixed(2)}`, {
        fontSize: '17px', color: '#ffee88',
      }).setOrigin(0.5)
    );
    y += 32;

    // ── Push penalty notice ───────────────────────────────────────────────
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

    // ── Final score ───────────────────────────────────────────────────────
    this._overlayObjs.push(
      this.add.text(cx, y, `Final Score: ${result.finalScore}`, {
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5)
    );
    y += 36;

    // ── Ki reward ─────────────────────────────────────────────────────────
    const kiEarned = run.calculateKiReward(result, 100);
    this._overlayObjs.push(
      this.add.text(cx, y, `Ki earned: +${kiEarned}`, {
        fontSize: '16px', color: '#ffee88',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5)
    );

    // ── Visit Shrine button ───────────────────────────────────────────────
    const btnY = cy + 188;
    const btn  = this.add
      .rectangle(cx, btnY, 230, 46, 0x1a4a6a)
      .setStrokeStyle(2, 0x4488aa)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover',  () => btn.setFillStyle(0x2a6a9a));
    btn.on('pointerout',   () => btn.setFillStyle(0x1a4a6a));
    btn.on('pointerdown',  () => {
      run.addKi(kiEarned);
      run.advanceRound(result.finalScore);
      this.scene.start('ShrineScene');
    });
    this._overlayObjs.push(btn);

    this._overlayObjs.push(
      this.add.text(cx, btnY, 'Visit Shrine', {
        fontSize: '18px', color: '#ffffff',
      }).setOrigin(0.5)
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

  // ── Yaku decision overlay (Bank / Push) ──────────────────────────────────

  _showYakuDecision(result) {
    this._clearObjs(this._overlayObjs);

    const cx = PLAY_CX;
    const cy = 270;

    // Panel
    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 490, 230, 0x080d1a, 0.96)
        .setStrokeStyle(2, 0x6a9a3a)
        .setDepth(25)
    );

    // Title
    this._overlayObjs.push(
      this.add.text(cx, cy - 97, 'Yaku Completed!', {
        fontSize: '20px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25)
    );

    // Yaku name(s)
    let y = cy - 68;
    for (const yaku of result.newYaku) {
      this._overlayObjs.push(
        this.add.text(cx, y,
          `${yaku.name}  \xD7${yaku.multiplier.toFixed(1)}`,
          { fontSize: '16px', color: '#ffee88' }
        ).setOrigin(0.5).setDepth(25)
      );
      y += 23;
    }

    // Score breakdown
    y += 6;
    this._overlayObjs.push(
      this.add.text(cx, y,
        `Base ${result.basePoints}  \xD7  ${result.totalMultiplier.toFixed(2)}  =  ${result.finalScore} pts`,
        { fontSize: '15px', color: '#cce0ff' }
      ).setOrigin(0.5).setDepth(25)
    );

    // Buttons
    const btnY = cy + 86;

    // ── Bank button ───────────────────────────────────────────────────────
    const bankBtn = this.add.rectangle(cx - 118, btnY, 206, 42, 0x1a6a1a)
      .setStrokeStyle(2, 0x44aa44)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);
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
      this.add.text(cx - 118, btnY,
        `Bank  (keep ${result.finalScore})`,
        { fontSize: '14px', color: '#ffffff' }
      ).setOrigin(0.5).setDepth(25)
    );

    // ── Push button ───────────────────────────────────────────────────────
    const pushBtn = this.add.rectangle(cx + 118, btnY, 206, 42, 0x6a1a1a)
      .setStrokeStyle(2, 0xaa4444)
      .setInteractive({ useHandCursor: true })
      .setDepth(25);
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
      this.add.text(cx + 118, btnY,
        `Push  (new hand, risk ${result.nextPushPenaltyPct}%)`,
        { fontSize: '14px', color: '#ffffff' }
      ).setOrigin(0.5).setDepth(25)
    );
  }

  // ── Round-start helper ────────────────────────────────────────────────────

  /**
   * Set the opening status message, accounting for any natural full-month
   * captures that were auto-resolved when the hand was dealt.
   */
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

    // Re-render hand as dimmed (non-interactive) while guide is open.
    this._clearObjs(this._handObjs);
    this._renderHand();

    const cx = 640, cy = 360;
    const objs = this._yakuGuideObjs;

    // Background panel
    objs.push(
      this.add.rectangle(cx, cy, 820, 490, 0x080d1a, 0.96)
        .setStrokeStyle(2, 0x3a6080)
        .setDepth(20)
    );

    // Title
    objs.push(
      this.add.text(cx, cy - 215, 'Yaku Reference', {
        fontSize: '22px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20)
    );

    // Separator under title
    objs.push(
      this.add.rectangle(cx, cy - 195, 760, 1, 0x3a6080).setDepth(20)
    );

    const entries = Object.values(YAKU_INFO);
    let y = cy - 178;
    for (const yaku of entries) {
      objs.push(
        this.add.text(cx - 360, y,
          `${yaku.name}  \xD7${yaku.multiplier.toFixed(1)}`,
          { fontSize: '14px', color: '#ffee88' }
        ).setOrigin(0, 0.5).setDepth(20)
      );
      objs.push(
        this.add.text(cx - 165, y,
          yaku.description,
          { fontSize: '13px', color: '#aabbcc' }
        ).setOrigin(0, 0.5).setDepth(20)
      );
      y += 27;
    }

    // Close button
    const closeY = cy + 215;
    const closeBtn = this.add.rectangle(cx, closeY, 140, 36, 0x1a4a6a)
      .setStrokeStyle(2, 0x4488aa)
      .setInteractive({ useHandCursor: true })
      .setDepth(20);
    closeBtn.on('pointerover',  () => closeBtn.setFillStyle(0x2a6a9a));
    closeBtn.on('pointerout',   () => closeBtn.setFillStyle(0x1a4a6a));
    closeBtn.on('pointerdown',  () => this._closeYakuGuide());
    objs.push(closeBtn);

    objs.push(
      this.add.text(cx, closeY, 'Close', {
        fontSize: '15px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(20)
    );
  }

  _closeYakuGuide() {
    if (!this._yakuGuideOpen) return;
    this._yakuGuideOpen = false;
    this._clearObjs(this._yakuGuideObjs);

    // Restore hand interactivity.
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
