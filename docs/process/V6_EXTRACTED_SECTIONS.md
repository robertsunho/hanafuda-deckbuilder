# V6 Extracted Sections (§17 + §18) — staging

**Extracted from `DESIGN_DOC_V6.md` on 2026-06-15** (Campaign 3c, Group V). These are the former **§17 (Open Design Questions)** and **§18 (Decisions Log)**, cut verbatim. Awaiting reparceling to `DESIGN_DEFERRED.md` / `process/CODEBASE_CLEANUP.md` / archive — do NOT treat as canonical. (Reparceling is a separate later step.)

---

## 17. Open Design Questions

This section consolidates open questions, TBD items, and design decisions awaiting playtesting or further consideration. These are scattered through the document; this section provides a single navigable list.

Open questions are organized by impact area. Each entry notes the relevant section for full context.

### 17.1 Balance & Tuning (Pending Playtesting)

These items have working implementations but their numerical values are subject to revision through playtesting.

**Threshold curve.** The exact yaku threshold growth curve across 36 rounds is TBD. Design intent is for Act 1 (R1-6) to be approachable for naked play (no spirits), with progressively higher thresholds requiring deeper investment by Act 3+. (Section 6.1, 6.5)

**Ki economy ranges.** Run-wide ki trajectory (early 0–80, mid 100–500, late 200–1500+) is illustrative. Costs and rewards across the entire economy are subject to balance passes. (Section 11.4, 11.6, 15.8)

**Pricing across all systems.** Most current costs (spirits, consumables, alchemicals, stamps, speculative cards, reroll) are placeholder values. Many are uniform (Chakra Tools all 4 ki, Wu Xing all 5 ki) for development simplicity but may differentiate during balance pass. (Section 11.4, 15.8)

**Sacred Grove offerings count.** Currently 4 per quadrant; planned reduction to 3 during balance pass. (Section 12.2)

**Reroll cost escalation rate.** Base 3 ki, escalates per reroll, but the exact escalation curve is open. (Section 12.5)

### 17.2 Mechanical Design Questions

These require explicit design decisions before final implementation.

**Black Stamp split-vs-full bonuses.** Should Black Stamp fire all three bonuses (draw + consumable + ki) on every trigger event (captured/discarded/yaku), or split bonuses by trigger type (e.g., draw on capture, consumable on discard, ki on yaku)? The full-bonus model is simpler but potentially too powerful. The split model creates more interesting trigger-dependent strategy. (Section 8.4.5)

**Push failure base ki forfeiture.** Should the base 5 ki round-end reward also be forfeited on push failure (in addition to the hand-derived ki), increasing punishment for failed pushes? (Section 11.1)

**Spirit acquisition stacking rules.** Stacking is a core mechanism but the rules for obtaining additional copies need refinement. Open questions:
- Should shops weight non-owned spirits more heavily?
- Should owning a Tier 1 spirit increase or decrease the chance of seeing Tier 2 fusion ingredients?
- Should there be a per-shop visibility limit on already-owned spirits to encourage diversity? (Section 12.3)

**Showman-like duplicate filtering.** Currently already-owned non-Legendary spirits CAN reappear in shop offerings (intentional, since stacking matters). Open question whether to add a Balatro-style "Showman" mechanism — reduce duplicate appearances when a spirit is at 3 stacks, with an optional consumable/spirit that re-enables duplicates. Creates strategic tension around stacking commitment. (Section 12.3)

**Spirit stacking as player choice.** Currently identical spirits auto-stack on acquisition. Decoupling that — making stacking a deliberate drag-and-drop action — would create richer strategic decisions but requires UI work. (Section 7.2)

**Ingot economy spirit redesign.** Current formula (+0.01% per ki held) produces fractional values that truncate at low ki balances, making the spirit nearly useless early-run. Possible redesigns: flat +1% per stack baseline + scaling tail; higher per-ki coefficient; different mechanic entirely. (Section 11.5)

**Fire card identity.** Fire-enhanced cards (Ember/Charcoal) are currently exempt from per-card spirit scoring because they have "no identity" (count as all 4 yaku). Question: does exempting them from spirits reduce their value too much given the new stamp/edition system and additive Fire points? Options: keep as-is, preserve full identity, preserve axes only, wild rank only. Decision trigger: playtest Fire-heavy builds and measure if Fire feels underpowered. (Section 8.2.2)

