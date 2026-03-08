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
    <section style={{ marginTop: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
          Suggestions
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
            disabled={busy}
            style={{
              width: "3.5rem",
              padding: "0.35rem 0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "999px",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "999px",
              border: "1.5px solid #22c55e",
              background: "transparent",
              color: "#22c55e",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {loading ? "…" : "Générer"}
          </button>
          {recipes.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={busy}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "999px",
                border: "1.5px solid #d1d5db",
                background: "transparent",
                color: "#6b7280",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {clearing ? "…" : "Vider"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>
          {error}
        </p>
      )}

      {recipes.length === 0 && !loading && (
        <div style={{
          padding: "1.5rem",
          textAlign: "center",
          background: "#fff",
          borderRadius: "12px",
          border: "2px dashed #d1d5db",
          color: "#9ca3af",
          fontSize: "0.875rem",
        }}>
          Aucune suggestion — cliquez sur « Générer » pour commencer.
        </div>
      )}

      {recipes.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
          {recipes.map((recipe) => {
            const isAdding = addingRecipeId === recipe.recipeId;
            const TAG_PALETTE = [
              { bg: "#fef9c3", text: "#854d0e" },
              { bg: "#f3e8ff", text: "#6b21a8" },
              { bg: "#d1fae5", text: "#065f46" },
            ];
            function getTagColor(tag: string) {
              const idx = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_PALETTE.length;
              return TAG_PALETTE[idx];
            }
            return (
              <div
                key={recipe.id}
                style={{
                  flexShrink: 0,
                  width: "10rem",
                  background: "#fff",
                  borderRadius: "0.75rem",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
                  padding: "0.875rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                  {recipe.title}
                </div>

                {recipe.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {recipe.tags.slice(0, 2).map((tag) => {
                      const { bg, text } = getTagColor(tag);
                      return (
                        <span
                          key={tag}
                          style={{
                            padding: "0.125rem 0.4rem",
                            borderRadius: "0.375rem",
                            background: bg,
                            color: text,
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleAddToPosition(recipe)}
                  disabled={isAdding}
                  style={{
                    marginTop: "auto",
                    padding: "0.4rem 0",
                    borderRadius: "999px",
                    border: "none",
                    background: isAdding ? "#d1d5db" : "#22c55e",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: isAdding ? "wait" : "pointer",
                  }}
                >
                  {isAdding ? "…" : "+ Ajouter"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
