# Working Patterns from Phases 0-3

**Purpose:** This document captures the working patterns that evolved through 6+ months of collaboration between Robert (solo dev on Hanatu) and Claude (design/architecture partner) plus Claude Code (implementation). It's written for the next Claude entering Phase 4, but it's also useful as a checkpoint document for any future handoff.

**How to use:** Read this once before starting Phase 4 work. The patterns aren't rules — they're heuristics that have worked in this collaboration. Apply with judgment; reach for the pattern when the situation matches its trigger; ignore when it doesn't.

---

## Pattern 1: Recon-before-draft

**Trigger:** Any time a task involves modifying existing code, but the current state of that code isn't already in immediate context.

**Pattern:** Before drafting a fix prompt, run a recon query against the codebase. Use the JavaScript console pattern: fetch the relevant file, regex-search for the key symbols, print surrounding context with file offsets.

**Why this matters:** The audit underlying any plan goes stale. Code drifts. Symbols rename. Methods get refactored. Drafting a fix from compressed memory leads to prompts that reference line numbers/methods that no longer exist, or that propose solutions for problems already silently fixed. Recon catches both.

**Concrete recon shape:**
```js
// Find symbol locations
fetch('/src/path/to/file.js').then(r => r.text()).then(t => {
  for (const term of ['symbol1', 'symbol2', 'pattern.*regex']) {
    const matches = [...t.matchAll(new RegExp(term, 'g'))];
    if (matches.length === 0) continue;
    console.log(`\n=== "${term}" — ${matches.length} hits ===`);
    for (const m of matches.slice(0, 5)) {
      console.log(`@${m.index}: ${t.substring(Math.max(0, m.index - 80), m.index + 300).replace(/\n/g, ' | ')}`);
      console.log('---');
    }
  }
});
```

**Variants:**
- For full method bodies: walk braces to find the matching `}`, then print the slice
- For class definitions: similar but capture wider context
- For cross-file searches: loop over a path list inside an async function

**What recon outputs do well:** Locate exact line numbers; reveal current method signatures; surface dead code; expose silent fixes.

**What recon outputs don't replace:** Reading the full method when needed; verifying the implementer's understanding; testing the fix.

---

## Pattern 2: Verify silent fixes before doing the work

**Trigger:** A task is more than ~3 weeks old when revisited.

