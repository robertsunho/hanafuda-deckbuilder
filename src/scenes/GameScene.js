import GameRoundManager      from '../systems/GameRoundManager.js';
import { YAKU_INFO }         from '../systems/ScoringEngine.js';
import run, { RunManager, effectivePower, aggregateNumericState, aggregateArrayLength,
               aggregateUniqueCount, longestHeldValue, getPushMultiplier } from '../systems/RunManager.js';
import { getElementDef }     from '../data/consumables.js';
import { getSpiritDef }      from '../data/spirits.js';
import { getStampDef }       from '../data/stamps.js';
import logger                from '../systems/GameplayLogger.js';
import SpiritEffects         from '../systems/SpiritEffects.js';
import ConsumableEffects    from '../systems/ConsumableEffects.js';
import { getCardPoints }     from '../systems/CardMutations.js';
import { getFireFlatPoints, getMetalHeldMult, getEarthInterestRate,
         getWaterMult, getMeteoriteJackpotChance } from '../systems/HexagramEffects.js';
import { getHexagram }              from '../data/hexagrams.js';
import { getSpiritContrib, getElementContrib } from './shared/spiritTooltip.js';

/** Resolve card → Phaser texture key (handles hex-duplicate suffix). */
function _tex(card) { return card.baseImageId ?? card.id; }

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
const SPIRIT_Y         = 62;                          // spirit card centre y
const SPIRIT_W         = CARD_W * CARD_SCALE;  // 64
const SPIRIT_H         = CARD_H * CARD_SCALE;  // 104
// Spirit slot count is dynamic (hexagram can modify). Read run.spiritSlots at render time.

// ── Info box (top-left corner, clustered vertically) ──────────────────────
const INFO_X     = 10;
const INFO_TOP_Y = 14;

// ── Field + Deck (centre) ─────────────────────────────────────────────────
const FIELD_CX    = PLAY_CENTER_X;  // 596
const FIELD_CY    = 340;
const FIELD_COL_W = Math.round(CARD_W * CARD_SCALE * 2.2);  // ~141
const FIELD_ROW_H = Math.round(CARD_H * CARD_SCALE) + 50;   // 154

// Hexagonal field layout — middle row is fixed; top/bottom rows are dynamic.
const MIDDLE_MUL     = 1.75;
const MIDDLE_LEFT_X  = FIELD_CX - FIELD_COL_W * MIDDLE_MUL;
const MIDDLE_RIGHT_X = FIELD_CX + FIELD_COL_W * MIDDLE_MUL;
const INNER_MARGIN   = 30;  // px inset from middle row edges for 4-slot rows

function _distributeRow(count, y) {
  if (count === 0) return [];
  if (count === 1) return [{ x: FIELD_CX, y }];
  // 3-slot row: exact default positions (preserves current 8-slot layout)
  if (count === 3) return [
    { x: FIELD_CX - FIELD_COL_W, y },
    { x: FIELD_CX,               y },
    { x: FIELD_CX + FIELD_COL_W, y },
  ];
  // 2-slot row: symmetric around centre
  if (count === 2) {
    const halfGap = FIELD_COL_W * 0.55;
    return [
      { x: FIELD_CX - halfGap, y },
      { x: FIELD_CX + halfGap, y },
    ];
  }
  // 4+ slots: equidistant within inner span
  const left  = MIDDLE_LEFT_X  + INNER_MARGIN;
  const right = MIDDLE_RIGHT_X - INNER_MARGIN;
  const step  = (right - left) / (count - 1);
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(left + i * step), y,
  }));
}

function computeFieldSlotPositions(totalSlots) {
  const outerCount  = totalSlots - 2;            // minus middle row's 2
  const topCount    = Math.floor(outerCount / 2);
  const bottomCount = Math.ceil(outerCount / 2);  // bottom-heavy for odd

  return [
    ..._distributeRow(topCount,    FIELD_CY - FIELD_ROW_H),
    { x: MIDDLE_LEFT_X,  y: FIELD_CY },
    { x: MIDDLE_RIGHT_X, y: FIELD_CY },
    ..._distributeRow(bottomCount, FIELD_CY + FIELD_ROW_H),
  ];
}

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

// ── Consumable card dimensions ───────────────────────────────────────────
const CONS_CARD_W  = Math.round(CARD_W * CARD_SCALE);          // 64
const CONS_CARD_H  = Math.round(CARD_H * CARD_SCALE);          // 104
const CONS_BASE_Y  = SPIRIT_Y;                                 // 62
// Consumable slot count is dynamic (hexagram can modify). Read run.maxConsumableSlots at render time.

import { SPIRIT_FAN_LEFT, SPIRIT_FAN_W, SPIRIT_W as _SW, SPIRIT_H as _SH,
         SPIRIT_IDEAL_GAP, SPIRIT_Y as _SY,
         LEGENDARY_FAN_LEFT, LEGENDARY_FAN_W, LEGENDARY_IDEAL_GAP,
         CONS_FAN_LEFT, CONS_FAN_W,
         EXPAND_CARD_OFFSET,
         computeFanPositions } from './shared/SpiritLayout.js';

