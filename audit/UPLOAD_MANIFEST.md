# Upload Manifest for Phase 4 Conversation

**Purpose:** Explicit list of files to bring into the new conversation, organized by priority and use.

**Principle:** The new conversation has a finite context budget. Loading everything bloats it and reduces the value of the most important files. Bring what's needed at session start; keep the rest available as reference.

---

## Tier 1: Load at session start (mandatory)

These files orient the new Claude and need to be in context from turn 1.

| File | Size | Purpose |
|---|---|---|
| `PHASE_4_ENTRY_BRIEF.md` | 14 KB | The onboarding document. Read first. |
| `PHASE_3_LESSONS.md` | 19 KB | Working patterns from Phases 0-3. Read second. |
| `PHASE_4_TASK_ORDERING.md` | 12 KB | Proposed Phase 4 task ordering. Read third. |
| `INFRASTRUCTURE_PLAN.md` | 11 KB | What to set up first in the new conversation. |
| `CLAUDE_MD_DRAFT.md` | 7 KB | Ready to be installed as `./CLAUDE.md` at repo root. |

**Total Tier 1: ~63 KB** — reasonable size to load upfront without dominating context.

**Suggested order to read:**
1. Entry Brief (orientation)
2. Lessons (patterns)
3. Task Ordering (sequence)
4. Infrastructure Plan (what to do first)
5. CLAUDE.md Draft (will be installed, not just read)

---

## Tier 2: Available as reference (load on demand)

These files are essential reference but don't need to be in context until specific work touches them. The new Claude should know they exist and where to find them, but only load when relevant.

| File | Size | Purpose |
|---|---|---|
| `OVERHAUL_PLAN.md` | 346 KB | Master plan with all Phase 4-5 task descriptions. Reference during task work. |
| `DECISIONS_LOG.md` | 223 KB | Chronological decision history. Reference for "why did we decide X?" lookups. |
| `DESIGN_DOC_PATCHES.md` | 28 KB | The 64-patch worklist for F4.14. Load when starting F4.14 work. |
| `PHASE_2_TESTING.md` | 87 KB | Phase 2 bug log. Reference if older bug context is needed. |

**Total Tier 2: ~684 KB** — too big to load upfront; reference as needed.

**Best practices for loading:**
- Don't load `OVERHAUL_PLAN.md` upfront. Use `view` or `grep` to find specific task entries when working on them.
- Don't load `DECISIONS_LOG.md` upfront. Grep for specific decision references.
- Load `DESIGN_DOC_PATCHES.md` when starting F4.14 (design doc reconciliation).

---

## Tier 3: Project codebase (lives in the file system)

The actual Hanatu codebase. The new Claude reads these via the file system, not via upload.

Specifically, the new Claude should do a **focused codebase survey** in the first or second Phase 4 session, NOT a comprehensive read. Areas to survey:

- `/src/scenes/GameScene.js` (largest file, most churn during Phase 3)
- `/src/scenes/ShrineScene.js`
- `/src/systems/RunManager.js`
- `/src/systems/GameRoundManager.js`
- `/src/systems/HexagramEffects.js`
- `/src/systems/ConsumableEffects.js`
- `/src/systems/SpiritEffects.js`
- `/src/data/spirits.js`, `consumables.js`, `hexagrams.js`, `stamps.js`

The codebase is THE source of truth. The audit-derived documents (plan, decisions) are derived from it and may have drift.

---

## Tier 4: Archive (project filesystem only, not for upload)

Historical context from earlier phase work. Keep in the project filesystem (or in `/audit/` directory) for reference, but don't bring into the new conversation. These were useful for the work that produced them; they're now historical.

| File | Size | Purpose |
|---|---|---|
| `F2.6_VERIFICATION_NOTES.md` | 3 KB | Phase 2.6 work, complete |
| `F2_1_AUDIT_FINDINGS.md` | 24 KB | Phase 2.1 audit, complete |
| `F2_3_i_VERIFICATION.md` | 13 KB | Phase 2.3.i verification, complete |
| `PHASE2_TESTING_ANALYSIS.md` | 13 KB | Phase 2 testing summary, complete |
| `PHASE_1_CLOSEOUT_SUMMARY.md` | 15 KB | Phase 1 closeout, complete |
| `PHASE_2C_VERIFICATION.md` | 40 KB | Phase 2C verification, complete |
| `TESTING_NOTES_V2.md` | 152 KB | Master testing notes archive |
| `SLICE_1_SCORING_PIPELINE.md` ... `SLICE_7_LOGGING_AUXILIARY.md` | 160 KB total | Original audit slices from Phase 0 |

