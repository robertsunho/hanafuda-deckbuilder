# CHANGELOG.md — the tagged change-record for the canonical reference docs

**Status:** Authoritative. The cheap, greppable index of **changes to the canonical reference docs** —
*what changed, where, and why*, in one short read instead of a 5000-line `DECISIONS_LOG.md` scrape. Created
2026-06-18 (DOC_MAP doc-hygiene). Starts empty by design — see "Baselines" below.

## What this is

ONE unified log, **tagged by which reference doc each entry touches** — because the change *trigger* is the
same across all three (an audit found the doc diverged from reality, or Phase-5/6/7 work changed something);
only the *target doc* differs. Unifying means a cross-cutting change is ONE tagged entry, not a
split-or-duplicate across per-doc logs, and the rare non-design change gets the same cheap index it would
otherwise lack.

**The tag set is CLOSED — exactly these three:**
- **`[design]`** → a change to `DESIGN_DOC_V6.md`
- **`[architecture]`** → a change to `ARCHITECTURE.md`
- **`[engineering]`** → a change to `ENGINEERING_RULES.md`

An entry may carry **multiple tags** for a cross-cutting change (e.g. `[design][architecture]` for a
structural change that touches both V6 behavior and ARCHITECTURE mechanism). Do **not** invent tags outside
this set. (Expect the distribution to skew heavily `[design]` — V6 churns most in Phase 5-7;
ARCHITECTURE/ENGINEERING change rarely. The tag is what keeps the rare structural/rule change from getting
lost.)

## Scope — what gets an entry (exactly two paths)

A CHANGELOG entry records a **correction to a canonical reference doc**, in exactly two cases:
1. **Audit-discrepancy correction** — an audit finds code and doc disagree AND the code is right / the doc
   is wrong → the doc is corrected → log it (tagged).
2. **Phase-5/6/7 task-driven change** — Phase work changes something such that a reference doc must update
   → the doc edit is recorded here as part of closing the task.

Both are "a reference doc became inaccurate; here is the correction." That is the whole scope.

**Not in scope** (one-concern-one-doc — see `DOC_MAP.md`):
- General design discussion / the full rationale record → `DECISIONS_LOG.md`. *(CHANGELOG is the cheap
  tagged INDEX; each entry points to its DECISIONS_LOG entry for the reasoning. Not redundant: one is
  "reference-doc diffs," the other is "all decisions.")*
- Forward intents / work planned but not yet done → `ROADMAP.md`. *(CHANGELOG is changes MADE, not work
  planned.)*
- Code-cleanup tasks → `CODEBASE_CLEANUP.md`. *(CHANGELOG is reference-doc diffs, not code.)*

## V7 shaper

Filtered by tag, the accumulated entries are the source for the next version of each doc: every `[design]`
entry since the V6 baseline is the diff-set that shapes **V7**; likewise `[architecture]` for the next
ARCHITECTURE and `[engineering]` for the next ENGINEERING_RULES. This is the second reason the log is tagged.

## Baselines (NOT changelog entries — the starting points changes are measured FROM)

The work that *produced* each reference doc is its baseline, not a change in this log:
- **`DESIGN_DOC_V6.md`** — finalized 2026-06-15 (campaigns 3b/3c; recorded in `DESIGN_DOC_PATCHES.md` +
  `DECISIONS_LOG.md`).
- **`ARCHITECTURE.md`** — authored 2026-06-17 (F4.24b).
- **`ENGINEERING_RULES.md`** — authored 2026-06-18.

CHANGELOG logs changes *from* these finalized docs going forward.

## Entry format

> `### YYYY-MM-DD · [tag][tag] · <doc> §<section(s)>`
> **Change:** <what it said> → <what it now says>.
> **Trigger:** audit-discrepancy | Phase-5/6/7 task (`<id>`).
> **Refs:** `DECISIONS_LOG.md` <entry/anchor> · commit `<sha>`.

**Format example (NOT a real change — illustrates the multi-tag, cross-cutting shape):**

> ### 2026-07-01 · [design][architecture] · DESIGN_DOC_V6 §7.2 + ARCHITECTURE §6.2
> **Change:** legendary/spirit decoupling shipped — V6 §7.2 rewritten from "legendaries fold into the chain
> via the union getters" → "legendaries are a separate category with their own effect surface";
> ARCHITECTURE §6.2 current-state flipped "planned (Candidate I)" → "implemented."
> **Trigger:** Phase-5 task (`Candidate I`).
> **Refs:** `DECISIONS_LOG.md` D-CANDIDATE-I · commit `abc1234`.

*(One entry, both tags — the cross-cutting change is not split across separate logs.)*

---

## Changes

*(Empty — no changes from the baselines yet. **Baseline frozen at the post-restructure state (2026-06-19):**
the doc-restructure + pre-restructure hygiene is baseline-shaping, NOT logged here; the first real entry is
the first post-restructure reference-doc change — likely a Gate-0 `[design]` audit finding.)*
