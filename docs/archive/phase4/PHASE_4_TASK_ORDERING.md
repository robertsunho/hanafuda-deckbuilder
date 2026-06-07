# Phase 4 Task Ordering Plan

> **STATUS: SUPERSEDED as a live anchor by docs/process/PHASE4_STATE.md (2026-06-07). Retained as the Phase-4 bootstrap record; do not use as current guidance.**

**For:** The new Claude entering Phase 4. Read after `PHASE_4_ENTRY_BRIEF.md`.
**Status:** Proposed ordering as of 2026-06-02, to be discussed and confirmed with Robert in the first Phase 4 session.

---

## The organizing thesis

Robert's framing for Phase 4 (2026-06-02):

> "An overarching theme for Phase 4 work is to put things where they belong. For instance, a lot of Spirit logic lives in GameRoundManager, or ScoringManager, and so forth. The goal would be for each sub-document of the codebase to be purposeful, and to have as many single sources of truth as is architecturally possible, without compromising performance.
>
> The other overarching task is to consolidate areas where multiple methods/tools have been developed for one type of function or behavior. This is obviously due to the patchwork-style development of Hanatu, and how we implemented in tandem with design from the very beginning. This also extends to functions which are named for a specific spirit or consumable, but which have much broader application across gameplay/codebase."

The risk Phase 4 addresses is **invisible debt:** nothing's broken now, but scattered logic and pattern multiplication make future work (Phase 5 content, polish, tuning) harder than it needs to be.

**The ordering principle:** Establish the map first. Then migrate. Then refine UI on top.

---

## Four ordered tiers

### Tier 1 — Map-making (the structure)

Tasks that create the structural map other tasks will migrate INTO. Doing these first means every downstream consolidation has a clear target.

**T1.a — F4.24: Codebase architecture catalogue** (highest priority, do first)
- Inventory all hooks, helpers, dispatch functions currently in the codebase
- Document the directory structure and file responsibilities
- Decide: new section in DESIGN_DOC_V5.md OR separate ARCHITECTURE.md companion doc
- **Why first:** Every downstream consolidation benefits from knowing what already exists. Risk of "reinventing parallel mechanisms" is highest without this map.
- **Effort:** 6-10 hours
- **Outputs:** Architecture reference document; updated design doc cross-references

**T1.b — F4.14: Design Doc V5 reconciliation** (do alongside T1.a)
- Apply the 64 patches in `DESIGN_DOC_PATCHES.md`
- May surface additional discrepancies during application
- **Why early:** The design doc becomes the trusted reference Phase 4 reasoning operates against. A stale doc poisons everything downstream.
- **Effort:** 4-6 hours (mechanical patches) + 6-10 hours (editorial description rewrite, optional/deferrable)
- **Outputs:** Updated DESIGN_DOC_V5.md; patch tracker showing what landed
- **Pairing with T1.a:** As you write the architecture catalogue (T1.a), you'll discover doc gaps that aren't in the patches worklist. Apply both as you go; they're synergistic.

### Tier 2 — Logic centralization (the migration)

Tasks that move scattered spirit/consumable logic INTO the structural map established in Tier 1.

**T2.a — F4.16: Spirit logic seepage cleanup**
- Move spirit-specific logic from RunManager.js / GameScene.js / GameRoundManager.js INTO SpiritEffects.js
- Known cases: `_fireCuckooHatch`, `_addPastLifeCopy`, Cuckoo Egg maturity counting in GameScene sale handler
- **Why second tier:** This is the heart of "put things where they belong." Spirits should own their logic. Migration is the larger Phase 4 lift.
- **Pre-conditions:** T1.a (map shows where things should go)
- **Effort:** 8-12 hours

**T2.b — F4.20: Migrate spirit effect logic to SpiritEffects.js**
- Closely related to T2.a; may be the same task in practice
- F4.16 focuses on spirit-specific control logic; F4.20 focuses on effect-execution paths
- Verify during recon whether these are distinct work or overlapping; consolidate if so
- **Effort:** 8-12 hours (or merged with T2.a)

