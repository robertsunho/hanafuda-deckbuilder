// ─────────────────────────────────────────────────────────────────────────────
// HexagramCollectionScene — grid of all 64 hexagrams with lock/unlock states
// ─────────────────────────────────────────────────────────────────────────────

import { HEXAGRAM_LIST } from '../data/hexagrams.js';
import run               from '../systems/RunManager.js';

const W  = 1280;
const H  = 720;
const CX = W / 2;

// Grid layout
const COLS      = 8;
const CELL_W    = 130;
const CELL_H    = 72;
const GRID_X    = CX - (COLS * CELL_W) / 2 + CELL_W / 2;  // left-align first column
const GRID_TOP  = 100;
const PER_PAGE  = 32;  // 4 rows × 8 cols per page

export class HexagramCollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HexagramCollectionScene' });
  }

  create() {
    this._beaten = new Set(
      JSON.parse(localStorage.getItem('hanatu_beaten_hexagrams') || '[]')
    );
    this._page = 0;
    this._totalPages = Math.ceil(HEXAGRAM_LIST.length / PER_PAGE);
    this._gridObjs = [];
    this._detailObjs = [];

    // Background
    this.add.rectangle(CX, H / 2, W, H, 0x060c18);

    // Header
    this.add.text(CX, 30, 'Hexagram Collection', {
      fontSize: '28px', color: '#e8c96a',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Progress counter
    this._progressText = this.add.text(CX, 62, '', {
      fontSize: '13px', color: '#667788',
    }).setOrigin(0.5);
    this._updateProgress();

    // Back button
    const backBtn = this.add.text(30, 26, '< Menu', {
      fontSize: '14px', color: '#88aacc',
      backgroundColor: '#1a2a3a',
      padding: { x: 10, y: 5 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setStyle({ color: '#ccddee' }));
    backBtn.on('pointerout',  () => backBtn.setStyle({ color: '#88aacc' }));
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Pagination controls (persistent)
    this._pageText = this.add.text(CX, H - 30, '', {
      fontSize: '13px', color: '#667788',
    }).setOrigin(0.5);

    this._prevBtn = this.add.text(CX - 100, H - 30, '< Prev', {
      fontSize: '13px', color: '#88aacc',
      backgroundColor: '#1a2a3a', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._prevBtn.on('pointerdown', () => { this._page--; this._renderGrid(); });

    this._nextBtn = this.add.text(CX + 100, H - 30, 'Next >', {
      fontSize: '13px', color: '#88aacc',
      backgroundColor: '#1a2a3a', padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._nextBtn.on('pointerdown', () => { this._page++; this._renderGrid(); });

    this._renderGrid();
  }

  _updateProgress() {
    this._progressText.setText(
      `Unlocked: ${this._beaten.size} / ${HEXAGRAM_LIST.length}`
    );
  }

  // ── Grid rendering ──────────────────────────────────────────────────────
  _renderGrid() {
    this._gridObjs.forEach(o => o.destroy());
    this._gridObjs.length = 0;

    const start = this._page * PER_PAGE;
    const end   = Math.min(start + PER_PAGE, HEXAGRAM_LIST.length);

    for (let idx = start; idx < end; idx++) {
      const hex    = HEXAGRAM_LIST[idx];
      const local  = idx - start;
      const col    = local % COLS;
      const row    = Math.floor(local / COLS);
      const x      = GRID_X + col * CELL_W;
      const y      = GRID_TOP + row * CELL_H;
      const unlocked = this._beaten.has(hex.id);

      // Cell background
      const bg = this.add.rectangle(x, y, CELL_W - 6, CELL_H - 4,
        unlocked ? 0x1a2a3a : 0x0e1520
      ).setStrokeStyle(1, unlocked ? 0x3a5a7a : 0x1a2a3a);
      this._gridObjs.push(bg);

      if (unlocked) {
        // Chinese character
        this._gridObjs.push(
          this.add.text(x - CELL_W / 2 + 10, y - 10, hex.chineseCharacter, {
            fontSize: '26px', color: '#e8c96a',
          }).setOrigin(0, 0.5)
        );

        // Name + number
        this._gridObjs.push(
          this.add.text(x - CELL_W / 2 + 42, y - 14, `#${hex.number}`, {
            fontSize: '10px', color: '#556677',
          }).setOrigin(0, 0.5)
        );
        this._gridObjs.push(
          this.add.text(x - CELL_W / 2 + 42, y + 2, hex.englishName, {
            fontSize: '11px', color: '#aabbcc',
            wordWrap: { width: CELL_W - 52 },
          }).setOrigin(0, 0.5)
        );

        // Category tag
        this._gridObjs.push(
          this.add.text(x + CELL_W / 2 - 8, y + CELL_H / 2 - 10,
            hex.category.replace(/_/g, ' '), {
            fontSize: '8px', color: '#445566',
          }).setOrigin(1, 1)
        );

        // Interactive — open detail
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(0x2a4a5a));
        bg.on('pointerout',  () => bg.setFillStyle(0x1a2a3a));
        bg.on('pointerdown', () => this._showDetail(hex));
      } else {
        // Locked appearance
        this._gridObjs.push(
          this.add.text(x, y - 6, '?', {
            fontSize: '22px', color: '#223344',
          }).setOrigin(0.5)
        );
        this._gridObjs.push(
          this.add.text(x, y + 14, `#${hex.number}`, {
            fontSize: '10px', color: '#223344',
          }).setOrigin(0.5)
        );
      }
    }

    // Update pagination visibility
    this._pageText.setText(`${this._page + 1} / ${this._totalPages}`);
    this._prevBtn.setVisible(this._page > 0);
    this._nextBtn.setVisible(this._page < this._totalPages - 1);
  }

  // ── Detail panel ────────────────────────────────────────────────────────
  _showDetail(hex) {
    this._clearDetail();

    // Overlay
    const overlay = this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.88)
      .setDepth(100).setInteractive();
    this._detailObjs.push(overlay);

    // Panel background
    const pw = 520, ph = 400;
    const panel = this.add.rectangle(CX, H / 2, pw, ph, 0x0d1b2a)
      .setStrokeStyle(2, 0x3a5a7a).setDepth(101);
    this._detailObjs.push(panel);

    // Chinese character
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 130, hex.chineseCharacter, {
        fontSize: '72px', color: '#e8c96a',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(102)
    );

    // Pinyin / English name
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 70,
        `${hex.chineseName}  /  ${hex.englishName}`, {
        fontSize: '18px', color: '#c8d8e8',
      }).setOrigin(0.5).setDepth(102)
    );

    // Number + category
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 44,
        `#${hex.number}  —  ${hex.category.replace(/_/g, ' ')}`, {
        fontSize: '12px', color: '#556677',
      }).setOrigin(0.5).setDepth(102)
    );

    // Description
    this._detailObjs.push(
      this.add.text(CX, H / 2 - 10, hex.description, {
        fontSize: '14px', color: '#99aabb',
        wordWrap: { width: pw - 60 },
        align: 'center',
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
    this._detailObjs.forEach(o => o.destroy());
    this._detailObjs.length = 0;
  }
}
