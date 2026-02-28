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

import run, { RunManager }              from '../systems/RunManager.js';
import { SPIRIT_CATALOG, getSpiritDef } from '../data/spirits.js';
import { getAvailableFusions }          from '../data/fusionRecipes.js';

// ── Channel badge display ──────────────────────────────────────────────────────
const CHANNEL_BADGE = {
  point:          { label: 'POINT',    bgColor: 0x1a3a88, textColor: '#88aaff' },
  additive:       { label: 'MULT+',    bgColor: 0x7a5500, textColor: '#ffdd44' },
  multiplicative: { label: 'MULT\xD7', bgColor: 0x882222, textColor: '#ff8888' },
  both:           { label: 'PT+MULT',  bgColor: 0x3a4a00, textColor: '#ccee55' },
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
    this._isGrove     = isGrove ?? false;
    this._offering    = this._generateOffering();
    this._purchased   = new Array(this._offering.length).fill(false);
    this._confirmObjs = [];
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

  // ── UI construction ──────────────────────────────────────────────────────

  _buildUI() {
    this.children.removeAll(true);
    this._confirmObjs = [];
    this._drawBg();
    this._drawHeader();
    this._drawSpiritsSection();
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
        slotW, slotH,
      );
    }
  }

  _drawSpiritCard(cx, cy, spiritDef, index) {
    const purchased = this._purchased[index];
    const canAfford = run.ki >= spiritDef.cost;
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
    this.add.text(cx, bot - 50, `${spiritDef.cost} ki`, {
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

  _drawLoadoutSlot(cx, cy, spirit, w, h) {
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
    } else {
      this.add.text(cx, cy, '\u2014', { fontSize: '14px', color: '#1e2d40' }).setOrigin(0.5);
    }
  }

  // ── Right column ──────────────────────────────────────────────────────────

  _drawRightColumn() {
    const sections = [
      {
        type:     'placeholder',
        heading:  'Consumables',
        subtitle: 'Single-use items for tactical advantages',
        note:     'Coming soon\u2026',
        bgColor:  0x1a3a5a,
      },
      {
        type:     'placeholder',
        heading:  'Paramita Upgrades',
        subtitle: 'Permanent enhancements to your yaku multipliers',
        note:     'Coming soon\u2026',
        bgColor:  0x3a2a5a,
      },
      {
        type:     'placeholder',
        heading:  'Wu Xing Forge',
        subtitle: 'Transform your cards with elemental power',
        note:     'Coming soon\u2026',
        bgColor:  0x2a4a3a,
      },
    ];

    if (this._isGrove) {
      sections.push({ type: 'fusion' });
    }

    const topY  = HEADER_H + 6;
    const botY  = BTN_Y - 38;
    const avail = botY - topY;
    const secH  = Math.floor(avail / sections.length);

    for (let i = 0; i < sections.length; i++) {
      const sectionY = topY + i * secH;
      if (sections[i].type === 'fusion') {
        this._drawFusionSection(RCX, sectionY, secH);
      } else {
        this._drawPlaceholderSection(RCX, sectionY, secH, sections[i]);
      }
    }
  }

  _drawPlaceholderSection(cx, topY, height, { heading, subtitle, note, bgColor }) {
    this.add.text(cx, topY + 4, heading, {
      fontSize: '15px', color: '#aaccee',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 24, subtitle, {
      fontSize: '10px', color: '#445566',
    }).setOrigin(0.5, 0);

    const panelPadTop = 42;
    const panelPadBot = 8;
    const panelH      = height - panelPadTop - panelPadBot;
    const panelCY     = topY + panelPadTop + panelH / 2;

    this.add.rectangle(cx, panelCY, 570, panelH, bgColor, 0.2)
      .setStrokeStyle(1, 0x223344);
    this.add.text(cx, panelCY, note, {
      fontSize: '13px', color: '#445566', fontStyle: 'italic',
    }).setOrigin(0.5);
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
    const result = run.fuseSpirits(recipe.input[0], recipe.input[1]);
    if (!result.success) return;
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
    btn.on('pointerdown', () => this.scene.start('GameScene'));

    this.add.text(640, BTN_Y, label, {
      fontSize: '16px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
  }

  // ── Purchase ──────────────────────────────────────────────────────────────

  _buySpirit(index) {
    const spiritDef = this._offering[index];
    if (!spiritDef || this._purchased[index]) return;
    const result = run.buySpirit(spiritDef);
    if (result.success) {
      this._purchased[index] = true;
      this._buildUI();
    }
  }
}
