import type { TagQuota } from "./types";

/**
 * Calcule le bonus de quota pour une recette donnée.
 * 
 * Si la recette possède un tag dont le compteur actuel est inférieur au minimum requis,
 * on ajoute un bonus (plafonné à quotaBonusValue par recette).
 * 
 * On ne cumule pas les bonus de plusieurs tags sous-représentés :
 * dès qu'un tag qualifie, on retourne le bonus.
 */
export function computeQuotaBonus(
  recipeTagIds: string[],
  currentTagCounts: Map<string, number>,
  tagQuotas: TagQuota[],
  quotaBonusValue: number
): number {
  for (const quota of tagQuotas) {
    if (recipeTagIds.includes(quota.tagId)) {
      const currentCount = currentTagCounts.get(quota.tagId) ?? 0;
      if (currentCount < quota.min) {
        return quotaBonusValue;
      }
    }
  }

  return 0;
}

/**
 * Met à jour les compteurs de tags après sélection d'une recette.
 */
export function incrementTagCounts(
  recipeTagIds: string[],
  currentTagCounts: Map<string, number>
): void {
  for (const tagId of recipeTagIds) {
    const current = currentTagCounts.get(tagId) ?? 0;
    currentTagCounts.set(tagId, current + 1);
  }
}