**Compound stacking balance.** The capture-wide mult pool allows compound stacks (e.g., 3 Ghost cards = ×1.5³ = ×3.375; White-stamped bright under boost_brights = ×2.0² = ×4.0; Shine + boost_brights + Ghost stack producing very high multipliers). Open question whether compound stacks feel rewarding (Balatro-style joy) or broken (trivializing runs). Decision trigger: playtest runs with intentional stacking; tune individual multipliers if runs trivialize. (Section 5.1, 5.7)

**Earth interest + boost_fire/boost_earth interaction.** Earth interest is `run.ki × rate × clayCount` at round end. Boost_earth increases Clay/Pottery's held mult AND the interest rate. Boost_fire reduces Earth interest. Question: at high ki pools, does boost_earth compound Earth interest into overpowered ki generation? (Section 8.2.2, 9.3.7, 11.2)

**animal_deck / ribbon_deck replacement priority.** `animal_deck` (hex_17 Suí) replaces highest-rank non-animal in each month with a duplicate animal — currently this removes ALL 5 brights from the deck. Question whether this is intended or should spare brights:
- Option A (current): Replace highest-rank non-animal → removes brights (dramatic transformation)
- Option B: Replace lowest-rank non-animal → preserves brights (less transformative)
- Option C: Only replace in months without a base animal → minimal change
The same question applies to `ribbon_deck` (hex_31 Xián) which removes both brights and animals. (Section 9.3.12)

