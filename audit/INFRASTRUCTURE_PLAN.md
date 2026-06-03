# Infrastructure Plan for Phase 4

**For:** The first session of the new conversation, before Phase 4 work begins.
**Status:** Recommendations as of 2026-06-02. To be executed (or revised) in the new conversation.

---

## Summary

Set up these in the new conversation, in order:

1. **CLAUDE.md** at repo root (committed)
2. **GitHub MCP** integration
3. **Ship-and-verify Skill** (optional, low complexity)
4. **Auto Memory** (implicit — no setup, just gitignore)

Defer for later:
- Content-authoring agents (revisit at Phase 4 → Phase 5 transition)
- Subagents (probably never needed at this project size)
- Specialized Skills beyond ship-and-verify
- AGENTS.md, Playwright MCP, Filesystem MCP (not useful for Hanatu)

---

## 1. CLAUDE.md (committed at repo root)

**File:** `./CLAUDE.md` at the Hanatu project root.

**Setup:**
1. Use the draft in `CLAUDE_MD_DRAFT.md` (108 lines, under the 200-line target)
2. Copy/rename to `CLAUDE.md` at the project root
3. Commit to git (this file is shared via version control)

**What it does:** Loaded into context at the start of every Claude Code session. Codifies:
- Project overview and tech stack
- File layout and where new content belongs
- Source-of-truth principle (Phase 4 thesis)
- Pointers to design docs and plan files
- Working principles (recon before edit, smallest defensible fix, etc.)
- Phase 3 architectural patterns Phase 4 must respect
- Code conventions and pitfalls

**Why this is the foundation:** Everything else builds on having CLAUDE.md in place. Skills and subagents would inherit the conventions established here. Without CLAUDE.md, every Claude Code session starts from zero.

**Maintenance:** Update CLAUDE.md whenever you discover a new convention or pitfall worth documenting. Don't let it balloon past 200 lines — if it gets long, split topic-specific content into separate referenced files.

---

## 2. GitHub MCP integration

**What it does:** Lets Claude Code (and claude.ai sessions) interact with GitHub directly — read/write repos, branches, commits, PRs, issues.

**Why now (Phase 4 specifically):**
- Phase 4 work produces larger, more architectural diffs than Phase 3 fix-by-fix work
- Architectural commits benefit from clear commit messages tied to plan task IDs
- PRs become useful when reviewing your own work across multiple sessions
- Issues can mirror task tracking if you want a more visible queue than `OVERHAUL_PLAN.md`

**Setup steps (interactive, in the new conversation):**
1. In Claude.ai settings or Claude Code config, add the GitHub MCP server
2. Authenticate via GitHub OAuth
3. Grant access to the Hanatu repository specifically (not all repos)
4. Verify by asking Claude to list recent commits

**What to use it for in Phase 4:**
- **Branches:** Create `phase-4/<task-id>` branches for larger consolidations
- **Commits:** Commit messages reference plan task IDs (e.g., `F4.16: move _fireCuckooHatch from RunManager to SpiritEffects`)
- **PRs:** Optional — useful if you want to review architectural changes against the previous state before merging to main
- **Issues:** Optional — could mirror Phase 4 task list, but `OVERHAUL_PLAN.md` is the canonical source

**What NOT to use it for:**
- Don't let Claude push to main without your review during Phase 4 architectural work
- Don't rely on it for plan tracking — keep `OVERHAUL_PLAN.md` as the source of truth

**Risk:** GitHub MCP gives Claude write access to your repo. Set permissions carefully (read-only is fine if you'd rather do commits manually).

---

## 3. Ship-and-verify Skill (optional)

**What it does:** Codifies the post-fix protocol so Claude Code consistently runs build + reports results in a standard format.

**Setup:**
1. Create `.claude/skills/ship-and-verify/SKILL.md` in the project (or in `~/.claude/skills/` for personal use)
2. Add the content below

**Skill content draft:**

```markdown
---
name: ship-and-verify
description: Run after any code edit. Verifies the build succeeds, reports what changed, and flags any newly-introduced dead code or warnings. Use when a code change has been made and you need to confirm it works before reporting completion.
---

# Ship and Verify Protocol

After any code edit, run this sequence:

1. **Build:** `npx vite build 2>&1 | tail -5`
2. **Confirm success:** Output should include `✓ built in Xs`. If "error" appears or build fails, report the error and stop.
3. **Report change summary:** In your response, include:
   - Files changed (with line counts: `+N -M`)
   - What changed conceptually (1-2 sentences)
   - Any dead code introduced (e.g., parameters now unused)
   - Any warnings from the build output worth noting
4. **Flag concerns:** If the change touched architecture-sensitive code (anything in `/src/systems/SpiritEffects.js`, `/src/systems/HexagramEffects.js`, `/src/systems/ConsumableEffects.js`, scoring engines, or scene rendering), note it explicitly.

Format the report concisely. Robert will test in-game; the report's job is to surface what to look for, not to retrace the implementation.

Example:
> Done. Changed `RunManager.js` (+12 -3) and `SpiritEffects.js` (+8). Moved `_fireCuckooHatch` to `SpiritEffects.js`; `RunManager.js` now calls it as a service. Build clean. Architecture-sensitive: RunManager no longer owns Cuckoo Egg maturity logic. Worth verifying Cuckoo Egg sale still triggers correctly.
```

**Why this is worth doing:**
- Consistent post-fix reports save the design-side Claude time reviewing
- The "flag concerns" step catches architecture-touching changes that need extra attention
- Loadable on demand via Skill description matching — only costs tokens when used

**Why this is OPTIONAL:**
- The same protocol can live in CLAUDE.md as a "workflow" section
- Adding a Skill is mild complexity (one more file to maintain)
- If you're not seeing inconsistency in Claude Code's post-fix reports, you don't need it

**Recommendation:** Try without it for the first few Phase 4 sessions. If you notice Claude Code skipping build verification or reporting inconsistently, add the Skill then.

---

## 4. Auto Memory (implicit)

**What it does:** Claude Code's automatic learning system. Writes to `.claude/memory/` per repository. Loads the first 200 lines or 25KB into context at every session.

**Setup:** None. It accumulates organically as you work.

**Required:** Add `.claude/` to `.gitignore` if you don't want Claude's personal notes committed to your repo.

```bash
# In .gitignore:
.claude/
```

**Why this matters:** Across Phase 4's many sessions, Claude Code will accumulate observations about your codebase (common pitfalls, where things actually live, decisions you've made). This compounds. By Phase 5, the auto memory should be substantively helpful.

