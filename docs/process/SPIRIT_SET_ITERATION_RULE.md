# Spirit-set iteration rule — which set to iterate, and why

**Status:** Authoritative rule. Created 2026-06-06 as the resolution of the Candidate F bug class
(see `F4.20_candidate_F_audit_findings.md`). Confirmed by the spirit-set getter recon (verdict A:
the three-way getter distinction is principled, not accidental). `CLAUDE.md` carries a compact
pointer to this doc.

This rule prevents the recurring "wrong spirit-set" bug class: the Osprey/Catcher reset bug,
F2.4 item 10, the F4.20-FIX accumulator cluster, and the six misrouted effect sites this rule's
fix campaign addresses (Glory, golden_toad, caterpillar, ducks ×2, mirror/memory ctx).

---

## Two orthogonal facts govern every spirit-set choice

### 1. Transcendence frees a SLOT, nothing else
A transcended (Negative) spirit behaves EXACTLY like a regular spirit/stack for all effect,
scoring, and targeting purposes — same firing, same effects, same placement in the chain (it can be
rearranged, moved, and is a valid adjacency target and targeter). The ONLY thing transcendence
changes is that it no longer consumes a spirit slot. **Slotlessness is about CAPACITY, not
PLACEMENT.**

The negative-state machinery (`preTranscendTotal` / `newEvents` / the `NEGATIVE_SNAPSHOT` functions)
exists ONLY to collapse a multi-member stack into one coherent post-transcendence entity that keeps
accruing at a powerLevel-scaled rate (the locked F2.5 design). It does NOT make Negatives a lesser
or restricted class.

⇒ **No effect / scoring / targeting path may exclude a Negative.** A path that does is a bug.

### 2. Legendaries are a SEPARATE CATEGORY — not chain members
Legendaries are foundation-influencing, have their own UI slot/capacity, do NOT sit in the spirit
chain, and do NOT stack or transcend (there is no Negative legendary). They MAY have effects that
influence spirits, and they DO contribute to scoring — but they do NOT participate in the
spirit-chain event lifecycle (`onBank` / `onRoundEnd` / `onFieldDiscard` / `onCardPlayed` / etc.).

⇒ Event-hook dispatchers iterating the chain (which excludes legendaries) is CORRECT BY DESIGN, not
an oversight. If a legendary needs to react to a game event, that is a foundation/hook-layer
mechanism, NOT a spirit-chain event hook. (`_legendarySpirits` is a separate array from
`_allSpirits`, which is why `allSpirits` omits legendaries — this is the structural expression of
"legendaries aren't chain members.")

---

## Which getter to use, by the KIND of question

| Kind of question | Getter | Contents | Why |
|---|---|---|---|
| **Effect / event-hook firing** (chain lifecycle) | `allSpirits` | regulars + Negatives, NO legendaries | The spirit chain. Negatives are chain members (include); legendaries aren't (exclude, by design). All `_fire*Hooks` use this. |
| **Scoring contribution** | `scoringSpirits` | regulars + Negatives + legendaries | Legendaries score even though they're not chain members. The Phase-1/Phase-2 scoring loops use this. |
| **Adjacency / placement targeting** (Mirror's left neighbour; Memory's rightmost non-self) | the chain in TRUE PLACEMENT ORDER | regulars + Negatives, real left-to-right order | Negatives are valid targets AND targeters. ⚠ **Do NOT use `scoringSpirits`** — it REGROUPS (regulars→Negatives→legendaries) and scrambles adjacency. **PENDING VERIFICATION:** the exact getter (likely `allSpirits`) must be confirmed to match on-screen chain order before use — see the mirror/memory fix recon. |
| **Slot / capacity** ("slots used / can I add one?") | `spirits` / `!isNegative` filter | regulars only | The ONE place excluding Negatives is correct — they don't take slots. `canAddSpirit` is the reference. |
| **Structural presence of a legendary/capstone** ("is gankyil / a capstone present?") | `activeSpirits` acceptable | regulars + legendaries, no Negatives | Those entities can't be Negative anyway, so the exclusion is harmless here. |

**Heuristic for call sites:** if you're iterating spirits to FIRE, SCORE, or TARGET and you reach
for `activeSpirits`, stop — you almost certainly want `allSpirits` (chain) or `scoringSpirits`
(scoring incl. legendaries). `activeSpirits` is for structural-presence and slot questions only.

---

## scoringSpirits vs allSpirits — NOT redundant
They differ on three axes and neither is removable:
- **Legendaries:** `scoringSpirits` includes them; `allSpirits` does not.
- **Zero-stack ghosts:** `scoringSpirits`'s `spirits` term filters `stackCount>0`; `allSpirits` is
  raw `_allSpirits` (includes ghosts).
- **Ordering:** `allSpirits` preserves raw insertion interleave; `scoringSpirits` groups
  regulars→Negatives→legendaries.

`scoringSpirits` = "everything that contributes to a score, grouped, incl. legendaries."
`allSpirits` = "the raw chain roster incl. Negatives/ghosts, no legendaries" — what the counter /
event dispatchers want.

---

## Naming caveat (Candidate C)
The getters are currently named by MEMBERSHIP, not INTENT — which is precisely why the call-site
choice has been guessable-and-wrong. `activeSpirits` reads like "the spirits that are active/working,"
but transcended spirits ARE active; they just don't hold a slot. A pending consolidation
(Candidate C) renames these by intent so the right choice is obvious at the call site. Until then,
this rule is the reference.