// ── Consumable fan layout ──────────────────────────────────────────────
const CONS_IDEAL_GAP = 8;

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
    this._deckOverlayOpen    = false;
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
    this._deckOverlayObjs    = [];
    this._actionBtnObjs      = [];
    this._deckPreviewObjs    = [];

    this._selectedCardIds         = new Set();
    this._selectedConsumableIndex = null;
    this._expandedConsumable      = null;   // { displayIndex, cons, isNeg, objs[] }

    /**
     * Active Three Marks targeting state, or null when not in mark mode.
     * @type {{ id: string, index: number, step: 'select_source'|'select_target', sourceCard: object|null }|null}
     */
    this._cardTargetMode         = null;
    this._fannedSlot       = null;
    this._cardTooltipBg    = null;
    this._cardTooltipText  = null;

    this._createCardBackTexture();
    this._buildStaticUI();

    this._scoringQueue     = [];
    this._scoringAnimating = false;

    // ── Spirit expansion + drag state ───────────────────────────────────────
    this._expandedStack          = null;   // { displayIndex, spirit, objs[] }
    this._spiritDragInProgress   = null;   // { spirit, sourceIndex, quantity, ... }
    this._dragPreviewObjs        = [];
    this._suppressSpiritTooltips = false;

    this._round.setScoringStepCallback(ev => this._scoringQueue.push(ev));
    this._round.startRound();
    this._afterRoundStart();
    this._renderAll();

    // ESC cancels mark mode or fire wild targeting
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._cardTargetMode) {
        this._cardTargetMode = null;
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

    // ── Left info panel (three-section layout, invisible boxes) ─────────
    const BOX_W = 149, BOX_X = INFO_X - 4, BOX_PAD = 6;

    // ─── Section 1: Run state ───────────────────────────────────────────
    const B1_Y = INFO_TOP_Y, B1_H = 110;
    let ry = B1_Y + BOX_PAD;
    this._hexLineText = this.add.text(INFO_X, ry, '', { fontSize: '13px', color: '#bbccdd' });
    this._hexHitTarget = this.add.rectangle(BOX_X, ry - 2, BOX_W, 18, 0x000000, 0)
      .setOrigin(0, 0).setInteractive({ useHandCursor: false });
    this._hexTooltipText = this.add.text(0, 0, '', {
      fontSize: '11px', color: '#ddeeff', backgroundColor: '#0a1018',
      stroke: '#000000', strokeThickness: 2,
      padding: { x: 8, y: 6 }, wordWrap: { width: 280 }, lineSpacing: 2,
    }).setVisible(false).setDepth(100);
    this._hexHitTarget.on('pointerover', () => {
      if (this._hexTooltipText.text) {
        this._hexTooltipText.setPosition(BOX_X + BOX_W + 8, ry - 4).setVisible(true);
      }
    });
    this._hexHitTarget.on('pointerout', () => this._hexTooltipText.setVisible(false));
    ry += 20;
    this._actRoundText  = this.add.text(INFO_X, ry, '', { fontSize: '13px', color: '#8899aa' }); ry += 20;
    this._kiText        = this.add.text(INFO_X, ry, '', { fontSize: '13px', color: '#ffee88' }); ry += 20;
    this._interestText  = this.add.text(INFO_X, ry, '', { fontSize: '13px', color: '#88ccaa' }); ry += 20;
    this._thresholdText = this.add.text(INFO_X, ry, 'Target: –', { fontSize: '13px', color: '#cc8866' });

    // ─── Section 2: Activity context ────────────────────────────────────
    const B2_Y = B1_Y + B1_H + 6, B2_H = 84;
    this._statusText = this.add.text(INFO_X, B2_Y + BOX_PAD, '', {
      fontSize: '13px', color: '#e8e8e8',
      stroke: '#0a0f1e', strokeThickness: 3,
      wordWrap: { width: 140 },
    }).setOrigin(0, 0);

    // ─── Section 3: Round state ─────────────────────────────────────────
    const B3_Y = B2_Y + B2_H + 6, B3_H = 110;
    let sy = B3_Y + BOX_PAD;
    this._scorePtsText = this.add.text(INFO_X, sy, 'Points: 0', { fontSize: '13px', color: '#aaccee' }); sy += 16;
    this._scoreMltText = this.add.text(INFO_X, sy, 'Mult: 1.0', { fontSize: '13px', color: '#ffcc66' }); sy += 16;
    this._scoreFlwText = this.add.text(INFO_X, sy, 'Flow: \xD71.00', { fontSize: '13px', color: '#88ddaa' }); sy += 24;
    this._scoreTotText = this.add.text(INFO_X, sy, 'Total: 0', { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' });

    // ── Options button ──────────────────────────────────────────────────
    {
      const optBtn = this.add.text(INFO_X, B3_Y + B3_H + 8, '\u2699 Options', {
        fontSize: '12px', color: '#889aaa',
        backgroundColor: '#0e1520', padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });
      optBtn.on('pointerover', () => optBtn.setStyle({ color: '#ccddee' }));
      optBtn.on('pointerout',  () => optBtn.setStyle({ color: '#889aaa' }));
      optBtn.on('pointerdown', () => this._openOptionsPopup());
    }

    // ── Dev mode indicator ──────────────────────────────────────────────
    if (run.devMode) {
      this.add.text(1270, 10, 'DEV', {
        fontSize: '14px', color: '#ff8844', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 0).setDepth(100);
    }

    // ── Spirits row — dynamic label rendered in _renderSpiritColumn ──────

    // ── Consumable area — dynamic label rendered in _renderConsumables ───

    // ── Deck pile (portrait) ───────────────────────────────────────────────
    this._deckSprite = this.add.image(DECK_X, DECK_Y, 'card_back')
      .setDisplaySize(CARD_W * CARD_SCALE, CARD_H * CARD_SCALE)
      .setInteractive({ useHandCursor: true });
    this._deckSprite.on('pointerover', () => this._deckSprite.setTint(TINT_HOVER));
    this._deckSprite.on('pointerout',  () => this._deckSprite.clearTint());
    this._deckSprite.on('pointerdown', () => this._showDeckOverlay());
    this._deckCountText = this.add.text(DECK_X, DECK_Y + CARD_H * CARD_SCALE / 2 + 8, '32', {
      fontSize: '16px', color: '#aaccee', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // ── Right vertical divider (separates field from captures) ───────────
    this.add.rectangle(1036, 400, 1, 720, 0x2a3a50);
    this.add.text(1046 + 80, 62, 'CAPTURES', {
      fontSize: '11px', color: '#556677',
    }).setOrigin(0.5, 0.5);

    // ── Yaku Guide button (left of CAPTURES label) ──────────────────────
    {
      const gx = 1046 + 40, gy = 62;
      const guideBtn = this.add.rectangle(gx, gy, 20, 18, 0x1a3550)
        .setStrokeStyle(1, 0x3a6080).setInteractive({ useHandCursor: true });
      guideBtn.on('pointerover', () => guideBtn.setFillStyle(0x2a5a80));
      guideBtn.on('pointerout',  () => guideBtn.setFillStyle(0x1a3550));
      guideBtn.on('pointerdown', () => this._showYakuGuide());
      this.add.text(gx, gy, '?', {
        fontSize: '12px', color: '#aaccee', fontStyle: 'bold',
      }).setOrigin(0.5);
    }

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
    this._collapseStack();
    this._collapseConsumable();
    this._cleanupSpiritDrag();
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
    this._renderDeckFlipPreview();
  }

  // ── Hand ──────────────────────────────────────────────────────────────────

  _renderHand() {
    const cards      = this._round.hand.getAll();
    const n          = cards.length;
    const fireWild   = this._fireWildCard !== null;
    const idle       = this._round.phase === 'idle' && !this._animating
                        && !this._yakuGuideOpen && !this._captureOverlayOpen
                        && !fireWild;
    const targetActive = this._cardTargetMode !== null;
    const startX     = Math.round(HAND_CX - ((n - 1) * HAND_STEP) / 2);

    for (let i = 0; i < n; i++) {
      const card     = cards[i];
      const selected = this._selectedCardIds.has(card.id);
      const x        = startX + i * HAND_STEP;
      const y        = HAND_Y - (selected || (fireWild && card.id === this._fireWildCard.id) ? 20 : 0);
      const spr      = this.add.image(x, y, _tex(card)).setScale(CARD_SCALE);

      const ttY = y - Math.round(CARD_H * CARD_SCALE / 2) - 5;
      if (targetActive) {
        // In mark mode: cards are selectable targets regardless of game phase.
        const MARK_TINT        = 0x44ffcc;
        const MARK_HOVER       = 0xaaffee;
        const isTranscendSrc   = this._cardTargetMode.step === 'select_target'
                                  && this._cardTargetMode.sourceCard?.id === card.id;
        const isMultiSelected  = this._cardTargetMode.step === 'select_multi_targets'
                                  && this._cardTargetMode.selectedCardIds?.includes(card.id);
        spr.setTint((isTranscendSrc || isMultiSelected) ? TINT_PENDING : MARK_TINT);
        spr.setInteractive({ useHandCursor: true });
        spr.on('pointerover',  () => { if (!isTranscendSrc) spr.setTint(MARK_HOVER); this._showCardTooltip(card, x, ttY); });
        spr.on('pointerout',   () => { spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT); this._hideCardTooltip(); });
        spr.on('pointerdown',  () => this._onCardTargetSelected(card));
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

      // Edition badge — top-right corner of the card.
      const edBadge = this._makeEditionBadge(card, x, y);
      if (edBadge) this._handObjs.push(edBadge);

      // Conversion badge — bottom-right corner, for Path/Tree-converted cards.
      const convBadge = this._makeConversionBadge(card, x, y);
      if (convBadge) this._handObjs.push(convBadge);
    }
  }

  // ── Field ─────────────────────────────────────────────────────────────────

  _renderField() {
    const slots      = this._round.field.getSlots();
    const targetActive = this._cardTargetMode !== null;
    const fireWild   = this._fireWildCard !== null;

    // F3.23: render backgrounds for maxSlots AND any Leaf-spawned bonus slots.
    const fieldSlotCount = Math.max(this._round.field.maxSlots, slots.length);
    const slotPositions  = computeFieldSlotPositions(fieldSlotCount);
    for (let i = 0; i < fieldSlotCount; i++) {
      const { x: sx, y: sy } = slotPositions[i];
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
        const spr  = this.add.image(cx, cy, _tex(card)).setScale(CARD_SCALE);
        const ttY  = cy - Math.round(CARD_H * CARD_SCALE / 2) - 5;

        if (targetActive) {
          const MARK_TINT      = 0x44ffcc;
          const MARK_HOVER     = 0xaaffee;
          const isTranscendSrc = this._cardTargetMode.step === 'select_target'
                                  && this._cardTargetMode.sourceCard?.id === card.id;
          const isMultiSelected = this._cardTargetMode.step === 'select_multi_targets'
                                  && this._cardTargetMode.selectedCardIds?.includes(card.id);
          spr.setTint((isTranscendSrc || isMultiSelected) ? TINT_PENDING : MARK_TINT);
          spr.setInteractive({ useHandCursor: true });
          spr.on('pointerover',  () => { if (!isTranscendSrc) spr.setTint(MARK_HOVER); this._showCardTooltip(card, cx, ttY); });
          spr.on('pointerout',   () => { spr.setTint(isTranscendSrc ? TINT_PENDING : MARK_TINT); this._hideCardTooltip(); });
          spr.on('pointerdown',  () => this._onCardTargetSelected(card));
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
          const edBadgeF = this._makeEditionBadge(card, cx, cy);
          if (edBadgeF) this._fieldObjs.push(edBadgeF);
          const convBadge = this._makeConversionBadge(card, cx, cy);
          if (convBadge) this._fieldObjs.push(convBadge);
        }
      }
    }
  }

  // ── Spirit fan (horizontal, regulars + negatives interleaved) ────────────

  _renderSpiritColumn() {
    this._collapseStack();
    this._clearObjs(this._spiritObjs);

    const allFan = run.allSpirits;
    const regulars = run.spirits;
    this._spiritCardObjs = [];
    this._spiritStackBadges = {};
    this._spiritFanPositions = null;

    // ── Spirit fan ────────────────────────────────────────────────────────
    if (allFan.length > 0) {
      const positions = computeFanPositions(
        allFan.length, SPIRIT_FAN_W, SPIRIT_W, SPIRIT_IDEAL_GAP
      );
      this._spiritFanPositions = positions;

      for (let i = 0; i < allFan.length; i++) {
        const spirit = allFan[i];
        const isNeg  = !!spirit.isNegative;
        const x      = SPIRIT_FAN_LEFT + positions[i];
        const y      = SPIRIT_Y;
        const depth  = i + 1;

        const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;
        const borderCol = isNeg ? 0xaa44cc : rarityCol;
        const bgCol     = isNeg ? 0x1a0d2a : 0x0d1b2a;
        const nameCol   = isNeg ? '#ddaaff' : '#cce0ff';

        // Card background.
        const card = this._addRoundedRect(x, y, SPIRIT_W, SPIRIT_H, 6, bgCol, 1, borderCol)
          .setDepth(depth);
        this._spiritObjs.push(card);
        this._spiritCardObjs[i] = card;

        // Rarity left-border strip.
        this._spiritObjs.push(
          this.add.rectangle(x - SPIRIT_W / 2 + 2, y, 4, SPIRIT_H - 4,
            isNeg ? 0xaa44cc : rarityCol).setDepth(depth + 0.05)
        );

        // Name label.
        this._spiritObjs.push(
          this.add.text(x, y, spirit.name, {
            fontSize: '9px', color: nameCol,
            wordWrap: { width: SPIRIT_W - 8 },
            align: 'center',
          }).setOrigin(0.5).setDepth(depth + 0.1)
        );

        // Stack count / multiplier badge (top-right corner).
        const displayPower = isNeg ? (spirit.powerLevel ?? 1) : (spirit.stackCount ?? 1);
        const showBadge    = isNeg ? true : displayPower > 1;
        if (showBadge) {
          const badgeColor = isNeg ? '#ddaaff' : '#ffee66';
          const badge = this.add.text(x + SPIRIT_W / 2 - 3, y - SPIRIT_H / 2 + 3,
            `\xD7${displayPower}`, {
              fontSize: '10px', color: badgeColor, fontStyle: 'bold',
              stroke: '#000000', strokeThickness: 2,
            }).setOrigin(1, 0).setDepth(depth + 0.2);
          this._spiritObjs.push(badge);
          this._spiritStackBadges[i] = badge;
        }

        // Negative ∅ badge (below stack badge if present).
        if (isNeg) {
          const badgeY = showBadge ? y - SPIRIT_H / 2 + 16 : y - SPIRIT_H / 2 + 3;
          this._spiritObjs.push(
            this.add.text(x + SPIRIT_W / 2 - 3, badgeY, '\u2205', {
              fontSize: '9px', color: '#5588aa',
            }).setOrigin(1, 0).setDepth(depth + 0.3)
          );
        }

        // Tooltip — below the card.
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

        // Interactive — hover for tooltip; click/drag via custom handler.
        card.setInteractive(
          new Phaser.Geom.Rectangle(x - SPIRIT_W / 2, y - SPIRIT_H / 2, SPIRIT_W, SPIRIT_H),
          Phaser.Geom.Rectangle.Contains
        );

        card.on('pointerover', () => {
          if (this._suppressSpiritTooltips || this._expandedStack) return;
          const contrib  = getSpiritContrib(spirit, {
            bullseyeInventory: this._round?._bullseyeInventory,
            cumulativePoints: this._cumulativePoints ?? 0,
          });
          const desc     = getSpiritDef(spirit.id)?.description ?? spirit.name;
          const suffix   = isNeg ? '\n\nNegative copy (zero-slot, base effect)' : '';
          tooltip.setText(contrib ? contrib + suffix : desc + suffix);
          tooltip.setVisible(true);
        });
        card.on('pointerout', () => tooltip.setVisible(false));

        // Custom click/drag handler (replaces Phaser built-in drag).
        const _idx = i;
        card.on('pointerdown', (pointer) => {
          if (this._scoringAnimating) return;
          this._onSpiritPointerDown(spirit, _idx, pointer);
        });
      }
    }

    // ── Rotated "SPIRITS X/Y" label ────────────────────────────────────
    this._spiritObjs.push(
      this.add.text(SPIRIT_FAN_LEFT - 10, SPIRIT_Y,
        `SPIRITS ${regulars.length}/${run.spiritSlots}`, {
          fontSize: '10px', color: '#556677',
        }).setOrigin(0.5, 0.5).setRotation(-Math.PI / 2).setDepth(1)
    );

    // ── Legendary spirit fan ────────────────────────────────────────────
    const legSpirits   = run.legendarySpirits;
    const legSlotCount = run.maxLegendarySlots;

    // Rotated "LEGENDARIES X/Y" label
    this._spiritObjs.push(
      this.add.text(LEGENDARY_FAN_LEFT - 10, SPIRIT_Y,
        `LEGENDARIES ${legSpirits.length}/${legSlotCount}`, {
          fontSize: '10px', color: '#556677',
        }).setOrigin(0.5, 0.5).setRotation(-Math.PI / 2).setDepth(1)
    );

    if (legSpirits.length > 0) {
      const legPositions = computeFanPositions(
        legSpirits.length, LEGENDARY_FAN_W, SPIRIT_W, LEGENDARY_IDEAL_GAP
      );
      for (let i = 0; i < legSpirits.length; i++) {
        const ls = legSpirits[i];
        const lx = LEGENDARY_FAN_LEFT + legPositions[i];
        const ly = SPIRIT_Y;

        const legCol  = RARITY_COLOR.legendary;
        const legCard = this._addRoundedRect(lx, ly, SPIRIT_W, SPIRIT_H, 6, 0x1a1a0a, 1, legCol);
        this._spiritObjs.push(legCard);

        this._spiritObjs.push(
          this.add.rectangle(lx - SPIRIT_W / 2 + 2, ly, 4, SPIRIT_H - 4, legCol)
        );

        this._spiritObjs.push(
          this.add.text(lx, ly, ls.name, {
            fontSize: '9px', color: '#ffee88',
            wordWrap: { width: SPIRIT_W - 8 }, align: 'center',
          }).setOrigin(0.5)
        );

        const legTip = this.add.text(
          lx, ly + SPIRIT_H / 2 + 4, '',
          {
            fontSize: '11px', color: '#e8e8e8',
            backgroundColor: '#0a0f1e',
            padding: { x: 6, y: 4 },
            wordWrap: { width: 200 },
          }
        ).setOrigin(0.5, 0).setDepth(42).setVisible(false);
        this._spiritObjs.push(legTip);

        legCard.setInteractive(
          new Phaser.Geom.Rectangle(lx - SPIRIT_W / 2, ly - SPIRIT_H / 2, SPIRIT_W, SPIRIT_H),
          Phaser.Geom.Rectangle.Contains
        );
        legCard.on('pointerover', () => {
          const contrib  = getSpiritContrib(ls, {
            bullseyeInventory: this._round?._bullseyeInventory,
            cumulativePoints: this._cumulativePoints ?? 0,
          });
          const legDesc = getSpiritDef(ls.id)?.description ?? ls.name;
          legTip.setText(contrib ? contrib : legDesc);
          legTip.setVisible(true);
        });
        legCard.on('pointerout', () => legTip.setVisible(false));
      }
    }
  }

  /** Find the fan index of a spirit (regular or negative) for animation lookups. */
  _getSpiritFanIndex(spirit) {
    const all = run.allSpirits;
    const idx = all.findIndex(s => s === spirit);
    return idx >= 0 ? idx : -1;
  }

  /**
   * Find the allSpirits index from a pointer x position in the fan.
   * Returns null if x is outside all fan slots.
   */
  _getSpiritSlotFromX(x) {
    const all = run.allSpirits;
    if (all.length === 0) {
      // Empty fan — drop within fan area inserts at index 0
      if (x >= SPIRIT_FAN_LEFT && x <= SPIRIT_FAN_LEFT + SPIRIT_FAN_W) return 0;
      return null;
    }
    const positions = computeFanPositions(all.length, SPIRIT_FAN_W, SPIRIT_W, SPIRIT_IDEAL_GAP);
    for (let i = 0; i < all.length; i++) {
      const slotX = SPIRIT_FAN_LEFT + positions[i];
      if (x >= slotX - SPIRIT_W / 2 && x <= slotX + SPIRIT_W / 2) return i;
    }
    // Dropped within fan area but not on any card → insert at end
    if (x >= SPIRIT_FAN_LEFT && x <= SPIRIT_FAN_LEFT + SPIRIT_FAN_W) {
      return all.length;
    }
    return null;
  }

  // ── Spirit click / expand / drag ──────────────────────────────────────────

  _onSpiritPointerDown(spirit, displayIndex, pointer) {
    const isExpanded = this._expandedStack &&
                       this._expandedStack.displayIndex === displayIndex;

    if (isExpanded) {
      // Source clicked while expanded — drag-1 or collapse
      const startX = pointer.x;
      const startY = pointer.y;
      let moved = false;

      const moveH = (p) => {
        if (Math.sqrt((p.x - startX) ** 2 + (p.y - startY) ** 2) > 8) {
          moved = true;
          this.input.off('pointermove', moveH);
          this._collapseStack();
          this._initiateQuantityDrag(spirit, displayIndex, 1, p);
        }
      };
      this.input.on('pointermove', moveH);

      this.input.once('pointerup', () => {
        this.input.off('pointermove', moveH);
        if (!moved) this._collapseStack();
      });
      return;
    }

    // Not expanded — click to expand, drag to move whole stack
    const startX = pointer.x;
    const startY = pointer.y;
    let moved = false;

    const moveHandler = (p) => {
      if (Math.sqrt((p.x - startX) ** 2 + (p.y - startY) ** 2) > 8) {
        moved = true;
        this.input.off('pointermove', moveHandler);
        this._collapseStack();
        this._initiateWholeStackDrag(spirit, displayIndex, p);
      }
    };
    this.input.on('pointermove', moveHandler);

    this.input.once('pointerup', () => {
      this.input.off('pointermove', moveHandler);
      if (!moved) {
        this._expandSpiritStack(spirit, displayIndex);
      }
    });
  }

  // ── Expansion view ──────────────────────────────────────────────────────

  _expandSpiritStack(spirit, displayIndex) {
    // Toggle if clicking the same spirit
    if (this._expandedStack && this._expandedStack.displayIndex === displayIndex) {
      this._collapseStack();
      return;
    }
    this._collapseStack();

    const stackCount = spirit.stackCount ?? 1;
    const positions  = this._spiritFanPositions;
    if (!positions || displayIndex >= positions.length) return;

    const sourceX = SPIRIT_FAN_LEFT + positions[displayIndex];

    this._expandedStack = { displayIndex, spirit, objs: [] };

    // Transparent blocker behind expansion cards — catches clicks outside
    const blocker = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.15)
      .setDepth(89).setInteractive();
    blocker.on('pointerdown', () => this._collapseStack());
    this._expandedStack.objs.push(blocker);

    // Lift source spirit above neighbors
    const sourceCard = this._spiritCardObjs[displayIndex];
    if (sourceCard) sourceCard.setDepth(85);
    this._expandedStack.liftedIndex = displayIndex;

    // Hide stack badge on source (sell button occupies same corner)
    if (this._spiritStackBadges[displayIndex]) {
      this._spiritStackBadges[displayIndex].setVisible(false);
    }

    // Source = ×1. Sell button on source card.
    this._addSourceSellButton(displayIndex, spirit);

    // Source card gets element-0 tooltip during expansion (F3.5).
    const srcTipText = getElementContrib(spirit, 0);
    if (srcTipText) {
      const srcTip = this.add.text(sourceX, SPIRIT_Y + SPIRIT_H / 2 + 4, srcTipText, {
        fontSize: '10px', color: '#e8e8e8',
        backgroundColor: '#0a0f1e',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 180 },
      }).setOrigin(0.5, 0).setDepth(96).setVisible(false);
      this._expandedStack.objs.push(srcTip);
      const srcHit = this.add.rectangle(sourceX, SPIRIT_Y, SPIRIT_W, SPIRIT_H, 0x000000, 0)
        .setInteractive({ useHandCursor: false }).setDepth(95);
      srcHit.on('pointerover', () => { if (this._expandedStack) srcTip.setVisible(true); });
      srcHit.on('pointerout',  () => srcTip.setVisible(false));
      this._expandedStack.objs.push(srcHit);
    }

    // Negatives are singletons — no peek cards
    if (spirit.isNegative) return;

    // Peek cards for ×2..×N below source, uniform spacing
    for (let q = 2; q <= stackCount; q++) {
      const peekIdx = q - 2;
      const cardY   = SPIRIT_Y + (peekIdx + 1) * EXPAND_CARD_OFFSET;
      this._renderExpandedCard(spirit, q, sourceX, cardY, displayIndex);
    }
  }

  _renderExpandedCard(spirit, quantity, x, y, sourceDisplayIndex) {
    const depth = 90 + quantity;
    const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;
    const borderCol = rarityCol;
    const bgCol     = 0x0d1b2a;

    // Card background
    const card = this._addRoundedRect(x, y, SPIRIT_W, SPIRIT_H, 6, bgCol, 1, borderCol, 2)
      .setDepth(depth);
    card.setInteractive(
      new Phaser.Geom.Rectangle(x - SPIRIT_W / 2, y - SPIRIT_H / 2, SPIRIT_W, SPIRIT_H),
      Phaser.Geom.Rectangle.Contains
    );
    this._expandedStack.objs.push(card);

    // Quantity label (top-left of peek strip)
    this._expandedStack.objs.push(
      this.add.text(x - SPIRIT_W / 2 + 6, y - SPIRIT_H / 2 + 4, `\xD7${quantity}`, {
        fontSize: '10px', color: '#ffee66', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0, 0).setDepth(depth + 0.1)
    );

    // Spirit name (centered)
    this._expandedStack.objs.push(
      this.add.text(x, y - 6, spirit.name, {
        fontSize: '9px', color: '#cce0ff',
        wordWrap: { width: SPIRIT_W - 12 }, align: 'center',
      }).setOrigin(0.5).setDepth(depth + 0.1)
    );

    // Sell button (top-right — visible in peek strip)
    const cost = getSpiritDef(spirit.id)?.cost ?? spirit.cost ?? 0;
    const sellRefund = Math.floor(cost / 2 * quantity);
    const sellBtn = this.add.text(x + SPIRIT_W / 2 - 4, y - SPIRIT_H / 2 + 4,
      `\u00A5${sellRefund}`, {
        fontSize: '9px', color: '#ffaa44', fontStyle: 'bold',
        backgroundColor: '#3a2010', padding: { x: 3, y: 1 },
      }).setOrigin(1, 0).setDepth(depth + 0.2)
      .setInteractive({ useHandCursor: true });

    sellBtn.on('pointerdown', (pointer, lx, ly, event) => {
      event.stopPropagation();
      this._sellSpiritQuantity(sourceDisplayIndex, quantity);
    });
    this._expandedStack.objs.push(sellBtn);

    // Per-element tooltip on hover (F3.5).
    const elTipText = getElementContrib(spirit, quantity - 1);
    if (elTipText) {
      const elTip = this.add.text(x, y + SPIRIT_H / 2 + 4, elTipText, {
        fontSize: '10px', color: '#e8e8e8',
        backgroundColor: '#0a0f1e',
        padding: { x: 6, y: 4 },
        wordWrap: { width: 180 },
      }).setOrigin(0.5, 0).setDepth(depth + 1).setVisible(false);
      this._expandedStack.objs.push(elTip);
      card.on('pointerover', () => elTip.setVisible(true));
      card.on('pointerout',  () => elTip.setVisible(false));
    }

    // Drag from peek card — quantity-aware
    card.on('pointerdown', (pointer) => {
      const startX = pointer.x;
      const startY = pointer.y;
      let dragStarted = false;

      const moveH = (p) => {
        if (Math.sqrt((p.x - startX) ** 2 + (p.y - startY) ** 2) > 8) {
          dragStarted = true;
          this.input.off('pointermove', moveH);
          this._collapseStack();
          this._initiateQuantityDrag(spirit, sourceDisplayIndex, quantity, p);
        }
      };
      this.input.on('pointermove', moveH);

      this.input.once('pointerup', () => {
        this.input.off('pointermove', moveH);
      });
    });
  }

  _addSourceSellButton(displayIndex, spirit) {
    const positions = this._spiritFanPositions;
    if (!positions || displayIndex >= positions.length) return;

    const sourceX = SPIRIT_FAN_LEFT + positions[displayIndex];
    const cost = getSpiritDef(spirit.id)?.cost ?? spirit.cost ?? 0;
    const refund = spirit.isNegative
      ? Math.floor(cost * 0.5 * effectivePower(spirit))
      : Math.floor(cost * 0.5);

    const sellBtn = this.add.text(
      sourceX + SPIRIT_W / 2 - 4, SPIRIT_Y - SPIRIT_H / 2 + 4,
      `\u00A5${refund}`, {
        fontSize: '9px', color: '#ffaa44', fontStyle: 'bold',
        backgroundColor: '#3a2010', padding: { x: 3, y: 1 },
      }).setOrigin(1, 0).setDepth(95)
      .setInteractive({ useHandCursor: true });

    sellBtn.on('pointerdown', (pointer, lx, ly, event) => {
      event.stopPropagation();
      this._sellSpiritQuantity(displayIndex, spirit.isNegative ? -1 : 1);
    });

    this._expandedStack.objs.push(sellBtn);
  }

  _collapseStack() {
    if (!this._expandedStack) return;
    // Restore source spirit depth
    const liftIdx = this._expandedStack.liftedIndex;
    if (liftIdx != null && this._spiritCardObjs[liftIdx]) {
      this._spiritCardObjs[liftIdx].setDepth(liftIdx + 1);
    }
    // Restore stack badge visibility
    if (liftIdx != null && this._spiritStackBadges[liftIdx]) {
      this._spiritStackBadges[liftIdx].setVisible(true);
    }
    for (const obj of this._expandedStack.objs) obj.destroy();
    this._expandedStack = null;
  }

  _sellSpiritQuantity(displayIndex, quantity) {
    const all = run.allSpirits;
    const spirit = all[displayIndex];
    if (!spirit) return;

    const cost = getSpiritDef(spirit.id)?.cost ?? spirit.cost ?? 0;

    // Negative singletons: sell entire entry, refund based on baked multiplier
    if (spirit.isNegative || quantity < 0) {
      const mult   = effectivePower(spirit);
      const refund = Math.floor(cost * 0.5 * mult);
      run.removeSpirit(displayIndex);
      run.addKi(refund, `sold ${spirit.name} (negative)`);
      logger.logSpiritSold(spirit.name, refund, displayIndex);
      this._collapseStack();
      this._renderAll();
      this._setStatus(`Sold ${spirit.name} (negative \xD7${mult}) for ${refund} ki`);
      return;
    }

    // Regular spirit sell
    const refund = Math.floor(cost / 2 * quantity);
    const currentStack = spirit.stackCount ?? 1;

    // Past Life activation: count matured elements among those being sold
    let pastLifeActivated = 0;
    if (spirit.id === 'util_past_life' && spirit.elements) {
      const elementsBeingSold = spirit.elements.slice(-quantity);
      for (const el of elementsBeingSold) {
        if ((run.round - (el.acquiredRound ?? 0)) >= 3) pastLifeActivated++;
      }
    }

    // Cuckoo Egg activation: count matured elements among those being sold
    let cuckooMatureStacks = 0;
    if (spirit.id === 'sym_cuckoo_egg' && spirit.elements) {
      const elementsBeingSold = spirit.elements.slice(-quantity);
      for (const el of elementsBeingSold) {
        if ((run.round - (el.acquiredRound ?? 0)) >= 3) cuckooMatureStacks++;
      }
    }

    if (quantity >= currentStack) {
      run.removeSpirit(displayIndex);
    } else {
      spirit.stackCount = currentStack - quantity;
      if (spirit.elements) {
        for (let i = 0; i < quantity && spirit.elements.length > 0; i++) spirit.elements.pop();
      }
    }

    // Fire Past Life copy effect after sale completes
    if (pastLifeActivated > 0) {
      run._firePastLifeCopy(pastLifeActivated);
    }

    // Fire Cuckoo Egg hatch after sale completes (slot freed by removal)
    if (cuckooMatureStacks > 0) {
      run._fireCuckooHatch(cuckooMatureStacks);
    }

    run.addKi(refund, `sold ${spirit.name} \xD7${quantity}`);
    logger.logSpiritSold(spirit.name, refund, displayIndex);
    this._collapseStack();
    this._renderAll();
    this._setStatus(`Sold ${spirit.name} \xD7${quantity} for ${refund} ki`);
  }

  // ── Spirit drag ─────────────────────────────────────────────────────────

  _initiateWholeStackDrag(spirit, displayIndex, pointer) {
    if (this._spiritDragInProgress) return;

    this._spiritDragInProgress = {
      spirit,
      sourceIndex: displayIndex,
      quantity: spirit.stackCount ?? 1,
    };

    this._suppressSpiritTooltips = true;
    if (this._spiritCardObjs[displayIndex]) {
      this._spiritCardObjs[displayIndex].setAlpha(0.3);
    }
    this._createSpiritDragPreview(spirit, spirit.stackCount ?? 1, pointer.x, pointer.y);

    this._spiritDragMoveHandler = (p) => this._onSpiritDragMove(p);
    this.input.on('pointermove', this._spiritDragMoveHandler);
    this.input.once('pointerup', (p) => this._onSpiritDragEnd(p));
  }

  _initiateQuantityDrag(spirit, sourceIndex, quantity, pointer) {
    if (this._spiritDragInProgress) return;

    this._spiritDragInProgress = {
      spirit,
      sourceIndex,
      quantity,
    };

    this._suppressSpiritTooltips = true;
    this._createSpiritDragPreview(spirit, quantity, pointer.x, pointer.y);

    this._spiritDragMoveHandler = (p) => this._onSpiritDragMove(p);
    this.input.on('pointermove', this._spiritDragMoveHandler);
    this.input.once('pointerup', (p) => this._onSpiritDragEnd(p));
  }

  _createSpiritDragPreview(spirit, quantity, x, y) {
    this._clearObjs(this._dragPreviewObjs);
    const isNeg = !!spirit.isNegative;
    const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;
    const borderCol = isNeg ? 0xaa44cc : rarityCol;
    const bgCol     = isNeg ? 0x1a0d2a : 0x0d1b2a;

    const ox = x + SPIRIT_W / 2 + 4;
    const oy = y + SPIRIT_H / 2 + 4;

    // Draw at origin so setPosition moves it cleanly
    const gfx = this.add.graphics();
    gfx.fillStyle(bgCol, 0.8);
    gfx.fillRoundedRect(-SPIRIT_W / 2, -SPIRIT_H / 2, SPIRIT_W, SPIRIT_H, 6);
    gfx.lineStyle(2, borderCol, 1);
    gfx.strokeRoundedRect(-SPIRIT_W / 2, -SPIRIT_H / 2, SPIRIT_W, SPIRIT_H, 6);
    gfx.setPosition(ox, oy).setDepth(200);
    this._dragPreviewObjs.push(gfx);

    const label = this.add.text(ox, oy, `${spirit.name}\n\xD7${quantity}`, {
      fontSize: '9px', color: isNeg ? '#ddaaff' : '#cce0ff',
      align: 'center',
    }).setOrigin(0.5).setDepth(201);
    this._dragPreviewObjs.push(label);

    this._dragPreviewGfx = gfx;
    this._dragPreviewLabel = label;
  }

  _onSpiritDragMove(pointer) {
    if (!this._spiritDragInProgress) return;
    const ox = pointer.x + SPIRIT_W / 2 + 4;
    const oy = pointer.y + SPIRIT_H / 2 + 4;
    if (this._dragPreviewGfx) this._dragPreviewGfx.setPosition(ox, oy);
    if (this._dragPreviewLabel) this._dragPreviewLabel.setPosition(ox, oy);
  }

  _onSpiritDragEnd(pointer) {
    if (!this._spiritDragInProgress) return;

    const { spirit, sourceIndex, quantity } = this._spiritDragInProgress;
    const targetIndex = this._getSpiritSlotFromX(pointer.x);

    this._cleanupSpiritDrag();

    // Dropped outside fan area — cancel
    if (targetIndex === null || targetIndex === sourceIndex) {
      this._renderAll();
      return;
    }

    this._resolveSpiritDrop(sourceIndex, quantity, targetIndex);
    this._renderAll();
  }

  _resolveSpiritDrop(sourceIndex, quantity, targetIndex) {
    const all = run.allSpirits;
    const sourceSpirit = all[sourceIndex];
    const targetSpirit = (targetIndex < all.length) ? all[targetIndex] : null;
    const sourceStack  = sourceSpirit.stackCount ?? 1;
    const isFullStack  = quantity === sourceStack;

    // ── Negative singleton enforcement ────────────────────────────────────
    if (targetSpirit && targetSpirit.id === sourceSpirit.id) {
      if (sourceSpirit.isNegative || targetSpirit.isNegative) {
        if (sourceSpirit.isNegative && targetSpirit.isNegative) {
          this._setStatus('Cannot merge negative spirits.');
        } else {
          this._setStatus('Cannot merge negative with regular spirit.');
        }
        return;
      }
    }
    if (sourceSpirit.isNegative && targetSpirit?.isNegative) {
      this._setStatus('Cannot merge negative spirits.');
      return;
    }

    // Negatives are singletons — only move/swap, never unstack
    if (sourceSpirit.isNegative) {
      if (targetSpirit) {
        run.swapSpirits(sourceIndex, targetIndex);
      } else {
        run.moveSpirit(sourceIndex, targetIndex);
      }
      return;
    }

    // ── Regular spirit drop resolution ────────────────────────────────────

    // Same-id regular → merge
    if (targetSpirit &&
        targetSpirit.id === sourceSpirit.id &&
        !targetSpirit.isNegative) {
      targetSpirit.stackCount = (targetSpirit.stackCount ?? 1) + quantity;
      // Transfer elements from source to target
      if (sourceSpirit.elements && targetSpirit.elements) {
        const transferred = sourceSpirit.elements.splice(-quantity, quantity);
        targetSpirit.elements.push(...transferred);
      }
      if (isFullStack) {
        run.removeSpirit(sourceIndex);
      } else {
        sourceSpirit.stackCount = sourceStack - quantity;
      }
      this._setStatus(`Merged ${sourceSpirit.name} \xD7${quantity}`);
      return;
    }

    // Full-stack drag onto different spirit → swap
    if (targetSpirit && isFullStack) {
      run.swapSpirits(sourceIndex, targetIndex);
      return;
    }

    // Partial-stack drag onto different spirit → rejected
    if (targetSpirit && !isFullStack) {
      this._setStatus('Cannot drop partial stack onto a different spirit.');
      return;
    }

    // Full-stack to empty position → move
    if (!targetSpirit && isFullStack) {
      run.moveSpirit(sourceIndex, targetIndex);
      return;
    }

    // Partial-stack to empty position → unstack (split)
    if (!targetSpirit && !isFullStack) {
      const regularCount = all.filter(s => !s.isNegative).length;
      if (regularCount + 1 > run.spiritSlots) {
        this._setStatus('Cannot unstack: spirit slots full.');
        return;
      }
      sourceSpirit.stackCount = sourceStack - quantity;
      // Split elements: newest N move to the new entry
      const splitElements = sourceSpirit.elements
        ? sourceSpirit.elements.splice(-quantity, quantity)
        : undefined;
      const newEntry = {
        id: sourceSpirit.id,
        name: sourceSpirit.name,
        stackCount: quantity,
        isNegative: false,
        state: sourceSpirit.state ? JSON.parse(JSON.stringify(sourceSpirit.state)) : undefined,
      };
      if (splitElements) newEntry.elements = splitElements;
      if (sourceSpirit.rarity) newEntry.rarity = sourceSpirit.rarity;
      if (sourceSpirit.symbiont) newEntry.symbiont = true;
      run.insertSpiritAt(targetIndex, newEntry);
      this._setStatus(`Unstacked ${sourceSpirit.name} \xD7${quantity}`);
      return;
    }
  }

  _cleanupSpiritDrag() {
    if (this._spiritDragMoveHandler) {
      this.input.off('pointermove', this._spiritDragMoveHandler);
      this._spiritDragMoveHandler = null;
    }
    this._clearObjs(this._dragPreviewObjs);
    this._dragPreviewGfx = null;
    this._dragPreviewLabel = null;
    this._spiritDragInProgress = null;
    this._suppressSpiritTooltips = false;
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

  // ── Capture fan (right panel) ─────────────────────────────────────────────
  // Four horizontal rows — one per card type — plus compact pile stacks below.

  _renderCaptureFan() {
    const capturedCards = this._round.capture.getAll();
    const discards      = this._round.allDiscards;
    const spentIds      = this._round.spentCardIds;

    const TYPE_ORDER   = ['bright', 'animal', 'ribbon', 'plain'];
    const TYPE_SYMBOLS = { bright: '★', animal: '♦', ribbon: '║', plain: '□' };
    const TYPE_COLORS  = { bright: '#ffee88', animal: '#88ccff', ribbon: '#ff8888', plain: '#aaaaaa' };
    const YAKU_KEY     = { bright: 'hikari', animal: 'tane', ribbon: 'tanzaku', plain: 'kasu' };
    const thresholds   = this._round._getCaptureThresholds();

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

      // Type symbol + threshold label.
      const thKey = YAKU_KEY[type];
      const th = thresholds[thKey] ?? '?';
      this._captureObjs.push(
        this.add.text(1046, fanY + CAPTURE_CARD_H / 2, `${TYPE_SYMBOLS[type]}(${th})`, {
          fontSize: '11px', color: TYPE_COLORS[type],
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
        const img   = this.add.image(imgX, fanY, _tex(card)).setScale(CAPTURE_SCALE).setOrigin(0, 0);
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

        // Stamp dot — top-left corner of card.
        if (card.ribbonStamp) {
          const sDef = getStampDef(card.ribbonStamp);
          const sDot = this.add.circle(imgX + 4, fanY + 4, 3, sDef?.hexColor ?? 0xffffff).setDepth(5);
          this._captureObjs.push(sDot);
        }

        // Edition dot — bottom-left corner of card.
        if (card.edition) {
          const edColors = { gold: 0xffcc33, crystal: 0x88ddff, ghost: 0xccaaee };
          const edDot = this.add.circle(imgX + 4, fanY + CAPTURE_CARD_H - 4, 3, edColors[card.edition] ?? 0xffffff).setDepth(5);
          this._captureObjs.push(edDot);
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
      const capSpr = this.add.image(BANKED_X, BANKED_Y, _tex(capTop))
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
      const dSpr = this.add.image(DISCARD_X, DISCARD_Y, _tex(dTop))
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
    this._collapseConsumable();

    const consumables = run.consumables;
    const negatives   = run.negativeConsumables;
    const idle        = this._round.phase === 'idle' && !this._animating
                          && !this._yakuGuideOpen && !this._captureOverlayOpen
                          && !this._cardTargetMode;

    // Unified fan: each regular + each negative gets its own card.
    const allCons = [
      ...consumables.map(c => ({ cons: c, isNeg: false })),
      ...negatives.map(c  => ({ cons: c, isNeg: true })),
    ];

    // ── Rotated "CONSUMABLES X/Y" label ─────────────────────────────────
    this._consumableObjs.push(
      this.add.text(CONS_FAN_LEFT - 10, CONS_BASE_Y,
        `CONSUMABLES ${consumables.length}/${run.maxConsumableSlots}`, {
          fontSize: '10px', color: '#556677',
        }).setOrigin(0.5, 0.5).setRotation(-Math.PI / 2).setDepth(1)
    );

    this._consFanPositions = null;

    if (allCons.length > 0) {
      const positions = computeFanPositions(
        allCons.length, CONS_FAN_W, CONS_CARD_W, CONS_IDEAL_GAP
      );
      this._consFanPositions = positions;

      for (let di = 0; di < allCons.length; di++) {
        const { cons, isNeg } = allCons[di];
        const selected  = this._selectedConsumableIndex === di;
        const x         = CONS_FAN_LEFT + positions[di];
        const y         = CONS_BASE_Y - (selected ? 15 : 0);
        const depth     = selected ? 10 : di + 1;

        const rarityCol = RARITY_COLOR[cons.rarity] ?? RARITY_COLOR.common;
        const borderCol = isNeg ? 0xaa44cc : (selected ? rarityCol : 0x2a3a50);

        // Card background.
        const card = this._addRoundedRect(x, y, CONS_CARD_W, CONS_CARD_H, 6,
          isNeg ? 0x1a0d2a : 0x0d1b2a, 1, borderCol, 2)
          .setDepth(depth);
        this._consumableObjs.push(card);

        // Rarity left-border strip.
        this._consumableObjs.push(
          this.add.rectangle(x - CONS_CARD_W / 2 + 2, y, 4, CONS_CARD_H - 4,
            isNeg ? 0xaa44cc : rarityCol)
            .setDepth(depth)
        );

        // Name label.
        this._consumableObjs.push(
          this.add.text(x, y, cons.name, {
            fontSize: '11px', color: isNeg ? '#ddaaff' : '#cce0ff',
          }).setOrigin(0.5).setDepth(depth + 0.1)
        );

        // Negative badge.
        if (isNeg) {
          this._consumableObjs.push(
            this.add.text(x + CONS_CARD_W / 2 - 3, y - CONS_CARD_H / 2 + 3, '\u2205', {
              fontSize: '9px', color: '#5588aa',
            }).setOrigin(1, 0).setDepth(depth + 0.3)
          );
        }

        // Hover tooltip.
        const tooltip = this.add.text(
          x + CONS_CARD_W / 2 + 8, y, cons.description ?? cons.id,
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
          card.on('pointerover', () => {
            if (!this._expandedConsumable) tooltip.setVisible(true);
          });
          card.on('pointerout', () => tooltip.setVisible(false));

          // Click/drag detection — click expands, drag reorders.
          const _di = di;
          const _isNeg = isNeg;
          card.on('pointerdown', (pointer) => {
            tooltip.setVisible(false);
            const startX = pointer.x;
            const startY = pointer.y;
            let moved = false;

            const moveH = (p) => {
              if (Math.sqrt((p.x - startX) ** 2 + (p.y - startY) ** 2) > 8) {
                moved = true;
                this.input.off('pointermove', moveH);
                this._collapseConsumable();
                this._initiateConsumableDrag(cons, _di, _isNeg, p);
              }
            };
            this.input.on('pointermove', moveH);

            this.input.once('pointerup', () => {
              this.input.off('pointermove', moveH);
              if (!moved) {
                this._expandConsumableCard(cons, _di, _isNeg);
              }
            });
          });
        }
      }
    }

    // Store display list for activation routing.
    this._consDisplayList = allCons.map((entry, i) => ({
      cons: entry.cons,
      regIndex: entry.isNeg ? -1 : i,
      isNegOnly: entry.isNeg,
    }));
  }

  // ── Captured-cards overlay ─────────────────────────────────────────────────

  _showCaptureOverlay() {
    if (this._captureOverlayOpen) return;
    if (this._yakuGuideOpen) this._closeYakuGuide();
    if (this._discardOverlayOpen) this._closeDiscardOverlay();
    if (this._deckOverlayOpen) this._closeDeckOverlay();
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
            const img = this.add.image(startX + j * (OV_W + OV_GAP), Math.round(y + OV_H / 2), _tex(rowCards[j]))
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
  _showZodiacTargetPicker(cons, targetType) {
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
          run.consumeById(cons.id);
          this._setStatus(result.message ?? `Used ${cons.name}.`);
          this._renderAll();
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
          run.consumeById(cons.id);
          this._setStatus(result.message ?? `Used ${cons.name}.`);
          this._renderAll();
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

  // ── Consumable expansion ──────────────────────────────────────────────────

  _expandConsumableCard(cons, displayIndex, isNeg) {
    if (this._expandedConsumable && this._expandedConsumable.displayIndex === displayIndex) {
      this._collapseConsumable();
      return;
    }
    this._collapseConsumable();

    const positions = this._consFanPositions;
    if (!positions || displayIndex >= positions.length) return;

    const sourceX = CONS_FAN_LEFT + positions[displayIndex];
    const baseY   = CONS_BASE_Y + CONS_CARD_H / 2 + 6;
    const cardY   = baseY + CONS_CARD_H / 2;
    const depth   = 90;

    this._expandedConsumable = { displayIndex, cons, isNeg, objs: [] };
    const push = obj => { this._expandedConsumable.objs.push(obj); return obj; };

    // Blocker
    push(this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.15)
      .setDepth(89).setInteractive());
    this._expandedConsumable.objs[0].on('pointerdown', () => this._collapseConsumable());

    // Expanded card background
    const borderCol = isNeg ? 0xaa44cc : 0x4a6a8a;
    push(this._addRoundedRect(sourceX, cardY, CONS_CARD_W * 1.3, CONS_CARD_H * 1.1, 6,
      isNeg ? 0x1a0d2a : 0x0d1b2a, 1, borderCol, 2).setDepth(depth));

    // Name
    push(this.add.text(sourceX, cardY - 22, cons.name, {
      fontSize: '11px', color: isNeg ? '#ddaaff' : '#cce0ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth + 0.1));

    // Description
    push(this.add.text(sourceX, cardY - 4, cons.description ?? '', {
      fontSize: '8px', color: '#aabbcc',
      wordWrap: { width: CONS_CARD_W * 1.2 }, align: 'center',
      maxLines: 3,
    }).setOrigin(0.5).setDepth(depth + 0.1));

    // Use button
    const useBtn = push(this.add.text(sourceX - 22, cardY + 26, 'Use', {
      fontSize: '11px', color: '#88ff88', fontStyle: 'bold',
      backgroundColor: '#1a3010', padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setDepth(depth + 0.2)
      .setInteractive({ useHandCursor: true }));

    useBtn.on('pointerdown', (pointer, lx, ly, event) => {
      event.stopPropagation();
      this._collapseConsumable();
      // Route through the existing selection + action button flow
      this._selectedConsumableIndex = displayIndex;
      this._selectedCardIds.clear();
      this._clearObjs(this._handObjs);
      this._clearObjs(this._consumableObjs);
      this._clearObjs(this._actionBtnObjs);
      this._renderHand();
      this._renderConsumables();
      this._renderActionButtons();
    });

    // Sell button (regular consumables only, if zodiac/sellable)
    if (!isNeg) {
      const sellBtn = push(this.add.text(sourceX + 22, cardY + 26, 'Sell', {
        fontSize: '11px', color: '#ffaa44', fontStyle: 'bold',
        backgroundColor: '#3a2010', padding: { x: 5, y: 2 },
      }).setOrigin(0.5).setDepth(depth + 0.2)
        .setInteractive({ useHandCursor: true }));

      sellBtn.on('pointerdown', (pointer, lx, ly, event) => {
        event.stopPropagation();
        this._collapseConsumable();
        const sr = run.sellConsumable(displayIndex);
        if (sr.success) {
          this._setStatus(`Sold ${cons.name}. +${sr.kiReturned} ki.`);
        }
        this._selectedConsumableIndex = null;
        this._clearObjs(this._consumableObjs);
        this._clearObjs(this._actionBtnObjs);
        this._renderConsumables();
        this._renderActionButtons();
        this._renderSpiritColumn();
        this._updateInfoTexts();
      });
    }
  }

  _collapseConsumable() {
    if (!this._expandedConsumable) return;
    for (const obj of this._expandedConsumable.objs) obj.destroy();
    this._expandedConsumable = null;
  }

  // ── Consumable drag reorder ───────────────────────────────────────────────

  _initiateConsumableDrag(cons, sourceIndex, isNeg, pointer) {
    this._consDragInProgress = { cons, sourceIndex, isNeg };

    // Create drag preview
    const gfx = this.add.graphics();
    gfx.fillStyle(isNeg ? 0x1a0d2a : 0x0d1b2a, 0.8);
    gfx.fillRoundedRect(-CONS_CARD_W / 2, -CONS_CARD_H / 2, CONS_CARD_W, CONS_CARD_H, 6);
    gfx.lineStyle(2, isNeg ? 0xaa44cc : 0x4a6a8a, 1);
    gfx.strokeRoundedRect(-CONS_CARD_W / 2, -CONS_CARD_H / 2, CONS_CARD_W, CONS_CARD_H, 6);
    const ox = pointer.x + CONS_CARD_W / 2 + 4;
    const oy = pointer.y + CONS_CARD_H / 2 + 4;
    gfx.setPosition(ox, oy).setDepth(200);
    this._consDragPreviewGfx = gfx;

    const label = this.add.text(ox, oy, cons.name, {
      fontSize: '9px', color: isNeg ? '#ddaaff' : '#cce0ff', align: 'center',
    }).setOrigin(0.5).setDepth(201);
    this._consDragPreviewLabel = label;

    this._consDragMoveHandler = (p) => {
      const cx = p.x + CONS_CARD_W / 2 + 4;
      const cy = p.y + CONS_CARD_H / 2 + 4;
      if (this._consDragPreviewGfx) this._consDragPreviewGfx.setPosition(cx, cy);
      if (this._consDragPreviewLabel) this._consDragPreviewLabel.setPosition(cx, cy);
    };
    this.input.on('pointermove', this._consDragMoveHandler);
    this.input.once('pointerup', (p) => this._onConsDragEnd(p));
  }

  _onConsDragEnd(pointer) {
    if (!this._consDragInProgress) return;
    const { sourceIndex, isNeg } = this._consDragInProgress;

    // Find target index from pointer position
    const positions = this._consFanPositions;
    let targetIndex = null;
    if (positions) {
      for (let i = 0; i < positions.length; i++) {
        const slotX = CONS_FAN_LEFT + positions[i];
        if (pointer.x >= slotX - CONS_CARD_W / 2 && pointer.x <= slotX + CONS_CARD_W / 2) {
          targetIndex = i;
          break;
        }
      }
    }

    // Cleanup
    if (this._consDragMoveHandler) {
      this.input.off('pointermove', this._consDragMoveHandler);
      this._consDragMoveHandler = null;
    }
    if (this._consDragPreviewGfx) { this._consDragPreviewGfx.destroy(); this._consDragPreviewGfx = null; }
    if (this._consDragPreviewLabel) { this._consDragPreviewLabel.destroy(); this._consDragPreviewLabel = null; }

    if (targetIndex !== null && targetIndex !== sourceIndex) {
      // Swap consumable positions (regulars only for now)
      if (!isNeg) {
        run.swapConsumables(sourceIndex, targetIndex);
      }
    }

    this._consDragInProgress = null;
    this._clearObjs(this._consumableObjs);
    this._renderConsumables();
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

    // ── Multi-target Confirm button (chakra multi-select) ─────────────────
    if (this._cardTargetMode?.step === 'select_multi_targets') {
      const y = 700;
      const sel = this._cardTargetMode.selectedCardIds;
      const confirmBtn = this.add.rectangle(HAND_CX - 70, y, 140, 40, 0x1a4a2a)
        .setStrokeStyle(2, 0x44aa66).setInteractive({ useHandCursor: true }).setDepth(5);
      confirmBtn.on('pointerover', () => confirmBtn.setFillStyle(0x2a6a3a));
      confirmBtn.on('pointerout',  () => confirmBtn.setFillStyle(0x1a4a2a));
      confirmBtn.on('pointerdown', () => {
        confirmBtn.disableInteractive(); // prevent double-fire
        if (sel.length === 0) { this._setStatus('Select at least 1 card.'); return; }
        const cid = this._cardTargetMode.id;
        const cname = this._cardTargetMode.cons?.name ?? cid;
        let result;
        if (cid === 'chakra_root')              result = run.applyChakraRoot?.(sel);
        else if (cid === 'chakra_sacral')       result = run.applyChakraSacral?.(sel);
        else if (cid === 'chakra_solar_plexus') result = run.applyChakraSolarPlexus?.(sel);
        else if (cid === 'chakra_third_eye')    result = run.applyChakraThirdEye?.(sel);
        if (result?.success) {
          // Third Eye deletes cards from run deck; also remove from in-round hand
          if (cid === 'chakra_third_eye') {
            for (const id of sel) this._round.removeCardFromHand(id);
          }
          run.consumeById(cid);
          logger.logConsumableUse(cname, `applied to ${sel.length} card(s)`);
          this._cardTargetMode = null;
          this._setStatus(`${cname}: applied to ${sel.length} card(s).`);
          this._renderAll();
        } else {
          this._setStatus(result?.reason ?? 'Cannot apply.');
        }
      });
      this._actionBtnObjs.push(confirmBtn);
      this._actionBtnObjs.push(
        this.add.text(HAND_CX - 70, y, `Confirm (${sel.length})`, {
          fontSize: '15px', color: '#aaffcc',
        }).setOrigin(0.5).setDepth(5)
      );
      const cancelBtn = this.add.rectangle(HAND_CX + 70, y, 100, 40, 0x3a1a0a)
        .setStrokeStyle(2, 0xaa6622).setInteractive({ useHandCursor: true }).setDepth(5);
      cancelBtn.on('pointerdown', () => {
        this._cardTargetMode = null;
        this._setStatus('Cancelled.');
        this._renderAll();
      });
      this._actionBtnObjs.push(cancelBtn);
      this._actionBtnObjs.push(
        this.add.text(HAND_CX + 70, y, 'Cancel', { fontSize: '15px', color: '#ffaa66' })
          .setOrigin(0.5).setDepth(5)
      );
      return;
    }

    const idle  = this._round.phase === 'idle' && !this._animating
                    && !this._yakuGuideOpen && !this._captureOverlayOpen
                    && !this._cardTargetMode;
    const count = this._selectedCardIds.size;

    // ── Use / Activate button (consumable selected) ────────────────────────
    if (idle && this._selectedConsumableIndex !== null) {
      const entry = this._consDisplayList?.[this._selectedConsumableIndex];
      const cons = entry?.cons;
      if (cons) {
        const y       = 700;
        const isCardTarget = cons.id && (cons.id.startsWith('element_') || cons.id.startsWith('stamp_') || cons.id.startsWith('chakra_'));
        const isAlchemical = cons.category === 'alchemical';
        const btnLabel  = (isCardTarget || isAlchemical) ? `Activate: ${cons.name}` : `Use: ${cons.name}`;

        // Unified layout: Use/Activate on left, Cancel on right.
        const useBtnX = HAND_CX - 60;
        const useBtn = this.add.rectangle(useBtnX, y, 160, 40, 0x1a2a5a)
          .setStrokeStyle(2, 0x4466cc).setInteractive({ useHandCursor: true }).setDepth(5);
        useBtn.on('pointerover',  () => useBtn.setFillStyle(0x2a4a8a));
        useBtn.on('pointerout',   () => useBtn.setFillStyle(0x1a2a5a));
        useBtn.on('pointerdown',  () => {
          if (isCardTarget) {
            this._activateCardTarget(cons, this._selectedConsumableIndex);
            this._selectedConsumableIndex = null;
          } else if (isAlchemical) {
            this._activateAlchemical(cons, this._selectedConsumableIndex);
            this._selectedConsumableIndex = null;
          } else {
            const precheck = this._round.useConsumable(cons, {});
            if (!precheck.success && precheck.needsTarget) {
              this._selectedConsumableIndex = null;
              this._showZodiacTargetPicker(cons, precheck.needsTarget);
            } else {
              this._selectedConsumableIndex = null;
              run.consumeById(cons.id);
              if (precheck.revealedCards) {
                this._showRoosterOverlay(precheck.revealedCards, precheck.message);
              } else {
                this._setStatus(precheck.message ?? `Used ${cons.name}.`);
              }
              this._renderAll();
            }
          }
        });
        this._actionBtnObjs.push(useBtn);
        this._actionBtnObjs.push(
          this.add.text(useBtnX, y, btnLabel, {
            fontSize: '15px', color: '#aaddff',
          }).setOrigin(0.5).setDepth(5)
        );

        // Cancel button — all consumables.
        const cancelBtnX = HAND_CX + 110;
        const cancelBtn = this.add.rectangle(cancelBtnX, y, 100, 40, 0x3a1a1a)
          .setStrokeStyle(2, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(5);
        cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x5a2020));
        cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x3a1a1a));
        cancelBtn.on('pointerdown', () => {
          this._selectedConsumableIndex = null;
          this._selectedCardIds.clear();
          this._setStatus(`Cancelled ${cons.name}.`);
          this._renderAll();
        });
        this._actionBtnObjs.push(cancelBtn);
        this._actionBtnObjs.push(
          this.add.text(cancelBtnX, y, 'Cancel', { fontSize: '15px', color: '#ffcccc' })
            .setOrigin(0.5).setDepth(5)
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

  }

  // ── Alchemical activation (in-round) ─────────────────────────────────────

  _activateAlchemical(cons, idx) {
    const effect = ConsumableEffects.get(cons.id);
    if (!effect) return;

    if (!effect.requiresInput) {
      // No-target alchemicals (Sulfur, Lead) — fire immediately
      const result = effect.execute({ roundManager: this._round, params: {} });
      if (result.success) {
        run.consumeById(cons.id);
        this._setStatus(result.message ?? `Used ${cons.name}.`);
      } else {
        this._setStatus(result.message ?? 'Cannot use this alchemical.');
      }
    } else {
      // Target-requiring alchemicals — show spirit-selection UI
      this._showAlchemicalTargetPicker(cons, effect.inputType);
      return; // UI takes over; don't re-render yet
    }

    this._renderAll();
  }

  _showAlchemicalTargetPicker(cons, inputType) {
    // Reuse the ShrineScene's _activateAlchemical pattern for spirit selection.
    // Show a modal overlay listing eligible spirits from run.spirits.
    const spirits = run.spirits;
    const isPair = inputType === 'spirit_pair' || inputType === 'spirit_pair_tier3';
    const selected = [];

    const cx = 640, cy = 360;
    const W = 700, H = 400;
    const objs = this._overlayObjs;

    objs.push(this.add.rectangle(cx, cy, W, H, 0x040810, 0.97)
      .setStrokeStyle(2, 0x4a6a8a).setDepth(50).setInteractive());
    objs.push(this.add.text(cx, cy - H / 2 + 16, `${cons.name} — Select Spirit${isPair ? 's' : ''}`, {
      fontSize: '16px', color: '#88ddff',
    }).setOrigin(0.5).setDepth(50));

    const perRow = 6;
    const sw = 64, sh = 50, gap = 8;
    const startX = cx - ((Math.min(spirits.length, perRow) - 1) * (sw + gap)) / 2;
    const startY = cy - 40;

    const spiritBtns = [];
    for (let i = 0; i < spirits.length; i++) {
      const s = spirits[i];
      const col = i % perRow, row = Math.floor(i / perRow);
      const bx = startX + col * (sw + gap);
      const by = startY + row * (sh + gap + 12);

      const btn = this.add.rectangle(bx, by, sw, sh, 0x0d1b2a)
        .setStrokeStyle(1, 0x3a6a8a).setInteractive({ useHandCursor: true }).setDepth(51);
      objs.push(btn);
      objs.push(this.add.text(bx, by, s.name, {
        fontSize: '8px', color: '#cce0ff', wordWrap: { width: sw - 4 }, align: 'center',
      }).setOrigin(0.5).setDepth(51));

      btn.on('pointerdown', () => {
        if (selected.includes(i)) return;
        selected.push(i);
        btn.setStrokeStyle(2, 0xffcc44);
        if (!isPair || selected.length >= 2) {
          // Fire the alchemical
          const params = isPair
            ? { spiritIndices: selected }
            : { spiritIndex: selected[0] };
          const effect = ConsumableEffects.get(cons.id);
          const result = effect.execute({ roundManager: this._round, params });
          if (result.success) {
            run.consumeById(cons.id);
            this._setStatus(result.message ?? `Used ${cons.name}.`);
          } else {
            this._setStatus(result.message ?? 'Failed.');
          }
          this._clearObjs(this._overlayObjs);
          this._renderAll();
        }
      });
      spiritBtns.push(btn);
    }

    // Cancel button
    const cancelBtn = this.add.rectangle(cx, cy + H / 2 - 22, 100, 28, 0x3a1a1a)
      .setStrokeStyle(1, 0xff6666).setInteractive({ useHandCursor: true }).setDepth(51);
    cancelBtn.on('pointerdown', () => {
      this._clearObjs(this._overlayObjs);
      this._setStatus('Cancelled.');
      this._renderAll();
    });
    objs.push(cancelBtn);
    objs.push(this.add.text(cx, cy + H / 2 - 22, 'Cancel', {
      fontSize: '11px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(51));
  }

  // ── Card targeting (in-round) ──────────────────────────────────────────────

  /**
   * Enter mark mode for a Three Marks consumable.
   * @param {object} cons  The consumable object from run.consumables.
   * @param {number} idx   Its index in the consumable inventory.
   */
  _activateCardTarget(cons, idx) {
    const isMultiTarget = cons.id?.startsWith('chakra_') && (cons.maxTargets ?? 1) > 1 && cons.id !== 'chakra_crown';

    if (isMultiTarget) {
      this._cardTargetMode = {
        id: cons.id, index: idx,
        step: 'select_multi_targets',
        maxTargets: cons.maxTargets,
        selectedCardIds: [],
        cons,
      };
      this._setStatus(`${cons.name}: select up to ${cons.maxTargets} cards, then Confirm. ESC to cancel.`);
    } else {
      this._cardTargetMode = { id: cons.id, index: idx, step: 'select_source', sourceCard: null, cons };
      const ELEMENT_LABELS = {
        water: `Snow (\xD7${getWaterMult('base', 0)} mult, depreciates)`,
        wood:  'Leaf (slot bypass)',
        fire:  `Ember (wildcard, ${getFireFlatPoints('base')}pts)`,
        earth: `Clay (${(getEarthInterestRate('base') * 100).toFixed(0)}% ki interest)`,
        metal: `Iron (\xD7${getMetalHeldMult('base')} held)`,
      };
      let msg;
      if (cons.id.startsWith('element_')) {
        const element = cons.id.replace('element_', '');
        msg = `${cons.name}: apply ${ELEMENT_LABELS[element] ?? cons.name} to a card. ESC to cancel.`;
      } else if (cons.id.startsWith('stamp_')) {
        msg = `${cons.name}: click a card to stamp it. ESC to cancel.`;
      } else if (cons.id.startsWith('chakra_')) {
        msg = `${cons.name}: ${cons.description ?? 'click a card'}. ESC to cancel.`;
      }
      this._setStatus(msg ?? 'Click a card. ESC to cancel.');
    }
    this._renderAll();
  }

  /**
   * Handle a card click while in mark mode.
   * @param {object} card  The card object that was clicked.
   */
  _onCardTargetSelected(card) {
    if (!this._cardTargetMode) return;
    const { id } = this._cardTargetMode;
    const consName = id;

    // Multi-target accumulation flow (Root, Sacral, Solar Plexus, Third Eye)
    if (this._cardTargetMode.step === 'select_multi_targets') {
      const selected = this._cardTargetMode.selectedCardIds;
      const idx = selected.indexOf(card.id);
      if (idx !== -1) {
        selected.splice(idx, 1); // toggle off
      } else if (selected.length < this._cardTargetMode.maxTargets) {
        selected.push(card.id);
      } else {
        this._setStatus(`Max ${this._cardTargetMode.maxTargets} cards selected.`);
        return;
      }
      this._setStatus(`${this._cardTargetMode.cons?.name ?? id}: ${selected.length}/${this._cardTargetMode.maxTargets} selected. Confirm or pick more.`);
      this._renderAll();
      return;
    }

    if (id.startsWith('element_')) {
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

      run.consumeById(id);
      logger.logConsumableUse(consName, `${result.action} on ${card.id}`);
      this._cardTargetMode = null;
      this._setStatus(ACTION_MSG[result.action] ?? 'Done.');
      this._renderAll();

    } else if (id.startsWith('stamp_')) {
      const result = ConsumableEffects.get(id)?.execute({ params: { cardId: card.id, stampId: id } })
        ?? { success: false };
      if (result.success) {
        run.consumeById(id);
        logger.logConsumableUse(consName, `stamped ${card.id}`);
        this._cardTargetMode = null;
        this._setStatus(`${card.name} stamped!`);
        this._renderAll();
      } else {
        this._setStatus(result.reason ?? 'Cannot stamp this card.');
      }

    } else if (id.startsWith('chakra_')) {
      let result;
      if (id === 'chakra_root')          result = run.applyChakraRoot?.(card.id);
      else if (id === 'chakra_sacral')   result = run.applyChakraSacral?.(card.id);
      else if (id === 'chakra_solar_plexus') result = run.applyChakraSolarPlexus?.(card.id);
      else if (id === 'chakra_heart')    result = run.applyChakraHeart?.(card.id);
      else if (id === 'chakra_throat') {
        result = run.applyChakraThroat?.(card.id);
        if (result?.success && result.newCard) {
          this._round.deck.insertIntoDrawPile(result.newCard);
        }
      }
      else if (id === 'chakra_third_eye') {
        result = run.applyChakraThirdEye?.([card.id]);
        if (result?.success) this._round.removeCardFromHand(card.id);
      } else if (id === 'chakra_crown')    {
        // Crown needs two targets — store source first, then target
        if (!this._cardTargetMode.sourceCard) {
          this._cardTargetMode.sourceCard = card;
          this._setStatus(`Crown: source = ${card.name}. Now click target. ESC to cancel.`);
          this._renderAll();
          return;
        }
        result = run.applyChakraCrown?.(this._cardTargetMode.sourceCard.id, card.id);
      }
      if (result?.success) {
        run.consumeById(id);
        logger.logConsumableUse(consName, `applied to ${card.id}`);
        this._cardTargetMode = null;
        this._setStatus(`${consName}: applied!`);
        this._renderAll();
      } else {
        this._setStatus(result?.reason ?? 'Cannot apply to this card.');
      }
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

    // Multi-play turn: wait for more plays before proceeding to deck phase.
    if (handResult.status === 'awaiting_play') {
      this._animating = false;
      const rem = handResult.playsRemaining;
      this._setStatus(`Play ${rem} more card${rem > 1 ? 's' : ''} this turn.`);
      this._renderAll();
      return;
    }

    // Show field-discard sprites briefly then proceed to deck phase.
    const handDiscardSprs = handResult.discarded.map((card, i) =>
      this.add.image(FLIP_X + 40, FLIP_Y - 60 + i * 20, _tex(card))
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
      const spr = this.add.image(FLIP_X, FLIP_Y, _tex(result.deckCard))
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
      const spr = this.add.image(FLIP_X + 40, FLIP_Y - 60 + i * 20, _tex(result.discarded[i]))
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
    const drawSize = this._round.deck.drawPileSize;

    const hex = run.hexagramId ? getHexagram(run.hexagramId) : null;
    this._hexLineText.setText(hex ? `Hex ${String(hex.number).padStart(2, '0')}` : '');
    this._actRoundText.setText(`Act ${run.act}  R${run.round}/36`);
    this._kiText.setText(`Ki: ${run.ki}`);
    this._thresholdText.setText(`Target: ${run.threshold}`);

    const runScore = this._round.runningScore;
    const thr      = run.threshold;
    this._scoreTotText.setStyle({ color: runScore >= thr ? '#44ff88' : '#ffffff', fontStyle: 'bold' });

    // Interest rate display (scaled by current push depth).
    const depth = this._round.pushDepth;
    const pushMult = getPushMultiplier(depth, 'success');
    const effectiveRate = run.interestRate * pushMult;
    this._interestText.setText(`Interest: ${(effectiveRate * 100).toFixed(0)}%`);

    // Hexagram tooltip update.
    if (hex) {
      this._hexTooltipText.setText(
        `${hex.chineseCharacter} ${hex.chineseName} (${hex.englishName})\n\n${hex.description}`
      );
    } else {
      this._hexTooltipText.setText('');
    }

    this._deckSprite.setVisible(drawSize > 0);
    this._deckCountText.setText(String(drawSize));
  }

  // ── Deck flip preview (deck_flip_revealed hexagram) ─────────────────────

  _renderDeckFlipPreview() {
    this._clearObjs(this._deckPreviewObjs);
    const preview = this._round.nextDeckFlip;
    if (!preview) return;
    const px = DECK_X + CARD_W + 14;
    const py = DECK_Y - 20;
    const bg = this.add.rectangle(px, py - 18, CARD_W + 10, CARD_H + 30, 0x0a1520, 0.92)
      .setStrokeStyle(1, 0x44aacc).setDepth(5);
    const label = this.add.text(px, py - CARD_H / 2 - 16, 'Next:', {
      fontSize: '10px', color: '#66ccee',
    }).setOrigin(0.5).setDepth(5);
    const card = this.add.image(px, py, _tex(preview))
      .setDisplaySize(CARD_W * 0.9, CARD_H * 0.9).setDepth(5);
    this._deckPreviewObjs.push(bg, label, card);
  }

  // ── End screen ────────────────────────────────────────────────────────────

  _showEndScreen(result) {
    this._clearObjs(this._overlayObjs);
    // Clear transient round-state visuals; preserve run-state (spirits, hand, captures, sidebar).
    this._clearObjs(this._fieldObjs);
    this._clearObjs(this._actionBtnObjs);
    const cx = FIELD_CX, cy = 365;

    // Compute threshold and ki reward before any state changes.
    const tr       = run.checkThreshold(result.finalScore);
    const kiResult    = run.calculateKiReward(result);
    const kiEarned    = kiResult.total;
    const kiBreakdown = kiResult.breakdown;

    this._overlayObjs.push(
      this.add.rectangle(cx, cy, 720, 460, 0x080d1a, 0.93).setStrokeStyle(2, 0x3a6080).setDepth(120)
    );

    // ── Title ─────────────────────────────────────────────────────────────
    this._overlayObjs.push(
      this.add.text(cx, cy - 208,
        result.status === 'banked' ? 'Score Banked!' : 'Round Over',
        {
          fontSize: '30px',
          color: result.status === 'banked' ? '#88dd88' : '#e8c96a',
          stroke: '#000000', strokeThickness: 4,
        }
      ).setOrigin(0.5)
    );

    // Act / Round subtitle
    this._overlayObjs.push(
      this.add.text(cx, cy - 180,
        `Act ${run.act}  —  Round ${run.round} of ${RunManager.TOTAL_ROUNDS}`,
        { fontSize: '13px', color: '#6688aa' }
      ).setOrigin(0.5)
    );

    // ── Score breakdown ───────────────────────────────────────────────────
    let y = cy - 162;

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
    // Flow decay (always shown) — uses live effective rate.
    const effectiveDecay = run.getEffectiveFlowDecay();
    const preDecayFlow = effectiveDecay !== 0 ? run.flow / effectiveDecay : run.flow;
    const decayDelta   = (run.flow - preDecayFlow).toFixed(2);
    this._overlayObjs.push(
      this.add.text(cx, y,
        `Flow decay \xD7${effectiveDecay.toFixed(2)} \u2192 \xD7${run.flow.toFixed(2)}  (${decayDelta})`,
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

    let kiLabel = `Ki earned: +${kiEarned}  (base ${kiBreakdown.flat}`;
    if (kiBreakdown.pushFailed && kiBreakdown.cardsInHand > 0) {
      kiLabel += `, hand ki forfeited`;
    } else if (kiBreakdown.handKi > 0) {
      if (kiBreakdown.piggyStacks > 0) {
        kiLabel += ` +${kiBreakdown.handKi} hand (${kiBreakdown.cardsInHand}\xD7${kiBreakdown.piggyMult} piggy)`;
      } else {
        kiLabel += ` +${kiBreakdown.handKi} hand`;
      }
    }
    if (kiBreakdown.earthKi > 0)   kiLabel += ` +${kiBreakdown.earthKi} earth`;
    if (kiBreakdown.interest > 0)  kiLabel += ` +${kiBreakdown.interest} interest`;
    if (kiBreakdown.hookDelta > 0) kiLabel += ` +${kiBreakdown.hookDelta} bonus`;
    if (kiBreakdown.hookDelta < 0) kiLabel += ` ${kiBreakdown.hookDelta} penalty`;
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
    const btnY = cy + 200;

    if (!tr.passed) {
      // ── Run over ──────────────────────────────────────────────────────
      if (kiBreakdown.flat > 0)        run.addKi(kiBreakdown.flat,      'round_end_base');
      if (kiBreakdown.handKi > 0)      run.addKi(kiBreakdown.handKi,    'round_end_hand');
      if (kiBreakdown.earthKi > 0)     run.addKi(kiBreakdown.earthKi,   'round_end_earth');
      if (kiBreakdown.interest > 0)    run.addKi(kiBreakdown.interest,  'round_end_interest');
      if (kiBreakdown.hookDelta > 0)   run.addKi(kiBreakdown.hookDelta, 'round_end_hook_bonus');
      else if (kiBreakdown.hookDelta < 0) run.spendKi(Math.abs(kiBreakdown.hookDelta), 'round_end_hook_penalty');
      run.endRun(false);
      logger.logRunEnd('failed', run.round);
      logger.logRunSummary({
        round: run.round, ki: run.ki,
        spirits: run.spirits,
        deckSize: run.getDeck().length,
        enhancedCards: run.getDeck().filter(c => c.enhancement),
        promotedCards: run.getDeck().filter(c => c.promotionProgress > 0),
      });

      // ── Copy Log button ───────────────────────────────────────────────
      const logBtnText = this.add.text(cx + 200, cy + 160, 'Copy Game Log', {
        fontSize: '11px', color: '#88aacc',
      }).setOrigin(0.5);
      const logBtn = this.add.rectangle(cx + 200, cy + 160, 120, 30, 0x1a3a5a)
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
      btn.on('pointerdown', () => { this.scene.start('MenuScene'); });
      this._overlayObjs.push(btn);
      this._overlayObjs.push(
        this.add.text(cx, btnY, 'Return to Menu', { fontSize: '18px', color: '#ffaaaa' })
          .setOrigin(0.5)
      );

    } else {
      // ── Threshold passed — advance and branch ─────────────────────────
      if (kiBreakdown.flat > 0)        run.addKi(kiBreakdown.flat,      'round_end_base');
      if (kiBreakdown.handKi > 0)      run.addKi(kiBreakdown.handKi,    'round_end_hand');
      if (kiBreakdown.earthKi > 0)     run.addKi(kiBreakdown.earthKi,   'round_end_earth');
      if (kiBreakdown.interest > 0)    run.addKi(kiBreakdown.interest,  'round_end_interest');
      if (kiBreakdown.hookDelta > 0)   run.addKi(kiBreakdown.hookDelta, 'round_end_hook_bonus');
      else if (kiBreakdown.hookDelta < 0) run.spendKi(Math.abs(kiBreakdown.hookDelta), 'round_end_hook_penalty');
      run.advanceRound(result.finalScore);

      if (run.isRunComplete) {
        // ── Victory ─────────────────────────────────────────────────
        run.endRun(true);
        // Track beaten hexagram for unlock progression
        const hexId = run.getHexagram()?.id;
        if (hexId) {
          const beaten = JSON.parse(localStorage.getItem('hanatu_beaten_hexagrams') || '[]');
          if (!beaten.includes(hexId)) {
            beaten.push(hexId);
            localStorage.setItem('hanatu_beaten_hexagrams', JSON.stringify(beaten));
          }
        }
        logger.logRunEnd('victory', run.round);
        logger.logRunSummary({
          round: run.round, ki: run.ki,
          spirits: run.spirits,
          deckSize: run.getDeck().length,
          enhancedCards: run.getDeck().filter(c => c.enhancement),
          promotedCards: run.getDeck().filter(c => c.promotionProgress > 0),
        });

        // ── Copy Log button ───────────────────────────────────────────
        const logBtnTextV = this.add.text(cx + 200, cy + 160, 'Copy Game Log', {
          fontSize: '11px', color: '#88aacc',
        }).setOrigin(0.5);
        const logBtnV = this.add.rectangle(cx + 200, cy + 160, 120, 30, 0x1a3a5a)
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
        btn.on('pointerdown', () => { this.scene.start('MenuScene'); });
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

    // F3.22: ensure all overlay content renders above gameplay UI (spirits at depth 100).
    for (const obj of this._overlayObjs) {
      if (obj && typeof obj.setDepth === 'function' && (obj.depth ?? 0) < 120) {
        obj.setDepth(121);
      }
    }
  }

  _restartRound() {
    this._closeCaptureOverlay();
    this._closeYakuGuide();
    this._clearObjs(this._overlayObjs);
    this._selectedCardIds.clear();
    this._selectedConsumableIndex = null;
    this._cardTargetMode = null;

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
    const _overlayTitle = result.tigerPush ? 'Tiger: Free Push!'
                        : result.yakuDisabled ? 'Bank Score?' : 'Yaku Reached!';
    this._overlayObjs.push(
      this.add.text(cx, cy - 122, _overlayTitle, {
        fontSize: '20px', color: '#e8c96a', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25)
    );
    if (result.yakuDisabled) {
      this._overlayObjs.push(
        this.add.text(cx, cy - 100, 'Yaku are disabled \u2014 bank or keep playing each turn.', {
          fontSize: '11px', color: '#aaccdd', fontStyle: 'italic',
        }).setOrigin(0.5).setDepth(25)
      );
    }

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

    const btnY = cy + 100;

    const curDepth     = this._round.pushDepth;
    const bankMult     = getPushMultiplier(curDepth, 'success');
    const bankMultStr  = bankMult.toFixed(2);
    const bankInt      = `${(run.interestRate * bankMult * 100).toFixed(0)}%`;
    const bankLabel = surplus >= 0
      ? `Bank  \xD7${bankMultStr} flow  ${bankInt} int  (+${surplus})`
      : `Bank  \xD7${bankMultStr} flow  ${bankInt} int  (need ${-surplus})`;
    const bankBtn = this.add.rectangle(cx - 118, btnY, 206, 56, 0x1a6a1a)
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
        fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(25)
    );

    if (result.yakuDisabled) {
      // Yaku disabled (e.g. match_by_rank) — Continue button instead of Push
      const contBtn = this.add.rectangle(cx + 118, btnY, 206, 56, 0x1a4a6a)
        .setStrokeStyle(2, 0x4488aa).setInteractive({ useHandCursor: true }).setDepth(25);
      contBtn.on('pointerover', () => contBtn.setFillStyle(0x2a6a8a));
      contBtn.on('pointerout',  () => contBtn.setFillStyle(0x1a4a6a));
      contBtn.on('pointerdown', () => {
        this._bankPushOpen = false;
        this._round.continuePlay();
        this._clearObjs(this._overlayObjs);
        this._setStatus('Play your next card.');
        this._renderAll();
      });
      this._overlayObjs.push(contBtn);
      const continueLabel = result.yakuDisabled ? 'Keep Playing' : 'Continue Playing';
      this._overlayObjs.push(
        this.add.text(cx + 118, btnY, continueLabel, {
          fontSize: '13px', color: '#ffffff',
        }).setOrigin(0.5).setDepth(25)
      );
    } else {
      const pushCount  = this._round.pushCount;
      const PUSH_DEALS = [4, 2, 1];
      const nextDeal   = PUSH_DEALS[Math.min(pushCount, PUSH_DEALS.length - 1)];
      const nextDepth  = curDepth + 1;
      const winMult    = getPushMultiplier(nextDepth, 'success');
      const failMult   = getPushMultiplier(nextDepth, 'failure');
      const winMultStr  = winMult.toFixed(2);
      const failMultStr = failMult.toFixed(2);
      const winInt     = `${(run.interestRate * winMult * 100).toFixed(0)}%`;
      const failInt    = `${(run.interestRate * failMult * 100).toFixed(0)}%`;
      const pushBtn = this.add.rectangle(cx + 118, btnY, 206, 56, 0x6a1a1a)
        .setStrokeStyle(2, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(25);
      pushBtn.on('pointerover', () => pushBtn.setFillStyle(0x9a2a2a));
      pushBtn.on('pointerout',  () => pushBtn.setFillStyle(0x6a1a1a));
      pushBtn.on('pointerdown', () => {
        this._bankPushOpen = false;
        logger.logBankPushDecision('push', this._round.pushCount);
        this._round.pushOn();
        this._clearObjs(this._overlayObjs);
        this._setStatus(`Pushed! +${nextDeal} cards.  W: \xD7${winMultStr} ${winInt}  F: \xD7${failMultStr} ${failInt}`);
        this._renderAll();
      });
      this._overlayObjs.push(pushBtn);
      this._overlayObjs.push(
        this.add.text(cx + 118, btnY - 10, `Push +${nextDeal}  W:\xD7${winMultStr} / F:\xD7${failMultStr}`, {
          fontSize: '12px', color: '#ffffff',
        }).setOrigin(0.5).setDepth(25)
      );
      this._overlayObjs.push(
        this.add.text(cx + 118, btnY + 10, `Int  W:${winInt} / F:${failInt}`, {
          fontSize: '10px', color: '#88ccaa',
        }).setOrigin(0.5).setDepth(25)
      );
    }
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
        this._pulseSpiritIcon(this._getSpiritFanIndex(event.spirit));
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
      case 'hexagram_card': {
        this._scorePtsText.setText(`Points: ${event.points}`);
        this._scoreMltText.setText(`Mult: ${event.mult.toFixed(1)}`);
        if (event.addPoints > 0) {
          this._showFloatingScore(`+${event.addPoints} pts`, this._scorePtsText.x + 70, this._scorePtsText.y, '#ffcc66');
          this._flashText(this._scorePtsText, '#ffcc66');
          await this._delay(250);
        }
        if (event.addMult > 0) {
          this._showFloatingScore(`+${event.addMult.toFixed(1)} mult`, this._scoreMltText.x + 70, this._scoreMltText.y, '#ffcc66');
          this._flashText(this._scoreMltText, '#ffcc66');
          await this._delay(250);
        }
        if (event.multiplyMult && event.multiplyMult !== 1) {
          this._showFloatingScore(`\xD7${event.multiplyMult.toFixed(1)} mult`, this._scoreMltText.x + 70, this._scoreMltText.y, '#ff8844');
          this._flashText(this._scoreMltText, '#ff8844');
          await this._delay(250);
        }
        break;
      }
      case 'retrigger': {
        this._highlightScoringCard(event.card);
        this._scorePtsText.setText(`Points: ${event.points}`);
        this._scoreMltText.setText(`Mult: ${event.mult.toFixed(1)}`);
        this._showFloatingScore(`\u21BB +${event.cardPts}`, this._scorePtsText.x + 70, this._scorePtsText.y, '#ccaaff');
        this._flashText(this._scorePtsText, '#ccaaff');
        await this._delay(300);
        break;
      }
      case 'capture': {
        this._scorePtsText.setText(`Points: ${event.capturePoints}`);
        this._scoreMltText.setText(`Mult: ${event.mult.toFixed(1)}`);
        this._flashText(this._scoreMltText, '#88ccff');
        await this._delay(200);
        break;
      }
      case 'glory_draw': {
        this._showFloatingScore(
          `Glory: +${event.count} draw${event.count === 1 ? '' : 's'}`,
          this._scoreMltText.x + 70, this._scoreMltText.y + 16, '#ffd766',
        );
        await this._delay(250);
        break;
      }
      case 'field_score': {
        this._scorePtsText.setText(`Points: ${event.capturePoints}`);
        this._scoreMltText.setText(`Mult: ${event.mult.toFixed(1)}`);
        this._scoreFlwText.setText(`Flow: \xD7${event.flow.toFixed(2)}`);
        this._scoreTotText.setText(`Total: ${event.runningTotal}`);
        this._flashText(this._scoreTotText, '#88ddaa');
        await this._delay(400);
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
      if (obj.texture?.key === _tex(card)) {
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
    const idx = this._getSpiritFanIndex(spirit);
    if (idx < 0 || !this._spiritFanPositions || idx >= this._spiritFanPositions.length) return;
    const spiritX = SPIRIT_FAN_LEFT + this._spiritFanPositions[idx];
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
    if (this._deckOverlayOpen)    this._closeDeckOverlay();
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

    const thresholds = this._round._getCaptureThresholds();
    const thresholdKey = { HIKARI: 'hikari', TANE: 'tane', TANZAKU: 'tanzaku', KASU: 'kasu' };
    const rankLabel    = { HIKARI: 'Brights', TANE: 'Animals', TANZAKU: 'Ribbons', KASU: 'Plains' };

    let y = cy - 178;
    for (const [key, yaku] of Object.entries(YAKU_INFO)) {
      const liveThreshold = thresholds[thresholdKey[key]] ?? '?';
      const liveDesc = `${liveThreshold} ${rankLabel[key]}`;
      objs.push(
        this.add.text(cx - 360, y, yaku.name, {
          fontSize: '14px', color: '#ffee88',
        }).setOrigin(0, 0.5).setDepth(20)
      );
      objs.push(
        this.add.text(cx - 165, y, liveDesc, {
          fontSize: '13px', color: '#aabbcc',
        }).setOrigin(0, 0.5).setDepth(20)
      );
      y += 27;
    }

    // Symbol legend
    y += 14;
    objs.push(this.add.rectangle(cx, y, 760, 1, 0x2a3a50).setDepth(20));
    y += 16;
    objs.push(
      this.add.text(cx, y, '\u2605 = Hikari (Bright)   \u2666 = Tane (Animal)   \u2551 = Tanzaku (Ribbon)   \u25A1 = Kasu (Plain)', {
        fontSize: '11px', color: '#88aabb',
      }).setOrigin(0.5, 0.5).setDepth(20)
    );
    y += 18;
    objs.push(
      this.add.text(cx, y, 'Threshold numbers show how many cards needed for a Bank/Push decision.', {
        fontSize: '10px', color: '#667788',
      }).setOrigin(0.5, 0.5).setDepth(20)
    );

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
    if (this._deckOverlayOpen)    this._closeDeckOverlay();
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
            this.add.image(startX + j * (OV_W + OV_GAP), Math.round(y + OV_H / 2), _tex(card))
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

  // ── Deck overlay ───────────────────────────────────────────────────────

  _showDeckOverlay() {
    if (this._deckOverlayOpen) { this._closeDeckOverlay(); return; }
    if (this._captureOverlayOpen) this._closeCaptureOverlay();
    if (this._discardOverlayOpen) this._closeDiscardOverlay();
    if (this._yakuGuideOpen)      this._closeYakuGuide();
    this._deckOverlayOpen = true;

    const allCards = run.getDeck();
    const cx = FIELD_CX, cy = 330;
    const objs = this._deckOverlayObjs;

    // Out-of-play ids: cards in capture or discard pile this round.
    const outOfPlayIds = new Set([
      ...this._round.capture.getAll().map(c => c.id),
      ...this._round.allDiscards.map(c => c.id),
    ]);

    objs.push(
      this.add.rectangle(cx, cy, 800, 500, 0x080d1a, 0.95)
        .setStrokeStyle(2, 0x6080a0).setDepth(20).setInteractive()
    );
    objs.push(
      this.add.text(cx, cy - 228, `Your Deck  (${allCards.length} cards)`, {
        fontSize: '20px', color: '#a0c8e8', stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(20)
    );
    objs.push(this.add.rectangle(cx, cy - 208, 740, 1, 0x6080a0).setDepth(20));

    if (allCards.length === 0) {
      objs.push(
        this.add.text(cx, cy, 'No cards in deck.', { fontSize: '15px', color: '#778899' })
          .setOrigin(0.5).setDepth(20)
      );
    } else {
      const TYPES = ['bright', 'animal', 'ribbon', 'plain'];
      const TYPE_LABELS = { bright: 'Brights', animal: 'Animals', ribbon: 'Ribbons', plain: 'Plains' };
      const byType = { bright: [], animal: [], ribbon: [], plain: [] };
      for (const card of allCards) {
        if (byType[card.type]) byType[card.type].push(card);
      }
      for (const type of TYPES) byType[type].sort((a, b) => a.month - b.month);

      const OV_SCALE = 0.5;
      const OV_W = Math.round(CARD_W * OV_SCALE);
      const OV_H = Math.round(CARD_H * OV_SCALE);
      const OV_GAP = 6;
      const ROW_MAX = 12;
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
          const rowW = rowCards.length * (OV_W + OV_GAP) - OV_GAP;
          const startX = Math.round(cx - rowW / 2 + OV_W / 2);
          for (let j = 0; j < rowCards.length; j++) {
            const card = rowCards[j];
            const img = this.add.image(
              startX + j * (OV_W + OV_GAP),
              Math.round(y + OV_H / 2),
              _tex(card)
            ).setScale(OV_SCALE).setDepth(20);
            if (outOfPlayIds.has(card.id)) {
              img.setTint(0x556677).setAlpha(0.5);
            }
            objs.push(img);
          }
          y += OV_H + OV_GAP + 4;
          rowStart += ROW_MAX;
        }
        y += 8;
      }
    }

    const closeY = cy + 224;
    const closeBtn = this.add.rectangle(cx, closeY, 140, 36, 0x1a3a5a)
      .setStrokeStyle(2, 0x4488aa).setInteractive({ useHandCursor: true }).setDepth(20);
    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x2a5070));
    closeBtn.on('pointerout',  () => closeBtn.setFillStyle(0x1a3a5a));
    closeBtn.on('pointerdown', () => this._closeDeckOverlay());
    objs.push(closeBtn);
    objs.push(
      this.add.text(cx, closeY, 'Close', { fontSize: '15px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(20)
    );
  }

  _closeDeckOverlay() {
    if (!this._deckOverlayOpen) return;
    this._deckOverlayOpen = false;
    this._clearObjs(this._deckOverlayObjs);
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

    // For Water: show current multiplier (hex-aware via getWaterMult).
    if (enh.element === 'water') {
      const mult = getWaterMult(enh.tier, enh.depLevel ?? 0);
      objs.push(this.add.text(x, y + 10, `\xD7${mult}`, {
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
  /** Render a small hexagram symbol (6 bars) from a lines[] array. */
  _renderHexagramSymbol(centerX, topY, lines, color = 0xccddee) {
    const objs = [];
    const W = 20, H = 2, SP = 4, GAP = 6;
    for (let i = 5; i >= 0; i--) {
      const y = topY + (5 - i) * (H + SP);
      if (lines[i] === 1) {
        objs.push(this.add.rectangle(centerX, y, W, H, color));
      } else {
        const hw = (W - GAP) / 2;
        objs.push(this.add.rectangle(centerX - GAP / 2 - hw / 2, y, hw, H, color));
        objs.push(this.add.rectangle(centerX + GAP / 2 + hw / 2, y, hw, H, color));
      }
    }
    return objs;
  }

  /** Edition badge — top-right corner. Gold=circle, Crystal=diamond, Ghost=triangle. */
  _makeEditionBadge(card, cx, cy) {
    if (!card.edition) return null;
    const hw = Math.round(CARD_W * CARD_SCALE / 2);
    const hh = Math.round(CARD_H * CARD_SCALE / 2);
    const bx = cx + hw - 6, by = cy - hh + 6;
    if (card.edition === 'gold')
      return this.add.circle(bx, by, 4, 0xffcc33).setDepth(5).setStrokeStyle(1, 0x000000);
    if (card.edition === 'crystal')
      return this.add.rectangle(bx, by, 7, 7, 0x88ddff).setDepth(5).setStrokeStyle(1, 0x000000).setAngle(45);
    if (card.edition === 'ghost')
      return this.add.triangle(bx, by, 0, -7, -6, 3.5, 6, 3.5, 0xccaaee).setDepth(5).setStrokeStyle(1, 0x000000);
    return null;
  }

  _makeRibbonStampDot(card, cx, cy) {
    if (!card.ribbonStamp) return null;
    const def = getStampDef(card.ribbonStamp);
    const color = def?.hexColor ?? 0xffffff;
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
    const _jackpotPct = (getMeteoriteJackpotChance() * 100).toFixed(0);
    const ENH_DESC_TT = {
      water: {
        base:     `\xD7${getWaterMult('base', 0)} mult (depreciates), feeds Glacier`,
        upgraded: `\xD7${getWaterMult('upgraded', 0)} mult (depreciates), feeds Glacier`,
      },
      fire: {
        base:     `flat ${getFireFlatPoints('base')} pts, counted in all yaku, feeds Carbon`,
        upgraded: `flat ${getFireFlatPoints('upgraded')} pts, counted in all yaku, feeds Carbon`,
      },
      earth: {
        base:     `${(getEarthInterestRate('base') * 100).toFixed(0)}% ki interest per round, feeds Fossil`,
        upgraded: `${(getEarthInterestRate('upgraded') * 100).toFixed(0)}% ki interest per round, feeds Fossil`,
      },
      metal: {
        base:     `held-in-hand \xD7${getMetalHeldMult('base')} mult, ${_jackpotPct}% jackpot +30 ki, feeds Velocity`,
        upgraded: `held-in-hand \xD7${getMetalHeldMult('upgraded')} mult, ${_jackpotPct}% jackpot +30 ki + Velocity boost`,
      },
      wood: {
        base:     'bypasses field slot limit, feeds Moths',
        upgraded: 'anti-strand + slot bypass, feeds Moths',
      },
    };
    const bonus = card.mutations?.bonusPoints ?? 0;
    const ptsLabel = bonus > 0
      ? `${card.points} + ${bonus} = ${getCardPoints(card)}pt`
      : `${card.points}pt`;
    const lines = [card.name, `${card.monthName} · ${card.type} · ${ptsLabel}`];
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
    if (card.edition) {
      const EDITION_DESC = { gold: '+20 base points', crystal: '+5 additive mult', ghost: '\xD71.5 multiplicative mult' };
      const elabel = { gold: 'Gold', crystal: 'Crystal', ghost: 'Ghost' }[card.edition] ?? card.edition;
      lines.push(`\u25C6 ${elabel}: ${EDITION_DESC[card.edition] ?? ''}`);
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

  // ── Options popup ─────────────────────────────────────────────────────────

  _openOptionsPopup() {
    if (this._optionsObjs) return;
    this._optionsObjs = [];

    const cx = 640, cy = 360;

    const overlay = this.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.7)
      .setDepth(200).setInteractive();
    this._optionsObjs.push(overlay);

    const panel = this.add.rectangle(cx, cy, 360, 260, 0x0d1b2a)
      .setStrokeStyle(2, 0x4a6a8a).setDepth(201);
    this._optionsObjs.push(panel);

    this._optionsObjs.push(
      this.add.text(cx, cy - 100, 'Options', {
        fontSize: '20px', color: '#c8d8e8', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(202)
    );

    const closeAll = () => {
      this._optionsObjs.forEach(o => o.destroy());
      this._optionsObjs = null;
    };

    // Copy Playtest Log
    this._optionsObjs.push(...this._makePopupBtn(cx, cy - 40, 'Copy Playtest Log', () => {
      logger.copyToClipboard().then(ok => {
        closeAll();
        this._showToast(ok ? 'Playtest log copied to clipboard' : 'Copy failed — see console');
      });
    }));

    // Return to Main Menu
    this._optionsObjs.push(...this._makePopupBtn(cx, cy + 20, 'Return to Main Menu', () => {
      closeAll();
      this._showForfeitConfirm();
    }));

    // Close
    this._optionsObjs.push(...this._makePopupBtn(cx, cy + 80, 'Close', closeAll));

    overlay.on('pointerdown', closeAll);
  }

  _showForfeitConfirm() {
    const objs = [];
    const cx = 640, cy = 360;

    const overlay = this.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.85)
      .setDepth(210).setInteractive();
    objs.push(overlay);

    objs.push(this.add.rectangle(cx, cy, 420, 200, 0x2a1a1a)
      .setStrokeStyle(2, 0xaa4444).setDepth(211));

    objs.push(this.add.text(cx, cy - 65, 'Forfeit Run?', {
      fontSize: '18px', color: '#ff8888', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(212));

    objs.push(this.add.text(cx, cy - 20, 'This will end your current run.\nProgress will not be saved.', {
      fontSize: '13px', color: '#ddcccc', align: 'center',
    }).setOrigin(0.5).setDepth(212));

    const closeAll = () => objs.forEach(o => o.destroy());

    objs.push(...this._makePopupBtn(cx - 80, cy + 55, 'Cancel', closeAll, 0x1a2a3a, 0x3a5a7a));
    objs.push(...this._makePopupBtn(cx + 80, cy + 55, 'Forfeit', () => {
      closeAll();
      logger.logRunEnd('forfeit', run.round);
      this.scene.start('MenuScene');
    }, 0x3a1a1a, 0xaa4444));
  }

  _makePopupBtn(x, y, label, onClick, bg = 0x1a3050, border = 0x4a6a8a) {
    const btn = this.add.rectangle(x, y, 240, 36, bg)
      .setStrokeStyle(1, border).setDepth(202)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontSize: '14px', color: '#c8d8e8',
    }).setOrigin(0.5).setDepth(203);
    btn.on('pointerover', () => btn.setFillStyle(bg + 0x101010));
    btn.on('pointerout',  () => btn.setFillStyle(bg));
    btn.on('pointerdown', onClick);
    return [btn, txt];
  }

  _showToast(message) {
    const toast = this.add.text(640, 620, message, {
      fontSize: '14px', color: '#ffffff',
      backgroundColor: '#0a0f1e', padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(300);
    this.time.delayedCall(2000, () => toast.destroy());
  }
}
