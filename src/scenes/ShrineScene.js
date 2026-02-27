// ─────────────────────────────────────────────────────────────────────────────
// ShrineScene — between-round shop
//
// Appears after every round the player passes.  Two variants:
//   isGrove=false  "Wayside Shrine"  — Spirits + 3 placeholder sections
//   isGrove=true   "The Sacred Grove" — same + Spirit Fusion placeholder
//
// Layout (1280 × 720):
//   Header        [y 0–64]      title, act/round, ki balance
//   Left column   [x 0–640]     Spirits section: offer cards + loadout
//   Right column  [x 640–1280]  Placeholder sections stacked evenly
//   Footer        [y ~668–720]  Continue / Enter the Forest button
//
// The full scene is rebuilt (children.removeAll) after every purchase so all
// state (ki balance, loadout, button affordability) updates automatically.
// ─────────────────────────────────────────────────────────────────────────────

import run, { RunManager } from '../systems/RunManager.js';
import { SPIRIT_CATALOG }  from '../data/spirits.js';

// ── Channel badge display ──────────────────────────────────────────────────────
const CHANNEL_BADGE = {
  point:          { label: 'POINT',   bgColor: 0x1a3a88, textColor: '#88aaff' },
  additive:       { label: 'MULT+',   bgColor: 0x7a5500, textColor: '#ffdd44' },
  multiplicative: { label: 'MULT\xD7', bgColor: 0x882222, textColor: '#ff8888' },
};

// ── Layout constants ──────────────────────────────────────────────────────────
const HEADER_H  = 64;   // height of the top bar
const LCX       = 320;  // left column center x
const RCX       = 960;  // right column center x
const DIV_X     = 640;  // vertical divider between columns

const CARD_W    = 158;  // spirit offer card width
const CARD_H    = 204;  // spirit offer card height
const CARD_GAP  = 14;   // gap between cards in the offer row

const CARD_ROW_Y = 278; // vertical center of the spirit offer card row

