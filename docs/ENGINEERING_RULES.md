# ENGINEERING_RULES.md — how to work in this codebase

**Status:** Authoritative. The canonical entry point for Hanatu's *operational / engineering* rules — the
hard-won "do it this way" practices for working in this repo (recon, verification, commit, testing
discipline). Created 2026-06-18 as the DOC_MAP doc-hygiene deliverable.

**What this doc is.** "How I work" rules — process, not code-structure and not game-design. It is distinct
from its two sibling references:

- **`ARCHITECTURE.md`** — *how the code is built* (where things live, the hook/helper menu, the
  "if you need X, use Y" recipes).
- **`DESIGN_DOC_V6.md`** — *what the game does* (mechanics, spirits, scoring, economy).

Rule of thumb: **"how I work" → here; "how the code is built" → `ARCHITECTURE.md`; "what a mechanic does"
→ `DESIGN_DOC_V6.md`.** See `DOC_MAP.md` for the full one-concern-one-doc map.

**Index, not absorb.** The two deep rule-docs — `SPIRIT_SET_ITERATION_RULE.md` and
`TEST_HARNESS_GOTCHAS.md` — stay where they are, intact, and remain canonical for their own content. This
file *points to* them (§B) rather than copying them: they are referenced by name elsewhere (CLAUDE.md's
testing section, the PHASE4_STATE handoff template, the migration-prompt convention) and carry live open
flags.

**Canonical-vs-summary discipline.** Where a rule appears in BOTH this file and `CLAUDE.md`, **this file is
canonical** and CLAUDE.md carries a one-line summary explicitly marked as such — so there is never a
question of which of two statements wins (the drift class this whole doc-map exists to prevent).

---

## §A — Rules owned here (canonical; these have no other home)

Each rule, then one line on the cost it prevents.

### Working discipline

- **Recon before edit.** Read the current source before drafting or making any change. Specs and task
  descriptions are hypotheses until checked against live code. *Cost: editing against a stale mental model.*
- **Verify the bug still reproduces (the no-op pattern).** Tasks logged days or weeks ago may have silently
  resolved. Before fixing, confirm the issue still exists; before reconning a tail item, grep
  `DECISIONS_LOG.md` + the plan entry for a RESOLVED/STATUS marker. *Cost: "fixing" phantom issues;
  redundant work.*
- **Ship the smallest defensible fix.** One bug, one fix. Don't refactor adjacent code, generalize the fix,
  or bundle unrelated cleanups. If a task seems to require a redesign, flag it — don't unilaterally
  redesign. *Cost: scope creep; unreviewable diffs.*
- **`[PRESERVE]` vs `[FIX]` discipline.** Behavior-preserving changes and deliberate behavior changes are
  distinct and must be isolated. `[PRESERVE]` tests assert behavior unchanged; a deliberate `[FIX]` flips
  an assertion (e.g. `==0` → `==N`) as the visible proof. *Cost: silent behavior drift hidden inside a
  "refactor."*
- **STOP and report on a premise violation.** If a prompt's stated premise is false against current code (a
  referenced symbol is gone, a claimed bug doesn't reproduce, a count won't reconcile), stop and report —
  don't guess or paper over it. *Cost: building on a false foundation.*
- **Defer work that depends on a system in motion.** If a polish or surfacing task depends on a system
  queued for redesign/consolidation, defer it *into* that work — doing it now means doing it twice (once on
  the current shape, once on the new one). Correct sequencing, not procrastination. *Cost: rework thrown
  away when the shape changes.*
- **Iterate small when a fix reveals deeper structure.** Some fixes need 2–3 iterations — fine when each
  iteration's failure is *informative* and the inter-iteration diff is small and reasoned. If the same
  failure recurs or iterations turn large and exploratory, STOP: recon and reframe before continuing.
  *Cost: thrashing one large unreviewable change instead of converging.*

### Verification & shipping

- **Build + test green before done.** `npx vite build` succeeds AND `npm test` passes (expect the current
  baseline) before declaring a change complete. In-game manual testing still covers rendering/UX. *Cost:
  shipping a broken build or a regression.*
- **Commit and push every change, tagged with the task ID.** After a change lands and the build is clean,
  commit AND push immediately (e.g. `F4.16: move _fireCuckooHatch …`). The Project syncs from the *remote*,
  so the remote must stay current for synced recon to be trustworthy. *Cost: stale synced knowledge; lost
  work.* *(Rationale: §D.)*
- **Verify sync retrieval before trusting it.** Project GitHub sync can silently fail ("Connected" but not
  indexed). Before a recon-heavy session, read a known file + a known doc section to confirm retrieval
  works. Uncommitted local edits won't appear in synced knowledge — when re-reconning an area just touched
  but not pushed, read the working tree directly. *Cost: reasoning against a stale or empty mirror.*
  *(Rationale: §D.)*
- **Verify by fresh clone for high-stakes diffs.** For large or structural changes, confirm against a fresh
  clone (`/tmp/heN`, `--depth 1` for HEAD) + grep rather than trusting in-context state. *Cost: reviewing a
  diff that isn't what actually landed.*

### Shell / harness gotchas