**T2.c — F4.38: Wu Xing enhancement effect code consolidation**
- Currently Wu Xing effects (Fire/Water/Wood/Gold/Crystal/Ghost) are scattered across GameRoundManager.js scoring loop
- Absorbs F3.7c (Wu Xing proc surfacing), F3.11b (per-source enhancement emissions), F3.7b's intentional duplication between capture and field-end scoring paths
- **Pre-conditions:** T1.a; pairs naturally with T2.a/T2.b if those touch the scoring loop
- **Effort:** 8-12 hours (revised up from 6-10 to absorb Phase 3 deferrals)

**T2.d — F4.34: Water depreciation source-of-truth consolidation**
- Smaller scope but same pattern
- Effort: 2-3 hours
- Can ride alongside T2.c

**T2.e — F4.23: Spirit sale-price architecture (three sale paths → one)**
- Per-element bonus + unified sale path
- **Pre-conditions:** T2.a/T2.b establish SpiritEffects ownership patterns
- **Effort:** 4-6 hours

### Tier 3 — Pipeline consolidation (collapse the parallel paths)

Tasks that unify multiple-methods-doing-one-thing into single dispatch.

**T3.a — F4.15: Unify consumable activation paths**
- Three current paths (card-target, alchemical, zodiac/immediate) → one
- Plus Tier 2 UX simplification (remove Use → Activate two-step) noted during F3.15 item 1 work
- **Pre-conditions:** T1.a; conceptually independent of T2.a but useful to land it before T3.b
- **Effort:** 8-12 hours

**T3.b — F4.17: Discard pipeline unification**
- Multiple discard pathways currently bypass stamp dispatch
- Consumable-driven discards (Horse, Monkey), reveal-miss discards (hex_51) need unified dispatch
- **Pre-conditions:** T1.a (hook catalogue tells us if existing hooks cover this)
- **Effort:** 6-8 hours

**T3.c — F4.18: Capture-event dispatch consolidation**
- Phase 1.5 scoring + capture-trigger stamp dispatcher are currently two loops
- Robert wants to reconsider during this consolidation whether merged vs separated trigger types produces better gameplay (playtest decision)
- **Pre-conditions:** T2.c (Wu Xing consolidation may inform this)
- **Effort:** 4-6 hours

**T3.d — F4.22: Duplicate card ID handling (Animal Deck systemic bug)**
- Audit-flagged systemic issue from F2.1 audit Garden investigation
- May reveal the right fix only after T2.a/T2.b clean adjacent areas
- **Effort:** 4-6 hours

### Tier 4 — UI/Polish on the consolidated foundation

Tasks that depend on architectural consolidation being complete.

