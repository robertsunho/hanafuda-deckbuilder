# PHASE4_STATE.md — Hanatu Phase 4: scope, progress, process, state

> **The single authoritative "where are we in Phase 4" doc.** A fresh conversation reads THIS first.
> It supersedes, as the *live* anchor, the archived `PHASE_4_ENTRY_BRIEF.md`, `PHASE_4_TASK_ORDERING.md`,
> and `UPLOAD_MANIFEST.md` (those are retained as the Phase-4 bootstrap record, not current guidance).
> Update at every category/block boundary (the close-out ritual). Last updated: 2026-06-07.

---

## 1. Orientation

Hanatu = koi-koi/hwatu-inspired roguelike deckbuilder (Phaser.js + Vite, vanilla JS). Solo dev
(Robert). Two-Claude workflow: **design-side Claude** (claude.ai) reasons about architecture and
drafts self-contained prompts; **Claude Code** (terminal) executes with recon-before-edit and
commits/pushes; Robert bridges (pastes prompts, re-syncs the repo into Project knowledge after
pushes, makes design rulings). The repo is the single source of truth; it reaches Project knowledge
through the GitHub sync (do NOT separately upload repo docs).

**Phase 4 thesis (Robert):** "Put things where they belong" (each subsystem owns its concerns;
maximize single-sources-of-truth) + "consolidate parallel paths" (collapse the patchwork of
multiple methods doing one job). Phase 4 is migration/cleanup, NOT redesign and NOT greenfield.
The risk it addresses is invisible debt: nothing's broken, but scattered logic makes Phase 5
(content/polish/tuning) harder than it should be.

---

## 2. The four-tier structure (the map; absorbed from PHASE_4_TASK_ORDERING)

- **Tier 1 — Map-making.** F4.24a architecture inventory (DONE — `F4.24_inventory_pass1.md`,
  a recurring diagnostic), F4.14 design-doc reconciliation. ✅ structurally complete.
- **Tier 2 — Logic centralization (CURRENT TIER).** Move scattered spirit/consumable/hexagram
  logic into its home subsystem. Three category blocks: **spirits ✅ DONE (F4.20)** → **consumables
  (NEXT)** → **hexagrams**. Then the end-of-Tier-2 F4.24a checkpoint (expanded to audit consumable
  + hexagram seepage).
- **Tier 3 — Pipeline consolidation.** Collapse parallel paths into single dispatch. Partly
  pre-shipped: F4.17 (discard pipeline), F4.18b (round-end). Remaining incl. F4.15 (consumable
  activation — now a MEMBER of the consumable block), F4.18 (capture-event), F4.22 (dup card IDs),
  + the GRM/RunManager destination audit (D-F4-SCOPE Part 2, late Tier 3).
- **Tier 4 — UI/polish on the consolidated foundation.** F4.37/F4.36 (tooltip recomb + declarative
  read), Phase-3 deferreds (F3.16 scoring log).
- **Tier 5 — Cleanup (parallelizable).** Dead-code/naming/comment items; do AFTER consolidations
  (they may absorb cleanup targets). Long tail.
- **Terminal: F4.24b** — the prescriptive `docs/ARCHITECTURE.md` (written ONCE, late Phase 4 /
  early Phase 5, against the stabilized end-state). Does NOT exist yet.

Sequencing rules: Tier 1 before all; Tier 2 before Tier 4; Tier 5 later-than-it-seems; category
handoffs at block boundaries (see §6).

---

## 3. Current task stack (where we are / what's next)

