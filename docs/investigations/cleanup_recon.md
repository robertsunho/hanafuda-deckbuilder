# CODEBASE_CLEANUP recon — pre-Phase-5 scoping pass

**Status:** Recon report (read-only diagnosis). **No code or docs edited** beyond writing this file.
**Date:** 2026-06-21. **Source list:** `docs/CODEBASE_CLEANUP.md`. **Phase-5 scope cross-ref:** `docs/ROADMAP.md` §2 (5A/5B).
**Baseline:** `npm test` not run — nothing changed (read-only). Build/test verification belongs to the actual cleanup campaign.

**Goal.** Classify every actionable CODEBASE_CLEANUP item so Robert can decide a pre-Phase-5 cleanup scope:
which items are **subtractive / zero-risk / verification-fresh** (clear now) vs **sequencing-gated or
Phase-5-collision** (defer). Each item re-verified against the **current** tree (Gate-0 line numbers from
2026-06-20 have drifted; confirmations have aged).

---

## TL;DR — recommended pre-Phase-5 scope

**Clear now (Tier A — 11 items, all subtractive, zero/trivial blast radius, no Phase-5 collision):**
- 5 dead-code removals: `G0-037` (FieldManager singular path — highest value), `applyInterest()`,
  `G0-025t` (dead import), `G0-044t` (dead logger), `G0-010` (dead `spiritsByRarity` — whole export is dead).
- 6 stale-comment fixes: `G0-024`, `G0-027`, `G0-032`, `G0-038`, orphaned `_addCapture` JSDoc, `G0-009t`
  (econ_bonds — lowest-confidence; see note).

**Clear now IF green-lit (Tier B — 2 items, one micro-decision each):** `G0-004` / `G0-005`. Both are
"drop the dead field vs wire it via `_tb`." **Recommended resolution = DROP** for both (subtractive,
Phase-5-safe). If Robert picks DROP, they fold into the Tier-A batch.

**Defer (Tier C):** both code-vocabulary renames (`ribbonStamp→stamp`, `tooltipBase→scoring-values`), the
id↔name sweep, May/Sept names, the whole stamp-semantics cluster, `december_plain_3`, Tropic/Arctic ranges,
broad hexagram descriptions, `zodiac_cat` wording, the `'unspecified'` reason tags, Ingot truncation.

**Retire (Tier D — already resolved):** `calculateFinalScore` (gone), volatile/stable_flow flavor (now
accurate), Amber 3-stack restriction (ungated), Piggybank/Grace caps (uncapped). Plus the ~12 items already
marked ✅ in the doc.

