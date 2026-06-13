// ─────────────────────────────────────────────────────────────────────────────
// scoringLabels — derive the human-readable label for a structured scoring
// contribution. Contributions carry structured fields ({kind, ...}) rather than a
// baked `source` string (F3.16b); this is the single place that turns them into text.
//
// Sole consumer today: GameplayLogger (the analysis/transcript instrument). A future
// player-facing breakdown can reuse this (or derive its own ×N-style format from the
// same fields) — the structured record is the durable artifact, the string is derived.
// ─────────────────────────────────────────────────────────────────────────────

const _cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const HELD_MATERIAL = {
  metal: { base: 'Iron',  upgraded: 'Meteorite' },
  earth: { base: 'Clay',  upgraded: 'Pottery' },
};

/**
 * @param {object} c  A structured contribution: { kind, ...fields, addPoints?, addMult?, multiplyMult? }
 * @returns {string}  The human label (matches the pre-F3.16b strings, except spirit is unified to
 *                    "Name (power N)" — was split "spirit Name (power N)" / "Name (stack N)").
 */
export function formatContributionSource(c) {
  const rt = c?.phase === 'retrigger'; // F3.17: tag re-scored contributions distinctly
  switch (c?.kind) {
    case 'spirit':
      // Unified across phases (onCardScored + engine). "power" is accurate for regular stacks AND
      // transcended Negatives (effectivePower), unlike the old engine "(stack N)". Retrigger goes
      // inside the parens for compactness.
      return rt ? `${c.name} (power ${c.power}, retrigger)` : `${c.name} (power ${c.power})`;
    case 'enhancement': {
      const base = `${c.tier} ${_cap(c.element)}`;
      const s = c.element === 'water' ? `${base} (dep ${c.dep ?? 0})` : base;
      return rt ? `${s} (retrigger)` : s;
    }
    case 'edition':
      return rt ? `${_cap(c.edition)} edition (retrigger)` : `${_cap(c.edition)} edition`;
    case 'held': {
      // Held-in-hand is capture-level (computed once in block C), never re-scored — no retrigger phase.
      const material = HELD_MATERIAL[c.element]?.[c.tier] ?? _cap(c.element);
      return `${material} (${c.cardName})`;
    }
    case 'hexagram':
      return rt ? `hexagram ${c.name} (retrigger)` : `hexagram ${c.name}`;
    default:
      return String(c?.kind ?? '?');
  }
}
