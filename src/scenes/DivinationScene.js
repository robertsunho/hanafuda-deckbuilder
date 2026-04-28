// ─────────────────────────────────────────────────────────────────────────────
// DivinationScene — coin-flip hexagram assignment at run start
//
// Flow: 6 coin throws → hexagram reveal → Begin Run → GameScene
// First run is bypassed (hex_02 Kun assigned directly in BootScene).
// ─────────────────────────────────────────────────────────────────────────────

import { throwCoinsOnce }  from '../systems/HexagramGenerator.js';
import { HEXAGRAM_LIST }   from '../data/hexagrams.js';
import run                 from '../systems/RunManager.js';

// ── Layout constants ─────────────────────────────────────────────────────────
const W  = 1280;
const H  = 720;
const CX = W / 2;

// Hexagram frame
const FRAME_X      = CX;
const FRAME_BASE_Y = 420;        // bottom line Y
const LINE_GAP     = 32;         // vertical spacing between lines
const LINE_W       = 180;        // total width of a line
const LINE_H       = 8;          // thickness
const YIN_GAP      = 24;         // gap in the middle of yin line
const LINE_COLOR   = 0xc8a86e;   // gold/copper
const EMPTY_COLOR  = 0x2a3050;   // faint placeholder

// Coin layout
const COIN_Y       = 540;
const COIN_R       = 24;
const COIN_GAP     = 80;
const COIN_HEAD_C  = 0xc8a050;   // gold
const COIN_TAIL_C  = 0x4a5068;   // dark slate

