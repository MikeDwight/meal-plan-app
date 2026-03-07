"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentMondayString } from "@/lib/mealplan/utils";

const HOUSEHOLD_ID = "home-household";

interface RecipeRow {
  id: string;
  title: string;
  tags: string[];
  ingredientCount: number;
}

export function RecipeList({ recipes }: { recipes: RecipeRow[] }) {
  const router = useRouter();
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    recipeId: string;
    text: string;
    isError?: boolean;
  } | null>(null);

  const handleAddToList = useCallback(
    async (recipe: RecipeRow) => {
      setAddingRecipeId(recipe.id);
      setFeedback(null);

      const weekStart = getCurrentMondayString();

      try {
        const planRes = await fetch(
          `/api/mealplan?householdId=${encodeURIComponent(HOUSEHOLD_ID)}&weekStart=${encodeURIComponent(weekStart)}`
        );

        let position = 0;
        if (planRes.ok) {
          const planData = await planRes.json();
          position = planData.items?.length ?? 0;
        }

        const res = await fetch("/api/mealplan/slot", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            weekStart,
            position,
            recipeId: recipe.id,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as { error?: string } | null)?.error ?? `Erreur ${res.status}`
          );
        }

        setFeedback({ recipeId: recipe.id, text: "Ajoute !" });
        setTimeout(() => setFeedback(null), 2500);

        router.refresh();
      } catch (e: unknown) {
        setFeedback({
          recipeId: recipe.id,
          text: e instanceof Error ? e.message : "Erreur",
          isError: true,
        });
        setTimeout(() => setFeedback(null), 3000);
      } finally {
        setAddingRecipeId(null);
      }
    },
    [router]
  );

  if (recipes.length === 0) {
    return <p style={{ color: "#888" }}>Aucune recette disponible.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {recipes.map((recipe) => {
        const isAdding = addingRecipeId === recipe.id;
        const recipeFeedback =
          feedback?.recipeId === recipe.id ? feedback : null;

        return (
          <li
            key={recipe.id}
            style={{
              padding: "0.75rem 0",
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <div style={{ flex: 1 }}>
              <Link
                href={`/recipes/${recipe.id}`}
                style={{ fontWeight: 600, fontSize: "1.05rem" }}
              >
                {recipe.title}
              </Link>

              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                  marginTop: "0.25rem",
                }}
              >
                {recipe.tags.length > 0 && (
                  <span>{recipe.tags.join(", ")}</span>
                )}
                {recipe.tags.length > 0 && <span> · </span>}
                <span>
                  {recipe.ingredientCount} ingredient
                  {recipe.ingredientCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {recipeFeedback && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: recipeFeedback.isError ? "#c44" : "#2a7",
                  }}
                >
                  {recipeFeedback.text}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleAddToList(recipe)}
                disabled={isAdding}
                style={{
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.85rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  background: isAdding ? "#f5f5f5" : "#fff",
                  cursor: isAdding ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isAdding ? "..." : "+ Ajouter"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
