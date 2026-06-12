# Phase-4 Completion Plan — the 6-step sequence + the design-rulings→V6 dependency

> **Durable plan (set 2026-06-12, Robert).** Records the sequence for finishing Phase 4 and the one
> dependency that governs it. **Supersedes the looser "near-term / Tier-4 / banked" framing in
> PHASE4_STATE §3** — per-step detail is scoped when each step is reached (not over-specced here, cf.
> the F4.24b late-write ruling).

## The dependency this plan exists to pin

Several grouping-4/5/6 items (F4.26 powerLevel A/B, F4.33 Festival cap, F4.38(a) Wu Xing timing, the
F4.32 Silk open questions) are **resolutions of open questions about EXISTING mechanics** — not Phase-5
generative design. Their resolutions change what the design doc should say. So they must land BEFORE the
Design Doc V6 reconciliation, or V6 documents mechanics whose definitions are still open (the same
"don't document against a state that'll churn" discipline as the F4.24b late-write ruling, applied to
the design doc).

**The clean dependency chain the plan enforces:**
design rulings (step 3) → resolve open mechanics → `DESIGN_DOC_PATCHES.md` worklist → Design Doc V6
(step 6) → `ARCHITECTURE.md` / F4.24b (step 6) → Audit 2 (the Phase-5 boundary).
Every doc is written against a settled state.

## The 6-step sequence

1. **Groupings 1+2+3 — the near-term hygiene set** (~2h, mostly pure-subtraction/doc). Dead-code cut
   (gate: save/load-intent ruling on the zero-caller methods), comment sweep, the two tiny
   remove-or-document decisions. Recon-first, then scope the cut/sweep campaign(s). **← CURRENT.**
2. **Tier 4 — UI/UX cleanup.** F4.35 scene-unification, F4.37/F4.36 (tooltip recomb + declarative read),
   F3.16 (scoring log). Currently a headline, not a task list — step 2 opens with Tier-4 *scoping*
   (a recon + breakdown) before execution. UI surface settled before the 4/5/6 rulings (some have
   UI-visible consequences cleaner to reason about post-UI-work).
3. **Groupings 4/5/6 — their own process** (heavier; needs real recon, not the light confirm 1/2/3
   need). Splits into two sub-streams:
   - **(a) design-rulings deliberation** — grouping 5 + F4.26 / F4.33-Part1 / F4.38(a) / **F4.32**. Feeds
     `DESIGN_DOC_PATCHES.md` / V6; run FIRST since it feeds the doc and may inform the refactors.
     **This rulings half is the V6 gate.**
   - **(b) code refactors** — F4.25 (formula dedup), F4.21 (spirit-ID normalization), F4.28 (stacking
     audit). Execution stream, after the rulings. (F4.29 bypass sweep stays optional/banked — low payoff.)
4. **Any remaining Phase-4 work** — whatever steps 1-3 surface or defer, plus stragglers.
5. **Phase-4 close-out + Phase-5 restructuring/planning** — close Phase 4; flesh out the Phase-5
   sub-stream structure (design-resolution / feature-building / demo-prep) per `POST_AUDIT_DIRECTION.md`.
6. **Design Doc V6 + `ARCHITECTURE.md` (F4.24b)** — written LAST, against the now-settled mechanics
   (rulings from step 3 folded in) and stabilized code. These are the gateposts to **Audit 2** (the
   closing re-audit, per `POST_AUDIT_DIRECTION.md`).

## F4.32 correction (stale registry disposition)

`tier5_reconciliation.md` dispositions **F4.32** (Silk anti-stranding scope) as "near-moot,
confirm-and-document, ~0.25-0.5h" — **that sizing is now stale.** F4.32 had numerous Silk implementation
issues AND open *design* questions, so it is NOT a cheap doc fix: it belongs with the grouping-4/5/6
design-rulings stream (**step 3a**), not the step-1 hygiene sweep. When step 3 reaches it, F4.32's recon
must treat the scope/design question as genuinely OPEN, not a foregone confirm. (This is exactly why all
of 4/5/6 stays intact as one process rather than cherry-picking "cheap" items forward — the registry's
sizing can't be trusted for items with design history.)

## Status
Plan + dependency + the F4.32 correction. **Step 1 (groupings 1+2+3 hygiene) is the current work**, and
opens with its own read-only recon. Per-step detail is scoped when each step is reached; nothing beyond
step 1 is actioned by this doc.