**Standalone pass vs fold-in:** do a **short standalone subtractive pass** (Tier A + Tier-B-as-drop), one
build+test, one commit, *before* Phase 5 — see [§ Standalone vs fold-in](#standalone-pass-vs-fold-in).

---

## Tier A — clear before Phase 5 (subtractive, zero-risk, verification-fresh)

Pure removal / comment-fix. No behavior change, no structural reshaping, no Phase-5 collision. Verified
present + dead/stale NOW.

### Dead code (5)

| ID | Current location | Still dead? | Blast radius | Recommendation |
|---|---|---|---|---|
| **G0-037** | `FieldManager.js:180-216` (`playHandCard`, singular) | **YES** — 0 code callers; live path is `playHandCards()` plural (45+ callers incl. 40+ tests). All `playHandCard` refs are comments. | Remove method + fix 3 comments in `GameRoundManager.js` (header `:7`, `:43`, `:532`). No test touches the singular method. | **Remove.** Highest-value item — an active drift trap (divergent parallel impl). |
| **`applyInterest()`** | `RunManager.js:1360-1364` | **YES** — 0 callers. Live interest path is the `interestKi` term in `calculateKiReward` (`:1326`). | Zero-caller deletion. **Keep the `interestRate` getter** (`:1345`) — it IS live (read at `:1326` + `:1352`). | **Remove the method only.** |
| **G0-025t** | `ScoringEngine.js:32` (`import { getFireFlatPoints }`) | **YES** — imported, never used in-file. | Drop one import line. Source (`HexagramEffects.js:793`) still exports it; this is its only importer. | **Drop the import.** |
| **G0-044t** | `GameplayLogger.js:250-252` (`logShopFusion`) | **YES** — 0 callers anywhere. | Zero-caller deletion. | **Remove the method.** |
| **G0-010** | `spirits.js:1192-1197` (`spiritsByRarity`) + header token `:41` | **YES** — `.legendary` filter matches nothing (capstones use `rarity:null`). **Re-verify upgrade: the *entire* `spiritsByRarity` export has 0 consumers in `src/`+`test/`** (only the definition matches). | Logged scope (drop `.legendary` bucket + `'legendary'` token in the `:41` comment) is trivial. **Bonus:** the whole export can be dropped — confirm no dynamic/test use first (grep showed none). | **Drop the bucket + token now;** consider dropping the whole dead export (verify once more). Not coupled to the legendary-spirit infra (`addLegendarySpirit`/capstone path), which is separate + live-but-dormant. |

### Stale comments / JSDoc (6)

| ID | Current location | Still stale? | Recommendation |
|---|---|---|---|
| **G0-024** | `ConsumableEffects.js:14-16` | **YES** — says Wu Xing/chakra apply "still live on RunManager (… migration in progress)"; migration is complete (no `RunManager.applyElement`; `RunManager.js:1563-1568` notes completion). | Update/remove the parenthetical. |
| **G0-027** | `GameRoundManager.js:38` + `:1980` (two return-shape JSDoc blocks) | **YES** — `yakuPoints` named in both, never computed/returned (correct per design: yaku don't score). | Scrub `yakuPoints` from both blocks. |
| **G0-032** | `RunManager.js:1133` (`roundInAct` JSDoc) | **YES** — says "(1–3)"; returns 1–6 (`ROUNDS_PER_ACT=6`, `:216`). | Correct to "(1–6)". |
| **G0-038** | `CaptureManager.js:226-228` | **YES** — JSDoc "(bright=20, animal=10, ribbon=5, plain=1)"; actual is **20/12/10/3** (`getCardPoints`/`cards.js`). | Correct the values. |
| **orphaned `_addCapture` JSDoc** | `GameRoundManager.js:777-783` | **YES** — dangling JSDoc for `_addCapture` sitting above `_fireRoundEndUnplayedHooks` (`:791`). Real `_addCapture` is at `:1249` and has **no** JSDoc. | Remove the orphan (or relocate it to `:1249`). |
| **G0-009t** | `SpiritEffects.js:550` (`// +5% interest (stacks to +25%)`) | **DEBATABLE** — see note. | Rewrite for clarity *or* fold into Phase-6 bonds tuning. **Lowest-confidence Tier-A item.** |

> **G0-009t nuance (the one genuine conflict).** Base rate `0.10`; bonds adds `+0.05/stack`; max regular
> stack is **3** (transcends at 4). So the **bonds contribution** caps at **+15%**, while the **total interest
> rate** caps at **25%** (10%+15%). The comment "+5% interest (stacks to +25%)" is therefore *ambiguous*:
> **stale** if "+25%" means the bonds term (it's +15%), but **coincidentally accurate** if it means the total
> rate. It reads like a vestige of the old (nonexistent) "+25% hard cap." It's a trivial one-line fix, but
> (a) staleness is genuinely debatable and (b) **Phase-6 will retune the `+5%/stack` number** (ROADMAP §3:
> "may need to drop to +2–3%"), which re-touches this comment anyway. **Recommendation:** either rewrite it
> unambiguously now (`+5%/stack; bonds caps at +15% over 3 stacks → total interest ~25%`) or defer to the
> Phase-6 bonds tuning. Include in Tier A only if doing a clean comment sweep.

**Tier-A Phase-5 collision check:** none. FieldManager slot-model recon (Candidate E) is about the *slot
model*, not `playHandCard` — removing the dead singular path *helps* that recon. `spiritsByRarity` is
unrelated to the legendary-offering re-enable (D5). The comment fixes are isolated.

---

## Tier B — structural-touch (needs a Robert micro-decision first)

Not pure subtraction — a small real choice that touches the single-source-of-truth story. Both are
"dead `tooltipBase`-family field → drop it OR wire it through `_tb`."

### G0-004 — `engine_surplus` dead `tooltipBase` fields
- **Location:** `spirits.js` `engine_surplus` def declares `tooltipBase: { mult:1, kiDivisor:3 }`; effect
  (`SpiritEffects.js:1289-1297`) hardcodes `Math.floor(ki/3)*stacks` and reads **neither** field.
- **Still dead?** YES — both fields are inert; tuning them silently no-ops.
- **The choice:** **(a) DROP** the dead fields, or **(b) WIRE** the effect to read
  `_tb(spirit,'kiDivisor',3)` / `_tb(spirit,'mult',1)` (makes them live-tunable).
- **Phase-5 collision:** **YES, two ways.** (1) **D6 misc-engine diversity pass explicitly lists "Surplus"**
  as a redesign candidate — wiring now risks being rewritten. (2) **D1/Cand-C** will rename/reshape
  `tooltipBase` keys — wiring adds two keys to that rename surface.
- **Tier / recommendation:** **B → resolve as DROP.** Dropping is Phase-5-safe (harmless even if D6
  redesigns Surplus) and shrinks the D1 surface; wiring is the option that gets redone. (If Robert prefers,
  *defer entirely* until D6 touches Surplus — the inert fields are harmless meanwhile.)

### G0-005 — decay spirits' dead `startMult`/`startPoints`
- **Location:** `spirits.js` `decay_persimmon` (`tooltipBase.startMult:30`) + `decay_pear`
  (`tooltipBase.startPoints:150`); `remaining` is seeded from **literals** in
  `RunManager._initSpiritState` (`:547-548`). Fields never read.
- **`lossPerRound` is LIVE — confirmed, do NOT touch.** Read at `SpiritEffects.js:1183` & `:1201` via
  `_tb(spirit,'lossPerRound',…)`.
- **The choice:** **(a) DROP** the dead start fields, or **(b) WIRE** `_initSpiritState` to seed `remaining`
  from `_tb(spirit,'startMult'/'startPoints')`.
- **Phase-5 collision:** low. (Decay magnitude retune is **Phase 6**, and concerns `lossPerRound`, not the
  start values. D1 rename touches the keys either way.)
- **Tier / recommendation:** **B → resolve as DROP** for a clean pre-Phase-5 pass. (WIRE has minor future
  value: it would give the Phase-6 decay retune a tunable start-value seam. If Robert wants that seam, WIRE
  — but then it should sequence with D1 so the key gets named once.)

---

## Tier C — defer past Phase 5 (sequencing-gated or Phase-5 collision)

Excluded from a pre-Phase-5 pass **by design** — renaming/changing now risks doing it twice once Phase 5
reshapes the area.

| Item | Current location | Status | Gate / collision | Recommendation |
|---|---|---|---|---|
| **`ribbonStamp` → `stamp` rename** | 18 live `src/` sites across ~5 files (write: `shopCards.js:70`, `ConsumableEffects.js:632`; read: `GameRoundManager.js` ×8, `SpiritEffects.js:235`, `ConsumableEffects.js:631`) + 5 `[PRESERVE]` test assertions (`test/consumables/stamp_apply.test.js`) | Live, pervasive (54 mentions total) | **Sequencing-gated.** Phase-5 **stamp rethink** (5A) reshapes the stamp field/shape; rename once after. `[PRESERVE]` tests must flip together. | **Defer** to the post-stamp-rethink rename. |
| **`tooltipBase` → scoring-values + `_tb` rename (D1 / Cand. C)** | 97 field defs in `spirits.js` + 146 `_tb` calls (`SpiritEffects.js` ×105, `spiritTooltip.js` ×41); `_tb` defined `SpiritEffects.js:72` & `spiritTooltip.js:38` | Live, very large (249 sites) | **Explicitly sequencing-gated** (ROADMAP 5A: after Wave B settles field shape; sequence with Candidate I). Also reconsiders internal key names. | **Defer.** The canonical sequencing-gated rename. |
| **id↔name divergence sweep** (seed: `summer_humidity` → display "Wet") | per ROADMAP 5A | Open | Same family as D1/Cand-C — "do together, after structure stops moving." | **Defer** (with D1/Cand-C). |
| **May/Sept animal display names** ("Iris Fireflies"→"Iris Dragonfly", "Chrysanthemum Cricket"→"Chrysanthemum Fireflies") | `cards.js:231`, `:431` (IDs unchanged) | Live (names still old) | Player-facing naming — rides the 5A **"Player-facing renames"** + id↔name sweep; piecemeal renaming risks double work. | **Defer** to the player-facing pass. *(Mechanically trivial string-edits if Robert wants them early.)* |
| **Stamp semantics cluster** — white/gray retrigger, black trigger, 3-vs-4 tiers | `GameRoundManager.js:823-838` (retrigger), `:950/1604/2074` (black multi-trigger), `consumables.js:160-258` (tiers) | Behavioral; current state mapped | **5A "Black/gray stamp effect rethink"** (gray +3→4× flagged OP); whole system may be subsumed. *(Recon note: black already fires on capture/discard/yaku; 4 color-tiers incl. Gray already defined — the "3-tier" finding looks partly stale, but it's deferred regardless.)* | **Defer** — design change, not cleanup. |
| **`december_plain_3` removal** | `cards.js:823-835`; tags `["winter","noble","sky"]`; `december_ribbon` is the replacement; 0 direct refs in `src/`+`test/` | Still present | **Coupled to 5A `G0-042`** (card-tag system use-or-remove — `december_plain_3` is tags' only live data). **Also `speculative:true`** and `shopCards.js` imports `speculativeCards as ALL_CARDS` → likely a live speculative-shop-pool member (F5.4/F5.4b). Blast radius > plain deletion. | **Defer** — move with G0-042; confirm speculative-pool membership before removal. |
| **Tropic/Arctic month ranges** (4-month sets → 6-month half-years) | `HexagramEffects.js:251-271`, `hexagrams.js:152-164` | Live (still 4-month) | Behavioral; hexagram area reshaped by Phase-5 (F5.0a / F5.4b / hex redesigns). | **Defer** to hex work. |
| **Hexagram description discrepancies (broad)** | `hexagrams.js` | Fuzzy | 5B hex redesigns rewrite descriptions anyway. *(Recon spot-check found current descriptions mostly accurate — may be largely resolved already; defer either way.)* | **Defer**; re-recon at hex-redesign time. |
| **`zodiac_cat` description** ("...Tier 1 Foundation spirit") | `consumables.js:154` | Stale-ish (pool is all Tier-1 commons) | Player-facing wording **+ vocabulary question**: "Foundation" *is* live internal vocab ("Rank Foundation Spirits" headers, `spirits.js:356`/`SpiritEffects.js:395`), so the precise wording depends on the settled tier vocabulary. | **Defer** to the player-facing/vocabulary pass. *(One-string fix if Robert rules the wording now.)* |
| **`addKi`/`spendKi` `'unspecified'` reasons** | only **3** live sites — `ShrineScene.js:935` (reroll), `:1007`, `:1033` (buys) + default params | Mostly already resolved (backlog said "many"; reality is 3) | *Additive* (telemetry tags), not subtractive; **ShrineScene is reshaped by the 5B shop revamp** (Cand. G / D5) which touches these exact sites. | **Defer** — fold into the shop revamp (telemetry useful for Phase-6 scoring-log). *(Trivial; could do now.)* |
| **Ingot fractional truncation** | `RunManager.js:1351` (rate `+ki*0.0001`), `:1361` (`Math.floor` at apply) | Current behavior confirmed | Gated on the **Ingot redesign** design decision (surfaced for ROADMAP, not yet a scheduled pre-Phase-5 task). | **Defer** to the Ingot redesign. |

---

## Tier D — already resolved / retire (not clean)

Re-verify found these done; **retire the CODEBASE_CLEANUP entry**, don't action.

| Item | Finding | Action |
|---|---|---|
| **`calculateFinalScore()` vestigial method** | **GONE.** Zero hits in `src/` (only `docs/`+archives). The two-scoring-paths debt is resolved on the code side. **Note: `MEMORY.md` still lists it as a live `ScoringEngine` method — stale, should be corrected.** | Retire the entry; fix MEMORY.md. |
| **`volatile_flow`/`stable_flow` flavor text** | Strings now **accurately describe the push-curve amplifier** (`hexagrams.js:268-281`: "Push outcomes amplified/dampened 50%… ×0.85 / ×0.98 decay"). The stale-flavor concern looks addressed. | Retire the entry. **Caveat:** project memory flags the underlying push *hooks* as obsolete (TODO F2.6.b) — a **separate** flow/push concern, not this string item; verify against settled hook behavior during flow work. |
| **Amber alchemical 3-stack restriction** | **Resolved — intentionally ungated.** `ConsumableEffects.js:402-422` + `spiritTargetPicker.js:30-42` accept any stack count; code comment: "the Amber fix deliberately ungated it." | Retire. (Distinct from the Amber *balance* rethink, ROADMAP §3/Phase 6 — that stays open.) |
| **Piggybank / Grace ×4 hard caps** | **Resolved — both uncapped.** Piggybank `1+stacks` (`RunManager.js:197-200`); Grace `ki*(1+stacks)` (`SpiritEffects.js:552-558`). No clamp. | Retire. |

**Already ✅ in the doc (recorded for closure — listed for completeness, no action):** `legend_*`→`rare_*`
(moot), `_dogProtection`→`_pushPenaltyWaived`, `consumable_horse/dog/pig/rooster` (gone), `_markMode` family
→ `_cardTargetMode` family, `buyYakuUpgrade`/Paramita (gone), Three Marks / `getMarkDef` (gone), Waidan
Grove-exit coupling (removed), `econ_replica`/`econ_collector` "Coming soon" (now real descriptions),
Crown Chakra string, `spirits.js` header counts, Bonds-cap-moot.

---

## Leave as-is — intentional, not a cleanup target

- **`econ_print` "(Coming soon)"** (`spirits.js:697`) — confirmed present and **intentional**: the spirit is
  deliberately non-functional pending **F5.9** (stub-spirit implementation). The string correctly signals a
  stub. **Do not "fix."** It retires naturally when F5.9 implements Print.

---

## Standalone pass vs fold-in

**Recommendation: a short standalone subtractive pass before Phase 5.**

- **Scope:** the 11 Tier-A items **+** Tier-B `G0-004`/`G0-005` resolved as **DROP** (13 total). All are
  removals or comment fixes; combined blast radius is ~6 deletions + ~8 comment edits + 3 GRM comment
  touch-ups. Only `G0-037` interacts with anything (3 comments), and no test depends on the removed code.
- **Why standalone, not folded into the first Phase-5 campaign:**
  1. **Verification freshness decays.** These confirmations are fresh *today*; folding them into feature work
     means re-verifying later. A pass now banks the freshness.
  2. **Zero entanglement.** Subtractive changes don't mix with feature diffs — easier to review, trivial to
     revert, and they give Phase 5 a clean base (esp. removing the `G0-037` drift trap before anyone edits
     FieldManager).
  3. **Cheap.** One `npx vite build` + `npm test` + one commit (tag e.g. `CLEAN-PRE5`). Expect the baseline
     test result unchanged (nothing behavioral moves; `G0-004`/`005` DROP is inert-field removal).
- **What explicitly waits:** every Tier-C item. The two code-vocabulary renames (`ribbonStamp→stamp`,
  `tooltipBase→scoring-values`) are the canonical "sequence after the structure settles" pair — touching them
  now guarantees a second rename once Phase 5 reshapes the stamp + tooltipBase shapes.

**Per the operating rules**, the actual campaign must re-confirm each item still reproduces at edit time
(line numbers will drift again), do the smallest defensible removal per item, and land build+test green
before commit.

---

## Close-out

- **No edits made** to any code or doc; this report is the only file written (`docs/investigations/`).
- **`npm test` not run** (read-only; nothing changed). Baseline verification is the campaign's job.
- **Not committed.** Treat as recon — commit if you want it durable, or discard.
- **Two corrections surfaced for the source docs** (when actioned): `MEMORY.md` lists `calculateFinalScore`
  as live (it's gone); the stamp-tier "3 tiers" finding looks partly stale (4 color-tiers incl. Gray already
  exist) — both are Tier-D/defer notes, not pre-Phase-5 actions.
