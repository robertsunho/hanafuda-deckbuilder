// ─────────────────────────────────────────────────────────────────────────────
// fusionRecipes.js — spirit fusion recipe registry
//
// Each recipe: { input: [idA, idB], output: fusedId }
// Input order does not matter — helpers sort before comparing.
//
// Fusion is only available at the Sacred Grove.  No ki cost — the cost was
// acquiring both input spirits.  The two input spirits are consumed and
// replaced by one fused spirit, freeing one spirit slot.
// ─────────────────────────────────────────────────────────────────────────────

export const FUSION_RECIPES = [
  // Seasonal fusions
  { input: ['spring_pollen',   'spring_bees'],      output: 'fusion_bloom'        },
  { input: ['summer_heat',     'summer_humidity'],  output: 'fusion_thunderstorm' },
  { input: ['autumn_harvest',  'autumn_leaves'],    output: 'fusion_decay'        },
  { input: ['winter_cold',     'winter_aridity'],   output: 'fusion_blizzard'     },
  // Axis fusions
  { input: ['sky_clouds',      'sky_wind'],         output: 'fusion_atmosphere'   },
  { input: ['land_soil',       'land_rock'],        output: 'fusion_continent'    },
  { input: ['day_light',       'day_movement'],     output: 'fusion_sun'          },
  { input: ['night_dark',      'night_stillness'],  output: 'fusion_moon'         },
];

/**
 * Find the fusion recipe for two spirit IDs (order-independent).
 * @param {string} spiritIdA
 * @param {string} spiritIdB
 * @returns {object|undefined}  The matching recipe, or undefined if none.
 */
export function findFusionRecipe(spiritIdA, spiritIdB) {
  const [a, b] = [spiritIdA, spiritIdB].sort();
  return FUSION_RECIPES.find(recipe => {
    const [x, y] = [...recipe.input].sort();
    return a === x && b === y;
  });
}

/**
 * Return all fusion recipes that can be performed with the given spirit IDs.
 * @param {string[]} equippedSpiritIds
 * @returns {object[]}
 */
export function getAvailableFusions(equippedSpiritIds) {
  return FUSION_RECIPES.filter(recipe =>
    recipe.input.every(id => equippedSpiritIds.includes(id))
  );
}
