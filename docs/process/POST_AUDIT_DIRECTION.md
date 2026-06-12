# Post-Audit Direction — Audit 2 + the Phase-5 reframe

> **Forward-declaration, not a plan.** Records two intentions set 2026-06-11 (late Phase 4) so they
> aren't lost: the closing re-audit ("Audit 2") and the reframe of Phase 5 as a post-audit phase.
> Detail is deferred to when each is reached — over-speccing now would document a state that will
> churn (cf. the F4.24b late-write ruling). This doc declares WHAT and WHY; the HOW is filled in later.

## 1. Audit 2 — the closing re-audit (Phase-4 close / 4→5 seam)

**What.** Re-run the original full-codebase audit process — the diagnostic sweep that produced the
audit slices (1–7), the ~75 critical findings / ~50 drift items, and ultimately the Overhaul Plan and
Phases 0–5 — but against the *finished* overhaul.

**Dual purpose (this is what makes it more than a re-run):**
- **Fresh net** — surface anything the overhaul missed or newly introduced (bug-fixing, architecture,
  and reorganization all touched a lot of surface; a clean sweep catches regressions and gaps).
- **Quality evaluation of the overhaul** — measure the result against the *original* audit's findings.
  Did the five recurring patterns get resolved? Did the consolidation thesis hold? The DECISIONS_LOG
  records what each block set out to do and shipped — that's the before/after baseline to evaluate
  against.

**Dependencies (why it's a Phase-4-close artifact, not earlier):** needs (a) the stabilized codebase
(all Tier-2/3/4 work done), (b) **Design Doc V6** (the revised design source of truth), and (c)
**F4.24b** (the terminal `ARCHITECTURE.md`) — an auditor with the prescriptive architecture map can
check code *against its own stated intent*, which the first audit had no baseline for. These three are
the gateposts; Audit 2 runs once they're in place.

**Open forks (decide when reached, not now):**
- **Who runs it** — intended: Fable 5 (a different model = fresh eyes, less anchored on decisions this
  overhaul made). To confirm at the time.
- **Blind vs informed** — a *blind* sweep (no DECISIONS_LOG loaded first) is a better fresh-net; an
  *informed* sweep (full history) is a better quality-evaluation. May want both: blind sweep, then
  informed comparison against intent. Decide at the time.

**Output shape (sketch):** not just a new problem list — a verdict on whether the overhaul achieved its
thesis, plus whatever fresh findings warrant a Phase-5-or-later worklist. Mirrors the original audit's
slice/finding structure so the before/after is legible.

## 2. Phase 5 — reframed as post-audit, design-heavy

**The reframe.** The overhaul arc (audit → fix → architect → reorganize → re-audit) COMPLETES at Audit
2. Phase 5 is NOT a continuation of that arc — it's a distinct phase with a different disposition:
the overhaul was *reactive/convergent* (find what's wrong, reduce entanglement); Phase 5 is
*generative/divergent* (resolve open questions, build what doesn't exist, prepare for polish).

**Implied sub-streams (to be fleshed out when Phase 5 begins — NOT specced here):**
- **Design-resolution** — the banked design rulings (e.g. F4.26 powerLevel, F4.38(a) Wu Xing timing,
  velocity magnitude, F5.0 merge-vs-separate, F5.8 Earth redesign) and the Tier-5 grouping-5 items.
- **Feature-building** — net-new features not yet implemented (e.g. speculative cards behind art-gating,
  net-new candidate-set work).
- **Demo-prep** — preparing the game to receive artwork, sound, animation, polish; the run-up to a
  playable demo. (Barely represented in current docs — a Phase-5 planning task in itself.)

**Consequence for current docs:** the existing "Phase-5 banked set" is two+ different kinds of work
under one label (design-resolution vs feature-building vs demo-prep). When Phase 5 is scoped, split the
banked pile into these sub-streams rather than treating it as one undifferentiated backlog.

## Status
Forward-declaration only. Audit 2 is gated on Phase-4 close + V6 + F4.24b. The Phase-5 sub-stream
structure is fleshed out when Phase 5 begins. Neither is actioned by this doc.
