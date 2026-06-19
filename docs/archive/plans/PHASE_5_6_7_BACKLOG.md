# Hanatu — Phase 5 / 6 / 7 Backlog (Intake)
*Prepared 2026-06-13. The forward-planning consolidation: every post-Gate-0 task surfaced from
OVERHAUL_PLAN (F5.x), DECISIONS_LOG (banked rulings), PHASE4_STATE §4, PHASE4_consolidation_candidates,
tier5_reconciliation, and Robert's notepad — deduplicated and phase-sorted.*

> **This is an INTAKE doc, not a schedule.** It exists so nothing is dropped at the Phase-4→5 seam. It is
> safe to build now (forward-only; touches no live process docs). It does NOT supersede the rubric-seam
> ordering: DESIGN_DOC_PATCHES sweep → V6 → ARCHITECTURE.md (F4.24b) → Gate 0 (Audit 2) all come FIRST.
> These items are post-Gate-0. Several entries are sourced (`[src]`) so the claim is verifiable, not
> remembered. Status markers may be stale — verify before actioning (the no-op pattern is live).

---

## Provenance / dedup note
The original `OVERHAUL_PLAN.md` Phase 5 was a 7-item skeleton (F5.1 threshold tuning, F5.2 save/load,
F5.3 tutorial, F5.4 speculative integration, F5.5 audio, F5.6 bundling, F5.7 polish) + F5.8 (Earth
timing). Since then, Phases 0-4 banked many more. This doc merges all of them and re-sorts into the
three-phase structure (P5 build/design, P6 tuning, P7 polish) rather than the flat F5.x numbering, because
`POST_AUDIT_DIRECTION.md` already reframed "Phase 5" as three distinct sub-streams. The F5.x IDs are kept
as references where they exist.

---

# PHASE 5 — generative (design-resolution + feature-building + demo-prep)

## 5A — Design-resolution (decide open questions about existing mechanics)
*These are rulings, not builds. Several were deliberately deferred from Phase 4 as "balance-adjacent,
can't settle without playtest" — they may settle here or push into P6.*

- **F4.38(a) — Wu Xing proc TIMING.** Snow-dep / Ember-break fire at round-end (= next-round effect);
  decide if per-card post-scoring is intended. Structural dedup already shipped (D1); this is the
  balance-adjacent timing ruling only. `[DECISIONS_LOG D-F4-CONSUMABLES-TIER2; PHASE4_STATE §3]`
- **F5.8 — Earth (Clay/Pottery) timing redesign.** Round-end %-of-ki → per-capture flat ki. Robert's
  sharpened spec (2026-06-14): Clay +3 flat ki/scoring event held; Pottery +3 + "1 interest" (interest
  definition OPEN: rate-bump vs flat vs one-time); magnitude 3 is provisional (balance-equiv to current
  only near ~150 ki). Seam already prepared (D1 `{addKi?, addInterest?}` latent). "Populate + tune," not
  restructure. Pairs with F5.1. `[OVERHAUL_PLAN F5.8; DECISIONS_LOG 2026-06-14; DP-72]`
- **F5.0 — capture-event merge-vs-separate.** The Phase-1.5-scoring vs capture-trigger dispatch
  question, HALTED in Tier-3 as a playtest decision (does merging trigger types play better?).
  `[DECISIONS_LOG D-F4-SCORING-TIER3]`
- **Black/gray stamp effect rethink.** Gray retrigger mult (currently +3 → 4× firing, flagged OP); black
  stamp distribution (Captured→consumable / Discarded→draw / Yaku→+3ki, alternates of interest). Design +
  tuning. `[OVERHAUL_PLAN Phase-5 tuning items; Robert notepad]`
- **Mirror/Memory slot-vs-adjacency semantic.** Targeting-includes-Negatives shipped; the deeper "slot
  reference vs positional adjacency" cleanup is the separate banked task. `[PHASE4_STATE §4]`
- **"Legendaries = foundational, not score-pump" tenet.** Load-bearing for the 5 legendaries; likely
  UNWRITTEN — record it as a design tenet. `[prior handoff; check DECISIONS_LOG]`
- **Editions effect/bonus redesign** (Gold/Crystal/Ghost). New ideas since the audit. `[Robert notepad]`
- **Renames** (design-resolution, low-risk): Alchemicals, negative spirits, editions(?). `[Robert notepad]`
- **Grouping-5 deferred remainder** — anything triaged out of the Leg-2 rulings as document-as-provisional
  lands here. (Gankyil already CUT; verify what, if anything, remains.) `[tier5_reconciliation]`
