# Phase 4 Entry Brief

> **STATUS: SUPERSEDED as a live anchor by docs/process/PHASE4_STATE.md (2026-06-07). Retained as the Phase-4 bootstrap record; do not use as current guidance.**

**For:** The next Claude entering Phase 4 of the Hanatu audit/overhaul.
**Status:** Phase 3 complete as of 2026-06-02. Phase 4 not yet started.
**This document:** Onboarding. Read this first. It points to everything else.

---

## What is Hanatu?

A koi-koi-inspired roguelike deckbuilder built in Phaser.js/Vite. Solo dev project by Robert. Deep cultural systems integration (Hanafuda/Hwatu, Wu Xing, I Ching, Buddhist concepts) where the cultural elements drive distinct mechanics, not just aesthetics. The game is well past prototype — months of design + implementation work have produced a substantively playable system with 113 spirits, 64 hexagrams, a full chakra/stamp/zodiac/alchemical consumable economy, and a 36-round run structure across 6 acts.

You're entering as the design/architecture collaborator. Robert delegates implementation to Claude Code (via VS Code terminal); you draft the prompts and reason about architecture together.

**Authoritative reference:** `DESIGN_DOC_V5.md` — the design source-of-truth. (Note: this doc has known discrepancies with code that Phase 4 will reconcile; see `DESIGN_DOC_PATCHES.md`.)

---

## What just happened: Phase 3 completion (2026-06-02)

Phase 3 was the most recent chapter: UI/UX polish and bug fixes following Phases 0-2 (foundational corrections, spirit/hexagram/consumable mechanic audits).

### Shipped in Phase 3
- **F3.5b** — Stack-aggregated spirit tooltips (the `tooltipBase` + per-spirit contribution function pattern)
- **F3.7a, F3.7b** — Capture and field-end scoring logging
- **F3.9** — Round-end ki decomposition with per-component breakdown (flat, hand, Earth, interest, hookDelta)
- **F3.10** — Partial UI cleanups (sub-items)
- **F3.11a** — Four new scoring step animation handlers (retrigger, capture, glory_draw, field_score)
- **F3.12** — Card edition visibility (Gold/Crystal/Ghost badges + tooltip lines)
- **F3.15 item 1** — Cancel buttons across all consumable activation paths
- **F3.15 item 4** — Crown Chakra card image refresh (via `baseImageId`)
- **F3.20** — hex_29 yaku-disabled UX polish (subtitle + button rename)
- **F3.22** — Round-end overlay sizing + isolation (took 3 iterations to get right)
- **F3.23** — Leaf-spawned field slot rendering (`Math.max(maxSlots, slots.length)` iteration)

### Closed without code changes
- F3.2, F3.10 sub-items, F3.13, F3.15 items 2/3/5/6/7/8, F3.21
- These were either silently fixed by adjacent architectural work, subsumed by other tasks, or based on misunderstandings that no longer applied

### Deferred to Phase 4 (architectural coupling)
- **F3.7c, F3.11b** — Wu Xing proc surfacing, per-source enhancement contributions → await F4.38
- **F3.16, F3.17** — Scoring log overhaul + retrigger surfacing → await F4.20 + F4.38
- **F3.18** — Card tooltip enrichment → await F4.37

### Deferred to Phase 5 (polish)
- F3.14 (Past Life visual indicator), F3.19 (Infinity yaku display)

---

## What's coming: Phase 4 — architectural consolidation

Phase 4 is categorically different work from Phase 3. Phase 3 was targeted fixes; Phase 4 is **drawing new architecture maps and migrating code into them.**

The major Phase 4 tasks (see OVERHAUL_PLAN.md for full descriptions):

- **F4.13** — Negative spirit power-level architecture formalization (`stackCount: 1, powerLevel: N`)
- **F4.14** — Design Doc V5 reconciliation pass (uses `DESIGN_DOC_PATCHES.md` worklist)
- **F4.15** — Unify consumable activation paths (3 paths → 1) + UX flow simplification (Tier 2)
- **F4.20** — Spirit logic centralization (move scattered spirit effect code into one place)
- **F4.24** — Codebase architecture catalogue (hook + helper reference, possibly as new design doc section)
- **F4.36** — Effect-code migration (where applicable; read from `tooltipBase` fields)
- **F4.37** — Post-consolidation tooltip recomb (absorbs F3.18)
- **F4.38** — Wu Xing enhancement effect code consolidation (absorbs F3.7c, F3.11b, parts of F3.16)

Plus assorted smaller tasks. **You'll need to do a Phase 4 task ordering pass once oriented** — see `PHASE_4_TASK_ORDERING.md` for analysis.

**Effort estimate:** Phase 4 is the second-largest phase after Phase 5. Roughly **100-165 hours of work** across many sessions. See `PHASE_4_TASK_ORDERING.md` for the per-tier breakdown.

---

## Critical first instruction: Do a fresh codebase read

The audit underlying Phase 4's task descriptions was done in early May 2026. It's now June. Roughly **6+ weeks of Phase 1-3 implementation work has happened since.** The codebase has materially evolved:

