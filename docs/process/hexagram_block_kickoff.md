# Hexagram-Logic Centralization — Block Kickoff Brief + Opening Recon

> **Status:** Block setup, for the NEXT session (after the consumable block closed 2026-06-09). The
> third and final Tier-2 category block. Frames the block + provides the opening read-only recon that
> produces the hexagram triage inventory — the hexagram equivalent of the consumable block's
> `consumable_inventory_pass1.md` and the spirit block's `F4.16_F4.20_triage_ledger.md`.
> Decided in D-F4-SCOPE Part 1 (DECISIONS_LOG): each category gets its own per-category handoff.

> **This doc is the handoff test.** A fresh conversation should be able to open this, read the
> pointed-to docs, run the opening recon, and be fully oriented — without needing the prior session's
> context. If that works, the per-category handoff discipline holds.

---

## 1. Where this sits

Phase 4 Tier-2 is "logic centralization" — drain each scattered category's logic into its canonical
home. Two category blocks are CLOSED:
- **Spirit-logic** (F4.20) → `SpiritEffects.js`. Closed 2026-06-07.
- **Consumable-logic** → `ConsumableEffects.js`. Closed 2026-06-09 (`D-F4-CONSUMABLES-TIER2`).

**Hexagram-logic is the third and last.** After it closes, the **F4.24a end-of-Tier-2 checkpoint**
(diff-against-pass-1) runs, and Tier-2 is done. So this block is the final category drain before the
checkpoint.

**Expected THORNIER than consumables** — and here's the precise reason, which shapes the whole block:

---

## 2. The thesis: hook-shaped seepage (not manager-resident seepage)

The consumable block's seepage was *manager-resident*: effect logic sitting in RunManager that should
have been in ConsumableEffects. Clean to characterize ("this method is in the wrong file"), and the
scenes were already clean delegators.

The hexagram block's seepage is **hook-shaped**, which is a different and harder shape. Hexagrams
have a clean intended pattern already: an effect influences the game by defining a **hook**
(`onCardScored`, `modifyFieldSlots`, `modifyWaterDepreciation`, etc.) in `HEXAGRAM_EFFECTS`, and the
engine calls it via **`applyHook(hookName, fallback, ...args)`** — which returns the fallback when no
active effect defines that hook. That indirection (`HexagramEffects.js:719`) is the canonical
surface. The full intended hook interface is enumerated in the `HexagramEffects.js` header comment
(lines 7–44) and mirrored in DESIGN_DOC_V5 §9.1.2.

**So the seepage question is not "where does the logic live" but "where does hex behavior bypass the
hook indirection and reach into the engine directly."** Concretely, the recon hunts for:
- Hex effect IDs checked by name in GRM/ScoringEngine (e.g. `if (hex.effect === 'xyz')`) instead of
  via a hook — special-casing that should be a hook.
- Hooks called via direct `getActiveEffect()?.someHook(...)` reads scattered in the engine instead of
  through `applyHook` (inconsistent dispatch — some sites may bypass the fallback contract).
- Hook *names* that are documented-but-never-called, called-but-never-defined, or defined-but-
  undocumented (the F4.24 inventory §2b started a "hook name reconciliation" table — extend it).
- Engine logic that *should* be expressible as a hook but is hardcoded with a hex-specific branch.

This is closer to the spirit block's seepage shape (scattered effect logic) than the consumable
block's (misplaced methods) — so the spirit block's triage ledger is the better mental model.

---

## 3. The structural tangle: the import cycle (already documented)

