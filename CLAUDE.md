# CLAUDE.md — Hanatu

A koi-koi-inspired roguelike deckbuilder. Phaser.js + Vite. Solo dev (Robert) with Claude Code as implementation partner and Claude (claude.ai) as design/architecture collaborator.

## Tech stack

- **Engine:** Phaser.js (HTML5 canvas)
- **Build:** Vite
- **Language:** Vanilla JavaScript (no TypeScript)
- **Module system:** ES modules with `?t=<timestamp>` cache-bust query params on imports

## Commands

```bash
npx vite build              # Production build; runs after every code change to verify
npm test                    # Vitest suite (vitest run); runs after any logic change
npx vite                    # Dev server (rarely used in this workflow)
```

## Automated tests

Headless Vitest suite (`npm test`) drives the engine under Node — the `src/systems/` + `src/data/`
import graph is browser-free, so no Phaser/DOM shim. Verification is now build + `npm test` +
manual in-game testing (in-game still covers rendering/UX; tests cover engine logic).

- **Layout & harness:** `test/spirits/*.test.js` (one file per spirit/tight cluster).
  `test/helpers.js`: `makeRound({spiritIds, spirits, deckCardIds})`, `equipSpiritWithState(id, {state}|{elements})`,
  `playRoundToEnd(grm)`. Read `/docs/reference/TEST_HARNESS_GOTCHAS.md` before writing tests —
  determinism (Math.random stubbed during the deal), `run.reset()` isolation, accumulator seeding,
  and proportional yaku thresholds all live there.
- **Granularity:** assert at the smallest real enclosing method/dispatcher (`_addCapture`,
  `_fireXHooks`), not full integration scenarios. If a setup fights you past one fix, skip with a note.
- **Transcended copies & [FIX] tests:** seed a Negative via `run.addSpiritDirect` and assert it
  fires/accrues like a regular. [PRESERVE] tests assert behavior unchanged; deliberate [FIX] changes
  flip an assertion (e.g. `==0`→`==N`) as the visible proof.

## File layout

```
/src/
  /data/           — Static data definitions (cards, spirits, consumables, hexagrams, stamps)
  /scenes/         — Phaser scenes (GameScene, ShrineScene, etc.)
  /systems/        — Core engine logic (RunManager, GameRoundManager, ScoringEngine, effect files)
  /utils/          — Shared helpers (Layout, GameplayLogger)
```

**Where new content goes:**
- New spirits → `/src/data/spirits.js`; logic → `/src/systems/SpiritEffects.js`
- New consumables → `/src/data/consumables.js`; logic → `/src/systems/ConsumableEffects.js`
- New hexagrams → `/src/data/hexagrams.js`; logic → `/src/systems/HexagramEffects.js`
- New card mutations (enhancements, stamps, editions) → `/src/data/` + appropriate effect file

## Source-of-truth principle (Phase 4 thesis)

Each subsystem owns its concerns. Spirit logic lives in `SpiritEffects.js`, NOT scattered across `RunManager.js` / `GameRoundManager.js` / `GameScene.js`. The same applies to consumables and hexagrams.

If you find spirit/consumable logic in a "manager" file or in a scene file, that's logic seepage. Flag it during the current task or log a follow-up.

## Architecture orientation

Load-bearing facts a fresh session needs *immediately* — orientation only. The detail lives in the
canonical docs; don't paste it back here (duplication is exactly what rots). Verify any of these against
current code/docs, never against a remembered version.

- **State:** the **`run` singleton (`RunManager`)** is the cross-scene store (ki, the unified spirit
  array, consumables, round/progression — `act`/`roundInAct` are getters off `_round`, not stored
  fields). Imported by every system. → `docs/ARCHITECTURE.md`.
- **Round + scoring:** **`GameRoundManager`** runs one round; **`ScoringEngine` is stateless**
  (`evaluate(cards)` only — there is no `calculateFinalScore`). Scoring is per-capture accumulation
  through one `_scorePipeline`; **yaku are bank/push gates, not score.** → `DESIGN_DOC_V6.md`, `ARCHITECTURE.md`.
- **Push / flow (F2.6 commitment model):** flow is resolved at bank/fail via the push curve, **not
  mutated per-push.** → `docs/ARCHITECTURE.md`.
- **Spirits:** iterate the right set (see "Which spirit-set to iterate" below); spirits transcend to
  **Negatives** at 4 stacks / via Amber — use `effectivePower(spirit)`, not raw `stackCount`. Tunable
  constants are single-sourced in each def's `tooltipBase`, read via `_tb` (`ARCHITECTURE.md` §1.3–1.4).
- **Cadence:** Sacred Groves precede rounds {3,6,…,36} (12 visits). → `docs/DESIGN_DOC_V6.md`.

## Reference docs

All documentation lives under `/docs/` (full index: `/docs/DOC_MAP.md`). The layout:

- **`/docs/` (root)** — the canonical set: `DESIGN_DOC_V6.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `ENGINEERING_RULES.md`, `DECISIONS_LOG.md`, `CODEBASE_CLEANUP.md`, `CHANGELOG.md`, `DOC_MAP.md`.
- **`/docs/reference/`** — deep rule-docs ENGINEERING_RULES indexes (`SPIRIT_SET_ITERATION_RULE`, `TEST_HARNESS_GOTCHAS`, `tooltip_verification_checklist`).
- **`/docs/process/`** — in-flight working docs only (current-task creation; migrates to archive at close).
- **`/docs/investigations/`** — live forward-going recon.
- **`/docs/archive/`** — HISTORICAL, point-in-time records (`recon/`, `plans/`, `design-versions/`, `phase4/`). Read for context; do NOT edit.

Key canonical docs:
- **Authoritative design (what the game does):** `/docs/DESIGN_DOC_V6.md`.
- **Architecture (how the code is built):** `/docs/ARCHITECTURE.md`.
- **Forward plan + deferred-design specs:** `/docs/ROADMAP.md`.
- **Operational rules + workflow rationale (§D):** `/docs/ENGINEERING_RULES.md`.
- **Decision history:** `/docs/DECISIONS_LOG.md`. **Reference-doc change index:** `/docs/CHANGELOG.md`.

When adding/placing a doc, route per `/docs/DOC_MAP.md` (it decides the canonical home for each concern). Don't edit archived files; if their findings are stale, re-recon fresh rather than amending the old record.

## Working principles

### Operating rules (summary — full + canonical in `docs/ENGINEERING_RULES.md`)

- **Recon before edit.** Read the live code before changing it; specs and task descriptions are hypotheses until checked against it.
- **Verify the bug still reproduces.** Tasks logged days/weeks ago may have silently resolved — confirm before fixing.
- **Smallest defensible fix.** One bug, one fix; don't refactor adjacent code or bundle cleanups. If a task seems to need a redesign, flag it.
- **Build + test green before done.** `npx vite build` succeeds AND `npm test` passes (expect the baseline) before declaring a change complete.
- **Commit and push every change, tagged with the task ID** (e.g. `F4.16: …`), once the build is clean — the Project syncs from the remote.
- **STOP and report on a false premise.** If a prompt's premise is false against current code (missing symbol, non-reproducing bug), stop and report rather than papering over it.

### Don't reinvent hooks/helpers
The engine has reusable primitives (hooks like `modifyFlowDecay`, `disablesYaku`, `discardUnmatchedDeckFlip`; helpers like `applyHook`, `getStampDef`, `incrementPerElement`). Before writing new effect logic, check whether an existing hook/helper covers the case.

### Don't create parallel paths
If similar code exists for the same conceptual operation (e.g., spirit acquisition, card discard, stamp dispatch), use the existing path. Don't create a second implementation that diverges. The Phase 4 work is consolidating exactly these parallel paths; don't add more.

### Which spirit-set to iterate

Transcendence frees a *slot*, not placement: a Negative is a full chain member for all
effect/scoring/targeting — never exclude Negatives there; only slot-capacity counts exclude them.
Legendaries are a separate category (own slot, not in the chain, don't stack/transcend, but do
score). Reaching for `activeSpirits` to FIRE / SCORE / TARGET is almost always wrong — use
`allSpirits` (the chain) or `scoringSpirits` (scoring, incl. legendaries); `activeSpirits` is for
slot-capacity and legendary-presence questions only. Full rule + getter-by-question table:
`/docs/reference/SPIRIT_SET_ITERATION_RULE.md`.

### Existing patterns to respect (established in Phases 0-3)

- **Card sprite identity:** `_tex(card)` returns `card.baseImageId ?? card.id`. Crown Chakra, speculative cards, and hex-duplicate cards use this override mechanism.
- **Spirit tooltips:** Stack-aware dispatch via `tooltipBase` fields + per-spirit contribution functions in `spirits.js`. Don't propose alternative tooltip mechanisms; extend the dispatch.
- **Ki addition:** Use `addKi(amount, reason)` with reason coding. Round-end ki is decomposed into flat + hand + Earth + interest + hookDelta — preserve this decomposition.
- **Field iteration:** `_renderField` iterates `Math.max(maxSlots, slots.length)` positions. Handles initial deals, Rooster zodiac, Amber transcendence (which permanently reduces maxSlots), and Leaf-spawned bonus slots.
- **Cancel buttons:** All consumable activations have a Cancel button next to Use/Activate. Don't remove during refactoring.

## Conventions

- **No semicolon-or-no-semicolon religion;** match the surrounding file's style.
- **String quotes:** single by default; double if the string contains apostrophes.
- **Indentation:** 2 spaces.
- **Naming:**
  - Private fields/methods prefixed with `_` (e.g., `_overlayObjs`, `_renderField`).
  - Reuse existing prefixes/conventions of the surrounding file.
- **Imports:** preserve the `?t=<timestamp>` cache-bust pattern when adding imports between project files.
- **Comments:** sparse. Inline comments only when they explain non-obvious reasoning. Don't narrate what the code is doing — narrate why.

## Pitfalls

- **Phase 4 is consolidation, not redesign.** If a task seems to require redesigning a subsystem, flag it; don't unilaterally redesign.
- **Don't skip the `_clearObjs(this._XXXObjs)` calls** when adding new render passes. Stale objects accumulate otherwise.
- **`setDepth()` matters.** Overlay rendering relies on explicit depth values. When in doubt, set depth above any persistent UI element (depth 100+).
- **`getSlots()` returns OCCUPIED slots only**, not a sparse array up to `maxSlots`. Iterate `Math.max(maxSlots, slots.length)` to render empty slot backgrounds.
- **Don't trust audit descriptions over current code.** The audit underlying Phase 4 was done in early May 2026 and is materially stale.

## Workflow

The per-task loop with Robert: recon → verify the bug still reproduces → smallest defensible fix → `npx vite build` + `npm test` → **status report** (brief summary of what changed and any concerns). The first four are the operating rules above; full statements live in `docs/ENGINEERING_RULES.md`. The status report closes every task.

## When you find new conventions that should live here

Add them. CLAUDE.md is the project's onboarding doc for future AI sessions and future humans. If you discover a pattern, gotcha, or convention worth documenting, propose adding it.

Don't let this file balloon past 200 lines. If it's getting long, split topic-specific content into separate files and reference them.