```
Tier 2 — logic centralization
├─ F4.20 spirit-logic centralization ............... ✅ FULLY CLOSED (2026-06-07)
│    first wave, F4.20-FIX (neg accumulators), Candidate F audit + getter recon (verdict A),
│    F4.20-FIX2 (5 effect sites), transcend-placement + mirror/memory ctx (site #6),
│    second counter wave (snails + missing_number), Bucket-B/T doc sweep — all shipped.
├─ Consumable-logic centralization ................. ✅ CLOSED (2026-06-09) — see DECISIONS_LOG D-F4-CONSUMABLES-TIER2
│    A1 stamp, A2 chakra (7, Option A), A3 Wu Xing attach (SHARED-STATE), data consolidation
│    (zodiac+stamps→consumables.js), Water-dep SSOT + F4.34, F4.15a/b dispatch collapse,
│    Candidate G1/G2 (shrine random-8 surface), Tier-5 dead-code sweep — all shipped.
│    F4.38 (Wu Xing proc surface) DEFERRED WHOLE to Tier-3 (scoring-loop dedup). See §4.
├─ Hexagram-logic centralization ................... ✅ CLOSED (2026-06-09) — see DECISIONS_LOG D-F4-HEXAGRAMS-TIER2
│    Recon: seepage fully hook-shaped, ZERO manager-resident hex logic. Smaller than feared.
│    B1 header reconciliation (3-dispatch-class model + inventory doc); A1 import-cycle
│    document-and-contain + class-(c) docs + hex_30 drift reconcile. Dual dispatch KEPT (no
│    fireHook); import cycle ACCEPTED. X1 (onCardScored/computeFinalScore/onCaptureComplete
│    scoring-loop dup) HANDED OFF to Tier-3 (subsumes F4.38).
└─ F4.24a end-of-Tier-2 checkpoint ................. ✅ SHIPPED (2026-06-10) — pass-2 snapshot, 0 regressions
     Verdict: Tier-2 thesis held — spirit/consumable/hexagram logic drained to canonical homes;
     backbone −2 files/−527 lines; 8/14 pass-1 observations resolved. Remaining seepage is all
     intentional (Bucket-B/T/N) or known-deferred to Tier-3. Snapshot: docs/archive/phase4/F4.24_inventory_pass2.md

══ TIER 2 COMPLETE (2026-06-10) ══ — all three category drains closed + checkpoint verified.

Tier 3 — pipeline consolidation  ◀── NEXT
├─ Scoring-loop pass ............................... the marquee Tier-3 task; bundles three same-shape inheritances:
│    • X1 — hexagram scoring-loop dup (onCardScored/computeFinalScore/onCaptureComplete twins)
│    • F4.38 — Wu Xing proc surface (Fire/Water/Earth/Wood, deferred-whole from consumables)
│    • N2 — stamp runtime-trigger surface (F4.38-sibling, surfaced by F4.24a)
│    NOTE: N2 carries a live bug (PHASE4_consolidation_candidates.md:119 — _dispatchStampDiscardEffects
│    draws to hand with no cap check); track as its own [FIX], do NOT [PRESERVE] it into the dedup.
├─ Destination audit (D-F4-SCOPE Part 2) .......... GRM/RunManager intrinsic-org + import cycles #2/#3
│    + _initSpiritState/_initSpiritElements twins (obs #13) + capstone-flag caching (obs #14). Feeds F4.24b.
├─ F4.27 ........................................... util_past_life + sym_cuckoo_egg maturity/copy logic.
└─ Named spirit hand-offs .......................... util_symbiosis/sym_algae summon (do LAST);
     sym_ducks / engine_bullseye state-machines (need deck-flip / rank-inventory seams).
```

**Immediate next action:** **Tier-2 is COMPLETE** (all three category drains closed + F4.24a checkpoint
verified, 0 regressions — `docs/archive/phase4/F4.24_inventory_pass2.md`). Next chunk is **Tier-3 —
pipeline consolidation**, whose marquee task is the **scoring-loop pass** bundling X1 (hexagram twins),
F4.38 (Wu Xing procs), and N2 (stamp runtime-triggers) — all the same "proc behavior bound to the
3-cluster scoring loop" shape. Tier-3 is a fresh chunk (a new orientation, not a continuation); it
opens with its own planning/recon pass. Track the N2 stamp-discard cap bug as a [FIX], separate from
the structural dedup.

---

## 4. Banked / deferred threads (intact — not lost)

Headlines here; the full banked-thread detail lives in `PHASE4_consolidation_candidates.md`
(partially-live) and the relevant `DECISIONS_LOG.md` entries.
- **Candidate C — rename spirit-set getters by intent** (activeSpirits/scoringSpirits/allSpirits →
  intent names). The recurrence prophylactic for the wrong-spirit-set bug class. Banked; rides after.