The F4.24 inventory ALREADY found and documented the relevant cycles (don't re-discover — confirm):
- **`RunManager ↔ HexagramEffects`** — RunManager imports HexagramEffects (`applyHook`);
  HexagramEffects imports RunManager (the `run` singleton). Resolves at runtime via ES-module
  circular-ref timing, but it's a real structural cycle.
- **Transitive:** `ScoringEngine → SpiritEffects → RunManager → HexagramEffects → RunManager`.

Untangling (or at least *characterizing and containing*) this cycle is a named structural goal of the
block, distinct from the seepage drain. The recon should assess: is the cycle load-bearing (genuine
mutual dependency) or incidental (HexagramEffects only needs `run` for a few reads that could be
passed as args)? That assessment decides whether the block can break the cycle or must document it as
accepted.

---

## 4. Orienting documents (read these first, in this order)

1. **`docs/process/PHASE4_STATE.md`** — the "where are we" doc. §3 (task stack — hexagram block is
   NEXT), §4 (banked threads, incl. what this block may inherit), §2 (tier model), §6 (handoff
   template). START HERE.
2. **`docs/archive/phase4/F4.24_inventory_pass1.md`** — the spirit-era registry census. CRITICAL for
   this block: its **§2 (Hexagram hook system)** already maps `getActiveEffect`/`applyHook` and
   started a **§2b hook-name reconciliation** (documented/called/defined columns); its import-cycle
   section already found the RM↔HexagramEffects cycle. This is the recon's biggest head-start —
   confirm + extend it rather than starting cold. (STALE DIAGNOSTIC caveat: it predates both category
   blocks; re-verify against current source.)
3. **`src/systems/HexagramEffects.js`** — the home file. Header (lines 7–44) = the intended hook
   interface (the baseline "what's canonical"). `HEXAGRAM_EFFECTS` = all effect defs. `applyHook`/
   `getActiveEffect` (695–723) = the dispatch surface. `getFire*/Water/Earth/Metal/Wood*` (729–765)
   = the Wu Xing config getters (these are CORRECT here — hex-responsive; not seepage).
4. **`docs/DESIGN_DOC_V5.md` §9** — hexagram system design intent (the hook list in §9.1.2 mirrors the
   header; the design source of truth for what hexagrams are *supposed* to do).
5. **`docs/process/DECISIONS_LOG.md`** — for the pattern this block follows: `D-F4-CONSUMABLES-TIER2`
   (the just-closed sibling block — same arc shape: recon → triage → campaigns → closeout) and
   `D-F4-SCOPE` (the category-reorganization decision that defined per-category handoffs).
6. **`docs/process/PHASE4_consolidation_candidates.md`** — banked candidates; check for any
   hexagram-tagged items.

---

## 5. What this block may INHERIT (cross-block awareness)

- **The Tier-3 scoring-pipeline pass** is where F4.38 (Wu Xing proc surface) + the scoring-loop
  3-cluster dedup landed. Hexagram `onCardScored` lives in that SAME scoring loop (GRM
  `_scoreFieldCards`/`_addCapture`/retrigger), interleaved with the Wu Xing procs and spirit
  `onCardScored`. So the hexagram block and the Tier-3 pass share territory — the recon should flag
  where hexagram scoring logic is entangled with the Wu Xing/spirit scoring it sits beside, and
  decide what's this-block (hook-dispatch cleanup) vs. Tier-3 (scoring-loop restructure). Do NOT
  re-open F4.38; just note the shared boundary.
- **`computeFinalScore`** hook (HexagramEffects) overrides the per-capture score formula for some hex
  (e.g. one_yaku_disabled / hex_56) — a scoring-pipeline touchpoint; likely Tier-3-adjacent.

---

## 6. The opening recon (read-only — this is the block's first campaign + the handoff test)

Mirror the consumable block's opening: a READ-ONLY recon producing a triage inventory. NO edits.
Deliverables:
- **Confirm + extend the F4.24 §2b hook-name reconciliation** against current source: every hook
  name, documented? / called-via-applyHook? / defined-by-≥1-effect? Flag the mismatches (documented-
  but-dead, called-but-undefined, defined-but-undocumented).
- **The seepage census** (the core deliverable): every site where hex behavior bypasses the hook
  indirection — name-checks of `hex.effect` in the engine, direct `getActiveEffect()?.hook()` reads
  outside `applyHook`, hardcoded hex-specific branches. Locate each (file:line), characterize it
  (could-be-a-hook vs. legitimately-inline), and bucket it (migrate / document-in-place / cross-block
  to Tier-3).
- **The import-cycle assessment** (§3): load-bearing or breakable? Recommend.
- **The canonical-home + boundary statement:** confirm the rule (hex behavior = a hook in
  `HEXAGRAM_EFFECTS`, dispatched via `applyHook`; the config getters stay; the engine calls hooks, it
  doesn't special-case hex IDs). Name the attach/proc-style boundaries if any emerge (as A3 did for
  Wu Xing).
- **Triage → campaign plan:** Bucket A (migrate-to-hook) / Bucket B (document-in-place) / cross-block
  (Tier-3), lowest-risk-first ordering, like the consumable block's §6.
- **Recommend whether this block needs its own standing inventory doc** (`hexagram_inventory_pass1.md`)
  the way consumables did — likely yes, given the expected complexity; the recon's output seeds it.

**STOP conditions:** if the seepage turns out NOT to be hook-shaped (e.g. it's mostly manager-
resident after all), say so and re-frame. If the import cycle is load-bearing in a way that blocks
the canonical-home rule, surface it before any campaign. Read-only — characterize, recommend, edit
nothing.

---

## 7. Process reminders (carried from the consumable + spirit blocks)

- **Recon-before-edit is non-negotiable.** Every migration preceded by read-only recon; recon gates
  catch traps before code changes.
- **[PRESERVE] vs [FIX].** Migrations preserve behavior byte-identically; anything that changes
  behavior (incl. timing) needs an explicit Robert ruling, not a silent fold-in.
- **Scene-UI is the headless-test blind spot** — manual gates for any reachable-UI change (less
  likely to bite here than in consumables, since hex logic is mostly engine-side, but stay alert).
- **Deletion: method-by-method with per-method caller checks**, never contiguous-range (the G1
  over-deletion lesson).
- **Stale audits re-verified both directions** — the F4.24 inventory predates two blocks; treat it as
  a candidate list, re-grep current source.
- **Design calls belong to Robert.** Claude reasons through tradeoffs + surfaces options; Robert
  rules. Separate architectural questions from balance questions (balance → Phase 5).
- **Codebase access = `project_knowledge_search`** (synced from GitHub), not filesystem/MCP. Fresh
  codebase read at the start. Campaign prompts delivered as markdown artifacts; Robert bridges to
  Claude Code; re-sync after each push before verification.
- **Verify the load-bearing claim** of each terminal report against synced source before proceeding.

---

## 8. The first message of the next session

Suggested opening: "We're starting the hexagram-logic centralization block — the third and final
Tier-2 category drain. Read this kickoff brief + the orienting docs (§4), then run the opening
read-only recon (§6): confirm/extend the hook-name reconciliation, produce the seepage census,
assess the import cycle, and bring back a triage + campaign plan. Don't edit anything yet."
