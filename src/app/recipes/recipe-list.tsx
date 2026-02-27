"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { MealSlot } from "@/lib/mealplan/types";
import { getCurrentMondayString } from "@/lib/mealplan/utils";
import { SlotPicker } from "./slot-picker";

const HOUSEHOLD_ID = "home-household";

interface RecipeRow {
  id: string;
  title: string;
  tags: string[];
  prepTime: number | null;
  cookTime: number | null;
  ingredientCount: number;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function RecipeList({ recipes }: { recipes: RecipeRow[] }) {
  const [pickerRecipe, setPickerRecipe] = useState<RecipeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ recipeId: string; text: string } | null>(null);

  const handlePick = useCallback(
    async (dayIndex: number, mealSlot: MealSlot) => {
      if (!pickerRecipe) return;
      setSaving(true);

      try {
        const res = await fetch("/api/mealplan/slot", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            weekStart: getCurrentMondayString(),
            dayIndex,
            mealSlot,
            recipeId: pickerRecipe.id,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as { error?: string } | null)?.error ?? `Erreur ${res.status}`,
          );
        }

        const savedId = pickerRecipe.id;
        setPickerRecipe(null);
        setFeedback({ recipeId: savedId, text: "Ajouté !" });
        setTimeout(() => setFeedback(null), 2500);
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Impossible d\u2019enregistrer");
      } finally {
        setSaving(false);
      }
    },
    [pickerRecipe],
  );

  if (recipes.length === 0) {
    return <p style={{ color: "#888" }}>Aucune recette disponible.</p>;
  }

  return (
    <>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {recipes.map((recipe) => {
          const totalTime =
            (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0) || null;

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
                  {recipe.tags.length > 0 && <span>{recipe.tags.join(", ")}</span>}
                  {recipe.tags.length > 0 && totalTime && <span> · </span>}
                  {totalTime && <span>{formatTime(totalTime)}</span>}
                  {(recipe.tags.length > 0 || totalTime) && <span> · </span>}
                  <span>
                    {recipe.ingredientCount} ingrédient
                    {recipe.ingredientCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {feedback?.recipeId === recipe.id && (
                  <span style={{ fontSize: "0.8rem", color: "#2a7" }}>
                    {feedback.text}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPickerRecipe(recipe)}
                  style={{
                    padding: "0.3rem 0.7rem",
                    fontSize: "0.85rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    background: "#fff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Ajouter
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {pickerRecipe && (
        <SlotPicker
          recipeTitle={pickerRecipe.title}
          weekStart={getCurrentMondayString()}
          saving={saving}
          onPick={handlePick}
          onClose={() => setPickerRecipe(null)}
        />
      )}
    </>
  );
}