- **Mirror/Memory slot-vs-adjacency SEMANTIC refinement** — targeting now includes Negatives
  (shipped); the deeper "do they reference a slot vs positional adjacency" cleanup is a separate task.
- **Velocity exponential magnitude** — Phase-5 balance (D-F4.20-VELOCITY). Whether powerLevel scales
  inside the 1.5^x exponent; both branches currently consistent; change nothing till Phase 5.
- **Osprey** — deck-flip interception GATE; needs a deck-flip seam that doesn't exist. Deferred.
- **bullseye** — `_bullseyeInventory` state machine in GRM; minimal-lift or defer (not a clean counter).
- **badger** — `onConsumableUsed` belongs to the consumable block, not the spirit wave. Folded there.
- **GRM/RunManager destination audit** (D-F4-SCOPE Part 2) — late Tier 3; feeds F4.24b. Drain
  categories first, then audit the emptied managers for displacement + intrinsic organization.
- **Candidate G — shrine card-enhancement application flow** — *architectural half SHIPPED*
  (G1 deleted the dead cluster, G2 built the random-8 shrine application surface; see DECISIONS_LOG
  `D-G`). **Remaining: the UX-completion polish → Phase 5** (random-8 TUNING: subset size, gating,
  family eligibility, cost-scaling — the SHAPE is shipped, the tuning is calibration).
- **Tier-3 scoring-loop pass (the marquee) — bundles X1 + F4.38 + N2.** All three are the same
  "proc behavior bound to the 3-cluster scoring loop" shape: **X1** = hexagram twins
  (onCardScored/computeFinalScore/onCaptureComplete, from `D-F4-HEXAGRAMS-TIER2` §7); **F4.38** = Wu
  Xing proc surface (below); **N2** = stamp runtime-trigger surface (F4.24a finding — carries a live
  [FIX]: `_dispatchStampDiscardEffects` draws to hand with no cap check, `PHASE4_consolidation_candidates.md:119`).
- **F4.38 — Wu Xing proc surface → Tier-3 scoring-pipeline pass.** Deferred whole (the clean home
  needs the Fire/Water/Wood scoring triad — duplicated across 3 GRM clusters — collapsed, = scoring-
  loop restructuring, Tier-3 not Tier-2). Two spin-offs: **(a)** TIMING design-ruling (Snow dep /
  Ember break fire round-end = next-round effect; decide if per-card post-scoring is intended;
  Robert rules, balance-adjacent) and **(b)** the scoring-loop 3-cluster dedup (the Tier-3 target
  that subsumes Wu Xing extraction via the `onCardScored` delta contract). See `D-F4-CONSUMABLES-TIER2`.
- **F4.24a-surfaced ratify/cleanup (non-Tier-3, low-priority).** N1 — `engine_northern_lion` is the
  lone surviving `run.activeSpirits` accumulator (`GRM:2069`); one-line ratification that excluding
  transcended copies from `pushesWitnessed` is intended. N3 — `engine_lincoln` desc/behavior mismatch
  (`SpiritEffects.js:1103`; desc "bank without pushing" but increments every bank — D-F4-DOCSYNC-style).
  Obs #4 (`test-run.js:54` dead smoke-test), #5 (RunManager duplicate `typeof window` debug blocks, one
  ungated), #10 (`zodiac_rabbit` "Remove push penalty" sets `_dogProtection` — cosmetic naming).
- **Tier-5 general dead-code pass — 3 routed survivors** from the consumable sweep: the
  `_drawLoadoutSlot`+`_confirmRelease` dead release-confirm chain (ShrineScene), the dead
  `_renderHexagramSymbol` twin (GameScene + ShrineScene), the stale `RunManager.advanceRound:1166`
  JSDoc ("decay Style Base" — code no longer does it).
- **Waidan Grove-exit coupling** — `legend_waidan`'s effect is inline in ShrineScene
  `_drawContinueButton` (F4.20 Bucket-B seepage; no `onShrineExit` hook). If Waidan is cut → removal
  site; if it stays → extract to a hook. Decision pending Waidan's fate. (`PHASE4_consolidation_candidates.md`.)
