# Consumable-logic centralization — block kickoff brief + opening recon

> **✅ CLOSED / ARCHIVED 2026-06-09.** The block this kickoff opened is complete. Durable record:
> DECISIONS_LOG `D-F4-CONSUMABLES-TIER2`. Retained as the bootstrap record — **do not edit**.

**Status:** ARCHIVED (was: block setup, for the NEXT session after F4.20 closes). This frames the block and
provides the opening read-only recon that produces the consumable triage inventory — the consumable
equivalent of `F4.16_F4.20_triage_ledger.md`. Decided in D-F4-SCOPE Part 1 (DECISIONS_LOG).

---

## What this block is

The second of three Tier-2 logic-centralization categories (spirits ✅ done via F4.20; consumables
HERE; hexagrams next). Same thesis: "put things where they belong." Same anatomy as the spirit work:
**inventory → Bucket A/B triage → migration campaigns.**

The spirit block had a head start: the F4.24a inventory had already mapped spirit seepage. **Consumables
have NO equivalent inventory yet** — that's the first deliverable. You can't schedule what the map
hasn't revealed.

## The key open question (unique to consumables)

Unlike spirits (canonical home = `SpiritEffects.js`, settled), the consumable canonical home is
ITSELF UNSETTLED. Consumable logic is split across at least:
- `ConsumableEffects.js` — zodiac + alchemical consumables (the `.execute({roundManager, params})` pattern).
- Scene-level `_cardTargetMode` (GameScene / ShrineScene) — Wu Xing element consumables, chakra/stamp
  application targeting.
- Inline in GRM/RunManager — discard bookkeeping (Horse/Monkey/Ox were pulled into the pipeline in
  F4.17; what remains?), capture/redraw/field-clear/empty-hand logic of uncertain ownership.

So part of THIS block's audit is deciding the canonical home(s), not just migrating into an obvious one.
This is a genuine design question the recon must surface, not assume.

## Members already on the books (fold in, don't treat as standalone)

Per D-F4-SCOPE, these pre-existing tasks are MEMBERS of this block:
- **F4.15** — consumable activation-path unification.
- **F4.38** — Wu Xing element consumables (also where the glacier/carbon/fossil/velocity counter
  spirits' enhancement-proc logic lives — cross-ref the F4.20-FIX'd Wu Xing sites; the SPIRITS were
  fixed, the CONSUMABLE/enhancement side is this block's concern).
- **F4.34** — Water depreciation (vestigial SNOW_MULT/ICE_MULT exports flagged in F4.24a).

## Bucket A/B discipline carries over

Not everything moves. Bucket B = the logic is a term in a core-owned formula, lifting it adds
indirection, it's clearer in place. Same triage honesty that kept the spirit migrations disciplined.

## Cross-references
- D-F4-SCOPE Part 1 (DECISIONS_LOG) — the decision establishing this block.
- `F4.16_F4.20_triage_ledger.md` — the spirit-block template to mirror.
- `F4.24_inventory_pass1.md` — the spirit inventory; this block needs its consumable analogue.
- `SPIRIT_SET_ITERATION_RULE.md` — if any consumable touches spirit iteration, the rule applies.

---

## OPENING RECON (read-only — first task of the block, produces the inventory)

### PROMPT INTEGRITY CHECK
Sections: (1) What this is, (2) Enumerate consumables, (3) Map each one's logic location,
(4) The canonical-home question, (5) Triage into buckets, (6) Report. If your copy doesn't end with
a "Report" section, it was truncated — STOP.

### 1. What this is
READ-ONLY. Make NO edits. Produce the consumable seepage inventory + triage — the input to the
migration campaigns that follow. Mirror the spirit triage ledger's structure.

### 2. Enumerate every consumable
List all consumables from `src/data/consumables.js` (and any catalog). Group by family: zodiac,
alchemical, Wu Xing element, chakra, stamp, any other. For each: id, name, what it does (one phrase).

### 3. Map each one's logic location
For EACH consumable, record WHERE its behavior actually lives:
- `ConsumableEffects.js` `.execute()`? (the clean home)
- Scene-level `_cardTargetMode` / GameScene / ShrineScene targeting+application?
- Inline in GRM / RunManager?
- Split across several? (flag these — they're the seepage)
This is the core deliverable: a table of consumable × where-its-logic-lives.

### 4. The canonical-home question
Assess: SHOULD the canonical home be `ConsumableEffects.js` uniformly, or is the scene-level
`_cardTargetMode` split legitimate (e.g. because targeting UI genuinely belongs in the scene)?
Distinguish "targeting/UI in the scene" (maybe legitimate) from "effect LOGIC in the scene" (seepage).
Propose a canonical-home rule for the block to apply — this is the block's defining decision.

### 5. Triage into buckets
- **Bucket A (MIGRATE):** consumable effect logic living outside its canonical home, self-contained
  enough to relocate. For each: where it is, where it should go, rough risk.
- **Bucket B (DOCUMENT-ONLY):** logic that's a term in a core-owned formula / clearer in place.
- **Cross-block / defer:** anything entangled with hexagrams, the spirit Wu Xing sites (already
  F4.20-FIX'd), or needing a seam that doesn't exist.
- Fold F4.15 / F4.38 / F4.34 into the relevant bucket entries (note them by ID).

### 6. Report
- The consumable enumeration (by family).
- The consumable × logic-location table (the seepage map).
- The canonical-home recommendation (the defining decision).
- The Bucket A / B / cross-block triage.
- A recommended campaign ordering for Bucket A (simplest/lowest-risk first).
- Surprises (consumables whose logic is more scattered than expected).

**Reminder: read-only. This produces the map; campaigns come after, scoped against it.**