- **Hand size/count rethink** (the DESIGN question of what the count should be — distinct from the
  hand-capacity *plumbing* already fixed in Candidate D). `[Robert notepad]`
- **hex_30 Lí difficulty** (Option B no-repeat → Option A pure-random if still too easy); **hex_52 Gèn
  design completion** (mechanically thin — candidate transformative directions). `[OVERHAUL_PLAN P5 tuning]`

## 5B — Feature-building (build what doesn't exist)

- **Negative fusion (F5.11).** Design DECIDED (Cinnabar/Pearl neg-fusion spec, Cuckoo neg-hatch
  confirmed, Approach-2 arch). Build deferred. Open sub-rulings: Mercury neg de-fusion, Jade neg
  powerLevel-up (accumulator-state wrinkle), Amber/Sulfur exclusion. Surface: picker-source overhaul +
  index-contract re-thread across both scenes + tests. `[DECISIONS_LOG negative-fusion 2026-06-14; F5.11]`
- **Consumable stacking.** Locked design (Robert), entirely UNBUILT → a build, so P5. Worth a design
  discussion first so V6 documents it accurately. `[Candidate H-adjacent; Robert ruling this session]`
- **Shop / ShrineScene revamp.** (a) wire blessings to be obtainable [Candidate G UX half]; (b) reorganize
  for better UX; (c) booster packs? (open). The random-8 architecture shipped (G2); this is the UX
  completion + calibration. `[Candidate G; Robert notepad]`
- **Legendary/spirit code decoupling (Candidate I).** Recon feeds F4.24b (rubric seam); the *campaign* is
  P5, sequenced with Candidate C. Union getters, `alch_pearl→addLegendarySpirit`, inline capstone scoring
  branches. Possibly: legendaries get their own data + systems docs. `[Candidate I]`
- **Candidate C — rename spirit-set getters by intent** (activeSpirits/scoringSpirits/allSpirits). The
  wrong-spirit-set recurrence prophylactic. Rides with Candidate I (C names, I splits). `[PHASE4_STATE §4]`
- **8 double-trigram hexagram modes** — work through one by one (F5.0a sibling redesign work).
  `[OVERHAUL_PLAN; Robert notepad]`
- **Stub / non-functional spirits** — print, caterpillar (ducks co-banked w/ Osprey on the deck-flip
  seam). Bring up to date. `[Robert notepad; PHASE4_STATE §4 ducks note]`
- **Osprey hook migration + sym_ducks** — needs the nonexistent `onDeckFlipResolved` seam built; co-banked.
  (Ducks in-place is correct code — stylistic migration, not a bug.) `[PHASE4_STATE §4]`
- **F5.2 — Save/load.** Schema_version field; graceful discard on mismatch. `[OVERHAUL_PLAN F5.2]`
- **Settings.** `[Robert notepad]`
- **F5.4 — Speculative cards integration** (13 data-only cards; gated on art). `[OVERHAUL_PLAN F5.4; DP-57]`
- **UI features:** spirit details viewable in shop; an area showing achieved style combos; complete the
  style-combo roster; ember/charcoal-in-banked-area handling. `[Robert notepad]`

## 5C — Demo-prep
- Prepare the game to receive art / sound / animation; the run-up to a playable demo. Barely in current
  docs — itself a Phase-5 planning task. `[POST_AUDIT_DIRECTION §2]`
- **Flavor/description text** — hand-written edits; figure out where in codebase + an efficient workflow.
  `[Robert notepad]`

## 5 — correctness items that ride here (small)
- **Batch fusion bug** (1 cinnabar → 2 fusions) — IF not closed in Leg 3; verify. Correctness. `[Robert
  notepad; check Leg-3 status]`
- **Candidates A / B** (effect-magnitude accessor unification; accumulator-cluster abstraction) — IF not
  absorbed by F4.25/F4.28 in Leg 3, they land here as architectural debt. Verify. `[candidates doc]`
- **F4.37 carry-forward:** double-render of 5 out-of-block engines (wuji/dao/chi/tengu/feng_shui); dead
  econ_lucky_charm/econ_reward tooltip branches. Opportunistic. `[PHASE4_STATE; prior handoff]`
