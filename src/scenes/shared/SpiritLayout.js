// ── Shared spirit fan layout constants and helpers ──────────────────────────
// Used by GameScene and ShrineScene for consistent spirit display.

export const SPIRIT_FAN_LEFT  = 196;
export const SPIRIT_FAN_W     = 430;
export const SPIRIT_W         = 64;
export const SPIRIT_H         = 104;
export const SPIRIT_IDEAL_GAP = 8;
export const SPIRIT_Y         = 62;

// Section spacing
export const SECTION_PAD = 12;   // px between section right edge and next label
export const LABEL_GAP   = 12;   // px between label centre and fan left edge

// Legendary fan layout
export const LEGENDARY_FAN_LEFT  = SPIRIT_FAN_LEFT + SPIRIT_FAN_W + SECTION_PAD + LABEL_GAP;
export const LEGENDARY_FAN_W     = 160;
export const LEGENDARY_IDEAL_GAP = 12;

// Consumable fan layout (derived — keeps all three sections in sequence)
export const CONS_FAN_LEFT  = LEGENDARY_FAN_LEFT + LEGENDARY_FAN_W + SECTION_PAD + LABEL_GAP;
export const CONS_FAN_W     = 180;

// Stack expansion
export const PEEK_RATIO = 0.15;
export const EXPAND_CARD_OFFSET = Math.round(SPIRIT_H * PEEK_RATIO);

/**
 * Compute horizontal fan positions for items in a container.
 * When items fit with ideal spacing they are centred; when they overflow,
 * items overlap with even distribution (Balatro-style).
 *
 * @param {number} count          Number of items.
 * @param {number} containerWidth Total horizontal space.
 * @param {number} itemWidth      Width of one item.
 * @param {number} idealGap       Preferred gap between items.
 * @returns {number[]}            x-centre positions relative to container left edge.
 */
export function computeFanPositions(count, containerWidth, itemWidth, idealGap) {
  if (count <= 0) return [];
  if (count === 1) return [containerWidth / 2];

  const idealSpan = count * itemWidth + (count - 1) * idealGap;

  if (idealSpan <= containerWidth) {
    const startX = (containerWidth - idealSpan) / 2 + itemWidth / 2;
    return Array.from({ length: count }, (_, i) => startX + i * (itemWidth + idealGap));
  }

  const startX = itemWidth / 2;
  const endX   = containerWidth - itemWidth / 2;
  const stride  = (endX - startX) / (count - 1);
  return Array.from({ length: count }, (_, i) => startX + i * stride);
}