**Pattern:** Before drafting a fix prompt, check whether the bug still reproduces. Multiple paths:
- Robert can test in-game ("does X still happen?")
- Recon can find evidence that the fix has landed (e.g., the bug's root cause is now handled correctly in code)
- The audit's framing may be obsoleted by intervening architectural work

**Closure outcomes that are NOT failures:**
- ✅ **Shipped** — implementation landed
- ✅ **Silently fixed** — bug resolved by adjacent work without anyone explicitly addressing it (F3.13, F3.15 sub-items 2/3/5/6/7/8)
- ✅ **Subsumed** — work was absorbed by a different task or architectural decision (F3.2 → F2.6+F3.1)
- ✅ **No-op** — original report was based on a misunderstanding (Robert's "oversight on my part" for F3.15 item 3)
- ⏸️ **Deferred** — task is real but blocked on something or better paired with later work (F3.16, F3.18)

**Closure outcomes that ARE failures:**
- ❌ Forgetting the task existed
- ❌ Shipping a fix for a bug that doesn't reproduce anymore (wasted effort + risk of regression)
- ❌ Pretending the work was done when it wasn't

**Practical impact:** In Phase 3, 6 of 8 sub-items in F3.15 turned out not to need code changes. F3.13 closed silent. F3.21 had already shipped its core. This is normal and healthy — the audit is supposed to catch drift, and "catching drift" sometimes means "discovering the drift fixed itself."

---

## Pattern 3: Defer when the architecture is in motion

**Trigger:** A polish or surfacing task depends on a system that's about to be architecturally consolidated.

**Pattern:** Defer the polish task into the consolidation. Doing it now means doing it twice: once on the current architecture, again on the consolidated architecture. The defer is not procrastination — it's correct sequencing.

**Phase 3 deferrals to Phase 4:**
- F3.7c (Wu Xing proc surfacing) → deferred until F4.38 (Wu Xing consolidation)
- F3.11b (per-source enhancement contributions) → deferred until F4.38
- F3.16 (scoring log overhaul) → deferred until F4.20 + F4.36 + F4.38 are done
- F3.17 (retrigger surfacing interim) → deferred to F3.16 (which is itself deferred)
- F3.18 (card tooltip enrichment) → deferred until F4.37 (post-consolidation tooltip recomb)

**Phase 3 deferrals to Phase 5:**
- F3.14 (Past Life activation visual) → polish, not correctness; tooltip already conveys status
- F3.19 (Infinity yaku display) → readable enough; can revisit alongside playtest polish

**The rule of thumb:** If the task is "make this surface area show X" and the underlying system for X is queued for consolidation, defer. The polish is cheap; the wasted work of doing it twice is expensive.

---

## Pattern 4: Ship the smallest defensible fix

**Trigger:** A bug has been diagnosed and a fix is being drafted.

**Pattern:** Fix the bug. Don't refactor. Don't generalize. Don't take the opportunity to clean up nearby code. Each of those is a separate task with its own scope.

**Examples from Phase 3:**
- F3.15 item 4 (Crown Chakra card image): one line added (`target.baseImageId = source.baseImageId ?? source.id;`). The whole method could have been refactored; we didn't.
- F3.23 (Leaf-slot rendering): one line changed (`fieldSlotCount = Math.max(maxSlots, slots.length)`). Could have rewritten the slot iteration; we didn't.
- F3.22 (round-end overlay): three iterations, each iteration the smallest viable next step. We didn't try to redesign the whole overlay system.

**Why this matters:** Big fixes have hidden costs — more lines means more places where the fix could be wrong, more test coverage gaps, more risk of regression. Small fixes are reviewable, testable, and revertable.

**When to break this rule:** When the bug genuinely IS architectural and a small fix would be a band-aid. The signal is "the fix would have to lie about what's going on." If you find yourself writing a fix prompt that requires special-casing or comments explaining "we know this isn't quite right but..." — stop, log a task for the architectural fix, and either defer the polish or do the architectural fix instead.

---

## Pattern 5: Iterate when scope expands mid-task

**Trigger:** During implementation, the task turns out to be bigger or different than originally scoped.

**Pattern:** Don't try to deliver the original scope plus the new scope in one shot. Ship the smallest meaningful improvement, test, iterate.

**F3.22 was the canonical example:** Original scope was "Carbon break event UI opacity bug." Real issue turned out to be "round-end overlay z-ordering and isolation." Took 3 iterations:
1. Add depth + clear obj arrays — over-corrected (spirits vanished)
2. Resize modal, partial revert — modal too high, clipping spirit row
3. Shift modal down, restore consumables — clean

Each iteration was small enough to test, the failure modes were informative, and the cumulative result was correct.

**The anti-pattern:** "Let me redesign this whole subsystem to handle all the edge cases I just noticed." This produces large diffs, weak testing, and proposals that mix bug fixes with design changes.

---

## Pattern 6: Robert's design preferences (observed)

These are patterns in Robert's design choices that the next Claude should default to absent contrary guidance:

- **Match existing precedent unless there's a reason not to.** F3.23 (Leaf slots): chose Option A (recompute positions, rebalance field) because that's how Rooster zodiac slot creation works. Consistency beat aesthetic preference for static layout.

- **Preserve persistent run-state context in overlays.** F3.22: the round-end overlay should NOT hide spirits, hand, consumables, sidebar info. These are run-state, not transient round-state. Player should see them through/around the modal.

- **Functional correctness > visual polish.** F3.14, F3.19 deferred because tooltip already conveys the relevant info; visual indicator was polish.

- **Cultural systems should be mechanically distinctive.** Wu Xing, I Ching, Buddhist concepts in Hanatu aren't cosmetic — they have unique mechanics that distinguish them.

- **One commit per logical change.** Don't bundle a UI polish with a math fix. Don't bundle a bug fix with a refactor.

- **Pragmatic over perfectionist.** F3.19 (Infinity display): "I'm fine with it for now" — meaning we close it as deferred-to-Phase-5 rather than insisting on shipping a polish fix.

- **Robust to compaction:** Robert has experience watching context degrade across long sessions. Save plan/decisions/artifacts often. Don't expect to recall details from many turns ago.

---

## Pattern 7: Fix prompt structure that worked

When drafting fix prompts for Claude Code, this structure produced consistently clean results:

```
# Task: [Task ID] — [Short description]

## Background
[1-2 paragraphs: what the bug is, why it matters, key context]

## Root cause (confirmed via recon)
[1 paragraph + code excerpt: exactly where the bug lives and why]

## The fix / Step 1: [first thing to do]
[Concrete code change, including:
 - Where to find it (file + approximate line number)
 - The before/after code blocks
 - Inline explanation of WHY each change is needed]

## Step 2: [next thing if multi-step]
...

## Step N: Build + verify
Run: npx vite build

**Test 1: [specific scenario]**
1. [exact reproduction steps]
2. [what to verify]

**Test 2: [edge case]**
...

## Cross-references
- [related task IDs and why they're related]

## Implementation notes
[Anything that would help Claude Code make good choices it would otherwise miss:
 - Why this specific approach over alternatives
 - Risks/tradeoffs of the chosen approach
 - Areas where the implementer should use judgment]
```

**Why this structure works:**
- **Background + Root cause** lets Claude Code verify the diagnosis before editing
- **Step-by-step fix** with code blocks is unambiguous
- **Test scenarios** force Claude Code (and Robert) to think about what success looks like
- **Implementation notes** capture the rationale that wouldn't fit elsewhere
- The cumulative structure means a Claude Code response can be verified end-to-end

**What doesn't work as well:**
- Prose-only fix descriptions (Claude Code may interpret differently than intended)
- Implicit context ("just fix the obvious issue") — too easy to misinterpret
- Multiple unrelated fixes in one prompt — increases error rate and reduces reviewability

---

## Pattern 8: Document closure types honestly

Throughout the audit, we used these closure types in OVERHAUL_PLAN.md:

- ✅ **Shipped:** Code change landed, tested by Robert
- ✅ **Effectively complete / silently fixed:** Bug resolved by other work; verified empty by recon + Robert in-game test
- ✅ **Subsumed:** Original task absorbed by a different task during scope refinement
- ✅ **No-op:** Original report based on a misunderstanding; nothing to fix
- ⏸️ **Deferred to Phase N:** Task is real but better paired with later work
- 🔧 **Active:** Currently being worked
- ❌ **Dropped:** Task is no longer relevant (rare; record reason)

**Why this matters:** A plan that only tracks ✅ shipped vs ⏸️ deferred loses information. Knowing why F3.13 was silently fixed (it was — F4.13 prep work + the `!s.isNegative` filter) is useful context for understanding the codebase's evolution.

**Format suggestion for closing a task:** Edit the task in OVERHAUL_PLAN.md to add a status header with date and rationale, preserve the original scope text below (so future readers can see what the task was originally), and add cross-references to whatever resolved it.

---

## Pattern 9: Save the plan after every meaningful edit

**Trigger:** Plan or decisions log was modified in this turn.

**Pattern:** Copy the modified file to `/mnt/user-data/outputs/` immediately. This makes the latest state available to Robert if context degrades or the session ends unexpectedly.

```bash
cp /home/claude/audit/OVERHAUL_PLAN.md /mnt/user-data/outputs/
```

**Why this matters:** Context can degrade unpredictably across compactions. Having a fresh saved copy means the next session (or recovery) starts from the latest state, not from whatever stale version was last summarized.

---

## Pattern 10: When in doubt, ask

**Trigger:** Multiple defensible approaches exist; the right choice depends on design intent Robert holds but hasn't surfaced.

**Pattern:** Frame the question concisely with 2-3 options, articulate the tradeoffs, give a leaning recommendation, and stop. Don't draft fix prompts that pick a direction Robert may disagree with.

**Counterpoint:** Don't ask gratuitously. If the answer is clear from precedent or stated preference, just proceed.

**Calibration:** Asking about minor implementation details when you have enough info to decide wastes Robert's attention. Not asking about decisions that branch the design produces work that may need to be redone.

**Phase 3 examples of useful asking:**
- F3.22 Path A (revert spirit clearing) vs Path B (keep cleared) — Robert chose B initially, then evolved to "resize modal" after seeing screenshot
- F3.23 Option A (recompute positions) vs Option B (offset bonus slots) — Robert chose A matching Rooster precedent
- F3.15 item 1 zodiac "Sell → Cancel" — Robert clarified the full UX flow before we drafted

---

## Pattern 11: Treat conversation length as a real constraint

**Trigger:** Mid-to-long session, especially after multiple compactions.

**Pattern:**
- Save plan + decisions to outputs frequently
- Front-load important context in summaries (compaction is lossy)
- When approaching architectural decisions, prefer fresh sessions over continuing in degraded context
- Acknowledge openly when context feels strained ("I'm working from compressed memory of X; want to verify before proceeding?")

**The handoff principle:** Phase boundaries (or any natural seam between kinds of work) are good moments to hand off to a fresh session. This is what's happening between Phase 3 and Phase 4.

**What survives compaction well:**
- Files in `/home/claude/audit/` and `/mnt/user-data/outputs/`
- Explicit decisions logged in DECISIONS_LOG.md
- Concrete code locations referenced by file path + line number

**What survives compaction poorly:**
- Ambient conversational context
- Implicit understandings ("you know what I mean")
- The "feel" of an architectural decision without explicit rationale
- Robert's preferences expressed indirectly through reactions to options

---

## Pattern 12: The deferral pattern as Phase strategy

**Trigger:** Mid-phase, noticing that multiple tasks share a common architectural dependency.

**Pattern:** When 3+ tasks in the current phase would all benefit from waiting for a known consolidation in the next phase, log them all as deferred and expand the consolidation task's scope to absorb them.

**Phase 3 → Phase 4 absorptions:**
- F4.20 (spirit logic centralization) gained absorbed scope from F3.5b-related followups
- F4.37 (post-consolidation tooltip recomb) absorbed F3.18 (card tooltip enrichment)
- F4.38 (Wu Xing consolidation) absorbed F3.7c, F3.11b, F3.16 elements
- F4.15 (consumable activation unification) gained UX flow simplification tier from F3.15 item 1 work

**Why this works:** Each Phase 4 task is now sized correctly for the work it actually needs to do. Phase 3 stays focused. Phase 4 is reasonable in scope.

---

## Pattern 13: Multi-iteration polish is sometimes correct

**Trigger:** A bug fix's first iteration reveals deeper structure.

**Pattern:** Accept that some fixes need 2-3 iterations. Each iteration teaches something the first didn't know. F3.22's 3 iterations weren't a failure of the first prompt — they were the only path to the correct answer.

**Signals that you're iterating productively:**
- Each iteration's failure mode is informative ("clearing spirits broke X" → next iteration knows to restore X)
- The diff between iterations is small and reasoned
- Robert is engaged with the visual results, not frustrated

**Signals that you're iterating unproductively:**
- Same failure mode keeps recurring
- Iterations are large and exploratory
- Robert is asking "are we close?" rather than evaluating specific outputs

**Mitigation when unproductive:** Stop coding, do recon, reframe the problem with Robert before continuing.

---

## A note on tone and ergonomics

These patterns aren't bureaucratic. Robert and Claude developed them through 6+ months of trial, error, and refinement. They work because they fit the constraints of the actual collaboration:

- Robert is a solo dev with finite attention
- Claude has finite context per session
- Claude Code is competent but needs precise instructions
- The codebase is evolving faster than the original audit
- Some bugs will silently fix themselves; some won't
- Most work happens at the granularity of a single task at a time

The patterns are meant to reduce friction at those constraints, not to impose process for its own sake. If a pattern doesn't fit a given moment, skip it.

---

## What to take into Phase 4

Read this once. Internalize the heuristics. Then operate naturally. The next Claude shouldn't feel like it's following a checklist — these patterns should feel like a reasonable default working style.

When uncertain about whether a pattern applies: bias toward asking Robert, especially in the first few sessions of Phase 4 when calibration to current state is most important.

**Most-important-for-Phase-4 patterns:**
- Pattern 1 (recon-before-draft) — Phase 4 is architectural; missing current code state is fatal
- Pattern 2 (verify silent fixes) — the audit underlying Phase 4 is 6+ weeks stale
- Pattern 4 (smallest defensible fix) — architectural work tempts large diffs; resist
- Pattern 7 (fix prompt structure) — Phase 4 prompts will be longer than Phase 3 prompts; structure matters more
- Pattern 11 (conversation length) — Phase 4 will be denser than Phase 3; mind the context

Good luck.