**What NOT to do:**
- Don't try to seed auto memory manually; let it accumulate
- Don't commit `.claude/memory/` to git — those are personal context, not project conventions
- Don't expect auto memory to replace CLAUDE.md — they're complementary

---

## What we're explicitly NOT setting up

### Playwright MCP — not useful for Hanatu

Playwright is a DOM automation tool. Hanatu is a canvas game (all gameplay rendered as pixels inside one `<canvas>` element). Playwright can find the canvas element but can't see inside it — it would have to click pixel coordinates blindly. For game testing, in-game manual testing by you remains more efficient than any Playwright setup.

### Filesystem MCP — redundant

Claude Code already has direct file access through its native Read/Write/Edit tools. A separate Filesystem MCP would just duplicate this with extra latency.

### AGENTS.md — no other agents in use

AGENTS.md is for repositories shared with multiple AI coding tools (Cursor, Windsurf, Codex, etc.). You only use Claude Code. No need for the shim.

### Content-authoring agents — wrong phase

Phase 4 is consolidation. Phase 5 is content addition (new spirits, new hexagrams). Specialized "spirit author" or "hexagram author" agents would be useful in Phase 5 where you'll be doing repetitive structured content work. In Phase 4, every task is unique architecture; agents wouldn't help.

**Revisit at Phase 4 → Phase 5 transition.** At that point, design 1-2 content-authoring agents matched to the actual repetitive work patterns of Phase 5.

### Subagents — complexity exceeds benefit at this project size

Subagents are separate Claude instances spawned to handle parallelizable subtasks. They make sense for large codebases with truly independent work streams. Hanatu is solo-dev scale; you don't have parallel work streams to subagent.

**The dual-tool workflow (claude.ai for design, Claude Code for implementation) already provides the parallelism you need.** Adding subagents would add complexity without proportional benefit.

If Phase 5 reveals a need (e.g., "I want one subagent to add 20 new consumables while I work on tutorial design with the main session"), reconsider then. Not now.

---

## Order of setup in the new conversation

When you start the new conversation:

1. **Upload the handoff package** (see `UPLOAD_MANIFEST.md` for the file list)
2. **Read `PHASE_4_ENTRY_BRIEF.md` first** to orient the new Claude
3. **Set up CLAUDE.md** — copy `CLAUDE_MD_DRAFT.md` to `./CLAUDE.md` at the Hanatu repo root, commit
4. **Set up `.gitignore`** to include `.claude/` if not already
5. **Connect GitHub MCP** via the appropriate Anthropic UI (claude.ai settings or Claude Code config)
6. **Optionally add the ship-and-verify Skill** at `.claude/skills/ship-and-verify/SKILL.md`
7. **Apply design doc patches** (start of Phase 4 work proper — F4.14, using `DESIGN_DOC_PATCHES.md`)
8. **Begin Phase 4 work** per `PHASE_4_TASK_ORDERING.md`

Don't try to do all of this in one session. Setup steps 3-6 might be one session; design doc reconciliation (step 7) is its own session.

---

## What to revisit at Phase 4 → Phase 5 transition

When Phase 4 wraps and you're moving to Phase 5 (content addition, polish, tuning, save/load, tutorial), revisit this plan:

- **Content-authoring agents** become useful — design 1-2 specialized agents for repetitive content work
- **Subagents** may become useful if you have truly parallel work streams
- **More Skills** may be worth adding once Phase 5's recurring patterns reveal themselves
- **GitHub MCP** usage may shift — Phase 5 is more likely to use feature branches + PRs than Phase 4's mostly-on-main work

Don't pre-design Phase 5 infrastructure now. The right time is when you can see what Phase 5 actually needs.

---

## A note on tooling overhead

The temptation with AI tooling is to set up everything before working. Resist this. Each piece of infrastructure has a maintenance cost (keeping it current, debugging when it breaks, remembering it exists). The smallest viable setup is best.

CLAUDE.md + GitHub MCP + Auto Memory is genuinely minimal — three things, each justified by Phase 4's specific needs. That's the right starting point. Add more only when concrete friction emerges.
