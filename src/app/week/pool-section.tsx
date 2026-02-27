"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SlotPicker } from "@/app/recipes/slot-picker";
import type { MealSlot } from "@/lib/mealplan/types";
import type { GetPoolResponse, PoolRecipeResponse } from "@/app/api/mealplan/pool/route";

interface PoolSectionProps {
  householdId: string;
  weekStart: string;
}

export function PoolSection({ householdId, weekStart }: PoolSectionProps) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<PoolRecipeResponse[]>([]);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerRecipe, setPickerRecipe] = useState<PoolRecipeResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/mealplan/pool?householdId=${householdId}&weekStart=${weekStart}`
      );
      if (res.ok) {
        const data: GetPoolResponse = await res.json();
        setRecipes(data.recipes);
      }
    } catch (err) {
      console.error("Failed to fetch pool:", err);
    }
  }, [householdId, weekStart]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/mealplan/pool/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, weekStart, count }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }

      const data = await res.json();
      setRecipes(data.recipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Vider la pool de recettes ?")) return;

    setClearing(true);
    setError(null);

    try {
      const res = await fetch("/api/mealplan/pool/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, weekStart }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      setRecipes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setClearing(false);
    }
  };

  const handlePick = async (dayIndex: number, mealSlot: MealSlot) => {
    if (!pickerRecipe) return;

    setSaving(true);

    try {
      const res = await fetch("/api/mealplan/slot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          weekStart,
          dayIndex,
          mealSlot,
          recipeId: pickerRecipe.recipeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'ajout");
      }

      setPickerRecipe(null);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || clearing;
  const estimatedMeals = recipes.length * 4;

  return (
    <section
      style={{
        margin: "1.5rem 0",
        padding: "1rem",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        background: "#fafafa",
      }}
    >
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
        Pool de recettes
      </h2>

      <p
        style={{
          margin: "0 0 1rem",
          fontSize: "0.85rem",
          color: "#666",
        }}
      >
        1 recette = 4 repas (2 midis + 2 soirs)
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem" }}>Nombre :</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
            disabled={busy}
            style={{
              width: "4rem",
              padding: "0.4rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          />
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          style={{
            padding: "0.5rem 1rem",
            background: busy ? "#ccc" : "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: busy ? "wait" : "pointer",
            fontSize: "0.9rem",
          }}
        >
          {loading ? "Génération…" : `Générer ${count} recettes`}
        </button>

        {recipes.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={busy}
            style={{
              padding: "0.5rem 1rem",
              background: busy ? "#ccc" : "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: busy ? "wait" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            {clearing ? "Suppression…" : "Vider la pool"}
          </button>
        )}
      </div>

      {error && (
        <p style={{ color: "#dc3545", fontSize: "0.9rem", margin: "0 0 1rem" }}>
          {error}
        </p>
      )}

      {recipes.length > 0 && (
        <>
          <p
            style={{
              margin: "0 0 0.75rem",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            {recipes.length} recette{recipes.length > 1 ? "s" : ""} ≈{" "}
            {estimatedMeals} repas
          </p>

          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {recipes.map((recipe) => (
              <li
                key={recipe.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: "4px",
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{recipe.title}</span>
                  {recipe.tags.length > 0 && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "0.8rem",
                        color: "#888",
                      }}
                    >
                      ({recipe.tags.join(", ")})
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPickerRecipe(recipe)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    background: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Ajouter à un slot
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {recipes.length === 0 && !loading && (
        <p style={{ color: "#888", fontSize: "0.9rem", margin: 0 }}>
          Aucune recette dans la pool. Générez-en pour commencer.
        </p>
      )}

      {pickerRecipe && (
        <SlotPicker
          recipeTitle={pickerRecipe.title}
          weekStart={weekStart}
          saving={saving}
          onPick={handlePick}
          onClose={() => setPickerRecipe(null)}
        />
      )}
    </section>
  );
}