- **F4.35 — scene-rendering unification** inherits the new shrine pickers (`_showShrineCardPicker`/
  `_showShrineSpiritPicker`, flagged `TODO(F4.35)`) for unification with GameScene's pickers, plus
  the `_renderHexagramSymbol` dead twin.
- **Design-doc reconciliation (D-F4-DOCSYNC)** — reconcile-during-recon for stable areas (incremental);
  full F4.14 sweep deferred to the F4.24b companion slot (late, against stabilized code). Raised
  priority, code-stability trigger.
- **Other consolidation candidates A/B/C/D/E/F** — in `PHASE4_consolidation_candidates.md`.

---

## 5. Process invariants (absorbed from ENTRY_BRIEF + PHASE_3_LESSONS; non-negotiable)

- **Recon before edit, always.** Read current code before drafting/editing; the audit underlying
  Phase 4 is stale. Prompts CAN be wrong — the recon gate catches stale premises. STOP-and-report
  on premise violation rather than proceeding. (This has caught real errors repeatedly.)
- **Verify silent fixes.** Tasks logged weeks ago may already be resolved; confirm before "fixing."
- **Smallest defensible fix.** One concern per change; don't bundle; don't smuggle a [FIX] into a
  [PRESERVE]. Tag [PRESERVE] (assert behavior unchanged) vs [FIX] (deliberate change) loudly.
- **Don't create parallel paths / don't reinvent hooks.** Use existing primitives; consolidation is
  the whole point.
- **Build + test after every change.** `npx vite build` green + `npm test` green before "done."
- **Doc routing:** new standalone doc → Robert drag-drops + commits; edits to existing files →
  Claude Code. Source of truth = repo, synced into knowledge.
- **Rule vs record (doc placement test):** does upcoming work need to consult it? → durable, lives
  in `process/`. Is it a record of how a task went? → move to `archive/phase4/` at close-out.

**Phase-3 patterns Phase 4 must EXTEND, never replace** (from ENTRY_BRIEF; unilateral replacement is
a design decision for Robert, not Claude): tooltip dispatch via `tooltipBase` + per-spirit
contribution fns (F3.5b); sprite identity via `_tex(card)=baseImageId??id` (F3.15); ki decomposition
via `addKi(amount, reason)` flat+hand+Earth+interest+hookDelta (F3.9); modal overlays fit the play-
area lane, not full-screen (F3.22); field iteration `Math.max(maxSlots, slots.length)` (F3.23);
the spirit-set iteration rule (`SPIRIT_SET_ITERATION_RULE.md`).

---

## 6. Handoff protocol (per-category cadence)

**Cadence: per-category handoffs** (spirits → consumables → hexagrams), NOT per-tier. Rationale:
handoff failures are visible and recoverable in one message; context-degradation failures are silent
and diffuse. Category boundaries are natural clean-state points (nothing in-flight); each category
opens with a read-only recon that doubles as the handoff test. The docs ARE the memory; conversation
context is a cache on top — a fresh conversation reloads from the durable docs, not from memory.

**At each category/block CLOSE-OUT (the ritual):**
1. Update this doc (§3 task stack, §4 banked threads).
2. Move that category's task-scoped ledgers/recon/audits to `docs/archive/phase4/` (+ CLOSED header).
3. Note any now-stale diagnostic; confirm `process/` holds only the live set.

