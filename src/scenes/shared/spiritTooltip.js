// ─────────────────────────────────────────────────────────────────────────────
// spiritTooltip.js — shared spirit-contribution tooltip line builder (F3.24)
// Called from both GameScene and ShrineScene.
// ─────────────────────────────────────────────────────────────────────────────

import SpiritEffects, { isElementMature } from '../../systems/SpiritEffects.js';
import { getSpiritDef }            from '../../data/spirits.js';
import run, {
  effectivePower,
  aggregateNumericState,
  aggregateArrayLength,
  aggregateUniqueCount,
  longestHeldValue,
} from '../../systems/RunManager.js';

/**
 * Compute tooltip contribution lines for a spirit.
 * @param {object}   spirit   Spirit object from run.allSpirits
 * @param {object}   [opts]
 * @param {object}   [opts.bullseyeInventory]  Current round's bullseye inventory (GameScene only)
 * @param {number}   [opts.cumulativePoints]    Nature carryover points (GameScene only)
 * @returns {string|null}
 */
export function getSpiritContrib(spirit, opts = {}) {
  const fx      = SpiritEffects.get(spirit.id);
  const spirits = run.spirits;
  const lines   = [];
  const bullseyeInv = opts.bullseyeInventory ?? { bright: 0, animal: 0, ribbon: 0, plain: 0 };
  const cumulPts    = opts.cumulativePoints ?? 0;

  const power = effectivePower(spirit);
  if (spirit.isNegative) {
    lines.push(`Negative (power \xD7${power}) \u2014 zero-slot`);
  }

  /** Read a base value from spirit's tooltipBase. */
  const _tb = (key) => getSpiritDef(spirit.id)?.tooltipBase?.[key] ?? 0;

  // ── Per-card spirit (onCardScored) ────────────────────────────────────
  if (fx?.onCardScored) {
    const def = getSpiritDef(spirit.id);
    const n   = power;
    const id  = spirit.id;

    // Seasonal point boosts
    if      (id === 'spring_pollen')      lines.push(`Spring cards (months 3-5) worth +${_tb('points') * n} base points.`);
    else if (id === 'summer_heat')        lines.push(`Summer cards (months 6-8) worth +${_tb('points') * n} base points.`);
    else if (id === 'autumn_harvest')     lines.push(`Autumn cards (months 9-11) worth +${_tb('points') * n} base points.`);
    else if (id === 'winter_cold')        lines.push(`Winter cards (months 12, 1, 2) worth +${_tb('points') * n} base points.`);
    // Seasonal additive mult
    else if (id === 'spring_bees')        lines.push(`+${_tb('mult') * n} additive mult per spring card captured.`);
    else if (id === 'summer_humidity')    lines.push(`+${_tb('mult') * n} additive mult per summer card captured.`);
    else if (id === 'autumn_leaves')      lines.push(`+${_tb('mult') * n} additive mult per autumn card captured.`);
    else if (id === 'winter_aridity')     lines.push(`+${_tb('mult') * n} additive mult per winter card captured.`);
    // Axis point boosts
    else if (id === 'air_clouds')         lines.push(`Air cards worth +${_tb('points') * n} base points.`);
    else if (id === 'land_soil')          lines.push(`Land cards worth +${_tb('points') * n} base points.`);
    else if (id === 'day_light')          lines.push(`Day cards worth +${_tb('points') * n} base points.`);
    else if (id === 'night_dark')         lines.push(`Night cards worth +${_tb('points') * n} base points.`);
    // Axis additive mult
    else if (id === 'air_wind')           lines.push(`+${_tb('mult') * n} additive mult per air card captured.`);
    else if (id === 'land_rock')          lines.push(`+${_tb('mult') * n} additive mult per land card captured.`);
    else if (id === 'day_movement')       lines.push(`+${_tb('mult') * n} additive mult per day card captured.`);
    else if (id === 'night_stillness')    lines.push(`+${_tb('mult') * n} additive mult per night card captured.`);
    // T2 seasonal fusions
    else if (id === 'fusion_bloom')       lines.push(`Spring cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per spring card.`);
    else if (id === 'fusion_thunderstorm') lines.push(`Summer cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per summer card.`);
    else if (id === 'fusion_decay')       lines.push(`Autumn cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per autumn card.`);
    else if (id === 'fusion_blizzard')    lines.push(`Winter cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per winter card.`);
    // T2 axis fusions
    else if (id === 'fusion_atmosphere')  lines.push(`Air cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per air card.`);
    else if (id === 'fusion_continent')   lines.push(`Land cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per land card.`);
    else if (id === 'fusion_sun')         lines.push(`Day cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per day card.`);
    else if (id === 'fusion_moon')        lines.push(`Night cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per night card.`);
    // Rank foundations
    else if (id === 'rank_shine')         lines.push(`Bright cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per bright.`);
    else if (id === 'rank_oxygen')        lines.push(`Animal cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per animal.`);
    else if (id === 'rank_poem')          lines.push(`Ribbon cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per ribbon.`);
    else if (id === 'rank_salt')          lines.push(`Plain cards +${_tb('points') * n} pts, +${_tb('mult') * n} mult per plain.`);
    // T3 cross-fusions
    else if (id === 'cross_yang')         lines.push(`Air and Day cards score with \xD7${_tb('mult') * n} mult contribution.`);
    else if (id === 'cross_yin')          lines.push(`Land and Night cards score with \xD7${_tb('mult') * n} mult contribution.`);
    else if (id === 'cross_space')        lines.push(`Air and Night cards score with \xD7${_tb('mult') * n} mult contribution.`);
    else if (id === 'cross_energy')       lines.push(`Land and Day cards score with \xD7${_tb('mult') * n} mult contribution.`);
    else if (id === 'cross_solstice')     lines.push(`Summer and Winter cards score with \xD7${_tb('mult') * n} mult contribution.`);
    else if (id === 'cross_equinox')      lines.push(`Spring and Autumn cards score with \xD7${_tb('mult') * n} mult contribution.`);
    else if (id === 'cross_tropic')       lines.push(`Spring and Summer cards score with \xD7${_tb('mult') * n} mult contribution.`);
    else if (id === 'cross_arctic')       lines.push(`Autumn and Winter cards score with \xD7${_tb('mult') * n} mult contribution.`);
    // Rank utility
    else if (id === 'util_glory')         lines.push(`Capture a bright: draw ${_tb('draws') * n} cards.`);
    else if (id === 'util_symbiosis')     lines.push(`Capturing an animal summons ${n} of its corresponding symbiont.`);
    else if (id === 'util_irrigation')    lines.push(`Each plain card captured permanently gains +${_tb('points') * n} points.`);
    // Symbionts with onCardScored
    else if (id === 'sym_wolf')           lines.push(`\xD7${_tb('mult') * n} mult per scored bright.`);
    // Fallback
    else if (def?.description) lines.push(def.description);
    else lines.push('Per-card effect (active during scoring)');
  }

  // ── Engine spirit (applyEngine) ───────────────────────────────────────
  if (fx?.applyEngine) {
    if (spirit.id === 'engine_radiance') {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenBrights ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        const uniqueCount = aggregateUniqueCount(spirit, 'seenBrights');
        lines.push(`Unique brights: ${uniqueCount}/5  \u2192  \xD7${(1 + sumLengths * 2).toFixed(2)} mult`);
      } else {
        const sumLengths = aggregateArrayLength(spirit, 'seenBrights');
        const uniqueCount = aggregateUniqueCount(spirit, 'seenBrights');
        lines.push(`Unique brights: ${uniqueCount}/5  \u2192  \xD7${(1 + sumLengths * 2).toFixed(2)} mult`);
      }
    } else if (spirit.id === 'engine_wildlife') {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenAnimals ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        const uniqueCount = aggregateUniqueCount(spirit, 'seenAnimals');
        lines.push(`Unique animals: ${uniqueCount}/9  \u2192  \xD7${(1 + sumLengths * 0.5).toFixed(2)} mult`);
      } else {
        const sumLengths = aggregateArrayLength(spirit, 'seenAnimals');
        const uniqueCount = aggregateUniqueCount(spirit, 'seenAnimals');
        lines.push(`Unique animals: ${uniqueCount}/9  \u2192  \xD7${(1 + sumLengths * 0.5).toFixed(2)} mult`);
      }
    } else if (spirit.id === 'engine_banner') {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenRibbons ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        const uniqueCount = aggregateUniqueCount(spirit, 'seenRibbons');
        lines.push(`Unique ribbons: ${uniqueCount}  \u2192  \xD7${(1 + sumLengths).toFixed(2)} mult`);
      } else {
        const sumLengths = aggregateArrayLength(spirit, 'seenRibbons');
        const uniqueCount = aggregateUniqueCount(spirit, 'seenRibbons');
        lines.push(`Unique ribbons: ${uniqueCount}  \u2192  \xD7${(1 + sumLengths).toFixed(2)} mult`);
      }
    } else if (spirit.id === 'engine_plenty') {
      if (spirit.isNegative) {
        const arrays = spirit.state?.seenPlains ?? [];
        const sumLengths = arrays.reduce((s, arr) => s + (arr?.length ?? 0), 0);
        const uniqueCount = aggregateUniqueCount(spirit, 'seenPlains');
        lines.push(`Unique plains: ${uniqueCount}  \u2192  \xD7${(1 + sumLengths * 0.1).toFixed(2)} mult`);
      } else {
        const sumLengths = aggregateArrayLength(spirit, 'seenPlains');
        const uniqueCount = aggregateUniqueCount(spirit, 'seenPlains');
        lines.push(`Unique plains: ${uniqueCount}  \u2192  \xD7${(1 + sumLengths * 0.1).toFixed(2)} mult`);
      }
    } else if (spirit.id === 'sym_algae') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne * 0.1 * (spirit.powerLevel ?? 1);
        lines.push(`Symbionts summoned: ${o + ne}  \u2192  \xD7${mult.toFixed(2)} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'summonCount');
        lines.push(`Symbionts summoned: ${longestHeldValue(spirit, 'summonCount')}  \u2192  \xD7${(1 + agg * 0.1).toFixed(2)} mult`);
      }
    } else if (spirit.id === 'sym_ants') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 0.5 * (spirit.powerLevel ?? 1);
        lines.push(`Cards played: ${o + ne}  \u2192  +${mult.toFixed(1)} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'totalPlayed');
        lines.push(`Cards played: ${longestHeldValue(spirit, 'totalPlayed')}  \u2192  +${(agg * 0.5).toFixed(1)} mult`);
      }
    } else if (spirit.id === 'sym_ducks') {
      const v = spirit.state?.multValue ?? 0;
      const stacks = effectivePower(spirit);
      const mult = v === 0 ? 1 : (1 + v * 0.2 * stacks);
      lines.push(`Net deck-flip matches: ${v}  \u2192  \xD7${mult.toFixed(2)} mult`);
    } else if (spirit.id === 'sym_snails') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 1 * (spirit.powerLevel ?? 1);
        lines.push(`Total unplayed: ${o + ne}  \u2192  +${mult} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'totalUnplayed');
        lines.push(`Total unplayed: ${longestHeldValue(spirit, 'totalUnplayed')}  \u2192  +${agg} mult`);
      }
    } else if (spirit.id === 'engine_glacier') {
      if (spirit.isNegative) {
        const ne1 = spirit.state?.newEvents1 ?? 0, ne2 = spirit.state?.newEvents2 ?? 0;
        const o = spirit.state?.oldestAtTranscend ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne1 * 0.2 * (spirit.powerLevel ?? 1) + ne2 * 0.4 * (spirit.powerLevel ?? 1);
        lines.push(`Snow + Ice: ${o + ne1 + ne2}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      } else {
        const t1 = aggregateNumericState(spirit, 't1Procs'), t2 = aggregateNumericState(spirit, 't2Procs');
        lines.push(`Snow: ${t1}, Ice: ${t2}  \u2192  \xD7${(1 + (t1 * 0.2 + t2 * 0.4)).toFixed(2)} mult-mult`);
      }
    } else if (spirit.id === 'engine_carbon') {
      if (spirit.isNegative) {
        const ne1 = spirit.state?.newEvents1 ?? 0, ne2 = spirit.state?.newEvents2 ?? 0;
        const o = spirit.state?.oldestAtTranscend ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne1 * 0.5 * (spirit.powerLevel ?? 1) + ne2 * 1.0 * (spirit.powerLevel ?? 1);
        lines.push(`Ember + Charcoal: ${o + ne1 + ne2}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      } else {
        const t1 = aggregateNumericState(spirit, 't1Procs'), t2 = aggregateNumericState(spirit, 't2Procs');
        lines.push(`Ember: ${t1}, Charcoal: ${t2}  \u2192  \xD7${(1 + (t1 * 0.5 + t2 * 1.0)).toFixed(2)} mult-mult`);
      }
    } else if (spirit.id === 'engine_velocity') {
      const ironCount = run.getDeck().filter(c =>
        c.enhancement?.element === 'metal' && c.enhancement?.tier === 'base'
      ).length;
      if (spirit.isNegative) {
        const effectiveT2 = (spirit.state?.t2ProcsAtTranscend ?? 0) + (spirit.state?.newT2Procs ?? 0) * (spirit.powerLevel ?? 1);
        const mult = (1 + ironCount * 0.1 * (spirit.powerLevel ?? 1)) * Math.pow(1.5, effectiveT2);
        lines.push(`Iron in deck: ${ironCount}, Meteorite procs: ${effectiveT2}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      } else {
        const t2 = aggregateNumericState(spirit, 't2Procs');
        const sc = effectivePower(spirit);
        const mult = (1 + ironCount * 0.1 * sc) * Math.pow(1.5, t2);
        lines.push(`Iron in deck: ${ironCount}, Meteorite procs: ${t2}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      }
    } else if (spirit.id === 'engine_fossil') {
      if (spirit.isNegative) {
        const ne1 = spirit.state?.newEvents1 ?? 0, ne2 = spirit.state?.newEvents2 ?? 0;
        const o = spirit.state?.oldestAtTranscend ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne1 * 0.1 * (spirit.powerLevel ?? 1) + ne2 * 0.3 * (spirit.powerLevel ?? 1);
        lines.push(`Clay + Pottery: ${o + ne1 + ne2}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      } else {
        const t1 = aggregateNumericState(spirit, 't1Procs'), t2 = aggregateNumericState(spirit, 't2Procs');
        lines.push(`Clay: ${t1}, Pottery: ${t2}  \u2192  \xD7${(1 + (t1 * 0.1 + t2 * 0.3)).toFixed(2)} mult-mult`);
      }
    } else if (spirit.id === 'engine_moths') {
      if (spirit.isNegative) {
        const ne1 = spirit.state?.newEvents1 ?? 0, ne2 = spirit.state?.newEvents2 ?? 0;
        const o = spirit.state?.oldestAtTranscend ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne1 * 0.3 * (spirit.powerLevel ?? 1) + ne2 * 0.6 * (spirit.powerLevel ?? 1);
        lines.push(`Slot creates + Silk: ${o + ne1 + ne2}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      } else {
        const t1 = aggregateNumericState(spirit, 't1Procs'), t2 = aggregateNumericState(spirit, 't2Procs');
        lines.push(`Slot creations: ${t1}, Silk avoidances: ${t2}  \u2192  \xD7${(1 + (t1 * 0.3 + t2 * 0.6)).toFixed(2)} mult-mult`);
      }
    } else if (spirit.id === 'engine_devotion') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 4 * (spirit.powerLevel ?? 1);
        lines.push(`Brights scored: ${o + ne}  \u2192  +${mult} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'totalScored');
        lines.push(`Brights scored: ${longestHeldValue(spirit, 'totalScored')}  \u2192  +${agg * 4} mult`);
      }
    } else if (spirit.id === 'engine_habitat') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 2.5 * (spirit.powerLevel ?? 1);
        lines.push(`Animals scored: ${o + ne}  \u2192  +${mult.toFixed(1)} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'totalScored');
        lines.push(`Animals scored: ${longestHeldValue(spirit, 'totalScored')}  \u2192  +${(agg * 2.5).toFixed(1)} mult`);
      }
    } else if (spirit.id === 'engine_ceremony') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 2 * (spirit.powerLevel ?? 1);
        lines.push(`Ribbons scored: ${o + ne}  \u2192  +${mult} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'totalScored');
        lines.push(`Ribbons scored: ${longestHeldValue(spirit, 'totalScored')}  \u2192  +${agg * 2} mult`);
      }
    } else if (spirit.id === 'engine_agriculture') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 1 * (spirit.powerLevel ?? 1);
        lines.push(`Plains scored: ${o + ne}  \u2192  +${mult} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'totalScored');
        lines.push(`Plains scored: ${longestHeldValue(spirit, 'totalScored')}  \u2192  +${agg} mult`);
      }
    } else if (spirit.id === 'engine_lincoln') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 0.1 * (spirit.powerLevel ?? 1);
        lines.push(`Banks: ${o + ne}  \u2192  +${mult.toFixed(1)} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'banks');
        lines.push(`Banks: ${longestHeldValue(spirit, 'banks')}  \u2192  +${(agg * 0.1).toFixed(1)} mult`);
      }
    } else if (spirit.id === 'engine_napoleon') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 0.2 * (spirit.powerLevel ?? 1);
        lines.push(`Push fails: ${o + ne}  \u2192  +${mult.toFixed(1)} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'pushFails');
        lines.push(`Push fails: ${longestHeldValue(spirit, 'pushFails')}  \u2192  +${(agg * 0.2).toFixed(1)} mult`);
      }
    } else if (spirit.id === 'decay_persimmon') {
      const n = spirit.state?.remaining ?? 0;
      const stacks = effectivePower(spirit);
      lines.push(`Remaining: +${n * stacks} mult (loses 3/round)`);
    } else if (spirit.id === 'decay_pear') {
      const n = spirit.state?.remaining ?? 0;
      const stacks = effectivePower(spirit);
      lines.push(`Remaining: +${n * stacks} pts (loses 5/round)`);
    } else if (spirit.id === 'engine_missing_number') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 5 * (spirit.powerLevel ?? 1);
        lines.push(`4-stacks scored: ${o + ne}  \u2192  +${mult} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'totalStacks');
        lines.push(`4-stacks scored: ${longestHeldValue(spirit, 'totalStacks')}  \u2192  +${agg * 5} mult`);
      }
    } else if (spirit.id === 'engine_palace') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne * 0.5 * (spirit.powerLevel ?? 1);
        lines.push(`Cards added: ${o + ne}  \u2192  \xD7${mult.toFixed(2)} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'cardsAdded');
        lines.push(`Cards added: ${longestHeldValue(spirit, 'cardsAdded')}  \u2192  \xD7${(1 + agg * 0.5).toFixed(2)} mult`);
      }
    } else if (spirit.id === 'engine_ship') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne * 0.3 * (spirit.powerLevel ?? 1);
        lines.push(`Cards discarded: ${o + ne}  \u2192  \xD7${mult.toFixed(2)} mult`);
      } else {
        const agg = aggregateNumericState(spirit, 'cardsDiscarded');
        lines.push(`Cards discarded: ${longestHeldValue(spirit, 'cardsDiscarded')}  \u2192  \xD7${(1 + agg * 0.3).toFixed(2)} mult`);
      }
    } else if (spirit.id === 'engine_surplus') {
      const ki = run?.ki ?? 0;
      lines.push(`Current ki: ${ki}  \u2192  +${Math.floor(ki / 3)} mult`);
    } else if (spirit.id === 'engine_northern_lion') {
      let n;
      if (spirit.isNegative) {
        n = (spirit.state?.preTranscendTotal ?? 0) +
            (spirit.state?.newEvents ?? 0) * 1 * (spirit.powerLevel ?? 1);
      } else {
        n = aggregateNumericState(spirit, 'pushesWitnessed');
      }
      lines.push(`Free rerolls earned: ${n}`);
    } else if (spirit.id === 'engine_kintaro') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne * 0.1 * (spirit.powerLevel ?? 1);
        lines.push(`Gold consumed: ${o + ne}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      } else {
        const consumed = aggregateNumericState(spirit, 'goldsConsumed');
        lines.push(`Gold consumed: ${longestHeldValue(spirit, 'goldsConsumed')}  \u2192  \xD7${(1 + consumed * 0.1).toFixed(2)} mult-mult`);
      }
    } else if (spirit.id === 'engine_golden_toad') {
      const max = effectivePower(spirit);
      lines.push(`Applies Gold to up to ${max} non-edition card(s) per capture`);
    } else if (spirit.id === 'engine_bullseye') {
      if (spirit.isNegative) {
        const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
        const mult = (spirit.state?.preTranscendTotal ?? 1) + ne * 1.0 * (spirit.powerLevel ?? 1);
        lines.push(`Qualified rounds: ${o + ne}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      } else {
        const count = aggregateNumericState(spirit, 'qualifiedCount');
        const mult = 1 + count * 1.0;
        const inv = bullseyeInv;
        const progress = `${inv.bright}B/${inv.animal}A/${inv.ribbon}R/${inv.plain}P`;
        lines.push(`Qualified rounds: ${count} (this round: ${progress})  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
      }
    } else if (spirit.id === 'legend_waidan') {
      const stacks = effectivePower(spirit);
      lines.push(`Sacred Grove exit: creates ${stacks} negative copy/copies of random consumable(s)`);
    } else if (spirit.id === 'util_festival') {
      const stacks = effectivePower(spirit);
      lines.push(`Generates a colored stamp on each ribbon capture (\xD7${stacks} per ribbon, slot-gated)`);
    } else if (spirit.id === 'econ_lucky_charm') {
      const stacks = effectivePower(spirit);
      const bonus = stacks * 15;
      lines.push(`+${bonus}% to probability rolls`);
    } else if (spirit.id === 'econ_reward') {
      const stacks = effectivePower(spirit);
      const pct = stacks * 10;
      lines.push(`+${pct}% of current ki on each push success`);
    } else {
      const r = fx.applyEngine({ spirit, mult: 1.0, points: 0, spirits });
      if (r) {
        if (r.multiplyMult) lines.push(`\xD7${r.multiplyMult.toFixed(2)} mult`);
        if (r.addMult)      lines.push(`+${r.addMult.toFixed(2)} mult`);
      }
    }
  }

  // ── Meta spirit state ──────────────────────────────────────────────────
  if (spirit.id === 'util_past_life') {
    const elements = spirit.elements ?? [];
    const totalEl = elements.length;
    const activated = elements.filter(el => isElementMature(el, run.round)).length;
    lines.push(`Activated: ${activated}/${totalEl} (3-round hold each)`);
    if (activated > 0) {
      lines.push(`On sale: copies 1 random spirit at power ${activated}`);
    } else {
      lines.push('On sale: no copy effect yet');
    }
  } else if (spirit.id === 'engine_memory') {
    let target = null;
    for (let i = spirits.length - 1; i >= 0; i--) {
      const s = spirits[i];
      if (s === spirit) continue;
      if (s.id === 'engine_memory') { target = null; break; }
      target = s;
      break;
    }
    if (target) {
      lines.push(`Copying: ${target.name}`);
    } else {
      lines.push('No valid target \u2014 inert');
    }
  } else if (spirit.id === 'game_mirror') {
    const idx = spirits.indexOf(spirit);
    let target = null;
    if (idx > 0) {
      for (let i = idx - 1; i >= 0; i--) {
        if (spirits[i] && spirits[i] !== spirit) { target = spirits[i]; break; }
      }
    }
    if (target) {
      lines.push(`Copying: ${target.name}`);
    } else {
      lines.push('No left neighbor \u2014 inert');
    }
  }

  // ── Legendary + demoted rare tooltips ───────────────────────────────────
  if (spirit.id === 'legend_gankyil') {
    lines.push('Auto-captures at 3-stack instead of 4-stack');
  } else if (spirit.id === 'legend_wuji') {
    if (spirit.isNegative) {
      const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
      const mult = (spirit.state?.preTranscendTotal ?? 1) + ne * 0.3 * (spirit.powerLevel ?? 1);
      lines.push(`Cards destroyed: ${o + ne}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
    } else {
      const destroyed = aggregateNumericState(spirit, 'destroyed');
      lines.push(`Cards destroyed: ${longestHeldValue(spirit, 'destroyed')}  \u2192  \xD7${(1 + destroyed * 0.3).toFixed(2)} mult-mult`);
    }
  } else if (spirit.id === 'legend_dao') {
    const deck = run.getDeck();
    const n = deck.filter(c => !c.enhancement && !c.ribbonStamp && !c.edition && !c.promotionProgress).length;
    const stacks = effectivePower(spirit);
    const mult = 1 + n * 0.1 * stacks;
    lines.push(`Unaltered in deck: ${n}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
  } else if (spirit.id === 'legend_chi') {
    const stacks = effectivePower(spirit);
    const mult = run.flow * stacks;
    lines.push(`Flow: ${run.flow.toFixed(2)} \xD7 ${stacks} stack(s)  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
  } else if (spirit.id === 'legend_tengu') {
    const stacks = effectivePower(spirit);
    const spiritCount = run.spirits.length + run.negativeSpirits.length;
    const mult = 1 + 0.3 * spiritCount * stacks;
    lines.push(`Spirits + negatives: ${spiritCount}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
  } else if (spirit.id === 'legend_feng_shui') {
    const stacks = effectivePower(spirit);
    const fengShuiSlotCount = run.spirits.filter(s => s.id === 'legend_feng_shui').length;
    const occupiedNonFengShui = run.spirits.length - fengShuiSlotCount;
    const emptySlots = run.spiritSlots - occupiedNonFengShui;
    const mult = 1 + 0.5 * emptySlots * stacks;
    lines.push(`Empty slots (FS-adjusted): ${emptySlots}  \u2192  \xD7${mult.toFixed(2)} mult-mult`);
  } else if (spirit.id === 'capstone_yinyang') {
    lines.push('Each spirit slot fires twice during scoring');
  } else if (spirit.id === 'capstone_universe') {
    lines.push('Mult-modifying spirits also affect points');
  } else if (spirit.id === 'capstone_time') {
    lines.push('Push success \xD71.5, fail \xD70.5, no round decay');
  } else if (spirit.id === 'capstone_nature') {
    lines.push(`Points carry across captures (carryover: ${cumulPts})`);
  }

  // ── Symbiont non-scoring state ─────────────────────────────────────────
  if (spirit.id === 'sym_caterpillar') {
    const eaten = spirit.state?.leafsEaten ?? 0;
    lines.push(`Leafs eaten: ${eaten}/3${eaten >= 3 ? ' \u2014 metamorphosed!' : ''}`);
  } else if (spirit.id === 'sym_cuckoo_egg') {
    const elements = spirit.elements ?? [];
    if (elements.length === 0) {
      lines.push('Hatches in 3 rounds');
    } else {
      const matureCount = elements.filter(el => isElementMature(el, run.round)).length;
      if (elements.length === 1) {
        const age = run.round - (elements[0].acquiredRound ?? 0);
        lines.push(age >= 3 ? 'Mature \u2014 sell to hatch a Tier-2 fusion' : `Hatches in ${3 - age} round(s)`);
      } else {
        lines.push(`Mature: ${matureCount}/${elements.length} (sell to hatch)`);
      }
    }
  } else if (spirit.id === 'sym_crow') {
    lines.push('Generates consumable at round end');
  } else if (spirit.id === 'sym_osprey') {
    const used = spirit.state?.flipsUsedThisRound ?? 0;
    const max  = run.countStackedById('sym_osprey') || 1;
    lines.push(`Deck flips to hand: ${used}/${max} used this round`);
  } else if (spirit.id === 'game_catcher') {
    const used = spirit.state?.catchesUsedThisRound ?? 0;
    const max  = run.countStackedById('game_catcher') || 1;
    lines.push(`Catches used: ${used}/${max} this round`);
  } else if (spirit.id === 'sym_wolf') {
    const stacks = effectivePower(spirit);
    lines.push(`\xD7${2 * stacks} mult per bright scored`);
  } else if (spirit.id === 'sym_garden') {
    lines.push('+0.2 additive mult per unique card in deck');
  } else if (spirit.id === 'sym_badger') {
    if (spirit.isNegative) {
      const o = spirit.state?.oldestAtTranscend ?? 0, ne = spirit.state?.newEvents ?? 0;
      const mult = (spirit.state?.preTranscendTotal ?? 0) + ne * 1 * (spirit.powerLevel ?? 1);
      lines.push(`Consumables used: ${o + ne}  \u2192  +${mult} mult`);
    } else {
      const agg = aggregateNumericState(spirit, 'consumablesUsed');
      lines.push(`Consumables used: ${longestHeldValue(spirit, 'consumablesUsed')}  \u2192  +${agg} mult`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Per-element tooltip for a single element of a stacked accumulator spirit.
 * Returns null for negatives or out-of-range indices.
 * @param {object} spirit
 * @param {number} elementIndex  0-based index into spirit.elements[]
 * @returns {string|null}
 */
export function getElementContrib(spirit, elementIndex) {
  if (spirit.isNegative) return null;
  if (!spirit.elements || elementIndex < 0 || elementIndex >= spirit.elements.length) return null;

  const el = spirit.elements[elementIndex];
  const lines = [];
  const copyN = elementIndex + 1;
  const acqR = el.acquiredRound;
  lines.push(acqR != null ? `Copy ${copyN} (R${acqR})` : `Copy ${copyN}`);

  switch (spirit.id) {
    case 'sym_ants':           lines.push(`Cards played: ${el.totalPlayed ?? 0} \u2192 +${((el.totalPlayed ?? 0) * 0.5).toFixed(1)} mult`); break;
    case 'sym_snails':         lines.push(`Cards unplayed: ${el.totalUnplayed ?? 0} \u2192 +${el.totalUnplayed ?? 0} mult`); break;
    case 'sym_algae':          lines.push(`Summons: ${el.summonCount ?? 0} \u2192 \xD7${(1 + (el.summonCount ?? 0) * 0.1).toFixed(2)}`); break;
    case 'sym_badger':         lines.push(`Consumables used: ${el.consumablesUsed ?? 0} \u2192 +${el.consumablesUsed ?? 0} mult`); break;
    case 'engine_devotion':    lines.push(`Scored: ${el.totalScored ?? 0} \u2192 +${(el.totalScored ?? 0) * 4} mult`); break;
    case 'engine_habitat':     lines.push(`Scored: ${el.totalScored ?? 0} \u2192 +${((el.totalScored ?? 0) * 2.5).toFixed(1)} mult`); break;
    case 'engine_ceremony':    lines.push(`Scored: ${el.totalScored ?? 0} \u2192 +${(el.totalScored ?? 0) * 2} mult`); break;
    case 'engine_agriculture': lines.push(`Scored: ${el.totalScored ?? 0} \u2192 +${el.totalScored ?? 0} mult`); break;
    case 'engine_lincoln':     lines.push(`Banks: ${el.banks ?? 0} \u2192 +${((el.banks ?? 0) * 0.1).toFixed(2)} mult`); break;
    case 'engine_napoleon':    lines.push(`Push fails: ${el.pushFails ?? 0} \u2192 +${((el.pushFails ?? 0) * 0.2).toFixed(2)} mult`); break;
    case 'engine_palace':      lines.push(`Cards added: ${el.cardsAdded ?? 0}`); break;
    case 'engine_ship':        lines.push(`Cards discarded: ${el.cardsDiscarded ?? 0}`); break;
    case 'engine_kintaro':     lines.push(`Golds consumed: ${el.goldsConsumed ?? 0}`); break;
    case 'engine_bullseye':    lines.push(`Qualified: ${el.qualifiedCount ?? 0}`); break;
    case 'engine_missing_number': lines.push(`4-stacks: ${el.totalStacks ?? 0}`); break;
    case 'engine_northern_lion':  lines.push(`Pushes: ${el.pushesWitnessed ?? 0}`); break;
    case 'legend_wuji':        lines.push(`Destroyed: ${el.destroyed ?? 0}`); break;
    case 'engine_glacier': case 'engine_carbon': case 'engine_fossil': case 'engine_moths':
      lines.push(`T1: ${el.t1Procs ?? 0}, T2: ${el.t2Procs ?? 0}`); break;
    case 'engine_velocity':    lines.push(`T2 procs: ${el.t2Procs ?? 0}`); break;
    case 'engine_wildlife':    lines.push(`Animals seen: ${(el.seenAnimals ?? []).length}/9`); break;
    case 'engine_plenty':      lines.push(`Plains seen: ${(el.seenPlains ?? []).length}`); break;
    case 'engine_radiance':    lines.push(`Brights seen: ${(el.seenBrights ?? []).length}/5`); break;
    case 'engine_banner':      lines.push(`Ribbons seen: ${(el.seenRibbons ?? []).length}`); break;
    case 'util_past_life': case 'sym_cuckoo_egg': break; // maturity shown via acquiredRound label
    default: {
      const keys = Object.keys(el).filter(k => k !== 'acquiredRound');
      for (const k of keys) {
        const v = el[k];
        if (Array.isArray(v)) lines.push(`${k}: ${v.length}`);
        else if (typeof v === 'number') lines.push(`${k}: ${v}`);
      }
      break;
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}
