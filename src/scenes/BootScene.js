import { cardImageMap } from '../data/cardImageMap.js';
import run              from '../systems/RunManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Load all 48 card images, keyed by card id so GameScene can use
    // this.add.image(x, y, cardId) directly.
    for (const [id, path] of Object.entries(cardImageMap)) {
      this.load.image(id, path);
    }
    this.load.image('card_back', 'assets/card_back.png');
  }

  create() {
    const isFirstRun = !localStorage.getItem('hanatu_first_run_complete');

    if (isFirstRun) {
      // First run — skip divination, assign Kun (no_effect) directly
      run.setHexagram('hex_02');
      localStorage.setItem('hanatu_first_run_complete', 'true');
      this.scene.start('GameScene');
    } else {
      this.scene.start('DivinationScene');
    }
  }
}
