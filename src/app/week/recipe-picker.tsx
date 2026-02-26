"use client";

import { useState, useEffect, useCallback } from "react";
import type { MealSlot } from "@/lib/mealplan/types";

interface RecipeOption {
  id: string;
  title: string;
  tags: string[];
}

interface RecipePickerProps {
  householdId: string;
  weekStart: string;
  dayIndex: number;
  mealSlot: MealSlot;
  dayLabel: string;
  mealLabel: string;
  onSelect: (recipe: RecipeOption) => void;
  onClose: () => void;
}

export function RecipePicker({
  householdId,
  weekStart,
  dayIndex,
  mealSlot,
  dayLabel,
  mealLabel,
  onSelect,
  onClose,
}: RecipePickerProps) {
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/recipes?householdId=${encodeURIComponent(householdId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json() as Promise<RecipeOption[]>;
      })
      .then((data) => {
        if (!cancelled) setRecipes(data);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [householdId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handlePick = useCallback(
    async (recipe: RecipeOption) => {
      setSaving(true);
      setError(null);

      try {
        const res = await fetch("/api/mealplan/slot", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdId,
            weekStart,
            dayIndex,
            mealSlot,
            recipeId: recipe.id,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as { error?: string } | null)?.error ??
              `Erreur ${res.status}`,
          );
        }

        onSelect(recipe);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : "Impossible d\u2019enregistrer",
        );
      } finally {
        setSaving(false);
      }
    },
    [householdId, weekStart, dayIndex, mealSlot, onSelect],
  );

  const filtered = filter
    ? recipes.filter((r) =>
        r.title.toLowerCase().includes(filter.toLowerCase()),
      )
    : recipes;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "1.25rem",
          width: "min(26rem, 90vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1rem" }}>
            {dayLabel} — {mealLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="Filtrer…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: "0.4rem 0.6rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            marginBottom: "0.75rem",
            fontSize: "0.9rem",
          }}
        />

        {error && (
          <p style={{ color: "#c44", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
            {error}
          </p>
        )}

        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && <p style={{ color: "#888" }}>Chargement…</p>}

          {!loading && filtered.length === 0 && (
            <p style={{ color: "#888" }}>Aucune recette trouvée.</p>
          )}

          {!loading &&
            filtered.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                disabled={saving}
                onClick={() => handlePick(recipe)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.6rem",
                  marginBottom: "0.25rem",
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  background: saving ? "#f5f5f5" : "#fff",
                  cursor: saving ? "wait" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                <span style={{ fontWeight: 500 }}>{recipe.title}</span>
                {recipe.tags.length > 0 && (
                  <span
                    style={{
                      color: "#888",
                      fontSize: "0.75rem",
                      marginLeft: "0.5rem",
                    }}
                  >
                    {recipe.tags.join(", ")}
                  </span>
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