export class DivinationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DivinationScene' });
  }

  create() {
    this._rolledLines = [];
    this._lineGraphics = [];
    this._coinObjs = [];
    this._uiObjs = [];
    this._busy = false;
    this._revealed = false;

    this._drawBackground();
    this._drawTitle();
    this._drawEmptyFrame();
    this._drawThrowButton();

    // Dev-mode hexagram picker
    if (import.meta.env.DEV) {
      this._renderDevSelector();
    }
  }

  // ── Background ───────────────────────────────────────────────────────────
  _drawBackground() {
    this.add.rectangle(CX, H / 2, W, H, 0x060c18);
  }

  // ── Title ────────────────────────────────────────────────────────────────
  _drawTitle() {
    this.add.text(CX, 50, 'Divination', {
      fontSize: '36px', color: '#e8c96a',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(CX, 95, '\u5360', {   // 占
      fontSize: '28px', color: '#8899aa',
    }).setOrigin(0.5);
  }

  // ── Empty hexagram frame (6 placeholder slots, bottom to top) ───────────
  _drawEmptyFrame() {
    for (let i = 0; i < 6; i++) {
      const y = FRAME_BASE_Y - i * LINE_GAP;
      const slot = this.add.rectangle(FRAME_X, y, LINE_W, LINE_H, EMPTY_COLOR)
        .setStrokeStyle(1, 0x3a4060);
      this._lineGraphics.push(slot);
    }
  }

  // ── Throw / Reveal button ───────────────────────────────────────────────
  _drawThrowButton() {
    const btnY = 620;

    this._btnBg = this.add.rectangle(CX, btnY, 220, 48, 0x1a3050)
      .setStrokeStyle(2, 0x4a6a8a)
      .setInteractive({ useHandCursor: true });

    this._btnLabel = this.add.text(CX, btnY, 'Throw Coins', {
      fontSize: '18px', color: '#c8d8e8',
    }).setOrigin(0.5);

    this._counterText = this.add.text(CX, btnY - 38, 'Throw 1 of 6', {
      fontSize: '13px', color: '#667788',
    }).setOrigin(0.5);

    this._btnBg.on('pointerover', () => {
      if (!this._busy) this._btnBg.setFillStyle(0x2a4a6a);
    });
    this._btnBg.on('pointerout', () => {
      if (!this._busy) this._btnBg.setFillStyle(0x1a3050);
    });
    this._btnBg.on('pointerdown', () => this._onButtonClick());
  }

  _onButtonClick() {
    if (this._busy) return;

    if (this._revealed) {
      // "Begin Run" pressed
      this._beginRun();
      return;
    }

    if (this._rolledLines.length >= 6) return;
    this._startCoinSequence();
  }

  // ── Auto-chain all 6 throws on a single click ──────────────────────────
  _startCoinSequence() {
    this._busy = true;
    this._btnBg.setFillStyle(0x141e30);
    this._btnLabel.setAlpha(0.4);
    this._throwNextInSequence();
  }

  _throwNextInSequence() {
    const { coins, line } = throwCoinsOnce();
    const throwIndex = this._rolledLines.length;  // 0-based

    this._counterText.setText(`Throw ${throwIndex + 1} of 6`);

    // Animate coins, then resolve and chain next
    this._animateCoins(coins, () => {
      this._rolledLines.push(line);
      this._drawLine(throwIndex, line);
      this._clearCoins();

      if (this._rolledLines.length === 6) {
        // All 6 thrown — find hexagram and reveal
        this._rolledHexagram = HEXAGRAM_LIST.find(h =>
          h.lines.length === 6 &&
          h.lines.every((v, i) => v === this._rolledLines[i])
        );
        this._counterText.setText('Throw 6 of 6');
        this.time.delayedCall(400, () => this._revealHexagram());
      } else {
        // Brief pause, then throw next
        this.time.delayedCall(300, () => this._throwNextInSequence());
      }
    });
  }

  // ── Coin animation ──────────────────────────────────────────────────────
  _animateCoins(coins, onComplete) {
    this._clearCoins();

    const startY = COIN_Y + 60;
    const frames = 8;
    const duration = 400;

    coins.forEach((isHeads, ci) => {
      const x = CX + (ci - 1) * COIN_GAP;
      const finalColor = isHeads ? COIN_HEAD_C : COIN_TAIL_C;
      const label = isHeads ? '\u9996' : '\u5c3e';  // 首 / 尾

      // Coin circle
      const circle = this.add.circle(x, startY, COIN_R, 0x888888).setAlpha(0);
      // Coin label
      const text = this.add.text(x, startY, '', {
        fontSize: '16px', color: '#000',
      }).setOrigin(0.5).setAlpha(0);

      this._coinObjs.push(circle, text);

      // Animate: drop in + spin (color flicker) then settle
      this.tweens.add({
        targets: [circle, text],
        y: COIN_Y,
        alpha: 1,
        duration: duration * 0.6,
        ease: 'Bounce.easeOut',
      });

      // Flicker colors during spin
      let flickerCount = 0;
      const flickerTimer = this.time.addEvent({
        delay: duration / frames,
        repeat: frames - 1,
        callback: () => {
          flickerCount++;
          const flick = flickerCount % 2 === 0;
          circle.setFillStyle(flick ? COIN_HEAD_C : COIN_TAIL_C);
        },
      });

      // Settle to final state
      this.time.delayedCall(duration, () => {
        flickerTimer.remove();
        circle.setFillStyle(finalColor);
        text.setText(label);
        text.setY(COIN_Y);
      });
    });

    // Callback after animation settles
    this.time.delayedCall(duration + 200, () => {
      if (onComplete) onComplete();
    });
  }

  _clearCoins() {
    this._coinObjs.forEach(o => o.destroy());
    this._coinObjs = [];
  }

  // ── Draw a resolved line in the hexagram frame ──────────────────────────
  _drawLine(index, lineValue) {
    // Destroy the placeholder
    if (this._lineGraphics[index]) {
      this._lineGraphics[index].destroy();
    }

    const y = FRAME_BASE_Y - index * LINE_GAP;

    if (lineValue === 1) {
      // Yang — solid bar
      const bar = this.add.rectangle(FRAME_X, y, LINE_W, LINE_H, LINE_COLOR)
        .setAlpha(0);
      this.tweens.add({ targets: bar, alpha: 1, duration: 300 });
      this._lineGraphics[index] = bar;
    } else {
      // Yin — broken bar (two halves with gap)
      const halfW = (LINE_W - YIN_GAP) / 2;
      const leftX = FRAME_X - YIN_GAP / 2 - halfW / 2;
      const rightX = FRAME_X + YIN_GAP / 2 + halfW / 2;

      const left = this.add.rectangle(leftX, y, halfW, LINE_H, LINE_COLOR).setAlpha(0);
      const right = this.add.rectangle(rightX, y, halfW, LINE_H, LINE_COLOR).setAlpha(0);
      this.tweens.add({ targets: [left, right], alpha: 1, duration: 300 });
      this._lineGraphics[index] = left; // just need reference for cleanup
      this._uiObjs.push(left, right);
    }
  }

  // ── Hexagram reveal ─────────────────────────────────────────────────────
  _revealHexagram() {
    this._revealed = true;
    this._clearCoins();

    const hex = this._rolledHexagram;
    if (!hex) {
      // Fallback — should never happen with valid HEXAGRAM_LIST
      console.warn('[DivinationScene] No matching hexagram found for lines:', this._rolledLines);
      this._btnLabel.setText('Begin Run');
      this._busy = false;
      return;
    }

    // Chinese character — large, positioned above the hexagram frame
    const charText = this.add.text(CX, 160, hex.chineseCharacter, {
      fontSize: '80px', color: '#e8c96a',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this._uiObjs.push(charText);

    // Below the hexagram frame (frame bottom ≈ 420), above Begin Run (620)
    // Pinyin + English name
    const nameText = this.add.text(CX, 462, `${hex.chineseName}  /  ${hex.englishName}`, {
      fontSize: '18px', color: '#c8d8e8',
    }).setOrigin(0.5).setAlpha(0);
    this._uiObjs.push(nameText);

    // Number
    const numText = this.add.text(CX, 490, `Hexagram #${hex.number}`, {
      fontSize: '13px', color: '#667788',
    }).setOrigin(0.5).setAlpha(0);
    this._uiObjs.push(numText);

    // Effect description (word-wrapped)
    const descText = this.add.text(CX, 516, hex.description, {
      fontSize: '14px', color: '#99aabb',
      wordWrap: { width: 500 },
      align: 'center',
    }).setOrigin(0.5, 0).setAlpha(0);
    this._uiObjs.push(descText);

    // Staggered fade-in
    this.tweens.add({ targets: charText, alpha: 1, duration: 600, delay: 0 });
    this.tweens.add({ targets: nameText, alpha: 1, duration: 500, delay: 300 });
    this.tweens.add({ targets: numText, alpha: 1, duration: 400, delay: 500 });
    this.tweens.add({ targets: descText, alpha: 1, duration: 500, delay: 600 });

    // Update button to "Begin Run"
    this.time.delayedCall(800, () => {
      this._btnLabel.setText('Begin Run');
      this._btnBg.setFillStyle(0x2a4a2a);
      this._btnBg.setStrokeStyle(2, 0x66aa66);
      this._counterText.setAlpha(0);
      this._busy = false;
    });
  }

  // ── Begin the run ───────────────────────────────────────────────────────
  _beginRun() {
    const hex = this._rolledHexagram;
    if (hex) {
      run.setHexagram(hex.id);
    }
    this.scene.start('GameScene');
  }

  // ── Dev-mode hexagram picker ────────────────────────────────────────────
  _renderDevSelector() {
    const btn = this.add.text(W - 20, H - 20, 'Dev: Pick Hexagram', {
      fontSize: '12px', color: '#888',
      backgroundColor: '#222',
      padding: { x: 8, y: 4 },
    })
      .setOrigin(1, 1)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._showHexagramPicker());

    // Console shortcut
    window.pickHexagram = (hexagramId) => {
      run.setHexagram(hexagramId);
      this.scene.start('GameScene');
    };
  }

  _showHexagramPicker() {
    // Overlay background
    const overlay = this.add.rectangle(CX, H / 2, W, H, 0x000000, 0.92)
      .setDepth(200)
      .setInteractive();
    const pickerObjs = [overlay];

    // Title
    const title = this.add.text(CX, 30, 'Select Hexagram (Dev Mode)', {
      fontSize: '22px', color: '#e8c96a',
    }).setOrigin(0.5).setDepth(201);
    pickerObjs.push(title);

    // Close button
    const closeBtn = this.add.text(W - 30, 20, 'X', {
      fontSize: '20px', color: '#ff6666',
      backgroundColor: '#333',
      padding: { x: 8, y: 2 },
    }).setOrigin(1, 0).setDepth(201).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => pickerObjs.forEach(o => o.destroy()));
    pickerObjs.push(closeBtn);

    // Pagination state
    const hexagrams = [...HEXAGRAM_LIST].sort((a, b) => a.number - b.number);
    const perPage = 16;
    const totalPages = Math.ceil(hexagrams.length / perPage);
    let currentPage = 0;

    const itemObjs = [];

    const renderPage = () => {
      itemObjs.forEach(o => o.destroy());
      itemObjs.length = 0;

      const start = currentPage * perPage;
      const end = Math.min(start + perPage, hexagrams.length);

      for (let idx = start; idx < end; idx++) {
        const h = hexagrams[idx];
        const row = idx - start;
        const col = row % 2;
        const rowNum = Math.floor(row / 2);
        const x = 160 + col * 520;
        const y = 70 + rowNum * 72;

        // Card-like row
        const bg = this.add.rectangle(x + 220, y + 20, 480, 60, 0x1a2a3a)
          .setStrokeStyle(1, 0x3a5a7a)
          .setDepth(201)
          .setInteractive({ useHandCursor: true });

        const charLabel = this.add.text(x, y + 6, h.chineseCharacter, {
          fontSize: '28px', color: '#e8c96a',
        }).setDepth(202);

        const nameLabel = this.add.text(x + 70, y + 4, `#${h.number} ${h.englishName}`, {
          fontSize: '13px', color: '#c8d8e8',
        }).setDepth(202);

        const effectLabel = this.add.text(x + 70, y + 24, h.effect, {
          fontSize: '11px', color: '#667788',
        }).setDepth(202);

        bg.on('pointerover', () => bg.setFillStyle(0x2a4a6a));
        bg.on('pointerout', () => bg.setFillStyle(0x1a2a3a));
        bg.on('pointerdown', () => {
          run.setHexagram(h.id);
          this.scene.start('GameScene');
        });

        itemObjs.push(bg, charLabel, nameLabel, effectLabel);
      }

      // Page indicator
      const pageText = this.add.text(CX, H - 40, `Page ${currentPage + 1} / ${totalPages}`, {
        fontSize: '14px', color: '#889',
      }).setOrigin(0.5).setDepth(201);
      itemObjs.push(pageText);

      // Prev/Next buttons
      if (currentPage > 0) {
        const prevBtn = this.add.text(CX - 120, H - 40, '< Prev', {
          fontSize: '14px', color: '#88aacc',
          backgroundColor: '#1a2a3a', padding: { x: 8, y: 3 },
        }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
        prevBtn.on('pointerdown', () => { currentPage--; renderPage(); });
        itemObjs.push(prevBtn);
      }
      if (currentPage < totalPages - 1) {
        const nextBtn = this.add.text(CX + 120, H - 40, 'Next >', {
          fontSize: '14px', color: '#88aacc',
          backgroundColor: '#1a2a3a', padding: { x: 8, y: 3 },
        }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
        nextBtn.on('pointerdown', () => { currentPage++; renderPage(); });
        itemObjs.push(nextBtn);
      }
    };

    renderPage();

    // Track item objects for close-button cleanup
    const origClose = closeBtn.listeners('pointerdown')[0];
    closeBtn.removeAllListeners('pointerdown');
    closeBtn.on('pointerdown', () => {
      itemObjs.forEach(o => o.destroy());
      pickerObjs.forEach(o => o.destroy());
    });
  }
}
