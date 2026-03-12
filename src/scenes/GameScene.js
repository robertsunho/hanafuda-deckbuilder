import GameRoundManager      from '../systems/GameRoundManager.js';
import { YAKU_INFO }         from '../systems/ScoringEngine.js';
import run, { RunManager }   from '../systems/RunManager.js';
import { getElementDef }     from '../data/consumables.js';
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

// ── Spirit row (top, horizontal full-portrait) ────────────────────────────
const SPIRIT_START_X   = 220;                  // first spirit card centre x
const SPIRIT_Y         = 62;                   // spirit card centre y
const SPIRIT_GAP       = 76;                   // x-distance between card centres (64 + 12)
const SPIRIT_W         = CARD_W * CARD_SCALE;  // 64
const SPIRIT_H         = CARD_H * CARD_SCALE;  // 104
const MAX_SPIRIT_SLOTS = RunManager.MAX_SPIRIT_SLOTS;  // 6

// ── Info box (top-left corner, clustered vertically) ──────────────────────
const INFO_X     = 10;
const INFO_TOP_Y = 14;

// ── Field + Deck (centre) ─────────────────────────────────────────────────
const FIELD_CX    = 500;
const FIELD_CY    = 340;
const FIELD_COL_W = Math.round(CARD_W * CARD_SCALE * 2.2);  // ~141
const FIELD_ROW_H = Math.round(CARD_H * CARD_SCALE) + 50;   // 154

