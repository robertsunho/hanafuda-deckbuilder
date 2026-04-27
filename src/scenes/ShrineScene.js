// ─────────────────────────────────────────────────────────────────────────────
// ShrineScene — between-round shop
//
// Layout (1280 × 720):
//   Top bar         [y 0–120]   spirits (y=62) + consumables (y=62) + info panel
//   4 Quadrants     TL/TR [y 145–305]  BL/BR [y 385–545]
//   Center gap      [y 305–385]  purchase button + reroll
//   Fusion section  [y 555+]     Sacred Grove only
//   Continue btn    [y 690]
// ─────────────────────────────────────────────────────────────────────────────

import run, { RunManager }                      from '../systems/RunManager.js';
import { SPIRIT_CATALOG, getSpiritDef }         from '../data/spirits.js';
import { getAvailableFusions }                  from '../data/fusionRecipes.js';
import { CHAKRA_TOOLS,
         WUXING_CONSUMABLES, getElementDef,
         ALCHEMICAL_CONSUMABLES }               from '../data/consumables.js';
import { PRIMARY_STAMPS, SECONDARY_STAMPS,
         getStampDef }                          from '../data/stamps.js';
import { ZODIAC_CONSUMABLES }                  from '../data/zodiacConsumables.js';
import { generateShopCards }                   from '../data/shopCards.js';
import logger                                   from '../systems/GameplayLogger.js';
import { applyHook }                            from '../systems/HexagramEffects.js';
import { getCardPoints }                        from '../systems/CardMutations.js';

/** Resolve card → Phaser texture key (handles hex-duplicate suffix). */
function _tex(card) { return card.baseImageId ?? card.id; }

// ── Channel badge lookup ───────────────────────────────────────────────────────
const CHANNEL_BADGE = {
  point:          { label: 'POINT',    bgColor: 0x1a3a88, textColor: '#88aaff' },
  additive:       { label: 'MULT+',    bgColor: 0x7a5500, textColor: '#ffdd44' },
  multiplicative: { label: 'MULT\xD7', bgColor: 0x882222, textColor: '#ff8888' },
  both:           { label: 'PT+MULT',  bgColor: 0x3a4a00, textColor: '#ccee55' },
  rank:           { label: 'RANK',     bgColor: 0x4a3a00, textColor: '#ddcc55' },
  utility:        { label: 'UTILITY',  bgColor: 0x2a2a55, textColor: '#9999ff' },
  economy:        { label: 'ECONOMY',  bgColor: 0x1a4422, textColor: '#55cc77' },
  gameplay:       { label: 'GAMEPLAY', bgColor: 0x441a44, textColor: '#cc77cc' },
  symbiont:       { label: 'SYMBIONT', bgColor: 0x1a2a00, textColor: '#99ee44' },
  cross:          { label: 'CROSS',    bgColor: 0x3a2a5a, textColor: '#bb88ff' },
  unity:          { label: 'UNITY',    bgColor: 0x5a4a00, textColor: '#ffee88' },
};

// ── Layout constants ──────────────────────────────────────────────────────────
const BTN_Y = 690;

// Spirit row — matches GameScene exactly
const SPIRIT_GAP     = 76;
const SPIRIT_START_X = 220;
const SPIRIT_Y       = 62;
const SPIRIT_W       = 64;
const SPIRIT_H       = 104;

// Consumable slots — matches GameScene exactly
const CONS_CARD_W = 64;
const CONS_CARD_H = 104;
const CONS_BASE_X = 856;
const CONS_BASE_Y = 62;
const CONS_FAN_X  = SPIRIT_GAP; // full spacing, matches spirit row

// Info panel — matches GameScene exactly
const INFO_X     = 10;
const INFO_TOP_Y = 14;

// Rarity colors — matches GameScene
const RARITY_COLOR = {
  common:    0x667788,
  uncommon:  0x44aa44,
  rare:      0x4488ff,
  legendary: 0xddaa22,
};

// Shop quadrant grid
const SHOP_CX    = 640;
const SHOP_CY    = 345;
const QUAD_W     = 420;
const QUAD_H     = 160;
const CENTER_GAP = 80;
const VERT_GAP   = 80;

const Q_TL = { x: SHOP_CX - CENTER_GAP / 2 - QUAD_W, y: SHOP_CY - VERT_GAP / 2 - QUAD_H }; // 180, 145
const Q_TR = { x: SHOP_CX + CENTER_GAP / 2,           y: SHOP_CY - VERT_GAP / 2 - QUAD_H }; // 680, 145
const Q_BL = { x: SHOP_CX - CENTER_GAP / 2 - QUAD_W, y: SHOP_CY + VERT_GAP / 2         }; // 180, 385
const Q_BR = { x: SHOP_CX + CENTER_GAP / 2,           y: SHOP_CY + VERT_GAP / 2         }; // 680, 385

// Below bottom quads (385 + 160 = 545), +10 gap
const FUSION_Y = SHOP_CY + VERT_GAP / 2 + QUAD_H + 10; // 555

// Shop item card size
const SHOP_CARD_W = 88;
const SHOP_CARD_H = 115;
const SHOP_GAP    = 10;
const QUAD_PAD    = 15;

// ─────────────────────────────────────────────────────────────────────────────

export class ShrineScene extends Phaser.Scene {

  constructor() {
    super({ key: 'ShrineScene' });
  }

  create() {
    const { isGrove } = this.scene.settings.data || {};
    this._isGrove    = isGrove ?? false;
    const _daikokutenBonus = run.legendarySpirits.some(s => s.id === 'legend_daikokuten') ? 1 : 0;
    const baseCount  = (this._isGrove ? 4 : 2) + _daikokutenBonus;
    const itemCount  = applyHook('modifyShopCount', baseCount, baseCount, 'all');

    this._spiritOfferings  = this._generateSpiritOfferings(itemCount);
    this._deckFixOfferings = this._generateDeckFixOfferings(itemCount);
    this._cardOfferings    = generateShopCards(itemCount, this._isGrove);
    this._zodiacOfferings  = this._generateZodiacOfferings(itemCount);

    const pad = arr => { while (arr.length < itemCount) arr.push(null); return arr; };
    pad(this._spiritOfferings);
    pad(this._deckFixOfferings);
    pad(this._cardOfferings);
    pad(this._zodiacOfferings);

    this._confirmObjs  = [];
    this._shopTooltip  = null;
    this._selectedItem = null;
    this._rerollCount  = 0;
    this._rerollCost   = applyHook('modifyRerollCost', 3, 3, this._rerollCount);
    this._buildUI();
  }

  // ── Offering generators ───────────────────────────────────────────────────

  _generateSpiritOfferings(count) {
    const pool = SPIRIT_CATALOG.filter(s => {
      if (s.tier !== 1) return false;
      if (s.legendary) return false;  // legendaries offered separately
      const existing = run.spirits.find(r => r.id === s.id && !r.isNegative);
      const hasNeg   = run.negativeSpirits.some(r => r.id === s.id);
      return !(existing && (existing.stackCount ?? 1) >= 3 && hasNeg);
    });

    const offerings = [];
    for (let i = 0; i < count; i++) {
      // Sacred Grove: 15% chance to offer a Legendary instead.
      if (this._isGrove && Math.random() < 0.15) {
        const leg = this._pickRandomLegendary();
        if (leg) { offerings.push(leg); continue; }
      }
      // Normal spirit from pool.
      if (pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        offerings.push(pool.splice(idx, 1)[0]);
      }
    }
    return offerings;
  }

