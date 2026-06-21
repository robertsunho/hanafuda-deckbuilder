# DOC_MAP — where everything lives (and where new things go)
*The canonical index of Hanatu's documentation. One concern → one source of truth. If you're unsure where
something belongs, this file decides. Last set: 2026-06-19 (post-restructure: final canonical layout).*

> **Why this file exists.** As Phases 0-4 closed, docs accumulated and a few drifted into overlap (e.g. a
> patch ledger that ended up with three stacked sub-ledgers). This map prevents that: every concern has
> exactly one canonical home, and the routing rules below say where new content goes so it never lands in
> two places. When in doubt, route per this file rather than appending wherever is handy.

---

## 1. Sources of truth (canonical, living)

| Concern | Canonical doc | What it owns | Notes |
|---|---|---|---|
| **Game design** | `docs/DESIGN_DOC_V6.md` | Current, shipped design: mechanics, spirits, consumables, scoring, economy. Describes what the code DOES. | The Gate-0 audit rubric. Reconciled to code (3b/3c). Forward-looking notes → ROADMAP. |
| **Architecture / structure** | `docs/ARCHITECTURE.md` | Code organization, the hook/helper reference, "build with existing primitives" patterns, the per-element accumulator *mechanism*, system boundaries. | The second Gate-0 rubric. DP-61/DP-62 + the DP-03 mechanism point here. |
| **Forward plan + deferred design** | `docs/ROADMAP.md` | The Phase-5-7 task plan (design-resolution / feature-building / demo-prep → tuning → polish) AND the deferred-design specs (D1-D10, folded in from the former DESIGN_DEFERRED). | Supersedes OVERHAUL_PLAN as the living plan. Deferred-design specs live inline in its entries. |
| **Code cleanup tasks** | `docs/CODEBASE_CLEANUP.md` | Deferred CODE tasks (Phase-6 semantic/naming cleanup + dead-code removal): the `ribbonStamp`→`stamp` rename, dead `applyInterest()`, stale data-strings, etc. | **All future code-cleanup items go here.** Distinct from forward design (ROADMAP) + doc reconciliation. |
| **Reference-doc change record** | `docs/CHANGELOG.md` | Tagged (`[design]`/`[architecture]`/`[engineering]`) one-line index of changes to the canonical reference docs; the V7 shaper. | Cheap index → points to DECISIONS_LOG for rationale. New 2026-06-18. |
| **Decisions (the record)** | `docs/DECISIONS_LOG.md` | Append-only durable record of every design/architecture/process decision, with rationale. | Carries forward through all phases — keep appending, never fork. |
| **Engineering rules + workflow rationale** | `docs/ENGINEERING_RULES.md` | Hard-won "do it this way" rules (recon, verify, smallest-fix, commit/sync, the `&&` gotcha) **plus §D** the two-surface workflow rationale (folded in from the former INFRASTRUCTURE_DECISIONS). | **Indexes** the deep rule-docs in `docs/reference/`. Consulted *during* work. |
| **Deep rule-docs (indexed, not canonical-set)** | `docs/reference/` | `SPIRIT_SET_ITERATION_RULE.md`, `TEST_HARNESS_GOTCHAS.md`, `tooltip_verification_checklist.md`. | Canonical for their own content; ENGINEERING_RULES indexes them. |
| **Live recon / investigations** | `docs/investigations/` | Forward-going recon work (live). | Archived recon → `docs/archive/recon/`. |
| **Operational entry point** | `CLAUDE.md` (repo root) | The lean "how to work in this repo" entry: points to the docs above; holds the few top-level operating rules. | **Stays lean** — detailed rules live in ENGINEERING_RULES.md. Bloat-resistance is the rule for this file. |

## 2. Routing rules (where new content goes)

- **A new mechanic shipped / a mechanic's behavior changed** → update `DESIGN_DOC_V6.md` (current behavior) +
  append the decision to `DECISIONS_LOG.md`.
- **A design idea for later (not built)** → `ROADMAP.md` (deferred-design specs live in its entries). Never
  put forward-looking "will become X" notes in V6.
- **A code smell / rename / dead code / deferred refactor** → `CODEBASE_CLEANUP.md`. Not V6, not DEFERRED.
- **A decision got made** → `DECISIONS_LOG.md` (append; never start a parallel log).
- **A new task / scope for Phases 5-7** → `ROADMAP.md`.
- **A reusable "do it this way" rule or a gotcha that bit us** → `ENGINEERING_RULES.md` (and, if it's a
  top-level operating rule, a one-line pointer from CLAUDE.md).
