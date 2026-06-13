# Tooltip Verification Checklist — standing reference (F4.37 scope item 5)

**Purpose:** the documented procedure for verifying a spirit tooltip's displayed value matches what
the effect code actually computes. Codifies what the value-equality harness automates, plus the
render-layer checks a human runs once in-game. Consult this whenever you add or change a spirit
tooltip, a `tooltipBase` constant, or an effect's scaling.

**Lives in `process/` (a RULE, not a record):** future tooltip work consults it. Created at F4.37 C4.

---

## The principle

A tooltip is **correct iff its displayed value equals what the effect computes** — at every relevant
stack count. The effect is the single source of truth; the tooltip is a consumer, not a second
implementation.

**Architecture B** (the F4.37 ruling) makes this true *by construction* for the engine cohort: the
tooltip derives its value from `applyEngine()` (or the RunManager accessor / effect fn) instead of
hand-computing it. The narration (input counts — "Snow: 3, Ice: 2", "Cards added: N") stays in the
tooltip; only the VALUE token derives. A tooltip written this way cannot drift from the effect,
because there is only one formula.

> The anti-pattern F4.37 eliminated: the tooltip was a line-for-line re-implementation of `applyEngine`
> with hardcoded constants (a *third* copy of the scaling, after the effect and `tooltipBase`). Each
> tuning change risked drift in the copy nobody remembered to update.

---

## The automated layer — `test/tooltip_value_equality.test.js`

Headless Vitest; no Phaser. 93 cases across the B-migrated cohort. **Run before AND after any tooltip
or scaling change** — green-before proves no pre-existing drift, green-after proves you preserved (or,
for a deliberate `[FIX]`, correctly changed) the value.

```
npx vitest run test/tooltip_value_equality.test.js
```

**What it covers** (every Architecture-B branch):
- **Dual-tier multiplyMult:** glacier, carbon, fossil, moths.
- **Exponential multiplyMult:** velocity (`(1+iron·k)·pow(1.5,t2)`).
- **Accumulator multiplyMult:** radiance, wildlife, banner, plenty.
- **Single-key linear multiplyMult:** palace, ship, kintaro, bullseye, sym_algae, sym_ducks.
- **Single-key linear addMult:** devotion, habitat, ceremony, agriculture, lincoln, napoleon,
  missing_number, sym_ants, sym_snails.
- **Out-of-block engines (C3):** wuji, dao, chi, tengu, feng_shui, sym_badger.
- **Surplus (C3 [FIX]):** the ×stacks value-flip.

**How it asserts (`assertVE`):** renders the tooltip via `getSpiritContrib`, parses the value token
out of the `→ ×N mult` / `→ +N mult` line (anchored on the `→` arrow — see gotchas), then compares it
to `applyEngine()`'s matching field, formatted to the token's own decimal precision. Identity on a
null/inert engine: `×` → 1.00, `+` → 0.

**How to extend it for a new spirit:**
1. Build the spirit with a helper:
   - `regular(id, s => { s.elements = [{ <stateKey>: <n> }]; }, stackCount)` — a regular (optionally
     multi-stack) with seeded accumulator state.
   - `negative({ id, name, isNegative: true, powerLevel, state: { key, preTranscendTotal, newEvents } })`
     — a transcended Negative.
2. Assert with `assertVE(spirit)` (returns the engine value; chain `expect(...).toBe(1)`/`.toBe(0)` for
   the null/identity case).
3. Add ≥2 configs incl. the null case (zero state → identity). Read the branch's `applyEngine` first to
   confirm the returned field (multiplyMult vs addMult) and the null condition.

**Econ accessors** (`test/consumables/econ_accessors.test.js`): coupon/piggybank read RunManager
accessors (`couponDiscountPct`, `piggybankHandKiMult`); grace reads `applyKiBonus({ki:1})`. These pin
both the shop/ki extraction (behavior-preserving) and the tooltip value against the real computation.

---

## The manual layer — in-game spot-check `[PENDING playtest]`

The render-layer checks the headless harness can't cover (Phaser draw, fan layout, expand-card peeks).
Run once in-game after a tooltip-touching change:

- [ ] Pick a few migrated engine spirits (e.g. glacier, carbon, devotion, bullseye) and confirm the
      tooltip shows the SAME number at **1, 2, 3 stacks** as the `applyEngine` value (the harness covers
      the logic; this confirms the render).
- [ ] **Decay (C3 [FIX]):** a 2-stack Pear shows `loses 10/round`, a 2-stack Persimmon `loses 6/round`
      (loss now scales per-member); the `+N pts`/`+N mult` output still scales `n × stacks`.
- [ ] **Surplus (C3 [FIX]):** at 2 stacks the tooltip shows `×stacks` (e.g. ki=6 → `+4`, not `+2`).
- [ ] **New econ branches (C3):** coupon shows `N% shop discount`, piggybank `×N hand ki`, grace
      `×N running ki per combo` — and the numbers track stack count.
- [ ] Negative (transcended) copies render their transcendence value, not the regular formula.

---

## What's NOT covered / known gaps (carry-forward — see PHASE4_STATE)

These are KNOWN, not missed — recorded so a future reader doesn't re-discover them:

- **Double-render of out-of-block engines.** wuji/dao/chi/tengu/feng_shui have `applyEngine` but aren't
  in the engine-block id-chain, so they hit the block's generic fallback (a bare `×N mult` line) AND
  their narrated legendary line — two lines, same value. Architecture B keeps both consistent; the
  duplicate line is a separate display-dedup cleanup (pre-existing).
- **Dead tooltip branches.** `econ_lucky_charm` / `econ_reward` branches sit inside `if (fx?.applyEngine)`
  but neither spirit has `applyEngine` → unreachable. Harmless; a cleanup item.
