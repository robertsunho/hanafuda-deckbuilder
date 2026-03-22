import GameRoundManager      from '../systems/GameRoundManager.js';
import { YAKU_INFO }         from '../systems/ScoringEngine.js';
import run, { RunManager }   from '../systems/RunManager.js';
import { getElementDef }     from '../data/consumables.js';
import { getSpiritDef }      from '../data/spirits.js';
import logger                from '../systems/GameplayLogger.js';
import SpiritEffects         from '../systems/SpiritEffects.js';

// ── Layout constants ───────────────────────────────────────────────────────────
// Canvas is 1280 × 720.
// Top        (y 0–114):  Spirit row (horizontal) + info cluster (top-left)
// Center     (x 130–890): Field (hexagonal) + Deck, centred at FIELD_CX = 500
// Right panel (x 948–1280): Capture fan + pile stacks
// Bottom     (y 590–720): Hand (centred at HAND_CX = 500) + consumables (left)

const CARD_W     = 64;    // natural image width  (pixel-art assets 64×104)
const CARD_H     = 104;   // natural image height
const CARD_SCALE = 1.0;

// ── Shared play area centre (between left divider x=155 and right divider x=1036) ─
const PLAY_CENTER_X = Math.round((155 + 1036) / 2);  // 596

// ── Spirit row (top, horizontal full-portrait) ────────────────────────────
const SPIRIT_GAP       = 76;                          // x-distance between card centres (64 + 12)
const SPIRIT_START_X   = 220;                          // flush left — 6 spirits span x=220 to x=600
const SPIRIT_Y         = 62;                          // spirit card centre y
const SPIRIT_W         = CARD_W * CARD_SCALE;  // 64
const SPIRIT_H         = CARD_H * CARD_SCALE;  // 104
const MAX_SPIRIT_SLOTS = RunManager.MAX_SPIRIT_SLOTS;  // 6

// ── Info box (top-left corner, clustered vertically) ──────────────────────
const INFO_X     = 10;
const INFO_TOP_Y = 14;

// ── Field + Deck (centre) ─────────────────────────────────────────────────
const FIELD_CX    = PLAY_CENTER_X;  // 596
const FIELD_CY    = 340;
const FIELD_COL_W = Math.round(CARD_W * CARD_SCALE * 2.2);  // ~141
const FIELD_ROW_H = Math.round(CARD_H * CARD_SCALE) + 50;   // 154

// Hexagonal arrangement: 3-top / 2-middle (flanking deck) / 3-bottom
const SLOT_POSITIONS = [
  { x: FIELD_CX - FIELD_COL_W,        y: FIELD_CY - FIELD_ROW_H },  // F1
  { x: FIELD_CX,                      y: FIELD_CY - FIELD_ROW_H },  // F2
  { x: FIELD_CX + FIELD_COL_W,        y: FIELD_CY - FIELD_ROW_H },  // F3
  { x: FIELD_CX - FIELD_COL_W * 1.75,  y: FIELD_CY               },  // F4 (left)
  { x: FIELD_CX + FIELD_COL_W * 1.75,  y: FIELD_CY               },  // F5 (right)
  { x: FIELD_CX - FIELD_COL_W,        y: FIELD_CY + FIELD_ROW_H },  // F6
  { x: FIELD_CX,                      y: FIELD_CY + FIELD_ROW_H },  // F7
  { x: FIELD_CX + FIELD_COL_W,        y: FIELD_CY + FIELD_ROW_H },  // F8
];

const SLOT_FAN_X = 10;
const SLOT_FAN_Y = 14;
const SLOT_BG_W  = Math.round(CARD_W * CARD_SCALE) + 8;
const SLOT_BG_H  = Math.round(CARD_H * CARD_SCALE) + 8;

// Deck sits at the hexagonal centre, rotated 90°.
const DECK_X = FIELD_CX;
const DECK_Y = FIELD_CY;

// ── Capture fan (right panel, full scale) ─────────────────────────────────
const CAPTURE_X       = 1060;  // left edge of first card in each fan row
const CAPTURE_TOP_Y   = 100;   // top of first fan row (card top edge)
const CAPTURE_OVERLAP = 16;    // horizontal offset per card
const CAPTURE_ROW_GAP = 6;     // vertical gap between type rows
const CAPTURE_SCALE   = CARD_SCALE;   // 1.0 — full size, no shrinking
const CAPTURE_CARD_W  = Math.round(CARD_W * CAPTURE_SCALE);   // 64
const CAPTURE_CARD_H  = Math.round(CARD_H * CAPTURE_SCALE);   // 104

// ── Banked + Discard piles (centred in bottom-right zone between dividers) ─
const PILE_ZONE_CX = Math.round((1036 + 1280) / 2);   // 1158
const PILE_ZONE_CY = Math.round((600 + 720) / 2);      // 660
const PILE_GAP     = CARD_W + 30;                       // 94 — space between pile centres
const BANKED_X  = Math.round(PILE_ZONE_CX - PILE_GAP / 2);  // ~1111
const BANKED_Y  = PILE_ZONE_CY;                              // 645
const DISCARD_X = Math.round(PILE_ZONE_CX + PILE_GAP / 2);  // ~1205
const DISCARD_Y = PILE_ZONE_CY;

// ── Hand (bottom centre) ──────────────────────────────────────────────────
const HAND_CX   = PLAY_CENTER_X;  // 596 — same axis as field and spirits
const HAND_Y    = Math.round((600 + 720) / 2);  // 660 — centred in bottom zone, matches pile centres
const HAND_STEP = 72;

// ── Deck-flip animation ───────────────────────────────────────────────────
const FLIP_X    = FIELD_CX;
const FLIP_Y    = FIELD_CY;
const FLIP_HOLD = 800;   // ms

// ── Consumable slot (top-right, right edge flush against right divider) ───
const CONS_CARD_W  = Math.round(CARD_W * CARD_SCALE);          // 64
const CONS_CARD_H  = Math.round(CARD_H * CARD_SCALE);          // 104
const CONS_SLOT_W  = CONS_CARD_W * 3 + 16;                     // 208
const CONS_SLOT_H  = CONS_CARD_H + 8;                          // 112
const CONS_SLOT_X  = 1024 - CONS_SLOT_W / 2;                   // 920 — right edge at x=1024, 12px gap from divider
const CONS_SLOT_Y  = SPIRIT_Y;                                 // 62 — aligned with spirit row
const CONS_BASE_X  = Math.round(CONS_SLOT_X - CONS_SLOT_W / 2 + CONS_CARD_W / 2 + 8);  // 856
const CONS_BASE_Y  = CONS_SLOT_Y;
const MAX_CONSUMABLE_SLOTS = 3;

// ── Rarity colours ────────────────────────────────────────────────────────
const RARITY_COLOR = {
  common:    0x667788,
  uncommon:  0x44aa44,
  rare:      0x4488ff,
  legendary: 0xddaa22,
};