- **Waidan Grove-exit coupling** — Waidan was CUT, so this is the deletion site (was: delete the
  `if(_isGrove)` block). Verify it was removed with the cut. `[candidates doc; F4-LEG3-ROSTER-CUTS]`

---

# PHASE 6 — threshold / balance tuning (playtest-data-driven)
*Cannot meaningfully start until 5B build-out is stable. The structured-source schema (F3.16b) is the
instrument built FOR this phase. Most P5 design-resolution magnitudes resolve HERE with real data.*

- **F5.1 — Score threshold tuning** (the headline): synthetic playthroughs at 3 archetypes, set thresholds
  at 25th-percentile competent play, verify difficulty curve. `[OVERHAUL_PLAN F5.1]`
- **F4.26-B balance consequences** (mechanical ruling shipped; tuning banked): singleton-contribution
  re-tune (4× likely OP vs old 3×); copy-acquisition caps (Cat-5 now reaches power-4); Amber niche rethink
  (free natural transcendence dominates Amber's slot-cost). `[PHASE4_STATE §3; DECISIONS_LOG F4.26]`
- **Velocity exponential magnitude** (D-F4.20-VELOCITY): does powerLevel scale inside the 1.5^x exponent.
  Both branches consistent now; change nothing till here. `[PHASE4_STATE §4]`
- **F5.8 / Earth magnitudes** (the "3" and the interest definition) — resolves with F5.1 data.
- **Decay magnitude retune** — pear 5/round, persimmon 3/round, now that decay bites per-stack/per-member.
  `[prior handoff; DECISIONS_LOG decay-per-member]`
- **Candidate G random-8 TUNING** — subset size, gating, family eligibility, cost-scaling. `[Candidate G]`
- **Holistic pricing** — all spirit + consumable costs re-tuned together once sell-price refund
  (`floor(cost/2)`) impact is visible; revisit 50% sell percentages. `[OVERHAUL_PLAN F2.1.b note]`
- **Bonds base value** (uncapped now; +5%/stack may need to drop to +2-3%). `[OVERHAUL_PLAN P5 tuning]`
- **Yaku thresholds at low deck counts** — proportional scaling check. `[Robert notepad; F4.33-adjacent]`
- **Festival per-round cap / proportional threshold scaling** (F4.33 — if ratified-but-not-tuned).
- **J glory-draw held-at-round-end payoff** — latent until a teardown reorder. `[prior handoff]`

---

# PHASE 7 — polish (capstone; after mechanics final)
*Last, because polishing mechanics that might still change is wasted effort, and the tutorial needs final
mechanics.*

- **F5.5 — Audio integration** (partner produces; Hanatu wires hooks: play, capture, yaku, push, shop,
  hex reveal, capstone fusion). `[OVERHAUL_PLAN F5.5]`
- **Art integration** — as it arrives; speculative card art is a milestone gate. `[DP-57]`
- **Animation / game-feel / juice** — the Balatro-fidelity craft layer (the engine isn't the constraint;
  this work is). `[engine-decision-entry; this is the bulk of the fidelity gap]`
- **F5.3 — Tutorial** (needs final mechanics). `[OVERHAUL_PLAN F5.3]`
- **F5.6 — Bundling / distribution** — Vite prod build, Electron/Tauri desktop wrapper, asset compression,
  browser-compat. (Note: Steam SDK-via-JS is the known friction — late packaging.) `[OVERHAUL_PLAN F5.6;
  engine-decision-entry]`
- **F5.7 — Final polish + full bugtest pass** with cleanup-catalog cross-check. Open-ended. `[OVERHAUL_PLAN]`

---

## Open dedup questions for Robert (flagged, not resolved)
1. **Batch fusion bug, Candidates A/B, Waidan deletion** — all marked "verify Leg-3 status." A fresh grep
   of DECISIONS_LOG for the Leg-3 close will confirm which are already done vs still open. Worth doing
   before this backlog is committed, so it doesn't list closed items.
2. **5A vs 6 boundary is deliberately soft.** Several design-resolution items (stamps, Earth, velocity)
   are "decide the shape in 5A, set the number in 6." That's correct — but when scheduling, decide whether
   each is "ruled in 5A" or "ruled-and-tuned together in 6." Listed in both with the split noted.
3. **Demo-prep (5C) is underspecified everywhere** — it's the least-documented stream and may deserve its
   own planning pass when P5 begins, per POST_AUDIT_DIRECTION.