// Hexagonal arrangement: 3-top / 2-middle (flanking deck) / 3-bottom
const SLOT_POSITIONS = [
  { x: FIELD_CX - FIELD_COL_W,        y: FIELD_CY - FIELD_ROW_H },  // F1
  { x: FIELD_CX,                      y: FIELD_CY - FIELD_ROW_H },  // F2
  { x: FIELD_CX + FIELD_COL_W,        y: FIELD_CY - FIELD_ROW_H },  // F3
  { x: FIELD_CX - FIELD_COL_W * 1.5,  y: FIELD_CY               },  // F4 (left)
  { x: FIELD_CX + FIELD_COL_W * 1.5,  y: FIELD_CY               },  // F5 (right)
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
const CAPTURE_X       = 1024;  // left edge of first card in each fan row
const CAPTURE_TOP_Y   = 100;   // top of first fan row (card top edge)
const CAPTURE_OVERLAP = 16;    // horizontal offset per card
const CAPTURE_ROW_GAP = 6;     // vertical gap between type rows
const CAPTURE_SCALE   = CARD_SCALE;   // 1.0 — full size, no shrinking
const CAPTURE_CARD_W  = Math.round(CARD_W * CAPTURE_SCALE);   // 64
const CAPTURE_CARD_H  = Math.round(CARD_H * CAPTURE_SCALE);   // 104

// ── Banked + Discard piles (bottom-right corner, flush with hand row) ────
const BANKED_X  = 1140;
const BANKED_Y  = 660;   // matches HAND_Y
const DISCARD_X = 1240;
const DISCARD_Y = 660;   // matches HAND_Y

// ── Hand (bottom centre) ──────────────────────────────────────────────────
const HAND_CX   = Math.round((155 + 1100) / 2);  // 628 — centred between left and right dividers
const HAND_Y    = 660;
const HAND_STEP = 72;

// ── Deck-flip animation ───────────────────────────────────────────────────
const FLIP_X    = FIELD_CX;
const FLIP_Y    = FIELD_CY;
const FLIP_HOLD = 800;   // ms

// ── Consumable fan (bottom-left, below info cluster) ──────────────────────
const CONS_BASE_X = 75;
const CONS_BASE_Y = 630;
const CONS_CARD_W = Math.round(CARD_W * CARD_SCALE);   // 64
const CONS_CARD_H = Math.round(CARD_H * CARD_SCALE);   // 104
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
    this._markMode = null;

    this._createCardBackTexture();
    this._buildStaticUI();

    this._round.setSpirits(run.spirits);
    this._round.setStyleBase(run.styleBase);
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
    const labelStyle = { fontSize: '11px', color: '#556677' };

    // ── Top-left info cluster (stacked vertically) ────────────────────────
    let infoY = INFO_TOP_Y;
    this._actRoundText  = this.add.text(INFO_X, infoY, '', { fontSize: '11px', color: '#445566' });
    infoY += 18;
    this._baseText      = this.add.text(INFO_X, infoY, '', { fontSize: '14px', color: '#aaccee' });
    infoY += 18;
    this._thresholdText = this.add.text(INFO_X, infoY, '', { fontSize: '13px', color: '#667788' });
    infoY += 20;
    this._multiText     = this.add.text(INFO_X, infoY, '', { fontSize: '11px', color: '#ffee88' });
    infoY += 16;
    this._projText      = this.add.text(INFO_X, infoY, '', { fontSize: '11px', color: '#88ddaa' });
    infoY += 18;
    this._turnText      = this.add.text(INFO_X, infoY, '', { fontSize: '11px', color: '#556677' });
    infoY += 16;
    this._playsText     = this.add.text(INFO_X, infoY, '', { fontSize: '11px', color: '#556677' });
    infoY += 16;
    this._discardsText  = this.add.text(INFO_X, infoY, '', { fontSize: '11px', color: '#556677' });

    // Ki — top right corner
    this._kiText = this.add.text(1270, 14, '', { fontSize: '13px', color: '#ffee88' }).setOrigin(1, 0);

    // ── Status text (right of spirit row, vertically centred) ────────────
    this._statusText = this.add.text(680, 62, '', {
      fontSize: '15px', color: '#e8e8e8',
      stroke: '#0a0f1e', strokeThickness: 3,
      wordWrap: { width: 380 },
    }).setOrigin(0, 0.5);

    // ── Yaku Guide button (top right) ─────────────────────────────────────
    const guideBtn = this.add.rectangle(1210, 14, 26, 20, 0x1a3550)
      .setStrokeStyle(1, 0x3a6080).setInteractive({ useHandCursor: true });
    guideBtn.on('pointerover',  () => guideBtn.setFillStyle(0x2a5a80));
    guideBtn.on('pointerout',   () => guideBtn.setFillStyle(0x1a3550));
    guideBtn.on('pointerdown',  () => this._showYakuGuide());
    this.add.text(1210, 14, '?', { fontSize: '13px', color: '#aaccee' }).setOrigin(0.5);

    // ── Consumables label (bottom-left, above consumable fan) ─────────────
    this.add.text(CONS_BASE_X, CONS_BASE_Y - CONS_CARD_H / 2 - 10, 'CONSUMABLES', labelStyle)
      .setOrigin(0.5, 1);

    // ── Deck pile (centre field, rotated 90°) ─────────────────────────────
    this._deckSprite = this.add.image(DECK_X, DECK_Y, 'card_back')
      .setScale(CARD_SCALE).setRotation(Math.PI / 2);
    this._deckCountText = this.add.text(DECK_X, DECK_Y + 42, '32', {
      fontSize: '16px', color: '#aaccee', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Right vertical divider (separates field from captures) ───────────
    this.add.rectangle(1100, 400, 1, 720, 0x2a3a50);
    this.add.text(CAPTURE_X + 80, 62, 'CAPTURES', {
      fontSize: '11px', color: '#556677',
    }).setOrigin(0.5, 0.5);

    // ── Left vertical divider (separates info/consumables from game board) ─
    this.add.rectangle(155, 360, 1, 720, 0x2a3a50);

    // ── Hand / field divider ──────────────────────────────────────────────
    this.add.rectangle(640, 590, 1280, 1, 0x2a3a50);
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

      if (markActive) {
        // In mark mode: cards are selectable targets regardless of game phase.
        const MARK_TINT        = 0x44ffcc;
        const MARK_HOVER       = 0xaaffee;
        const isTranscendSrc   = this._markMode.step === 'select_target'
                                  && this._markMode.sourceCard?.id === card.id;
        spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT);
        spr.setInteractive({ useHandCursor: true });
        spr.on('pointerover',  () => { if (!isTranscendSrc) spr.setTint(MARK_HOVER); });
        spr.on('pointerout',   () => { spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT); });
        spr.on('pointerdown',  () => this._onMarkCardSelected(card));
      } else if (fireWild) {
        // Fire wild targeting: selected fire card stays elevated; others dimmed.
        spr.setTint(card.id === this._fireWildCard.id ? TINT_HOVER : TINT_DIM);
      } else if (idle) {
        spr.setInteractive({ useHandCursor: true });
        if (selected) spr.setTint(TINT_HOVER);
        spr.on('pointerover',  () => spr.setTint(TINT_HOVER));
        spr.on('pointerout',   () => { if (!selected) spr.clearTint(); });
        spr.on('pointerdown',  () => this._toggleCardSelection(card.id));
      } else {
        spr.setTint(TINT_DIM);
      }
      this._handObjs.push(spr);

      // Enhancement badge — placed above the card to avoid overlapping action buttons.
      const enhBadge = this._makeEnhancementBadge(card, x, y - Math.round(CARD_H * CARD_SCALE / 2) - 20);
      if (enhBadge) enhBadge.forEach(o => this._handObjs.push(o));
    }
  }

  // ── Field ─────────────────────────────────────────────────────────────────

  _renderField() {
    const slots      = this._round.field.getSlots();
    const markActive = this._markMode !== null;
    const fireWild   = this._fireWildCard !== null;

    // Slot background rectangles (hexagonal arrangement)
    for (let i = 0; i < 8; i++) {
      const { x, y } = SLOT_POSITIONS[i];
      this._fieldObjs.push(
        this.add.rectangle(x, y, SLOT_BG_W, SLOT_BG_H, 0x0a1628)
      );
    }

    // Cards in occupied slots
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const { x: sx, y: sy } = SLOT_POSITIONS[i];
      for (let j = 0; j < slot.cards.length; j++) {
        const card = slot.cards[j];
        const spr  = this.add.image(
          sx + j * SLOT_FAN_X,
          sy + j * SLOT_FAN_Y,
          card.id
        ).setScale(CARD_SCALE);

        if (markActive) {
          const MARK_TINT      = 0x44ffcc;
          const MARK_HOVER     = 0xaaffee;
          const isTranscendSrc = this._markMode.step === 'select_target'
                                  && this._markMode.sourceCard?.id === card.id;
          spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT);
          spr.setInteractive({ useHandCursor: true });
          spr.on('pointerover',  () => { if (!isTranscendSrc) spr.setTint(MARK_HOVER); });
          spr.on('pointerout',   () => { spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT); });
          spr.on('pointerdown',  () => this._onMarkCardSelected(card));
        } else if (fireWild) {
          // Fire wild targeting: all occupied field slots are valid targets.
          const FIRE_TINT  = 0xff9944;
          const FIRE_HOVER = 0xffcc66;
          spr.setTint(FIRE_TINT);
          spr.setInteractive({ useHandCursor: true });
          spr.on('pointerover', () => spr.setTint(FIRE_HOVER));
          spr.on('pointerout',  () => spr.setTint(FIRE_TINT));
          spr.on('pointerdown', () => this._playFireWild(slot.month));
        } else if (slot.state === 'pending') {
          spr.setTint(TINT_PENDING);
        }
        this._fieldObjs.push(spr);

        // Enhancement badge (only on the top card of the fan)
        if (j === slot.cards.length - 1) {
          const bx = sx + j * SLOT_FAN_X;
          const by = sy + j * SLOT_FAN_Y + Math.round(CARD_H * CARD_SCALE / 2) + 4;
          const enhBadge = this._makeEnhancementBadge(card, bx, by);
          if (enhBadge) enhBadge.forEach(o => this._fieldObjs.push(o));
        }
      }
    }
  }

  // ── Spirit row (top, horizontal full-portrait) ───────────────────────────

  _renderSpiritColumn() {
    const spirits = run.spirits;

    for (let i = 0; i < MAX_SPIRIT_SLOTS; i++) {
      const spirit = spirits[i];
      const x      = SPIRIT_START_X + i * SPIRIT_GAP;
      const y      = SPIRIT_Y;

      if (!spirit) {
        this._spiritObjs.push(
          this.add.rectangle(x, y, SPIRIT_W, SPIRIT_H, 0x0a1628)
            .setStrokeStyle(1, 0x1e2d40)
        );
        continue;
      }

      const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;

      // Card background.
      const card = this.add.rectangle(x, y, SPIRIT_W, SPIRIT_H, 0x0d1b2a)
        .setStrokeStyle(1, rarityCol);
      this._spiritObjs.push(card);

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

      card.setInteractive();
      card.on('pointerover', () => {
        const captured = this._round.capture.getAll();
        const contrib  = this._getSpiritContrib(spirit, captured);
        tooltip.setText(spirit.description + (contrib ? '\n\n' + contrib : ''));
        tooltip.setVisible(true);
      });
      card.on('pointerout', () => tooltip.setVisible(false));
    }
  }

  /**
   * Compute a short "current contribution" string for the spirit tooltip.
   * Returns null if there is nothing meaningful to show yet.
   * @param {object}   spirit        Spirit object from run.spirits
   * @param {object[]} captured      Cards in the capture pile this round
   * @returns {string|null}
   */
  _getSpiritContrib(spirit, captured) {
    const fx = SpiritEffects.get(spirit.id);
    if (!fx) return null;

    const spirits = run.spirits;
    const lines   = [];

    // ── Channel 1: point boosts ───────────────────────────────────────────
    if (fx.getPointBoosts) {
      const boosts = fx.getPointBoosts({ capturedCards: captured, spirits });
      if (boosts && boosts.size > 0) {
        // All boosted cards share the same mult for a given spirit.
        const [, mult] = [...boosts][0];
        lines.push(`\u00D7${mult.toFixed(1)} on ${boosts.size} card${boosts.size !== 1 ? 's' : ''}`);
      } else {
        lines.push('No matching cards captured yet');
      }
    }

    // ── Channel 2: additive mult ──────────────────────────────────────────
    if (fx.getAdditiveMult) {
      const add = fx.getAdditiveMult({ capturedCards: captured, yakuList: [], spirits });
      if (add !== 0) {
        lines.push(`+${add.toFixed(2)} additive mult`);
      } else {
        lines.push('+0.00 additive mult');
      }
    }

    // ── Channel 3: mult-mult ──────────────────────────────────────────────
    if (fx.getMultMult) {
      const mm = fx.getMultMult({ capturedCards: captured, yakuList: [], spirits });

      // Persistent spirits: show underlying state for clarity.
      if (spirit.id === 'kasu_abundance') {
        const n = spirit.state?.plainsCaptured ?? 0;
        lines.push(`Plains this run: ${n}  →  \u00D7${mm.toFixed(2)} mult`);
      } else if (spirit.id === 'tane_wildlife') {
        const n = spirit.state?.seenAnimals?.length ?? 0;
        lines.push(`Unique animals: ${n}/9  →  \u00D7${mm.toFixed(2)} mult`);
      } else if (spirit.id === 'tanzaku_festival') {
        const RED_WRITING = new Set(['january_ribbon', 'february_ribbon', 'march_ribbon']);
        const BLUE        = new Set(['june_ribbon', 'september_ribbon', 'october_ribbon']);
        const ids         = new Set(captured.map(c => c.id));
        let sg = 0;
        if ([...RED_WRITING].some(id => ids.has(id))) sg++;
        if ([...BLUE].some(id => ids.has(id)))        sg++;
        if (captured.some(c => c.type === 'ribbon' && !RED_WRITING.has(c.id) && !BLUE.has(c.id))) sg++;
        lines.push(`Ribbon types: ${sg}  →  \u00D7${mm.toFixed(2)} mult`);
      } else if (spirit.id === 'hikari_radiance') {
        const n = captured.filter(c => c.type === 'bright').length;
        lines.push(`Brights: ${n}  →  \u00D7${mm.toFixed(2)} mult`);
      } else {
        lines.push(`\u00D7${mm.toFixed(2)} mult`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  // ── Capture fan (right panel) ─────────────────────────────────────────────
  // Four horizontal rows — one per card type — plus compact pile stacks below.

  _renderCaptureFan() {
    const capturedCards = this._round.capture.getAll();
    const discards      = this._round.allDiscards;
    const spentIds      = run.scoringMode === 'additive' ? this._round.spentCardIds : new Set();

    const TYPE_ORDER   = ['bright', 'animal', 'ribbon', 'plain'];
    const TYPE_SYMBOLS = { bright: '★', animal: '♦', ribbon: '║', plain: '□' };
    const TYPE_COLORS  = { bright: '#ffee88', animal: '#88ccff', ribbon: '#ff8888', plain: '#aaaaaa' };

    // Group by type (fire cards count as plain for fan purposes).
    const byType = { bright: [], animal: [], ribbon: [], plain: [] };
    for (const card of capturedCards) {
      const t = card.enhancement?.element === 'fire' ? 'plain' : card.type;
      (byType[t] ?? byType['plain']).push(card);
    }

    let fanY = CAPTURE_TOP_Y;

    for (const type of TYPE_ORDER) {
      const cards = byType[type];

      // Type symbol label (always shown, even if empty).
      this._captureObjs.push(
        this.add.text(CAPTURE_X - 10, fanY + CAPTURE_CARD_H / 2, TYPE_SYMBOLS[type], {
          fontSize: '12px', color: TYPE_COLORS[type],
        }).setOrigin(1, 0.5)
      );

      // Fan cards.
      for (let i = 0; i < cards.length; i++) {
        const img = this.add.image(CAPTURE_X + i * CAPTURE_OVERLAP, fanY, cards[i].id)
          .setScale(CAPTURE_SCALE).setOrigin(0, 0);
        if (spentIds.has(cards[i].id)) img.setTint(0x334455).setAlpha(0.5);
        this._captureObjs.push(img);
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

    // ── Banked pile (scored yaku cards only, right side of field) ─────────
    const bankedCards  = capturedCards.filter(c => spentIds.has(c.id));
    const bankedCount  = bankedCards.length;
    const pileTopY     = BANKED_Y - CARD_H / 2 - 12;
    const pileBottomY  = BANKED_Y + CARD_H / 2 + 4;
    this._captureObjs.push(
      this.add.text(BANKED_X, pileTopY, 'BANKED', {
        fontSize: '10px', color: '#556677',
      }).setOrigin(0.5, 1)
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
        this.add.rectangle(BANKED_X, BANKED_Y, CARD_W + 4, CARD_H + 4, 0x0a1628)
          .setStrokeStyle(1, 0x1e2d40)
      );
    }

    // ── Discard pile ───────────────────────────────────────────────────────
    const discardCount = discards.length;
    this._captureObjs.push(
      this.add.text(DISCARD_X, pileTopY, 'DISCARD', {
        fontSize: '10px', color: '#556677',
      }).setOrigin(0.5, 1)
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
        this.add.text(DISCARD_X, pileBottomY, `×${discardCount}`, {
          fontSize: '12px', color: '#cc6666', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0)
      );
    } else {
      this._captureObjs.push(
        this.add.rectangle(DISCARD_X, DISCARD_Y, CARD_W + 4, CARD_H + 4, 0x0a1628)
          .setStrokeStyle(1, 0x1e2d40)
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
      const card = this.add.rectangle(x, y, CONS_CARD_W, CONS_CARD_H, 0x0d1b2a)
        .setStrokeStyle(2, selected ? rarityCol : 0x2a3a50)
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
          const spentIds = run.scoringMode === 'additive' ? this._round.spentCardIds : null;
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

  // ── Card selection ─────────────────────────────────────────────────────────

  _toggleCardSelection(cardId) {
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

        const useBtn = this.add.rectangle(HAND_CX, y, 210, 40, 0x1a2a5a)
          .setStrokeStyle(2, 0x4466cc).setInteractive({ useHandCursor: true }).setDepth(5);
        useBtn.on('pointerover',  () => useBtn.setFillStyle(0x2a4a8a));
        useBtn.on('pointerout',   () => useBtn.setFillStyle(0x1a2a5a));
        useBtn.on('pointerdown',  () => {
          if (isMark) {
            this._activateMark(cons, this._selectedConsumableIndex);
            this._selectedConsumableIndex = null;
          } else {
            const idx    = this._selectedConsumableIndex;
            const result = this._round.useConsumable(cons);
            this._selectedConsumableIndex = null;
            run.useConsumable(idx);
            this._clearObjs(this._consumableObjs);
            this._clearObjs(this._actionBtnObjs);
            if (result.revealedCards) {
              this._showRoosterOverlay(result.revealedCards, result.message);
            } else {
              this._setStatus(result.message ?? `Used ${cons.name}.`);
            }
            this._renderConsumables();
            this._renderActionButtons();
            this._updateInfoTexts();
          }
        });
        this._actionBtnObjs.push(useBtn);
        this._actionBtnObjs.push(
          this.add.text(HAND_CX, y, btnLabel, {
            fontSize: '15px', color: '#aaddff',
          }).setOrigin(0.5).setDepth(5)
        );
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

    const discardsLeft    = this._round.discardsRemaining;
    const discardEnabled  = discardsLeft > 0;
    const discardBtn = this.add.rectangle(HAND_CX + 90, y, 160, 40,
      discardEnabled ? 0x6a3a1a : 0x2a1a0a)
      .setStrokeStyle(2, discardEnabled ? 0xaa7744 : 0x443322).setDepth(5);
    if (discardEnabled) {
      discardBtn.setInteractive({ useHandCursor: true });
      discardBtn.on('pointerover',  () => discardBtn.setFillStyle(0x9a5a2a));
      discardBtn.on('pointerout',   () => discardBtn.setFillStyle(0x6a3a1a));
      discardBtn.on('pointerdown',  () => this._onDiscardButton());
    }
    this._actionBtnObjs.push(discardBtn);
    this._actionBtnObjs.push(
      this.add.text(HAND_CX + 90, y, `Discard (${discardsLeft} left)`, {
        fontSize: '15px', color: discardEnabled ? '#ffffff' : '#554433',
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
        // select_target
        run.transcendCard(this._markMode.sourceCard.id, card.id);
        run.useConsumable(index);
        logger.logConsumableUse(consName, `${this._markMode.sourceCard.id} → ${card.id}`);
        this._markMode = null;
        this._setStatus('Transcendence complete.');
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
    if (this._animating) return;
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

  _playCards(cardIds, targetMonth = null) {
    if (this._animating) return;

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

    const handDiscardSprs = handResult.discarded.map((card, i) =>
      this.add.image(FLIP_X + 40, FLIP_Y - 60 + i * 20, card.id)
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
        const styleCombos = this._round.lastStyleCombos;
        if (styleCombos.length > 0) this._showStyleComboPopup(styleCombos);
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

    if (run.scoringMode === 'additive') {
      const runScore = this._round.runningScore;
      const thr      = run.threshold;
      this._baseText.setStyle({ color: runScore >= thr ? '#44ff88' : '#aaccee' })
        .setText(`Running: ${runScore}`);
      this._multiText.setText(`Events: ${this._round.eventCount}`);
      this._projText.setText('');
    } else {
      const sc = this._round.getCurrentScoring();
      // Base line — show point-boost detail when active.
      const ptBoostActive = Math.abs(sc.pointBoost - 1.0) > 0.001;
      const baseStr = ptBoostActive
        ? `${sc.rawBasePoints} (\xD7${sc.pointBoost.toFixed(2)}=${sc.boostedBasePoints})`
        : `Base: ${sc.boostedBasePoints}`;
      this._baseText.setStyle({ color: '#aaccee' }).setText(baseStr);

      // Mult line.
      let multStr = `\xD7${sc.yakuMult.toFixed(2)}`;
      if (sc.additiveMult !== 0)               multStr += ` +${sc.additiveMult.toFixed(2)}`;
      if (Math.abs(sc.multMult - 1.0) > 0.001) multStr += ` \xD7${sc.multMult.toFixed(2)}mm`;
      multStr += ` \xD7${sc.flow.toFixed(2)}f`;
      this._multiText.setText(multStr);

      this._projText.setText(`= ${sc.finalScore}`);
    }

    this._thresholdText.setText(`Target: ${run.threshold}`);
    this._turnText.setText(`Turn: ${this._round.turn}`);
    this._playsText.setText(`Plays: ${this._round.playsRemaining}`);
    this._discardsText.setText(`Discards: ${this._round.discardsRemaining}`);
    this._actRoundText.setText(`Act ${run.act}  R${run.round}/18`);
    this._kiText.setText(`Ki: ${run.ki}`);

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
    const kiEarned = run.calculateKiReward(result, tr.threshold);
    // Surplus ki bonus for display (additive mode only).
    let surplusKiBonus = 0;
    if (run.scoringMode === 'additive' && tr.passed) {
      const surplusRatio = (result.finalScore - tr.threshold) / tr.threshold;
      if      (surplusRatio >= 3.0) surplusKiBonus = 3;
      else if (surplusRatio >= 2.0) surplusKiBonus = 2;
      else if (surplusRatio >= 1.0) surplusKiBonus = 1;
    }

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

    if (run.scoringMode === 'additive') {
      // Additive mode: show per-event summary from the round manager.
      const events = this._round.scoringEvents;
      if (events.length === 0) {
        this._overlayObjs.push(
          this.add.text(cx, y, 'No scoring events this round.', {
            fontSize: '15px', color: '#778899',
          }).setOrigin(0.5)
        );
        y += 24;
      } else {
        this._overlayObjs.push(
          this.add.text(cx, y, `Scoring Events  (${events.length})`, {
            fontSize: '14px', color: '#778899',
          }).setOrigin(0.5)
        );
        y += 20;
        for (const ev of events) {
          const line = `#${ev.eventNumber} ${ev.yakuName}  ${ev.yakuCardPoints}pt × ×${ev.eventMult.toFixed(1)} = +${ev.eventScore}`;
          this._overlayObjs.push(
            this.add.text(cx, y, line, { fontSize: '13px', color: '#cce0ff' }).setOrigin(0.5)
          );
          y += 18;
        }
      }
      y += 6;
      if (result.penaltyApplied) {
        this._overlayObjs.push(
          this.add.text(cx, y, '\u26A0 Push penalty applied — score reduced', {
            fontSize: '13px', color: '#ff8866',
          }).setOrigin(0.5)
        );
        y += 20;
      }
      this._overlayObjs.push(
        this.add.text(cx, y, `Final Score: ${result.finalScore}`, {
          fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5)
      );
      y += 32;
    } else {

    // Base — show point-boost detail when active.
    const ptBoostActive = Math.abs(result.pointBoost - 1.0) > 0.001;
    const baseLabel = ptBoostActive
      ? `Base: ${result.rawBasePoints}  (\xD7${result.pointBoost.toFixed(2)} pt boost \u2192 ${result.boostedBasePoints})`
      : `Base: ${result.boostedBasePoints}`;
    this._overlayObjs.push(
      this.add.text(cx, y, baseLabel, { fontSize: '17px', color: '#aaccee' }).setOrigin(0.5)
    );
    y += 26;

    if (result.allYaku.length === 0) {
      this._overlayObjs.push(
        this.add.text(cx, y, 'No yaku scored this round.', {
          fontSize: '15px', color: '#778899',
        }).setOrigin(0.5)
      );
      y += 24;
    } else {
      for (const yaku of result.allYaku) {
        this._overlayObjs.push(
          this.add.text(cx, y, `${yaku.name}  +${yaku.bonus.toFixed(2)}`, {
            fontSize: '16px', color: '#cce0ff',
          }).setOrigin(0.5)
        );
        y += 22;
      }
    }
    y += 6;

    // Multiplier line — additive yaku construction + spirit channels.
    let multLabel = '1.0';
    for (const yaku of result.allYaku) {
      multLabel += ` +${yaku.bonus.toFixed(2)} (${yaku.name})`;
    }
    multLabel += ` = \xD7${result.yakuMult.toFixed(2)} yaku`;
    if (result.additiveMult !== 0)
      multLabel += `  +${result.additiveMult.toFixed(2)} spirit`;
    if (Math.abs(result.multMult - 1.0) > 0.001)
      multLabel += `  \xD7${result.multMult.toFixed(2)} mm`;
    multLabel += `  = \xD7${result.effectiveMult.toFixed(2)} eff.`;
    this._overlayObjs.push(
      this.add.text(cx, y, multLabel, { fontSize: '15px', color: '#ffee88' }).setOrigin(0.5)
    );
    y += 24;

    const flowLabel = result.penaltyApplied
      ? `\u26A0 Flow: \xD7${result.flow.toFixed(2)}  (Style \xD7${result.styleBase.toFixed(2)} \xD7 Push \xD7${result.pushFactor.toFixed(1)})  [penalty]`
      : `Flow: \xD7${result.flow.toFixed(2)}  (Style \xD7${result.styleBase.toFixed(2)} \xD7 Push \xD7${result.pushFactor.toFixed(1)})`;
    this._overlayObjs.push(
      this.add.text(cx, y, flowLabel, {
        fontSize: '13px', color: result.penaltyApplied ? '#ff8866' : '#88ddaa',
      }).setOrigin(0.5)
    );
    y += 24;

    // ── Style combos ──────────────────────────────────────────────────────
    const styleCombos = this._round.triggeredStyleCombos;
    const styleTotal  = this._round.roundStyleTotal;
    if (styleCombos.length > 0) {
      this._overlayObjs.push(this.add.rectangle(cx, y + 4, 580, 1, 0x2a3a50));
      y += 14;
      for (const sc of styleCombos) {
        this._overlayObjs.push(
          this.add.text(cx, y, `${sc.name}  +${sc.bonus.toFixed(1)} Style`, {
            fontSize: '13px', color: '#ffcc44',
          }).setOrigin(0.5)
        );
        y += 18;
      }
      this._overlayObjs.push(
        this.add.text(cx, y,
          `Style total: +${styleTotal.toFixed(1)}  \u2192  Style Base now \xD7${run.styleBase.toFixed(2)}`,
          { fontSize: '12px', color: '#bbaa55' }
        ).setOrigin(0.5)
      );
      y += 20;
    }

    this._overlayObjs.push(
      this.add.text(cx, y, `Final Score: ${result.finalScore}`, {
        fontSize: '24px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5)
    );
    y += 32;

    } // end else (multiplicative scoring breakdown)

    const kiLabel = surplusKiBonus > 0
      ? `Ki earned: +${kiEarned}  (includes +${surplusKiBonus} surplus bonus)`
      : `Ki earned: +${kiEarned}`;
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

  // ── Additive event overlay ────────────────────────────────────────────────

  _showAdditiveEventOverlay(result) {
    this._bankPushOpen = true;
    this._clearObjs(this._overlayObjs);
    const cx = FIELD_CX, cy = 270;

    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 490, 280, 0x080d1a, 0.96)
        .setStrokeStyle(2, 0x6a9a3a).setDepth(25)
    );
    this._overlayObjs.push(
      this.add.text(cx, cy - 122, 'Scoring Events!', {
        fontSize: '20px', color: '#e8c96a', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25)
    );

    let y = cy - 92;
    const events = result.additiveEvents ?? [];
    for (const ev of events) {
      const line = `${ev.yakuName}  ${ev.yakuCardPoints}pts × ×${ev.eventMult.toFixed(1)} → +${ev.eventScore}`;
      this._overlayObjs.push(
        this.add.text(cx, y, line, { fontSize: '14px', color: '#ffee88' }).setOrigin(0.5).setDepth(25)
      );
      y += 22;
    }
    y += 4;
    this._overlayObjs.push(
      this.add.text(cx, y, `Running total: ${result.runningScore}`, {
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

    const bankLabel = surplus >= 0
      ? `Bank ${result.runningScore}  (+${surplus})`
      : `Bank ${result.runningScore}  (need ${-surplus})`;
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

    const pushBtn = this.add.rectangle(cx + 118, btnY, 206, 42, 0x6a1a1a)
      .setStrokeStyle(2, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(25);
    pushBtn.on('pointerover', () => pushBtn.setFillStyle(0x9a2a2a));
    pushBtn.on('pointerout',  () => pushBtn.setFillStyle(0x6a1a1a));
    pushBtn.on('pointerdown', () => {
      this._bankPushOpen = false;
      logger.logBankPushDecision('push', this._round.pushCount);
      const { failedFlow } = this._round.pushOn();
      this._clearObjs(this._overlayObjs);
      this._setStatus(`Pushed! Complete another yaku or flow drops to \xD7${failedFlow.toFixed(2)}.`);
      this._renderAll();
    });
    this._overlayObjs.push(pushBtn);
    this._overlayObjs.push(
      this.add.text(cx + 118, btnY, `Push  (risk flow \xD7${result.nextFailFlow.toFixed(2)})`, {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(25)
    );
  }

  // ── Yaku decision overlay ─────────────────────────────────────────────────

  _showYakuDecision(result) {
    if (run.scoringMode === 'additive') {
      this._showAdditiveEventOverlay(result);
      return;
    }
    this._bankPushOpen = true;
    this._clearObjs(this._overlayObjs);
    const cx = FIELD_CX, cy = 270;

    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 490, 230, 0x080d1a, 0.96)
        .setStrokeStyle(2, 0x6a9a3a).setDepth(25)
    );
    this._overlayObjs.push(
      this.add.text(cx, cy - 97, 'Yaku Completed!', {
        fontSize: '20px', color: '#e8c96a', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25)
    );

    let y = cy - 68;
    for (const yaku of result.newYaku) {
      this._overlayObjs.push(
        this.add.text(cx, y, `${yaku.name}  +${yaku.bonus.toFixed(2)}`, {
          fontSize: '16px', color: '#ffee88',
        }).setOrigin(0.5).setDepth(25)
      );
      y += 23;
    }
    y += 6;
    // Formula line: show non-default channels only.
    let formulaParts = [`Base ${result.boostedBasePoints}`];
    if (Math.abs(result.pointBoost - 1.0) > 0.001)
      formulaParts[0] += ` (\xD7${result.pointBoost.toFixed(2)} pt)`;
    let multPart = `\xD7${result.yakuMult.toFixed(2)}`;
    if (result.additiveMult !== 0) multPart += `+${result.additiveMult.toFixed(2)}`;
    formulaParts.push(multPart);
    if (Math.abs(result.multMult - 1.0) > 0.001)
      formulaParts.push(`\xD7${result.multMult.toFixed(2)} mm`);
    formulaParts.push(`\xD7${result.flow.toFixed(2)} flow`);
    formulaParts.push(`= ${result.finalScore} pts`);
    this._overlayObjs.push(
      this.add.text(cx, y, formulaParts.join('  '), { fontSize: '13px', color: '#cce0ff' })
        .setOrigin(0.5).setDepth(25)
    );

    const btnY = cy + 86;

    const bankBtn = this.add.rectangle(cx - 118, btnY, 206, 42, 0x1a6a1a)
      .setStrokeStyle(2, 0x44aa44).setInteractive({ useHandCursor: true }).setDepth(25);
    bankBtn.on('pointerover',  () => bankBtn.setFillStyle(0x2a9a2a));
    bankBtn.on('pointerout',   () => bankBtn.setFillStyle(0x1a6a1a));
    bankBtn.on('pointerdown',  () => {
      this._bankPushOpen = false;
      logger.logBankPushDecision('bank', this._round.pushCount);
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
      this._bankPushOpen = false;
      logger.logBankPushDecision('push', this._round.pushCount);
      const { failedFlow } = this._round.pushOn();
      this._clearObjs(this._overlayObjs);
      this._setStatus(`Pushed! Complete another yaku or flow drops to \xD7${failedFlow.toFixed(2)}.`);
      this._renderAll();
    });
    this._overlayObjs.push(pushBtn);
    this._overlayObjs.push(
      this.add.text(cx + 118, btnY, `Push  (risk flow \xD7${result.nextFailFlow.toFixed(2)})`, {
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
}