- **A structural/architectural fact (what lives where, a hook contract)** → `ARCHITECTURE.md`.
- **A worklist / ledger** → keep it to ONE canonical state. Do not stack superseding sub-ledgers inside a
  living doc; supersede in place or archive the closed one. (This is the rule that prevents the
  DESIGN_DOC_PATCHES stacked-ledger situation from recurring.)

## 3. Transitional & archive-pending (NOT canonical)

These were transitional; the 2026-06-19 restructure **archived** them (or deleted the relocated staging
docs). Not sources of truth; do not edit archived files.

| Doc | Status | Now at |
|---|---|---|
| `OVERHAUL_PLAN.md` | Superseded (forward role → ROADMAP) | `docs/archive/plans/` |
| `DESIGN_DOC_PATCHES.md` | Closed worklist (V6 produced) | `docs/archive/plans/` |
| `POST_AUDIT_DIRECTION.md` | Feeder (framing folded into ROADMAP §1) | `docs/archive/plans/` |
| `PHASE_5_6_7_BACKLOG.md` | Reconciled into ROADMAP | `docs/archive/plans/` |
| `PHASE4_COMPLETION_PLAN.md`, `tier4_scoping.md`, `PHASE_3_LESSONS.md` | Historical / lessons migrated → ENGINEERING_RULES | `docs/archive/plans/` |
| `tier5_reconciliation.md`, `PHASE4_consolidation_candidates.md` | Historical recon ledgers | `docs/archive/recon/` |
| `DESIGN_DEFERRED.md`, `V6_EXTRACTED_SECTIONS.md`, `INFRASTRUCTURE_DECISIONS.md` | Relocated, then **DELETED** (content → ROADMAP / CODEBASE_CLEANUP / ENGINEERING_RULES §D; git-preserved) | — |
| `PHASE4_STATE.md` | Archived (Gate 0 closed 2026-06-20) | `docs/archive/phase4/` |

> **Campaign briefs → `docs/prompts/`.** The file-based prompts that drive each change live here. They are
> **not canonical** and not a source of truth — they are the preserved *record of why* a change was made.
> **Audit scope excludes `docs/prompts/`** (alongside `docs/archive/`). *(The dir may need recreating — a
> separate task; this records the convention so the home is named.)*

> **Registries are swept forward, not archived-as-done.** A *registry* doc (e.g. the candidates registry)
> deliberately holds entries gated to a LATER phase, so it isn't "done" when its host phase closes — at
> phase close-out, sweep its next-phase entries into the next phase's plan (`ROADMAP.md`) *before* archiving
> the doc. Unfinished-by-design ≠ dropped. *(Migrated from the former INFRASTRUCTURE_DECISIONS.)*

## 4. Two consolidations on the horizon (named here, done later)

1. **Phase-0-4 backward consolidation** *(after Gate 0)* — collapse the archive-pending process docs into a
   single Phase-0-4 summary, retaining `DECISIONS_LOG.md` as the durable spine. Waits until after Gate 0
   because several are still live inputs to it.
2. **Doc-hygiene cluster** *(DONE — 2026-06-19 restructure)* — the final canonical layout is set;
   `V6_EXTRACTED_SECTIONS` reparceled + deleted; the content-merges (ROADMAP, ENGINEERING_RULES, CHANGELOG)
   are live (§1). `DESIGN_DOC_PATCHES.md` is archived as a historical record (`archive/plans/`).

## 5. Owed documents (all now live)

*(All previously-owed canonical docs are now live — see §1.)*

## 6. Revision propagation — when a change lands, what changes with it

*The companion to §2: §2 says where NEW content goes; this says, when you CHANGE something, which docs must
move with it. Lightweight by design — a solo-dev tool to prevent dropped updates, not a governance layer.*

### Tier 1 — Categorical rules (predictable change-types → fixed doc sets)

When you make a change of this type, update these docs together:

| Change type | Update together |
|---|---|
| A shipped mechanic's behavior changed | `DESIGN_DOC_V6.md` (current behavior) + append `DECISIONS_LOG.md` (the decision) + check `ROADMAP.md` (is a deferred-design note now resolved? strike it) |
| A deferred feature SHIPS | rewrite its current-state in `DESIGN_DOC_V6.md` / `ARCHITECTURE.md` ("planned" → "implemented") + append `DECISIONS_LOG.md` + **strike it from `ROADMAP.md`** (where the deferred-design spec lives) |
| You DEFER something new (decide-not-now) | add a `ROADMAP.md` entry (the spec + F5.x pointer) + keep V6 stating only current behavior |
| A code structure / hook / boundary changed | `ARCHITECTURE.md` (the structural fact) + append `DECISIONS_LOG.md` if it was a decision |
| A new code-cleanup task surfaced | `CODEBASE_CLEANUP.md` (only) |
| A new operational rule / gotcha learned | `ENGINEERING_RULES.md` (canonical) + a one-line summary in `CLAUDE.md` if load-bearing at session start |
| A decision got made (any kind) | `DECISIONS_LOG.md` (append; never fork a parallel log) |
| A new task / scope for Phases 5-7 | `ROADMAP.md` |

