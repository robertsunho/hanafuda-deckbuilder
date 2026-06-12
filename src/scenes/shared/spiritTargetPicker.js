// ─────────────────────────────────────────────────────────────────────────────
// spiritTargetPicker.js — shared spirit-target SELECTION logic (F4.35)
// Used by GameScene._showAlchemicalTargetPicker + ShrineScene._showShrineSpiritPicker.
//
// Houses the scene-independent logic — the per-inputType eligibility predicate, the
// isPair derivation, and the execute() params shape — so the two pickers can't drift
// on WHICH spirits are valid or HOW the selection reaches effect.execute().
//
// The rendering SHELLS stay per-scene by design: they diverge genuinely (modal chrome,
// grid-vs-row layout, _overlayObjs vs _confirmObjs object-tracking, _setStatus vs
// _showShrineToast feedback, in-round roundManager plumbing, shop-vs-round logging).
// Forcing them into one parameterized widget would trade duplication for config-soup,
// and the picker rendering has no test coverage to guard a [PRESERVE] merge. F4.35 is
// the selection-logic + eligibility slice; full cross-scene widget convergence (the
// drag/expand/sell/tooltip unification) is a larger Phase-5 effort.
// ─────────────────────────────────────────────────────────────────────────────

import { getSpiritDef } from '../../data/spirits.js';

/** True for the two-spirit (pair) alchemical input types. */
export function isPairInputType(inputType) {
  return inputType === 'spirit_pair' || inputType === 'spirit_pair_tier3';
}

/**
 * Per-inputType eligibility for the spirit-transformation alchemicals. Returns a
 * parallel array of { s, i, ok } over `spirits` (run.spirits order). The picker UI
 * greys/skips entries with ok=false; each effect's execute() is the robust backstop.
 *
 * NOTE: spirit_single_transcendable (Amber) is intentionally ANY-stack (ok: true) —
 * the Amber fix deliberately ungated it (a low-stack negative is the tradeoff). Do
 * NOT re-gate here.
 */
export function computeSpiritEligibility(spirits, inputType) {
  return spirits.map((s, i) => {
    const def = getSpiritDef(s.id);
    switch (inputType) {
      case 'spirit_pair':                 return { s, i, ok: true };
      case 'spirit_pair_tier3':           return { s, i, ok: def?.tier === 3 };
      case 'spirit_single_fusion':        return { s, i, ok: def?.tier === 2 || def?.tier === 3 };
      case 'spirit_single_stackable':     return { s, i, ok: (s.stackCount ?? 1) < 3 };
      case 'spirit_single_transcendable': return { s, i, ok: true };
      default:                            return { s, i, ok: true };
    }
  });
}

/** Build the effect.execute params from the selected spirit indices. */
export function buildSpiritParams(isPair, selected) {
  return isPair ? { spiritIndices: selected } : { spiritIndex: selected[0] };
}
