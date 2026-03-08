"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentMondayString } from "@/lib/mealplan/utils";

const HOUSEHOLD_ID = "home-household";

const TAG_PALETTE = [
  { bg: "rgba(71,235,191,0.2)", text: "#0f766e" },
  { bg: "rgba(186,230,253,0.6)", text: "#0369a1" },
  { bg: "rgba(254,240,138,0.6)", text: "#854d0e" },
  { bg: "rgba(251,207,232,0.6)", text: "#9d174d" },
  { bg: "rgba(221,214,254,0.6)", text: "#5b21b6" },
];

function getTagColor(tag: string) {
  const idx = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_PALETTE.length;
  return TAG_PALETTE[idx];
}

interface RecipeRow {
  id: string;
  title: string;
  tags: string[];
  ingredientCount: number;
}

export function RecipeList({ recipes }: { recipes: RecipeRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ recipeId: string; text: string; isError?: boolean } | null>(null);

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
          body: JSON.stringify({ householdId: HOUSEHOLD_ID, weekStart, position, recipeId: recipe.id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body as { error?: string } | null)?.error ?? `Erreur ${res.status}`);
        }
        setFeedback({ recipeId: recipe.id, text: "Ajouté !" });
        setTimeout(() => setFeedback(null), 2500);
        router.refresh();
      } catch (e: unknown) {
        setFeedback({ recipeId: recipe.id, text: e instanceof Error ? e.message : "Erreur", isError: true });
        setTimeout(() => setFeedback(null), 3000);
      } finally {
        setAddingRecipeId(null);
      }
    },
    [router]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(
      (r) => r.title.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [recipes, search]);

  return (
    <>
      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "0.75rem" }}>
        <span
          className="material-symbols-outlined"
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "1.1rem",
            color: "#94a3b8",
            pointerEvents: "none",
          }}
        >
          search
        </span>
        <input
          type="search"
          placeholder="Rechercher par titre ou tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            paddingLeft: "2.5rem",
            paddingRight: "0.75rem",
            paddingTop: "0.75rem",
            paddingBottom: "0.75rem",
            fontSize: "0.875rem",
            background: "#fff",
            border: "none",
            borderRadius: "0.75rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Nouvelle recette button */}
      <Link
        href="/recipes/new"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          background: "#47ebbf",
          color: "#0f172a",
          fontWeight: 700,
          fontSize: "0.95rem",
          padding: "0.875rem",
          borderRadius: "0.75rem",
          textDecoration: "none",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 12px rgba(71,235,191,0.3)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>add_circle</span>
        Nouvelle recette
      </Link>

      {/* Empty states */}
      {recipes.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍳</div>
          <p style={{ fontWeight: 600, color: "#475569", margin: "0 0 0.25rem" }}>Aucune recette</p>
          <p style={{ fontSize: "0.875rem", margin: 0 }}>Créez votre première recette.</p>
        </div>
      )}

      {recipes.length > 0 && filtered.length === 0 && (
        <p style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", padding: "1rem 0" }}>
          Aucune recette ne correspond à « {search} ».
        </p>
      )}

      {/* Recipe cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtered.map((recipe) => {
          const isAdding = addingRecipeId === recipe.id;
          const recipeFeedback = feedback?.recipeId === recipe.id ? feedback : null;

          return (
            <div
              key={recipe.id}
              style={{
                background: "#fff",
                borderRadius: "0.75rem",
                border: "1px solid rgba(71,235,191,0.08)",
                boxShadow: "0 4px 20px -2px rgba(71,235,191,0.08)",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              {/* Title row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#0f172a",
                    textDecoration: "none",
                    lineHeight: 1.35,
                    flex: 1,
                  }}
                >
                  {recipe.title}
                </Link>
                <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", color: "#cbd5e1", flexShrink: 0 }}>
                  chevron_right
                </span>
              </div>

              {/* Tags */}
              {recipe.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  {recipe.tags.map((tag) => {
                    const { bg, text } = getTagColor(tag);
                    return (
                      <span
                        key={tag}
                        style={{
                          padding: "0.15rem 0.625rem",
                          borderRadius: "999px",
                          background: bg,
                          color: text,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Footer: ingredient count + add button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>grocery</span>
                  {recipe.ingredientCount} ingrédient{recipe.ingredientCount !== 1 ? "s" : ""}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {recipeFeedback && (
                    <span style={{ fontSize: "0.75rem", color: recipeFeedback.isError ? "#ef4444" : "#16a34a" }}>
                      {recipeFeedback.text}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAddToList(recipe)}
                    disabled={isAdding}
                    style={{
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      border: "1px solid #e2e8f0",
                      borderRadius: "999px",
                      background: isAdding ? "#f1f5f9" : "#fff",
                      color: "#475569",
                      cursor: isAdding ? "wait" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isAdding ? "…" : "+ Semaine"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