*Worked example — a deferred feature ships (legendary/spirit decoupling, Candidate I): rewrite
`ARCHITECTURE.md` §6.2's current-state, append `DECISIONS_LOG.md`, strike it from `ROADMAP.md` (where its
spec lives), and append the `[architecture]` diff to `CHANGELOG.md` — coordinated doc updates.*

**Reference-doc changes also append to `CHANGELOG.md`.** Any edit to a canonical reference doc —
`DESIGN_DOC_V6.md` `[design]`, `ARCHITECTURE.md` `[architecture]`, `ENGINEERING_RULES.md` `[engineering]` —
additionally appends a **tagged one-line diff** to `CHANGELOG.md` (the cheap, greppable change-index)
alongside the `DECISIONS_LOG.md` rationale. So the V6 / ARCHITECTURE / ENGINEERING rows above each carry an
implicit `+ append CHANGELOG.md ([tag])`: CHANGELOG is the diff-index, DECISIONS_LOG the full record.

### Tier 2 — The grep-sweep (the catch-all for everything Tier 1 doesn't cover)

**After any non-trivial change, grep the canonical doc set for the term / symbol you changed, and reconcile
every hit.** This is the generalized form of the "fix one contradiction, sweep for the rest" discipline that
caught the five stale `3×` references during the V6 reconciliation. The set to sweep: `DESIGN_DOC_V6`,
`ARCHITECTURE`, `DESIGN_DEFERRED`, `CODEBASE_CLEANUP`, `ENGINEERING_RULES`, `ROADMAP`, `DECISIONS_LOG`. The
sweep *finds* the affected docs — you don't need to know them in advance.

### Tier 3 — Boundary tests (the judgment cases)

When a change's information spans a doc boundary, apply the test rather than pre-deciding every case:
- **Structure-vs-behavior** (the V6 ↔ ARCHITECTURE boundary): what-it-does / behavioral → `DESIGN_DOC_V6.md`;
  how-it's-built / structural → `ARCHITECTURE.md`. *(Worked example: the DP-03 C-split — behavioral prose →
  V6, the per-element mechanism → ARCHITECTURE.)*
- **Rule-vs-record** — applies at two levels. *Content:* a reusable forward rule → `ENGINEERING_RULES.md`;
  a one-time decision + its rationale → `DECISIONS_LOG.md`. *Doc lifecycle:* a doc stays in the **live set**
  (`docs/` root + `docs/reference/` + `docs/process/`) only while upcoming work needs to consult it (a rule,
  plan, or live reference); when it becomes a *record* of how completed work went it moves to
  `docs/archive/…` at close-out (with a CLOSED/relocated header) — keeping the live set lean.
  This `DOC_MAP.md` now indexes which docs are which — the role the former `PHASE4_STATE.md` §7 manifest held (PHASE4_STATE archived at Gate-0 close). *(Doc-lifecycle test migrated from the former
  INFRASTRUCTURE_DECISIONS.)*

**Lightweight by design.** Tier 1 covers the common cases, Tier 2 is the cheap catch-all, Tier 3 is
judgment. Deliberately NO formal doc-dependency graph and NO automated triggers — the overhead would exceed
the sprawl it prevents.

## 7. Audit scope (Gate 0)

**Gate-0 (Audit 2) — CLOSED 2026-06-20.** It read: all `src/` code + the canonical `docs/` root +
`docs/reference/` + `docs/DECISIONS_LOG.md` + `PHASE4_STATE.md` (then in `docs/process/`, now archived to
`docs/archive/phase4/`). It EXCLUDED `docs/archive/` (historical) and `docs/prompts/` (campaign briefs — the
preserved record of *why* changes were made, not canonical). Findings: `docs/process/GATE_0_FINDINGS.md`;
closure: `DECISIONS_LOG.md` D-GATE0-CLOSE (V6 + ARCHITECTURE are now the verified baseline).

*This map is itself governed by rule §2's spirit: if a new concern appears that has no home here, decide its
canonical doc and add a row — don't let it land in whatever file is open.*