- F3.5b shipped a tooltip dispatch pattern (`tooltipBase` fields)
- F3.9 added per-component ki addKi calls with reason coding
- F3.12 added the edition badge system with `card.edition` mutations
- F3.15 item 4 established the `baseImageId` mechanism for sprite identity overrides
- F3.22 established a modal-sizing pattern that fits the play area lane
- F3.23 changed field iteration from `maxSlots` to `Math.max(maxSlots, slots.length)`
- F4.14 has been accumulating design doc deltas as we went
- Multiple "silent fix" closures mean tasks in the plan may be already-resolved

**Before working on ANY Phase 4 task, do a focused recon on its target area.** Read the current code, not the audit's description of it. Some tasks may be partially or fully obsoleted.

Recommended first-session sequence:

1. Read this brief (~10 min)
2. Skim `PHASE_3_LESSONS.md` for working patterns (~15 min)
3. Survey the current codebase at a high level:
   - `/src/scenes/GameScene.js` (largest file, lots of churn)
   - `/src/scenes/ShrineScene.js`
   - `/src/systems/RunManager.js`
   - `/src/systems/GameRoundManager.js`
   - `/src/systems/HexagramEffects.js`
   - `/src/systems/ConsumableEffects.js`
   - `/src/systems/SpiritEffects.js`
   - `/src/data/spirits.js`, `consumables.js`, `hexagrams.js`, `stamps.js`
4. With Robert, agree on Phase 4 task ordering (see `PHASE_4_TASK_ORDERING.md` for the proposed sequence)
5. Then start the first task — but recon its target area first

---

## Phase 3 architectural patterns Phase 4 must respect

These patterns were established in Phase 3. Phase 4 work in the relevant areas should **extend or refine** these, not replace them with competing approaches. If Phase 4 architectural work suggests a different direction, that's a design decision for Robert, not a unilateral choice.

### Tooltip dispatch (F3.5b)
- Spirits define `tooltipBase` fields and per-spirit contribution functions
- ~40 spirits use stack-aware dispatch branches
- F3.18 (deferred) and F4.37 will consolidate the rest into this pattern
- **Do NOT propose alternative tooltip mechanisms.** Extend `tooltipBase`.

### Card sprite identity overrides (F3.15 item 4)
- `_tex(card)` returns `card.baseImageId ?? card.id`
- Used by Crown Chakra, speculative cards, hex-duplicate cards
- Mechanism predates F3.15 item 4; the fix was just ensuring Crown Chakra sets the override
- **Do NOT propose alternative sprite identity systems.** Build on `baseImageId`.

### Ki decomposition with reason coding (F3.9)
- `addKi(amount, reason)` and `spendKi(amount, reason)` are reason-coded
- Round-end ki broken down: flat + hand + Earth + interest + hookDelta
- Decomposed addKi calls (not single bulk addKi) for visibility in logs
- **Do NOT propose reverting to bulk addKi.** Extend the decomposition.

### Modal overlay sizing (F3.22)
- Modal overlays that occur during gameplay should fit within the play area lane (between top spirit row and lower divider at y=600)
- Round-end overlay: 720×460 at cy=365
- Depth 120 for backdrop, 121 for content
- **Do NOT propose full-screen modals during round-end.** Preserve persistent run-state visibility.

### Field iteration (F3.23)
- `_renderField` iterates `Math.max(maxSlots, slots.length)` positions
- `computeFieldSlotPositions(totalSlots)` handles arbitrary counts
- Empty positions render hex backgrounds; only occupied slots render cards
- Handles initial deals with fewer distinct months, Rooster zodiac, Amber transcendence, Leaf-spawned bonus slots
- **Do NOT propose reverting to `maxSlots`-only iteration.** This is the correct general form.

### Cancel button affordance (F3.15 item 1)
- All consumable activations get a Cancel button next to Use/Activate
- Zodiac "Sell" moved to the consumable expansion area (clicking the consumable card itself), not during activation
- Cancel position: HAND_CX + 110; styling: `0x3a1a1a` bg, `0xaa4444` border, `#ffcccc` text
- F4.15 (consumable activation unification) will absorb and possibly refactor this; preserve the affordance
- **Do NOT remove Cancel buttons during F4.15 work.** Keep them; possibly relocate them.

### Yaku-disabled UX (F3.20)
- Hexagrams that return `disablesYaku: true` trigger:
  - Modal title: "Bank Score?" (vs "Yaku Reached!")
  - Italic subtitle: "Yaku are disabled — bank or keep playing each turn."
  - Button label: "Keep Playing" (vs "Continue Playing")
- **Do NOT change this UX during F4 work unless specifically tasked.**

---

## Pointers to other documents

In `/mnt/user-data/outputs/` (or wherever Robert has staged the handoff):

