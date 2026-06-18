# DOC_MAP — where everything lives (and where new things go)
*The canonical index of Hanatu's documentation. One concern → one source of truth. If you're unsure where
something belongs, this file decides. Last set: 2026-06-16 (post-V6, entering the rubric-seam → Gate-0
stretch).*

> **Why this file exists.** As Phases 0-4 closed, docs accumulated and a few drifted into overlap (e.g. a
> patch ledger that ended up with three stacked sub-ledgers). This map prevents that: every concern has
> exactly one canonical home, and the routing rules below say where new content goes so it never lands in
> two places. When in doubt, route per this file rather than appending wherever is handy.

---

## 1. Sources of truth (canonical, living)

| Concern | Canonical doc | What it owns | Notes |
|---|---|---|---|
| **Game design** | `docs/DESIGN_DOC_V6.md` | Current, shipped design: mechanics, spirits, consumables, scoring, economy. Describes what the code DOES. | The Gate-0 audit rubric. Reconciled to code (campaigns 3b/3c). Does NOT carry forward-looking notes (those → DESIGN_DEFERRED). |
| **Architecture / structure** | `docs/process/ARCHITECTURE.md` | Code organization, the hook/helper reference, "build with existing primitives" patterns, the per-element accumulator *mechanism*, system boundaries. | **Live** (committed 2026-06-17). The second Gate-0 rubric. DP-61/DP-62 and the DP-03 mechanism point here. |
| **Forward / deferred design** | `docs/DESIGN_DEFERRED.md` | Phase-5+ design intents stripped out of V6 (D1-D10): negative fusion, Earth redesign, Amber rebalance, double-trigram redesign, etc. Seeds a future V7. | Current behavior stays in V6; the *deferral note* lives here. When a Phase-5 item ships, fold its resolved spec into V7 and remove it here. |
| **Code cleanup tasks** | `docs/process/CODEBASE_CLEANUP.md` | Deferred CODE tasks (mostly Phase-6 semantic/naming cleanup + dead-code removal): the `ribbonStamp`→`stamp` rename, dead `applyInterest()`, stale data-strings, etc. | **All future code-cleanup items go here.** Distinct from design deferrals (DESIGN_DEFERRED) and doc reconciliation. |
| **Decisions (the record)** | `docs/process/DECISIONS_LOG.md` | Append-only durable record of every design/architecture/process decision, with rationale. | Carries forward through all phases — keep appending, never fork. The spine of the eventual Phase-0-4 summary. |
| **The forward plan** | `docs/process/ROADMAP.md` | The task plan for Phases 5-7 (design-resolution / feature-building / demo-prep → tuning → polish). | **Live** (committed 2026-06-18). Reconciled against `PHASE_5_6_7_BACKLOG.md`; framing from `POST_AUDIT_DIRECTION.md`. Supersedes OVERHAUL_PLAN as the living task plan. |
| **Workflow / process governance** | `docs/process/INFRASTRUCTURE_DECISIONS.md` | The two-Claude loop, commit discipline, file-based prompts, why-we-work-this-way rationale. | Carries forward. This DOC_MAP is a companion to it (governance of doc placement). |
| **Engineering rules / gotchas** | `docs/process/ENGINEERING_RULES.md` | Hard-won "do it this way" rules: the spirit-set iteration rule, test-harness gotchas, recon-before-edit, verify-by-fresh-clone, the `&&` short-circuit gotcha. | **Live** (committed 2026-06-18). **Indexes** the standalone SPIRIT_SET_ITERATION_RULE + TEST_HARNESS_GOTCHAS (they stay canonical; ENGINEERING_RULES points to them). Consulted *during* work, unlike ARCHITECTURE.md (reference). |
| **Operational entry point** | `CLAUDE.md` (repo root) | The lean "how to work in this repo" entry: points to the docs above; holds only the few top-level operating rules. | **Stays lean** — detailed rules live in ENGINEERING_RULES.md, not here. Bloat-resistance is the rule for this file. |

## 2. Routing rules (where new content goes)

- **A new mechanic shipped / a mechanic's behavior changed** → update `DESIGN_DOC_V6.md` (current behavior) +
  append the decision to `DECISIONS_LOG.md`.
- **A design idea for later (not built)** → `DESIGN_DEFERRED.md`. Never put forward-looking "will become X"
  notes in V6.
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

These are real and still useful, but their job is ending. Do not treat as sources of truth; do not add new
content to them. They resolve at the marked point.

