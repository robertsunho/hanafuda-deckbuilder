// ─────────────────────────────────────────────────────────────────────────────
// ShrineScene — between-round shop
//
// Appears after every round the player passes.  Two variants:
//   isGrove=false  "Wayside Shrine"  — Spirits + 3 placeholder sections
//   isGrove=true   "The Sacred Grove" — same + Spirit Fusion section (functional)
//
// Layout (1280 × 720):
//   Header        [y 0–64]      title, act/round, ki balance
//   Left column   [x 0–640]     Spirits section: offer cards + 6-slot loadout
//   Right column  [x 640–1280]  Placeholder sections + Grove fusion
//   Footer        [y ~668–720]  Continue / Enter the Forest button
//
// The full scene is rebuilt (children.removeAll) after every purchase or fusion
// so all state (ki balance, loadout, button affordability) updates automatically.
// ─────────────────────────────────────────────────────────────────────────────

import run, { RunManager }                      from '../systems/RunManager.js';
import { SPIRIT_CATALOG, getSpiritDef }         from '../data/spirits.js';
import { getAvailableFusions }                  from '../data/fusionRecipes.js';
import { FOUR_PRACTICES, THREE_MARKS,
         WUXING_CONSUMABLES, getElementDef }    from '../data/consumables.js';
import { RIBBON_STAMPS, getRibbonStampDef }    from '../data/ribbonStamps.js';
import { ZODIAC_CONSUMABLES }                  from '../data/zodiacConsumables.js';
import { generateShopCards }                   from '../data/shopCards.js';
import logger                                   from '../systems/GameplayLogger.js';

// ── Channel badge display ──────────────────────────────────────────────────────
const CHANNEL_BADGE = {
  point:          { label: 'POINT',    bgColor: 0x1a3a88, textColor: '#88aaff' },
  additive:       { label: 'MULT+',    bgColor: 0x7a5500, textColor: '#ffdd44' },
  multiplicative: { label: 'MULT\xD7', bgColor: 0x882222, textColor: '#ff8888' },
  both:           { label: 'PT+MULT',  bgColor: 0x3a4a00, textColor: '#ccee55' },
  rank:           { label: 'RANK',     bgColor: 0x4a3a00, textColor: '#ddcc55' },
  utility:        { label: 'UTILITY',  bgColor: 0x2a2a55, textColor: '#9999ff' },
  economy:        { label: 'ECONOMY',  bgColor: 0x1a4422, textColor: '#55cc77' },
  gameplay:       { label: 'GAMEPLAY', bgColor: 0x441a44, textColor: '#cc77cc' },
  symbiont:       { label: 'SYMBIONT', bgColor: 0x1a2a00, textColor: '#99ee44' },
};

// ── Layout constants ──────────────────────────────────────────────────────────
const HEADER_H   = 64;
const LCX        = 320;
const RCX        = 960;
const DIV_X      = 640;

const CARD_W     = 158;
const CARD_H     = 204;
const CARD_GAP   = 14;
const CARD_ROW_Y = 278;

const BTN_Y      = 690;

// ─────────────────────────────────────────────────────────────────────────────

export class ShrineScene extends Phaser.Scene {

  constructor() {
    super({ key: 'ShrineScene' });
  }

  create() {
    const { isGrove } = this.scene.settings.data || {};
    this._isGrove       = isGrove ?? false;
    this._offering      = this._generateOffering();
    this._purchased     = new Array(this._offering.length).fill(false);
    this._zodiacOffering = this._generateZodiacOffering();
    this._cardOffers     = generateShopCards(this._isGrove ? 4 : 3, this._isGrove);
    this._confirmObjs   = [];
    this._buildUI();
  }

  // ── Offer generation ─────────────────────────────────────────────────────

  /**
   * Filter to tier-1 foundation spirits only (fusion spirits are never sold),
   * exclude spirits already owned, then pick up to 3 at random.
   */
  _generateOffering() {
    const ownedIds = new Set(run.spirits.map(s => s.id));
    const pool     = SPIRIT_CATALOG.filter(
      s => s.tier === 1 && !ownedIds.has(s.id)
    );
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  }

  /** Pick 3 random zodiac consumables to offer in the shop this visit. */
  _generateZodiacOffering() {
    return [...ZODIAC_CONSUMABLES].sort(() => Math.random() - 0.5).slice(0, 3);
  }

  // ── UI construction ──────────────────────────────────────────────────────

  _buildUI() {
    this.children.removeAll(true);
    this._confirmObjs = [];
    logger.logShopEnter(run.ki, this._isGrove);
    this._drawBg();
    this._drawHeader();
    this._drawSpiritsSection();
    this._drawCardShopSection();
    this._drawRightColumn();
    this._drawContinueButton();
  }

  _drawBg() {
    this.add.rectangle(640, 360, 1280, 720, 0x060c18);
    this.add.rectangle(DIV_X, 360, 1, 720, 0x1e2d40);
  }

  // ── Header ────────────────────────────────────────────────────────────────