| File | Purpose |
|---|---|
| `OVERHAUL_PLAN.md` | The master task plan. Phase 4 task descriptions live here. Updated throughout the audit. |
| `DECISIONS_LOG.md` | Chronological log of design and architectural decisions across Phases 0-3. Use for "why did we do X?" lookups. |
| `DESIGN_DOC_PATCHES.md` | Worklist of 64 design doc corrections (the F4.14 work, ready to apply). |
| `PHASE_3_LESSONS.md` | 13 working patterns from Phase 0-3 collaboration. Read after this brief. |
| `PHASE_4_TASK_ORDERING.md` | Proposed dependency-aware ordering for Phase 4 tasks. Discuss with Robert before starting. |
| `CLAUDE_MD_DRAFT.md` → `./CLAUDE.md` | Project-level meta for Claude Code. Currently a draft in the handoff package; install as `./CLAUDE.md` at the Hanatu repo root as part of first-session infrastructure setup. |
| `PHASE_2_TESTING.md` | Phase 2 bug log. Most resolved; F3.22 and F3.23 closed the last two during Phase 3. |
| `DESIGN_DOC_V5.md` | Authoritative design reference (modulo the patches in DESIGN_DOC_PATCHES.md). |

---

## Workflow conventions established in Phase 0-3

These are explicit because Phase 4 will be denser than Phase 3 and ad-hoc conventions break down faster.

### Plan/decisions saving
- `OVERHAUL_PLAN.md` lives in `/home/claude/audit/` while being edited
- After every meaningful edit: `cp /home/claude/audit/OVERHAUL_PLAN.md /mnt/user-data/outputs/`
- Same for `DECISIONS_LOG.md` and other audit artifacts
- This protects against context degradation across compactions

### Recon pattern (see PHASE_3_LESSONS.md Pattern 1)
- Before drafting any fix prompt: run a JavaScript console recon against the current code
- The pattern: fetch the file, regex-search for symbols, print surrounding context with offsets
- This is non-negotiable for Phase 4 because the audit is stale

### Fix prompt structure (see PHASE_3_LESSONS.md Pattern 7)
- Background / Root cause / Step-by-step / Tests / Cross-refs / Notes
- This structure produced consistently clean results across Phase 3

### Closure types (see PHASE_3_LESSONS.md Pattern 8)
- ✅ Shipped / ✅ Silently fixed / ✅ Subsumed / ✅ No-op / ⏸️ Deferred / 🔧 Active
- Document the closure type and rationale; preserve original scope text below

### When to ask (see PHASE_3_LESSONS.md Pattern 10)
- Multiple defensible architectural options → frame 2-3, articulate tradeoffs, give leaning, stop
- Single-direction implementation details → just proceed

---

## A few things specifically about Robert

(These reduce friction; not strict rules.)

- **Robert is a solo dev** with finite attention. Don't bury decisions in walls of text. State the question, give the lean, list options briefly.
- **Robert prefers precedent-matching** unless there's a reason not to. If a similar mechanism exists in code, default to its pattern.
- **Robert thinks visually and via reactions.** Screenshots are common; expect to look at them and reason about UI from them.
- **Robert appreciates honest closure.** "Silently fixed by F4.13 prep" is better than pretending you shipped a fix when you didn't.
- **Robert has a strong sense for when context is degrading** and will call it out. When this happens, save state and consider whether to hand off.

---

## How to start your first Phase 4 session

1. **Read this brief, then `PHASE_3_LESSONS.md`.** ~30 min total.
2. **Verify the workspace state:** check that all the files listed under "Pointers" exist and look right.
3. **Survey the codebase at a high level.** Don't deep-read yet; just orient.
4. **With Robert, discuss Phase 4 task ordering.** `PHASE_4_TASK_ORDERING.md` has a proposed sequence — confirm or adjust.
5. **Pick the first task. Do recon on its target area BEFORE drafting anything.**
6. **From there, the patterns from PHASE_3_LESSONS.md should feel like reasonable defaults.**

---

## What success looks like in Phase 4

Phase 4 is harder than Phase 3 because:
- Tasks are bigger (architectural consolidation vs targeted fixes)
- Diffs are larger (more risk of regression)
- The code surface is broader (multiple files, multiple systems)
- Design decisions are higher-stakes (you're locking in patterns for Phase 5)

Success looks like:
- Each consolidation lands without breaking adjacent systems
- The codebase ends Phase 4 with cleaner separation of concerns than it has now
- The design doc reconciliation completes (DESIGN_DOC_PATCHES.md worklist applied)
- DESIGN_DOC_V5.md becomes trustworthy as a reference again
- Phase 5 starts from a position where new features can be built on stable abstractions

Failure modes to watch for:
- Architectural over-reach (proposing redesigns that exceed the task's actual scope)
- Pattern competition (proposing new mechanisms when Phase 3 already established something for the same purpose)
- Skipping recon (drafting fixes from compressed memory of the audit's stale picture)
- Skipping the "verify silent fixes" check (working on bugs that no longer exist)

---

## One last note

The work in Phases 0-3 produced a project that's genuinely close to demo-ready. The architecture has accumulated some cruft (which is why Phase 4 exists), but the design and core mechanics are sound. Your job in Phase 4 isn't to redesign Hanatu — it's to clean up the implementation so Phase 5 (content/polish/tuning/save-load/tutorial) can ship without fighting the codebase.

Be precise. Defer when uncertain. Trust Robert's preferences as you observe them.

Good luck.
