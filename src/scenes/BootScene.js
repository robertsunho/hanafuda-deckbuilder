import { cardImageMap } from '../data/cardImageMap.js';

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
  }

  create() {
    this.scene.start('GameScene');
  }
}
