// ─────────────────────────────────────────────────────────────────────────────
// HexagramCollectionScene — compact grid of all 64 hexagrams with hover tooltip
// ─────────────────────────────────────────────────────────────────────────────

import { HEXAGRAM_LIST } from '../data/hexagrams.js';
import run               from '../systems/RunManager.js';

const W  = 1280;
const H  = 720;
const CX = W / 2;

// Grid layout — 8×8 = 64 tiles, all on one screen
const COLS     = 8;
const ROWS     = 8;
const GRID_W   = 880;
const GRID_H   = 520;
const CELL_W   = Math.floor(GRID_W / COLS);
const CELL_H   = Math.floor(GRID_H / ROWS);
const GRID_X   = CX - GRID_W / 2 + CELL_W / 2;
const GRID_TOP = 100;

export class HexagramCollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HexagramCollectionScene' });
  }

  create() {
    this._beaten = new Set(
      JSON.parse(localStorage.getItem('hanatu_beaten_hexagrams') || '[]')
    );

    // Background
    this.add.rectangle(CX, H / 2, W, H, 0x060c18);

    // Header
    this.add.text(CX, 30, 'Hexagram Collection', {
      fontSize: '28px', color: '#e8c96a',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Progress counter
    this.add.text(CX, 64, `Unlocked: ${this._beaten.size} / ${HEXAGRAM_LIST.length}`, {
      fontSize: '13px', color: '#667788',
    }).setOrigin(0.5);

    // Back button
    const backBtn = this.add.text(30, 26, '< Menu', {
      fontSize: '14px', color: '#88aacc',
      backgroundColor: '#1a2a3a',
      padding: { x: 10, y: 5 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ccddee' }));
    backBtn.on('pointerout',  () => backBtn.setStyle({ color: '#88aacc' }));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Hover tooltip panel — fixed at bottom
    const panelY = H - 50;
    this._infoBg = this.add.rectangle(CX, panelY, 860, 70, 0x0a0f1e, 0.92)
      .setStrokeStyle(1, 0x2a3a50).setVisible(false);
    this._infoLabel = this.add.text(CX, panelY - 14, '', {
      fontSize: '14px', color: '#cce0ff', fontStyle: 'bold',
    }).setOrigin(0.5).setVisible(false);
    this._infoDesc = this.add.text(CX, panelY + 10, '', {
      fontSize: '12px', color: '#99aabb',
      wordWrap: { width: 820 }, align: 'center',
    }).setOrigin(0.5, 0).setVisible(false);

    // Render all 64 tiles sorted by number
    const sorted = [...HEXAGRAM_LIST].sort((a, b) => a.number - b.number);

    for (let i = 0; i < sorted.length; i++) {
      const hex = sorted[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = GRID_X + col * CELL_W;
      const y   = GRID_TOP + row * CELL_H;
      const unlocked = this._beaten.has(hex.id);

      const bgColor  = unlocked ? 0x1a2a3a : 0x0e1520;
      const bdrColor = unlocked ? 0x3a5a7a : 0x1a2a3a;

      const bg = this.add.rectangle(x, y, CELL_W - 4, CELL_H - 4, bgColor)
        .setStrokeStyle(1, bdrColor);

      // Number — top-left corner
      this.add.text(x - CELL_W / 2 + 6, y - CELL_H / 2 + 4, `${hex.number}`, {
        fontSize: '9px', color: unlocked ? '#667788' : '#334455',
      }).setOrigin(0, 0);

      // Chinese character(s) — centered, large
      this.add.text(x, y + 2, unlocked ? hex.chineseCharacter : '?', {
        fontSize: '26px', color: unlocked ? '#e8c96a' : '#334455',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      // Interaction
      bg.setInteractive({ useHandCursor: unlocked });
      bg.on('pointerover', () => {
        bg.setFillStyle(unlocked ? 0x2a4a5a : 0x151e28);
        this._showInfo(hex, unlocked);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(bgColor);
        this._hideInfo();
      });
      if (unlocked) {
        bg.on('pointerdown', () => this._showDetail(hex));
      }
    }
  }

  _showInfo(hex, unlocked) {
    if (unlocked) {
      this._infoLabel.setText(`#${hex.number} \u2014 ${hex.chineseCharacter} (${hex.chineseName}) \u2014 ${hex.englishName}`);
      this._infoDesc.setText(hex.description);
    } else {
      this._infoLabel.setText(`#${hex.number} \u2014 ??? (Locked)`);
      this._infoDesc.setText('Complete a run with this hexagram to unlock.');
    }
    this._infoBg.setVisible(true);
    this._infoLabel.setVisible(true);
    this._infoDesc.setVisible(true);
  }

  _hideInfo() {
    this._infoBg.setVisible(false);
    this._infoLabel.setVisible(false);
    this._infoDesc.setVisible(false);
  }

  // ── Detail panel (click to open) ──────────────────────────────────────────

  _showDetail(hex) {
    if (this._detailObjs) this._clearDetail();
    this._detailObjs = [];

    // Overlay
    const overlay = this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.88)
      .setDepth(100).setInteractive();
    this._detailObjs.push(overlay);

    // Panel
    const pw = 520, ph = 400;
    this._detailObjs.push(
      this.add.rectangle(CX, H / 2, pw, ph, 0x0d1b2a)
        .setStrokeStyle(2, 0x3a5a7a).setDepth(101)
    );

    // Chinese character
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 130, hex.chineseCharacter, {
        fontSize: '72px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(102)
    );

    // Pinyin / English name
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 70, `${hex.chineseName}  /  ${hex.englishName}`, {
        fontSize: '18px', color: '#c8d8e8',
      }).setOrigin(0.5).setDepth(102)
    );

    // Number + category
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 44, `#${hex.number}  \u2014  ${hex.category.replace(/_/g, ' ')}`, {
        fontSize: '12px', color: '#556677',
      }).setOrigin(0.5).setDepth(102)
    );

    // Description
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 10, hex.description, {
        fontSize: '14px', color: '#99aabb',
        wordWrap: { width: pw - 60 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(102)
    );

    // "Begin Run" button
    const bY = H / 2 + 120;
    const beginBg = this.add.rectangle(CX, bY, 260, 46, 0x2a4a2a)
      .setStrokeStyle(2, 0x66aa66)
      .setInteractive({ useHandCursor: true }).setDepth(102);
    beginBg.on('pointerover', () => beginBg.setFillStyle(0x3a6a3a));
    beginBg.on('pointerout',  () => beginBg.setFillStyle(0x2a4a2a));
    beginBg.on('pointerdown', () => {
      run.reset();
      run.setHexagram(hex.id);
      this.scene.start('GameScene');
    });
    this._detailObjs.push(beginBg);
    this._detailObjs.push(
      this.add.text(CX, bY, 'Begin Run', {
        fontSize: '16px', color: '#ccff88',
      }).setOrigin(0.5).setDepth(103)
    );

    // "Back" button
    const cY = bY + 54;
    const closeBg = this.add.rectangle(CX, cY, 160, 36, 0x1a2a3a)
      .setStrokeStyle(1, 0x3a5a7a)
      .setInteractive({ useHandCursor: true }).setDepth(102);
    closeBg.on('pointerover', () => closeBg.setFillStyle(0x2a3a4a));
    closeBg.on('pointerout',  () => closeBg.setFillStyle(0x1a2a3a));
    closeBg.on('pointerdown', () => this._clearDetail());
    this._detailObjs.push(closeBg);
    this._detailObjs.push(
      this.add.text(CX, cY, 'Back', {
        fontSize: '14px', color: '#88aacc',
      }).setOrigin(0.5).setDepth(103)
    );
  }

  _clearDetail() {
    if (this._detailObjs) {
      this._detailObjs.forEach(o => o.destroy());
      this._detailObjs = null;
    }
  }
}
