"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface RecipeOption {
  id: string;
  title: string;
  tags: string[];
}

interface RecipePickerProps {
  householdId: string;
  weekStart: string;
  position: number;
  onSelect: (recipe: RecipeOption) => void;
  onClose: () => void;
}

export function RecipePicker({
  householdId,
  weekStart,
  position,
  onSelect,
  onClose,
}: RecipePickerProps) {
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/recipes?householdId=${encodeURIComponent(householdId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json() as Promise<RecipeOption[]>;
      })
      .then((data) => { if (!cancelled) setRecipes(data); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de chargement"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
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
          body: JSON.stringify({ householdId, weekStart, position, recipeId: recipe.id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body as { error?: string } | null)?.error ?? `Erreur ${res.status}`);
        }
        onSelect(recipe);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Impossible d'enregistrer");
      } finally {
        setSaving(false);
      }
    },
    [householdId, weekStart, position, onSelect]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [recipes]);

  const filtered = useMemo(() => {
    let result = recipes;
    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)));
    }
    if (activeTag) {
      result = result.filter((r) => r.tags.includes(activeTag));
    }
    return result;
  }, [recipes, filter, activeTag]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#f6f8f7", borderRadius: "0.75rem", width: "min(28rem, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem", borderBottom: "1px solid rgba(71,235,191,0.15)" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
            Repas #{position + 1}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ width: "2.5rem", height: "2.5rem", borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(71,235,191,0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>close</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "1rem 1rem 0" }}>
          <div style={{ position: "relative" }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", color: "#47ebbf", pointerEvents: "none" }}>search</span>
            <input
              type="text"
              placeholder="Filtrer…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
              style={{ width: "100%", height: "3rem", paddingLeft: "2.75rem", paddingRight: "1rem", background: "rgba(71,235,191,0.06)", border: "2px solid transparent", borderRadius: "0.75rem", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(71,235,191,0.3)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1rem", overflowX: "auto", scrollbarWidth: "none" }}>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              style={{ flexShrink: 0, height: "2.25rem", padding: "0 1rem", borderRadius: "999px", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, background: activeTag === null ? "#47ebbf" : "rgba(71,235,191,0.12)", color: activeTag === null ? "#0f172a" : "#475569", transition: "all 0.15s" }}
            >
              Tout
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={{ flexShrink: 0, height: "2.25rem", padding: "0 1rem", borderRadius: "999px", border: "1px solid rgba(71,235,191,0.25)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, background: activeTag === tag ? "#47ebbf" : "rgba(71,235,191,0.1)", color: activeTag === tag ? "#0f172a" : "#475569", transition: "all 0.15s" }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Recipe list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {error && (
            <p style={{ color: "#b91c1c", fontSize: "0.85rem", margin: 0 }}>{error}</p>
          )}

          {loading && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>Chargement…</p>
          )}

          {!loading && filtered.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>Aucune recette trouvée.</p>
          )}

          {!loading && filtered.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              disabled={saving}
              onClick={() => handlePick(recipe)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#fff", border: "1px solid rgba(71,235,191,0.08)", borderRadius: "0.75rem", cursor: saving ? "wait" : "pointer", textAlign: "left", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "rgba(71,235,191,0.4)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(71,235,191,0.12)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "rgba(71,235,191,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem", color: "#0f172a", lineHeight: 1.3 }}>{recipe.title}</p>
                {recipe.tags.length > 0 && (
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>{recipe.tags.join(", ")}</p>
                )}
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#47ebbf", flexShrink: 0, opacity: 0.7 }}>chevron_right</span>
            </button>
          ))}
        </div>

        {/* Bottom accent */}
        <div style={{ height: "0.375rem", background: "rgba(71,235,191,0.2)", flexShrink: 0 }} />
      </div>
    </div>
  );
}