  _drawHeader() {
    this.add.rectangle(640, HEADER_H / 2, 1280, HEADER_H, 0x0a1628);
    this.add.rectangle(640, HEADER_H,     1280, 1,         0x2a3a50);

    const title      = this._isGrove ? 'The Sacred Grove' : 'Wayside Shrine';
    const titleColor = this._isGrove ? '#ffcc44' : '#e8c96a';
    this.add.text(640, HEADER_H / 2, title, {
      fontSize: '24px', color: titleColor,
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(16, HEADER_H / 2,
      `Act ${run.act}  —  Round ${run.round}`,
      { fontSize: '14px', color: '#556677' }
    ).setOrigin(0, 0.5);

    this.add.text(1264, HEADER_H / 2,
      `Ki: ${run.ki}`,
      { fontSize: '17px', color: '#ffee88', stroke: '#000000', strokeThickness: 2 }
    ).setOrigin(1, 0.5);
  }

  // ── Left column: Spirits section ─────────────────────────────────────────

  _drawSpiritsSection() {
    const cx = LCX;

    this.add.text(cx, HEADER_H + 10, 'Spirits', {
      fontSize: '18px', color: '#aaccee',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 0);
    this.add.text(cx, HEADER_H + 32, 'Choose companions for your journey', {
      fontSize: '11px', color: '#445566',
    }).setOrigin(0.5, 0);
    if (!run.canAddSpirit) {
      this.add.text(cx, HEADER_H + 50, 'Spirit slots full', {
        fontSize: '11px', color: '#cc4444',
      }).setOrigin(0.5, 0);
    }

    // Offer cards.
    if (this._offering.length === 0) {
      this.add.text(cx, CARD_ROW_Y, 'No spirits available.', {
        fontSize: '14px', color: '#445566',
      }).setOrigin(0.5);
    } else {
      const n       = this._offering.length;
      const totalW  = n * CARD_W + (n - 1) * CARD_GAP;
      const startCX = cx - totalW / 2 + CARD_W / 2;
      for (let i = 0; i < n; i++) {
        this._drawSpiritCard(startCX + i * (CARD_W + CARD_GAP), CARD_ROW_Y, this._offering[i], i);
      }
    }

    // Divider above equipped spirits.
    const divY = CARD_ROW_Y + CARD_H / 2 + 22;
    this.add.rectangle(cx, divY, 580, 1, 0x1e2d40);
    this.add.text(cx, divY + 7,
      `Equipped Spirits  (${run.spirits.length} / ${RunManager.MAX_SPIRIT_SLOTS})`,
      { fontSize: '11px', color: '#445566' }
    ).setOrigin(0.5, 0);

    // 6 loadout slots displayed as two rows of 3.
    this._drawLoadoutSlots(cx, divY + 44);
  }

  _drawLoadoutSlots(cx, topCY) {
    const slotW   = 86;
    const slotH   = 50;
    const slotGap = 8;
    const perRow  = 3;
    const rowH    = slotH + 8;
    const rowW    = perRow * slotW + (perRow - 1) * slotGap;
    const rowX    = cx - rowW / 2 + slotW / 2;
    const owned   = run.spirits;

    for (let i = 0; i < RunManager.MAX_SPIRIT_SLOTS; i++) {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      this._drawLoadoutSlot(
        rowX + col * (slotW + slotGap),
        topCY + row * rowH,
        owned[i] ?? null,
        slotW, slotH, i,
      );
    }
  }

  _drawSpiritCard(cx, cy, spiritDef, index) {
    const purchased = this._purchased[index];
    const effectiveCost = this._price(spiritDef.cost);
    const canAfford = run.ki >= effectiveCost;
    const hasSlot   = run.canAddSpirit;
    const buyable   = !purchased && canAfford && hasSlot;
    const alpha     = purchased ? 0.5 : 1.0;

    const top = cy - CARD_H / 2;
    const bot = cy + CARD_H / 2;

    this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x0f1e30)
      .setStrokeStyle(2, 0x2a4a6a)
      .setAlpha(alpha);

    this.add.text(cx, top + 10, spiritDef.name, {
      fontSize: '13px', color: '#e8e8e8',
      wordWrap: { width: CARD_W - 14 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(alpha);

    const badge = CHANNEL_BADGE[spiritDef.channel]
                  ?? { label: spiritDef.channel.toUpperCase(), bgColor: 0x333333, textColor: '#888888' };
    this.add.rectangle(cx, top + 40, 66, 17, badge.bgColor, 0.9).setAlpha(alpha);
    this.add.text(cx, top + 40, badge.label, {
      fontSize: '9px', color: badge.textColor, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(alpha);

    this.add.text(cx, top + 56, spiritDef.description, {
      fontSize: '10px', color: '#8aadbb',
      wordWrap: { width: CARD_W - 14 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(alpha);

    if (purchased) {
      this.add.rectangle(cx, cy, CARD_W - 4, CARD_H - 4, 0x000000, 0.35);
      this.add.text(cx, cy, 'Purchased', {
        fontSize: '14px', color: '#667788',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);
      return;
    }

    const costColor = canAfford ? '#ffee88' : '#cc6644';
    const costLabel = effectiveCost < spiritDef.cost
      ? `${effectiveCost} ki (was ${spiritDef.cost})`
      : `${spiritDef.cost} ki`;
    this.add.text(cx, bot - 50, costLabel, {
      fontSize: '13px', color: costColor,
    }).setOrigin(0.5, 0).setAlpha(alpha);

    const btnBg     = buyable ? 0x1a5a2a : 0x141e14;
    const btnBorder = buyable ? 0x44aa66 : 0x2a362a;
    const btnLabel  = !hasSlot ? 'Slots full' : !canAfford ? "Can't afford" : 'Buy';
    const btnTextC  = buyable  ? '#aaffcc' : '#445566';

    const btn = this.add.rectangle(cx, bot - 24, CARD_W - 18, 26, btnBg)
      .setStrokeStyle(1, btnBorder);
    this.add.text(cx, bot - 24, btnLabel, {
      fontSize: '12px', color: btnTextC,
    }).setOrigin(0.5);

    if (buyable) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setFillStyle(0x2a7a3a));
      btn.on('pointerout',  () => btn.setFillStyle(btnBg));
      btn.on('pointerdown', () => this._buySpirit(index));
    }
  }

  _drawLoadoutSlot(cx, cy, spirit, w, h, spiritIndex = -1) {
    const borderColor = spirit ? 0x3a6080 : 0x1e2d40;
    this.add.rectangle(cx, cy, w, h, 0x0a1220).setStrokeStyle(1, borderColor);
    if (spirit) {
      this.add.text(cx, cy - 7, spirit.name, {
        fontSize: '9px', color: '#ccdde8',
        wordWrap: { width: w - 8 }, align: 'center',
      }).setOrigin(0.5);
      const def   = getSpiritDef(spirit.id);
      const ch    = def?.channel ?? 'point';
      const badge = CHANNEL_BADGE[ch] ?? CHANNEL_BADGE.point;
      this.add.rectangle(cx, cy + 14, w - 16, 11, badge.bgColor, 0.85);
      this.add.text(cx, cy + 14, badge.label, {
        fontSize: '7px', color: badge.textColor, fontStyle: 'bold',
      }).setOrigin(0.5);
      // Release "×" button in top-right corner of slot
      const rel = this.add.text(cx + w / 2 - 7, cy - h / 2 + 7, '\u00D7', {
        fontSize: '11px', color: '#774444',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      rel.on('pointerover', () => rel.setColor('#ff6666'));
      rel.on('pointerout',  () => rel.setColor('#774444'));
      rel.on('pointerdown', () => this._confirmRelease(spiritIndex, spirit));
    } else {
      this.add.text(cx, cy, '\u2014', { fontSize: '14px', color: '#1e2d40' }).setOrigin(0.5);
    }
  }

  _confirmRelease(index, spirit) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const cx = 640, cy = 360;
    const push = obj => { this._confirmObjs.push(obj); return obj; };

    push(this.add.rectangle(cx, cy, 400, 150, 0x0a0f1e, 0.97)
      .setStrokeStyle(2, 0xaa4444).setDepth(50));
    push(this.add.text(cx, cy - 44, `Release ${spirit.name}?`, {
      fontSize: '16px', color: '#ff8888',
    }).setOrigin(0.5).setDepth(50));
    push(this.add.text(cx, cy - 22, 'No ki refund. This cannot be undone.', {
      fontSize: '11px', color: '#887777',
    }).setOrigin(0.5).setDepth(50));

    const yesBtn = push(this.add.rectangle(cx - 60, cy + 20, 90, 30, 0x6a1a1a)
      .setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(50));
    yesBtn.on('pointerover', () => yesBtn.setFillStyle(0x8a2a2a));
    yesBtn.on('pointerout',  () => yesBtn.setFillStyle(0x6a1a1a));
    yesBtn.on('pointerdown', () => {
      run.releaseSpirit(index);
      logger.logShopPurchase('release', spirit.name, 0, 'Spirit released');
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._offering  = this._generateOffering();
      this._purchased = new Array(this._offering.length).fill(false);
      this._buildUI();
    });
    push(this.add.text(cx - 60, cy + 20, 'Release', {
      fontSize: '12px', color: '#ff8888',
    }).setOrigin(0.5).setDepth(50));

    const noBtn = push(this.add.rectangle(cx + 60, cy + 20, 90, 30, 0x1a1a2a)
      .setStrokeStyle(1, 0x445566).setInteractive({ useHandCursor: true }).setDepth(50));
    noBtn.on('pointerover', () => noBtn.setFillStyle(0x2a2a4a));
    noBtn.on('pointerout',  () => noBtn.setFillStyle(0x1a1a2a));
    noBtn.on('pointerdown', () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
    });
    push(this.add.text(cx + 60, cy + 20, 'Cancel', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(50));
  }

  // ── Right column ──────────────────────────────────────────────────────────

  _drawRightColumn() {
    let topY = HEADER_H + 6;

    // Fixed-height sections
    this._drawConsumablesSection(RCX, topY, 200);
    topY += 200;
    this._drawZodiacSection(RCX, topY, 130);
    topY += 130;
    this._drawWuXingForgeSection(RCX, topY, 80);
    topY += 80;
    this._drawRibbonStampsSection(RCX, topY, 40);
    topY += 40;

    if (this._isGrove) {
      const remaining = BTN_Y - 38 - topY;
      this._drawFusionSection(RCX, topY, remaining);
    }
  }

  // ── Four Practices section ────────────────────────────────────────────────

  _drawConsumablesSection(cx, topY, height) {
    this.add.text(cx, topY + 4, 'Four Practices', {
      fontSize: '15px', color: '#88ccee',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 22, 'Permanent deck modifications — instant use, no inventory', {
      fontSize: '10px', color: '#334455',
    }).setOrigin(0.5, 0);

    const tileW   = 138;
    const tileH   = height - 40;
    const tileGap = 6;
    const totalW  = FOUR_PRACTICES.length * tileW + (FOUR_PRACTICES.length - 1) * tileGap;
    const startX  = cx - totalW / 2 + tileW / 2;
    const tileY   = topY + 38 + tileH / 2;

    const PRACTICE_COLORS = {
      practice_path:    '#88eebb',
      practice_fasting: '#ddbb88',
      practice_mind:    '#bb88ee',
      practice_tree:    '#88ddbb',
    };

    for (let i = 0; i < FOUR_PRACTICES.length; i++) {
      const def    = FOUR_PRACTICES[i];
      const x      = startX + i * (tileW + tileGap);
      const pCost  = this._price(def.cost);
      const afford = run.ki >= pCost;
      const color  = PRACTICE_COLORS[def.id] ?? '#88ccee';

      this.add.rectangle(x, tileY, tileW, tileH, afford ? 0x0a1a1e : 0x080e12)
        .setStrokeStyle(1, afford ? 0x224433 : 0x111a22);

      this.add.text(x, tileY - tileH / 2 + 7, def.name, {
        fontSize: '13px', color, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      this.add.text(x, tileY - tileH / 2 + 23, def.description, {
        fontSize: '9px', color: '#445566',
        wordWrap: { width: tileW - 12 }, align: 'center',
      }).setOrigin(0.5, 0);

      const btnY2  = tileY + tileH / 2 - 14;
      const btnLbl = !afford ? `Need ${pCost} ki` : `Use  ${pCost} ki`;
      const btnTxt = afford ? color : '#334455';
      const btn    = this.add.rectangle(x, btnY2, tileW - 12, 22, afford ? 0x112222 : 0x080e0e)
        .setStrokeStyle(1, afford ? 0x336655 : 0x1a2233);
      this.add.text(x, btnY2, btnLbl, { fontSize: '11px', color: btnTxt }).setOrigin(0.5);

      if (afford) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x1a3333));
        btn.on('pointerout',  () => btn.setFillStyle(0x112222));
        btn.on('pointerdown', () => {
          run.spendKi(pCost);
          logger.logShopPurchase('practice', def.name, pCost);
          this._showPracticeOverlay(def);
        });
      }
    }
  }

  // ── Four Practices overlays ───────────────────────────────────────────────

  _showPracticeOverlay(def) {
    if (def.id === 'practice_path')    { this._showPathOverlay(def);    return; }
    if (def.id === 'practice_fasting') { this._showFastingOverlay(def); return; }
    if (def.id === 'practice_mind')    { this._showMindOverlay(def);    return; }
    if (def.id === 'practice_tree')    { this._showTreeOverlay(def);    return; }
  }

  /**
   * Shared card-grid overlay builder for Four Practices.
   * Renders a modal with all deck cards in a grid, selection state, and action/cancel buttons.
   */
  _buildPracticeGrid({ title, instruction, cards, selectedIds, disabledFn, onSelect, actionLabel, onAction, onCancel }) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];
    const push = obj => { this._confirmObjs.push(obj); return obj; };

    const cx = 640, cy = 356, W = 920, H = 556;
    const SCALE = 0.50;
    const CW    = Math.round(64 * SCALE);    // 32
    const CH    = Math.round(104 * SCALE);   // 52
    const COLS  = 8, GAP = 6, ROWH = CH + 22;

    push(this.add.rectangle(cx, cy, W, H, 0x040810, 0.97)
      .setStrokeStyle(2, 0x2a5a88).setDepth(50));
    push(this.add.text(cx, cy - H / 2 + 16, title, {
      fontSize: '16px', color: '#88ddff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50));
    push(this.add.text(cx, cy - H / 2 + 36, instruction, {
      fontSize: '11px', color: '#557799', wordWrap: { width: W - 40 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(50));

    const gridW      = COLS * CW + (COLS - 1) * GAP;
    const gridStartX = cx - gridW / 2 + CW / 2;
    const gridStartY = cy - H / 2 + 58;
    const noDisabled = disabledFn ?? (() => false);

    for (let i = 0; i < cards.length; i++) {
      const card     = cards[i];
      const col      = i % COLS;
      const row      = Math.floor(i / COLS);
      const x        = gridStartX + col * (CW + GAP);
      const y        = gridStartY + row * ROWH + CH / 2;
      const disabled = noDisabled(card);
      const selected = selectedIds ? selectedIds.has(card.id) : false;

      const spr = push(this.add.image(x, y, card.id).setScale(SCALE).setDepth(51));
      if (disabled)       spr.setAlpha(0.3);
      else if (selected)  spr.setTint(0xffcc44);

      push(this.add.text(x, y + CH / 2 + 2,
        `${card.name?.split(' ')[0] ?? ''} [${card.type[0]}]`,
        { fontSize: '7px', color: selected ? '#ffcc44' : '#667788', align: 'center' }
      ).setOrigin(0.5, 0).setDepth(51));

      if (!disabled) {
        spr.setInteractive({ useHandCursor: true });
        spr.on('pointerover', () => { if (!selected) spr.setTint(0xaaddff); });
        spr.on('pointerout',  () => { if (selected) spr.setTint(0xffcc44); else spr.clearTint(); });
        spr.on('pointerdown', () => onSelect(card));
      }
    }

    const btnY = cy + H / 2 - 28;
    if (actionLabel && onAction) {
      const aBtn = push(this.add.rectangle(cx - 80, btnY, 150, 34, 0x1a4a1a)
        .setStrokeStyle(1, 0x44cc66).setInteractive({ useHandCursor: true }).setDepth(52));
      aBtn.on('pointerover', () => aBtn.setFillStyle(0x2a6a2a));
      aBtn.on('pointerout',  () => aBtn.setFillStyle(0x1a4a1a));
      aBtn.on('pointerdown', onAction);
      push(this.add.text(cx - 80, btnY, actionLabel, { fontSize: '12px', color: '#aaffcc' })
        .setOrigin(0.5).setDepth(52));
    }
    const cBtn = push(this.add.rectangle(cx + 70, btnY, 140, 34, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(52));
    cBtn.on('pointerover', () => cBtn.setFillStyle(0x4a2a2a));
    cBtn.on('pointerout',  () => cBtn.setFillStyle(0x2a1a1a));
    cBtn.on('pointerdown', onCancel);
    push(this.add.text(cx + 70, btnY, 'Cancel (refund)', { fontSize: '11px', color: '#ffaaaa' })
      .setOrigin(0.5).setDepth(52));
  }

  _showPathOverlay(def) {
    let targetCard = null;
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      const deck     = run.getDeck();
      const phase2   = targetCard !== null;
      this._buildPracticeGrid({
        title: `Path  (${def.cost} ki paid)`,
        instruction: phase2
          ? `Target: ${targetCard.name} (month ${targetCard.month}). Select up to 4 cards to change. Selected: ${selectedIds.size}/4`
          : 'Step 1: Click the card whose month you want to copy to others.',
        cards:       phase2 ? deck.filter(c => c.id !== targetCard.id) : deck,
        selectedIds: phase2 ? selectedIds : new Set(),
        onSelect: (card) => {
          if (!phase2) { targetCard = card; selectedIds.clear(); render(); }
          else {
            if (selectedIds.has(card.id)) selectedIds.delete(card.id);
            else if (selectedIds.size < 4) selectedIds.add(card.id);
            render();
          }
        },
        actionLabel: phase2 && selectedIds.size > 0 ? `Confirm (${selectedIds.size})` : null,
        onAction: () => {
          run.applyPath(targetCard.id, [...selectedIds]);
          logger.logConsumableUse(def.name, `month ${targetCard.month} → ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showFastingOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title: `Fasting  (${def.cost} ki paid)`,
        instruction: `Select up to 3 cards to promote. Bright cards cannot be promoted. Selected: ${selectedIds.size}/3`,
        cards:       run.getDeck(),
        selectedIds,
        disabledFn:  (c) => c.type === 'bright',
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 3) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Confirm (${selectedIds.size})` : null,
        onAction: () => {
          run.applyFasting([...selectedIds]);
          logger.logConsumableUse(def.name, `promoted ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showMindOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title: `Mind  (${def.cost} ki paid)`,
        instruction: `Select up to 2 cards to permanently delete from your deck. Selected: ${selectedIds.size}/2`,
        cards:       run.getDeck(),
        selectedIds,
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 2) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Delete (${selectedIds.size})` : null,
        onAction: () => {
          run.applyMind([...selectedIds]);
          logger.logConsumableUse(def.name, `deleted ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showTreeOverlay(def) {
    let sourceCard = null;
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      const deck  = run.getDeck();
      const phase2 = sourceCard !== null;
      this._buildPracticeGrid({
        title: `Tree  (${def.cost} ki paid)`,
        instruction: phase2
          ? `Transforming: ${sourceCard.name}. Step 2: Click the card to copy its properties from.`
          : 'Step 1: Click the card you want to transform (it will be replaced).',
        cards:       phase2 ? deck.filter(c => c.id !== sourceCard.id) : deck,
        selectedIds: new Set(sourceCard ? [sourceCard.id] : []),
        onSelect: (card) => {
          if (!phase2) { sourceCard = card; render(); }
          else {
            run.applyTree(sourceCard.id, card.id);
            logger.logConsumableUse(def.name, `${sourceCard.id} → copy of ${card.id}`);
            for (const o of this._confirmObjs) o.destroy();
            this._confirmObjs = [];
            this._buildUI();
          }
        },
        onCancel: refund,
      });
    };
    render();
  }

  // ── Buy consumable → booster pack overlay ────────────────────────────────

  _buyConsumable(markDef) {
    const pCost = this._price(markDef.cost);
    if (run.ki < pCost) return;
    run.spendKi(pCost);
    logger.logShopPurchase('consumable', markDef.name, pCost);
    this._showUseOrCarryChoice(markDef);
  }

  _showUseOrCarryChoice(markDef) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const cx   = 640, cy = 360;
    const push = obj => { this._confirmObjs.push(obj); return obj; };
    const canCarry = run.canAddConsumable;

    push(this.add.rectangle(cx, cy, 380, 220, 0x040810, 0.97)
      .setStrokeStyle(2, 0x2a5a88).setDepth(55));
    push(this.add.text(cx, cy - 80, markDef.name, {
      fontSize: '17px', color: '#88ddff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(55));
    push(this.add.text(cx, cy - 52, 'How would you like to use this?', {
      fontSize: '12px', color: '#557799',
    }).setOrigin(0.5).setDepth(55));

    // "Use Now" button
    const useBtn = push(this.add.rectangle(cx, cy - 8, 260, 36, 0x1a3a5a)
      .setStrokeStyle(1, 0x44aacc).setInteractive({ useHandCursor: true }).setDepth(56));
    useBtn.on('pointerover', () => useBtn.setFillStyle(0x2a5a88));
    useBtn.on('pointerout',  () => useBtn.setFillStyle(0x1a3a5a));
    useBtn.on('pointerdown', () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._showBoosterPack(markDef);
    });
    push(this.add.text(cx, cy - 8, 'Use Now  (pick from 8 cards)', {
      fontSize: '12px', color: '#88ddff',
    }).setOrigin(0.5).setDepth(56));

    // "Carry" button
    const carryBg = canCarry ? 0x1a3a1a : 0x1a1a1a;
    const carryBr = canCarry ? 0x44aa66 : 0x334433;
    const carryBtn = push(this.add.rectangle(cx, cy + 38, 260, 36, carryBg)
      .setStrokeStyle(1, carryBr).setDepth(56));
    if (canCarry) {
      carryBtn.setInteractive({ useHandCursor: true });
      carryBtn.on('pointerover', () => carryBtn.setFillStyle(0x2a5a2a));
      carryBtn.on('pointerout',  () => carryBtn.setFillStyle(0x1a3a1a));
      carryBtn.on('pointerdown', () => {
        try {
          run.addConsumable({ id: markDef.id, name: markDef.name,
            description: markDef.description, category: markDef.category });
          logger.logConsumableUse(markDef.name, 'carried into round');
        } catch (e) { console.warn('[ShrineScene] addConsumable:', e.message); }
        for (const o of this._confirmObjs) o.destroy();
        this._confirmObjs = [];
        this._buildUI();
      });
    }
    push(this.add.text(cx, cy + 38,
      canCarry ? 'Carry into Round' : 'Inventory full',
      { fontSize: '12px', color: canCarry ? '#aaffcc' : '#554433' }
    ).setOrigin(0.5).setDepth(56));

    // "Cancel / refund" button
    const cancelBtn = push(this.add.rectangle(cx, cy + 84, 160, 30, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(56));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x4a2a2a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x2a1a1a));
    cancelBtn.on('pointerdown', () => {
      run.addKi(markDef.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
    push(this.add.text(cx, cy + 84, 'Cancel (refund)', {
      fontSize: '11px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(56));
  }

  _showBoosterPack(markDef) {
    // Clear any existing booster pack overlay
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const deck = run.getDeck();
    // Pick up to 8 random cards from the current deck
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const preview  = shuffled.slice(0, Math.min(8, shuffled.length));

    const cx = 640, cy = 360;
    const W  = 900, H = 460;
    const push = obj => { this._confirmObjs.push(obj); return obj; };

    push(this.add.rectangle(cx, cy, W, H, 0x040810, 0.97)
      .setStrokeStyle(2, 0x2a5a88).setDepth(50));

    push(this.add.text(cx, cy - H / 2 + 14, `${markDef.name} — Select a Card`, {
      fontSize: '18px', color: '#88ddff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50));

    // Instruction text per consumable type
    const ELEMENT_NAMES = {
      water: 'Snow (2× pts)', wood: 'Leaf (slot bypass)', fire: 'Ember (wildcard)',
      earth: 'Clay (ki interest)', metal: 'Iron (proc chance)',
    };
    let instruction = 'Select a card.';
    if (markDef.id === 'mark_impermanence') {
      instruction = 'Click a card to promote it to the next type.';
    } else if (markDef.id === 'mark_nonbeing') {
      instruction = 'Click a card to permanently remove it from your deck.';
    } else if (markDef.id === 'mark_transcendence') {
      instruction = 'Click the SOURCE card (it will be replaced).';
    } else if (markDef.id.startsWith('element_')) {
      const eName = ELEMENT_NAMES[markDef.element] ?? markDef.name;
      instruction = `Apply ${eName} enhancement. Generative/destructive cycles apply.`;
    }

    push(this.add.text(cx, cy - H / 2 + 36, instruction, {
      fontSize: '12px', color: '#557799',
    }).setOrigin(0.5).setDepth(50));

    // Card grid — up to 8 cards in two rows of 4
    const SCALE    = 0.68;
    const CW       = Math.round(64 * SCALE);
    const CH       = Math.round(104 * SCALE);
    const GAP      = 12;
    const perRow   = 4;
    const rowCount = Math.ceil(preview.length / perRow);
    const gridW    = perRow * CW + (perRow - 1) * GAP;
    const gridStartX = cx - gridW / 2 + CW / 2;
    const gridStartY = cy - 60;

    // Transcendence: two-step selection
    let transcendSource = null;

    for (let i = 0; i < preview.length; i++) {
      const card = preview[i];
      const col  = i % perRow;
      const row  = Math.floor(i / perRow);
      const x    = gridStartX + col * (CW + GAP);
      const y    = gridStartY + row * (CH + GAP + 22);

      // Card image
      const spr = push(this.add.image(x, y, card.id).setScale(SCALE).setDepth(51));

      // Card label
      push(this.add.text(x, y + CH / 2 + 2, `${card.name}`, {
        fontSize: '8px', color: '#8899aa',
        wordWrap: { width: CW + GAP - 4 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(51));
      push(this.add.text(x, y + CH / 2 + 12, `[${card.type}]`, {
        fontSize: '8px', color: '#556677',
      }).setOrigin(0.5, 0).setDepth(51));

      spr.setInteractive({ useHandCursor: true });
      spr.on('pointerover', () => spr.setTint(0xaaddff));
      spr.on('pointerout',  () => {
        if (transcendSource && transcendSource.id === card.id) return;
        spr.clearTint();
      });

      spr.on('pointerdown', () => {
        const closeOverlay = () => {
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
        };

        if (markDef.id === 'mark_impermanence') {
          run.promoteCard(card.id);
          logger.logConsumableUse(markDef.name, `promoted ${card.id} at shop`);
          closeOverlay();
          this._buildUI();

        } else if (markDef.id === 'mark_nonbeing') {
          run.deleteCard(card.id);
          logger.logConsumableUse(markDef.name, `deleted ${card.id} at shop`);
          closeOverlay();
          this._buildUI();

        } else if (markDef.id === 'mark_transcendence') {
          if (!transcendSource) {
            transcendSource = card;
            spr.setTint(0xffcc44);
            for (const o of this._confirmObjs) {
              if (o._isTargetInstruction) o.destroy();
            }
            const instr = push(this.add.text(cx, cy - H / 2 + 36,
              `Source: ${card.name}. Now click the TARGET card to copy from.`,
              { fontSize: '12px', color: '#ffcc44' }
            ).setOrigin(0.5).setDepth(51));
            instr._isTargetInstruction = true;
          } else {
            run.transcendCard(transcendSource.id, card.id);
            logger.logConsumableUse(markDef.name, `${transcendSource.id} → ${card.id} at shop`);
            closeOverlay();
            this._buildUI();
          }

        } else if (markDef.id.startsWith('element_')) {
          // Wu Xing element application
          const element = markDef.element ?? markDef.id.replace('element_', '');
          const result  = run.applyElement(card.id, element);
          // If the element stripped an existing enhancement, return the base
          // consumable to inventory (if space is available).
          if (result.action === 'stripped' && result.returnedConsumable) {
            const returnedDef = getElementDef(result.returnedConsumable);
            if (returnedDef && run.canAddConsumable) {
              try {
                run.addConsumable({
                  id: returnedDef.id, name: returnedDef.name,
                  description: returnedDef.description, category: returnedDef.category,
                });
              } catch (_) { /* inventory was actually full */ }
            }
          }
          logger.logConsumableUse(markDef.name, `${result.action} on ${card.id} at shop`);
          closeOverlay();
          this._buildUI();
        }
      });
    }

    // Cancel button (refund; no card selected)
    const cancelBtn = push(this.add.rectangle(cx, cy + H / 2 - 30, 140, 36, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(51));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x4a2a2a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x2a1a1a));
    cancelBtn.on('pointerdown', () => {
      // Refund ki since no card was selected
      run.addKi(markDef.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
    push(this.add.text(cx, cy + H / 2 - 30, 'Cancel (refund)', {
      fontSize: '13px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(51));
  }

  // ── Zodiac Items section ──────────────────────────────────────────────────

  _drawZodiacSection(cx, topY, height) {
    this.add.text(cx, topY + 4, 'Zodiac Items', {
      fontSize: '15px', color: '#ffdd88',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 22, 'Tactical consumables for use in rounds', {
      fontSize: '10px', color: '#334455',
    }).setOrigin(0.5, 0);

    // Inventory status
    const slotCount = run.consumables.length;
    const invColor  = slotCount >= RunManager.MAX_CONSUMABLE_SLOTS ? '#cc4444' : '#556677';
    const invNames  = slotCount > 0 ? run.consumables.map(c => c.name).join(', ') : 'empty';
    this.add.text(cx, topY + 36,
      `Inventory: ${slotCount}/${RunManager.MAX_CONSUMABLE_SLOTS}  [${invNames}]`,
      { fontSize: '10px', color: invColor, wordWrap: { width: 560 }, align: 'center' }
    ).setOrigin(0.5, 0);

    const offers  = this._zodiacOffering;
    const tileW   = 182;
    const tileH   = height - 54;  // extra 18px for inventory row
    const tileGap = 8;
    const totalW  = offers.length * tileW + (offers.length - 1) * tileGap;
    const startX  = cx - totalW / 2 + tileW / 2;
    const tileY   = topY + 52 + tileH / 2;

    const CATEGORY_COLOR = {
      hand: '#88ddcc', field: '#88ccee', yaku: '#ddaaff', ki: '#ffdd88',
    };

    for (let i = 0; i < offers.length; i++) {
      const def    = offers[i];
      const x      = startX + i * (tileW + tileGap);
      const zCost  = this._price(def.cost);
      const canBuy = run.canAddConsumable && run.ki >= zCost;
      const color  = CATEGORY_COLOR[def.category] ?? '#cccccc';

      this.add.rectangle(x, tileY, tileW, tileH, canBuy ? 0x1a1500 : 0x0e0e0a)
        .setStrokeStyle(1, canBuy ? 0x554400 : 0x1a1a2a);

      this.add.text(x, tileY - tileH / 2 + 6, def.name, {
        fontSize: '12px', color, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      this.add.text(x, tileY - tileH / 2 + 22, def.description, {
        fontSize: '9px', color: '#445566',
        wordWrap: { width: tileW - 10 }, align: 'center',
      }).setOrigin(0.5, 0);

      const btnY2  = tileY + tileH / 2 - 14;
      const inv    = !run.canAddConsumable;
      const btnLbl = inv ? 'Inv Full' : !canBuy ? `${zCost}ki` : `Buy  ${zCost}ki`;
      const btnClr = canBuy ? color : '#334455';
      const btn    = this.add.rectangle(x, btnY2, tileW - 10, 20, canBuy ? 0x1a1200 : 0x0a0a0a)
        .setStrokeStyle(1, canBuy ? 0x554400 : 0x1a1a2a);
      this.add.text(x, btnY2, btnLbl, { fontSize: '10px', color: btnClr }).setOrigin(0.5);

      if (canBuy) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x2a2000));
        btn.on('pointerout',  () => btn.setFillStyle(0x1a1200));
        btn.on('pointerdown', () => {
          const result = run.buyConsumable(def.id);
          if (result.success) {
            // Apply coupon discount (buyConsumable deducts full cost internally).
            const discount = def.cost - zCost;
            if (discount > 0) run.addKi(discount);
            logger.logConsumableUse(def.name, 'purchased');
            this._zodiacOffering = this._zodiacOffering.filter(d => d.id !== def.id);
            this._buildUI();
          }
        });
      }
    }
  }

  // ── Wu Xing Forge section ─────────────────────────────────────────────────

  _drawWuXingForgeSection(cx, topY, height) {
    this.add.text(cx, topY + 4, 'Wu Xing Forge', {
      fontSize: '15px', color: '#aaccee',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 22, 'Apply elemental enhancements to your cards  —  5 ki each', {
      fontSize: '10px', color: '#334455',
    }).setOrigin(0.5, 0);

    // 5 element tiles in a row
    const ELEMENT_COLORS = {
      water: '#4488ff', wood: '#44cc44', fire: '#ff6644', earth: '#cc8822', metal: '#aaaaaa',
    };
    const ELEMENT_BORDER = {
      water: 0x2255aa, wood: 0x228833, fire: 0xaa3322, earth: 0x885511, metal: 0x666666,
    };
    const tileW  = 100;
    const tileH  = height - 36;
    const tileGap = 8;
    const totalW = WUXING_CONSUMABLES.length * tileW + (WUXING_CONSUMABLES.length - 1) * tileGap;
    const startX = cx - totalW / 2 + tileW / 2;
    const tileY  = topY + 34 + tileH / 2;

    for (let i = 0; i < WUXING_CONSUMABLES.length; i++) {
      const def     = WUXING_CONSUMABLES[i];
      const x       = startX + i * (tileW + tileGap);
      const full    = !run.canAddConsumable;
      const wCost   = this._price(def.cost);
      const afford  = run.ki >= wCost;
      const buyable = afford && !full;
      const color   = ELEMENT_COLORS[def.element] ?? '#aaaaaa';
      const bdr     = ELEMENT_BORDER[def.element] ?? 0x555555;

      this.add.rectangle(x, tileY, tileW, tileH, buyable ? 0x0a1a1a : 0x080e10)
        .setStrokeStyle(1, buyable ? bdr : 0x1a2233);

      this.add.text(x, tileY - tileH / 2 + 7, def.name, {
        fontSize: '12px', color, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      this.add.text(x, tileY - tileH / 2 + 21, def.description, {
        fontSize: '7px', color: '#445566',
        wordWrap: { width: tileW - 8 }, align: 'center',
      }).setOrigin(0.5, 0);

      const btnY2  = tileY + tileH / 2 - 14;
      const btnLbl = full ? 'Full' : !afford ? 'N/A' : `${wCost} ki`;
      const btnTxt = buyable ? color : '#334455';
      const btn    = this.add.rectangle(x, btnY2, tileW - 10, 20, buyable ? 0x111e1e : 0x080e0e)
        .setStrokeStyle(1, buyable ? bdr : 0x1a2233);
      this.add.text(x, btnY2, btnLbl, { fontSize: '10px', color: btnTxt }).setOrigin(0.5);

      if (buyable) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x1a2e2e));
        btn.on('pointerout',  () => btn.setFillStyle(0x111e1e));
        btn.on('pointerdown', () => this._buyConsumable(def));
      }
    }
  }

  // ── Ribbon Stamps section ─────────────────────────────────────────────────

  _drawRibbonStampsSection(cx, topY, height) {
    // Compact mode (height ≤ 40px): single row of mini buttons, no tile cards.
    if (height <= 40) {
      this.add.text(cx - 280, topY + 10, 'Ribbon Stamps:', {
        fontSize: '11px', color: '#ddaacc',
      }).setOrigin(0, 0.5);
      const stamps = Object.values(RIBBON_STAMPS);
      stamps.forEach((stamp, i) => {
        const x = cx - 100 + i * 78;
        const sCost  = this._price(stamp.cost);
        const afford = run.ki >= sCost;
        const btn = this.add.rectangle(x, topY + 10, 72, 22, afford ? 0x1a1020 : 0x0a0a0a)
          .setStrokeStyle(1, afford ? stamp.hexColor * 0.4 : 0x1a1a2a);
        this.add.text(x, topY + 10, `${stamp.name.split(' ')[0]}  ${sCost}ki`, {
          fontSize: '9px', color: afford ? stamp.color : '#334455',
        }).setOrigin(0.5);
        if (afford) {
          btn.setInteractive({ useHandCursor: true });
          btn.on('pointerover', () => btn.setFillStyle(0x2a1830));
          btn.on('pointerout',  () => btn.setFillStyle(0x1a1020));
          btn.on('pointerdown', () => this._showStampCardSelector(stamp));
        }
      });
      return;
    }

    // Full-size mode (height > 40px)
    this.add.text(cx, topY + 4, 'Ribbon Stamps', {
      fontSize: '15px', color: '#ddaacc',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 22, 'Apply permanent effects to deck cards', {
      fontSize: '10px', color: '#334455',
    }).setOrigin(0.5, 0);

    const stamps   = Object.values(RIBBON_STAMPS);
    const tileW    = 128;
    const tileH    = height - 36;
    const tileGap  = 8;
    const totalW   = stamps.length * tileW + (stamps.length - 1) * tileGap;
    const startX   = cx - totalW / 2 + tileW / 2;
    const tileY    = topY + 34 + tileH / 2;

    for (let i = 0; i < stamps.length; i++) {
      const stamp   = stamps[i];
      const x       = startX + i * (tileW + tileGap);
      const sCost   = this._price(stamp.cost);
      const afford  = run.ki >= sCost;
      const buyable = afford;

      this.add.rectangle(x, tileY, tileW, tileH, buyable ? 0x1a0f1a : 0x0e0a0e)
        .setStrokeStyle(1, buyable ? stamp.hexColor * 0.6 : 0x1a1a2a);

      this.add.text(x, tileY - tileH / 2 + 6, stamp.name, {
        fontSize: '11px', color: stamp.color, fontStyle: 'bold',
        wordWrap: { width: tileW - 8 }, align: 'center',
      }).setOrigin(0.5, 0);

      this.add.text(x, tileY - tileH / 2 + 20, stamp.description, {
        fontSize: '8px', color: '#445566',
        wordWrap: { width: tileW - 8 }, align: 'center',
      }).setOrigin(0.5, 0);

      const btnY2  = tileY + tileH / 2 - 14;
      const btnLbl = !afford ? `N/A  ${sCost}ki` : `Stamp  ${sCost}ki`;
      const btnTxt = buyable ? stamp.color : '#334455';
      const btn    = this.add.rectangle(x, btnY2, tileW - 10, 20, buyable ? 0x1a1020 : 0x0a0a0a)
        .setStrokeStyle(1, buyable ? stamp.hexColor * 0.4 : 0x1a1a2a);
      this.add.text(x, btnY2, btnLbl, { fontSize: '10px', color: btnTxt }).setOrigin(0.5);

      if (buyable) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x2a1830));
        btn.on('pointerout',  () => btn.setFillStyle(0x1a1020));
        btn.on('pointerdown', () => this._showStampCardSelector(stamp));
      }
    }
  }

  // ── Stamp card selector overlay ───────────────────────────────────────────

  _showStampCardSelector(stampDef) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    // Only show cards that don't already have a ribbon stamp.
    const deck     = run.getDeck().filter(c => !c.ribbonStamp);
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const preview  = shuffled.slice(0, Math.min(8, shuffled.length));

    const cx = 640, cy = 360;
    const W  = 900, H = 460;
    const push = obj => { this._confirmObjs.push(obj); return obj; };

    push(this.add.rectangle(cx, cy, W, H, 0x0a0612, 0.97)
      .setStrokeStyle(2, stampDef.hexColor).setDepth(50));

    push(this.add.text(cx, cy - H / 2 + 14, `${stampDef.name} — Select a Card  (${stampDef.cost} ki)`, {
      fontSize: '18px', color: stampDef.color, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50));

    push(this.add.text(cx, cy - H / 2 + 36, stampDef.description, {
      fontSize: '12px', color: '#667788',
    }).setOrigin(0.5).setDepth(50));

    if (preview.length === 0) {
      push(this.add.text(cx, cy, 'All cards already have ribbon stamps.', {
        fontSize: '14px', color: '#667788',
      }).setOrigin(0.5).setDepth(50));
    } else {
      const SCALE    = 0.68;
      const CW       = Math.round(64 * SCALE);
      const CH       = Math.round(104 * SCALE);
      const GAP      = 12;
      const perRow   = 4;
      const gridW    = perRow * CW + (perRow - 1) * GAP;
      const gridStartX = cx - gridW / 2 + CW / 2;
      const gridStartY = cy - 60;

      for (let i = 0; i < preview.length; i++) {
        const card = preview[i];
        const col  = i % perRow;
        const row  = Math.floor(i / perRow);
        const x    = gridStartX + col * (CW + GAP);
        const y    = gridStartY + row * (CH + GAP + 22);

        const spr = push(this.add.image(x, y, card.id).setScale(SCALE).setDepth(51));
        push(this.add.text(x, y + CH / 2 + 2, card.name, {
          fontSize: '8px', color: '#8899aa',
          wordWrap: { width: CW + GAP - 4 }, align: 'center',
        }).setOrigin(0.5, 0).setDepth(51));
        push(this.add.text(x, y + CH / 2 + 12, `[${card.type}]`, {
          fontSize: '8px', color: '#556677',
        }).setOrigin(0.5, 0).setDepth(51));

        spr.setInteractive({ useHandCursor: true });
        spr.on('pointerover', () => spr.setTint(0xffccee));
        spr.on('pointerout',  () => spr.clearTint());
        spr.on('pointerdown', () => {
          const result = run.applyRibbonStamp(card.id, stampDef.id);
          if (result.success) {
            // Apply coupon discount (applyRibbonStamp deducts full cost internally).
            const discount = stampDef.cost - this._price(stampDef.cost);
            if (discount > 0) run.addKi(discount);
            logger.logConsumableUse(stampDef.name, `stamped ${card.id}`);
            for (const o of this._confirmObjs) o.destroy();
            this._confirmObjs = [];
            this._buildUI();
          }
        });
      }
    }

    // Cancel button (no cost deducted — ki is spent only on success)
    const cancelBtn = push(this.add.rectangle(cx, cy + H / 2 - 30, 140, 36, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(51));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x4a2a2a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x2a1a1a));
    cancelBtn.on('pointerdown', () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
    });
    push(this.add.text(cx, cy + H / 2 - 30, 'Cancel', {
      fontSize: '13px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(51));
  }

  // ── Fusion Ritual section (Sacred Grove only) ─────────────────────────────

  _drawFusionSection(cx, topY, height) {
    this.add.text(cx, topY + 4, 'Fusion Ritual', {
      fontSize: '15px', color: '#ffcc44',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 24, 'Combine two spirits into something greater', {
      fontSize: '10px', color: '#886644',
    }).setOrigin(0.5, 0);

    const panelPadTop = 42;
    const panelPadBot = 8;
    const panelH      = height - panelPadTop - panelPadBot;
    const panelCY     = topY + panelPadTop + panelH / 2;

    this.add.rectangle(cx, panelCY, 570, panelH, 0x4a3a1a, 0.2)
      .setStrokeStyle(1, 0x665533);

    const availableFusions = getAvailableFusions(run.spirits.map(s => s.id));

    if (availableFusions.length === 0) {
      this.add.text(cx, panelCY, 'No compatible spirit pairs equipped', {
        fontSize: '12px', color: '#665533', fontStyle: 'italic',
      }).setOrigin(0.5);
      return;
    }

    let y = topY + panelPadTop + 10;
    for (const recipe of availableFusions) {
      const nameA     = run.spirits.find(s => s.id === recipe.input[0])?.name ?? recipe.input[0];
      const nameB     = run.spirits.find(s => s.id === recipe.input[1])?.name ?? recipe.input[1];
      const outputDef = getSpiritDef(recipe.output);

      this.add.text(cx, y,
        `${nameA} + ${nameB}  \u2192  ${outputDef?.name ?? recipe.output}`,
        { fontSize: '12px', color: '#ddbb88' }
      ).setOrigin(0.5, 0);
      y += 18;

      this.add.text(cx, y, outputDef?.description ?? '', {
        fontSize: '10px', color: '#997755',
        wordWrap: { width: 530 }, align: 'center',
      }).setOrigin(0.5, 0);
      y += 22;

      const fuseBtn = this.add.rectangle(cx, y + 11, 90, 22, 0x6a4a1a)
        .setStrokeStyle(1, 0xccaa44)
        .setInteractive({ useHandCursor: true });
      fuseBtn.on('pointerover', () => fuseBtn.setFillStyle(0x8a6a2a));
      fuseBtn.on('pointerout',  () => fuseBtn.setFillStyle(0x6a4a1a));
      fuseBtn.on('pointerdown', () => this._showFusionConfirm(recipe));
      this.add.text(cx, y + 11, 'Fuse', { fontSize: '12px', color: '#ffdd88' }).setOrigin(0.5);
      y += 40;
    }
  }

  // ── Fusion confirmation dialog ────────────────────────────────────────────

  _showFusionConfirm(recipe) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const cx        = 640, cy = 360;
    const nameA     = run.spirits.find(s => s.id === recipe.input[0])?.name ?? recipe.input[0];
    const nameB     = run.spirits.find(s => s.id === recipe.input[1])?.name ?? recipe.input[1];
    const outputDef = getSpiritDef(recipe.output);

    const push = obj => { this._confirmObjs.push(obj); return obj; };

    push(this.add.rectangle(cx, cy, 500, 196, 0x0a1628, 0.97)
      .setStrokeStyle(2, 0xaa8833).setDepth(50));

    push(this.add.text(cx, cy - 80, 'Fusion Ritual', {
      fontSize: '18px', color: '#ffcc44', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50));

    push(this.add.text(cx, cy - 46,
      `Fuse ${nameA} + ${nameB}\ninto ${outputDef?.name ?? recipe.output}?\n\nThis cannot be undone.`,
      { fontSize: '13px', color: '#ccbbaa', align: 'center' }
    ).setOrigin(0.5).setDepth(50));

    const confirmBtn = push(this.add.rectangle(cx - 72, cy + 66, 118, 30, 0x6a4a1a)
      .setStrokeStyle(1, 0xccaa44).setInteractive({ useHandCursor: true }).setDepth(50));
    confirmBtn.on('pointerover', () => confirmBtn.setFillStyle(0x9a7a2a));
    confirmBtn.on('pointerout',  () => confirmBtn.setFillStyle(0x6a4a1a));
    confirmBtn.on('pointerdown', () => this._executeFusion(recipe));
    push(this.add.text(cx - 72, cy + 66, 'Confirm', {
      fontSize: '13px', color: '#ffdd88',
    }).setOrigin(0.5).setDepth(50));

    const cancelBtn = push(this.add.rectangle(cx + 72, cy + 66, 118, 30, 0x1a2a3a)
      .setStrokeStyle(1, 0x446688).setInteractive({ useHandCursor: true }).setDepth(50));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x2a3a5a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x1a2a3a));
    cancelBtn.on('pointerdown', () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
    });
    push(this.add.text(cx + 72, cy + 66, 'Cancel', {
      fontSize: '13px', color: '#8899aa',
    }).setOrigin(0.5).setDepth(50));
  }

  _executeFusion(recipe) {
    const nameA  = run.spirits.find(s => s.id === recipe.input[0])?.name ?? recipe.input[0];
    const nameB  = run.spirits.find(s => s.id === recipe.input[1])?.name ?? recipe.input[1];
    const result = run.fuseSpirits(recipe.input[0], recipe.input[1]);
    if (!result.success) return;
    logger.logShopFusion(nameA, nameB, result.fusedSpirit.name);
    // New slot opened — regenerate offering and rebuild.
    this._offering  = this._generateOffering();
    this._purchased = new Array(this._offering.length).fill(false);
    this._buildUI();
  }

  // ── Continue button ───────────────────────────────────────────────────────

  _drawContinueButton() {
    const label = this._isGrove ? 'Enter the Forest' : 'Continue';
    const btn   = this.add.rectangle(640, BTN_Y, 260, 44, 0x1a4a2a)
      .setStrokeStyle(2, 0x44aa66)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setFillStyle(0x2a6a3a));
    btn.on('pointerout',  () => btn.setFillStyle(0x1a4a2a));
    btn.on('pointerdown', () => {
      logger.logShopExit(run.ki);
      this.scene.start('GameScene');
    });

    this.add.text(640, BTN_Y, label, {
      fontSize: '16px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
  }

  // ── Card shop (left column, below loadout) ───────────────────────────────

  _drawCardShopSection() {
    const cx = LCX;

    // Loadout ends at: CARD_ROW_Y + CARD_H/2 + 22 (divider) + 44 (label) + 2 rows * 58 + 25 (half-slot)
    // = 278 + 102 + 22 + 44 + 116 + 25 = 587. Add 8 gap → topY = 540.
    const topY = 540;

    this.add.text(cx, topY, 'Cards for Sale', {
      fontSize: '13px', color: '#ccddaa',
    }).setOrigin(0.5, 0);

    const offers = this._cardOffers;
    if (offers.length === 0) {
      this.add.text(cx, topY + 20, 'No cards available.', {
        fontSize: '11px', color: '#334455',
      }).setOrigin(0.5, 0);
      return;
    }

    const SCALE  = 0.50;
    const CW     = Math.round(64 * SCALE);   // 32
    const CH     = Math.round(104 * SCALE);  // 52
    const GAP    = 12;
    const totalW = offers.length * CW + (offers.length - 1) * GAP;
    const startX = cx - totalW / 2 + CW / 2;
    const cardY  = topY + 20 + CH / 2;      // center Y of card image

    // Element name abbreviations for badge
    const ELEM_SHORT = { water: 'W', wood: 'L', fire: 'F', earth: 'E', metal: 'M' };
    const ELEM_COLOR = { water: '#4488ff', wood: '#44cc44', fire: '#ff6644', earth: '#cc8822', metal: '#aaaaaa' };
    const STAMP_COLOR = { red: 0xcc3333, blue: 0x3366cc, green: 0x33aa55, yellow: 0xccaa33 };

    for (let i = 0; i < offers.length; i++) {
      const offer  = offers[i];
      const card   = offer.card;
      const x      = startX + i * (CW + GAP);
      const oCost  = this._price(offer.price);
      const afford = run.ki >= oCost;

      // Card image (texture key = original card id without shop suffix)
      const spr = this.add.image(x, cardY, card.id).setScale(SCALE);
      if (!afford) spr.setAlpha(0.6);

      // Enhancement badge (top-left corner)
      if (offer.preEnhancement) {
        const enh   = offer.preEnhancement;
        const label = (enh.tier === 'upgraded' ? '\u2605' : '') + ELEM_SHORT[enh.element];
        const col   = ELEM_COLOR[enh.element] ?? '#ffffff';
        this.add.rectangle(x - CW / 2 + 8, cardY - CH / 2 + 6, 14, 10, 0x000000, 0.7);
        this.add.text(x - CW / 2 + 8, cardY - CH / 2 + 6, label, {
          fontSize: '7px', color: col, fontStyle: 'bold',
        }).setOrigin(0.5);
      }

      // Ribbon stamp dot (top-right corner)
      if (offer.preRibbon) {
        const dotColor = STAMP_COLOR[offer.preRibbon] ?? 0xffffff;
        this.add.circle(x + CW / 2 - 5, cardY - CH / 2 + 5, 4, dotColor)
          .setStrokeStyle(1, 0x000000);
      }

      // Type + month label
      const typeLabel = `[${card.type[0]}] M${card.month}`;
      this.add.text(x, cardY + CH / 2 + 3, typeLabel, {
        fontSize: '8px', color: afford ? '#889aaa' : '#445566',
      }).setOrigin(0.5, 0);

      // Price + buy button
      const btnY   = cardY + CH / 2 + 17;
      const btnBg  = afford ? 0x1a3a1a : 0x0e180e;
      const btnBdr = afford ? 0x44aa66 : 0x1a2a1a;
      const btnLbl = `${oCost}ki`;
      const btn    = this.add.rectangle(x, btnY, CW + 4, 16, btnBg)
        .setStrokeStyle(1, btnBdr);
      this.add.text(x, btnY, btnLbl, {
        fontSize: '9px', color: afford ? '#aaffcc' : '#334455',
      }).setOrigin(0.5);

      if (afford) {
        btn.setInteractive({ useHandCursor: true });
        spr.setInteractive({ useHandCursor: true });
        const doBuy = () => {
          const result = run.buyCard(card, oCost);
          if (result.success) {
            logger.logShopPurchase('card', card.name ?? card.id, oCost);
            this._cardOffers = this._cardOffers.filter(o => o !== offer);
            this._buildUI();
          }
        };
        btn.on('pointerover', () => btn.setFillStyle(0x2a5a2a));
        btn.on('pointerout',  () => btn.setFillStyle(btnBg));
        btn.on('pointerdown', doBuy);
        spr.on('pointerover', () => spr.setTint(0xccffcc));
        spr.on('pointerout',  () => spr.clearTint());
        spr.on('pointerdown', doBuy);
      }
    }
  }

  // ── Purchase ──────────────────────────────────────────────────────────────

  /** Apply econ_coupon discount (20% off, ceil). */
  _price(base) {
    return run.spirits.some(s => s.id === 'econ_coupon') ? Math.ceil(base * 0.8) : base;
  }

  _buySpirit(index) {
    const spiritDef = this._offering[index];
    if (!spiritDef || this._purchased[index]) return;
    const result = run.buySpirit(spiritDef);
    if (result.success) {
      // Apply coupon discount after the fact (buySpirit deducts full cost).
      const discount = spiritDef.cost - this._price(spiritDef.cost);
      if (discount > 0) run.addKi(discount);
      this._purchased[index] = true;
      logger.logShopPurchase('spirit', spiritDef.name, this._price(spiritDef.cost));
      this._buildUI();
    }
  }
}