  _pickRandomLegendary() {
    const ownedIds = new Set(run.legendarySpirits.map(s => s.id));
    const available = SPIRIT_CATALOG.filter(s => s.legendary && !ownedIds.has(s.id));
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  _generateDeckFixOfferings(count) {
    const pool = [
      ...CHAKRA_TOOLS,
      ...WUXING_CONSUMABLES,
      ...PRIMARY_STAMPS,
      ...(this._isGrove ? SECONDARY_STAMPS : []),
    ];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const offerings = [];
    for (let i = 0; i < count; i++) {
      if (this._isGrove && Math.random() < 0.20) {
        const alch = ALCHEMICAL_CONSUMABLES[Math.floor(Math.random() * ALCHEMICAL_CONSUMABLES.length)];
        offerings.push(alch);
      } else if (shuffled.length > 0) {
        offerings.push(shuffled.shift());
      }
    }
    return offerings;
  }

  _generateZodiacOfferings(count) {
    return [...ZODIAC_CONSUMABLES].sort(() => Math.random() - 0.5).slice(0, count);
  }

  // ── UI construction ───────────────────────────────────────────────────────

  _buildUI() {
    this.children.removeAll(true);
    this._confirmObjs = [];
    this._shopTooltip = null;
    logger.logShopEnter(run.ki, this._isGrove);
    const baseCount = this._isGrove ? 4 : 2;
    const itemCount = applyHook('modifyShopCount', baseCount, baseCount, 'all');

    this._drawBg();
    this._drawInfoPanel();
    this._drawPersistentSpirits();
    this._drawPersistentConsumables();

    this._drawQuadrant(Q_TL, 'Spirits',       this._spiritOfferings,  'spirit',  itemCount);
    this._drawQuadrant(Q_TR, 'Deck-Fixing',   this._deckFixOfferings, 'deckfix', itemCount);
    this._drawQuadrant(Q_BL, 'Playing Cards', this._cardOfferings,    'card',    itemCount);
    this._drawQuadrant(Q_BR, 'Zodiacs',       this._zodiacOfferings,  'zodiac',  itemCount);

    this._drawCentralButtons();

    if (this._isGrove) {
      const fusionH = BTN_Y - 38 - FUSION_Y;
      this._drawFusionSection(SHOP_CX, FUSION_Y, fusionH);
    }

    this._drawContinueButton();
  }

  _drawBg() {
    this.add.rectangle(640, 360, 1280, 720, 0x060c18);
    // Separator below spirit/consumable row
    this.add.rectangle(640, 122, 1280, 1, 0x1e2d40);
  }

  // ── Left info panel ────────────────────────────────────────────────────────

  _drawInfoPanel() {
    let y = INFO_TOP_Y;
    this.add.text(INFO_X, y, `Act ${run.act}  R${run.round}/36`, {
      fontSize: '13px', color: '#8899aa',
    });
    y += 20;
    this.add.text(INFO_X, y, `Ki: ${run.ki}`, {
      fontSize: '13px', color: '#ffee88',
    });
    y += 28;
    const shopTitle  = this._isGrove ? 'Sacred Grove' : 'Wayside Shrine';
    const titleColor = this._isGrove ? '#ffcc44' : '#e8c96a';
    this.add.text(INFO_X, y, shopTitle, {
      fontSize: '14px', color: titleColor, fontStyle: 'bold',
      wordWrap: { width: 155 },
    });
    y += 28;
    this.add.rectangle(INFO_X + 72, y, 144, 1, 0x2a3a50);
    y += 8;
    this.add.text(INFO_X, y, `Target: ${run.threshold}`, {
      fontSize: '13px', color: '#cc8866',
    });
  }

  // ── Persistent spirit row (matches GameScene position/style) ───────────────

  _drawPersistentSpirits() {
    const spirits   = run.spirits;
    const fusionIds = this._isGrove
      ? getAvailableFusions(spirits.map(s => s.id)).flatMap(r => r.input)
      : [];

    const spiritSlotCount = run.spiritSlots;
    for (let i = 0; i < spiritSlotCount; i++) {
      const spirit = spirits[i];
      const x = SPIRIT_START_X + i * SPIRIT_GAP;
      const y = SPIRIT_Y;

      if (!spirit) {
        this._addRoundedRect(x, y, SPIRIT_W, SPIRIT_H, 6, 0x0a1628, 1, 0x1e2d40);
        continue;
      }

      const rarityCol = RARITY_COLOR[spirit.rarity] ?? RARITY_COLOR.common;
      this._addRoundedRect(x, y, SPIRIT_W, SPIRIT_H, 6, 0x0d1b2a, 1, rarityCol);
      this.add.rectangle(x - SPIRIT_W / 2 + 2, y, 4, SPIRIT_H - 4, rarityCol);

      this.add.text(x, y, spirit.name, {
        fontSize: '9px', color: '#cce0ff',
        wordWrap: { width: SPIRIT_W - 8 }, align: 'center',
      }).setOrigin(0.5);

      const stackCount = spirit.stackCount ?? 1;
      if (stackCount > 1) {
        this.add.text(x + SPIRIT_W / 2 - 3, y - SPIRIT_H / 2 + 3, `\xD7${stackCount}`, {
          fontSize: '10px', color: '#ffee66', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 2,
        }).setOrigin(1, 0).setDepth(10);
      }

      // Fusion glow at Sacred Grove
      if (fusionIds.includes(spirit.id)) {
        this.add.rectangle(x, y, SPIRIT_W + 4, SPIRIT_H + 4, 0x000000, 0)
          .setStrokeStyle(2, 0xffcc44);
      }

      // Hover tooltip
      const tip = this.add.text(x, y + SPIRIT_H / 2 + 4,
        getSpiritDef(spirit.id)?.description ?? spirit.name,
        {
          fontSize: '10px', color: '#e8e8e8',
          backgroundColor: '#0a0f1e',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 180 },
        }
      ).setOrigin(0.5, 0).setDepth(62).setVisible(false);

      const hit = this.add.rectangle(x, y, SPIRIT_W, SPIRIT_H, 0x000000, 0)
        .setInteractive({ useHandCursor: false }).setDepth(5);
      hit.on('pointerover', () => tip.setVisible(true));
      hit.on('pointerout',  () => tip.setVisible(false));

      // Release ×
      const rel = this.add.text(x + SPIRIT_W / 2 - 5, y - SPIRIT_H / 2 + 5, '\u00D7', {
        fontSize: '11px', color: '#774444',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(12);
      rel.on('pointerover', () => rel.setColor('#ff6666'));
      rel.on('pointerout',  () => rel.setColor('#774444'));
      rel.on('pointerdown', () => this._confirmRelease(i, spirit));
    }

    // Negative spirits (smaller, to the right)
    const neg = run.negativeSpirits;
    const NW  = Math.round(SPIRIT_W * 0.72);
    const NH  = Math.round(SPIRIT_H * 0.65);
    const NX0 = SPIRIT_START_X + spiritSlotCount * SPIRIT_GAP;
    for (let i = 0; i < neg.length; i++) {
      const ns = neg[i];
      const nx = NX0 + i * (NW + 6);
      this._addRoundedRect(nx, SPIRIT_Y, NW, NH, 4, 0x0a1628, 0.7, 0x2a3a4a);
      this.add.text(nx, SPIRIT_Y, ns.name, {
        fontSize: '8px', color: '#667788',
        wordWrap: { width: NW - 6 }, align: 'center',
      }).setOrigin(0.5).setDepth(5);
      this.add.text(nx + NW / 2 - 3, SPIRIT_Y - NH / 2 + 2, '\u2205', {
        fontSize: '9px', color: '#5588aa',
      }).setOrigin(1, 0).setDepth(10);
    }

    // Legendary spirit slots (right of negatives)
    const legSpirits = run.legendarySpirits;
    const legSlots   = run.maxLegendarySlots;
    const LEG_GAP    = SPIRIT_W + 12;
    const LEG_X0     = NX0 + neg.length * (NW + 6) + (neg.length > 0 ? 12 : 0);
    for (let i = 0; i < legSlots; i++) {
      const ls = legSpirits[i];
      const lx = LEG_X0 + i * LEG_GAP;
      if (!ls) {
        this._addRoundedRect(lx, SPIRIT_Y, SPIRIT_W, SPIRIT_H, 6, 0x1a1a0a, 1, 0x4a4a1a);
        this.add.text(lx, SPIRIT_Y + SPIRIT_H / 2 - 6, 'L', {
          fontSize: '8px', color: '#6a6a3a',
        }).setOrigin(0.5);
        continue;
      }
      const legCol = RARITY_COLOR.legendary;
      this._addRoundedRect(lx, SPIRIT_Y, SPIRIT_W, SPIRIT_H, 6, 0x1a1a0a, 1, legCol);
      this.add.rectangle(lx - SPIRIT_W / 2 + 2, SPIRIT_Y, 4, SPIRIT_H - 4, legCol);
      this.add.text(lx, SPIRIT_Y, ls.name, {
        fontSize: '9px', color: '#ffee88',
        wordWrap: { width: SPIRIT_W - 8 }, align: 'center',
      }).setOrigin(0.5);
      const legTip = this.add.text(lx, SPIRIT_Y + SPIRIT_H / 2 + 4,
        getSpiritDef(ls.id)?.description ?? ls.name,
        {
          fontSize: '10px', color: '#e8e8e8',
          backgroundColor: '#0a0f1e',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 180 },
        }
      ).setOrigin(0.5, 0).setDepth(62).setVisible(false);
      const legHit = this.add.rectangle(lx, SPIRIT_Y, SPIRIT_W, SPIRIT_H, 0x000000, 0)
        .setInteractive({ useHandCursor: false }).setDepth(5);
      legHit.on('pointerover', () => legTip.setVisible(true));
      legHit.on('pointerout',  () => legTip.setVisible(false));
      // Sell button
      const legSell = this.add.text(lx + SPIRIT_W / 2 - 5, SPIRIT_Y - SPIRIT_H / 2 + 5, '\u00D7', {
        fontSize: '11px', color: '#774444',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(12);
      legSell.on('pointerover', () => legSell.setColor('#ff6666'));
      legSell.on('pointerout',  () => legSell.setColor('#774444'));
      legSell.on('pointerdown', () => {
        run.sellLegendarySpirit(i);
        this._buildUI();
      });
    }
  }

  // ── Persistent consumable slots (matches GameScene position/style) ──────────

  _drawPersistentConsumables() {
    const maxSlots = run.maxConsumableSlots;
    // Empty slot backgrounds
    for (let i = 0; i < maxSlots; i++) {
      this._addRoundedRect(
        CONS_BASE_X + i * CONS_FAN_X, CONS_BASE_Y,
        CONS_CARD_W, CONS_CARD_H, 6, 0x080e18, 0.8, 0x1e2d40
      );
    }
    // Filled cards
    const consumables = run.consumables;
    for (let i = 0; i < consumables.length; i++) {
      const cons = consumables[i];
      const x    = CONS_BASE_X + i * CONS_FAN_X;
      const y    = CONS_BASE_Y;
      const rarityCol = RARITY_COLOR[cons.rarity] ?? RARITY_COLOR.common;

      this._addRoundedRect(x, y, CONS_CARD_W, CONS_CARD_H, 6, 0x0d1b2a, 1, 0x2a3a50).setDepth(i + 1);
      this.add.rectangle(x - CONS_CARD_W / 2 + 2, y, 4, CONS_CARD_H - 4, rarityCol).setDepth(i + 1);
      this.add.text(x, y, cons.name, {
        fontSize: '11px', color: '#cce0ff',
        wordWrap: { width: CONS_CARD_W - 6 }, align: 'center',
      }).setOrigin(0.5).setDepth(i + 2);

      const tip = this.add.text(x + CONS_CARD_W / 2 + 8, y,
        cons.description ?? '',
        {
          fontSize: '10px', color: '#e8e8e8',
          backgroundColor: '#0a0f1e',
          padding: { x: 6, y: 4 },
          wordWrap: { width: 160 },
        }
      ).setOrigin(0, 0.5).setDepth(62).setVisible(false);

      const hit = this.add.rectangle(x, y, CONS_CARD_W, CONS_CARD_H, 0x000000, 0)
        .setInteractive({ useHandCursor: false }).setDepth(i + 3);
      hit.on('pointerover', () => tip.setVisible(true));
      hit.on('pointerout',  () => tip.setVisible(false));
    }
  }

  // ── Rounded rect helper (matches GameScene _addRoundedRect style) ───────────

  _addRoundedRect(x, y, w, h, r, fill, alpha, stroke, strokeW = 1) {
    const g = this.add.graphics();
    g.fillStyle(fill, alpha ?? 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    if (stroke !== undefined) {
      g.lineStyle(strokeW, stroke, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    }
    return g;
  }

  // ── Quadrant layout ────────────────────────────────────────────────────────

  _getCategoryColor(category) {
    switch (category) {
      case 'spirit':  return 0x4488cc;
      case 'deckfix': return 0xcc8844;
      case 'card':    return 0x44aa66;
      case 'zodiac':  return 0xaa44aa;
      default:        return 0x3a5a8a;
    }
  }

  _getCategoryColorStr(category) {
    switch (category) {
      case 'spirit':  return '#4488cc';
      case 'deckfix': return '#cc8844';
      case 'card':    return '#44aa66';
      case 'zodiac':  return '#aa44aa';
      default:        return '#3a5a8a';
    }
  }

  _drawQuadrant(pos, label, offerings, category, maxItems) {
    const cx = pos.x + QUAD_W / 2;
    const cy = pos.y + QUAD_H / 2;

    this.add.rectangle(cx, cy, QUAD_W, QUAD_H, 0x0a1520)
      .setStrokeStyle(1, 0x1e2d40);
    this.add.rectangle(cx, pos.y + 1.5, QUAD_W - 2, 3, this._getCategoryColor(category), 0.85);

    this.add.text(pos.x + QUAD_PAD, pos.y + 7, label, {
      fontSize: '11px', color: this._getCategoryColorStr(category), fontStyle: 'bold',
    });

    const sold = offerings.filter(o => o === null).length;
    if (sold > 0) {
      this.add.text(pos.x + QUAD_W - QUAD_PAD, pos.y + 7, `${sold}/${maxItems} sold`, {
        fontSize: '9px', color: '#334455',
      }).setOrigin(1, 0);
    }

    const totalCardsW = maxItems * SHOP_CARD_W + (maxItems - 1) * SHOP_GAP;
    const innerW      = QUAD_W - 2 * QUAD_PAD;
    const xPad        = Math.max(0, (innerW - totalCardsW) / 2);
    const cardStartX  = pos.x + QUAD_PAD + xPad + SHOP_CARD_W / 2;
    const cardY       = pos.y + 24 + SHOP_CARD_H / 2;

    for (let i = 0; i < maxItems; i++) {
      this._drawShopCard(
        cardStartX + i * (SHOP_CARD_W + SHOP_GAP),
        cardY,
        i < offerings.length ? offerings[i] : null,
        category, i, offerings,
      );
    }
  }

  _drawShopCard(cx, cy, offering, category, index, offeringsArray) {
    if (!offering) {
      this.add.rectangle(cx, cy, SHOP_CARD_W, SHOP_CARD_H, 0x080e18)
        .setStrokeStyle(1, 0x151e2a);
      this.add.text(cx, cy, 'Sold', { fontSize: '10px', color: '#2a3a4a' }).setOrigin(0.5);
      return;
    }

    const isSelected = (
      this._selectedItem?.category === category &&
      this._selectedItem?.index    === index
    );
    const cost      = this._getItemCost(offering, category);
    const canAfford = run.ki >= cost;
    const canBuy    = canAfford && this._canBuyItem(offering, category);
    const top       = cy - SHOP_CARD_H / 2;
    const bot       = cy + SHOP_CARD_H / 2;

    const bdr  = isSelected ? 0x44ff88 : (canBuy ? this._getCategoryColor(category) : 0x1e2d40);
    const bdrW = isSelected ? 2 : 1;
    this.add.rectangle(cx, cy, SHOP_CARD_W, SHOP_CARD_H, isSelected ? 0x0a2010 : 0x0d1b2a)
      .setStrokeStyle(bdrW, bdr);

    // ── Content ───────────────────────────────────────────────────────────
    if (category === 'card') {
      const card  = offering.card;
      const SCALE = 0.52;
      const CW    = Math.round(64 * SCALE);
      const CH    = Math.round(104 * SCALE);
      const imgY  = top + 8 + CH / 2;
      const spr   = this.add.image(cx, imgY, _tex(card)).setScale(SCALE);
      if (!canAfford) spr.setAlpha(0.5);
      if (offering.preEnhancement) {
        const E_S = { water: 'W', wood: 'L', fire: 'F', earth: 'E', metal: 'M' };
        const E_C = { water: '#4488ff', wood: '#44cc44', fire: '#ff6644', earth: '#cc8822', metal: '#aaaaaa' };
        const enh = offering.preEnhancement;
        this.add.rectangle(cx - CW / 2 + 8, imgY - CH / 2 + 6, 14, 10, 0x000000, 0.7);
        this.add.text(cx - CW / 2 + 8, imgY - CH / 2 + 6,
          (enh.tier === 'upgraded' ? '\u2605' : '') + (E_S[enh.element] ?? '?'),
          { fontSize: '7px', color: E_C[enh.element] ?? '#fff', fontStyle: 'bold' }
        ).setOrigin(0.5);
      }
      if (offering.preRibbon) {
        const stampDef = getStampDef(offering.preRibbon);
        const stampHex = stampDef?.hexColor ?? 0xffffff;
        this.add.circle(cx + CW / 2 - 6, imgY - CH / 2 + 5, 4, stampHex)
          .setStrokeStyle(1, 0x000000);
      }
      this.add.text(cx, imgY + CH / 2 + 3, `[${card.type[0]}] M${card.month}`, {
        fontSize: '8px', color: canAfford ? '#889aaa' : '#445566',
      }).setOrigin(0.5, 0);
    } else {
      let nameColor = '#ddeeff';
      if (category === 'deckfix') {
        const EC = { water: '#4488ff', wood: '#44cc44', fire: '#ff6644', earth: '#cc8822', metal: '#aaaaaa' };
        const CC = {
          chakra_root:         '#ff4444',
          chakra_sacral:       '#ff8844',
          chakra_solar_plexus: '#ffdd44',
          chakra_heart:        '#44cc44',
          chakra_throat:       '#4488ff',
          chakra_third_eye:    '#6644cc',
          chakra_crown:        '#cc44ff',
          // Legacy Four Practices colors (kept for any cached state)
          practice_path: '#88eebb', practice_fasting: '#ddbb88',
          practice_mind: '#bb88ee', practice_tree:    '#88ddbb',
        };
        if (offering.element)    nameColor = EC[offering.element] ?? '#ddeeff';
        else if (offering.color) nameColor = offering.color;
        else                     nameColor = CC[offering.id] ?? '#ddeeff';
      } else if (category === 'zodiac') {
        const CC = { hand: '#88ddcc', field: '#88ccee', yaku: '#ddaaff', ki: '#ffdd88' };
        nameColor = CC[offering.category] ?? '#ddeeff';
      }

      this.add.text(cx, top + 8, offering.name ?? '', {
        fontSize: '11px', color: nameColor, fontStyle: 'bold',
        wordWrap: { width: SHOP_CARD_W - 8 }, align: 'center',
      }).setOrigin(0.5, 0);

      if (category === 'spirit') {
        if (offering.legendary) {
          this.add.rectangle(cx, top + 30, 60, 15, 0x6a5a00, 0.9);
          this.add.text(cx, top + 30, 'LEGENDARY', {
            fontSize: '7px', color: '#ffdd44', fontStyle: 'bold',
          }).setOrigin(0.5);
          if (run.legendarySpirits.some(s => s.id === offering.id)) {
            this.add.text(cx, top + 44, 'Owned', {
              fontSize: '8px', color: '#aaccff',
            }).setOrigin(0.5, 0);
          }
        } else {
          const badge = CHANNEL_BADGE[offering.channel]
                        ?? { label: (offering.channel ?? '?').toUpperCase(), bgColor: 0x333333, textColor: '#888888' };
          this.add.rectangle(cx, top + 30, 60, 15, badge.bgColor, 0.9);
          this.add.text(cx, top + 30, badge.label, {
            fontSize: '8px', color: badge.textColor, fontStyle: 'bold',
          }).setOrigin(0.5);
          const ex = run.spirits.find(s => s.id === offering.id && !s.isNegative);
          const sc = ex ? (ex.stackCount ?? 1) : 0;
          if (sc > 0) {
            const hn = run.negativeSpirits.some(s => s.id === offering.id);
            this.add.text(cx, top + 44, (ex && sc >= 3 && !hn) ? `\xD7${sc} \u2192 TRANSCEND` : `Owned \xD7${sc}`, {
              fontSize: '8px', color: (ex && sc >= 3 && !hn) ? '#ffcc44' : '#aaccff',
            }).setOrigin(0.5, 0);
          }
        }
      }
    }

    // Cost hint (no buy button — selection handled by click)
    this.add.text(cx, bot - 8, `${cost} ki`, {
      fontSize: '10px', color: canAfford ? '#ffee88' : '#cc6644',
    }).setOrigin(0.5, 1);

    // Invisible clickable overlay
    const hit = this.add.rectangle(cx, cy, SHOP_CARD_W, SHOP_CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    hit.on('pointerover', () => {
      if (!isSelected) {
        // Subtle hover: brighten border — avoid full rebuild, just show tooltip
      }
      this._showShopTooltip(cx, top, this._getTooltipLines(offering, category));
    });
    hit.on('pointerout', () => this._hideShopTooltip());
    hit.on('pointerdown', () => {
      this._hideShopTooltip();
      if (isSelected) {
        this._selectedItem = null;
      } else {
        this._selectedItem = { offering, category, index, offeringsArray };
      }
      this._buildUI();
    });
  }

  // ── Tooltip helpers ────────────────────────────────────────────────────────

  _showShopTooltip(x, cardTop, lines) {
    this._hideShopTooltip();
    const tipY = cardTop > 180 ? cardTop - 6 : cardTop + SHOP_CARD_H + 6;
    const orig = cardTop > 180 ? [0.5, 1] : [0.5, 0];
    this._shopTooltip = this.add.text(x, tipY, lines.join('\n'), {
      fontSize: '10px', color: '#ddeeff',
      backgroundColor: '#0a0f1e',
      padding: { x: 8, y: 6 },
      wordWrap: { width: 200 },
      lineSpacing: 2,
    }).setOrigin(orig[0], orig[1]).setDepth(65);
  }

  _hideShopTooltip() {
    if (this._shopTooltip) { this._shopTooltip.destroy(); this._shopTooltip = null; }
  }

  _getTooltipLines(offering, category) {
    const cost = this._getItemCost(offering, category);
    switch (category) {
      case 'spirit':
        return [offering.name, offering.description ?? '', `Cost: ${cost} ki`,
          offering.channel ? `Channel: ${offering.channel}` : ''].filter(Boolean);
      case 'deckfix':
        return [offering.name, offering.description ?? '', `Cost: ${cost} ki`].filter(Boolean);
      case 'card': {
        const c = offering.card;
        return [
          c.name,
          `${c.monthName ?? ''} · ${c.type} · ${getCardPoints(c)}pt`,
          (c.vertical || c.temporal) ? `${c.vertical ?? ''}/${c.temporal ?? ''}` : '',
          offering.preEnhancement ? `Enh: ${offering.preEnhancement.element} (${offering.preEnhancement.tier})` : '',
          offering.preRibbon ? `Stamp: ${offering.preRibbon}` : '',
          `Cost: ${cost} ki`,
        ].filter(Boolean);
      }
      case 'zodiac':
        return [offering.name, offering.description ?? '', `Cost: ${cost} ki`,
          offering.category ? `Type: ${offering.category}` : ''].filter(Boolean);
      default:
        return [(offering.name ?? ''), `${cost} ki`];
    }
  }

  // ── Central buttons (purchase + reroll) ────────────────────────────────────

  _drawCentralButtons() {
    const sel      = this._selectedItem;
    const validSel = sel && sel.offeringsArray[sel.index] !== null;

    // Fixed Y positions — always in the center gap (y 305–385), never jump
    const purchaseY = SHOP_CY - 16;
    const rerollY   = purchaseY + 40;

    // ── Purchase button — always visible ──────────────────────────────────────
    if (validSel) {
      const cost       = this._getItemCost(sel.offering, sel.category);
      const canAfford  = run.ki >= cost;
      const canAcquire = this._canBuyItem(sel.offering, sel.category);
      const canBuy     = canAfford && canAcquire;

      const itemName = sel.category === 'card'
        ? (sel.offering.card?.name ?? 'Card')
        : (sel.offering.name ?? '');

      this.add.text(SHOP_CX, purchaseY - 20, itemName, {
        fontSize: '11px', color: '#ddeeff', fontStyle: 'bold',
      }).setOrigin(0.5);

      const btnBg  = canBuy ? 0x1a5a2a : 0x141e14;
      const btnBdr = canBuy ? 0x44aa66 : 0x2a362a;
      const label  = !canAcquire ? 'Cannot acquire'
                   : !canAfford  ? `Need ${cost} ki`
                   : `Purchase — ${cost} ki`;

      const pBtn = this.add.rectangle(SHOP_CX, purchaseY, 168, 30, btnBg)
        .setStrokeStyle(1, btnBdr);
      this.add.text(SHOP_CX, purchaseY, label, {
        fontSize: '11px', color: canBuy ? '#aaffcc' : '#556666',
      }).setOrigin(0.5);

      if (canBuy) {
        pBtn.setInteractive({ useHandCursor: true });
        pBtn.on('pointerover', () => pBtn.setFillStyle(0x2a7a3a));
        pBtn.on('pointerout',  () => pBtn.setFillStyle(btnBg));
        pBtn.on('pointerdown', () => {
          const s = this._selectedItem;
          this._selectedItem = null;
          this._buyItem(s.offering, s.category, s.index, s.offeringsArray);
        });
      }
    } else {
      // Grayed-out placeholder so layout is stable
      this.add.rectangle(SHOP_CX, purchaseY, 168, 30, 0x0e1520)
        .setStrokeStyle(1, 0x1e2d40);
      this.add.text(SHOP_CX, purchaseY, 'Select an item', {
        fontSize: '11px', color: '#334455',
      }).setOrigin(0.5);
    }

    // ── Reroll button — always visible at fixed Y below purchase ──────────────
    // engine_northern_lion: check for free rerolls.
    const _lionFree = run.spirits
      .reduce((sum, s) => sum + (s.id === 'engine_northern_lion' ? (s.state?.freeRerolls ?? 0) : 0), 0);
    const canReroll = run.ki >= this._rerollCost;
    const canAnyReroll = canReroll || _lionFree > 0;
    const bg  = canAnyReroll ? 0x1a2a4a : 0x0e1520;
    const bdr = canAnyReroll ? 0x3a5a8a : 0x1e2d40;
    const rBtn = this.add.rectangle(SHOP_CX, rerollY, 150, 26, bg).setStrokeStyle(1, bdr);
    const rerollLabel = _lionFree > 0 ? `Reroll  FREE (${_lionFree})` : `Reroll  ${this._rerollCost} ki`;
    this.add.text(SHOP_CX, rerollY, rerollLabel, {
      fontSize: '12px', color: canAnyReroll ? '#aaccee' : '#445566',
    }).setOrigin(0.5);

    if (canAnyReroll) {
      rBtn.setInteractive({ useHandCursor: true });
      rBtn.on('pointerover', () => rBtn.setFillStyle(0x2a3a5a));
      rBtn.on('pointerout',  () => rBtn.setFillStyle(bg));
      rBtn.on('pointerdown', () => {
        if (_lionFree > 0) {
          // Consume one free reroll from the first lion that has one.
          for (const lion of run.spirits) {
            if (lion.id === 'engine_northern_lion' && (lion.state?.freeRerolls ?? 0) > 0) {
              lion.state.freeRerolls--;
              break;
            }
          }
        } else {
          run.spendKi(this._rerollCost);
          this._rerollCount++;
          const baseCost = 3 + this._rerollCount * 2;
          this._rerollCost = applyHook('modifyRerollCost', baseCost, baseCost, this._rerollCount);
        }
        const _daikokutenBonusReroll = run.legendarySpirits.some(s => s.id === 'legend_daikokuten') ? 1 : 0;
        const baseIc = (this._isGrove ? 4 : 2) + _daikokutenBonusReroll;
        const ic = applyHook('modifyShopCount', baseIc, baseIc, 'all');
        this._rerollSection(this._spiritOfferings,  () => this._generateSpiritOfferings(ic));
        this._rerollSection(this._deckFixOfferings, () => this._generateDeckFixOfferings(ic));
        this._rerollSection(this._cardOfferings,    () => generateShopCards(ic, this._isGrove));
        this._rerollSection(this._zodiacOfferings,  () => this._generateZodiacOfferings(ic));
        this._selectedItem = null;
        this._buildUI();
      });
    }
  }

  _rerollSection(currentOfferings, generateFn) {
    const fresh = generateFn();
    for (let i = 0; i < currentOfferings.length; i++) {
      currentOfferings[i] = fresh[i] ?? null;
    }
  }

  // ── Loadout slot (used by release confirm) ─────────────────────────────────

  _drawLoadoutSlot(cx, cy, spirit, w, h, spiritIndex = -1) {
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
      const rel = this.add.text(cx + w / 2 - 7, cy - h / 2 + 7, '\u00D7', {
        fontSize: '11px', color: '#774444',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      rel.on('pointerover', () => rel.setColor('#ff6666'));
      rel.on('pointerout',  () => rel.setColor('#774444'));
      rel.on('pointerdown', () => this._confirmRelease(spiritIndex, spirit));
    } else {
      this.add.text(cx, cy, '\u2014', { fontSize: '14px', color: '#1e2d40' }).setOrigin(0.5);
    }
  }

  // ── Release confirmation ───────────────────────────────────────────────────

  _confirmRelease(index, spirit) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const cx = 640, cy = 360;
    const push = obj => { this._confirmObjs.push(obj); return obj; };

    push(this.add.rectangle(cx, cy, 400, 150, 0x0a0f1e, 0.97)
      .setStrokeStyle(2, 0xaa4444).setDepth(50));
    push(this.add.text(cx, cy - 44, `Release ${spirit.name}?`, {
      fontSize: '16px', color: '#ff8888',
    }).setOrigin(0.5).setDepth(50));
    push(this.add.text(cx, cy - 22, 'No ki refund. This cannot be undone.', {
      fontSize: '11px', color: '#887777',
    }).setOrigin(0.5).setDepth(50));

    const yesBtn = push(this.add.rectangle(cx - 60, cy + 20, 90, 30, 0x6a1a1a)
      .setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(50));
    yesBtn.on('pointerover', () => yesBtn.setFillStyle(0x8a2a2a));
    yesBtn.on('pointerout',  () => yesBtn.setFillStyle(0x6a1a1a));
    yesBtn.on('pointerdown', () => {
      run.releaseSpirit(index);
      logger.logShopPurchase('release', spirit.name, 0, 'Spirit released');
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
    push(this.add.text(cx - 60, cy + 20, 'Release', {
      fontSize: '12px', color: '#ff8888',
    }).setOrigin(0.5).setDepth(50));

    const noBtn = push(this.add.rectangle(cx + 60, cy + 20, 90, 30, 0x1a1a2a)
      .setStrokeStyle(1, 0x445566).setInteractive({ useHandCursor: true }).setDepth(50));
    noBtn.on('pointerover', () => noBtn.setFillStyle(0x2a2a4a));
    noBtn.on('pointerout',  () => noBtn.setFillStyle(0x1a1a2a));
    noBtn.on('pointerdown', () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
    });
    push(this.add.text(cx + 60, cy + 20, 'Cancel', {
      fontSize: '12px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(50));
  }

  // ── Buy routing ───────────────────────────────────────────────────────────

  _getItemCost(offering, category) {
    if (!offering) return 0;
    if (category === 'spirit' && offering.legendary) return RunManager.LEGENDARY_PURCHASE_COST;
    return category === 'card'
      ? this._price(offering.price)
      : this._price(offering.cost ?? 0);
  }

  _canBuyItem(offering, category) {
    if (!offering) return false;
    switch (category) {
      case 'spirit': {
        if (offering.legendary) return run.canAddLegendary;
        const existing = run.spirits.find(s => s.id === offering.id && !s.isNegative);
        return existing ? true : run.canAddSpirit;
      }
      case 'zodiac': return run.canAddConsumable;
      default:       return true;
    }
  }

  _buyItem(offering, category, index, offeringsArray) {
    this._selectedItem = null;
    switch (category) {

      case 'spirit': {
        if (offering.legendary) {
          const cost = RunManager.LEGENDARY_PURCHASE_COST;
          if (run.ki < cost) break;
          const result = run.addLegendarySpirit(offering);
          if (result.success) {
            run.spendKi(cost);
            logger.logShopPurchase('legendary', offering.name, cost);
            offeringsArray[index] = null;
            this._buildUI();
          }
          break;
        }
        const result = run.buySpirit(offering);
        if (result.success) {
          const discount = offering.cost - this._price(offering.cost);
          if (discount > 0) run.addKi(discount);
          logger.logShopPurchase('spirit', offering.name, this._price(offering.cost));
          if ((result.result ?? '') === 'transcended') {
            logger.logShopPurchase('spirit_transcend', offering.name, 0);
          }
          offeringsArray[index] = null;
          this._buildUI();
        }
        break;
      }

      case 'deckfix': {
        const cost = this._price(offering.cost);
        if (offering.category === 'alchemical') {
          run.spendKi(cost);
          logger.logShopPurchase('alchemical', offering.name, cost);
          offeringsArray[index] = null;
          this._activateAlchemical(offering);
          break;
        }
        if (offering.id.startsWith('chakra_')) {
          run.spendKi(cost);
          logger.logShopPurchase('chakra', offering.name, cost);
          offeringsArray[index] = null;
          this._showChakraOverlay(offering);
        } else if (offering.id.startsWith('practice_')) {
          // Legacy Four Practices — keep routing for backward compat.
          run.spendKi(cost);
          logger.logShopPurchase('practice', offering.name, cost);
          offeringsArray[index] = null;
          this._showPracticeOverlay(offering);
        } else if (offering.id.startsWith('element_')) {
          offeringsArray[index] = null;
          this._buyConsumable(offering);
        } else {
          this._showStampCardSelector(offering, () => { offeringsArray[index] = null; });
        }
        break;
      }

      case 'card': {
        const cost   = this._price(offering.price);
        const result = run.buyCard(offering.card, cost);
        if (result.success) {
          logger.logShopPurchase('card', offering.card.name ?? offering.card.id, cost);
          offeringsArray[index] = null;
          this._buildUI();
        }
        break;
      }

      case 'zodiac': {
        const result = run.buyConsumable(offering.id);
        if (result.success) {
          const discount = offering.cost - this._price(offering.cost);
          if (discount > 0) run.addKi(discount);
          logger.logConsumableUse(offering.name, 'purchased');
          offeringsArray[index] = null;
          this._buildUI();
        }
        break;
      }
    }
  }

  // ── Chakra Tool overlays ──────────────────────────────────────────────────

  _showChakraOverlay(def) {
    switch (def.id) {
      case 'chakra_root':         this._showRootOverlay(def);         break;
      case 'chakra_sacral':       this._showSacralOverlay(def);       break;
      case 'chakra_solar_plexus': this._showSolarPlexusOverlay(def);  break;
      case 'chakra_heart':        this._showHeartOverlay(def);        break;
      case 'chakra_throat':       this._showThroatOverlay(def);       break;
      case 'chakra_third_eye':    this._showThirdEyeOverlay(def);     break;
      case 'chakra_crown':        this._showCrownOverlay(def);        break;
    }
  }

  _showRootOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title:       `Root Chakra  (${def.cost} ki paid)`,
        instruction: `Select up to 3 cards to toggle day↔night. Selected: ${selectedIds.size}/3`,
        cards:       run.getDeck(),
        selectedIds,
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 3) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Toggle (${selectedIds.size})` : null,
        onAction: () => {
          run.applyChakraRoot([...selectedIds]);
          logger.logConsumableUse(def.name, `toggled temporal on ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showSacralOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title:       `Sacral Chakra  (${def.cost} ki paid)`,
        instruction: `Select up to 3 cards to advance their month. Selected: ${selectedIds.size}/3`,
        cards:       run.getDeck(),
        selectedIds,
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 3) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Advance (${selectedIds.size})` : null,
        onAction: () => {
          run.applyChakraSacral([...selectedIds]);
          logger.logConsumableUse(def.name, `advanced month on ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showSolarPlexusOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title:       `Solar Plexus Chakra  (${def.cost} ki paid)`,
        instruction: `Select up to 2 cards to cycle type. Selected: ${selectedIds.size}/2`,
        cards:       run.getDeck(),
        selectedIds,
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 2) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Cycle Type (${selectedIds.size})` : null,
        onAction: () => {
          run.applyChakraSolarPlexus([...selectedIds]);
          logger.logConsumableUse(def.name, `cycled type on ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showHeartOverlay(def) {
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title:       `Heart Chakra  (${def.cost} ki paid)`,
        instruction: 'Select 1 card to receive a random edition (Gold/Crystal/Ghost).',
        cards:       run.getDeck(),
        selectedIds: new Set(),
        onSelect: (card) => {
          const result = run.applyChakraHeart(card.id);
          if (result.success) {
            logger.logConsumableUse(def.name, `applied ${result.edition} edition to ${card.id}`);
            for (const o of this._confirmObjs) o.destroy();
            this._confirmObjs = [];
            this._buildUI();
          }
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showThroatOverlay(def) {
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title:       `Throat Chakra  (${def.cost} ki paid)`,
        instruction: 'Select 1 card to duplicate into your deck.',
        cards:       run.getDeck(),
        selectedIds: new Set(),
        onSelect: (card) => {
          const result = run.applyChakraThroat(card.id);
          if (result.success) {
            logger.logConsumableUse(def.name, `duplicated ${card.id}`);
            for (const o of this._confirmObjs) o.destroy();
            this._confirmObjs = [];
            this._buildUI();
          }
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showThirdEyeOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title:       `Third Eye Chakra  (${def.cost} ki paid)`,
        instruction: `Select up to 2 cards to permanently delete. Selected: ${selectedIds.size}/2`,
        cards:       run.getDeck(),
        selectedIds,
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 2) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Delete (${selectedIds.size})` : null,
        onAction: () => {
          run.applyChakraThirdEye([...selectedIds]);
          logger.logConsumableUse(def.name, `deleted ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showCrownOverlay(def) {
    let sourceCard = null;
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      const deck   = run.getDeck();
      const phase2 = sourceCard !== null;
      this._buildPracticeGrid({
        title: `Crown Chakra  (${def.cost} ki paid)`,
        instruction: phase2
          ? `Source: ${sourceCard.name}. Step 2: Click the card to receive this identity.`
          : 'Step 1: Click the card whose identity you want to copy.',
        cards:       phase2 ? deck.filter(c => c.id !== sourceCard.id) : deck,
        selectedIds: new Set(sourceCard ? [sourceCard.id] : []),
        onSelect: (card) => {
          if (!phase2) { sourceCard = card; render(); }
          else {
            const result = run.applyChakraCrown(sourceCard.id, card.id);
            if (result.success) {
              logger.logConsumableUse(def.name, `${sourceCard.id} identity → ${card.id}`);
              for (const o of this._confirmObjs) o.destroy();
              this._confirmObjs = [];
              this._buildUI();
            }
          }
        },
        onCancel: refund,
      });
    };
    render();
  }

  // ── Four Practices overlays ────────────────────────────────────────────────

  _showPracticeOverlay(def) {
    if (def.id === 'practice_path')    { this._showPathOverlay(def);    return; }
    if (def.id === 'practice_fasting') { this._showFastingOverlay(def); return; }
    if (def.id === 'practice_mind')    { this._showMindOverlay(def);    return; }
    if (def.id === 'practice_tree')    { this._showTreeOverlay(def);    return; }
  }

  _buildPracticeGrid({ title, instruction, cards, selectedIds, disabledFn, onSelect, actionLabel, onAction, onCancel }) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];
    const push = obj => { this._confirmObjs.push(obj); return obj; };

    const cx = 640, cy = 356, W = 920, H = 556;
    const SCALE = 0.50;
    const CW    = Math.round(64 * SCALE);
    const CH    = Math.round(104 * SCALE);
    const COLS  = 8, GAP = 6, ROWH = CH + 22;

    push(this.add.rectangle(cx, cy, W, H, 0x040810, 0.97)
      .setStrokeStyle(2, 0x2a5a88).setDepth(50));
    push(this.add.text(cx, cy - H / 2 + 16, title, {
      fontSize: '16px', color: '#88ddff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50));
    push(this.add.text(cx, cy - H / 2 + 36, instruction, {
      fontSize: '11px', color: '#557799', wordWrap: { width: W - 40 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(50));

    const gridW      = COLS * CW + (COLS - 1) * GAP;
    const gridStartX = cx - gridW / 2 + CW / 2;
    const gridStartY = cy - H / 2 + 58;
    const noDisabled = disabledFn ?? (() => false);

    for (let i = 0; i < cards.length; i++) {
      const card     = cards[i];
      const col      = i % COLS;
      const row      = Math.floor(i / COLS);
      const x        = gridStartX + col * (CW + GAP);
      const y        = gridStartY + row * ROWH + CH / 2;
      const disabled = noDisabled(card);
      const selected = selectedIds ? selectedIds.has(card.id) : false;

      const spr = push(this.add.image(x, y, _tex(card)).setScale(SCALE).setDepth(51));
      if (disabled)      spr.setAlpha(0.3);
      else if (selected) spr.setTint(0xffcc44);

      push(this.add.text(x, y + CH / 2 + 2,
        `${card.name?.split(' ')[0] ?? ''} [${card.type[0]}]`,
        { fontSize: '7px', color: selected ? '#ffcc44' : '#667788', align: 'center' }
      ).setOrigin(0.5, 0).setDepth(51));

      if (!disabled) {
        spr.setInteractive({ useHandCursor: true });
        spr.on('pointerover', () => { if (!selected) spr.setTint(0xaaddff); });
        spr.on('pointerout',  () => { if (selected) spr.setTint(0xffcc44); else spr.clearTint(); });
        spr.on('pointerdown', () => onSelect(card));
      }
    }

    const btnY = cy + H / 2 - 28;
    if (actionLabel && onAction) {
      const aBtn = push(this.add.rectangle(cx - 80, btnY, 150, 34, 0x1a4a1a)
        .setStrokeStyle(1, 0x44cc66).setInteractive({ useHandCursor: true }).setDepth(52));
      aBtn.on('pointerover', () => aBtn.setFillStyle(0x2a6a2a));
      aBtn.on('pointerout',  () => aBtn.setFillStyle(0x1a4a1a));
      aBtn.on('pointerdown', onAction);
      push(this.add.text(cx - 80, btnY, actionLabel, { fontSize: '12px', color: '#aaffcc' })
        .setOrigin(0.5).setDepth(52));
    }
    const cBtn = push(this.add.rectangle(cx + 70, btnY, 140, 34, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(52));
    cBtn.on('pointerover', () => cBtn.setFillStyle(0x4a2a2a));
    cBtn.on('pointerout',  () => cBtn.setFillStyle(0x2a1a1a));
    cBtn.on('pointerdown', onCancel);
    push(this.add.text(cx + 70, btnY, 'Cancel (refund)', { fontSize: '11px', color: '#ffaaaa' })
      .setOrigin(0.5).setDepth(52));
  }

  _showPathOverlay(def) {
    let targetCard = null;
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      const deck   = run.getDeck();
      const phase2 = targetCard !== null;
      this._buildPracticeGrid({
        title: `Path  (${def.cost} ki paid)`,
        instruction: phase2
          ? `Target: ${targetCard.name} (month ${targetCard.month}). Select up to 4 cards. Selected: ${selectedIds.size}/4`
          : 'Step 1: Click the card whose month you want to copy to others.',
        cards:       phase2 ? deck.filter(c => c.id !== targetCard.id) : deck,
        selectedIds: phase2 ? selectedIds : new Set(),
        onSelect: (card) => {
          if (!phase2) { targetCard = card; selectedIds.clear(); render(); }
          else {
            if (selectedIds.has(card.id)) selectedIds.delete(card.id);
            else if (selectedIds.size < 4) selectedIds.add(card.id);
            render();
          }
        },
        actionLabel: phase2 && selectedIds.size > 0 ? `Confirm (${selectedIds.size})` : null,
        onAction: () => {
          run.applyPath(targetCard.id, [...selectedIds]);
          logger.logConsumableUse(def.name, `month ${targetCard.month} → ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showFastingOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title: `Fasting  (${def.cost} ki paid)`,
        instruction: `Select up to 3 cards to promote. Bright cards cannot be promoted. Selected: ${selectedIds.size}/3`,
        cards:       run.getDeck(),
        selectedIds,
        disabledFn:  (c) => c.type === 'bright',
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 3) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Confirm (${selectedIds.size})` : null,
        onAction: () => {
          run.applyFasting([...selectedIds]);
          logger.logConsumableUse(def.name, `promoted ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showMindOverlay(def) {
    const selectedIds = new Set();
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      this._buildPracticeGrid({
        title: `Mind  (${def.cost} ki paid)`,
        instruction: `Select up to 2 cards to permanently delete. Selected: ${selectedIds.size}/2`,
        cards:       run.getDeck(),
        selectedIds,
        onSelect: (card) => {
          if (selectedIds.has(card.id)) selectedIds.delete(card.id);
          else if (selectedIds.size < 2) selectedIds.add(card.id);
          render();
        },
        actionLabel: selectedIds.size > 0 ? `Delete (${selectedIds.size})` : null,
        onAction: () => {
          run.applyMind([...selectedIds]);
          logger.logConsumableUse(def.name, `deleted ${selectedIds.size} cards`);
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._buildUI();
        },
        onCancel: refund,
      });
    };
    render();
  }

  _showTreeOverlay(def) {
    let sourceCard = null;
    const refund = () => {
      run.addKi(def.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    };
    const render = () => {
      const deck   = run.getDeck();
      const phase2 = sourceCard !== null;
      this._buildPracticeGrid({
        title: `Tree  (${def.cost} ki paid)`,
        instruction: phase2
          ? `Transforming: ${sourceCard.name}. Step 2: Click the card to copy from.`
          : 'Step 1: Click the card you want to transform.',
        cards:       phase2 ? deck.filter(c => c.id !== sourceCard.id) : deck,
        selectedIds: new Set(sourceCard ? [sourceCard.id] : []),
        onSelect: (card) => {
          if (!phase2) { sourceCard = card; render(); }
          else {
            run.applyTree(sourceCard.id, card.id);
            logger.logConsumableUse(def.name, `${sourceCard.id} → copy of ${card.id}`);
            for (const o of this._confirmObjs) o.destroy();
            this._confirmObjs = [];
            this._buildUI();
          }
        },
        onCancel: refund,
      });
    };
    render();
  }

  // ── Buy consumable → use-or-carry ─────────────────────────────────────────

  _buyConsumable(markDef) {
    const pCost = this._price(markDef.cost);
    if (run.ki < pCost) return;
    run.spendKi(pCost);
    logger.logShopPurchase('consumable', markDef.name, pCost);
    this._showUseOrCarryChoice(markDef);
  }

  _showUseOrCarryChoice(markDef) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const cx   = 640, cy = 360;
    const push = obj => { this._confirmObjs.push(obj); return obj; };
    const canCarry = run.canAddConsumable;

    push(this.add.rectangle(cx, cy, 380, 220, 0x040810, 0.97)
      .setStrokeStyle(2, 0x2a5a88).setDepth(55));
    push(this.add.text(cx, cy - 80, markDef.name, {
      fontSize: '17px', color: '#88ddff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(55));
    push(this.add.text(cx, cy - 52, 'How would you like to use this?', {
      fontSize: '12px', color: '#557799',
    }).setOrigin(0.5).setDepth(55));

    const useBtn = push(this.add.rectangle(cx, cy - 8, 260, 36, 0x1a3a5a)
      .setStrokeStyle(1, 0x44aacc).setInteractive({ useHandCursor: true }).setDepth(56));
    useBtn.on('pointerover', () => useBtn.setFillStyle(0x2a5a88));
    useBtn.on('pointerout',  () => useBtn.setFillStyle(0x1a3a5a));
    useBtn.on('pointerdown', () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._showBoosterPack(markDef);
    });
    push(this.add.text(cx, cy - 8, 'Use Now  (pick from 8 cards)', {
      fontSize: '12px', color: '#88ddff',
    }).setOrigin(0.5).setDepth(56));

    const carryBg  = canCarry ? 0x1a3a1a : 0x1a1a1a;
    const carryBr  = canCarry ? 0x44aa66 : 0x334433;
    const carryBtn = push(this.add.rectangle(cx, cy + 38, 260, 36, carryBg)
      .setStrokeStyle(1, carryBr).setDepth(56));
    if (canCarry) {
      carryBtn.setInteractive({ useHandCursor: true });
      carryBtn.on('pointerover', () => carryBtn.setFillStyle(0x2a5a2a));
      carryBtn.on('pointerout',  () => carryBtn.setFillStyle(0x1a3a1a));
      carryBtn.on('pointerdown', () => {
        try {
          run.addConsumable({ id: markDef.id, name: markDef.name,
            description: markDef.description, category: markDef.category });
          logger.logConsumableUse(markDef.name, 'carried into round');
        } catch (e) { console.warn('[ShrineScene] addConsumable:', e.message); }
        for (const o of this._confirmObjs) o.destroy();
        this._confirmObjs = [];
        this._buildUI();
      });
    }
    push(this.add.text(cx, cy + 38,
      canCarry ? 'Carry into Round' : 'Inventory full',
      { fontSize: '12px', color: canCarry ? '#aaffcc' : '#554433' }
    ).setOrigin(0.5).setDepth(56));

    const cancelBtn = push(this.add.rectangle(cx, cy + 84, 160, 30, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(56));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x4a2a2a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x2a1a1a));
    cancelBtn.on('pointerdown', () => {
      run.addKi(markDef.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
    push(this.add.text(cx, cy + 84, 'Cancel (refund)', {
      fontSize: '11px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(56));
  }

  _showBoosterPack(markDef) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const deck     = run.getDeck();
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

    const ELEMENT_NAMES = {
      water: 'Snow (2× pts)', wood: 'Leaf (slot bypass)', fire: 'Ember (wildcard)',
      earth: 'Clay (ki interest)', metal: 'Iron (proc chance)',
    };
    let instruction = 'Select a card.';
    if (markDef.id === 'mark_impermanence')       instruction = 'Click a card to promote it.';
    else if (markDef.id === 'mark_nonbeing')       instruction = 'Click a card to permanently remove it.';
    else if (markDef.id === 'mark_transcendence')  instruction = 'Click the SOURCE card (it will be replaced).';
    else if (markDef.id.startsWith('element_'))   instruction = `Apply ${ELEMENT_NAMES[markDef.element] ?? markDef.name}.`;

    push(this.add.text(cx, cy - H / 2 + 36, instruction, {
      fontSize: '12px', color: '#557799',
    }).setOrigin(0.5).setDepth(50));

    const SCALE    = 0.68;
    const CW       = Math.round(64 * SCALE);
    const CH       = Math.round(104 * SCALE);
    const GAP      = 12;
    const perRow   = 4;
    const gridW    = perRow * CW + (perRow - 1) * GAP;
    const gridStartX = cx - gridW / 2 + CW / 2;
    const gridStartY = cy - 60;

    let transcendSource = null;

    for (let i = 0; i < preview.length; i++) {
      const card = preview[i];
      const col  = i % perRow;
      const row  = Math.floor(i / perRow);
      const x    = gridStartX + col * (CW + GAP);
      const y    = gridStartY + row * (CH + GAP + 22);

      const spr = push(this.add.image(x, y, _tex(card)).setScale(SCALE).setDepth(51));
      push(this.add.text(x, y + CH / 2 + 2, card.name, {
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
        const close = () => {
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
        };
        if (markDef.id === 'mark_impermanence') {
          run.promoteCard(card.id);
          logger.logConsumableUse(markDef.name, `promoted ${card.id} at shop`);
          close(); this._buildUI();
        } else if (markDef.id === 'mark_nonbeing') {
          run.deleteCard(card.id);
          logger.logConsumableUse(markDef.name, `deleted ${card.id} at shop`);
          close(); this._buildUI();
        } else if (markDef.id === 'mark_transcendence') {
          if (!transcendSource) {
            transcendSource = card;
            spr.setTint(0xffcc44);
            for (const o of this._confirmObjs) { if (o._isTargetInstruction) o.destroy(); }
            const instr = push(this.add.text(cx, cy - H / 2 + 36,
              `Source: ${card.name}. Now click the TARGET card.`,
              { fontSize: '12px', color: '#ffcc44' }
            ).setOrigin(0.5).setDepth(51));
            instr._isTargetInstruction = true;
          } else {
            run.transcendCard(transcendSource.id, card.id);
            logger.logConsumableUse(markDef.name, `${transcendSource.id} → ${card.id} at shop`);
            close(); this._buildUI();
          }
        } else if (markDef.id.startsWith('element_')) {
          const element = markDef.element ?? markDef.id.replace('element_', '');
          const result  = run.applyElement(card.id, element);
          if (result.action === 'stripped' && result.returnedConsumable) {
            const rd = getElementDef(result.returnedConsumable);
            if (rd && run.canAddConsumable) {
              try { run.addConsumable({ id: rd.id, name: rd.name, description: rd.description, category: rd.category }); }
              catch (_) {}
            }
          }
          logger.logConsumableUse(markDef.name, `${result.action} on ${card.id} at shop`);
          close(); this._buildUI();
        }
      });
    }

    const cancelBtn = push(this.add.rectangle(cx, cy + H / 2 - 30, 140, 36, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(51));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x4a2a2a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x2a1a1a));
    cancelBtn.on('pointerdown', () => {
      run.addKi(markDef.cost);
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
    push(this.add.text(cx, cy + H / 2 - 30, 'Cancel (refund)', {
      fontSize: '13px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(51));
  }

  // ── Stamp card selector ────────────────────────────────────────────────────

  _showStampCardSelector(stampDef, onSuccess = null) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const deck     = run.getDeck();
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const preview  = shuffled.slice(0, Math.min(8, shuffled.length));

    const cx = 640, cy = 360;
    const W  = 900, H = 460;
    const push = obj => { this._confirmObjs.push(obj); return obj; };

    push(this.add.rectangle(cx, cy, W, H, 0x0a0612, 0.97)
      .setStrokeStyle(2, stampDef.hexColor).setDepth(50));
    push(this.add.text(cx, cy - H / 2 + 14, `${stampDef.name} — Select a Card  (${stampDef.cost} ki)`, {
      fontSize: '18px', color: stampDef.color, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50));
    push(this.add.text(cx, cy - H / 2 + 36, stampDef.description, {
      fontSize: '12px', color: '#667788',
    }).setOrigin(0.5).setDepth(50));

    if (preview.length === 0) {
      push(this.add.text(cx, cy, 'No cards available.', {
        fontSize: '14px', color: '#667788',
      }).setOrigin(0.5).setDepth(50));
    } else {
      const SCALE    = 0.68;
      const CW       = Math.round(64 * SCALE);
      const CH       = Math.round(104 * SCALE);
      const GAP      = 12;
      const perRow   = 4;
      const gridW    = perRow * CW + (perRow - 1) * GAP;
      const gridStartX = cx - gridW / 2 + CW / 2;
      const gridStartY = cy - 60;

      for (let i = 0; i < preview.length; i++) {
        const card = preview[i];
        const col  = i % perRow;
        const row  = Math.floor(i / perRow);
        const x    = gridStartX + col * (CW + GAP);
        const y    = gridStartY + row * (CH + GAP + 22);

        const spr = push(this.add.image(x, y, _tex(card)).setScale(SCALE).setDepth(51));
        push(this.add.text(x, y + CH / 2 + 2, card.name, {
          fontSize: '8px', color: '#8899aa',
          wordWrap: { width: CW + GAP - 4 }, align: 'center',
        }).setOrigin(0.5, 0).setDepth(51));
        push(this.add.text(x, y + CH / 2 + 12, `[${card.type}]`, {
          fontSize: '8px', color: '#556677',
        }).setOrigin(0.5, 0).setDepth(51));

        spr.setInteractive({ useHandCursor: true });
        spr.on('pointerover', () => spr.setTint(0xffccee));
        spr.on('pointerout',  () => spr.clearTint());
        spr.on('pointerdown', () => {
          const result = run.applyStamp(card.id, stampDef.id);
          if (result.success) {
            const discount = stampDef.cost - this._price(stampDef.cost);
            if (discount > 0) run.addKi(discount);
            logger.logConsumableUse(stampDef.name, `stamped ${card.id}`);
            if (onSuccess) onSuccess();
            for (const o of this._confirmObjs) o.destroy();
            this._confirmObjs = [];
            this._buildUI();
          }
        });
      }
    }

    const cancelBtn = push(this.add.rectangle(cx, cy + H / 2 - 30, 140, 36, 0x2a1a1a)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true }).setDepth(51));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x4a2a2a));
    cancelBtn.on('pointerout',  () => cancelBtn.setFillStyle(0x2a1a1a));
    cancelBtn.on('pointerdown', () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
    });
    push(this.add.text(cx, cy + H / 2 - 30, 'Cancel', {
      fontSize: '13px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(51));
  }

  // ── Fusion Ritual (Sacred Grove only) ─────────────────────────────────────

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
        .setStrokeStyle(1, 0xccaa44).setInteractive({ useHandCursor: true });
      fuseBtn.on('pointerover', () => fuseBtn.setFillStyle(0x8a6a2a));
      fuseBtn.on('pointerout',  () => fuseBtn.setFillStyle(0x6a4a1a));
      fuseBtn.on('pointerdown', () => this._showFusionConfirm(recipe));
      this.add.text(cx, y + 11, 'Fuse', { fontSize: '12px', color: '#ffdd88' }).setOrigin(0.5);
      y += 40;
    }
  }

  _showFusionConfirm(recipe) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];

    const cx        = 640, cy = 360;
    const nameA     = run.spirits.find(s => s.id === recipe.input[0])?.name ?? recipe.input[0];
    const nameB     = run.spirits.find(s => s.id === recipe.input[1])?.name ?? recipe.input[1];
    const outputDef = getSpiritDef(recipe.output);
    const push      = obj => { this._confirmObjs.push(obj); return obj; };

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
    const nameA  = run.spirits.find(s => s.id === recipe.input[0])?.name ?? recipe.input[0];
    const nameB  = run.spirits.find(s => s.id === recipe.input[1])?.name ?? recipe.input[1];
    const result = run.fuseSpirits(recipe.input[0], recipe.input[1]);
    if (!result.success) return;
    logger.logShopFusion(nameA, nameB, result.fusedSpirit.name);
    const itemCount = this._isGrove ? 4 : 2;
    this._spiritOfferings = this._generateSpiritOfferings(itemCount);
    while (this._spiritOfferings.length < itemCount) this._spiritOfferings.push(null);
    this._buildUI();
  }

  // ── Continue button ────────────────────────────────────────────────────────

  _drawContinueButton() {
    const label = this._isGrove ? 'Enter the Forest' : 'Continue';
    const btn   = this.add.rectangle(640, BTN_Y, 260, 44, 0x1a4a2a)
      .setStrokeStyle(2, 0x44aa66).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setFillStyle(0x2a6a3a));
    btn.on('pointerout',  () => btn.setFillStyle(0x1a4a2a));
    btn.on('pointerdown', () => {
      // legend_waidan: create a negative copy of a random consumable on shop exit.
      if (run.legendarySpirits.some(s => s.id === 'legend_waidan')) {
        const all = [...run._consumables, ...run._negativeConsumables];
        if (all.length > 0) {
          const pick = all[Math.floor(Math.random() * all.length)];
          run.addNegativeConsumable(pick);
        }
      }
      logger.logShopExit(run.ki);
      this.scene.start('GameScene');
    });
    this.add.text(640, BTN_Y, label, {
      fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _price(base) {
    const couponCount = run.spirits.filter(s => s.id === 'econ_coupon').length;
    const discount = Math.min(couponCount * 0.15, 0.45);
    let price = couponCount > 0 ? Math.ceil(base * (1 - discount)) : base;
    return applyHook('modifyShopPrice', price, price);
  }

  // ── Alchemical consumable activation ──────────────────────────────────────

  _activateAlchemical(alchDef) {
    const ConsumableEffects = this.scene.systems?.game?.registry?.get?.('ConsumableEffects');
    // Direct import approach — ConsumableEffects is loaded at module level.
    import('../systems/ConsumableEffects.js').then(mod => {
      const effect = mod.default.get(alchDef.id);
      if (!effect) { this._buildUI(); return; }

      if (!effect.requiresInput) {
        // No selection needed (Sulfur, Lead) — execute immediately.
        const result = effect.execute({ params: {} });
        this._showAlchemicalResult(result);
        return;
      }

      // Needs spirit selection — show overlay.
      this._showSpiritSelectionOverlay(alchDef, effect);
    });
  }

  _showAlchemicalResult(result) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];
    const cx = 640, cy = 360;
    const push = obj => { this._confirmObjs.push(obj); return obj; };
    const color = result.success ? 0x1a3a1a : 0x3a1a1a;
    const border = result.success ? 0x44aa44 : 0xaa4444;
    push(this.add.rectangle(cx, cy, 350, 80, color, 0.97).setStrokeStyle(2, border).setDepth(60));
    push(this.add.text(cx, cy, result.message ?? (result.success ? 'Done!' : 'Failed'), {
      fontSize: '13px', color: result.success ? '#aaffcc' : '#ffaaaa',
      wordWrap: { width: 320 }, align: 'center',
    }).setOrigin(0.5).setDepth(60));
    this.time.delayedCall(1500, () => {
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
  }

  _showSpiritSelectionOverlay(alchDef, effect) {
    for (const o of this._confirmObjs) o.destroy();
    this._confirmObjs = [];
    const push = obj => { this._confirmObjs.push(obj); return obj; };
    const cx = 640, cy = 360;

    const spirits = run.spirits;
    const inputType = effect.inputType;
    const isPair = inputType === 'spirit_pair' || inputType === 'spirit_pair_tier3';
    const selected = [];

    // Filter spirits based on inputType.
    const eligible = spirits.map((s, i) => {
      const def = getSpiritDef(s.id);
      switch (inputType) {
        case 'spirit_pair':              return { s, i, ok: true };
        case 'spirit_pair_tier3':        return { s, i, ok: def?.tier === 3 };
        case 'spirit_single_fusion':     return { s, i, ok: def?.tier === 2 || def?.tier === 3 };
        case 'spirit_single_stackable':  return { s, i, ok: (s.stackCount ?? 1) < 3 };
        case 'spirit_single_transcendable': return { s, i, ok: (s.stackCount ?? 1) >= 3 };
        default: return { s, i, ok: true };
      }
    });

    if (eligible.filter(e => e.ok).length === 0) {
      this._showAlchemicalResult({ success: false, message: 'No eligible spirits' });
      return;
    }

    // Backdrop.
    push(this.add.rectangle(cx, cy, 700, 300, 0x0a0f1e, 0.97).setStrokeStyle(2, 0x4488aa).setDepth(55));
    push(this.add.text(cx, cy - 120, `${alchDef.name}: Select ${isPair ? '2 spirits' : '1 spirit'}`, {
      fontSize: '14px', color: '#ddeeff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(55));

    // Render spirit cards.
    const GAP = 76, startX = cx - ((spirits.length - 1) * GAP) / 2;
    for (const { s, i, ok } of eligible) {
      const sx = startX + i * GAP;
      const sy = cy;
      const bgColor = ok ? 0x0d1b2a : 0x0a0a14;
      const bdrColor = ok ? 0x4488aa : 0x222233;
      const card = push(this.add.rectangle(sx, sy, 64, 80, bgColor).setStrokeStyle(1, bdrColor).setDepth(56));
      push(this.add.text(sx, sy - 10, s.name, {
        fontSize: '9px', color: ok ? '#cce0ff' : '#445566',
        wordWrap: { width: 56 }, align: 'center',
      }).setOrigin(0.5).setDepth(56));
      if ((s.stackCount ?? 1) > 1) {
        push(this.add.text(sx + 28, sy - 36, `\xD7${s.stackCount}`, {
          fontSize: '9px', color: '#ffee66',
        }).setOrigin(1, 0).setDepth(57));
      }
      if (!ok) continue;
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        if (selected.includes(i)) return;
        selected.push(i);
        card.setStrokeStyle(2, 0x44ff44);
        const needed = isPair ? 2 : 1;
        if (selected.length >= needed) {
          const params = isPair ? { spiritIndices: selected } : { spiritIndex: selected[0] };
          const result = effect.execute({ params });
          for (const o of this._confirmObjs) o.destroy();
          this._confirmObjs = [];
          this._showAlchemicalResult(result);
        }
      });
    }

    // Cancel button.
    const cancelBtn = push(this.add.rectangle(cx, cy + 120, 90, 28, 0x2a1a1a)
      .setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true }).setDepth(56));
    push(this.add.text(cx, cy + 120, 'Cancel', {
      fontSize: '11px', color: '#ffaaaa',
    }).setOrigin(0.5).setDepth(56));
    cancelBtn.on('pointerdown', () => {
      // Refund ki since alchemical wasn't consumed.
      run.addKi(this._price(alchDef.cost));
      for (const o of this._confirmObjs) o.destroy();
      this._confirmObjs = [];
      this._buildUI();
    });
  }
}