**T4.a — F4.37: Post-consolidation tooltip recomb (absorbs F3.18)**
- Unify tooltip rendering across spirits / consumables / cards
- Add the surface-area additions from F3.18 (card tooltip enrichment)
- **Pre-conditions:** T2.a/T2.b/T2.c (need consolidated source for tooltip data)
- **Effort:** 6-10 hours (absorbing F3.18's 2-3h)

**T4.b — F4.36: Effect-code migration to read from spirits.js tooltipBase fields**
- Pairs with T4.a; the codebase reads tooltip data from a single declarative source
- **Pre-conditions:** T2.a/T2.b
- **Effort:** 4-6 hours

**T4.c — Phase 3 deferred items that depend on F4.20+F4.38**
- F3.16 (scoring log overhaul)
- F3.17 (retrigger surfacing — subsumed by F3.16)
- Apply after Tier 2 consolidation is stable
- **Effort:** 4-6 hours

### Tier 5 — Cleanup and smaller items (parallelizable / fillable)

These can be done in parallel with the above or used as "context-switching" work between bigger tasks.

- **F4.1** — Dead method removal
- **F4.2.a** — ShrineScene dead method removal
- **F4.2.b** — GRM internal field rename + dead infrastructure removal
- **F4.4, F4.5** — Unused exports / accumulator removal
- **F4.6** — Speculative card data finalization
- **F4.7** — Comment corrections
- **F4.8** — GameplayLogger console.log flooding
- **F4.9** — Three discount stacking patterns consolidation
- **F4.10** — Three Marks naming legacy cleanup
- **F4.19** — Monkey/Horse known issues (yaku detection, UI transitions)
- **F4.21** — Spirit ID system normalization
- **F4.25** — Declarative spirit formula refactor (three-place duplication)
- **F4.26** — Transcendence powerLevel semantics revisit
- **F4.27** — Cat 5 maturation spirits migration (Past Life & Cuckoo Egg)
- **F4.28** — Spirit stacking math audit + canonical pattern
- **F4.29** — Hook-firing centralization audit
- **F4.30** — Gankyil auto-capture threshold + spirit reconsideration
- **F4.31** — Snow/Ice and Clay/Pottery proc timing
- **F4.32** — Silk anti-stranding scope verification
- **F4.33** — Festival per-round cap + proportional threshold scaling
- **F4.35** — Scene rendering unification (GameScene ↔ ShrineScene shared module)

**Effort for Tier 5:** Hard to estimate as a block — could be 30-50 hours across all items. Many are 30 min - 2 hour each.

**Sequencing note:** Cleanup tasks (Tier 5) should generally come AFTER the consolidations in Tier 2-3, because consolidations may make some cleanup tasks irrelevant (e.g., F4.25's three-place duplication may collapse to one place during T2.a). Don't burn time cleaning up code that's about to move.

---

## Critical sequencing rules

1. **Tier 1 before everything else.** Don't start consolidations without the map.

2. **Tier 2 before Tier 4.** Tooltip recomb (T4.a) needs the consolidated logic to read from. Tier 4 tasks have explicit pre-conditions in Tier 2.

3. **Tier 5 cleanup comes LATER than it seems, not earlier.** Tempting to start with quick wins, but consolidations may absorb them. Wait.

4. **F4.13 (negative spirit powerLevel) is already moved to Phase 1 (F1.8.a)** — verify it's actually shipped before assuming it's still pending.

5. **F4.11 and F4.12 are already moved to Phase 1** — verify the same.

---

## Phase 4 estimated total

Adding up by tier:
- Tier 1 (Map-making): 10-16 hours
- Tier 2 (Logic centralization): 30-45 hours
- Tier 3 (Pipeline consolidation): 22-32 hours
- Tier 4 (UI/Polish): 14-22 hours
- Tier 5 (Cleanup): 30-50 hours (estimate, parallelizable)

**Phase 4 total estimate: ~100-165 hours of work.**

This will span many sessions. Don't try to fit it into one. Hand off at phase-internal boundaries if needed (e.g., end of Tier 1 is a natural seam).

---

## What to do BEFORE starting Phase 4 work

1. **Read `PHASE_4_ENTRY_BRIEF.md`** for project orientation
2. **Read `PHASE_3_LESSONS.md`** for working patterns
3. **Read this document** for ordering
4. **Discuss with Robert:**
   - Confirm the four-tier ordering
   - Confirm Tier 1 starts with T1.a (F4.24 architecture catalogue) — or whatever Robert prioritizes
   - Confirm any reordering based on current concerns (none flagged 2026-06-02, but worth re-asking)
5. **Set up infrastructure** (CLAUDE.md, MCP, Skills) as the FIRST work of the new conversation — see `CLAUDE_MD_DRAFT.md` and `INFRASTRUCTURE_PLAN.md`
6. **Then start T1.a.** Do recon on the current codebase before drafting the architecture catalogue work prompt.

---

## A note on "nothing is broken" as a starting condition

Robert noted (2026-06-02) that the codebase is currently stable — nothing actively broken, no urgent fires. This is a *good* starting condition for Phase 4 work, because:

- Architectural changes carry regression risk; starting from a stable baseline makes regressions easier to detect
- No competing urgency means Phase 4 can be done in the right order rather than the firefighting order
- Robert's confidence in the codebase means experimentation is safer

The flip side: "nothing is broken" can hide where things WILL break under future stress. Phase 4's value is reducing that future-stress brittleness. Don't get complacent about the calm.

---

## What success looks like at end of Phase 4

- Each subsystem owns its concerns (spirit logic in SpiritEffects, hexagram logic in HexagramEffects, etc.)
- A single architecture catalogue documents all hooks, helpers, and dispatch functions
- DESIGN_DOC_V5.md is trustworthy as a reference (patches applied)
- Pipeline consolidations have unified parallel paths into single dispatch points
- Tooltip and effect code read from declarative sources
- Phase 5 content/polish/tuning work can be built on stable abstractions

What success does NOT look like:
- A complete rewrite (Phase 4 is migration, not greenfield)
- Performance regressions (consolidation should be neutral or positive on perf)
- Disturbing the design (Phase 4 is implementation cleanup, not redesign)
