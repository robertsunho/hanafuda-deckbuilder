# PHASE4_STATE.md — Hanatu Phase 4: scope, progress, process, state

> **The single authoritative "where are we in Phase 4" doc.** A fresh conversation reads THIS first.
> It supersedes, as the *live* anchor, the archived `PHASE_4_ENTRY_BRIEF.md`, `PHASE_4_TASK_ORDERING.md`,
> and `UPLOAD_MANIFEST.md` (those are retained as the Phase-4 bootstrap record, not current guidance).
> Update at every category/block boundary (the close-out ritual). Last updated: 2026-06-10.

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

Tier 3 — pipeline consolidation  ◀── IN PROGRESS
├─ Scoring-loop pass ............................... ✅ CLOSED (2026-06-10) — see DECISIONS_LOG D-F4-SCORING-TIER3
│    D1 dedup (5 helpers; subsumes F4.38 + X1; byte-identical) + D2 F2.10c (hex on scoring
│    retriggers, the one behavior change). Merge-vs-separate HALTED → Phase 5/F5.0. Held-seam
│    shaped for F5.8. N2 hand-cap PROMOTED → Candidate D.
├─ Candidate D — hand-capacity consolidation ....... ✅ CLOSED (2026-06-10) — D-F4-HANDCAP-TIER3
│    _drawIntoHand (one bug/8 sites, deck-integrity, hand-identical) + Osprey respects cap
│    + _handSizeCap deleted. N2 resolved. Surfaced Candidate H (consumable-consumption).
├─ Destination audit (D-F4-SCOPE Part 2) .......... ✅ CLOSED (2026-06-11) — see DECISIONS_LOG D-F4-SCOPE Part 2
│    All 6 recon items + 3 push/bank campaigns shipped: cycle #3 sever (83d9920); obs #14 capstone caching
│    won't-fix (aee4632); obs #13 init-unify (dfc1d6e); reset-dedup (b5c3985); _setPhase guardrail +8 tests
│    (dc5deeb); push/bank Q3 vestigial delete (98db293) + Q2 seam decouple (04bc11e) + Q3 legibility (34c98a8).
│    Displacement sweep clean (0 FIX). cycles #1/#2 accept-and-contain. Recon docs archived. Feeds F4.24b (stays late).
├─ F4.27 ........................................... ✅ CLOSED (2026-06-11) — see DECISIONS_LOG F4.27.
│    A: isElementMature centralization (4 sites, [PRESERVE], 20d0673). C: negative Cat-5 pipeline (22b1347) —
│    C1 snapshot reseed from acquiredRound (dropped dead roundsHeld), C2 negative onRoundEnd increment, C3
│    _freshNegativeState + _addPastLifeCopy null-state fix (dec.5), C4 source-aware _fireCuckooHatch (dec.7),
│    C5 D3 shared fireCat5SaleEffects dispatch. Transcend-continuity gap CLOSED; +9 tests (was 0); 142→151.
└─ Named spirit hand-offs .......................... ✅ CLOSED (2026-06-11) — see DECISIONS_LOG F4.20-handoffs.
     Document-and-contain (no code migration): bullseye + util_symbiosis/sym_algae contained as intentional
     GRM round machinery (over-summon trap + Algae transcend-timing coupling — migration would relocate not
     reduce); sym_ducks co-banked with Osprey (shared deck-flip seam); symbiosis semantics confirmed correct
     (no FIX, verified vs D0.11).