| Doc | Status | Resolves to |
|---|---|---|
| `OVERHAUL_PLAN.md` | Superseded (its forward role) | Historical record; ROADMAP is the living plan. Archive-pending-Gate-0. |
| `DESIGN_DOC_PATCHES.md` | Closed worklist (V6 produced) | Archive-pending-Gate-0. Its three stacked ledgers (3b/3c/addendum) are a closed historical record — do not reopen; collapse-or-archive as part of doc-hygiene. |
| `POST_AUDIT_DIRECTION.md` | Feeder | Folds into `ROADMAP.md` when ROADMAP is assembled. |
| `V6_EXTRACTED_SECTIONS.md` | Staging | Reparcel its contents → DESIGN_DEFERRED (forward items) / CODEBASE_CLEANUP (code tasks) / archive (the V4→V5 changelog), then DELETE. |
| `PHASE4_STATE.md` | Living-but-winding-down | Archive-pending-Gate-0 (into the Phase-0-4 summary). |
| Tier reconciliations, candidates registry, closeout/completion plans | Historical inputs | Archive-pending-Gate-0 (into the Phase-0-4 summary). Still live inputs *to* Gate 0 — do not archive before it. |

> **Campaign briefs → `docs/prompts/`.** The file-based prompts that drive each change live here. They are
> **not canonical** and not a source of truth — they are the preserved *record of why* a change was made.
> **Audit scope excludes `docs/prompts/`** (alongside `docs/archive/`). *(The dir may need recreating — a
> separate task; this records the convention so the home is named.)*

## 4. Two consolidations on the horizon (named here, done later)

1. **Phase-0-4 backward consolidation** *(after Gate 0)* — collapse the archive-pending process docs into a
   single Phase-0-4 summary, retaining `DECISIONS_LOG.md` as the durable spine. Waits until after Gate 0
   because several are still live inputs to it.
2. **Doc-hygiene cluster** *(around Gate 0)* — reparcel + delete `V6_EXTRACTED_SECTIONS.md`; collapse the
   `DESIGN_DOC_PATCHES.md` stacked ledgers. *(`ROADMAP.md` and `ENGINEERING_RULES.md`, formerly part of this
   cluster, are now assembled and live — see §1.)*

## 5. Owed documents (all now live)

*(All previously-owed canonical docs are now live — see §1.)*

## 6. Revision propagation — when a change lands, what changes with it

*The companion to §2: §2 says where NEW content goes; this says, when you CHANGE something, which docs must
move with it. Lightweight by design — a solo-dev tool to prevent dropped updates, not a governance layer.*

### Tier 1 — Categorical rules (predictable change-types → fixed doc sets)

When you make a change of this type, update these docs together:

| Change type | Update together |
|---|---|
| A shipped mechanic's behavior changed | `DESIGN_DOC_V6.md` (current behavior) + append `DECISIONS_LOG.md` (the decision) + check `DESIGN_DEFERRED.md` (is a forward note now resolved? remove it) |
| A deferred feature SHIPS | rewrite its current-state in `DESIGN_DOC_V6.md` / `ARCHITECTURE.md` ("planned" → "implemented") + REMOVE its `DESIGN_DEFERRED.md` entry + append `DECISIONS_LOG.md` + strike it from `ROADMAP.md` |
| You DEFER something new (decide-not-now) | add a `DESIGN_DEFERRED.md` entry (spec + F5.x pointer) + add it to `ROADMAP.md` + keep V6 stating only current behavior |
| A code structure / hook / boundary changed | `ARCHITECTURE.md` (the structural fact) + append `DECISIONS_LOG.md` if it was a decision |
| A new code-cleanup task surfaced | `CODEBASE_CLEANUP.md` (only) |
| A new operational rule / gotcha learned | `ENGINEERING_RULES.md` (canonical) + a one-line summary in `CLAUDE.md` if load-bearing at session start |
| A decision got made (any kind) | `DECISIONS_LOG.md` (append; never fork a parallel log) |
| A new task / scope for Phases 5-7 | `ROADMAP.md` |

*Worked example — a deferred feature ships (legendary/spirit decoupling, Candidate I): rewrite
`ARCHITECTURE.md` §6.2's current-state, REMOVE the `DESIGN_DEFERRED.md` Candidate-I entry, append
`DECISIONS_LOG.md`, and strike it from `ROADMAP.md` — one change, four coordinated doc updates.*

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
- **Rule-vs-record** (the ENGINEERING_RULES ↔ DECISIONS_LOG / INFRASTRUCTURE boundary): a reusable forward
  rule → `ENGINEERING_RULES.md`; the one-time decision + its rationale → `DECISIONS_LOG.md` /
  `INFRASTRUCTURE_DECISIONS.md`.

**Lightweight by design.** Tier 1 covers the common cases, Tier 2 is the cheap catch-all, Tier 3 is
judgment. Deliberately NO formal doc-dependency graph and NO automated triggers — the overhead would exceed
the sprawl it prevents.

*This map is itself governed by rule §2's spirit: if a new concern appears that has no home here, decide its
canonical doc and add a row — don't let it land in whatever file is open.*
