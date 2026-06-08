import { describe, it, expect } from 'vitest';
import { makeRound } from '../helpers.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';
import {
  ZODIAC_CONSUMABLES, WUXING_CONSUMABLES, CHAKRA_TOOLS, STAMPS, ALCHEMICAL_CONSUMABLES,
} from '../../src/data/consumables.js';

// F4.15a: inputType is the universal target-mode discriminator the scene dispatch
// switches on. These lock (1) every handler declares a valid inputType, and (2) the
// zodiac discovery call (execute with no target) is side-effect-free — the premise
// that makes collapsing the discover-then-execute round-trip into one call safe.

const KINDS = new Set([
  'none', 'slot', 'yaku', 'card', 'card_multi', 'card_pair',
  'spirit_none', 'spirit_single_fusion', 'spirit_single_stackable',
  'spirit_single_transcendable', 'spirit_pair', 'spirit_pair_tier3',
]);

const DECK = [
  'january_plain_1', 'february_plain_1', 'march_plain_1', 'april_plain_1',
  'may_plain_1', 'june_plain_1', 'july_plain_1', 'august_plain_1',
  'january_plain_2', 'february_plain_2', 'march_plain_2', 'april_plain_2',
  'may_plain_2', 'june_plain_2', 'july_plain_2', 'august_plain_2',
  'september_plain_1', 'september_plain_2', 'october_plain_1',
  'october_plain_2', 'december_plain_1', 'december_plain_2',
];

describe('F4.15a — universal inputType discriminator', () => {
  it('every consumable handler declares an inputType from the closed set', () => {
    const all = [
      ...ZODIAC_CONSUMABLES, ...WUXING_CONSUMABLES, ...CHAKRA_TOOLS,
      ...STAMPS, ...ALCHEMICAL_CONSUMABLES,
    ];
    for (const def of all) {
      const eff = ConsumableEffects.get(def.id);
      expect(eff, `no handler for ${def.id}`).toBeTruthy();
      expect(KINDS.has(eff.inputType), `${def.id} has inputType '${eff.inputType}'`).toBe(true);
    }
  });

  it('representative discriminator values are correct', () => {
    expect(ConsumableEffects.get('zodiac_pig').inputType).toBe('none');
    expect(ConsumableEffects.get('zodiac_ox').inputType).toBe('slot');
    expect(ConsumableEffects.get('zodiac_monkey').inputType).toBe('slot');
    expect(ConsumableEffects.get('zodiac_snake').inputType).toBe('yaku');
    expect(ConsumableEffects.get('element_water').inputType).toBe('card');
    expect(ConsumableEffects.get('stamp_red').inputType).toBe('card');
    expect(ConsumableEffects.get('chakra_heart').inputType).toBe('card');
    expect(ConsumableEffects.get('chakra_root').inputType).toBe('card_multi');
    expect(ConsumableEffects.get('chakra_crown').inputType).toBe('card_pair');
    expect(ConsumableEffects.get('alch_lead').inputType).toBe('spirit_none');
    expect(ConsumableEffects.get('alch_sulfur').inputType).toBe('spirit_none');
    expect(ConsumableEffects.get('alch_cinnabar').inputType).toBe('spirit_pair');
  });

  // The [FIX] safety premise: discovery (execute with no target) mutates nothing,
  // so dropping the discover-then-execute round-trip loses no state change.
  it('Ox discovery call returns needsTarget without clearing any field slot', () => {
    const { grm } = makeRound({ deckCardIds: DECK });
    const occupiedBefore = grm.field.getSlots().filter(Boolean).length;
    const r = ConsumableEffects.get('zodiac_ox').execute({ roundManager: grm, params: {} });
    expect(r.success).toBe(false);
    expect(r.needsTarget).toBe('slot');
    expect(grm.field.getSlots().filter(Boolean).length).toBe(occupiedBefore);
  });

  it('Snake discovery call returns needsTarget without recording a threshold mod', () => {
    const { grm } = makeRound({ deckCardIds: DECK });
    const r = ConsumableEffects.get('zodiac_snake').execute({ roundManager: grm, params: {} });
    expect(r.success).toBe(false);
    expect(r.needsTarget).toBe('yaku');
    // No threshold mod recorded before a target is chosen (the field may be pre-initialized
    // to {} by round setup; the point is discovery adds no key).
    expect(Object.keys(grm._snakeThresholdMods ?? {}).length).toBe(0);
  });
});
