import type { RecipeWithRelations, PantryItemData } from "./types";

/**
 * Calcule le ratio de couverture du garde-manger pour une recette.
 * = nombre d'ingrédients de la recette présents dans le pantry / total ingrédients recette
 * 
 * Si la recette n'a pas d'ingrédients, retourne 0.
 */
export function computePantryCoverage(
  recipe: RecipeWithRelations,
  pantryItems: PantryItemData[]
): number {
  const recipeIngredientIds = recipe.ingredients.map((i) => i.ingredientId);

  if (recipeIngredientIds.length === 0) {
    return 0;
  }

  const pantryIngredientIds = new Set(pantryItems.map((p) => p.ingredientId));

  const coveredCount = recipeIngredientIds.filter((id) =>
    pantryIngredientIds.has(id)
  ).length;

  return coveredCount / recipeIngredientIds.length;
}
