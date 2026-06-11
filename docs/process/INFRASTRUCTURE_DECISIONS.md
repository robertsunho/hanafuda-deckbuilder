# Infrastructure Decisions — Phase 4 Setup

**For:** The Hanatu Project and any conversation working within it.
**Status:** Settled 2026-06-03, in the session that set up Phase 4 infrastructure.
**Purpose:** Records *why* the Phase 4 workflow is shaped the way it is, so future
conversations don't re-litigate settled questions or misunderstand the tooling.

---

## The workflow model: Project-with-Claude-Code-recon

Phase 4 (and the road to demo) runs on a three-part division of labor:

- **The Project** (here, on claude.ai) is the persistent home and knowledge base.
  It holds the codebase (synced from GitHub) and all reference docs, available to
  every conversation without consuming each conversation's context window until
  retrieved. Continuity across sessions comes from Project knowledge + per-Project
  conversation history/memory — NOT from chat memory.
- **Design conversations** (inside the Project) are where architecture is reasoned
  about, options are weighed, and decisions are made. This deliberation-before-
  shipping is the deliberate core of the process, especially for Phase 4's
  judgment-heavy architectural consolidation.
- **Claude Code** (VS Code terminal or desktop Code tab — ergonomics choice, see
  below) does exhaustive recon (true grep over the working tree, e.g. "find every
  call site of X"), reports findings back to the design conversation, and
  implements once a decision is made.
- **Robert** tests in-game, drives commit/push, and holds final judgment.

Most orientation reads go through the Project's synced knowledge; comprehensive
symbol-enumeration sweeps go through Claude Code. Boundary felt out in practice.

## Why not GitHub MCP as a live recon tool in chat (the path NOT taken)

We investigated giving claude.ai chat a live, on-demand read of the repo. It is
not possible on the web chat surface:

- The official GitHub MCP server (github/github-mcp-server) installs into the
  **Claude Code CLI or Claude Desktop only** — not claude.ai web. Every install
  path targets the agentic clients. The remote-connector route for Desktop is
  blocked because GitHub's remote MCP requires OAuth through a registered GitHub
  App, which those clients don't currently support (local Docker setup only).
- The first-party "GitHub Integration" connector on claude.ai is a
  *repository-access* feature (attach files to chat / sync into a Project /
  Claude Code repo selection), NOT a set of on-demand tools claude.ai chat can
  call mid-conversation like Gmail/Calendar/Drive.
- Even on Claude Code, the GitHub MCP server is unnecessary for *recon* — Claude
  Code already has native file access to the working tree. The MCP server mainly
  adds commit/PR/issue *management* tools, at a real standing token cost (large
  tool surface loaded into context) plus a PAT to manage. Revisit only if Phase 4
  reveals concrete need for rich PR/issue workflows in Claude Code.

Conclusion: there is no config that gives claude.ai chat a grep-style live read.
That capability lives in the agentic clients, where Claude Code already covers it.

## How recon stays current: commit-every-change discipline

Because the Project syncs from the GitHub *remote* (not the local working tree),
the remote must be kept current for synced knowledge to be trustworthy:

- After each change lands and the build is clean, commit AND push immediately.
- Tag commit messages with the plan task ID
  (e.g. `F4.16: move _fireCuckooHatch from RunManager to SpiritEffects`).
- Before a recon-heavy session, hit "Sync now" on the Project's GitHub knowledge
  to pull the current remote state.
- Blind spot: uncommitted local edits won't appear in synced knowledge. When
  re-reconning an area we just touched but haven't pushed, have Claude Code read
  the working tree directly instead.

This discipline is also codified in CLAUDE.md.

## GitHub-synced Project knowledge: how it actually behaves

- Syncs file **names and contents only** — no commit history, PRs, or metadata.
- **Manual refresh** ("Sync now"); does not auto-track commits.
- Known historical bug: Projects GitHub sync has silently failed for some users
  ("Connected" but not indexed). VERIFY retrieval works (read a known file + a
  known doc section) before trusting it for recon. This is the first thing to do
  in the Project.

## Desktop Code tab vs VS Code terminal: deferred, low-stakes

The May 2026 analysis treated moving design work into the desktop Code tab as a
hard tradeoff because it would cost claude.ai memory/continuity. The Project
decision dissolves that tradeoff: continuity now comes from Project knowledge, not
chat memory, so *where* Claude Code runs (terminal vs Code tab) is a pure
ergonomics choice with no continuity penalty. Try the Code tab for a few
implementation prompts once in the Project; migrate if it feels better. Caveat:
watch for the Windows desktop-app stability issue (freezing/blank screen) that was
only partially resolved earlier.

## Project structure: one per phase-scale unit

- **One Project for Phase 4.** Coherent unit of work; stable reference set;
  accumulates useful Phase-4 history.
- Changing docs (e.g. DESIGN_DOC_V5 after F4.14) are handled by **re-uploading /
  re-syncing in place** — NOT by spinning up new Projects.
- **Reassess at the Phase 4 → Phase 5 seam:** Phase 5 (content/polish/art/sound/
  UX) is categorically different work and may warrant its own Project with
  re-curated knowledge. Decide then, not now.

## Source of truth: everything in the repo, synced into knowledge

Settled after initial draft. There is ONE home for all docs: the repo. They reach
Project knowledge THROUGH the GitHub sync, not via separate upload. This avoids
duplication (same doc in two places → retrieval may surface a duplicate or a
drifted/stale copy) and keeps a single canonical source — the same single-source
-of-truth principle Phase 4 applies to code.

- Do NOT separately upload docs that are in the repo. Sync carries them.
- Synced files and uploaded docs behave IDENTICALLY once in knowledge: both are
  retrieved on demand (relevant chunks only), neither is loaded wholesale into a
  conversation's context. Syncing is a WRITE into the knowledge base when a file
  changes — not a read into conversation context. So "synced doc" carries no
  per-conversation token penalty vs "uploaded doc." The only sync cost is one-time
  re-processing of CHANGED files on the next "Sync now."
- Retrieval is search-based, not linear. For tasks needing an end-to-end read
  (e.g. F4.14 full doc-vs-patches reconciliation), pull the relevant doc/section
  fully into context or lean on Claude Code's literal grep.

## Repo documentation structure

```
/CLAUDE.md                         ← stays at root (Claude Code auto-loads here)
/src/                              ← code
/docs/
  DESIGN_DOC_V5.md                 ← design source of truth
  /process/                        ← the LIVE set (durable refs + currently-active)
    PHASE4_STATE.md                ← live "where are we" index (single anchor)
    OVERHAUL_PLAN.md, DECISIONS_LOG.md, DESIGN_DOC_PATCHES.md, PHASE_3_LESSONS.md,
    INFRASTRUCTURE_DECISIONS.md, TEST_HARNESS_GOTCHAS.md, SPIRIT_SET_ITERATION_RULE.md,
    PHASE4_consolidation_candidates.md   (partially-live banked threads)
  /archive/                        ← HISTORICAL, point-in-time, do NOT edit
    INFRASTRUCTURE_PLAN.md (superseded by this file), UPLOAD_MANIFEST.md
    /phase4/                       ← completed Phase-4 task records (CLOSED/SUPERSEDED headers)
      PHASE_4_ENTRY_BRIEF.md, PHASE_4_TASK_ORDERING.md,
      F4.16_F4.20_triage_ledger.md, F4.20_candidate_F_audit_findings.md,
      F4.24_inventory_pass1.md, F4.17_campaign_ledger.md, F4.18b_campaign_ledger.md,
      discard_pipeline_recon.md, round_end_pipeline_recon.md
    /investigations/               ← prior recon evidence (verify vs current code)
      cleanup-audit-report.md, three-marks-investigation.md, yaku-investigation.md
  (docs/recon/ and docs/prompts/ no longer exist — recon folded into archive/phase4/,
   prompts/ deleted)
```

- **process/ vs archive/:** living/updated → process; immutable snapshot → archive.
  Don't edit archived files; if stale, re-recon fresh rather than amend.
- **Doc lifecycle — "rule vs record" test.** A doc stays in `process/` only while upcoming work
  needs to consult it (a *rule*, plan, or live reference). When a doc becomes a *record* of how a
  completed task went, move it to `archive/phase4/` at that task's close-out (the close-out ritual),
  with a CLOSED status header. This keeps `process/` to the live set and prevents bloat.
  `PHASE4_STATE.md` is the live index of which docs are which.
- **Phase-spanning registries are swept forward, not archived.** A *registry* doc (e.g.
  `PHASE4_consolidation_candidates.md`) deliberately holds entries gated to a LATER phase, so it is not
  "done" when its host phase closes. At phase close-out, sweep its next-phase-bound entries into the
  next phase's planning rather than archiving the doc as complete — a phase-level step distinct from the
  per-task close-out ritual (see PHASE4_STATE §6). Unfinished-by-design ≠ dropped.
- **Investigations** (three-marks, yaku, cleanup-audit) are kept: they're the recon
  behind specific Phase 4 tasks (e.g. three-marks → F4.10 naming cleanup + F4.27;
  yaku → F4.8 + the two-scoring-paths debt in F4 Tier-equivalent work). Treat as
  stale-but-valuable; verify against current code before acting on their findings.
- **Sync selection:** sync `/src/` + `/docs/` (whole tree); EXCLUDE node_modules,
  dist/build output, large binary assets. Both claude.ai (synced knowledge) and
  Claude Code (direct access) then see an identically-organized tree.
- Use `git mv` for the reorganization so history follows the files.

## What lives where (knowledge vs first conversation)

- **In the repo → synced into knowledge** (durable): everything under `/docs/`
  plus `CLAUDE.md` and the codebase. Nothing uploaded separately.
- **First conversation only** (Phase-3→4 transition, ages out): `PHASE_4_ENTRY_BRIEF.md` and
  `PHASE_4_TASK_ORDERING.md` were the bootstrap orientation. They are now SUPERSEDED as live
  anchors by `docs/process/PHASE4_STATE.md` — the single live "where are we" doc — and have moved
  to `/docs/archive/phase4/` (alongside `UPLOAD_MANIFEST.md` in `/docs/archive/`). Consult
  PHASE4_STATE.md for current state; the archived pair is the bootstrap record only.

## Past-conversation migration into the Project

The three-dot "Add to Project" option CAN retroactively bring a past conversation
under the Project (correcting an earlier wrong assumption that it couldn't).
Migrating adds a conversation to per-Project SEARCH/MEMORY — it is retrieved on
demand, NOT loaded as standing context. So migration adds searchable history at no
per-conversation context cost. Decision by value, not by cost:

- **Migrate: the Phase 0–3 audit conversation.** Dense with substantive findings
  and closure rationale; worth searchable depth.
- **Do NOT migrate: this infrastructure-setup conversation.** Mostly deliberation
  and dead ends (GitHub MCP investigation, corrected assumptions) circling toward
  conclusions. Its conclusions are distilled here and in CLAUDE.md; the raw
  transcript would add noisy searchable history over cleaner canonical docs.
- **Do NOT migrate: early Feb/March design conversations or the Noisy app
  conversation.** The former's substance is already distilled into DESIGN_DOC_V5 /
  DECISIONS_LOG; the latter is a different project (noise in Hanatu's search scope).

## Open housekeeping items (non-blocking)

- **Rename repo + local folder `hanafuda-deckbuilder` → `hanatu`** to match the
  game's name. Deferred deliberately: doing it mid-setup would invalidate the
  connector's repo scope, break the local path session history lives at, and
  require re-pointing the git remote. Do it as a standalone task at a natural seam
  (GitHub auto-redirects the remote URL; still update local folder name, git
  remote, and re-verify the Project's GitHub sync). Zero design impact.
- **Verify DECISIONS_LOG.md captures the "spirits don't touch Flow" reversal** —
  originally a committed decision (Feb), later reopened (April) when the scoring
  channel was reframed from "yaku mult" to a general "mult" that both yaku and
  spirits feed. If the *evolution* isn't recorded, add a line; it's exactly the
  kind of "why is it this way?" rationale that gets lost.
