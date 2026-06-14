import { describe, it, expect } from 'vitest';
import run from '../../src/systems/RunManager.js';
import ConsumableEffects from '../../src/systems/ConsumableEffects.js';

// F4 Cinnabar single-op [FIX]: one alchemical use = one fusion, regardless of input
// stack depth. A 2-stack fusion_sun + 2-stack fusion_atmosphere now yields a SINGLETON
// cross_yang, leaving singleton sun + singleton atmosphere. (Was: Math.min batching —
// a 2-stack fusion with both inputs emptied.) Recipe per fusionRecipes.js:
// fusion_atmosphere + fusion_sun → cross_yang (tier 3). The batching was test-blind.

const cinnabar = (i, j) =>
  ConsumableEffects.get('alch_cinnabar').execute({ params: { spiritIndices: [i, j] } });

describe('Cinnabar fuses exactly one stack per use (one-op ruling)', () => {
  it('2-stack + 2-stack → singleton fusion + singleton leftovers (the [FIX])', () => {
    run.reset();
    run._acquireSpiritStack({ id: 'fusion_sun', name: 'Sun' }, 2, { skipSlotCheck: true });
    run._acquireSpiritStack({ id: 'fusion_atmosphere', name: 'Atmosphere' }, 2, { skipSlotCheck: true });

    const iSun = run.spirits.findIndex(s => s.id === 'fusion_sun');
    const iAtm = run.spirits.findIndex(s => s.id === 'fusion_atmosphere');
    const r = cinnabar(iSun, iAtm);

    expect(r.success).toBe(true);
    const yang = run.spirits.find(s => s.id === 'cross_yang');
    expect(yang).toBeDefined();
    expect(yang.stackCount ?? 1).toBe(1);                                  // singleton fusion (was 2)
    expect(run.spirits.find(s => s.id === 'fusion_sun').stackCount).toBe(1);        // leftover singleton (was removed)
    expect(run.spirits.find(s => s.id === 'fusion_atmosphere').stackCount).toBe(1); // leftover singleton (was removed)
  });

  it('1-stack + 1-stack → one fusion, both inputs consumed (common path, must not regress)', () => {
    run.reset();
    run._acquireSpiritStack({ id: 'fusion_sun', name: 'Sun' }, 1, { skipSlotCheck: true });
    run._acquireSpiritStack({ id: 'fusion_atmosphere', name: 'Atmosphere' }, 1, { skipSlotCheck: true });

    const iSun = run.spirits.findIndex(s => s.id === 'fusion_sun');
    const iAtm = run.spirits.findIndex(s => s.id === 'fusion_atmosphere');
    const r = cinnabar(iSun, iAtm);

    expect(r.success).toBe(true);
    expect(run.spirits.find(s => s.id === 'cross_yang')?.stackCount ?? 1).toBe(1);
    expect(run.spirits.find(s => s.id === 'fusion_sun')).toBeUndefined();        // consumed
    expect(run.spirits.find(s => s.id === 'fusion_atmosphere')).toBeUndefined();  // consumed
  });
});
