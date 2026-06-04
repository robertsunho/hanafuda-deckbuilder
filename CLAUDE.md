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
npx vite                    # Dev server (rarely used in this workflow)
```

There are no automated tests. Verification happens via build + manual in-game testing by Robert.

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

## Reference docs

All documentation lives under `/docs/`. Two tiers:

- **`/docs/process/`** — LIVING references, consulted and updated as work proceeds.
- **`/docs/archive/`** — HISTORICAL, point-in-time records. Read for context; do NOT edit.

Key docs:
- **Authoritative design:** `/docs/DESIGN_DOC_V5.md` (note: some discrepancies with code; see `/docs/process/DESIGN_DOC_PATCHES.md` for the active reconciliation worklist)
- **Phase plan and task tracking:** `/docs/process/OVERHAUL_PLAN.md`
- **Decision history:** `/docs/process/DECISIONS_LOG.md`
- **Working patterns:** `/docs/process/PHASE_3_LESSONS.md`
- **Workflow/infrastructure rationale:** `/docs/process/INFRASTRUCTURE_DECISIONS.md`
- **Prior recon (verify against current code; may be stale):** `/docs/archive/investigations/`
- **Architecture catalogue (Phase 4 deliverable):** `/docs/process/ARCHITECTURE.md` if/when created — until then, recon the codebase

When adding a doc: living/updated → `process/`; immutable snapshot → `archive/`. Don't edit archived files; if their findings are stale, re-recon fresh rather than amending the old record.

## Working principles

### Recon before edit
Before modifying existing code, read the relevant code first. Run focused regex searches; view the surrounding context; identify exact line numbers and method names. The audit underlying the current plan can be stale; never trust descriptions of code over the code itself. The technique: fetch the file, regex-search for the key symbols with matchAll, print surrounding context with file offsets to locate exact line numbers and current signatures. This surfaces dead code and silent fixes the plan won't know about.

### Smallest defensible fix
One bug, one fix. Don't refactor adjacent code. Don't generalize the fix. Don't bundle unrelated cleanups. Each is a separate task with its own scope.

### Build after every change
Run `npx vite build` and confirm the build succeeds before declaring done. A broken build is the most common failure mode.

### Don't reinvent hooks/helpers
The engine has reusable primitives (hooks like `modifyFlowDecay`, `disablesYaku`, `discardUnmatchedDeckFlip`; helpers like `applyHook`, `getStampDef`, `incrementPerElement`). Before writing new effect logic, check whether an existing hook/helper covers the case.

### Don't create parallel paths
If similar code exists for the same conceptual operation (e.g., spirit acquisition, card discard, stamp dispatch), use the existing path. Don't create a second implementation that diverges. The Phase 4 work is consolidating exactly these parallel paths; don't add more.

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

When working with Robert:

1. **Recon first.** Before drafting a fix prompt, read the current code.
2. **Verify old bugs still reproduce.** Tasks logged weeks ago may have silently resolved.
3. **Ship smallest defensible fix.** Resist scope expansion.
4. **Run `npx vite build`.** Confirm success before declaring done.
5. **Status report at the end.** Brief summary of what changed and any concerns.

## Commit discipline

After each change lands and the build is clean, commit and push immediately so the remote stays a faithful mirror of the working tree. Tag commit messages with the plan task ID (e.g. F4.16: move _fireCuckooHatch from RunManager to SpiritEffects). This keeps GitHub current for recon between tasks and builds a readable Phase 4 audit trail.

## When you find new conventions that should live here

Add them. CLAUDE.md is the project's onboarding doc for future AI sessions and future humans. If you discover a pattern, gotcha, or convention worth documenting, propose adding it.

Don't let this file balloon past 200 lines. If it's getting long, split topic-specific content into separate files and reference them.