const BTN_Y     = 690;  // continue button center y

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
    this._buildUI();
  }

  // ── Offer generation ─────────────────────────────────────────────────────

  /**
   * Filter SPIRIT_CATALOG by tier and owned status, then pick up to 3 at random.
   * @returns {object[]}  0–3 spirit definitions from SPIRIT_CATALOG.
   */
  _generateOffering() {
    const ownedIds = new Set(run.spirits.map(s => s.id));
    const pool     = SPIRIT_CATALOG.filter(
      s => s.tier <= run.act && !ownedIds.has(s.id)
    );
    // Simple random sample without replacement.
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  }

  // ── UI construction ──────────────────────────────────────────────────────

  _buildUI() {
    this.children.removeAll(true);
    this._drawBg();
    this._drawHeader();
    this._drawSpiritsSection();
    this._drawRightColumn();
    this._drawContinueButton();
  }

  _drawBg() {
    this.add.rectangle(640, 360, 1280, 720, 0x060c18);
    // Subtle divider between columns.
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

  // ── Left column: Spirits section (functional) ────────────────────────────

  _drawSpiritsSection() {
    const cx = LCX;

    // Section heading.
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
    this.add.text(cx, divY + 7, 'Equipped Spirits', {
      fontSize: '11px', color: '#445566',
    }).setOrigin(0.5, 0);

    // Loadout slots.
    const slots    = RunManager.MAX_SPIRIT_SLOTS;
    const slotW    = 112;
    const slotH    = 56;
    const slotGap  = 10;
    const totalSW  = slots * slotW + (slots - 1) * slotGap;
    const slotCX0  = cx - totalSW / 2 + slotW / 2;
    const slotCY   = divY + 44;
    const owned    = run.spirits;

    for (let i = 0; i < slots; i++) {
      this._drawLoadoutSlot(slotCX0 + i * (slotW + slotGap), slotCY, owned[i] ?? null, slotW, slotH);
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

    // Card panel.
    this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x0f1e30)
      .setStrokeStyle(2, 0x2a4a6a)
      .setAlpha(alpha);

    // Name.
    this.add.text(cx, top + 10, spiritDef.name, {
      fontSize: '13px', color: '#e8e8e8',
      wordWrap: { width: CARD_W - 14 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(alpha);

    // Channel badge.
    const badge = CHANNEL_BADGE[spiritDef.channel]
                  ?? { label: spiritDef.channel.toUpperCase(), bgColor: 0x333333, textColor: '#888888' };
    this.add.rectangle(cx, top + 40, 60, 17, badge.bgColor, 0.9).setAlpha(alpha);
    this.add.text(cx, top + 40, badge.label, {
      fontSize: '9px', color: badge.textColor, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(alpha);

    // Description.
    this.add.text(cx, top + 56, spiritDef.description, {
      fontSize: '10px', color: '#8aadbb',
      wordWrap: { width: CARD_W - 14 }, align: 'center',
    }).setOrigin(0.5, 0).setAlpha(alpha);

    // Purchased overlay.
    if (purchased) {
      this.add.rectangle(cx, cy, CARD_W - 4, CARD_H - 4, 0x000000, 0.35);
      this.add.text(cx, cy, 'Purchased', {
        fontSize: '14px', color: '#667788',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5);
      return;
    }

    // Cost label.
    const costColor = canAfford ? '#ffee88' : '#cc6644';
    this.add.text(cx, bot - 50, `${spiritDef.cost} ki`, {
      fontSize: '13px', color: costColor,
    }).setOrigin(0.5, 0).setAlpha(alpha);

    // Buy button.
    const btnBg     = buyable ? 0x1a5a2a : 0x141e14;
    const btnBorder = buyable ? 0x44aa66 : 0x2a362a;
    const btnLabel  = !hasSlot ? 'Slots full' : !canAfford ? "Can't afford" : 'Buy';
    const btnTextC  = buyable  ? '#aaffcc'    : '#445566';

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
      this.add.text(cx, cy, spirit.name, {
        fontSize: '10px', color: '#ccdde8',
        wordWrap: { width: w - 10 }, align: 'center',
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, cy, '\u2014', { fontSize: '14px', color: '#1e2d40' }).setOrigin(0.5);
    }
  }

  // ── Right column: placeholder sections ───────────────────────────────────

  _drawRightColumn() {
    // Always-present sections.
    const sections = [
      {
        heading:  'Consumables',
        subtitle: 'Single-use items for tactical advantages',
        note:     'Coming soon\u2026',
        bgColor:  0x1a3a5a,
      },
      {
        heading:  'Paramita Upgrades',
        subtitle: 'Permanent enhancements to your yaku multipliers',
        note:     'Coming soon\u2026',
        bgColor:  0x3a2a5a,
      },
      {
        heading:  'Wu Xing Forge',
        subtitle: 'Transform your cards with elemental power',
        note:     'Coming soon\u2026',
        bgColor:  0x2a4a3a,
      },
    ];

    // Grove-exclusive section.
    if (this._isGrove) {
      sections.push({
        heading:  'Fusion Ritual',
        subtitle: 'Sacred Grove only — combine two spirits into something greater',
        note:     'Coming soon\u2026',
        bgColor:  0x4a3a1a,
      });
    }

    // Divide available vertical space evenly across sections.
    const topY  = HEADER_H + 6;
    const botY  = BTN_Y - 38;  // leave room above the continue button
    const avail = botY - topY;
    const secH  = Math.floor(avail / sections.length);

    for (let i = 0; i < sections.length; i++) {
      this._drawPlaceholderSection(RCX, topY + i * secH, secH, sections[i]);
    }
  }

  _drawPlaceholderSection(cx, topY, height, { heading, subtitle, note, bgColor }) {
    // Heading.
    this.add.text(cx, topY + 4, heading, {
      fontSize: '15px', color: '#aaccee',
    }).setOrigin(0.5, 0);

    // Subtitle.
    this.add.text(cx, topY + 24, subtitle, {
      fontSize: '10px', color: '#445566',
    }).setOrigin(0.5, 0);

    // Dimmed panel taking the remaining vertical space in this section.
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
