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
import { THREE_MARKS }                  from '../data/consumables.js';
import { YAKU_INFO }                    from '../systems/ScoringEngine.js';

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
    let topY = HEADER_H + 6;

    // Fixed-height sections
    this._drawParamitaSection(RCX, topY, 140);
    topY += 140;
    this._drawConsumablesSection(RCX, topY, 220);
    topY += 220;
    this._drawWuXingForgeSection(RCX, topY, 80);
    topY += 80;

    if (this._isGrove) {
      const remaining = BTN_Y - 38 - topY;
      this._drawFusionSection(RCX, topY, remaining);
    }
  }

  // ── Paramita Upgrades section ─────────────────────────────────────────────

  _drawParamitaSection(cx, topY, height) {
    this.add.text(cx, topY + 4, 'Paramita Upgrades', {
      fontSize: '15px', color: '#cc99ff',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 22, 'Permanently raise yaku bonuses  —  5 ki each', {
      fontSize: '10px', color: '#664488',
    }).setOrigin(0.5, 0);

    // 4 upgrade tiles
    const UPGRADES = [
      { id: 'kasu',    name: 'Rice',   yaku: 'Kasu',    color: '#ddccaa' },
      { id: 'tanzaku', name: 'Tea',    yaku: 'Tanzaku', color: '#aaccdd' },
      { id: 'tane',    name: 'Broth',  yaku: 'Tane',    color: '#aaddaa' },
      { id: 'hikari',  name: 'Honey',  yaku: 'Hikari',  color: '#ffee88' },
    ];

    const tileW   = 128;
    const tileH   = 90;
    const tileGap = 8;
    const totalW  = UPGRADES.length * tileW + (UPGRADES.length - 1) * tileGap;
    const startX  = cx - totalW / 2 + tileW / 2;
    const tileY   = topY + 42 + tileH / 2;

    const upgrades = run.yakuUpgrades;

    for (let i = 0; i < UPGRADES.length; i++) {
      const u        = UPGRADES[i];
      const x        = startX + i * (tileW + tileGap);
      const level    = upgrades[u.id] ?? 0;
      const canAfford = run.ki >= 5;

      // Base bonus from YAKU_INFO
      const yakuKey  = u.yaku.toUpperCase().replace('-', '_');
      const info     = YAKU_INFO[yakuKey] ?? Object.values(YAKU_INFO).find(v => v.name === u.yaku);
      const base     = info ? info.baseBonus : 0;
      const current  = +(base + level * 0.2).toFixed(1);
      const next     = +(base + (level + 1) * 0.2).toFixed(1);

      const bgCol  = canAfford ? 0x1a1030 : 0x0e0818;
      const border = canAfford ? 0x553377 : 0x2a1a3a;
      this.add.rectangle(x, tileY, tileW, tileH, bgCol)
        .setStrokeStyle(1, border);

      this.add.text(x, tileY - tileH / 2 + 8, u.name, {
        fontSize: '12px', color: u.color, fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      this.add.text(x, tileY - tileH / 2 + 22, u.yaku, {
        fontSize: '10px', color: '#665577',
      }).setOrigin(0.5, 0);

      this.add.text(x, tileY - 4, `+${current} → +${next}`,
        { fontSize: '11px', color: '#ccaaee' }
      ).setOrigin(0.5);

      // Buy button
      const btnY    = tileY + tileH / 2 - 16;
      const buyable = canAfford;
      const btnBg   = buyable ? 0x3a1a5a : 0x1a0e2a;
      const btnBdr  = buyable ? 0xaa55dd : 0x3a2a4a;
      const btnTxt  = buyable ? '#cc88ff' : '#443355';

      const btn = this.add.rectangle(x, btnY, tileW - 12, 22, btnBg)
        .setStrokeStyle(1, btnBdr);
      this.add.text(x, btnY, `${buyable ? '' : ''}5 ki`, {
        fontSize: '11px', color: btnTxt,
      }).setOrigin(0.5);

      if (buyable) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x5a2a8a));
        btn.on('pointerout',  () => btn.setFillStyle(btnBg));
        btn.on('pointerdown', () => {
          try {
            run.buyYakuUpgrade(u.id);
            this._buildUI();
          } catch (e) {
            console.warn('[ShrineScene] buyYakuUpgrade:', e.message);
          }
        });
      }
    }
  }

  // ── Consumables section ───────────────────────────────────────────────────

  _drawConsumablesSection(cx, topY, height) {
    this.add.text(cx, topY + 4, 'Consumables', {
      fontSize: '15px', color: '#88ccee',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 22, 'Deck-modification marks  —  5 ki each', {
      fontSize: '10px', color: '#334455',
    }).setOrigin(0.5, 0);

    // Inventory slots display
    const slotCount = run.consumables.length;
    this.add.text(cx, topY + 38,
      `Inventory: ${slotCount} / ${RunManager.MAX_CONSUMABLE_SLOTS}`,
      { fontSize: '11px', color: slotCount >= RunManager.MAX_CONSUMABLE_SLOTS ? '#cc4444' : '#556677' }
    ).setOrigin(0.5, 0);

    // Show current inventory names
    if (slotCount > 0) {
      const names = run.consumables.map(c => c.name).join(', ');
      this.add.text(cx, topY + 54, names, {
        fontSize: '10px', color: '#445566',
        wordWrap: { width: 560 }, align: 'center',
      }).setOrigin(0.5, 0);
    }

    // 3 mark shop cards
    const CARD_W2  = 168;
    const CARD_H2  = 110;
    const CARD_GAP2 = 10;
    const totalW   = THREE_MARKS.length * CARD_W2 + (THREE_MARKS.length - 1) * CARD_GAP2;
    const startX   = cx - totalW / 2 + CARD_W2 / 2;
    const cardY    = topY + 72 + CARD_H2 / 2;

    for (let i = 0; i < THREE_MARKS.length; i++) {
      const mark    = THREE_MARKS[i];
      const x       = startX + i * (CARD_W2 + CARD_GAP2);
      const full    = !run.canAddConsumable;
      const afford  = run.ki >= mark.cost;
      const buyable = afford && !full;

      const bgCol  = 0x0a1a2a;
      const border = buyable ? 0x2a6688 : 0x1a2a3a;
      this.add.rectangle(x, cardY, CARD_W2, CARD_H2, bgCol)
        .setStrokeStyle(1, border);

      this.add.text(x, cardY - CARD_H2 / 2 + 8, mark.name, {
        fontSize: '13px', color: '#88ddff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      this.add.text(x, cardY - CARD_H2 / 2 + 24, mark.description, {
        fontSize: '9px', color: '#445566',
        wordWrap: { width: CARD_W2 - 14 }, align: 'center',
      }).setOrigin(0.5, 0);

      // Buy button
      const btnY2   = cardY + CARD_H2 / 2 - 16;
      const btnBg   = buyable ? 0x1a3a5a : 0x0e1a28;
      const btnBdr  = buyable ? 0x44aacc : 0x1a2a3a;
      const btnLbl  = full ? 'Slots full' : !afford ? "Can't afford" : 'Buy  5 ki';
      const btnTxt  = buyable ? '#88ddff' : '#334455';

      const btn = this.add.rectangle(x, btnY2, CARD_W2 - 12, 22, btnBg)
        .setStrokeStyle(1, btnBdr);
      this.add.text(x, btnY2, btnLbl, {
        fontSize: '11px', color: btnTxt,
      }).setOrigin(0.5);

      if (buyable) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setFillStyle(0x2a5a88));
        btn.on('pointerout',  () => btn.setFillStyle(btnBg));
        btn.on('pointerdown', () => this._buyConsumable(mark));
      }
    }
  }

  // ── Buy consumable → booster pack overlay ────────────────────────────────

  _buyConsumable(markDef) {
    if (run.ki < markDef.cost) return;
    run.spendKi(markDef.cost);
    this._showBoosterPack(markDef);
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

    // Instruction text per mark type
    const instruction = {
      mark_impermanence: 'Click a card to promote it to the next type.',
      mark_nonbeing:     'Click a card to permanently remove it from your deck.',
      mark_transcendence:'Click the SOURCE card (it will be replaced).',
    }[markDef.id] ?? 'Select a card.';

    push(this.add.text(cx, cy - H / 2 + 36, instruction, {
      fontSize: '12px', color: '#557799',
    }).setOrigin(0.5).setDepth(50));

    // Card grid — up to 8 cards in two rows of 4
    const SCALE    = 0.42;
    const CW       = Math.round(105 * SCALE);
    const CH       = Math.round(159 * SCALE);
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
        if (markDef.id === 'mark_impermanence') {
          run.promoteCard(card.id);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          // Add to inventory if player wants to save for later
          // (immediate use — no inventory addition)
          this._buildUI();
        } else if (markDef.id === 'mark_nonbeing') {
          run.deleteCard(card.id);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        } else if (markDef.id === 'mark_transcendence') {
          if (!transcendSource) {
            transcendSource = card;
            spr.setTint(0xffcc44);
            // Update instruction
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
            for (const o of this._confirmObjs) o.destroy();
            this._confirmObjs = [];
            this._buildUI();
          }
        }
      });
    }

    // "Save for Later" button
    const saveBtn = push(this.add.rectangle(cx - 100, cy + H / 2 - 30, 180, 36, 0x1a3a1a)
      .setStrokeStyle(1, 0x44aa66).setInteractive({ useHandCursor: true }).setDepth(51));
    saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x2a5a2a));
    saveBtn.on('pointerout',  () => saveBtn.setFillStyle(0x1a3a1a));
    saveBtn.on('pointerdown', () => {
      try {
        run.addConsumable({ id: markDef.id, name: markDef.name, description: markDef.description, category: markDef.category });
      } catch (e) {
        console.warn('[ShrineScene] addConsumable:', e.message);
      }
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
    push(this.add.text(cx - 100, cy + H / 2 - 30, 'Save for Later', {
      fontSize: '13px', color: '#aaffcc',
    }).setOrigin(0.5).setDepth(51));

    // Cancel button
    const cancelBtn = push(this.add.rectangle(cx + 100, cy + H / 2 - 30, 140, 36, 0x2a1a1a)
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
    push(this.add.text(cx + 100, cy + H / 2 - 30, 'Cancel (refund)', {
      fontSize: '13px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(51));
  }

  // ── Wu Xing Forge section (placeholder) ───────────────────────────────────

  _drawWuXingForgeSection(cx, topY, height) {
    this.add.text(cx, topY + 4, 'Wu Xing Forge', {
      fontSize: '15px', color: '#aaccee',
    }).setOrigin(0.5, 0);
    this.add.text(cx, topY + 22, 'Transform your cards with elemental power', {
      fontSize: '10px', color: '#445566',
    }).setOrigin(0.5, 0);

    const panelH  = height - 40;
    const panelCY = topY + 40 + panelH / 2;
    this.add.rectangle(cx, panelCY, 570, panelH, 0x2a4a3a, 0.2)
      .setStrokeStyle(1, 0x223344);
    this.add.text(cx, panelCY, 'Coming soon\u2026', {
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
