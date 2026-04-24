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

  _makeButton(x, y, label, onClick) {
    const w = 280;
    const h = 48;

    const bg = this.add.rectangle(x, y, w, h, 0x1a3050)
      .setStrokeStyle(2, 0x4a6a8a)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '18px', color: '#c8d8e8',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(0x2a4a6a));
    bg.on('pointerout',  () => bg.setFillStyle(0x1a3050));
    bg.on('pointerdown', onClick);

    return { bg, text };
  }
}
