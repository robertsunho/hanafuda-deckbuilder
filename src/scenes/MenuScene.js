// ─────────────────────────────────────────────────────────────────────────────
// MenuScene — main menu / title screen
// ─────────────────────────────────────────────────────────────────────────────

import run from '../systems/RunManager.js';

const W  = 1280;
const H  = 720;
const CX = W / 2;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // Background
    this.add.rectangle(CX, H / 2, W, H, 0x060c18);

    // Title
    this.add.text(CX, 160, 'H A N A T U', {
      fontSize: '52px', color: '#e8c96a',
      stroke: '#000000', strokeThickness: 4,
      letterSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(CX, 220, 'A Hanafuda Deckbuilder', {
      fontSize: '16px', color: '#667788',
    }).setOrigin(0.5);

    // Separator
    this.add.rectangle(CX, 270, 300, 1, 0x2a3a50);

    // Buttons
    let btnY = 340;

    this._makeButton(CX, btnY, 'New Run', () => this._startNewRun());
    btnY += 70;

    this._makeButton(CX, btnY, 'Dev Mode', () => this._startDevRun(), { color: '#ff8844', bg: 0x3a2010, border: 0x8a5a2a });
    btnY += 70;

    // Hexagram Collection — visible only if player has beaten at least one
    const beaten = JSON.parse(localStorage.getItem('hanatu_beaten_hexagrams') || '[]');
    if (beaten.length > 0) {
      this._makeButton(CX, btnY, 'Hexagram Collection', () => {
        this.scene.start('HexagramCollectionScene');
      });
      btnY += 70;
    }

    // Version / footer
    this.add.text(CX, H - 30, 'v0.1', {
      fontSize: '11px', color: '#334455',
    }).setOrigin(0.5);
  }

  _startDevRun() {
    run.startDevModeRun();
    this.scene.start('DivinationScene');
  }

  _startNewRun() {
    run.reset();

    const isFirstRun = !localStorage.getItem('hanatu_first_run_complete');
    if (isFirstRun) {
      run.setHexagram('hex_02');
      localStorage.setItem('hanatu_first_run_complete', 'true');
      this.scene.start('GameScene');
    } else {
      this.scene.start('DivinationScene');
    }
  }

  _makeButton(x, y, label, onClick, style = {}) {
    const w = 280;
    const h = 48;
    const bgCol  = style.bg     ?? 0x1a3050;
    const bdrCol = style.border ?? 0x4a6a8a;
    const txtCol = style.color  ?? '#c8d8e8';

    const bg = this.add.rectangle(x, y, w, h, bgCol)
      .setStrokeStyle(2, bdrCol)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '18px', color: txtCol,
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(bgCol + 0x101010));
    bg.on('pointerout',  () => bg.setFillStyle(bgCol));
    bg.on('pointerdown', onClick);

    return { bg, text };
  }
}