══ TIER 3 COMPLETE (2026-06-11) ══ — pipeline consolidation closed; scoring-loop + hand-capacity + destination
audit + F4.27 shipped; named hand-offs document-and-contained.
```

**Immediate next action:** **TIER 3 COMPLETE** 2026-06-11. The LAST Tier-3 item — the **named spirit
hand-offs** — CLOSED **document-and-contain** (record `F4.20-handoffs`): `engine_bullseye` + the
`util_symbiosis`/`sym_algae` summon block are contained as intentional GRM round machinery (the per-copy
over-summon trap + the Algae transcend-timing coupling mean migration would *relocate* entanglement, not
reduce it); `sym_ducks` is co-banked with Osprey (both need the same nonexistent deck-flip-outcome seam);
the symbiosis semantics were re-verified correct vs `D0.11` (no [FIX]). No src/ changes — doc-only.

Phase 4 now moves to **Tier 4 (UI/polish on the consolidated foundation)** and the **Phase-5 banked
set**: Candidate C (getter renames), Candidate G-UX (random-8 tuning), Candidate H (consumable-
consumption policy), Candidate I (legendary/spirit decoupling), F4.38(a) (Wu Xing timing ruling),
velocity exponential magnitude, F5.0 (merge-vs-separate), F5.8 (Earth redesign), and **F4.24b** (the
terminal `docs/ARCHITECTURE.md`). F4.24b is now substantially **un-blocked** — the major backbone
consolidation (scoring-loop, hand-capacity, destination audit, named hand-offs) is done — but it still
**stays late** per the late-write ruling: Phase-5 mechanic work will still generate new code, and
ARCHITECTURE.md is written ONCE against the stabilized end-state.

**Tier 5 is now RECONCILED** (2026-06-11): the 22 cleanup items are walked against current source and
bucketed in `tier5_reconciliation.md` (7 ABSORBED / 9 STILL-OPEN / 6 PARTIAL + a lost-and-found list).
Robert scoped the registry's 6 recommended groupings (full disposition in that doc's §"Scope decision"):
- **NEAR-TERM (the next concrete work — a ~2h hygiene set, mostly pure-subtraction/doc-only):** groupings
  **1** (one-shot dead-code cut — F4.1 + F4.10 `removeCardFromField` + lost-and-found dead methods/smoke-
  test; gate: confirm no save/load intent), **2** (one-shot comment sweep — F4.7 + F4.10 comments +
  GRM:642 + N3 desc + obs #10 wording, zero behavior risk), **3** (tiny-decision pair — F4.4 `cardsByTag`,
  F4.5 `_totalScore`, remove-or-document). A candidate small campaign, scoped separately when greenlit.
- **In parallel / after — Tier-4 scoping** (UI/polish): F4.35 scene-unification lands here (per the
  registry), plus the §2 headline items F4.37/F4.36 (tooltip recomb + declarative read) and F3.16
  (scoring log). No defined Tier-4 task list yet beyond that headline.
- **BANKED:** grouping **4** (verify-and-document rigor — F4.32/F4.28/F4.29, optional; registry already
  records what's known), **5** (design rulings, NOT cleanup — F4.26/F4.31/F4.38(a)/F4.33-Part1/F4.30-half
  → the Phase-5 design agenda), **6** (scheduled refactors — F4.21 ~4-7h before save-game, F4.25, F4.35 as
  the Tier-4 scene-unification — each its own task when its slot comes).

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
- **Osprey + sym_ducks (shared deck-flip seam)** — the Osprey deck-flip-interception → SpiritEffects
  **hook MIGRATION** and the `sym_ducks` ±1 `multValue` migration (GRM ~1903 strand / ~1957 deck-flip-
  match) BOTH need the same nonexistent deck-flip-outcome seam (`onDeckFlipResolved`-style, fired once
  per flip in the resolver). When that seam is built, both ride it — so they're co-banked (ruled
  `F4.20-handoffs`). Deferred. NOTE on Osprey: the hand-cap GATE is now RESOLVED (`D-F4-HANDCAP-TIER3`
  E1c — Osprey respects the cap, `_handSizeCap` deleted); only the in-place→hook migration remains banked
  here. NOTE on ducks: in-place is CORRECT code (F4.20-FIX2 made both sites iterate `allSpirits` so
  transcended copies move) — this is a banked *stylistic* migration, not a deferred bug. The Osprey
  hand-cap-gate and the hook migration are distinct concerns in the same `_doDeckPhase` block — don't
  blur them.
- **bullseye** — `_bullseyeInventory` state machine in GRM; **document-and-contain** (ruled
  `F4.20-handoffs`): a round-scoped cross-rank ledger GRM owns, not a per-spirit counter. Intentional,
  not deferred-migratable.
- **badger** — `onConsumableUsed` belongs to the consumable block, not the spirit wave. Folded there.
- **GRM/RunManager destination audit** (D-F4-SCOPE Part 2) — ✅ **CLOSED 2026-06-11** (record
  `D-F4-SCOPE Part 2`). All 6 recon items + 3 push/bank campaigns shipped; displacement sweep clean;
  GRM/RunManager stabilized (explicit phase machine, deduped reset, decoupled push/bank seam) → F4.24b
  writable for them (F4.24b stays late). Recon docs archived to `docs/archive/phase4/`.
- **Candidate G — shrine card-enhancement application flow** — *architectural half SHIPPED*
  (G1 deleted the dead cluster, G2 built the random-8 shrine application surface; see DECISIONS_LOG
  `D-G`). **Remaining: the UX-completion polish → Phase 5** (random-8 TUNING: subset size, gating,
  family eligibility, cost-scaling — the SHAPE is shipped, the tuning is calibration).
- **Tier-3 scoring-loop pass — ✅ CLOSED 2026-06-10 (`D-F4-SCORING-TIER3`).** D1 dedup + D2 F2.10c.
  **X1 SUBSUMED** (hex twins collapsed into `_applyHexCardScored`/`_computeCaptureScore`/
  `_fireHexOnCaptureComplete`). **F4.38 SUBSUMED** (Wu Xing scoring triad → `_applyCardEnhancements`,
  one home). **N2 PROMOTED → Candidate D** (the hand-cap card-leak is one instance of the broader
  hand-capacity fragmentation; gets its own recon). Held-from-hand seam shaped for F5.8.
- **F4.38(a) — Wu Xing TIMING design-ruling (still banked).** The structural dedup (b) shipped in
  D-F4-SCORING-TIER3; the remaining spin-off is the balance-adjacent timing question (Snow dep / Ember
  break fire at round-end = next-round effect; decide if per-card post-scoring is intended). Robert
  rules; Phase-5-adjacent. See `D-F4-CONSUMABLES-TIER2`.
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
- **Candidate D — hand-capacity consolidation — ✅ CLOSED 2026-06-10 (`D-F4-HANDCAP-TIER3`).** Shipped
  `_drawIntoHand` (one bug / eight instances — deck-integrity, hand-identical) across the draw-pile leak
  sites + a discard-clamped `zodiac_dog` + `sym_osprey` respecting the cap + deletion of the vestigial
  `_handSizeCap` (`HandManager.maxSize` is the one true cap; NO cap rises — deals respect the cap). N2
  resolved. Glory/negatives test expectations flipped to the [FIX] numbers.
- **Candidate H — consumable-consumption / use-blocking consistency** — NEW, surfaced by Candidate D's
  E1b (`zodiac_dog`). Recon-first (map + policy ruling before any campaign). The settled invariant: used
  ⟺ spent ⟺ Badger increments (one event). The open question: under what circumstances is a consumable
  NOT used, and are they all deliberate (blocked vs partial vs has-a-cost). Motivating finding: the
  `element_` GameScene branch consumes UNCONDITIONALLY (even on `no_effect`) while `stamp_` only consumes
  on `success` — inconsistent consume-on-blocked policy across families. Provisional Dog ruling (full
  hand → `success: false`, block-and-retain) revisited under H. Detail in
  `PHASE4_consolidation_candidates.md`.
- **Candidate I — legendary/spirit structural decoupling** — NEW (2026-06-11), banked. The conceptual
  separation is settled (`SPIRIT_SET_ITERATION_RULE.md` §2); the *code* still couples them (union getters,
  `alch_pearl`→`addLegendarySpirit`, inline capstone scoring branches). **Recon Phase-4-runnable (informs
  F4.24b); campaign Phase 5, sequenced with Candidate C** (same getter surface — C renames, I may split).
  Detail in `PHASE4_consolidation_candidates.md`.
- **Other consolidation candidates A/B/C/E** (OPEN) **/ F** (✅ RESOLVED — audit archived + [FIX] shipped
  under F4.20-FIX2) **/ G** (◐ architectural half shipped, UX half → Phase 5) — full status sweep in
  `PHASE4_consolidation_candidates.md` (each candidate now carries a SWEEP STATUS line).

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

**At PHASE close-out (distinct from the per-block ritual above — different cadence, do NOT fold in):**
before declaring the phase done, sweep `PHASE4_consolidation_candidates.md` for every entry gated to or
banked for the next phase (SWEEP STATUS / phase lines naming Phase 5, "→ Phase 5", "gated on F4.24b"
where that lands in P5, "Phase TBD", or an embedded Phase-5 note). **Collect these into the next phase's
planning doc/entry rather than archiving them as completed.** The candidates doc is a phase-spanning
registry (see its header note); unfinished-by-design entries must be carried forward deliberately, not
silently dropped at the archive step.

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
- `tier5_reconciliation.md` — LIVE registry (the 22 Tier-5 cleanup items bucketed ABSORBED/OPEN/PARTIAL
  post-Tier-3 + lost-and-found + Robert's scope decision on the 6 groupings; Tier-4/5 planning consults
  it). Added 2026-06-11.
- `PHASE4_STATE.md` — this doc (live state).
- *(The Tier-5 reconciliation registry (`tier5_reconciliation.md`, above) is the one currently-active
  standing doc — the live Tier-4/5 working reference. All earlier task-scoped recons are CLOSED and
  archived below: Tier-2 (F4.24a), the Tier-3 scoring-loop pass, Candidate D (hand-capacity), the
  destination audit (D-F4-SCOPE Part 2), F4.27 (Cat-5 maturation), and the named spirit hand-offs
  (F4.20-handoffs — document-and-contain, closed the LAST Tier-3 item; its recon + close-out stayed in
  chat and the durable record is the DECISIONS_LOG `F4.20-handoffs` entry, so there is nothing to
  archive for it). F4.27 likewise added no standing doc — record is DECISIONS_LOG `F4.27`.)*

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
- **Scoring-loop pass (CLOSED 2026-06-10; record = DECISIONS_LOG `D-F4-SCORING-TIER3`):**
  `scoring_loop_inventory_pass1.md` (the §2 structural map + §5/§6 scope/seam — distilled into the
  entry; N2 promoted to Candidate D).
- **Candidate D — hand-capacity (CLOSED 2026-06-10; record = DECISIONS_LOG `D-F4-HANDCAP-TIER3`):**
  `hand_capacity_inventory_pass1.md` (the §2 corrected design model + §4 site inventory + §7 helper
  contract — distilled into the entry; surfaced Candidate H).
- **Destination audit (D-F4-SCOPE Part 2) (CLOSED 2026-06-11; record = DECISIONS_LOG `D-F4-SCOPE Part 2`):**
  `destination_audit_recon_pass1.md` (the displacement sweep + cycle classification + intrinsic-org map)
  and `pushbank_recon_pass1.md` (the item-6 push/bank recon — a PRE-RULING snapshot; its Q1–Q4 answered
  in the DECISIONS_LOG entry).

**`docs/archive/` root — pre-Phase-4 history (do not edit):**
- `INFRASTRUCTURE_PLAN.md` (superseded by INFRASTRUCTURE_DECISIONS), `UPLOAD_MANIFEST.md`
  (superseded by this doc), `investigations/` (cleanup-audit, three-marks, yaku).

**Does not exist yet:** `docs/ARCHITECTURE.md` (terminal F4.24b deliverable).
**Removed:** `docs/prompts/` (paste-garble resolved at the tool level), `docs/recon/` (contents → archive/phase4).
