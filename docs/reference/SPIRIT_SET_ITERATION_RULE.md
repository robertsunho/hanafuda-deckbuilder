# Spirit-set iteration rule — which set to iterate, and why

**Status:** Authoritative rule. Created 2026-06-06 as the resolution of the Candidate F bug class
(see `F4.20_candidate_F_audit_findings.md`). Confirmed by the spirit-set getter recon (verdict A:
the three-way getter distinction is principled, not accidental). `CLAUDE.md` carries a compact
pointer to this doc.

This rule prevents the recurring "wrong spirit-set" bug class: the Osprey/Catcher reset bug,
F2.4 item 10, the F4.20-FIX accumulator cluster, and the six misrouted effect sites this rule's
fix campaign addresses (Glory, golden_toad, caterpillar, ducks ×2, mirror/memory ctx).

---

## Two orthogonal facts govern every spirit-set choice

### 1. Transcendence frees a SLOT, nothing else
A transcended (Negative) spirit behaves EXACTLY like a regular spirit/stack for all effect,
scoring, and targeting purposes — same firing, same effects, same placement in the chain (it can be
rearranged, moved, and is a valid adjacency target and targeter). The ONLY thing transcendence
changes is that it no longer consumes a spirit slot. **Slotlessness is about CAPACITY, not
PLACEMENT.**

The negative-state machinery (`preTranscendTotal` / `newEvents` / the `NEGATIVE_SNAPSHOT` functions)
exists ONLY to collapse a multi-member stack into one coherent post-transcendence entity that keeps
accruing at a powerLevel-scaled rate (the locked F2.5 design). It does NOT make Negatives a lesser
or restricted class.

