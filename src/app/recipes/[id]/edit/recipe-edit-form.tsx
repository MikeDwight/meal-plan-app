"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const HOUSEHOLD_ID_CLIENT = "home-household";

interface Tag { id: string; name: string; }
interface Unit { id: string; abbr: string; }
interface IngredientLine {
  ingredientId: string;
  ingredientName: string;
  quantity: string;
  unitId: string;
  notes: string;
}
interface IngredientSuggestion {
  id: string;
  name: string;
  defaultUnitId: string | null;
  defaultAisleId: string | null;
}

interface InitialData {
  id: string;
  title: string;
  servings: number | null;
  prepTime: number | null;
  cookTime: number | null;
  instructions: string;
  notes: string;
  tagIds: string[];
  ingredients: IngredientLine[];
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "0.95rem",
  width: "100%",
};
const selectStyle: React.CSSProperties = { ...inputStyle, background: "#fff" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: "0.25rem", fontWeight: 500, fontSize: "0.9rem" };
const sectionStyle: React.CSSProperties = { marginBottom: "1.5rem" };

export function RecipeEditForm({
  householdId,
  initialData,
  tags,
  units,
}: {
  householdId: string;
  initialData: InitialData;
  tags: Tag[];
  units: Unit[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData.title);
  const [servings, setServings] = useState(initialData.servings != null ? String(initialData.servings) : "");
  const [prepTime, setPrepTime] = useState(initialData.prepTime != null ? String(initialData.prepTime) : "");
  const [cookTime, setCookTime] = useState(initialData.cookTime != null ? String(initialData.cookTime) : "");
  const [instructions, setInstructions] = useState(initialData.instructions);
  const [notes, setNotes] = useState(initialData.notes);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(initialData.tagIds));
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>(
    initialData.ingredients.length > 0
      ? initialData.ingredients
      : [{ ingredientId: "", ingredientName: "", quantity: "", unitId: "", notes: "" }]
  );

  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
      return next;
    });
  }, []);

  const updateIngredientLine = useCallback((index: number, field: keyof IngredientLine, value: string) => {
    setIngredientLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addIngredientLine = useCallback(() => {
    setIngredientLines((prev) => [...prev, { ingredientId: "", ingredientName: "", quantity: "", unitId: "", notes: "" }]);
  }, []);

  const removeIngredientLine = useCallback((index: number) => {
    setIngredientLines((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  }, []);

  const searchIngredients = useCallback(async (query: string) => {
    if (!query.trim()) { setIngredientSuggestions([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/ingredients?householdId=${HOUSEHOLD_ID_CLIENT}&q=${encodeURIComponent(query.trim())}&limit=10`);
      if (res.ok) setIngredientSuggestions(await res.json());
    } catch { /* ignore */ } finally { setIsSearching(false); }
  }, []);

  const handleIngredientInputChange = useCallback((index: number, value: string) => {
    setIngredientLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ingredientName: value, ingredientId: "" };
      return next;
    });
    setActiveLineIndex(index);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchIngredients(value), 300);
  }, [searchIngredients]);

  const handleSelectSuggestion = useCallback((index: number, suggestion: IngredientSuggestion) => {
    setIngredientLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ingredientId: suggestion.id,
        ingredientName: suggestion.name,
        unitId: next[index].unitId || suggestion.defaultUnitId || "",
      };
      return next;
    });
    setActiveLineIndex(null);
    setIngredientSuggestions([]);
  }, []);

  const handleCreateIngredient = useCallback(async (index: number, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: HOUSEHOLD_ID_CLIENT, name: trimmedName }),
      });
      if (res.ok) {
        const created: IngredientSuggestion = await res.json();
        setIngredientLines((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            ingredientId: created.id,
            ingredientName: created.name,
            unitId: next[index].unitId || created.defaultUnitId || "",
          };
          return next;
        });
      }
    } catch { /* ignore */ } finally {
      setActiveLineIndex(null);
      setIngredientSuggestions([]);
    }
  }, []);

  const handleIngredientInputFocus = useCallback((index: number) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setActiveLineIndex(index);
  }, []);

  const handleIngredientInputBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setActiveLineIndex(null);
      setIngredientSuggestions([]);
    }, 150);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError("Le titre est requis."); return; }

    const validIngredients = ingredientLines.filter(
      (line) => line.ingredientId && line.quantity && Number(line.quantity) > 0
    );
    if (validIngredients.length === 0) {
      setError("Au moins un ingrédient avec une quantité > 0 est requis.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/recipes/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          title: trimmedTitle,
          servings: servings === "" ? null : Number(servings),
          prepTime: prepTime === "" ? null : Number(prepTime),
          cookTime: cookTime === "" ? null : Number(cookTime),
          instructions: instructions.trim() || null,
          notes: notes.trim() || null,
          tagIds: Array.from(selectedTagIds),
          ingredients: validIngredients.map((line) => ({
            ingredientId: line.ingredientId,
            quantity: Number(line.quantity),
            unitId: line.unitId === "" ? null : line.unitId,
            notes: line.notes.trim() || null,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string } | null)?.error ?? `Erreur ${res.status}`);
      }

      router.push(`/recipes/${initialData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ padding: "0.75rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "4px", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>Titre <span style={{ color: "#c00" }}>*</span></label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ ...sectionStyle, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Portions</label>
          <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Préparation (min)</label>
          <input type="number" min="0" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Cuisson (min)</label>
          <input type="number" min="0" value={cookTime} onChange={(e) => setCookTime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Tags</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {tags.map((tag) => (
            <label key={tag.id} style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", background: selectedTagIds.has(tag.id) ? "#dbeafe" : "#f3f4f6", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem" }}>
              <input type="checkbox" checked={selectedTagIds.has(tag.id)} onChange={() => toggleTag(tag.id)} />
              {tag.name}
            </label>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Ingrédients <span style={{ color: "#c00" }}>*</span></label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {ingredientLines.map((line, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.5fr auto", gap: "0.5rem", alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Rechercher un ingrédient..."
                  value={line.ingredientName}
                  onChange={(e) => handleIngredientInputChange(index, e.target.value)}
                  onFocus={() => handleIngredientInputFocus(index)}
                  onBlur={handleIngredientInputBlur}
                  style={{ ...inputStyle, borderColor: line.ingredientId ? "#22c55e" : "#ccc" }}
                />
                {activeLineIndex === index && (ingredientSuggestions.length > 0 || line.ingredientName.trim()) && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #ccc", borderTop: "none", borderRadius: "0 0 4px 4px", maxHeight: "200px", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                    {isSearching && <div style={{ padding: "0.5rem", color: "#888", fontSize: "0.85rem" }}>Recherche...</div>}
                    {!isSearching && ingredientSuggestions.map((s) => (
                      <button key={s.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelectSuggestion(index, s)}
                        style={{ display: "block", width: "100%", padding: "0.5rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {s.name}
                      </button>
                    ))}
                    {!isSearching && line.ingredientName.trim() && !ingredientSuggestions.some((s) => s.name.toLowerCase() === line.ingredientName.trim().toLowerCase()) && (
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleCreateIngredient(index, line.ingredientName)}
                        style={{ display: "block", width: "100%", padding: "0.5rem", textAlign: "left", background: "#dbeafe", border: "none", borderTop: "1px solid #ccc", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, color: "#1d4ed8" }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#bfdbfe")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#dbeafe")}
                      >
                        Créer « {line.ingredientName.trim()} »
                      </button>
                    )}
                  </div>
                )}
              </div>

              <input type="number" min="0" step="any" placeholder="Qté" value={line.quantity} onChange={(e) => updateIngredientLine(index, "quantity", e.target.value)} style={inputStyle} />

              <select value={line.unitId} onChange={(e) => updateIngredientLine(index, "unitId", e.target.value)} style={selectStyle}>
                <option value="">-- Unité --</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.abbr}</option>
                ))}
              </select>

              <input type="text" placeholder="Notes (opt.)" value={line.notes} onChange={(e) => updateIngredientLine(index, "notes", e.target.value)} style={inputStyle} />

              <button type="button" onClick={() => removeIngredientLine(index)} disabled={ingredientLines.length <= 1}
                style={{ padding: "0.4rem 0.6rem", background: ingredientLines.length <= 1 ? "#e5e7eb" : "#fee2e2", color: ingredientLines.length <= 1 ? "#9ca3af" : "#b91c1c", border: "none", borderRadius: "4px", cursor: ingredientLines.length <= 1 ? "not-allowed" : "pointer", fontSize: "0.85rem" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addIngredientLine} style={{ marginTop: "0.5rem", padding: "0.4rem 0.8rem", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem" }}>
          + Ajouter un ingrédient
        </button>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Instructions</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" disabled={submitting}
          style={{ padding: "0.75rem 1.5rem", background: submitting ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: submitting ? "wait" : "pointer", fontSize: "1rem", fontWeight: 500 }}
        >
          {submitting ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button type="button" onClick={() => router.push(`/recipes/${initialData.id}`)}
          style={{ padding: "0.75rem 1.5rem", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
