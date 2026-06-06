# Phase 4 — Consolidation Candidate Tasks (deferred / backlog)

**Created:** 2026-06-06. **Status:** BACKLOG — not scheduled; captured so the reasoning
isn't lost. Surfaced during the F4.17 step-1 discussion (the `countStackedById` vs
`incrementPerElement` counting-mechanism observation).

These are candidate tasks, deliberately NOT folded into any active campaign (avoiding scope
creep). Each is its own task with its own timing and risk. Recorded per the
iterative-reorganization principle (D-F4.18b): notice it, write it down, scope it, don't let
it derail current work.

---

## Background — the observation that surfaced these

While migrating `econ_recycling` and `engine_ship` onto `onFieldDiscard` (F4.17#1), two
different "counting" mechanisms appeared side by side:
- `countStackedById(id)` — a **stateless instantaneous read**: "how many stacks of this
  spirit do I have right now?" (recycling: payout = `5 × current stacks`).
- `incrementPerElement` / `aggregateNumericState` — a **stateful accumulator**: a running
  total of event-counts built up over a run, tied to per-element state and the
  transcendence (negative-spirit) snapshot machinery (ship: `cardsDiscarded` grows over time).

They look parallel but solve different problems (read-current-multiplicity vs.
accumulate-events-over-time). They should NOT be merged into one function — recycling has
nothing to accumulate; ship would lose its history. BUT the observation surfaced three
genuine, separable consolidation opportunities:

---

## Candidate A — Effect-magnitude accessor unification

**What:** Spirits currently read "how strong is this instance right now" in at least three
inconsistent ways: `countStackedById(id)`, `effectivePower(spirit)`, and direct `stackCount`
reads. These ARE the same question and the inconsistency is real seepage (the F4.20 audit
family). Standardize on one accessor (likely `effectivePower(spirit)` inside hooks — which
F4.17#1 already does for recycling).

**Scope/risk:** Low–medium. Mechanical, but touches many call sites. Possible genuine code
consolidation (not just renaming).

**Timing:** Mid/late Tier 2, after the structural migrations settle (renaming/rerouting
accessors before the structure stops moving = wasted churn).

---

## Candidate B — Accumulator-cluster abstraction

**What:** `incrementPerElement` + `aggregateNumericState` + the transcendence snapshot
(`snapshotCat1Linear` etc.) form a cluster used by many engine spirits with different keys
(ship `cardsDiscarded`, lincoln `banks`, napoleon `pushFails`, ants `totalPlayed`, palace
`cardsAdded`, missing_number `totalStacks`, glacier/carbon/fossil tier procs...). Evaluate
whether a cleaner shared "event-counter spirit" abstraction is warranted.

**Scope/risk:** Higher. Touches the transcendence math, which is delicate. This is its own
careful task, NOT a quick cleanup.

**Timing:** Late — do it when the transcendence system is otherwise stable, so the
abstraction is built against settled behavior.

---

## Candidate C — Codebase-wide naming / vocabulary cohesion

**What:** (Robert's framing.) Even where two pieces of code stay separate, their NAMES should
reflect when they're operating on the same underlying concept. The motivating example:
`countStackedById` and `incrementPerElement` both ultimately concern *how spirit-stack
multiplicity influences output* — but their names emphasize mechanism and hide the shared
root. Good naming would make the common concept legible while still distinguishing the two
*applications* (instantaneous read vs. accumulated total).

**Another concrete example:**
- `activeSpirits` / `scoringSpirits` / `allSpirits` are named by set-membership, not by the
  REASON to choose each. The real distinction: negatives (transcended) score normally but
  must NOT be re-incremented for live-accumulator events (their value is frozen at
  transcendence via the snapshot machinery). The getter names hide this, which is why the
  correct choice isn't obvious at call sites — and is the root of the recurring
  regular-vs-negative iteration bug class (F2.4 item 10, Osprey/Catcher reset bug).
  A vocabulary pass should name these by intent (e.g. 'scores' vs 'accumulates-live-events').

**Critical constraint:** naming cohesion is a CODEBASE-WIDE property, not a spot fix.
Renaming one pair in isolation creates local consistency that's inconsistent with the next
pair — wasted churn that doesn't generalize, and a new flavor of debt. The vocabulary must be
decided once and applied uniformly.

**Shape of the task:** its own recon→decide-vocabulary→apply exercise:
1. Catalog the *concepts* the codebase traffics in (effect magnitude, accumulated event
   counts, stack multiplicity, lifecycle hooks, intents, etc.) and the *names* currently used
   for each.
2. Surface inconsistencies; propose ONE vocabulary.
3. Apply codebase-wide as a deliberate task, vocabulary fixed up front.

**Timing:** LATE — explicitly gated on structural consolidation being substantially done
(same logic as F4.24b: don't name the architecture until it has stopped moving). **Likely
coordinated with F4.24b** (the prescriptive ARCHITECTURE.md): naming cohesion and the
architecture doc are arguably the same late phase — both describe the stabilized system in
consistent language, one in identifiers and one in prose. The vocabulary the ARCHITECTURE.md
uses should be the vocabulary the code uses.

---

## Cross-references
- D-F4.18b (iterative-reorganization principle: reorg interleaves with design; name late)
- F4.24b (prescriptive ARCHITECTURE.md, deliberately late — coordinate with Candidate C)
- F4.20 (spirit-logic migration; Candidate A is in this family)
- `docs/recon/discard_pipeline_recon.md` Section 8 (adjacent smells: duplicated
  `game_catcher` state-init; per-copy catcher state; stamp draw lacking hand-cap check)