> *Implementation note (2026-06-06): "same placement in the chain" is now LITERAL in code. The
> transcend-placement fix landed — `_acquireSpiritStack` and `alch_amber` replace the transcending
> spirit IN PLACE at its index (no more append-to-end), and the Mirror/Memory targeting ctx is the
> negatives-included chain in placement order. A transcended spirit keeps its position and is a valid
> adjacency target/targeter. (History: site #6 follow-up in the F4.16_F4.20 triage ledger.)*

⇒ **No effect / scoring / targeting path may exclude a Negative.** A path that does is a bug.

### 2. Legendaries are a SEPARATE CATEGORY — not chain members
Legendaries are foundation-influencing, have their own UI slot/capacity, do NOT sit in the spirit
chain, and do NOT stack or transcend (there is no Negative legendary). They MAY have effects that
influence spirits, and they DO contribute to scoring — but they do NOT participate in the
spirit-chain event lifecycle (`onBank` / `onRoundEnd` / `onFieldDiscard` / `onCardPlayed` / etc.).

⇒ Event-hook dispatchers iterating the chain (which excludes legendaries) is CORRECT BY DESIGN, not
an oversight. If a legendary needs to react to a game event, that is a foundation/hook-layer
mechanism, NOT a spirit-chain event hook. (`_legendarySpirits` is a separate array from
`_allSpirits`, which is why `allSpirits` omits legendaries — this is the structural expression of
"legendaries aren't chain members.")

---

## Which getter to use, by the KIND of question

| Kind of question | Getter | Contents | Why |
|---|---|---|---|
| **Effect / event-hook firing** (chain lifecycle) | `allSpirits` | regulars + Negatives, NO legendaries | The spirit chain. Negatives are chain members (include); legendaries aren't (exclude, by design). All `_fire*Hooks` use this. |
| **Scoring contribution** | `scoringSpirits` | regulars + Negatives + legendaries | Legendaries score even though they're not chain members. The Phase-1/Phase-2 scoring loops use this. |
| **Adjacency / placement targeting** (Mirror's left neighbour; Memory's rightmost non-self) | the chain in TRUE PLACEMENT ORDER | regulars + Negatives, real left-to-right order | Negatives are valid targets AND targeters. ⚠ **Do NOT use `scoringSpirits`** — it REGROUPS (regulars→Negatives→legendaries) and scrambles adjacency. **PENDING VERIFICATION:** the exact getter (likely `allSpirits`) must be confirmed to match on-screen chain order before use — see the mirror/memory fix recon. |
| **Slot / capacity** ("slots used / can I add one?") | `spirits` / `!isNegative` filter | regulars only | The ONE place excluding Negatives is correct — they don't take slots. `canAddSpirit` is the reference. |
| **Structural presence of a legendary/capstone** ("is capstone_yinyang / a capstone present?") | `activeSpirits` acceptable | regulars + legendaries, no Negatives | Those entities can't be Negative anyway, so the exclusion is harmless here. |

**Heuristic for call sites:** if you're iterating spirits to FIRE, SCORE, or TARGET and you reach
for `activeSpirits`, stop — you almost certainly want `allSpirits` (chain) or `scoringSpirits`
(scoring incl. legendaries). `activeSpirits` is for structural-presence and slot questions only.

---

## scoringSpirits vs allSpirits — NOT redundant
They differ on three axes and neither is removable:
- **Legendaries:** `scoringSpirits` includes them; `allSpirits` does not.
- **Zero-stack ghosts:** `scoringSpirits`'s `spirits` term filters `stackCount>0`; `allSpirits` is
  raw `_allSpirits` (includes ghosts).
- **Ordering:** `allSpirits` preserves raw insertion interleave; `scoringSpirits` groups
  regulars→Negatives→legendaries.

`scoringSpirits` = "everything that contributes to a score, grouped, incl. legendaries."
`allSpirits` = "the raw chain roster incl. Negatives/ghosts, no legendaries" — what the counter /
event dispatchers want.

---

## Naming caveat (Candidate C)
The getters are currently named by MEMBERSHIP, not INTENT — which is precisely why the call-site
choice has been guessable-and-wrong. `activeSpirits` reads like "the spirits that are active/working,"
but transcended spirits ARE active; they just don't hold a slot. A pending consolidation
(Candidate C) renames these by intent so the right choice is obvious at the call site. Until then,
this rule is the reference.

---

# Accumulator-spirit scoring pattern (canonical)

**Status:** Authoritative pattern. Added 2026-06-14 as the F4.25/F4.28 verified-done deliverable
(DECISIONS_LOG `F4.25/F4.28`). The 28 accumulator spirits (`ACCUMULATOR_SPIRIT_IDS`, RunManager.js)
were verified single-sourced via `_tb` — this section is the reference V6 / `ARCHITECTURE.md` (F4.24b)
cites. Scoped to ACCUMULATORS; the other stacking patterns below are surveyed for completeness.

## The three coordinated pieces — one source of truth per scaling constant

1. **STATE SHAPE — `ACCUMULATOR_INIT`** (`RunManager.js`): declares the per-element state key(s)
   ONLY (e.g. `sym_algae → { summonCount: 0 }`). NO scaling values — shape, not formula. (Verified:
   every entry is a `{key:0}` / `{key:[]}` / `{}` factory; zero scaling values live here.)

2. **SCALING CONSTANT — `tooltipBase`** (`spirits.js`), read via the **`_tb(spirit, field, fallback)`**
   accessor (`SpiritEffects.js:72`). The SINGLE source of every accumulator scaling value. BOTH
   `applyEngine` AND the `NEGATIVE_SNAPSHOT` registry read the **same `_tb` field with the same
   fallback**, so a balance tune (F5.1) changes one place and both the live formula and the
   transcend-boundary snapshot follow. *(This is the mechanism — installed by F4.36's `_tb` sweep —
   that met F4.25's single-source goal; the originally-sketched declarative `formula:{}` object was
   unnecessary and not built.)*

3. **FORMULA EXECUTION:**
   - **`applyEngine`** (`SpiritEffects.js`): regular path = `base + aggregate × _tb(...)` (aggregate
     via `aggregateNumericState` / `aggregateArrayLength`); negative path =
     `preTranscendTotal + newEvents × _tb(...) × powerLevel`. The negative path bakes the
     `× powerLevel` stack-scaling INTO the formula (accumulators do NOT call `_scaleEngineOutput`).
   - **`NEGATIVE_SNAPSHOT`** (`SpiritEffects.js`): captures `preTranscendTotal` at transcend via
     generic helpers — `snapshotCat1Linear` / `snapshotCat1Dual` / `snapshotCat1Exponential` /
     `snapshotArraysFromElements` / `snapshotCat5Maturation` — each taking the `_tb` scaling as an
     argument (same source as `applyEngine`).

## Categories (the snapshot helper per category)

| Category | Snapshot helper | Carries a `_tb` scaling arg? |
|---|---|---|
| Cat 1 linear (single/dual key) | `snapshotCat1Linear` / `snapshotCat1Dual` | YES (`mult` / `t1Mult`+`t2Mult`) |
| Cat 1′ exponential (velocity) | `snapshotCat1Exponential` | NO — stores the proc count; `applyEngine` re-applies `perIronMult`/`jackpotMult` identically in both branches |
| Cat 2/4 uniqueness/reset (wildlife/plenty/radiance/banner) | `snapshotArraysFromElements` | NO — stores the seen-arrays; `applyEngine` applies the scaling (same `_tb` in both branches; `banner` is a bare `1+n`) |
| Cat 5 maturation (past_life/cuckoo_egg) | `snapshotCat5Maturation` | NO — numerator/denominator from `acquiredRound`; no scaling constant |

**`util_northern_lion`** is in the accumulator set but has **NO `applyEngine`** (`{}` — it's a
utility/shop-reroll spirit; its `pushesWitnessed` feeds GRM shop logic, not scoring). Its snapshot
bare-`1` is vestigial-for-scoring and trivially consistent. (See N1 in the banked ratify list.)

## Stack scaling — NOT a single helper (multi-pattern reality)

`_scaleEngineOutput(result, n)` (`addMult×n`, `addPoints×n`, `multiplyMult^n`) is the canonical helper
for the **retrigger path ONLY** — its four callers are the Mirror/Memory `applyEngine` wrappers, which
re-score a target's result `n` times. It is **NOT** the global stacking mechanism. Stacking is achieved
differently by spirit class:
- **Accumulators:** per-element counter accumulation (regular) + `× powerLevel` baked into the negative
  formula. (No `_scaleEngineOutput`.)
- **Retriggers (Mirror/Memory):** `_scaleEngineOutput` on the wrapped result.
- **Conditionals (`cond_horizon`/`cond_dream`/`cond_hierarchy`):** inline `Math.pow(base, effectivePower)`
  — exponential compounding.
- **Live-state engines (`engine_dao`/`chi`/`tengu`/`feng_shui`, rare/stackable):** inline LINEAR-in-stacks
  (`base × stacks` / `1 + x·stacks`), bare literal constants (no `tooltipBase`). Read live run-state, so
  they need no accumulator state or snapshot (transcend-safe via `effectivePower`).

> **⚠ DEFERRED [FIX] (Robert's ruling 2026-06-14) — out of F4.25/F4.28 scope.** The conditional
> `Math.pow(base, stacks)` EXPONENTIAL stacking is a **real inconsistency** (every other multiplicative
> spirit stacks additively, e.g. Yang) → to be changed to `base × stacks` in a **dedicated [FIX]
> campaign** (NOT routed through `_scaleEngineOutput`, whose `^n` is the wrong direction). The same
> campaign gives all **7 non-accumulator scoring spirits** (3 conditionals + 4 live-state engines)
> `tooltipBase` + `_tb` for single-source uniformity. Tracked as **OVERHAUL_PLAN F5.12**. These 7 are
> explicitly NOT part of the verified-done 28 accumulators.

## Verification

`test/tooltip_value_equality.test.js` pins regular / negative / zero-identity value-equality across the
accumulators — the standing guard that pieces (2) and (3) agree. **Coverage: 25/28** accumulators. The 3
not in this harness (honest gap, ruled acceptable 2026-06-14): `util_northern_lion` (no scoring
`applyEngine` — nothing to assert) and the 2 Cat-5 maturation spirits `util_past_life` / `sym_cuckoo_egg`
(output isn't a scoring `multiplyMult`/`addMult`; covered instead by F4.27's Cat-5 tests).

This pattern is the resolution of **F4.25** (single-source — met via `_tb`, not the originally-sketched
declarative-formula object) and **F4.28** (canonical accumulator stacking — the per-category snapshot
helpers + the equality harness; `_scaleEngineOutput` for the retrigger path). The broader cross-spirit
stacking-consistency [FIX] is F5.12.