// ── Tints ─────────────────────────────────────────────────────────────────
const TINT_PENDING = 0xffee33;
const TINT_DIM     = 0x445566;
const TINT_HOVER   = 0xddeeff;
const TINT_DISCARD = 0xff2222;

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
    this._bankPushOpen       = false;
    this._discardOverlayOpen = false;
    this._fireWildCard       = null;

    this._handObjs           = [];
    this._fieldObjs          = [];
    this._captureObjs        = [];
    this._captureFanObjs     = [];
    this._spiritObjs         = [];
    this._spiritCardObjs     = [];
    this._consumableObjs     = [];
    this._overlayObjs        = [];
    this._captureOverlayObjs = [];
    this._yakuGuideObjs      = [];
    this._discardOverlayObjs = [];
    this._actionBtnObjs      = [];

    this._selectedCardIds         = new Set();
    this._selectedConsumableIndex = null;

    /**
     * Active Three Marks targeting state, or null when not in mark mode.
     * @type {{ id: string, index: number, step: 'select_source'|'select_target', sourceCard: object|null }|null}
     */
    this._markMode         = null;
    this._fannedSlot       = null;
    this._cardTooltipBg    = null;
    this._cardTooltipText  = null;

    this._createCardBackTexture();
    this._buildStaticUI();

    this._scoringQueue     = [];
    this._scoringAnimating = false;
    this._spiritDragSetup  = false;
    this._dragSourceIndex  = null;

    this._round.setSpirits(run.spirits);
    this._round.setStyleBase(run.styleBase);
    this._round.setScoringStepCallback(ev => this._scoringQueue.push(ev));
    this._round.startRound();
    this._afterRoundStart();
    this._renderAll();

    // ESC cancels mark mode or fire wild targeting
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._markMode) {
        this._markMode = null;
        this._setStatus('Mark cancelled.');
        this._renderAll();
      } else if (this._fireWildCard) {
        this._fireWildCard = null;
        this._selectedCardIds.clear();
        this._setStatus('Play cancelled.');
        this._renderAll();
      }
    });
  }

  // ── Card-back texture ──────────────────────────────────────────────────────

  _createCardBackTexture() {}

  // ── Static UI ─────────────────────────────────────────────────────────────

  _buildStaticUI() {
    const labelStyle = { fontSize: '11px', color: '#556677' };

    // ── Left info panel (consolidated) ───────────────────────────────────
    let infoY = INFO_TOP_Y;

    // Act / Round
    this._actRoundText = this.add.text(INFO_X, infoY, '', { fontSize: '13px', color: '#8899aa' });
    infoY += 20;

    // Ki (moved from top-right corner)
    this._kiText = this.add.text(INFO_X, infoY, '', { fontSize: '13px', color: '#ffee88' });
    infoY += 28;

    // Status / instruction text
    this._statusText = this.add.text(INFO_X, infoY, '', {
      fontSize: '13px', color: '#e8e8e8',
      stroke: '#0a0f1e', strokeThickness: 3,
      wordWrap: { width: 140 },
    }).setOrigin(0, 0);
    infoY += 62;

    // Scoring breakdown
    this.add.rectangle(INFO_X + 68, infoY, 136, 1, 0x2a3a50);
    infoY += 6;
    this._scorePtsText = this.add.text(INFO_X, infoY, 'Points: 0', { fontSize: '13px', color: '#aaccee' });
    infoY += 16;
    this._scoreMltText = this.add.text(INFO_X, infoY, 'Mult: 1.0', { fontSize: '13px', color: '#ffcc66' });
    infoY += 16;
    this._scoreFlwText = this.add.text(INFO_X, infoY, 'Flow: \xD71.00', { fontSize: '13px', color: '#88ddaa' });
    infoY += 16;
    this.add.rectangle(INFO_X + 68, infoY, 136, 1, 0x2a3a50);
    infoY += 6;
    this._scoreTotText  = this.add.text(INFO_X, infoY, 'Total: 0',  { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' });
    infoY += 18;
    this._thresholdText = this.add.text(INFO_X, infoY, 'Target: –', { fontSize: '13px', color: '#cc8866' });

    // ── Spirits row — vertical label to the left of first card ───────────
    this.add.text(SPIRIT_START_X - SPIRIT_W / 2 - 14, SPIRIT_Y, 'SPIRITS', {
      fontSize: '10px', color: '#556677',
    }).setOrigin(0.5, 0.5).setRotation(-Math.PI / 2);

    // ── Consumable slot — rectangle outline + vertical label ──────────────
    this._addRoundedRect(CONS_SLOT_X, CONS_SLOT_Y, CONS_SLOT_W, CONS_SLOT_H, 6, 0x0a1628, 1, 0x1e2d40);
    this.add.text(CONS_SLOT_X - CONS_SLOT_W / 2 - 14, CONS_SLOT_Y, 'CONSUMABLES', {
      fontSize: '10px', color: '#556677',
    }).setOrigin(0.5, 0.5).setRotation(-Math.PI / 2);

    // ── Deck pile (portrait) ───────────────────────────────────────────────
    this._deckSprite = this.add.image(DECK_X, DECK_Y, 'card_back')
      .setDisplaySize(CARD_W * CARD_SCALE, CARD_H * CARD_SCALE);
    this._deckCountText = this.add.text(DECK_X, DECK_Y + CARD_H * CARD_SCALE / 2 + 8, '32', {
      fontSize: '16px', color: '#aaccee', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Right vertical divider (separates field from captures) ───────────
    this.add.rectangle(1036, 400, 1, 720, 0x2a3a50);
    this.add.text(1046 + 80, 62, 'CAPTURES', {
      fontSize: '11px', color: '#556677',
    }).setOrigin(0.5, 0.5);

    // ── Left vertical divider (separates info/consumables from game board) ─
    this.add.rectangle(155, 360, 1, 720, 0x2a3a50);

    // ── Upper horizontal divider (between spirit row and field) ───────────
    // Spans only between vertical dividers; spiritBottom≈114, fieldTop≈134
    this.add.rectangle(
      Math.round((155 + 1036) / 2), Math.round((114 + 134) / 2),
      1036 - 155, 1, 0x2a3a50
    );

    // ── Lower horizontal divider (full-width, above hand/banked zone) ─────
    this.add.rectangle(640, 600, 1280, 1, 0x2a3a50);
  }

  // ── Master render ──────────────────────────────────────────────────────────

  _renderAll() {
    this._fannedSlot = null;
    this._clearObjs(this._handObjs);
    this._clearObjs(this._fieldObjs);
    this._clearObjs(this._captureObjs);
    this._clearObjs(this._spiritObjs);
    this._clearObjs(this._consumableObjs);
    this._clearObjs(this._actionBtnObjs);
    this._renderHand();
    this._renderField();
    this._renderSpiritColumn();
    this._renderCaptureFan();
    this._renderConsumables();
    this._renderActionButtons();
    this._updateInfoTexts();
  }

  // ── Hand ──────────────────────────────────────────────────────────────────

  _renderHand() {
    const cards      = this._round.hand.getAll();
    const n          = cards.length;
    const fireWild   = this._fireWildCard !== null;
    const idle       = this._round.phase === 'idle' && !this._animating
                        && !this._yakuGuideOpen && !this._captureOverlayOpen
                        && !fireWild;
    const markActive = this._markMode !== null;
    const startX     = Math.round(HAND_CX - ((n - 1) * HAND_STEP) / 2);

    for (let i = 0; i < n; i++) {
      const card     = cards[i];
      const selected = this._selectedCardIds.has(card.id);
      const x        = startX + i * HAND_STEP;
      const y        = HAND_Y - (selected || (fireWild && card.id === this._fireWildCard.id) ? 20 : 0);
      const spr      = this.add.image(x, y, card.id).setScale(CARD_SCALE);

      const ttY = y - Math.round(CARD_H * CARD_SCALE / 2) - 5;
      if (markActive) {
        // In mark mode: cards are selectable targets regardless of game phase.
        const MARK_TINT        = 0x44ffcc;
        const MARK_HOVER       = 0xaaffee;
        const isTranscendSrc   = this._markMode.step === 'select_target'
                                  && this._markMode.sourceCard?.id === card.id;
        spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT);
        spr.setInteractive({ useHandCursor: true });
        spr.on('pointerover',  () => { if (!isTranscendSrc) spr.setTint(MARK_HOVER); this._showCardTooltip(card, x, ttY); });
        spr.on('pointerout',   () => { spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT); this._hideCardTooltip(); });
        spr.on('pointerdown',  () => this._onMarkCardSelected(card));
      } else if (fireWild) {
        // Fire wild targeting: selected fire card stays elevated; others dimmed.
        spr.setTint(card.id === this._fireWildCard.id ? TINT_HOVER : TINT_DIM);
      } else if (idle) {
        spr.setInteractive({ useHandCursor: true });
        if (selected) spr.setTint(TINT_HOVER);
        spr.on('pointerover',  () => { spr.setTint(TINT_HOVER); this._showCardTooltip(card, x, ttY); });
        spr.on('pointerout',   () => { if (!selected) spr.clearTint(); this._hideCardTooltip(); });
        spr.on('pointerdown',  () => this._toggleCardSelection(card.id));
      } else {
        spr.setTint(TINT_DIM);
      }
      this._handObjs.push(spr);

      // Enhancement badge — placed above the card to avoid overlapping action buttons.
      const enhBadge = this._makeEnhancementBadge(card, x, y - Math.round(CARD_H * CARD_SCALE / 2) - 20);
      if (enhBadge) enhBadge.forEach(o => this._handObjs.push(o));

      // Ribbon stamp dot — top-left corner of the card.
      const stampDot = this._makeRibbonStampDot(card, x, y);
      if (stampDot) this._handObjs.push(stampDot);

      // Conversion badge — bottom-right corner, for Path/Tree-converted cards.
      const convBadge = this._makeConversionBadge(card, x, y);
      if (convBadge) this._handObjs.push(convBadge);
    }
  }

  // ── Field ─────────────────────────────────────────────────────────────────

  _renderField() {
    const slots      = this._round.field.getSlots();
    const markActive = this._markMode !== null;
    const fireWild   = this._fireWildCard !== null;

    for (let i = 0; i < 8; i++) {
      const { x: sx, y: sy } = SLOT_POSITIONS[i];
      const slot     = slots[i];
      const isFanned = this._fannedSlot === i;

      // Slot background
      const bg = this._addRoundedRect(sx, sy, SLOT_BG_W, SLOT_BG_H, 6, 0x0a1628);
      this._fieldObjs.push(bg);

      if (!slot) continue;

      for (let j = 0; j < slot.cards.length; j++) {
        const card = slot.cards[j];
        const offX = isFanned ? j * 20 : j * SLOT_FAN_X;
        const offY = isFanned ? j * 28 : j * SLOT_FAN_Y;
        const cx   = sx + offX;
        const cy   = sy + offY;
        const spr  = this.add.image(cx, cy, card.id).setScale(CARD_SCALE);
        const ttY  = cy - Math.round(CARD_H * CARD_SCALE / 2) - 5;

        if (markActive) {
          const MARK_TINT      = 0x44ffcc;
          const MARK_HOVER     = 0xaaffee;
          const isTranscendSrc = this._markMode.step === 'select_target'
                                  && this._markMode.sourceCard?.id === card.id;
          spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT);
          spr.setInteractive({ useHandCursor: true });
          spr.on('pointerover',  () => { if (!isTranscendSrc) spr.setTint(MARK_HOVER); this._showCardTooltip(card, cx, ttY); });
          spr.on('pointerout',   () => { spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT); this._hideCardTooltip(); });
          spr.on('pointerdown',  () => this._onMarkCardSelected(card));
        } else if (fireWild) {
          const FIRE_TINT  = 0xff9944;
          const FIRE_HOVER = 0xffcc66;
          spr.setTint(FIRE_TINT);
          spr.setInteractive({ useHandCursor: true });
          spr.on('pointerover', () => { spr.setTint(FIRE_HOVER); this._showCardTooltip(card, cx, ttY); });
          spr.on('pointerout',  () => { spr.setTint(FIRE_TINT); this._hideCardTooltip(); });
          spr.on('pointerdown', () => this._playFireWild(slot.month));
        } else {
          if (slot.state === 'pending') spr.setTint(TINT_PENDING);
          spr.setInteractive({ useHandCursor: slot.state === 'normal' && slot.cards.length >= 2 });
          spr.on('pointerover', () => this._showCardTooltip(card, cx, ttY));
          spr.on('pointerout',  () => this._hideCardTooltip());
          // Click any card in a normal multi-card stack to toggle fan
          if (slot.state === 'normal' && slot.cards.length >= 2) {
            spr.on('pointerdown', () => this._toggleFieldFan(i));
          }
        }
        this._fieldObjs.push(spr);

        // Enhancement badge and stamp (only on the top card of the fan)
        if (j === slot.cards.length - 1) {
          const by = cy + Math.round(CARD_H * CARD_SCALE / 2) + 4;
          const enhBadge = this._makeEnhancementBadge(card, cx, by);
          if (enhBadge) enhBadge.forEach(o => this._fieldObjs.push(o));
          const stampDot = this._makeRibbonStampDot(card, cx, cy);
          if (stampDot) this._fieldObjs.push(stampDot);
          const convBadge = this._makeConversionBadge(card, cx, cy);
          if (convBadge) this._fieldObjs.push(convBadge);
        }
      }
    }
  }

  // ── Spirit row (top, horizontal full-portrait) ───────────────────────────

  _renderSpiritColumn() {
    const spirits = run.spirits;
    this._spiritCardObjs = [];

    for (let i = 0; i < MAX_SPIRIT_SLOTS; i++) {
      const spirit = spirits[i];
      const x      = SPIRIT_START_X + i * SPIRIT_GAP;
      const y      = SPIRIT_Y;

      if (!spirit) {
        this._spiritObjs.push(
          this._addRoundedRect(x, y, SPIRIT_W, SPIRIT_H, 6, 0x0a1628, 1, 0x1e2d40)
        );
        this._spiritCardObjs[i] = null;
        continue;
      }

      const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;

      // Card background.
      const card = this._addRoundedRect(x, y, SPIRIT_W, SPIRIT_H, 6, 0x0d1b2a, 1, rarityCol);
      this._spiritObjs.push(card);
      this._spiritCardObjs[i] = card;

      // Rarity left-border strip.
      this._spiritObjs.push(
        this.add.rectangle(x - SPIRIT_W / 2 + 2, y, 4, SPIRIT_H - 4, rarityCol)
      );

      // Name label (centred on card, small font to fit portrait width).
      this._spiritObjs.push(
        this.add.text(x, y, spirit.name, {
          fontSize: '9px', color: '#cce0ff',
          wordWrap: { width: SPIRIT_W - 8 },
          align: 'center',
        }).setOrigin(0.5)
      );

      // Stack count badge (top-right corner).
      const stackCount = spirit.stackCount ?? 1;
      if (stackCount > 1) {
        this._spiritObjs.push(
          this.add.text(x + SPIRIT_W / 2 - 3, y - SPIRIT_H / 2 + 3, `\xD7${stackCount}`, {
            fontSize: '10px', color: '#ffee66', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 2,
          }).setOrigin(1, 0).setDepth(10)
        );
      }

      // Hover tooltip — appears BELOW the card.
      const tooltip = this.add.text(
        x, y + SPIRIT_H / 2 + 4, '',
        {
          fontSize: '11px', color: '#e8e8e8',
          backgroundColor: '#0a0f1e',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 200 },
        }
      ).setOrigin(0.5, 0).setDepth(42).setVisible(false);
      this._spiritObjs.push(tooltip);

      // Make draggable for reordering.
      card.setInteractive(
        new Phaser.Geom.Rectangle(x - SPIRIT_W / 2, y - SPIRIT_H / 2, SPIRIT_W, SPIRIT_H),
        Phaser.Geom.Rectangle.Contains
      );
      card.setData('spiritIndex', i);
      this.input.setDraggable(card);

      card.on('pointerover', () => {
        const captured = this._round.capture.getAll();
        const contrib  = this._getSpiritContrib(spirit, captured);
        tooltip.setText((getSpiritDef(spirit.id)?.description ?? spirit.name) + (contrib ? '\n\n' + contrib : ''));
        tooltip.setVisible(true);
      });
      card.on('pointerout', () => tooltip.setVisible(false));
    }

    // Negative spirits row — right of regular slots, between spirits and consumables.
    const negSpirits = run.negativeSpirits;
    const NEG_W   = Math.round(SPIRIT_W * 0.72);  // ~46px
    const NEG_H   = Math.round(SPIRIT_H * 0.65);  // ~68px
    const NEG_GAP = NEG_W + 6;
    const NEG_START_X = SPIRIT_START_X + MAX_SPIRIT_SLOTS * SPIRIT_GAP;  // 676
    for (let i = 0; i < negSpirits.length; i++) {
      const ns  = negSpirits[i];
      const nx  = NEG_START_X + i * NEG_GAP;
      const ny  = SPIRIT_Y;
      const nw  = NEG_W;
      const nh  = NEG_H;

      const negCard = this._addRoundedRect(nx, ny, nw, nh, 4, 0x0a1628, 0.7, 0x2a3a4a);
      this._spiritObjs.push(negCard);

      this._spiritObjs.push(
        this.add.text(nx, ny - 4, ns.name, {
          fontSize: '8px', color: '#667788',
          wordWrap: { width: nw - 6 }, align: 'center',
        }).setOrigin(0.5, 0.5).setDepth(5)
      );

      this._spiritObjs.push(
        this.add.text(nx + nw / 2 - 3, ny - nh / 2 + 2, '\u2205', {
          fontSize: '9px', color: '#5588aa',
        }).setOrigin(1, 0).setDepth(10)
      );

      // Tooltip for negative copy.
      const negTip = this.add.text(
        nx, ny + nh / 2 + 4, '',
        {
          fontSize: '10px', color: '#e8e8e8',
          backgroundColor: '#0a0f1e',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 180 },
        }
      ).setOrigin(0.5, 0).setDepth(42).setVisible(false);
      this._spiritObjs.push(negTip);

      negCard.setInteractive(
        new Phaser.Geom.Rectangle(nx - nw / 2, ny - nh / 2, nw, nh),
        Phaser.Geom.Rectangle.Contains
      );
      negCard.on('pointerover', () => {
        negTip.setText(`${getSpiritDef(ns.id)?.description ?? ns.name}\n\nNegative copy (zero-slot, base effect)`);
        negTip.setVisible(true);
      });
      negCard.on('pointerout', () => negTip.setVisible(false));
    }

    // Set up drag-and-drop (only once per scene lifetime).
    if (!this._spiritDragSetup) {
      this._spiritDragSetup = true;

      this.input.on('dragstart', (pointer, gameObject) => {
        if (this._scoringAnimating) return;
        gameObject.setDepth(100);
        gameObject.setAlpha(0.7);
        this._dragSourceIndex = gameObject.getData('spiritIndex');
      });

      this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (this._scoringAnimating) return;
        gameObject.x = dragX;
        gameObject.y = dragY;
      });

      this.input.on('dragend', (pointer, gameObject) => {
        if (this._scoringAnimating) return;
        const sourceIdx = this._dragSourceIndex;
        this._dragSourceIndex = null;
        if (sourceIdx == null) return;

        const targetIdx = this._getSpiritSlotFromX(pointer.x);
        if (targetIdx != null && targetIdx !== sourceIdx &&
            targetIdx >= 0 && targetIdx < MAX_SPIRIT_SLOTS) {
          run.swapSpirits(sourceIdx, targetIdx);
          this._round.setSpirits(run.spirits);
        }
        this._renderAll();
      });
    }
  }

  _getSpiritSlotFromX(x) {
    for (let i = 0; i < MAX_SPIRIT_SLOTS; i++) {
      const slotX = SPIRIT_START_X + i * SPIRIT_GAP;
      if (x >= slotX - SPIRIT_W / 2 && x <= slotX + SPIRIT_W / 2) return i;
    }
    return null;
  }

  /**
   * Draw a rounded rectangle using Graphics and return it.
   * All slot/card-holder rectangles use this instead of this.add.rectangle()
   * so they get consistent rounded corners.
   */
  _addRoundedRect(x, y, w, h, radius, fillColor, fillAlpha = 1, strokeColor, strokeWidth = 1) {
    const gfx = this.add.graphics();
    if (fillColor !== undefined) {
      gfx.fillStyle(fillColor, fillAlpha);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    }
    if (strokeColor !== undefined) {
      gfx.lineStyle(strokeWidth, strokeColor, 1);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    }
    return gfx;
  }

  /**
   * Compute a short "current contribution" string for the spirit tooltip.
   * Returns null if there is nothing meaningful to show yet.
   * @param {object}   spirit        Spirit object from run.spirits
   * @param {object[]} captured      Cards in the capture pile this round
   * @returns {string|null}
   */
  _getSpiritContrib(spirit, captured) {
    const fx      = SpiritEffects.get(spirit.id);
    const spirits = run.spirits;
    const lines   = [];

    // Stack / negative copy info.
    const stackCount = spirit.stackCount ?? 1;
    if (stackCount > 1) {
      lines.push(`Stacked \xD7${stackCount} — fires ${stackCount}× per card`);
    }
    if (spirit.isNegative) {
      lines.push('Negative copy (zero-slot, base effect only)');
    }

    // ── Per-card spirit (onCardScored) ────────────────────────────────────
    if (fx?.onCardScored) {
      const def = getSpiritDef(spirit.id);
      if (def?.description) {
        lines.push(def.description);
      } else {
        lines.push('Per-card effect (active during scoring)');
      }
    }

    // ── Engine spirit (applyEngine) ───────────────────────────────────────
    if (fx?.applyEngine) {
      if (spirit.id === 'engine_radiance') {
        const n = spirit.state?.count ?? 0;
        const m = n > 0 ? Math.pow(2.0, n) : 1.0;
        lines.push(`Brights seen: ${n}  →  \u00D7${m.toFixed(2)} mult`);
      } else if (spirit.id === 'engine_wildlife') {
        const n = spirit.state?.seenAnimals?.length ?? 0;
        lines.push(`Unique animals: ${n}/9  →  \u00D7${(1 + n * 0.5).toFixed(2)} mult`);
      } else if (spirit.id === 'engine_banner') {
        const n = spirit.state?.count ?? 0;
        lines.push(`Ribbons seen: ${n}  →  \u00D7${(1 + n).toFixed(2)} mult`);
      } else if (spirit.id === 'engine_plenty') {
        const n = spirit.state?.seenPlains?.length ?? 0;
        lines.push(`Unique plains: ${n}  →  \u00D7${(1 + n * 0.1).toFixed(2)} mult`);
      } else if (spirit.id === 'sym_algae') {
        const n = spirit.state?.summonCount ?? 0;
        lines.push(`Symbionts summoned: ${n}  →  \u00D7${(1 + n * 0.3).toFixed(2)} mult`);
      } else if (spirit.id === 'sym_ants') {
        lines.push(`Spirits equipped: ${spirits.length}  →  +${spirits.length} mult`);
      } else if (spirit.id === 'sym_ducks') {
        const n = spirit.state?.pairsThisRound ?? 0;
        lines.push(`Pairs this round: ${n}  →  \u00D7${(1 + n * 0.3).toFixed(2)} mult`);
      } else if (spirit.id === 'sym_snails') {
        const n = spirit.state?.totalUnplayed ?? 0;
        lines.push(`Total unplayed: ${n}  →  \u00D7${(1 + n * 0.2).toFixed(2)} mult`);
      } else if (spirit.id === 'engine_glacier') {
        const n = spirit.state?.waterDepCount ?? 0;
        lines.push(`Water dep count: ${n}  →  \u00D7${(1 + n * 0.3).toFixed(2)} mult`);
      } else if (spirit.id === 'engine_carbon') {
        const n = spirit.state?.fireCombustCount ?? 0;
        lines.push(`Fire combustions: ${n}  →  \u00D7${(1 + n * 0.5).toFixed(2)} mult`);
      } else if (spirit.id === 'engine_velocity') {
        const n = spirit.state?.metalProcCount ?? 0;
        lines.push(`Metal procs: ${n}  →  \u00D7${(1 + n * 0.3).toFixed(2)} mult`);
      } else if (spirit.id === 'engine_fossil') {
        const n = spirit.state?.earthCardCount ?? 0;
        lines.push(`Earth cards in deck: ${n}  →  \u00D7${(1 + n * 0.2).toFixed(2)} mult`);
      } else if (spirit.id === 'engine_moths') {
        const n = spirit.state?.silkTriggerCount ?? 0;
        lines.push(`Silk triggers: ${n}  →  \u00D7${(1 + n * 0.4).toFixed(2)} mult`);
      } else {
        const r = fx.applyEngine({ spirit, mult: 1.0, points: 0, spirits });
        if (r) {
          if (r.multiplyMult) lines.push(`\u00D7${r.multiplyMult.toFixed(2)} mult`);
          if (r.addMult)      lines.push(`+${r.addMult.toFixed(2)} mult`);
        }
      }
    }

    // ── Symbiont non-scoring state ─────────────────────────────────────────
    if (spirit.id === 'sym_caterpillar') {
      const eaten = spirit.state?.leafsEaten ?? 0;
      lines.push(`Leafs eaten: ${eaten}/3${eaten >= 3 ? ' — metamorphosed!' : ''}`);
    } else if (spirit.id === 'sym_cuckoo_egg') {
      lines.push(`Rounds until hatch: ${spirit.state?.roundsRemaining ?? '?'}`);
    } else if (spirit.id === 'sym_crow') {
      lines.push(spirit.state?.usedThisRound ? 'Used this round' : 'Ready — first flip captures');
    } else if (spirit.id === 'sym_osprey') {
      lines.push(spirit.state?.usedThisRound ? 'Used this round' : 'Ready — capture a field card');
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  // ── Capture fan (right panel) ─────────────────────────────────────────────
  // Four horizontal rows — one per card type — plus compact pile stacks below.

  _renderCaptureFan() {
    const capturedCards = this._round.capture.getAll();
    const discards      = this._round.allDiscards;
    const spentIds      = this._round.spentCardIds;

    const TYPE_ORDER   = ['bright', 'animal', 'ribbon', 'plain'];
    const TYPE_SYMBOLS = { bright: '★', animal: '♦', ribbon: '║', plain: '□' };
    const TYPE_COLORS  = { bright: '#ffee88', animal: '#88ccff', ribbon: '#ff8888', plain: '#aaaaaa' };

    // Group by type — exclude spent cards (they appear in the banked pile only).
    const fanCards = capturedCards.filter(c => !spentIds.has(c.id));
    const byType = { bright: [], animal: [], ribbon: [], plain: [] };
    for (const card of fanCards) {
      const t = card.enhancement?.element === 'fire' ? 'plain' : card.type;
      (byType[t] ?? byType['plain']).push(card);
    }

    let fanY = CAPTURE_TOP_Y;

    for (const type of TYPE_ORDER) {
      const cards = byType[type];

      // Type symbol label — between right divider (1036) and first card (CAPTURE_X).
      this._captureObjs.push(
        this.add.text(1046, fanY + CAPTURE_CARD_H / 2, TYPE_SYMBOLS[type], {
          fontSize: '12px', color: TYPE_COLORS[type],
        }).setOrigin(0.5, 0.5)
      );

      // Fan cards.
      const ELEM_COLORS_CAPTURE = {
        water: 0x4488ff, wood: 0x44cc44, fire: 0xff6644,
        earth: 0xcc8822, metal: 0xbbbbbb,
      };
      for (let i = 0; i < cards.length; i++) {
        const card  = cards[i];
        const imgX  = CAPTURE_X + i * CAPTURE_OVERLAP;
        const img   = this.add.image(imgX, fanY, card.id).setScale(CAPTURE_SCALE).setOrigin(0, 0);
        const ttX   = imgX + CAPTURE_CARD_W / 2;
        img.setInteractive({ useHandCursor: false });
        img.on('pointerover', () => this._showCardTooltip(card, ttX, fanY - 4));
        img.on('pointerout',  () => this._hideCardTooltip());
        this._captureObjs.push(img);

        // Enhancement dot — top-right corner of card.
        if (card.enhancement) {
          const dotColor = ELEM_COLORS_CAPTURE[card.enhancement.element] ?? 0xffffff;
          const dot = this.add.circle(imgX + CAPTURE_CARD_W - 4, fanY + 4, 3, dotColor).setDepth(5);
          this._captureObjs.push(dot);
        }

        // Conversion badge — bottom-right corner.
        if (card.pathConverted || card.treeConverted) {
          const badgeLabel = card.treeConverted ? '\u2317' : `M${card.month}`;
          this._captureObjs.push(
            this.add.text(imgX + CAPTURE_CARD_W - 1, fanY + CAPTURE_CARD_H - 1, badgeLabel, {
              fontSize: '8px', color: '#ffcc44', fontStyle: 'bold',
              stroke: '#000000', strokeThickness: 2,
            }).setOrigin(1, 1).setDepth(6)
          );
        }
      }

      // Count label at end of fan.
      if (cards.length > 0) {
        const countX = CAPTURE_X + cards.length * CAPTURE_OVERLAP + CAPTURE_CARD_W + 2;
        if (countX < 1274) {
          this._captureObjs.push(
            this.add.text(countX, fanY + CAPTURE_CARD_H / 2, `×${cards.length}`, {
              fontSize: '10px', color: TYPE_COLORS[type],
            }).setOrigin(0, 0.5)
          );
        }
      }

      fanY += CAPTURE_CARD_H + CAPTURE_ROW_GAP;
    }

    // ── Banked pile (scored yaku cards only) ──────────────────────────────
    const bankedCards  = capturedCards.filter(c => spentIds.has(c.id));
    const bankedCount  = bankedCards.length;
    const pileBottomY  = BANKED_Y + CARD_H / 2 + 4;
    // Rotated label runs vertically along left edge of pile card
    this._captureObjs.push(
      this.add.text(BANKED_X - CARD_W / 2 - 12, BANKED_Y, 'BANKED', {
        fontSize: '10px', color: '#556677',
      }).setOrigin(0.5, 0.5).setRotation(-Math.PI / 2)
    );
    if (bankedCount > 0) {
      const capTop = bankedCards[bankedCount - 1];
      const capSpr = this.add.image(BANKED_X, BANKED_Y, capTop.id)
        .setScale(CARD_SCALE).setInteractive({ useHandCursor: true });
      capSpr.on('pointerover', () => capSpr.setTint(0x88aacc));
      capSpr.on('pointerout',  () => capSpr.clearTint());
      capSpr.on('pointerdown', () => this._showCaptureOverlay());
      this._captureObjs.push(capSpr);
      this._captureObjs.push(
        this.add.text(BANKED_X, pileBottomY, `×${bankedCount}`, {
          fontSize: '12px', color: '#88ff88', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0)
      );
    } else {
      this._captureObjs.push(
        this._addRoundedRect(BANKED_X, BANKED_Y, CARD_W + 4, CARD_H + 4, 6, 0x0a1628, 1, 0x1e2d40)
      );
    }

    // ── Discard pile ───────────────────────────────────────────────────────
    const discardCount  = discards.length;
    const discardBotY   = DISCARD_Y + CARD_H / 2 + 4;
    this._captureObjs.push(
      this.add.text(DISCARD_X - CARD_W / 2 - 12, DISCARD_Y, 'DISCARD', {
        fontSize: '10px', color: '#556677',
      }).setOrigin(0.5, 0.5).setRotation(-Math.PI / 2)
    );
    if (discardCount > 0) {
      const dTop = discards[discardCount - 1];
      const dSpr = this.add.image(DISCARD_X, DISCARD_Y, dTop.id)
        .setScale(CARD_SCALE).setTint(0x886655).setInteractive({ useHandCursor: true });
      dSpr.on('pointerover', () => dSpr.setTint(TINT_HOVER));
      dSpr.on('pointerout',  () => dSpr.setTint(0x886655));
      dSpr.on('pointerdown', () => this._showDiscardOverlay());
      this._captureObjs.push(dSpr);
      this._captureObjs.push(
        this.add.text(DISCARD_X, discardBotY, `×${discardCount}`, {
          fontSize: '12px', color: '#cc6666', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0)
      );
    } else {
      this._captureObjs.push(
        this._addRoundedRect(DISCARD_X, DISCARD_Y, CARD_W + 4, CARD_H + 4, 6, 0x0a1628, 1, 0x1e2d40)
      );
    }
  }

  // ── Consumable fan (left panel, bottom section) ────────────────────────────
  //
  // Cards are drawn back-to-front (index 0 first) so the highest index is
  // visually on top and receives pointer events first.  Each card is fully
  // interactive; Phaser routes a click to the top-most interactive object at
  // the cursor position, so the visible edge of each lower card is still
  // reachable.

  _renderConsumables() {
    const consumables = run.consumables;  // packed array, no gaps
    const idle        = this._round.phase === 'idle' && !this._animating
                          && !this._yakuGuideOpen && !this._captureOverlayOpen
                          && !this._markMode;

    for (let i = 0; i < consumables.length; i++) {
      const cons     = consumables[i];
      const selected = this._selectedConsumableIndex === i;
      const x        = CONS_BASE_X + i * SLOT_FAN_X;
      const y        = CONS_BASE_Y - (selected ? 15 : 0);
      const depth    = selected ? 10 : i;  // selected card pops above the stack

      const rarityCol = RARITY_COLOR[cons.rarity] ?? RARITY_COLOR.common;

      // Card background.
      const card = this._addRoundedRect(x, y, CONS_CARD_W, CONS_CARD_H, 6, 0x0d1b2a, 1, selected ? rarityCol : 0x2a3a50, 2)
        .setDepth(depth);
      this._consumableObjs.push(card);

      // Rarity left-border strip (matches spirit-column style).
      this._consumableObjs.push(
        this.add.rectangle(x - CONS_CARD_W / 2 + 2, y, 4, CONS_CARD_H - 4, rarityCol)
          .setDepth(depth)
      );

      // Name label — centred on card.
      this._consumableObjs.push(
        this.add.text(x, y, cons.name, { fontSize: '11px', color: '#cce0ff' })
          .setOrigin(0.5).setDepth(depth + 0.1)
      );

      // Hover tooltip — to the right of the card (into play area).
      const tooltip = this.add.text(
        x + CONS_CARD_W / 2 + 8, y, cons.description,
        {
          fontSize: '11px', color: '#e8e8e8',
          backgroundColor: '#0a0f1e',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 160 },
        }
      ).setOrigin(0, 0.5).setDepth(30).setVisible(false);
      this._consumableObjs.push(tooltip);

      if (idle) {
        card.setInteractive(
          new Phaser.Geom.Rectangle(x - CONS_CARD_W / 2, y - CONS_CARD_H / 2, CONS_CARD_W, CONS_CARD_H),
          Phaser.Geom.Rectangle.Contains
        );
        card.input.cursor = 'pointer';
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
    if (this._yakuGuideOpen) this._closeYakuGuide();
    if (this._discardOverlayOpen) this._closeDiscardOverlay();
    this._captureOverlayOpen = true;
    this._clearObjs(this._handObjs);
    this._renderHand();

    const cards = this._round.capture.getAll();
    const cx    = FIELD_CX, cy = 330;
    const objs  = this._captureOverlayObjs;

    objs.push(
      this.add.rectangle(cx, cy, 800, 500, 0x080d1a, 0.95)
        .setStrokeStyle(2, 0x3a6080).setDepth(20)
    );
    objs.push(
      this.add.text(cx, cy - 228, 'Captured Cards', {
        fontSize: '20px', color: '#e8c96a', stroke: '#000000', strokeThickness: 3,
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

      const OV_SCALE = 0.73;
      const OV_W = Math.round(CARD_W * OV_SCALE);
      const OV_H = Math.round(CARD_H * OV_SCALE);
      const OV_GAP   = 6;
      const ROW_MAX  = 10;
      let y = cy - 190;

      for (const type of TYPES) {
        const group = byType[type];
        if (group.length === 0) continue;
        objs.push(
          this.add.text(cx - 360, y, `${TYPE_LABELS[type]}  (${group.length})`, {
            fontSize: '12px', color: '#778899',
          }).setOrigin(0, 0).setDepth(20)
        );
        y += 18;
        let rowStart = 0;
        while (rowStart < group.length) {
          const rowCards = group.slice(rowStart, rowStart + ROW_MAX);
          const rowW     = rowCards.length * (OV_W + OV_GAP) - OV_GAP;
          const startX   = Math.round(cx - rowW / 2 + OV_W / 2);
          const spentIds = this._round.spentCardIds;
          for (let j = 0; j < rowCards.length; j++) {
            const img = this.add.image(startX + j * (OV_W + OV_GAP), Math.round(y + OV_H / 2), rowCards[j].id)
              .setScale(OV_SCALE).setDepth(20);
            if (spentIds?.has(rowCards[j].id)) img.setTint(0x334455).setAlpha(0.5);
            objs.push(img);
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

    // Render above the Bank/Push overlay (depth 25) when it's active.
    if (this._bankPushOpen) {
      for (const obj of objs) if (obj.setDepth) obj.setDepth(32);
    }
  }

  _closeCaptureOverlay() {
    if (!this._captureOverlayOpen) return;
    this._captureOverlayOpen = false;
    this._clearObjs(this._captureOverlayObjs);
    this._clearObjs(this._handObjs);
    this._renderHand();
  }

  // ── Rooster overlay ────────────────────────────────────────────────────────

  /**
   * Show a simple overlay listing the draw-pile cards revealed by Rooster.
   * The player dismisses it manually so they have time to read the names.
   * @param {object[]} cards  Revealed card objects (may be empty).
   * @param {string}   msg    Status message from the effect.
   */
  _showRoosterOverlay(cards, msg) {
    this._setStatus(msg);

    const objs = [];
    const W = 420, H = Math.min(380, 60 + cards.length * 22 + 50);
    const cx = FIELD_CX, cy = 360;

    const bg = this.add.rectangle(cx, cy, W, H, 0x0a1a2e, 0.95)
      .setStrokeStyle(2, 0x4488cc).setDepth(20);
    objs.push(bg);
    objs.push(this.add.text(cx, cy - H / 2 + 18, 'Rooster — Deck Reveal', {
      fontSize: '15px', color: '#88ccff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20));

    if (cards.length === 0) {
      objs.push(this.add.text(cx, cy, '(no matching cards)', {
        fontSize: '13px', color: '#888888',
      }).setOrigin(0.5).setDepth(20));
    } else {
      cards.forEach((card, i) => {
        objs.push(this.add.text(
          cx, cy - H / 2 + 44 + i * 22,
          `${card.name ?? card.id}  [${card.type}]`,
          { fontSize: '13px', color: '#dddddd' }
        ).setOrigin(0.5).setDepth(20));
      });
    }

    const closeBtn = this.add.rectangle(cx, cy + H / 2 - 22, 100, 28, 0x1a4a6a)
      .setStrokeStyle(1, 0x88ccff).setInteractive({ useHandCursor: true }).setDepth(20);
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x2a6a9a));
    closeBtn.on('pointerout',  () => closeBtn.setFillStyle(0x1a4a6a));
    closeBtn.on('pointerdown', () => { objs.forEach(o => o.destroy()); });
    objs.push(closeBtn);
    objs.push(this.add.text(cx, cy + H / 2 - 22, 'Close', {
      fontSize: '13px', color: '#aaddff',
    }).setOrigin(0.5).setDepth(20));
  }

  /**
   * Show a target-picker overlay for zodiac consumables that need a target.
   * targetType: 'slot' (Ox/Monkey) or 'yaku' (Snake).
   * On selection, re-executes the consumable with params and removes it from inventory.
   */
  _showZodiacTargetPicker(cons, inventoryIndex, targetType) {
    const objs = [];
    const cx = FIELD_CX, cy = 360;
    const W = 400, H = 280;

    const bg = this.add.rectangle(cx, cy, W, H, 0x0a1a2e, 0.95)
      .setStrokeStyle(2, 0x44cc88).setDepth(25);
    objs.push(bg);
    objs.push(this.add.text(cx, cy - H / 2 + 18, `${cons.name} — Pick Target`, {
      fontSize: '15px', color: '#88ffcc', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25));

    const cancel = () => {
      objs.forEach(o => o.destroy());
      this._renderAll();
    };

    if (targetType === 'slot') {
      const slots = this._round.field.getSlots();
      objs.push(this.add.text(cx, cy - H / 2 + 44, 'Select a field slot:', {
        fontSize: '13px', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(25));

      slots.forEach((slot, i) => {
        if (!slot) return;
        const btnY = cy - H / 2 + 70 + i * 28;
        const lbl = `Slot ${i + 1}: ${slot.cards.map(c => c.name ?? c.id).join(', ')}`;
        const btn = this.add.rectangle(cx, btnY, 340, 24, 0x1a3a2a)
          .setStrokeStyle(1, 0x44cc88).setInteractive({ useHandCursor: true }).setDepth(25);
        btn.on('pointerover', () => btn.setFillStyle(0x2a5a3a));
        btn.on('pointerout',  () => btn.setFillStyle(0x1a3a2a));
        btn.on('pointerdown', () => {
          objs.forEach(o => o.destroy());
          const result = this._round.useConsumable(cons, { slotIndex: i });
          run.useConsumable(inventoryIndex);
          this._setStatus(result.message ?? `Used ${cons.name}.`);
          this._renderAll();
          this._updateInfoTexts();
        });
        objs.push(btn);
        objs.push(this.add.text(cx, btnY, lbl, { fontSize: '12px', color: '#ccddcc' }).setOrigin(0.5).setDepth(25));
      });

    } else if (targetType === 'yaku') {
      const YAKU_NAMES = ['Kasu', 'Tanzaku', 'Tane', 'Hikari'];
      objs.push(this.add.text(cx, cy - H / 2 + 44, 'Select a yaku to lower threshold:', {
        fontSize: '13px', color: '#aaaaaa',
      }).setOrigin(0.5).setDepth(25));

      YAKU_NAMES.forEach((yakuName, i) => {
        const btnY = cy - H / 2 + 70 + i * 36;
        const btn = this.add.rectangle(cx, btnY, 260, 28, 0x2a1a3a)
          .setStrokeStyle(1, 0xaa44cc).setInteractive({ useHandCursor: true }).setDepth(25);
        btn.on('pointerover', () => btn.setFillStyle(0x3a2a5a));
        btn.on('pointerout',  () => btn.setFillStyle(0x2a1a3a));
        btn.on('pointerdown', () => {
          objs.forEach(o => o.destroy());
          const result = this._round.useConsumable(cons, { yakuName });
          run.useConsumable(inventoryIndex);
          this._setStatus(result.message ?? `Used ${cons.name}.`);
          this._renderAll();
          this._updateInfoTexts();
        });
        objs.push(btn);
        objs.push(this.add.text(cx, btnY, yakuName, { fontSize: '13px', color: '#ddaaff' }).setOrigin(0.5).setDepth(25));
      });
    }

    // Cancel button
    const cancelBtn = this.add.rectangle(cx, cy + H / 2 - 22, 100, 28, 0x3a1a1a)
      .setStrokeStyle(1, 0xff6666).setInteractive({ useHandCursor: true }).setDepth(25);
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x5a2a2a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x3a1a1a));
    cancelBtn.on('pointerdown', cancel);
    objs.push(cancelBtn);
    objs.push(this.add.text(cx, cy + H / 2 - 22, 'Cancel', {
      fontSize: '13px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(25));
  }

  // ── Card selection ─────────────────────────────────────────────────────────

  _toggleCardSelection(cardId) {
    if (this._scoringAnimating) return;
    if (this._selectedCardIds.has(cardId)) {
      this._selectedCardIds.delete(cardId);
    } else {
      this._selectedCardIds.add(cardId);
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
      this._selectedCardIds.clear();
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
    // Fire wild targeting: replace normal buttons with a cancel button.
    if (this._fireWildCard) {
      const y         = 700;
      const cancelBtn = this.add.rectangle(HAND_CX, y, 180, 40, 0x3a1a0a)
        .setStrokeStyle(2, 0xaa6622).setInteractive({ useHandCursor: true }).setDepth(5);
      cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x5a2a0a));
      cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x3a1a0a));
      cancelBtn.on('pointerdown', () => {
        this._fireWildCard = null;
        this._selectedCardIds.clear();
        this._setStatus('Play cancelled.');
        this._renderAll();
      });
      this._actionBtnObjs.push(cancelBtn);
      this._actionBtnObjs.push(
        this.add.text(HAND_CX, y, 'Cancel (ESC)', { fontSize: '15px', color: '#ffaa66' })
          .setOrigin(0.5).setDepth(5)
      );
      return;
    }

    const idle  = this._round.phase === 'idle' && !this._animating
                    && !this._yakuGuideOpen && !this._captureOverlayOpen
                    && !this._markMode;
    const count = this._selectedCardIds.size;

    // ── Use / Activate button (consumable selected) ────────────────────────
    if (idle && this._selectedConsumableIndex !== null) {
      const cons = run.consumables[this._selectedConsumableIndex];
      if (cons) {
        const y       = 700;
        const isMark    = cons.id && (cons.id.startsWith('mark_') || cons.id.startsWith('element_'));
        const btnLabel  = isMark ? `Activate: ${cons.name}` : `Use: ${cons.name}`;

        const useBtnX = isMark ? HAND_CX : HAND_CX - 60;
        const useBtn = this.add.rectangle(useBtnX, y, isMark ? 210 : 160, 40, 0x1a2a5a)
          .setStrokeStyle(2, 0x4466cc).setInteractive({ useHandCursor: true }).setDepth(5);
        useBtn.on('pointerover',  () => useBtn.setFillStyle(0x2a4a8a));
        useBtn.on('pointerout',   () => useBtn.setFillStyle(0x1a2a5a));
        useBtn.on('pointerdown',  () => {
          if (isMark) {
            this._activateMark(cons, this._selectedConsumableIndex);
            this._selectedConsumableIndex = null;
          } else {
            const idx = this._selectedConsumableIndex;
            // Check if this consumable needs a target before executing.
            const precheck = this._round.useConsumable(cons, {});
            if (!precheck.success && precheck.needsTarget) {
              this._selectedConsumableIndex = null;
              this._showZodiacTargetPicker(cons, idx, precheck.needsTarget);
            } else {
              this._selectedConsumableIndex = null;
              run.useConsumable(idx);
              this._clearObjs(this._consumableObjs);
              this._clearObjs(this._actionBtnObjs);
              if (precheck.revealedCards) {
                this._showRoosterOverlay(precheck.revealedCards, precheck.message);
              } else {
                this._setStatus(precheck.message ?? `Used ${cons.name}.`);
              }
              this._renderConsumables();
              this._renderActionButtons();
              this._updateInfoTexts();
            }
          }
        });
        this._actionBtnObjs.push(useBtn);
        this._actionBtnObjs.push(
          this.add.text(useBtnX, y, btnLabel, {
            fontSize: '15px', color: '#aaddff',
          }).setOrigin(0.5).setDepth(5)
        );

        // Sell button for zodiac consumables (50% refund).
        if (!isMark && cons.id.startsWith('zodiac_')) {
          const sellBtn = this.add.rectangle(HAND_CX + 70, y, 100, 40, 0x3a1a1a)
            .setStrokeStyle(2, 0xff6666).setInteractive({ useHandCursor: true }).setDepth(5);
          sellBtn.on('pointerover', () => sellBtn.setFillStyle(0x5a2a2a));
          sellBtn.on('pointerout',  () => sellBtn.setFillStyle(0x3a1a1a));
          sellBtn.on('pointerdown', () => {
            const idx = this._selectedConsumableIndex;
            const sr  = run.sellConsumable(idx);
            this._selectedConsumableIndex = null;
            this._clearObjs(this._consumableObjs);
            this._clearObjs(this._actionBtnObjs);
            this._setStatus(`Sold ${cons.name}. +${sr.kiReturned} ki.`);
            this._renderConsumables();
            this._renderActionButtons();
            this._updateInfoTexts();
          });
          this._actionBtnObjs.push(sellBtn);
          this._actionBtnObjs.push(
            this.add.text(HAND_CX + 70, y, 'Sell', { fontSize: '15px', color: '#ff8888' })
              .setOrigin(0.5).setDepth(5)
          );
        }
      }
      return;
    }

    if (!idle || count === 0) return;

    // Play is enabled only when all selected cards share the same month.
    const allHandCards   = this._round.hand.getAll();
    const selectedCards  = allHandCards.filter(c => this._selectedCardIds.has(c.id));
    const mixedMonths    = selectedCards.length > 1 &&
                           !selectedCards.every(c => c.month === selectedCards[0].month);
    const playEnabled    = selectedCards.length > 0 && !mixedMonths;

    // Show a hint when the selection spans multiple months.
    if (mixedMonths) {
      this._setStatus('Select cards of the same month to play.');
    }

    const y = 700;

    const playBtn = this.add.rectangle(HAND_CX - 90, y, 160, 40,
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
      this.add.text(HAND_CX - 90, y, 'Play', {
        fontSize: '16px', color: playEnabled ? '#ffffff' : '#445544',
      }).setOrigin(0.5).setDepth(5)
    );

  }

  // ── Three Marks (in-round targeting) ──────────────────────────────────────

  /**
   * Enter mark mode for a Three Marks consumable.
   * @param {object} cons  The consumable object from run.consumables.
   * @param {number} idx   Its index in the consumable inventory.
   */
  _activateMark(cons, idx) {
    this._markMode = { id: cons.id, index: idx, step: 'select_source', sourceCard: null };
    const ELEMENT_LABELS = {
      water: 'Snow (2×pts, depreciates)', wood:  'Leaf (slot bypass)',
      fire:  'Ember (wildcard, 10pts)', earth: 'Clay (ki interest)',
      metal: 'Iron (proc chance)',
    };
    const instructions = {
      mark_impermanence:  'Impermanence: click a card to promote it. ESC to cancel.',
      mark_nonbeing:      'Non-being: click a card to permanently remove it. ESC to cancel.',
      mark_transcendence: 'Transcendence: click the SOURCE card first. ESC to cancel.',
    };
    let msg = instructions[cons.id];
    if (!msg && cons.id.startsWith('element_')) {
      const element = cons.id.replace('element_', '');
      const label   = ELEMENT_LABELS[element] ?? cons.name;
      msg = `${cons.name}: apply ${label} to a card. ESC to cancel.`;
    }
    this._setStatus(msg ?? 'Click a card. ESC to cancel.');
    this._renderAll();
  }

  /**
   * Handle a card click while in mark mode.
   * @param {object} card  The card object that was clicked.
   */
  _onMarkCardSelected(card) {
    if (!this._markMode) return;
    const { id, index } = this._markMode;
    const consName = run.consumables[index]?.name ?? id;

    if (id === 'mark_impermanence') {
      run.promoteCard(card.id);
      run.useConsumable(index);
      logger.logConsumableUse(consName, `promoted ${card.id}`);
      this._markMode = null;
      this._setStatus(`Impermanence: ${card.name} promoted.`);
      this._renderAll();

    } else if (id === 'mark_nonbeing') {
      run.deleteCard(card.id);
      this._round.removeCardFromHand(card.id);
      this._round.removeCardFromField(card.id);
      run.useConsumable(index);
      logger.logConsumableUse(consName, `deleted ${card.id}`);
      this._markMode = null;
      this._setStatus(`Non-being: ${card.name} removed from your deck.`);
      this._renderAll();

    } else if (id === 'mark_transcendence') {
      if (this._markMode.step === 'select_source') {
        this._markMode.step       = 'select_target';
        this._markMode.sourceCard = card;
        this._setStatus(`Transcendence: source is ${card.name}. Now click target. ESC to cancel.`);
        this._renderAll();
      } else {
        // select_target — card = the target whose properties will be copied.
        const sourceCard = this._markMode.sourceCard;
        const ENH_NAMES_TR = {
          water: { base: 'Snow', upgraded: 'Ice' },
          wood:  { base: 'Leaf', upgraded: 'Silk' },
          fire:  { base: 'Ember', upgraded: 'Charcoal' },
          earth: { base: 'Clay', upgraded: 'Pottery' },
          metal: { base: 'Iron', upgraded: 'Meteorite' },
        };
        const te = card.enhancement;
        const enhMsg = te
          ? `with ${ENH_NAMES_TR[te.element]?.[te.tier] ?? te.element} enhancement`
          : 'no enhancement';
        run.transcendCard(sourceCard.id, card.id);
        run.useConsumable(index);
        logger.logConsumableUse(consName, `${sourceCard.id} → ${card.id}`);
        this._markMode = null;
        this._setStatus(`Transcendence: ${sourceCard.name} → copy of ${card.name} (${enhMsg}).`);
        this._renderAll();
      }

    } else if (id.startsWith('element_')) {
      const element = id.replace('element_', '');
      const result  = run.applyElement(card.id, element);

      // Handle stripped → return base consumable if inventory has space.
      let extraMsg = '';
      if (result.action === 'stripped' && result.returnedConsumable) {
        const returnedDef = getElementDef(result.returnedConsumable);
        if (returnedDef && run.canAddConsumable) {
          try {
            run.addConsumable({
              id: returnedDef.id, name: returnedDef.name,
              description: returnedDef.description, category: returnedDef.category,
            });
            extraMsg = `  ${returnedDef.name} returned to inventory.`;
          } catch (_) {
            extraMsg = `  ${returnedDef.name} recovered but inventory full — lost!`;
          }
        } else if (returnedDef) {
          extraMsg = `  ${returnedDef.name} recovered but inventory full — lost!`;
        }
      }

      const ENH_NAMES = {
        water: { base: 'Snow', upgraded: 'Ice' },
        wood:  { base: 'Leaf', upgraded: 'Silk' },
        fire:  { base: 'Ember', upgraded: 'Charcoal' },
        earth: { base: 'Clay', upgraded: 'Pottery' },
        metal: { base: 'Iron', upgraded: 'Meteorite' },
      };
      const enhName = ENH_NAMES[element]?.[result.action === 'upgraded' ? 'upgraded' : 'base'] ?? element;

      const ACTION_MSG = {
        applied_base: `${enhName} applied to ${card.name}!`,
        upgraded:     `Upgraded to ${ENH_NAMES[element]?.upgraded ?? element}!`,
        stripped:     `Enhancement stripped!${extraMsg}`,
        overwritten:  `Overwritten with ${enhName}.`,
        no_effect:    'No effect.',
      };

      run.useConsumable(index);
      logger.logConsumableUse(consName, `${result.action} on ${card.id}`);
      this._markMode = null;
      this._setStatus(ACTION_MSG[result.action] ?? 'Done.');
      this._renderAll();
    }
  }

  _onPlayButton() {
    const cardIds = [...this._selectedCardIds];

    // Single fire-enhanced card → enter wild field-targeting mode.
    if (cardIds.length === 1) {
      const handMap = new Map(this._round.hand.getAll().map(c => [c.id, c]));
      const card    = handMap.get(cardIds[0]);
      const hasField = this._round.field.getSlots().some(s => s !== null);
      if (card?.enhancement?.element === 'fire' && hasField) {
        this._fireWildCard = card;
        this._setStatus('Fire wild: click a field slot to play onto. ESC to cancel.');
        this._clearObjs(this._actionBtnObjs);
        this._renderAll();
        return;
      }
    }

    this._selectedCardIds.clear();
    this._clearObjs(this._actionBtnObjs);
    this._playCards(cardIds);
  }

  _onDiscardButton() {
    if (this._animating || this._scoringAnimating) return;
    const cardIds = [...this._selectedCardIds];
    this._selectedCardIds.clear();
    this._clearObjs(this._actionBtnObjs);

    let result;
    try {
      result = this._round.discardCards(cardIds);
    } catch (e) {
      console.error('[GameScene] discardCards error:', e.message);
      this._setStatus(e.message);
      this._renderAll();
      return;
    }

    for (const card of result.removed) logger.logAction('discard', { cardId: card.id });
    const n = result.removed.length;
    this._setStatus(`Discarded ${n} card${n > 1 ? 's' : ''}  —  play your next card.`);
    this._renderAll();
  }

  // ── Play cards ─────────────────────────────────────────────────────────────

  _playFireWild(targetSlotMonth) {
    if (!this._fireWildCard) return;
    const cardId = this._fireWildCard.id;
    this._fireWildCard = null;
    this._selectedCardIds.clear();
    this._playCards([cardId], targetSlotMonth);
  }

  async _playCards(cardIds, targetMonth = null) {
    if (this._animating || this._scoringAnimating) return;

    // Log the play action before calling into the round manager.
    const _handMap     = new Map(this._round.hand.getAll().map(c => [c.id, c]));
    const _targetMonth = targetMonth ?? _handMap.get(cardIds[0])?.month;
    logger.logAction('play', { cardIds, targetMonth: _targetMonth });

    let handResult;
    try {
      handResult = this._round.playHandCards(cardIds, targetMonth);
    } catch (e) {
      console.error('[GameScene] playHandCards error:', e.message);
      return;
    }

    this._animating = true;
    this._renderAll();

    // Animate any captures produced by the hand phase.
    await this._playScoringAnimation();

    // Show field-discard sprites briefly then proceed to deck phase.
    const handDiscardSprs = handResult.discarded.map((card, i) =>
      this.add.image(FLIP_X + 40, FLIP_Y - 60 + i * 20, card.id)
        .setScale(CARD_SCALE).setTint(TINT_DISCARD).setDepth(10)
    );
    if (handDiscardSprs.length > 0) await this._delay(400);
    for (const spr of handDiscardSprs) spr.destroy();

    let deckResult;
    try {
      deckResult = this._round.playDeckPhase();
    } catch (e) {
      console.error('[GameScene] playDeckPhase error:', e.message);
      this._animating = false;
      return;
    }

    await new Promise(resolve => this._showDeckAnimation(deckResult, resolve));

    // Animate any captures produced by the deck phase.
    await this._playScoringAnimation();

    this._animating = false;
    const styleCombos = this._round.lastStyleCombos;
    if (styleCombos.length > 0) this._showStyleComboPopup(styleCombos);
    this._handleResult(deckResult);
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
      const spr = this.add.image(FLIP_X + 40, FLIP_Y - 60 + i * 20, result.discarded[i].id)
        .setScale(CARD_SCALE).setTint(TINT_DISCARD).setDepth(10);
      temp.push(spr);
      this.tweens.add({ targets: spr, alpha: 0, duration: FLIP_HOLD - 100, ease: 'Linear' });
    }

    this.time.delayedCall(FLIP_HOLD, () => {
      for (const obj of temp) obj.destroy();
      onComplete();
    });
  }

  // ── Style combo popup ──────────────────────────────────────────────────────

  /**
   * Show a brief, non-blocking toast for newly triggered style combos.
   * Fades out automatically — no pause, no buttons.
   * @param {{ name: string, bonus: number }[]} combos
   */
  _showStyleComboPopup(combos) {
    const x = CAPTURE_X - 20;
    let y = CAPTURE_TOP_Y + 80;

    for (const combo of combos) {
      const label = `${combo.name}  +${combo.bonus.toFixed(1)} Style`;
      const txt = this.add.text(x, y, label, {
        fontSize: '14px',
        color: '#ffcc44',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(30).setAlpha(1);

      this.tweens.add({
        targets:  txt,
        alpha:    0,
        y:        y - 30,
        duration: 1400,
        ease:     'Cubic.easeOut',
        onComplete: () => txt.destroy(),
      });

      y -= 24;
    }
  }

  // ── Result dispatcher ─────────────────────────────────────────────────────

  _handleResult(result) {
    switch (result.status) {
      case 'ok': {
        const nd = result.discarded.length;
        if (nd > 0) {
          this._setStatus(`${nd} card${nd > 1 ? 's' : ''} discarded (field full)  —  play your next card.`);
        } else {
          this._setStatus(`Deck: ${result.deckCard ? result.deckCard.name : '—'}  —  play your next card.`);
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
    // Update mark mode status prompt when in mark mode.
    if (this._markMode) {
      const { id, step } = this._markMode;
      if (id === 'mark_transcendence' && step === 'select_target') {
        this._setStatus(`Transcendence: source is ${this._markMode.sourceCard.name}. Click target. ESC to cancel.`);
      }
    }

    const drawSize = this._round.deck.drawPileSize;

    this._actRoundText.setText(`Act ${run.act}  R${run.round}/36`);
    this._kiText.setText(`Ki: ${run.ki}`);
    this._thresholdText.setText(`Target: ${run.threshold}`);

    const runScore = this._round.runningScore;
    const thr      = run.threshold;
    this._scoreTotText.setStyle({ color: runScore >= thr ? '#44ff88' : '#ffffff', fontStyle: 'bold' });

    this._deckSprite.setVisible(drawSize > 0);
    this._deckCountText.setText(String(drawSize));
  }

  // ── End screen ────────────────────────────────────────────────────────────

  _showEndScreen(result) {
    this._clearObjs(this._overlayObjs);
    // Clear all board visuals — round is over; overlay takes center stage.
    this._clearObjs(this._handObjs);
    this._clearObjs(this._fieldObjs);
    this._clearObjs(this._actionBtnObjs);
    this._clearObjs(this._consumableObjs);
    const cx = FIELD_CX, cy = 330;

    // Compute threshold and ki reward before any state changes.
    const tr       = run.checkThreshold(result.finalScore);
    const kiEarned = run.calculateKiReward(result);

    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 720, 560, 0x080d1a, 0.93).setStrokeStyle(2, 0x3a6080)
    );

    // ── Title ─────────────────────────────────────────────────────────────
    this._overlayObjs.push(
      this.add.text(cx, cy - 258,
        result.status === 'banked' ? 'Score Banked!' : 'Round Over',
        {
          fontSize: '34px',
          color: result.status === 'banked' ? '#88dd88' : '#e8c96a',
          stroke: '#000000', strokeThickness: 4,
        }
      ).setOrigin(0.5)
    );

    // Act / Round subtitle
    this._overlayObjs.push(
      this.add.text(cx, cy - 226,
        `Act ${run.act}  —  Round ${run.round} of ${RunManager.TOTAL_ROUNDS}`,
        { fontSize: '14px', color: '#6688aa' }
      ).setOrigin(0.5)
    );

    // ── Score breakdown ───────────────────────────────────────────────────
    let y = cy - 204;

    // Show capture event summary.
    const events = this._round.scoringEvents;
    if (events.length === 0) {
      this._overlayObjs.push(
        this.add.text(cx, y, 'No captures this round.', {
          fontSize: '15px', color: '#778899',
        }).setOrigin(0.5)
      );
      y += 24;
    } else {
      this._overlayObjs.push(
        this.add.text(cx, y, `Captures  (${events.length} total)`, {
          fontSize: '14px', color: '#778899',
        }).setOrigin(0.5)
      );
      y += 20;
      const displayEvents = events.slice(-6);
      if (events.length > 6) {
        this._overlayObjs.push(
          this.add.text(cx, y, `\u2026 and ${events.length - 6} earlier captures`, {
            fontSize: '12px', color: '#556677',
          }).setOrigin(0.5)
        );
        y += 16;
      }
      for (const ev of displayEvents) {
        if (ev.type !== 'capture') continue;
        const tags = ev.cards.map(c => c.type[0].toUpperCase()).join('');
        const mult = (ev.mult ?? 1.0).toFixed(1);
        const fl   = (ev.flow ?? 1.0).toFixed(2);
        const line = `[${tags}]  ${ev.capturePoints ?? 0}pt \xD7${mult}m \xD7${fl}f \u2192 +${ev.captureScore ?? 0}`;
        this._overlayObjs.push(
          this.add.text(cx, y, line, { fontSize: '13px', color: '#cce0ff' }).setOrigin(0.5)
        );
        y += 18;
      }
    }
    y += 6;
    if (result.penaltyApplied) {
      this._overlayObjs.push(
        this.add.text(cx, y, `\u26A0 Push failed — Flow \xD70.90`, {
          fontSize: '13px', color: '#ff8866',
        }).setOrigin(0.5)
      );
      y += 20;
    }
    // Flow decay (always shown)
    const preDecayFlow = run.flow / RunManager.FLOW_DECAY_RATE;
    const decayDelta   = (run.flow - preDecayFlow).toFixed(2);
    this._overlayObjs.push(
      this.add.text(cx, y,
        `Flow decay \xD70.95 \u2192 \xD7${run.flow.toFixed(2)}  (${decayDelta})`,
        { fontSize: '12px', color: '#7799aa' }
      ).setOrigin(0.5)
    );
    y += 20;
    this._overlayObjs.push(
      this.add.text(cx, y, `Final Score: ${result.finalScore}`, {
        fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5)
    );
    y += 32;

    const cardsInHand = result.cardsInHand ?? 0;
    const styleCombos = result.styleCombos ?? 0;
    let kiLabel = `Ki earned: +${kiEarned}  (base 5`;
    if (cardsInHand > 0) kiLabel += ` +${cardsInHand} cards`;
    if (styleCombos > 0) kiLabel += ` +${styleCombos} style`;
    kiLabel += ')';
    this._overlayObjs.push(
      this.add.text(cx, y, kiLabel, {
        fontSize: '16px', color: '#ffee88', stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5)
    );
    y += 24;

    // ── Threshold section ─────────────────────────────────────────────────
    this._overlayObjs.push(this.add.rectangle(cx, y + 10, 580, 1, 0x2a3a50));
    y += 22;

    this._overlayObjs.push(
      this.add.text(cx, y, `Threshold: ${tr.threshold}`, {
        fontSize: '13px', color: '#556677',
      }).setOrigin(0.5)
    );
    y += 22;

    const absPct = Math.round(Math.abs(tr.marginPct));
    if (tr.passed) {
      const sign = tr.margin >= 0 ? '+' : '';
      this._overlayObjs.push(
        this.add.text(cx, y,
          `\u2713 Cleared!  ${tr.score} / ${tr.threshold}  (${sign}${Math.round(tr.margin)}, ${sign}${absPct}%)`,
          { fontSize: '16px', color: '#44dd88', stroke: '#000000', strokeThickness: 2 }
        ).setOrigin(0.5)
      );
    } else {
      this._overlayObjs.push(
        this.add.text(cx, y,
          `\u2717 Failed.  ${tr.score} / ${tr.threshold}  (${absPct}% short)`,
          { fontSize: '16px', color: '#ee4444', stroke: '#000000', strokeThickness: 2 }
        ).setOrigin(0.5)
      );
    }

    // ── Action / button ───────────────────────────────────────────────────
    const btnY = cy + 248;

    if (!tr.passed) {
      // ── Run over ──────────────────────────────────────────────────────
      run.addKi(kiEarned);
      run.endRun(false);
      logger.logRunEnd('failed', run.round);
      logger.logRunSummary({
        round: run.round, ki: run.ki,
        spirits: run.spirits, yakuUpgrades: run.yakuUpgrades,
        deckSize: run.getDeck().length,
        enhancedCards: run.getDeck().filter(c => c.enhancement),
        promotedCards: run.getDeck().filter(c => c.promotionProgress > 0),
      });

      // ── Copy Log button ───────────────────────────────────────────────
      const logBtnText = this.add.text(cx + 200, cy + 180, 'Copy Game Log', {
        fontSize: '11px', color: '#88aacc',
      }).setOrigin(0.5);
      const logBtn = this.add.rectangle(cx + 200, cy + 180, 120, 30, 0x1a3a5a)
        .setStrokeStyle(1, 0x4466cc).setInteractive({ useHandCursor: true });
      logBtn.on('pointerdown', async () => {
        const ok = await logger.copyToClipboard();
        logBtnText.setText(ok ? 'Copied!' : 'Check console');
      });
      this._overlayObjs.push(logBtn, logBtnText);

      const btn = this.add.rectangle(cx, btnY, 230, 46, 0x5a1a1a)
        .setStrokeStyle(2, 0xaa3333).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setFillStyle(0x8a2a2a));
      btn.on('pointerout',  () => btn.setFillStyle(0x5a1a1a));
      btn.on('pointerdown', () => { run.reset(); this.scene.start('BootScene'); });
      this._overlayObjs.push(btn);
      this._overlayObjs.push(
        this.add.text(cx, btnY, 'Return to Menu', { fontSize: '18px', color: '#ffaaaa' })
          .setOrigin(0.5)
      );

    } else {
      // ── Threshold passed — advance and branch ─────────────────────────
      run.addKi(kiEarned);
      run.advanceRound(result.finalScore);

      if (run.isRunComplete) {
        // ── Victory ─────────────────────────────────────────────────
        run.endRun(true);
        logger.logRunEnd('victory', run.round);
        logger.logRunSummary({
          round: run.round, ki: run.ki,
          spirits: run.spirits, yakuUpgrades: run.yakuUpgrades,
          deckSize: run.getDeck().length,
          enhancedCards: run.getDeck().filter(c => c.enhancement),
          promotedCards: run.getDeck().filter(c => c.promotionProgress > 0),
        });

        // ── Copy Log button ───────────────────────────────────────────
        const logBtnTextV = this.add.text(cx + 200, cy + 180, 'Copy Game Log', {
          fontSize: '11px', color: '#88aacc',
        }).setOrigin(0.5);
        const logBtnV = this.add.rectangle(cx + 200, cy + 180, 120, 30, 0x1a3a5a)
          .setStrokeStyle(1, 0x4466cc).setInteractive({ useHandCursor: true });
        logBtnV.on('pointerdown', async () => {
          const ok = await logger.copyToClipboard();
          logBtnTextV.setText(ok ? 'Copied!' : 'Check console');
        });
        this._overlayObjs.push(logBtnV, logBtnTextV);

        this._overlayObjs.push(
          this.add.text(cx, y + 32, 'Run Complete!', {
            fontSize: '20px', color: '#ffee44', stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5)
        );
        const btn = this.add.rectangle(cx, btnY, 260, 46, 0x3a6a1a)
          .setStrokeStyle(2, 0x88cc44).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x5a9a2a));
        btn.on('pointerout',  () => btn.setFillStyle(0x3a6a1a));
        btn.on('pointerdown', () => { run.reset(); this.scene.start('BootScene'); });
        this._overlayObjs.push(btn);
        this._overlayObjs.push(
          this.add.text(cx, btnY, 'Victory!  Return to Menu', {
            fontSize: '16px', color: '#ccff88',
          }).setOrigin(0.5)
        );

      } else {
        // ── Always visit the shop; Grove rounds get the special variant ─
        const isGrove = run.nextIsGrove;

        if (isGrove) {
          this._overlayObjs.push(
            this.add.text(cx, y + 32, 'Entering the Sacred Grove\u2026', {
              fontSize: '14px', color: '#ffcc44',
            }).setOrigin(0.5)
          );
        }

        const btnLabel  = isGrove ? 'Visit Sacred Grove' : 'Visit Shrine';
        const btnColor  = isGrove ? 0x4a4a1a : 0x1a4a6a;
        const btnHover  = isGrove ? 0x6a6a2a : 0x2a6a9a;
        const btnStroke = isGrove ? 0xaaaa44 : 0x4488aa;

        const btn = this.add.rectangle(cx, btnY, 230, 46, btnColor)
          .setStrokeStyle(2, btnStroke).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(btnHover));
        btn.on('pointerout',  () => btn.setFillStyle(btnColor));
        btn.on('pointerdown', () => this.scene.start('ShrineScene', { isGrove }));
        this._overlayObjs.push(btn);
        this._overlayObjs.push(
          this.add.text(cx, btnY, btnLabel, { fontSize: '18px', color: '#ffffff' })
            .setOrigin(0.5)
        );
      }
    }
  }

  _restartRound() {
    this._closeCaptureOverlay();
    this._closeYakuGuide();
    this._clearObjs(this._overlayObjs);
    this._selectedCardIds.clear();
    this._selectedConsumableIndex = null;
    this._markMode = null;
    this._round.setSpirits(run.spirits);
    this._round.setStyleBase(run.styleBase);
    this._round.startRound();
    this._afterRoundStart();
    this._renderAll();
  }

  // ── Capture yaku overlay ──────────────────────────────────────────────────

  _showCaptureYakuOverlay(result) {
    this._bankPushOpen = true;
    this._clearObjs(this._overlayObjs);
    const cx = FIELD_CX, cy = 270;

    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 490, 280, 0x080d1a, 0.96)
        .setStrokeStyle(2, 0x6a9a3a).setDepth(25)
    );
    this._overlayObjs.push(
      this.add.text(cx, cy - 122, 'Yaku Reached!', {
        fontSize: '20px', color: '#e8c96a', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25)
    );

    let y = cy - 92;
    for (const yaku of result.newYaku) {
      this._overlayObjs.push(
        this.add.text(cx, y, yaku.name, { fontSize: '16px', color: '#ffee88' })
          .setOrigin(0.5).setDepth(25)
      );
      y += 22;
    }
    y += 8;
    this._overlayObjs.push(
      this.add.text(cx, y, `Running: ${result.runningScore}`, {
        fontSize: '15px', color: '#88ffcc',
      }).setOrigin(0.5).setDepth(25)
    );
    y += 20;
    const threshold   = run.threshold;
    const surplus     = result.runningScore - threshold;
    const threshColor = surplus >= 0 ? '#88ff88' : '#ff8888';
    const threshLabel = surplus >= 0
      ? `Threshold: ${threshold}  (\u2713 +${surplus} surplus)`
      : `Threshold: ${threshold}  (need ${-surplus} more)`;
    this._overlayObjs.push(
      this.add.text(cx, y, threshLabel, { fontSize: '13px', color: threshColor })
        .setOrigin(0.5).setDepth(25)
    );

    const btnY = cy + 118;

    const bankFlow  = (run.flow * RunManager.FLOW_DECAY_RATE).toFixed(2);
    const bankLabel = surplus >= 0
      ? `Bank  \xD7${bankFlow} flow  (+${surplus})`
      : `Bank  \xD7${bankFlow} flow  (need ${-surplus})`;
    const bankBtn = this.add.rectangle(cx - 118, btnY, 206, 42, 0x1a6a1a)
      .setStrokeStyle(2, 0x44aa44).setInteractive({ useHandCursor: true }).setDepth(25);
    bankBtn.on('pointerover', () => bankBtn.setFillStyle(0x2a9a2a));
    bankBtn.on('pointerout',  () => bankBtn.setFillStyle(0x1a6a1a));
    bankBtn.on('pointerdown', () => {
      this._bankPushOpen = false;
      logger.logBankPushDecision('bank', this._round.pushCount);
      const bankedResult = this._round.bankScore();
      this._clearObjs(this._overlayObjs);
      this._renderAll();
      this._showEndScreen(bankedResult);
    });
    this._overlayObjs.push(bankBtn);
    this._overlayObjs.push(
      this.add.text(cx - 118, btnY, bankLabel, {
        fontSize: '13px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(25)
    );

    const pushCount  = this._round.pushCount;
    const PUSH_DEALS = [4, 2, 1];
    const nextDeal   = PUSH_DEALS[Math.min(pushCount, PUSH_DEALS.length - 1)];
    const D          = RunManager.FLOW_DECAY_RATE;
    const failFlow   = (run.flow * 0.9 * D).toFixed(2);
    const winFlow    = (run.flow * 1.1 * D).toFixed(2);
    const pushBtn = this.add.rectangle(cx + 118, btnY, 206, 42, 0x6a1a1a)
      .setStrokeStyle(2, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(25);
    pushBtn.on('pointerover', () => pushBtn.setFillStyle(0x9a2a2a));
    pushBtn.on('pointerout',  () => pushBtn.setFillStyle(0x6a1a1a));
    pushBtn.on('pointerdown', () => {
      this._bankPushOpen = false;
      logger.logBankPushDecision('push', this._round.pushCount);
      this._round.pushOn();
      this._clearObjs(this._overlayObjs);
      this._setStatus(`Pushed! +${nextDeal} cards. Win: Flow ×${winFlow}  Fail: Flow ×${failFlow}`);
      this._renderAll();
    });
    this._overlayObjs.push(pushBtn);
    this._overlayObjs.push(
      this.add.text(cx + 118, btnY, `Push +${nextDeal}  W:\xD7${winFlow} / F:\xD7${failFlow}`, {
        fontSize: '13px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(25)
    );
  }

  // ── Yaku decision overlay ─────────────────────────────────────────────────

  _showYakuDecision(result) {
    this._showCaptureYakuOverlay(result);
  }

  // ── Scoring breakdown helpers ─────────────────────────────────────────────

  /** Drain the scoring event queue, animating each step with pauses. */
  async _playScoringAnimation() {
    if (this._scoringQueue.length === 0) return;
    this._scoringAnimating = true;
    const queue = this._scoringQueue.splice(0);   // drain in place
    for (const event of queue) {
      await this._animateScoringEvent(event);
    }
    // Brief hold so player can read the final values, then reset.
    await this._delay(600);
    this._scorePtsText.setText('Points: 0');
    this._scoreMltText.setText('Mult: 1.0');
    this._scoringAnimating = false;
  }

  /** Animate a single scoring event and resolve after the appropriate pause. */
  async _animateScoringEvent(event) {
    switch (event.type) {
      case 'capture_start': {
        this._scorePtsText.setText('Points: 0');
        this._scoreMltText.setText('Mult: 1.0');
        await this._delay(100);
        break;
      }
      case 'card_points': {
        this._highlightScoringCard(event.card);
        this._scorePtsText.setText(`Points: ${event.points}`);
        this._flashText(this._scorePtsText, '#ffffff');
        this._showFloatingScore(`+${event.cardPts}`, this._scorePtsText.x + 70, this._scorePtsText.y, '#aaccee');
        await this._delay(300);
        break;
      }
      case 'spirit_effect': {
        this._scorePtsText.setText(`Points: ${event.points}`);
        this._scoreMltText.setText(`Mult: ${event.mult.toFixed(1)}`);
        if (event.addPoints > 0) {
          this._showSpiritTrigger(event.spirit, `+${event.addPoints} pts`);
          this._flashText(this._scorePtsText, '#ffffff');
          await this._delay(250);
        }
        if (event.addMult > 0) {
          this._showSpiritTrigger(event.spirit, `+${event.addMult} mult`);
          this._flashText(this._scoreMltText, '#ffcc66');
          await this._delay(250);
        }
        if (event.multiplyMult && event.multiplyMult !== 1) {
          this._showSpiritTrigger(event.spirit, `\xD7${event.multiplyMult.toFixed(1)} mult`);
          this._flashText(this._scoreMltText, '#ff8844');
          await this._delay(250);
        }
        break;
      }
      case 'engine_state_update': {
        this._showSpiritTrigger(event.spirit, '\u25B2');
        this._pulseSpiritIcon(run.spirits.indexOf(event.spirit));
        await this._delay(150);
        break;
      }
      case 'engine_effect': {
        this._scorePtsText.setText(`Points: ${event.points}`);
        this._scoreMltText.setText(`Mult: ${event.mult.toFixed(1)}`);
        if (event.addMult > 0) {
          this._showSpiritTrigger(event.spirit, `+${event.addMult.toFixed(1)} mult`);
          this._flashText(this._scoreMltText, '#ffcc66');
          await this._delay(300);
        }
        if (event.multiplyMult && event.multiplyMult > 1) {
          this._showSpiritTrigger(event.spirit, `\xD7${event.multiplyMult.toFixed(2)}`);
          this._flashText(this._scoreMltText, '#ff8844');
          await this._delay(300);
        }
        break;
      }
      case 'capture_complete': {
        this._scoreFlwText.setText(`Flow: \xD7${event.flow.toFixed(2)}`);
        this._scoreTotText.setText(`Total: ${event.runningTotal}`);
        this._flashText(this._scoreTotText, '#44ff88');
        const summary = `${event.points} \xD7 ${event.mult.toFixed(1)} \xD7 ${event.flow.toFixed(2)} = ${event.captureScore}`;
        this._showFloatingScore(summary, this._scoreTotText.x, this._scoreTotText.y - 14, '#44ff88');
        await this._delay(400);
        break;
      }
    }
  }

  /** Returns a Promise that resolves after ms milliseconds (Phaser timer). */
  _delay(ms) {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  /** Floating score text that rises and fades from (x, y). */
  _showFloatingScore(text, x, y, color = '#ffffff') {
    const floatText = this.add.text(x, y, text, {
      fontSize: '11px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(50);
    this.tweens.add({
      targets: floatText,
      y: y - 20,
      alpha: 0,
      duration: 700,
      ease: 'Power2',
      onComplete: () => floatText.destroy(),
    });
  }

  /** Brief tint highlight on the card image in the capture fan (best-effort). */
  _highlightScoringCard(card) {
    for (const obj of this._captureObjs) {
      if (obj.texture?.key === card.id) {
        obj.setTint(0xffffaa);
        this.time.delayedCall(400, () => { if (obj.active) obj.clearTint(); });
        break;
      }
    }
  }

  /** Brief alpha pulse on a spirit card background to indicate state change. */
  _pulseSpiritIcon(idx) {
    const obj = this._spiritCardObjs?.[idx];
    if (!obj || !obj.active) return;
    this.tweens.add({
      targets: obj,
      alpha: 0.25,
      duration: 150,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => { if (obj.active) obj.setAlpha(1); },
    });
  }

  /** Brief colour flash on a text object, then restore original colour. */
  _flashText(textObj, color) {
    const original = textObj.style.color;
    textObj.setStyle({ color });
    this.time.delayedCall(200, () => {
      if (textObj.active) textObj.setStyle({ color: original });
    });
  }

  /** Floating trigger label that rises from a spirit card and fades out. */
  _showSpiritTrigger(spirit, label) {
    const idx = run.spirits.indexOf(spirit);
    if (idx < 0) return;
    const spiritX = SPIRIT_START_X + idx * SPIRIT_GAP;
    const spiritY = SPIRIT_Y - SPIRIT_H / 2;
    const floatText = this.add.text(spiritX, spiritY, label, {
      fontSize: '12px', color: '#ffee66',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(50);
    this.tweens.add({
      targets: floatText,
      y: spiritY - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => floatText.destroy(),
    });
  }

  // ── Round-start helper ────────────────────────────────────────────────────

  _afterRoundStart() {
    this._scorePtsText.setText('Points: 0');
    this._scoreMltText.setText('Mult: 1.0');
    this._scoreFlwText.setText(`Flow: \xD7${run.flow.toFixed(2)}`);
    this._scoreTotText.setText('Total: 0');
    this._thresholdText.setText(`Target: ${run.threshold}`);

    const interest = this._round.lastInterestGain;
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
    } else if (interest > 0) {
      this._setStatus(`Interest: +${interest} ki  —  Play a card.`);
    } else {
      this._setStatus('Play a card from your hand.');
    }
  }

  // ── Yaku Guide overlay ────────────────────────────────────────────────────

  _showYakuGuide() {
    if (this._yakuGuideOpen) return;
    if (this._captureOverlayOpen) this._closeCaptureOverlay();
    if (this._discardOverlayOpen) this._closeDiscardOverlay();
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
        fontSize: '22px', color: '#e8c96a', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20)
    );
    objs.push(this.add.rectangle(cx, cy - 195, 760, 1, 0x3a6080).setDepth(20));

    let y = cy - 178;
    for (const yaku of Object.values(YAKU_INFO)) {
      objs.push(
        this.add.text(cx - 360, y, `${yaku.name}  +${yaku.baseBonus.toFixed(1)}`, {
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

  // ── Discard overlay ───────────────────────────────────────────────────────

  _showDiscardOverlay() {
    if (this._discardOverlayOpen) { this._closeDiscardOverlay(); return; }
    if (this._captureOverlayOpen) this._closeCaptureOverlay();
    if (this._yakuGuideOpen)      this._closeYakuGuide();
    this._discardOverlayOpen = true;

    const cards = this._round.allDiscards;
    const cx    = FIELD_CX, cy = 330;
    const objs  = this._discardOverlayObjs;

    objs.push(
      this.add.rectangle(cx, cy, 800, 500, 0x080d1a, 0.95)
        .setStrokeStyle(2, 0x604030).setDepth(20)
    );
    objs.push(
      this.add.text(cx, cy - 228, 'Discarded Cards', {
        fontSize: '20px', color: '#e89a6a', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20)
    );
    objs.push(this.add.rectangle(cx, cy - 208, 740, 1, 0x604030).setDepth(20));

    if (cards.length === 0) {
      objs.push(
        this.add.text(cx, cy, 'No cards discarded yet.', {
          fontSize: '15px', color: '#778899',
        }).setOrigin(0.5).setDepth(20)
      );
    } else {
      const OV_SCALE = 0.73;
      const OV_W    = Math.round(CARD_W * OV_SCALE);
      const OV_H    = Math.round(CARD_H * OV_SCALE);
      const OV_GAP  = 6;
      const ROW_MAX = 10;
      let y = cy - 190;

      const rowStart0 = 0;
      let start = 0;
      while (start < cards.length) {
        const row   = cards.slice(start, start + ROW_MAX);
        const rowW  = row.length * (OV_W + OV_GAP) - OV_GAP;
        const startX = Math.round(cx - rowW / 2 + OV_W / 2);
        for (let j = 0; j < row.length; j++) {
          const card = row[j];
          objs.push(
            this.add.image(startX + j * (OV_W + OV_GAP), Math.round(y + OV_H / 2), card.id)
              .setScale(OV_SCALE).setDepth(20).setTint(0x886655)
          );
        }
        y    += OV_H + OV_GAP + 4;
        start += ROW_MAX;
      }
    }

    const closeY   = cy + 224;
    const closeBtn = this.add.rectangle(cx, closeY, 140, 36, 0x4a2a1a)
      .setStrokeStyle(2, 0xaa6644).setInteractive({ useHandCursor: true }).setDepth(20);
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x6a3a2a));
    closeBtn.on('pointerout',  () => closeBtn.setFillStyle(0x4a2a1a));
    closeBtn.on('pointerdown', () => this._closeDiscardOverlay());
    objs.push(closeBtn);
    objs.push(
      this.add.text(cx, closeY, 'Close', { fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(20)
    );
  }

  _closeDiscardOverlay() {
    if (!this._discardOverlayOpen) return;
    this._discardOverlayOpen = false;
    this._clearObjs(this._discardOverlayObjs);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _clearObjs(arr) {
    for (const obj of arr) obj.destroy();
    arr.length = 0;
  }

  _setStatus(msg) {
    this._statusText.setText(msg);
  }

  // ── Enhancement badge ─────────────────────────────────────────────────────

  /**
   * Create a small enhancement indicator badge below a card.
   * Returns an array of Phaser objects (or null if the card has no enhancement).
   * The caller should push these into the appropriate obj array so they're
   * cleared with the next render cycle.
   *
   * @param {object} card  Card object (may have card.enhancement)
   * @param {number} x     Horizontal centre of the badge
   * @param {number} y     Top edge of the badge area
   * @returns {Phaser.GameObjects.GameObject[]|null}
   */
  _makeEnhancementBadge(card, x, y) {
    const enh = card.enhancement;
    if (!enh) return null;

    const ENH_NAMES = {
      water: { base: 'Snow', upgraded: 'Ice' },
      wood:  { base: 'Leaf', upgraded: 'Silk' },
      fire:  { base: 'Ember', upgraded: 'Charcoal' },
      earth: { base: 'Clay', upgraded: 'Pottery' },
      metal: { base: 'Iron', upgraded: 'Meteorite' },
    };
    const ELEM_COLORS = {
      water: '#4488ff', wood: '#44cc44', fire: '#ff6644',
      earth: '#cc8822', metal: '#bbbbbb',
    };
    const objs    = [];
    const name    = ENH_NAMES[enh.element]?.[enh.tier] ?? enh.element;
    const color   = ELEM_COLORS[enh.element] ?? '#ffffff';
    const star    = enh.tier === 'upgraded' ? '\u2605' : '\u2022';

    objs.push(this.add.text(x, y, `${star}${name}`, {
      fontSize: '8px', color,
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0));

    // For Water: show current multiplier below the name.
    if (enh.element === 'water') {
      const SNOW_MULT = [2.0, 1.5, 1.0, 0.75, 0.5, 0.25];
      const ICE_MULT  = [4.0, 3.0, 2.0, 1.5, 1.0, 0.75, 0.5, 0.25];
      const multArr   = enh.tier === 'upgraded' ? ICE_MULT : SNOW_MULT;
      const level     = Math.min(enh.depLevel ?? 0, multArr.length - 1);
      objs.push(this.add.text(x, y + 10, `\xD7${multArr[level]}`, {
        fontSize: '8px', color: '#88aaff',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5, 0));
    }

    return objs;
  }

  // ── Ribbon stamp dot ──────────────────────────────────────────────────────

  /**
   * Create a small colored circle in the top-left corner of a card to indicate
   * a ribbon stamp.  Returns null if the card has no stamp.
   *
   * @param {object} card   Card object (may have card.ribbonStamp)
   * @param {number} cx     Horizontal centre of the card
   * @param {number} cy     Vertical centre of the card
   * @returns {Phaser.GameObjects.Arc|null}
   */
  _makeRibbonStampDot(card, cx, cy) {
    if (!card.ribbonStamp) return null;
    const STAMP_COLORS = {
      red:    0xcc3333,
      blue:   0x3366cc,
      green:  0x33aa55,
      yellow: 0xccaa33,
    };
    const color = STAMP_COLORS[card.ribbonStamp] ?? 0xffffff;
    const hw = Math.round(CARD_W * CARD_SCALE / 2);
    const hh = Math.round(CARD_H * CARD_SCALE / 2);
    return this.add.circle(cx - hw + 6, cy - hh + 6, 4, color)
      .setDepth(5)
      .setStrokeStyle(1, 0x000000);
  }

  /** Small "M{N}" badge at bottom-right corner for Path/Tree-converted cards. */
  _makeConversionBadge(card, cx, cy) {
    if (!card.pathConverted && !card.treeConverted) return null;
    const hw = Math.round(CARD_W * CARD_SCALE / 2);
    const hh = Math.round(CARD_H * CARD_SCALE / 2);
    const label = card.treeConverted ? '\u2317' : `M${card.month}`;
    return this.add.text(cx + hw - 2, cy + hh - 2, label, {
      fontSize: '9px', color: '#ffcc44', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(1, 1).setDepth(6);
  }

  // ── Field fan toggle ──────────────────────────────────────────────────────

  _toggleFieldFan(i) {
    this._fannedSlot = this._fannedSlot === i ? null : i;
    this._clearObjs(this._fieldObjs);
    this._renderField();
  }

  // ── Card tooltip ──────────────────────────────────────────────────────────

  _showCardTooltip(card, x, y) {
    if (!this._cardTooltipBg) {
      this._cardTooltipBg = this.add.rectangle(0, 0, 1, 1, 0x080d1a, 0.92)
        .setStrokeStyle(1, 0x2a4a60).setOrigin(0.5, 1).setDepth(60).setVisible(false);
      this._cardTooltipText = this.add.text(0, 0, '', {
        fontSize: '11px', color: '#ddeeff', lineSpacing: 2,
      }).setOrigin(0.5, 1).setDepth(61).setVisible(false);
    }
    const ENH_NAMES_TT = {
      water: { base: 'Snow', upgraded: 'Ice' },
      wood:  { base: 'Leaf', upgraded: 'Silk' },
      fire:  { base: 'Ember', upgraded: 'Charcoal' },
      earth: { base: 'Clay', upgraded: 'Pottery' },
      metal: { base: 'Iron', upgraded: 'Meteorite' },
    };
    const ENH_DESC_TT = {
      water: { base: 'pts ×mult (scales with deposits)', upgraded: 'pts ×bigger mult (scales with deposits)' },
      fire:  { base: 'flat 10 pts, counted in all yaku', upgraded: 'flat 20 pts, counted in all yaku' },
      earth: { base: 'ki interest per round, feeds Fossil', upgraded: 'higher ki interest, feeds Fossil' },
      metal: { base: '+10 pts proc, feeds Velocity', upgraded: '+15 pts proc + free consumable, feeds Velocity' },
      wood:  { base: 'bypasses field slot limit, feeds Moths', upgraded: 'anti-strand + slot bypass, feeds Moths' },
    };
    const lines = [card.name, `${card.monthName} · ${card.type} · ${card.points}pt`];
    if (card.vertical && card.temporal) lines.push(`${card.vertical} / ${card.temporal}`);
    if (card.pathConverted) lines.push(`Path: was ${card._originalName ?? 'unknown'}`);
    if (card.treeConverted) lines.push(`Tree: copy of ${card.treeSourceName ?? 'unknown'}`);
    if (card.enhancement) {
      const e = card.enhancement;
      const ename = ENH_NAMES_TT[e.element]?.[e.tier] ?? e.element;
      const edesc = ENH_DESC_TT[e.element]?.[e.tier] ?? '';
      const star  = e.tier === 'upgraded' ? '\u2605' : '\u2022';
      lines.push(`${star} ${ename}${edesc ? ': ' + edesc : ''}`);
    }
    this._cardTooltipText.setText(lines.join('\n'));
    const tx = Phaser.Math.Clamp(x, 100, 1180);
    this._cardTooltipText.setPosition(tx, y);
    const tw = Math.max(150, this._cardTooltipText.width + 16);
    const th = this._cardTooltipText.height + 12;
    this._cardTooltipBg.setSize(tw, th).setPosition(tx, y);
    this._cardTooltipBg.setVisible(true);
    this._cardTooltipText.setVisible(true);
  }

  _hideCardTooltip() {
    this._cardTooltipBg?.setVisible(false);
    this._cardTooltipText?.setVisible(false);
  }
}