**transcendCard mutation reset.** `transcendCard()` clears all keys on a card and copies from a target card. This means persistent mutations (Irrigation's bonus points, future card-mutation spirits) RESET when a card is path-converted. Question: is this the intended behavior, or should mutations persist through transcendCard? Decision trigger: playtest. If players feel "robbed" by losing mutation bonuses on path-conversion, refactor `transcendCard` to preserve the `mutations` field. (Section 2.9, 7.6.4)

**Fusion recipes (T2/T3).** Specific fusion recipes (which Tier 1 pairs produce which Tier 2 fusions; which Tier 2 pairs produce which Tier 3 cross-fusions) are partially designed but specific recipes remain TBD. (Section 7.12, 7.13)

**Hexagram acquisition for first run.** Currently the first run uses `hex_02` (Kūn / Receptive Earth, no-effect). After that, hexagrams are obtained through coin-throw divination. Specific divination mechanic is implemented but the broader question of how hexagrams are unlocked over time (e.g., are all 64 always rollable, or is unlock progressive?) — current implementation: all 64 always rollable, but selection from Hexagram Collection requires having beaten that hexagram. Confirmed design intent. (Section 9.1.1, 13.4)

### 17.3 Terminology & Naming

These items have working systems but need terminology or naming refinement.

**"Negative" spirit terminology.** The term "Negative" for transcended spirit copies is a working label but the design eventually wants better terminology. Considerations: cultural fit, tonal appropriateness, semantic clarity. (Section 7.2)

**"Three Marks" terminology.** Used for persistent card mutations (Demon, etc.). Stale terminology that should eventually be replaced with relevant new terms. (Section 2.9, 16.3)

**Style combo system development.** The current 12 combos are stable but not the final roster. Many additional style combos will be added; some current combos may be revised. (Section 5.6)

**May/September animal naming.** Card IDs (`may_bridge`, `september_sake`) are legacy from earlier design. Design canonical names are "Iris Dragonfly" and "Chrysanthemum Fireflies" but the codebase displays "Iris Fireflies" and "Chrysanthemum Cricket." IDs will likely stay; display names need updating. (Section 2.10, 7.4)

### 17.4 UI/UX Design

These UI elements are conceptually planned but lack design or implementation.

**Blessings acquisition UI at Sacred Grove.** Blessings are intended to be acquired exclusively at Sacred Grove with ki costs. Selection UI not yet designed or implemented. Forced choice between Blessing investment and other Sacred Grove offerings (spirits, fusions, alchemicals) is intentional. (Section 10.5, 12.8)

**Off-screen Blessings panel.** A button-accessible panel showing currently owned Blessings (so GameScene info cluster doesn't get cluttered). Not yet designed. (Section 10, 13.14)

**Hexagram detail visualization.** Some hexagrams need richer player communication — e.g., showing the boost-and-debuff pattern visually with up/down arrows on affected cards. Not yet designed. (Section 13.14)

**Spirit chain reorder visual feedback.** Stronger visual cues for which scoring phase a spirit is in (additive, multiplicative, engine), to communicate why order matters. (Section 13.14)

**Stamp tier visual indicator.** The four-tier stamp system could benefit from a small tier indicator on the stamp icon itself. (Section 13.14)

**Negative spirit visual differentiation.** Negatives should appear visually distinct from regular spirits in the UI but specific styling is TBD. Currently styled with purple borders and `bgCol = 0x1a0d2a`. Future UI iterations may explore a separate panel, more pronounced interleaving differentiation, or hybrid approaches. Tied to spirit stacking choice. (Section 7.2)

**Hand size label.** UI element next to the hand showing current card count over max (e.g., "5/8" or "5/9" with hexagram active). With silent skip-on-cap behavior shipped, players need a way to see why draws are being skipped. Should respect `modifyHandSize` hook for hexagram modifications.

**Mult display rounding precision.** The scoring animation side panel uses `toFixed(1)` which rounds values like 0.75 → "0.8" and 0.25 → "0.3". For debuff hexagrams compounding to values like 0.75, the displayed math looks slightly off even though the backing calculation is correct. Consider `toFixed(2)` or smart rounding that only adds the second decimal when needed.

**Field slot layout polish for non-default counts.** Dynamic layout algorithm preserves the 8-slot default well, but non-8 layouts (7-slot, 9-slot) could use visual tuning. Potential tweaks: adjust 2-slot `halfGap`, adjust 4-slot `INNER_MARGIN`, asymmetry smoothing for odd counts.

**Divination Scene description occlusion.** The hexagram reveal screen displays the hexagram frame (lines) and the effect description text, but the description is visually blocked by the hexagram itself. Needs layout rework — move the description below the hexagram, shrink/reposition during reveal, or use a dedicated description panel.

**Dev hexagram picker ordering.** Hexagrams in the dev picker currently appear in random order. Sort by hexagram number (1-64, matches I Ching sequence) or by category (double_trigram, axis_individual, etc.). Numerical is simpler; categorical groups related effects for testing. (Dev Mode is dev-only; will be gated entirely before public release per Section 13.2.)

**Animation polish for spirit fan transitions.** Smooth transitions between fan positions on drag — currently snaps. Tied to Fan UI v2 deferrals.

**Mobile/touch interaction patterns.** Current UX assumes desktop with mouse hover and click. Mobile/touch adaptation deferred.

### 17.5 Future Features

These are conceptual additions awaiting design and implementation.

**Endless mode.** Continue rounds beyond R36 with continually increasing thresholds. Shop cadence pattern (Sacred Grove every 3 rounds, Wayside between) will repeat indefinitely. (Section 6.3, 12.1)

**Booster pack mechanics.** Considered for some consumables (e.g., Wu Xing element distribution) but not yet designed. Candidate post-playtest enhancement. (Section 8.2)

**Run history / statistics.** No mid-run save; runs are single-session. Future enhancement: aggregate run statistics, leaderboard, etc. (Section 16.13)

**Structured logging output.** Current logger is plain-text; JSON output, replay reconstruction, structured indexes are exploratory enhancements. (Section 14.7)

### 17.6 Visualization & Display Verification Items

These are bugs or potential bugs in animation/visualization that need verification during testing. They differ from Section 17.4 (UI design) in that the underlying logic is correct but the display may not match.

**Balanced scoring animation accuracy (hex_61).** Hexagram 61 (Zhōng Fú) replaces `points × mult × flow` with `((points + mult) / 2)² × flow`. Question: does the score animation correctly show the final score for balanced_scoring, or does it try to reconstruct the old formula? Verify the animation displays the correct final value when testing this hexagram. If wrong, wire animation to use stored `captureScore` value rather than recomputing. (Section 9.3.14)

**Retrigger + hexagram visualization.** White/Gray stamp retriggers occur in a separate code path from the main capture animation. Hexagram contribution animations (e.g., a white-stamped bright with boost_brights triggering ×2.0 twice) may not display correctly in retrigger animations. Test under boost_brights with white-stamped brights once both systems are integrated. (Section 8.4.5, 9.3.6)

### 17.7 Code-vs-Design Discrepancies

Items where the codebase doesn't match design intent and needs fixing. These are NOT open design questions — design is decided; code needs updating. Comprehensive entries with code line references are tracked in `DEFERRED_CLEANUP_ITEMS.md`. The summary below provides quick navigation.

#### 17.7.1 Stamps System
- **White/Gray retrigger semantics** are partial: only fire on capture trigger, don't re-roll jackpot/break/depreciation. Should fire on any trigger and re-roll randomness per retrigger. (DEFERRED_CLEANUP_ITEMS.md → "White/Gray stamps not fully generic")
- **Black stamp trigger semantics** are partial: only fires on capture. Should fire on captured/discarded/yaku. (DEFERRED_CLEANUP_ITEMS.md → "Black stamp not generic")
- **Stamp tier system** uses 3 tiers in code; design intent is 4 tiers with Gray as quaternary. (DEFERRED_CLEANUP_ITEMS.md → "Stamp tier system uses 3 tiers")
- **`card.ribbonStamp` legacy property** still in active use; should be `card.stamp`. (DEFERRED_CLEANUP_ITEMS.md → "card.ribbonStamp legacy property")

#### 17.7.2 Spirits System
- **Amber 3-stack restriction** blocks 1-stack and 2-stack inputs; design intent is any stacked spirit (1× / 2× / 3× variants). (DEFERRED_CLEANUP_ITEMS.md → "Amber alchemical restricted to 3-stack only")
- **Demoted rare ID prefixes** use `legend_*`; should be `rare_*`. (DEFERRED_CLEANUP_ITEMS.md → "Demoted rare spirit IDs")
- **"Coming soon" descriptions** on functional spirits (Replica, Print, Collector, Echo). (DEFERRED_CLEANUP_ITEMS.md → "Coming Soon Description Fields")

#### 17.7.3 Economy System
- **Piggybank, Grace, Bonds hard caps** in code (×4, ×4, +25%). Design intent: no hard caps; soft-capped by slot/stack economy. (DEFERRED_CLEANUP_ITEMS.md → "Piggybank, Grace, and Bonds hard caps")
- **Ingot fractional truncation** at low ki balances. Spirit needs redesign. (DEFERRED_CLEANUP_ITEMS.md → "Ingot spirit fractional ki truncation"; also Section 17.2)

#### 17.7.4 Hexagrams System
- **Tropic/Arctic month ranges** in code use 4-month exclusionary sets; should be 6-month half-years. (DEFERRED_CLEANUP_ITEMS.md → "Tropic/Arctic month ranges")
- **Hexagram description text** has multiple discrepancies vs. actual implementation (axis hexagrams describe by month not axis; boost hexagrams omit debuffs; volatile/stable_flow descriptions wrong; four_spirits_fire_twice references Fire enhancement; balanced_scoring claims spirits removed; rank hexagrams omit threshold modification; Wu Xing cycle hexagrams oversimplify). (DEFERRED_CLEANUP_ITEMS.md → "Hexagram Description Discrepancies")

#### 17.7.5 Consumables System
- **Legacy `consumable_*` entries** (consumable_horse, consumable_dog, consumable_pig, consumable_rooster) superseded by zodiac equivalents but still in code. (DEFERRED_CLEANUP_ITEMS.md → "Legacy consumable_* entries")
- **`_dogProtection` flag naming** is misleading — actually corresponds to Rabbit's effect, not Dog's. Should be `_pushPenaltySuppression`. (DEFERRED_CLEANUP_ITEMS.md → "_dogProtection flag")

#### 17.7.6 Card-Targeting System Naming
- **`_markMode` and related identifiers** were named for the deprecated Three Marks system. Card-targeting infrastructure is now used by Wu Xing elements and Chakra Tools. Identifiers requiring rename: `_markMode` → `_cardTargetMode`, `_activateMark()` → `_activateCardTarget()`, `_onMarkCardSelected()` → `_onCardTargetSelected()`, `_showBoosterPack(markDef)` → `_showBoosterPack(consumableDef)`. (DEFERRED_CLEANUP_ITEMS.md needs new entry — see below)

#### 17.7.7 Card Data Cleanup
- **`december_plain_3` deprecated entry** in cards.js, replaced by `december_ribbon`. (DEFERRED_CLEANUP_ITEMS.md → "december_plain_3 deprecated entry")
- **May/September animal naming** (Iris Fireflies should be Iris Dragonfly; Chrysanthemum Cricket should be Chrysanthemum Fireflies). (DEFERRED_CLEANUP_ITEMS.md → "May/September animal naming legacy")

#### 17.7.8 Architectural Cleanup (Lower Priority)
- **`calculateFinalScore()` vestigial method** in ScoringEngine. Output discarded by all callers; only retained for metal proc side effect. Two parallel scoring paths (per-capture accumulation in GRM + this batch method) is acknowledged technical debt. (DEFERRED_CLEANUP_ITEMS.md → "calculateFinalScore() vestigial method"; also "Architecture: Two Scoring Paths" carryover)
- **`addKi`/`spendKi` 'unspecified' reason strings** — many callers pass 'unspecified' instead of meaningful telemetry tags. Cleanup deferred. (DEFERRED_CLEANUP_ITEMS.md → "addKi/spendKi callers with 'unspecified' reason strings")
- **Paramita / Yaku Upgrades obsolete code** — `RunManager.buyYakuUpgrade()` method and related state from a removed scoring system. Audit and removal pending. (DEFERRED_CLEANUP_ITEMS.md needs new entry — see below)

For full code line references, fix proposals, and additional details on each item, see `DEFERRED_CLEANUP_ITEMS.md`.

---

## 18. Decisions Log

This section records major design decisions made between Design Doc V4 (March 2026) and Design Doc V5 (May 2026). The V4→V5 timeframe was a substantial systems-implementation phase that introduced new systems (hexagrams, blessings, alchemicals, editions, transcendence), expanded existing systems (spirits, stamps, chakras, zodiacs, symbionts), restructured run pacing, and consolidated naming.

Decisions are organized by impact area. Each entry notes what changed, why, and the V5 section where the current design lives.

### 18.1 Run Structure

**Run length doubled: 18 rounds → 36 rounds.** V4 had 18 rounds across 6 acts (3 rounds/act). V5 has 36 rounds across 6 acts (6 rounds/act). Rationale: 18 rounds proved too short for builds to come together; the longer arc gives more space for build progression and shop investment cycles. The threshold curve and ki economy were not directly carried over — both will be calibrated to the 36-round shape during playtesting. (Section 6.1)

**Sacred Grove cadence reframed.** V4 placed Sacred Grove at act boundaries (6 total visits). V5 places it every 3 rounds (12 total visits before R3, R6, ..., R36). Rationale: with 36 rounds, more frequent Sacred Grove access is needed to enable mid-run build pivots without making the visits feel too rare relative to the longer arc. (Section 6.2, 12.1)

**Endless mode as planned future feature.** Not present in V4. V5 documents endless mode as a planned post-launch feature that continues the round cadence pattern indefinitely beyond R36. (Section 6.3, 12.1)

### 18.2 Scoring System Simplifications

**Push escalation removed.** V4's per-capture formula included a `push_escalation` factor of `1.0 + pushCount × 0.3`. V5 removes this entirely in favor of Flow as the unified push-related multiplier. Rationale: the additive `× 0.3 per push` factor was redundant with Flow's `×1.1 per success`, and removing it simplifies the scoring formula to `points × mult × flow`. (Section 5.1)

**Push penalty rebalanced.** V4 had a progressive penalty curve: -30% / -50% / -70% / -90% based on push depth. V5 replaces this with Flow ×0.9 multiplier on push failure, plus hand-derived ki forfeiture. Rationale: The V4 progressive penalty was punitive in a way that discouraged pushing entirely; the Flow-only penalty creates a softer but persistent disincentive that's still meaningful across multiple rounds. (Section 5.4, 11.1)

**Three scoring modes consolidated to one.** V4 preserved three scoring modes behind `run.scoringMode`: `'capture'` (default), `'additive'` (previous), `'multiplicative'` (original). V5 is capture-only — additive and multiplicative modes were removed from the codebase during the cleanup chapter. Rationale: maintaining three modes was a development hedge that became unnecessary once capture-based scoring stabilized. (Section 5)

**Proportional yaku thresholds (NEW in V5).** V4 had fixed yaku thresholds (Kasu 6, Tanzaku 3, Tane 3, Hikari 2) calibrated for the 48-card base deck. V5 introduces a bracket function that scales thresholds proportionally to deck composition, so deck modifications (Chakra Tools, hexagram filters, rank promotion) appropriately adjust difficulty. Rationale: deck mutation became a much larger axis of build variation in V5 (hexagrams remove cards, speculative cards add them, Chakra Tools transform them), making fixed thresholds untenable. (Section 5.5)

### 18.3 Flow System Unification

**Style System renamed to Flow System.** V4 had a separate "STYLE SYSTEM" section with Style Base × Push Factor as a multiplier. V5 unifies push/bank dynamics with style combos under a single "Flow" concept. Rationale: Style Base and Push Factor were always multiplied together to produce the same final value; treating them as a single tracked variable reduces conceptual overhead. The renamed term also better captures the "momentum" intuition. (Section 5.4)

**Style combos as Flow contributors (not standalone bonuses).** V4 framed style combos as Style Base contributors. V5 makes them additive Flow contributors with explicit per-combo bonuses (+0.2 to +1.0). Mechanically equivalent but presentationally clearer. (Section 5.6)

**Once-per-run constraint on style combos.** Newly explicit in V5. V4 didn't specify this constraint. Rationale: prevents repetitive looping on the same combos and makes combo timing a strategic decision (early triggers compound longer through Flow's persistent multiplier). (Section 5.6)

### 18.4 New Systems Introduced in V5

**Hexagram System (64 hexagrams).** V4 listed "Hexagram environment system" as TBD in open questions (V4 §11.5). V5 has a fully implemented 64-hexagram system with hooks across all major game systems, divination scene, and hexagram collection scene. The 8 double-trigram hexagrams produce the most game-changing effects. Rationale: hexagrams emerged as the run-modifier framework that gives each run a distinct strategic character without requiring deck modifications. The I Ching's 64-hexagram structure provided a natural design space. (Section 9, 13.3, 13.4)

**Blessings (Seven Lucky Gods).** Not in V4. V5 introduces 14 Blessings as 7 paired entries (Tier 1 colloquial + Tier 2 deity), acquired exclusively at Sacred Grove (UI not yet implemented). Each pair represents one of the Shichifukujin and modifies a foundational game capacity. Rationale: provided a permanent run-modifier system distinct from spirits and consumables, with cultural depth that fits the game's Japanese folkloric foundation. (Section 10)

**Alchemicals (7 high-cost consumables).** Not in V4. V5 introduces Cinnabar, Mercury, Jade, Sulfur, Amber, Lead, Pearl as Sacred Grove-only structural transformation tools. They enable spirit fusion paths, defusion, stack manipulation, and rare summoning. Rationale: gave players controlled paths to fusion outcomes (Cinnabar T2/T3, Pearl T4) and stack management (Jade, Sulfur, Amber) that pure shop randomness couldn't provide. (Section 8.6)

**Card Editions (Gold/Crystal/Ghost).** Not in V4. V5 introduces three editions applied via Heart Chakra (60/30/10 random roll). Editions stack with Wu Xing enhancements and stamps. Rationale: added a third card-level modification axis (alongside Wu Xing and stamps) for build differentiation. The probabilistic acquisition via Heart Chakra creates strategic decisions about Heart Chakra timing. (Section 8.3)

**Stamp tier system expansion.** V4 had 4 ribbon stamps (Red, Blue, Green, Yellow) as flat-cost purchases. V5 has 9 stamps in 4 tiers (Primary/Secondary/Tertiary/Quaternary) with crafting paths (Black = Primary+Secondary; Gray = White+Black). Rationale: the V4 stamps were a flat tier with limited progression. V5 introduces depth — generic retriggers (White, Gray) and generic compound triggers (Black) provide late-run optionality, while the crafting paths give mid-run players a reason to acquire multiple stamps. (Section 8.4)

**Speculative cards (13).** Not in V4. V5 introduces 13 cards beyond the 48-card base deck, brought into play via Solar Plexus Chakra rank promotion. Each completes a rank slot that's missing in the base deck for that month. Rationale: enables deck shape variation while preserving the 48-card base structure. Solar Plexus becomes the primary deck-shape modification path. (Section 2.3)

**Spirit transcendence and Negatives.** Not in V4. V5 introduces transcendence — when a 4th copy of a spirit would be acquired, the spirit becomes a "Negative" (frozen-power copy) that no longer occupies a slot. Triggered naturally (4th copy) or via Amber alchemical (any stacked spirit, 1×/2×/3× variants). Rationale: created a build trajectory where over-stacking an effect doesn't feel wasted — it converts to a permanent slot-free contribution. (Section 7.2)

### 18.5 System Expansions

**Spirit count expansion.** V4 had ~90 spirits. V5 has 110 total: 12 Tier 0 symbionts, 78 Tier 1, 8 Tier 2 fusions, 8 Tier 3 cross-fusions, 4 Tier 4 capstones. Rationale: the V4 roster left build archetypes thin in several axes; V5 added retrigger spirits (Rainbow, Family, Wish, Dew, Applause, Echo), more economy spirits (Replica, Print, Collector), more meta spirits (Memory, Past Life), and additional symbionts (Wolf, Garden, Badger) to fill gaps. (Section 7)

**Chakra Tools replace Four Practices.** V4 had "Four Practices" (Path, Fasting, Mind, Tree). V5 has 7 Chakra Tools (Root, Sacral, Solar Plexus, Heart, Throat, Third Eye, Crown). Rationale: the chakra metaphor provides a richer thematic framework with clearer mechanical mapping (each chakra has a distinct kind of card transformation). The Four Practices were less visually distinct and less expandable. (Section 8.1)

**Zodiac roster expanded to 13.** V4 had 12 zodiac consumables (the traditional 12 animals). V5 adds Cat as the 13th, summoning a random Tier 1 Foundation spirit. Rationale: Cat acknowledges the cultural backstory of the Cat being excluded from the traditional zodiac. Mechanically, it provides a budget alternative for Foundation spirit acquisition. (Section 8.5)

**Symbiont roster expanded to 12.** V4 had 9 symbionts. V5 adds Wolf, Garden, and Badger, tied to speculative animals. Rationale: speculative cards introduced new animal IDs that needed corresponding symbionts. The expansion ensures every animal in the deck has a symbiont path. (Section 7.15)

**Tier 4 capstone effects defined.** V4 had Yin-Yang, Gravity, Time, Planet listed with effects "TBD." V5 has defined capstones: Yin-Yang (each spirit fires twice), Universe (mult-modifying spirits also affect points), Time (push success ×1.3, fail ×0.95, decay ×0.98), Nature (points carry across captures within a round). The roster also shifted: V4's Gravity → V5's Universe, V4's Planet → V5's Nature. Rationale: TBD effects needed concrete definition as capstone fusion paths matured. (Section 7.14)

### 18.6 Wu Xing Mechanics Refinement

**Snow/Ice as multiplicative mult, not points.** V4 listed Snow as "(mult-mult, depreciates)" without specific values. V5 clarifies: Snow is ×2 mult on capture (depreciates by 0.25/use), Ice is ×4 mult (depreciates by 0.5/use). Rationale: the mult interpretation, with explicit depreciation rates, made the "depreciates" mechanic concrete and gave Glacier engine spirit a clear trigger event. (Section 8.2.2)

**Iron/Meteorite as held-in-hand mult, not capture mult.** V4 described Iron as "random proc" without specifying when. V5 clarifies: Iron contributes ×1.5 mult when held in hand during scoring, plus a 5% jackpot (+30 ki) on capture. Meteorite ×3.0 mult held + jackpot retained. Rationale: the held-in-hand framing creates strategic depth around hand management — Iron-enhanced cards that the player chooses NOT to play add ongoing value. (Section 8.2.2, 5.1)

**Generative and destructive cycles formalized.** V4 didn't explicitly document the Wu Xing application cycles. V5 documents both: generative (parent upgrades) and destructive (applied element strips current). Specific mappings: Wood→Fire→Earth→Metal→Water→Wood (generative); Wood destroys Earth, Earth destroys Water, etc. Rationale: enables strategic reasoning about element application order. (Section 8.2.1)

### 18.7 Field & Layout Changes

**Dynamic field slot algorithm.** V4 had a fixed 3-2-3 hexagonal arrangement with up to 10 slots (Expanse + Rooster). V5 has a dynamic algorithm (`_distributeRow`) that supports any slot count from minimum to current maximum. Rationale: hexagrams that modify field slots (`field_plus_hand_minus`, `field_minus_two_threshold_minus`, `field_plus_two_double_flip`) needed flexible layout that gracefully handles 5-10 slot configurations. (Section 13.6)

**Phantom/temporary slot via Wood enhancements.** New in V5. V4 didn't specify behavior when field is full. V5 documents that Leaf and Silk Wood enhancements bypass the field-slot limit by creating a temporary slot when all regular slots are full. Rationale: reframed Wood from "consumed by Caterpillar" (V4) to a strategic field-management tool. (Section 8.2.2, 13.6)

### 18.8 UI Architecture Decisions

**Fan UI for spirits and consumables.** New in V5. V4 had fixed-slot rows. V5 has a fan layout (Balatro-inspired) that overlaps cards on overflow. Spirit chain reorder via drag-and-drop became a deliberate strategic action. Rationale: with 6 spirit slots + dynamic Negatives + Legendaries, the old fixed-slot row didn't scale visually. (Section 13.7)

**Click-to-expand stack model.** New in V5. Stacks of identical spirits collapse visually, expand on click, and individual copies can be dragged out via a drag-1 mechanism. Rationale: stacking became a more frequent and strategically meaningful action in V5 (transcendence depends on it), so the UX needed explicit stack manipulation primitives. (Section 13.7)

**Cross-scene UI consistency via shared SpiritLayout.** ShrineScene and GameScene now share a `SpiritLayout.js` module. V4 had divergent layouts. Rationale: visual consistency across scenes reduces cognitive load when transitioning between gameplay and shop. (Section 13.11)

**Hexagonal field silhouette preserved across slot counts.** New in V5. The middle row stays at 2 slots; additions/removals are absorbed by top/bottom rows. Rationale: maintaining the visual identity of the field across all configurations reinforces the core "tabletop" feel. (Section 13.6)

### 18.9 Architectural / Cleanup Decisions

**Three Marks system removed.** V4 had Three Marks (impermanence, non-being, transcendence) referenced in `data/consumables.js`. V5 removes the Three Marks data; the underlying card-targeting infrastructure was reused for Wu Xing elements and Chakra Tools. Rationale: Three Marks didn't survive the design iteration but the targeting UI machinery was reusable. (Naming cleanup deferred — see DEFERRED_CLEANUP_ITEMS.md)

**Yaku Upgrades / Paramita removed.** V4's earlier scoring iterations had a yaku upgrade mechanic. V5 removes the gameplay but `RunManager.buyYakuUpgrade()` and related state remain in the codebase. Rationale: the mechanic conflicted with the proportional threshold system. (Cleanup deferred — see DEFERRED_CLEANUP_ITEMS.md)

**Two scoring paths consolidation in progress.** V4 had three scoring modes. V5 consolidated to capture-only, but the vestigial `calculateFinalScore()` method remains in `ScoringEngine.js` because it still runs metal proc rolls. Rationale: removing the method entirely required refactoring metal procs into the per-capture flow, which was scoped out of the cleanup chapter. (Architectural debt — see DEFERRED_CLEANUP_ITEMS.md)

**Cleanup Chapter executed before V5 drafting.** A focused cleanup pass preceded V5 documentation: Three Marks data removed, yaku upgrade plumbing removed, dead style base code removed, ScoringEngine signatures simplified. Rationale: cleaning before documenting ensures the design doc reflects only systems that actually exist and matter; cleaning before testing ensures playtesters don't encounter dead-code confusion.

### 18.10 Open V4 Questions Resolved in V5

V4 §11 "Open Design Questions" listed 9 items. Most are now resolved:

| V4 Question | V5 Resolution |
|---|---|
| Tier 4 unity spirit effects (Yin-Yang, Gravity, Time, Planet) | Resolved — defined effects for Yin-Yang, Universe (was Gravity), Time, Nature (was Planet) |
| Play pattern engines | Partially — Wildlife, Plenty, Velocity, Glacier, Carbon, Fossil, Moths cover this design space |
| Threshold curve recalibration | Still open — proportional thresholds via bracket function are in place but exact curve TBD per playtesting |
| Mirror interaction specifics | Implemented — Mirror retriggers spirit to its right |
| Hexagram environment system | Resolved — full 64-hexagram system implemented |
| Card art pipeline | Out of design doc scope; ongoing production concern |
| Shop UI overhaul | Partially — Fan UI delivered the spirit/consumable improvements; full shop redesign ongoing |
| Sound design | Out of design doc scope (Noisy app is separate project) |
| Day/night background coloring | Not implemented; deferred consideration |

---

*Design Doc V5 — drafted and audited May 2026. All 18 sections complete. See `DEFERRED_CLEANUP_ITEMS.md` for tracked code-vs-design fixes pending the next code chapter.*