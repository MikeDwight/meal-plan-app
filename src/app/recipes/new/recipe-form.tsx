"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FieldAutocomplete } from "../field-autocomplete";

const HOUSEHOLD_ID = "home-household";

interface Tag { id: string; name: string; }
interface Unit { id: string; name: string; abbr: string; }
interface Aisle { id: string; name: string; }
interface Ingredient { id: string; name: string; defaultUnitId: string | null; defaultAisleId: string | null; }

interface IngredientLine {
  ingredientId: string;
  ingredientName: string;
  quantity: string;
  unitId: string;
  unitLabel: string;
  aisleId: string;
  aisleName: string;
}

interface IngredientSuggestion {
  id: string;
  name: string;
  defaultUnitId: string | null;
  defaultAisleId: string | null;
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "0.95rem",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.25rem",
  fontWeight: 500,
  fontSize: "0.9rem",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "1.5rem",
};

export function RecipeForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [servings, setServings] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const emptyLine = (): IngredientLine => ({ ingredientId: "", ingredientName: "", quantity: "", unitId: "", unitLabel: "", aisleId: "", aisleName: "" });
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([emptyLine()]);

  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [tagsRes, unitsRes, aislesRes, ingredientsRes] = await Promise.all([
          fetch(`/api/tags?householdId=${HOUSEHOLD_ID}`),
          fetch(`/api/units?householdId=${HOUSEHOLD_ID}`),
          fetch(`/api/aisles?householdId=${HOUSEHOLD_ID}`),
          fetch(`/api/ingredients?householdId=${HOUSEHOLD_ID}&limit=200`),
        ]);

        if (tagsRes.ok) setTags(await tagsRes.json());
        if (unitsRes.ok) setUnits(await unitsRes.json());
        if (aislesRes.ok) setAisles(await aislesRes.json());
        if (ingredientsRes.ok) setIngredients(await ingredientsRes.json());
      } catch (e) {
        console.error("Failed to load metadata:", e);
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  const handleSelectTag = useCallback((item: { id: string; label: string }) => {
    setSelectedTags((prev) => prev.some((t) => t.id === item.id) ? prev : [...prev, { id: item.id, name: item.label }]);
    setTagInput("");
  }, []);

  const handleCreateTag = useCallback(async (name: string) => {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID, name }),
    });
    if (res.ok) {
      const created: Tag = await res.json();
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTags((prev) => prev.some((t) => t.id === created.id) ? prev : [...prev, created]);
      setTagInput("");
    }
  }, []);

  const removeTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  }, []);

  const updateIngredientLine = useCallback(
    (index: number, field: keyof IngredientLine, value: string) => {
      setIngredientLines((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };

        if (field === "ingredientId" && value) {
          const ing = ingredients.find((i) => i.id === value);
          if (ing?.defaultUnitId && !next[index].unitId) {
            next[index].unitId = ing.defaultUnitId;
          }
        }

        return next;
      });
    },
    [ingredients]
  );

  const addIngredientLine = useCallback(() => {
    setIngredientLines((prev) => [...prev, emptyLine()]);
  }, []);

  const searchIngredients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIngredientSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/ingredients?householdId=${HOUSEHOLD_ID}&q=${encodeURIComponent(query.trim())}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        setIngredientSuggestions(data);
      }
    } catch (e) {
      console.error("Search ingredients error:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleIngredientInputChange = useCallback(
    (index: number, value: string) => {
      setIngredientLines((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ingredientName: value, ingredientId: "" };
        return next;
      });
      setActiveLineIndex(index);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchIngredients(value);
      }, 300);
    },
    [searchIngredients]
  );

  const handleSelectSuggestion = useCallback(
    (index: number, suggestion: IngredientSuggestion) => {
      setIngredientLines((prev) => {
        const next = [...prev];
        const currentUnit = units.find((u) => u.id === suggestion.defaultUnitId);
        const currentAisle = aisles.find((a) => a.id === suggestion.defaultAisleId);
        next[index] = {
          ...next[index],
          ingredientId: suggestion.id,
          ingredientName: suggestion.name,
          unitId: next[index].unitId || suggestion.defaultUnitId || "",
          unitLabel: next[index].unitLabel || currentUnit?.abbr || "",
          aisleId: next[index].aisleId || suggestion.defaultAisleId || "",
          aisleName: next[index].aisleName || currentAisle?.name || "",
        };
        return next;
      });
      setActiveLineIndex(null);
      setIngredientSuggestions([]);
    },
    [units, aisles]
  );

  const handleCreateIngredient = useCallback(
    async (index: number, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      try {
        const line = ingredientLines[index];
        const res = await fetch("/api/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdId: HOUSEHOLD_ID,
            name: trimmedName,
            defaultUnitId: line.unitId || undefined,
            defaultAisleId: line.aisleId || undefined,
          }),
        });

        if (res.ok) {
          const created: IngredientSuggestion = await res.json();
          setIngredientLines((prev) => {
            const next = [...prev];
            next[index] = {
              ...next[index],
              ingredientId: created.id,
              ingredientName: created.name,
            };
            return next;
          });
          setIngredients((prev) => [...prev, created]);
        }
      } catch (e) {
        console.error("Create ingredient error:", e);
      } finally {
        setActiveLineIndex(null);
        setIngredientSuggestions([]);
      }
    },
    [ingredientLines]
  );

  const handleSelectUnit = useCallback((index: number, item: { id: string; label: string }) => {
    setIngredientLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], unitId: item.id, unitLabel: item.label };
      return next;
    });
  }, []);

  const handleCreateUnit = useCallback(async (index: number, label: string) => {
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID, abbr: label, name: label }),
    });
    if (res.ok) {
      const created: Unit = await res.json();
      setUnits((prev) => [...prev, created].sort((a, b) => a.abbr.localeCompare(b.abbr)));
      setIngredientLines((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], unitId: created.id, unitLabel: created.abbr };
        return next;
      });
    }
  }, []);

  const handleSelectAisle = useCallback((index: number, item: { id: string; label: string }) => {
    setIngredientLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], aisleId: item.id, aisleName: item.label };
      return next;
    });
  }, []);

  const handleCreateAisle = useCallback(async (index: number, label: string) => {
    const res = await fetch("/api/aisles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID, name: label }),
    });
    if (res.ok) {
      const created: Aisle = await res.json();
      setAisles((prev) => [...prev, created]);
      setIngredientLines((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], aisleId: created.id, aisleName: created.name };
        return next;
      });
    }
  }, []);

  const handleIngredientInputFocus = useCallback((index: number) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setActiveLineIndex(index);
  }, []);

  const handleIngredientInputBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setActiveLineIndex(null);
      setIngredientSuggestions([]);
    }, 150);
  }, []);

  const removeIngredientLine = useCallback((index: number) => {
    setIngredientLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Le titre est requis.");
      return;
    }

    const validIngredients = ingredientLines.filter(
      (line) =>
        line.ingredientId && line.quantity && Number(line.quantity) > 0
    );

    if (validIngredients.length === 0) {
      setError("Au moins un ingrédient avec une quantité > 0 est requis.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        householdId: HOUSEHOLD_ID,
        title: trimmedTitle,
        sourceUrl: sourceUrl.trim() || null,
        servings: servings === "" ? null : Number(servings),
        instructions: instructions.trim() || null,
        notes: notes.trim() || null,
        tagIds: selectedTags.map((t) => t.id),
        ingredients: validIngredients.map((line) => ({
          ingredientId: line.ingredientId,
          quantity: Number(line.quantity),
          unitId: line.unitId === "" ? null : line.unitId,
        })),
      };

      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          (data as { error?: string } | null)?.error ?? `Erreur ${res.status}`
        );
      }

      const created = (await res.json()) as { id: string };
      router.push(`/recipes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return <p style={{ color: "#888" }}>Chargement...</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "#fee2e2",
            color: "#b91c1c",
            borderRadius: "4px",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Title */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Titre <span style={{ color: "#c00" }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
          placeholder="Ex: Poulet rôti aux herbes"
        />
      </div>

      {/* Servings / Source */}
      <div style={{ ...sectionStyle, display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Portions</label>
          <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} style={inputStyle} placeholder="4" />
        </div>
        <div>
          <label style={labelStyle}>URL source</label>
          <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
        </div>
      </div>

      {/* Tags */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Tags</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {selectedTags.map((tag) => (
            <span key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.5rem", background: "#dbeafe", borderRadius: "4px", fontSize: "0.85rem" }}>
              {tag.name}
              <button type="button" onClick={() => removeTag(tag.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontWeight: 700, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
        <FieldAutocomplete
          value={tagInput}
          onChange={setTagInput}
          items={tags.filter((t) => !selectedTags.some((s) => s.id === t.id)).map((t) => ({ id: t.id, label: t.name }))}
          onSelect={handleSelectTag}
          onCreate={handleCreateTag}
          placeholder="Ajouter un tag..."
          style={inputStyle}
        />
      </div>

      {/* Ingredients */}
      <div style={sectionStyle}>
        <label style={labelStyle}>
          Ingrédients <span style={{ color: "#c00" }}>*</span>
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {ingredientLines.map((line, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr auto",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Rechercher un ingrédient..."
                  value={line.ingredientName}
                  onChange={(e) => handleIngredientInputChange(index, e.target.value)}
                  onFocus={() => handleIngredientInputFocus(index)}
                  onBlur={handleIngredientInputBlur}
                  style={{
                    ...inputStyle,
                    borderColor: line.ingredientId ? "#22c55e" : "#ccc",
                  }}
                />
                {activeLineIndex === index && (ingredientSuggestions.length > 0 || line.ingredientName.trim()) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #ccc",
                      borderTop: "none",
                      borderRadius: "0 0 4px 4px",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 10,
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  >
                    {isSearching && (
                      <div style={{ padding: "0.5rem", color: "#888", fontSize: "0.85rem" }}>
                        Recherche...
                      </div>
                    )}
                    {!isSearching && ingredientSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSuggestion(index, suggestion)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "0.5rem",
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                      >
                        {suggestion.name}
                      </button>
                    ))}
                    {!isSearching &&
                      line.ingredientName.trim() &&
                      !ingredientSuggestions.some(
                        (s) => s.name.toLowerCase() === line.ingredientName.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleCreateIngredient(index, line.ingredientName)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "0.5rem",
                            textAlign: "left",
                            background: "#dbeafe",
                            border: "none",
                            borderTop: "1px solid #ccc",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: 500,
                            color: "#1d4ed8",
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "#bfdbfe")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "#dbeafe")}
                        >
                          Créer « {line.ingredientName.trim()} »
                        </button>
                      )}
                  </div>
                )}
              </div>

              <input
                type="number"
                min="0"
                step="any"
                placeholder="Qté"
                value={line.quantity}
                onChange={(e) => updateIngredientLine(index, "quantity", e.target.value)}
                style={inputStyle}
              />

              <FieldAutocomplete
                value={line.aisleName}
                onChange={(v) => setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], aisleName: v, aisleId: "" }; return next; })}
                items={aisles.map((a) => ({ id: a.id, label: a.name }))}
                onSelect={(item) => handleSelectAisle(index, item)}
                onCreate={(label) => handleCreateAisle(index, label)}
                placeholder="Rayon..."
                style={inputStyle}
              />

              <FieldAutocomplete
                value={line.unitLabel}
                onChange={(v) => setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], unitLabel: v, unitId: "" }; return next; })}
                items={units.map((u) => ({ id: u.id, label: u.abbr }))}
                onSelect={(item) => handleSelectUnit(index, item)}
                onCreate={(label) => handleCreateUnit(index, label)}
                placeholder="Unité..."
                style={inputStyle}
              />


              <button
                type="button"
                onClick={() => removeIngredientLine(index)}
                disabled={ingredientLines.length <= 1}
                style={{
                  padding: "0.4rem 0.6rem",
                  background: ingredientLines.length <= 1 ? "#e5e7eb" : "#fee2e2",
                  color: ingredientLines.length <= 1 ? "#9ca3af" : "#b91c1c",
                  border: "none",
                  borderRadius: "4px",
                  cursor: ingredientLines.length <= 1 ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredientLine}
          style={{
            marginTop: "0.5rem",
            padding: "0.4rem 0.8rem",
            background: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          + Ajouter un ingrédient
        </button>
      </div>

      {/* Instructions */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Instructions</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="1. Préchauffer le four...&#10;2. Mélanger les ingrédients..."
        />
      </div>

      {/* Notes */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Astuces, variantes, allergènes..."
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "0.75rem 1.5rem",
          background: submitting ? "#9ca3af" : "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: submitting ? "wait" : "pointer",
          fontSize: "1rem",
          fontWeight: 500,
        }}
      >
        {submitting ? "Création..." : "Créer la recette"}
      </button>
    </form>
  );
}
