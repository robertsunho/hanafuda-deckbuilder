/**
 * Candidate H — the consumable-consumption policy, in one place.
 *
 * used ⟺ spent ⟺ Badger (the locked 2026-06-10 invariant). A consumable is consumed
 * (removed from inventory via run.consumeById) iff it produced a REAL effect — and that
 * is the same signal each family's Badger gate fires on, so consume and Badger can never
 * diverge. The only non-consume case is a genuine failure / no-op: no valid target, hand
 * full, empty pile. PARTIAL effects (draw-2 draws 1, multi-target where some resolve) and
 * DELIBERATE-COST effects (Amber −slot, Tiger forced push) return success/non-no_effect →
 * they consume.
 *
 * Result shapes are deliberately NOT normalized (per consumable_inventory_pass1.md): the
 * element family reports via `action` (it has no `success` field — `no_effect` is its sole
 * failure), every other family via `success`. This predicate is the single adapter that
 * maps either shape to one yes/no, consulted by every scene result-tail before consumeById.
 */
export function consumableHadEffect(result) {
  if (!result) return false;
  if (result.action !== undefined) return result.action !== 'no_effect';
  return result.success !== false;
}