**These are NOT needed in the Phase 4 conversation.** They're preserved because:
- They document the history of how we got here
- They may be useful for future questions ("what did Slice 4 say about hex_64 originally?")
- They were the input material the audit was built from

**Do NOT upload these to the new conversation.** If specific information from one of these is needed during Phase 4, the new Claude can ask Robert to fetch it.

---

## What to also bring into the new conversation

Beyond the files above, the new conversation also needs:

### Design doc and codebase access
- **`DESIGN_DOC_V5.md`** — the authoritative design reference. Should be available in the project filesystem (you'll be editing it during F4.14).
- **Hanatu codebase** — the actual source files at the current state. The new Claude reads via filesystem tools, not via upload.

### Context about you
- Just enough that the new Claude knows you're Robert, you're a solo dev, you're working on Hanatu, and you've been collaborating with Claude through Phases 0-3.
- The Phase 4 entry brief covers this; you don't need to re-explain.

### Mention of this preparation work
- A brief note that this preparation conversation happened: "I just completed a handoff prep with another Claude. The files in this upload are the output. Please read the Phase 4 entry brief first."
- The brief itself will direct the new Claude through the rest.

---

## Suggested first message to the new conversation

Here's a template you could use to kick off the new conversation. Adjust to taste.

```
Hi! I'm Robert. I'm a solo dev working on Hanatu, a koi-koi-inspired roguelike deckbuilder in Phaser.js/Vite. I've been collaborating with Claude through Phases 0-3 of a structured audit/overhaul process, and Phase 3 just completed. I'm now starting Phase 4 (architectural consolidation).

I've just finished a handoff preparation session with another Claude. The files I'm uploading contain everything needed to onboard you to Phase 4 work. Please:

1. Start by reading PHASE_4_ENTRY_BRIEF.md — that's the orientation document.
2. Then read PHASE_3_LESSONS.md for the working patterns we've established.
3. Then read PHASE_4_TASK_ORDERING.md for the proposed Phase 4 sequence.
4. Then read INFRASTRUCTURE_PLAN.md for what we need to set up first.
5. CLAUDE_MD_DRAFT.md will become the project's CLAUDE.md file.

After reading those, let's discuss the Phase 4 task ordering and confirm whether you'd start with the same sequence I'm proposing. We'll set up infrastructure (CLAUDE.md, GitHub MCP, possibly the ship-and-verify Skill) before beginning Phase 4 work proper.

The other files (OVERHAUL_PLAN.md, DECISIONS_LOG.md, DESIGN_DOC_PATCHES.md) are reference material — don't load them into context unless we're working on something specific they cover. (DESIGN_DOC_PATCHES.md specifically should be loaded when we start F4.14 work — it's the worklist for that task.)
```

Adjust based on how much guidance you want to give upfront. More direction = faster start but less room for the new Claude to surface ideas; less direction = slower start but more openness to revised approaches.

---

## A note on file naming

Phase 4 work may produce additional documents (e.g., `ARCHITECTURE.md` for F4.24, `MIGRATION_LOG.md` for tracking consolidation work). When new docs are created, decide their tier (mandatory load? reference? archive?) and update this manifest's understanding accordingly.

The manifest itself becomes outdated once Phase 4 starts. Don't try to keep it perfectly current; treat it as a snapshot for the handoff transition.

---

## Sanity check before starting the new conversation

Before opening the new conversation:

- [ ] All Tier 1 files are saved to your local filesystem (you can re-upload them)
- [ ] DESIGN_DOC_V5.md is current in the project filesystem
- [ ] Hanatu codebase is committed to git at the current state (Phase 3 closeout)
- [ ] You know roughly when you can start the new conversation (avoid time pressure for the first session)

The first session of the new conversation should be unrushed. Onboarding the new Claude, setting up infrastructure, and confirming Phase 4 ordering takes 1-2 hours of focused attention. Schedule accordingly.