- **`&&` short-circuits on exit code 1.** A zero-match `grep` returns exit 1, which aborts a compound
  `cmd1 && cmd2` chain. Run zero-match greps (verification "expect none" checks) as SEPARATE commands, not
  chained. *Cost: a verification step silently skipped because an earlier grep "failed" by finding nothing.*

---

## §B — Rules summarized here, canonical in a deep doc

The fast operational answer, then the link. Those docs stay canonical — do not restate their full content.

- **Spirit-set iteration — which set to iterate.** Fire / dispatch a hook → `run.allSpirits` (the chain:
  regulars + Negatives, no legendaries). Score → `run.scoringSpirits` (+ legendaries). Slot / capacity →
  `spirits` / the `!isNegative` filter. Adjacency / targeting → the chain in **true placement order** (NOT
  `scoringSpirits`, which regroups and scrambles adjacency). If you reach for `activeSpirits` to fire,
  score, or target, stop — it's for structural-presence / slot questions only. **Full rule, the
  `scoringSpirits`-vs-`allSpirits` axes, and the open Mirror/Memory adjacency-getter verification flag →
  `SPIRIT_SET_ITERATION_RULE.md`.**
- **Accumulator-spirit scoring pattern.** Scaling constants live ONLY in `spirits.js` `tooltipBase`, read
  via `_tb(spirit, field, fallback)`; the state *shape* (no values) lives in `ACCUMULATOR_INIT`. Both
  `applyEngine` and the `NEGATIVE_SNAPSHOT` registry read the **same `_tb` field**, so a balance tune
  changes one place and both the live formula and the transcend-boundary snapshot follow. The Negative
  `applyEngine` bakes `× powerLevel` into its formula (accumulators do NOT call `_scaleEngineOutput`).
  **Full three-piece pattern → `SPIRIT_SET_ITERATION_RULE.md` (Accumulator-spirit scoring section).**
- **Test-harness gotchas.** Assert on the SPECIFIC resource an event moves, never `hand.size`; read
  accumulators via `aggregateNumericState` / `aggregateArrayLength`, not raw `spirit.state`; yaku
  thresholds are PROPORTIONAL to deck composition (don't hand-craft multi-yaku decks for a precise
  sequence); `makeRound` / `addSpirit` do NOT seed state — use `equipSpiritWithState`; seed Negatives via
  `run.addSpiritDirect`. **Full harness model + the white-box push-success recipe →
  `TEST_HARNESS_GOTCHAS.md` (read it before writing tests).**

---

## §C — Pointers (one concern → one doc; see `DOC_MAP.md`)

| You want… | Go to |
|---|---|
| How the code is built (structure, hook/helper menu, recipes) | `ARCHITECTURE.md` |
| What a mechanic does (behavior / design) | `DESIGN_DOC_V6.md` |
| The spirit-set iteration rule + the accumulator pattern (deep) | `SPIRIT_SET_ITERATION_RULE.md` |
| The test-harness model + gotchas (deep) | `TEST_HARNESS_GOTCHAS.md` |
| Why the workflow is shaped this way (the two-Claude loop, sync discipline) | **§D** (below) |
| Decisions + rationale (the durable record) | `DECISIONS_LOG.md` |
| Where any concern's canonical doc lives | `DOC_MAP.md` |

---

## §D — Why the workflow is shaped this way

*Rationale, not rules — §A says what to do; this says why the working model is what it is. (Folded from the
former `INFRASTRUCTURE_DECISIONS.md`, 2026-06-18.)*

**The two-surface model.** Work runs across two surfaces. The **claude.ai Project** is the persistent
knowledge home — it holds the codebase + all of `/docs/`, synced from the GitHub **remote** and retrieved
on demand (continuity across sessions comes from Project knowledge, not chat memory) — and is where design
is reasoned about and decided. **Claude Code** does exhaustive recon over the working tree (true grep,
"find every call site of X") and implements once a decision is made. Robert tests in-game, drives
commit/push, and holds final judgment. Most orientation reads go through synced knowledge; comprehensive
symbol sweeps go through Claude Code.

**Why commit-and-push every change (the §A rule's *why*).** The Project syncs from the *remote*, so synced
knowledge is only as current as the last push. A change committed-but-not-pushed (or not committed) is
invisible to the design surface — the two-surface model breaks when the remote lags. Hence: commit AND push
immediately; and when re-reconning an area just touched but not yet pushed, read the working tree directly.

**Why verify sync retrieval (the §A rule's *why*).** Project GitHub sync carries file names + contents only
(no history/PRs), refreshes manually ("Sync now"), and has historically failed *silently* ("Connected" but
not indexed). Because the whole design surface reasons against that mirror, a recon-heavy session verifies
retrieval first (read a known file + a known doc section) — reasoning against a stale or empty mirror is the
failure this prevents.

**Source of truth: the repo, synced — not separate uploads.** There is ONE home for docs: the repo; they
reach Project knowledge *through* the GitHub sync, never via separate upload (duplicate uploads drift — the
same anti-drift principle Phase 4 applied to code). *(A live GitHub-MCP read into chat — the path
investigated and not taken — isn't available on the web surface; that grep-style capability lives in Claude
Code, which already covers it.)*
