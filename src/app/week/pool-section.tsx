"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GetPoolResponse, PoolRecipeResponse } from "@/app/api/mealplan/pool/route";

interface PoolSectionProps {
  householdId: string;
  weekStart: string;
  currentMealCount: number;
}

export function PoolSection({
  householdId,
  weekStart,
  currentMealCount,
}: PoolSectionProps) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<PoolRecipeResponse[]>([]);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState<number>(currentMealCount);

  useEffect(() => {
    setTargetPosition(currentMealCount);
  }, [currentMealCount]);

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
        throw new Error(data.error || "Erreur lors de la generation");
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

  const handleAddToPosition = async (recipe: PoolRecipeResponse) => {
    setAddingRecipeId(recipe.recipeId);

    try {
      const res = await fetch("/api/mealplan/slot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          weekStart,
          position: targetPosition,
          recipeId: recipe.recipeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'ajout");
      }

      setTargetPosition((p) => p + 1);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setAddingRecipeId(null);
    }
  };

  const busy = loading || clearing;

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
        Pool de recettes (suggestions)
      </h2>

      <p
        style={{
          margin: "0 0 1rem",
          fontSize: "0.85rem",
          color: "#666",
        }}
      >
        Generez des suggestions et ajoutez-les a votre liste de repas.
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
          <span style={{ fontSize: "0.9rem" }}>Suggestions :</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(20, Number(e.target.value))))
            }
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
          {loading ? "Generation..." : `Generer ${count} suggestions`}
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
            {clearing ? "Suppression..." : "Vider"}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "#555" }}>
              Ajouter a la position :
            </span>
            <input
              type="number"
              min={0}
              value={targetPosition}
              onChange={(e) => setTargetPosition(Math.max(0, Number(e.target.value)))}
              style={{
                width: "4rem",
                padding: "0.3rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "0.85rem",
              }}
            />
          </div>

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
                  onClick={() => handleAddToPosition(recipe)}
                  disabled={addingRecipeId === recipe.recipeId}
                  style={{
                    padding: "0.35rem 0.75rem",
                    background:
                      addingRecipeId === recipe.recipeId ? "#ccc" : "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                      addingRecipeId === recipe.recipeId ? "wait" : "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  {addingRecipeId === recipe.recipeId
                    ? "..."
                    : `Ajouter (#${targetPosition + 1})`}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {recipes.length === 0 && !loading && (
        <p style={{ color: "#888", fontSize: "0.9rem", margin: 0 }}>
          Aucune suggestion. Generez-en pour commencer.
        </p>
      )}
    </section>
  );
}