**HANDOFF TEMPLATE — paste at the start of a fresh conversation:**
```
I'm Robert, solo dev on Hanatu (koi-koi roguelike deckbuilder, Phaser/Vite). You're the
design/architecture partner; you draft self-contained prompts for Claude Code (terminal executor);
I bridge (paste prompts, re-sync the repo, make design calls). We're mid-Phase-4 (architectural
consolidation: "put things where they belong / consolidate parallel paths").

Read first, in order (the reload):
  1. docs/process/PHASE4_STATE.md  — current task stack, what's next, banked threads, docs manifest,
     process invariants. THE single source of "where we are."
  2. CLAUDE.md                     — conventions, testing, spirit-set rule pointer.
  3. Durable refs as needed: OVERHAUL_PLAN, DECISIONS_LOG (grep, don't bulk-load),
     SPIRIT_SET_ITERATION_RULE, TEST_HARNESS_GOTCHAS.

Current task: [FILL: starting/continuing <block>; its kickoff/recon brief is <doc>; PHASE4_STATE §3
has the live context]. Start with the block's read-only recon — that recon IS the handoff test:
if it produces a sensible map, the reload worked; if it's confused, the reload failed (fix before
any edits).

Non-negotiable process: recon-before-edit; prompts can be wrong (STOP-and-report on premise
violation); [PRESERVE] vs [FIX] discipline; build+test green before done; doc routing per §5.
```
(The only freely-authored part is "Current task" — and it's reconstructable from §3 if omitted.)

---

## 7. Docs manifest (classified by lifecycle — the index)

**`docs/process/` — LIVE set only (durable refs + currently-active + this doc):**
- `OVERHAUL_PLAN.md` — durable (master plan, all task descriptions; grep, don't bulk-load).
- `DECISIONS_LOG.md` — durable (chronological decisions + rationale; grep).
- `DESIGN_DOC_PATCHES.md` — durable (F4.14 reconciliation worklist).
- `INFRASTRUCTURE_DECISIONS.md` — durable (workflow/doc-tiering rules; carries the rule-vs-record convention).
- `PHASE_3_LESSONS.md` — durable (working patterns).
- `TEST_HARNESS_GOTCHAS.md` — durable (Vitest harness conventions).
- `SPIRIT_SET_ITERATION_RULE.md` — durable (the transcendence/spirit-set invariant; a rule, not a record).
- `PHASE4_consolidation_candidates.md` — partially-live (banked threads incl. Candidate C).
- `PHASE4_STATE.md` — this doc (live state).
- *(no currently-active block doc — all three Tier-2 category blocks (spirits, consumables, hexagrams) have closed; their docs are archived below. Next Tier-2 item is the F4.24a checkpoint, which adds no standing block doc.)*

**`docs/` root:** `DESIGN_DOC_V5.md` — durable design source of truth.

**`docs/archive/phase4/` — completed Phase-4 records (reference, do not update):**
- `F4.16_F4.20_triage_ledger.md`, `F4.20_candidate_F_audit_findings.md` (CLOSED),
  `F4.24_inventory_pass1.md` (STALE DIAGNOSTIC), `F4.24_inventory_pass2.md` (end-of-Tier-2 checkpoint,
  delta vs pass-1; the durable Tier-2-complete record), `F4.17_campaign_ledger.md`,
  `F4.18b_campaign_ledger.md`, `discard_pipeline_recon.md`, `round_end_pipeline_recon.md`,
  `PHASE_4_ENTRY_BRIEF.md`, `PHASE_4_TASK_ORDERING.md` (live content absorbed here; retained as bootstrap record).
- **Consumable block (CLOSED 2026-06-09; record = DECISIONS_LOG `D-F4-CONSUMABLES-TIER2`):**
  `consumable_inventory_pass1.md` (the §8 campaign-decisions ledger — fully distilled into the entry),
  `consumable_block_kickoff.md` (kickoff brief).
- **Hexagram block (CLOSED 2026-06-09; record = DECISIONS_LOG `D-F4-HEXAGRAMS-TIER2`):**
  `hexagram_inventory_pass1.md` (the §2 reconciliation table + §7 Tier-3 hand-off — distilled into the
  entry), `hexagram_block_kickoff.md` (kickoff brief + opening recon).

**`docs/archive/` root — pre-Phase-4 history (do not edit):**
- `INFRASTRUCTURE_PLAN.md` (superseded by INFRASTRUCTURE_DECISIONS), `UPLOAD_MANIFEST.md`
  (superseded by this doc), `investigations/` (cleanup-audit, three-marks, yaku).

**Does not exist yet:** `docs/ARCHITECTURE.md` (terminal F4.24b deliverable).
**Removed:** `docs/prompts/` (paste-garble resolved at the tool level), `docs/recon/` (contents → archive/phase4).
