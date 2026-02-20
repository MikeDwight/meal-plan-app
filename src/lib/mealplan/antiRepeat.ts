import type { HistoryEntry, LeftoversOverrideResolved } from "./types";

/**
 * Calcule la pénalité anti-répétition pour une recette donnée.
 * 
 * Formule: penalty = basePenalty * (decay ^ (weeksAgo - 1))
 * 
 * Si leftoversOverride est activé et que pantryCoverageRatio >= minPantryCoverageRatio,
 * alors: penalty *= penaltyMultiplierWhenCovered
 * 
 * On cumule les pénalités si la recette apparaît plusieurs fois dans l'historique.
 */
export function computeAntiRepeatPenalty(
  recipeId: string,
  history: HistoryEntry[],
  basePenalty: number,
  decay: number,
  leftoversOverride: LeftoversOverrideResolved,
  pantryCoverageRatio: number
): number {
  const recipeHistory = history.filter((h) => h.recipeId === recipeId);

  if (recipeHistory.length === 0) {
    return 0;
  }

  let totalPenalty = 0;

  for (const entry of recipeHistory) {
    let penalty = basePenalty * Math.pow(decay, entry.weeksAgo - 1);

    if (
      leftoversOverride.enabled &&
      pantryCoverageRatio >= leftoversOverride.minPantryCoverageRatio
    ) {
      penalty *= leftoversOverride.penaltyMultiplierWhenCovered;
    }

    totalPenalty += penalty;
  }

  return totalPenalty;
}
