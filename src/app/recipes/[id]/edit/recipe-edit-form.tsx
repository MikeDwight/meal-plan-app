"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FieldAutocomplete } from "../../field-autocomplete";

const HOUSEHOLD_ID_CLIENT = "home-household";

interface Tag { id: string; name: string; }
interface Unit { id: string; abbr: string; }
interface Aisle { id: string; name: string; }
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

interface InitialData {
  id: string;
  title: string;
  sourceUrl: string;
  servings: number | null;
  instructions: string;
  notes: string;
  tagIds: string[];
  ingredients: Omit<IngredientLine, "unitLabel">[];
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.625rem",
  fontSize: "0.875rem",
  background: "#f8fafc",
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.375rem",
  fontWeight: 600,
  fontSize: "0.8rem",
  color: "#475569",
  paddingLeft: "0.25rem",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "2rem",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "0.75rem",
  border: "1px solid #f1f5f9",
  boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
  padding: "1rem",
};

const sectionHeaderStyle = (icon: string, label: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
    <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", color: "#47ebbf" }}>{icon}</span>
    <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{label}</h2>
  </div>
);

export function RecipeEditForm({
  householdId,
  initialData,
  tags,
  units: initialUnits,
  aisles: initialAisles,
}: {
  householdId: string;
  initialData: InitialData;
  tags: Tag[];
  units: Unit[];
  aisles: Aisle[];
}) {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [aisles, setAisles] = useState<Aisle[]>(initialAisles);

  const [title, setTitle] = useState(initialData.title);
  const [sourceUrl, setSourceUrl] = useState(initialData.sourceUrl);
  const [servings, setServings] = useState(initialData.servings != null ? String(initialData.servings) : "");
  const [instructions, setInstructions] = useState(initialData.instructions);
  const [notes, setNotes] = useState(initialData.notes);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    initialData.tagIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => t != null)
  );
  const [tagInput, setTagInput] = useState("");
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>(
    initialData.ingredients.length > 0
      ? initialData.ingredients.map((l) => ({ ...l, unitLabel: units.find((u) => u.id === l.unitId)?.abbr ?? "" }))
      : [{ ingredientId: "", ingredientName: "", quantity: "", unitId: "", unitLabel: "", aisleId: "", aisleName: "" }]
  );

  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectTag = useCallback((item: { id: string; label: string }) => {
    setSelectedTags((prev) => prev.some((t) => t.id === item.id) ? prev : [...prev, { id: item.id, name: item.label }]);
    setTagInput("");
  }, []);

  const handleCreateTag = useCallback(async (name: string) => {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID_CLIENT, name }),
    });
    if (res.ok) {
      const created: Tag = await res.json();
      setSelectedTags((prev) => prev.some((t) => t.id === created.id) ? prev : [...prev, created]);
      setTagInput("");
    }
  }, []);

  const removeTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
  }, []);

  const updateIngredientLine = useCallback((index: number, field: keyof IngredientLine, value: string) => {
    setIngredientLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const addIngredientLine = useCallback(() => {
    setIngredientLines((prev) => [{ ingredientId: "", ingredientName: "", quantity: "", unitId: "", unitLabel: "", aisleId: "", aisleName: "" }, ...prev]);
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
  }, [units, aisles]);

  const handleCreateIngredient = useCallback(async (index: number, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      const line = ingredientLines[index];
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: HOUSEHOLD_ID_CLIENT,
          name: trimmedName,
          defaultUnitId: line.unitId || undefined,
          defaultAisleId: line.aisleId || undefined,
        }),
      });
      if (res.ok) {
        const created: IngredientSuggestion = await res.json();
        setIngredientLines((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], ingredientId: created.id, ingredientName: created.name };
          return next;
        });
      }
    } catch { /* ignore */ } finally {
      setActiveLineIndex(null);
      setIngredientSuggestions([]);
    }
  }, [ingredientLines]);

  const handleSelectUnit = useCallback((index: number, item: { id: string; label: string }) => {
    setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], unitId: item.id, unitLabel: item.label }; return next; });
  }, []);

  const handleCreateUnit = useCallback(async (index: number, label: string) => {
    const res = await fetch("/api/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID_CLIENT, abbr: label, name: label }) });
    if (res.ok) {
      const created: Unit = await res.json();
      setUnits((prev) => [...prev, created].sort((a, b) => a.abbr.localeCompare(b.abbr)));
      setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], unitId: created.id, unitLabel: created.abbr }; return next; });
    }
  }, []);

  const handleSelectAisle = useCallback((index: number, item: { id: string; label: string }) => {
    setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], aisleId: item.id, aisleName: item.label }; return next; });
  }, []);

  const handleCreateAisle = useCallback(async (index: number, label: string) => {
    const res = await fetch("/api/aisles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID_CLIENT, name: label }) });
    if (res.ok) {
      const created: Aisle = await res.json();
      setAisles((prev) => [...prev, created]);
      setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], aisleId: created.id, aisleName: created.name }; return next; });
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
    <form onSubmit={handleSubmit} style={{ paddingBottom: "8rem" }}>
      {error && (
        <div style={{ padding: "0.75rem 1rem", background: "#fee2e2", color: "#b91c1c", borderRadius: "0.625rem", marginBottom: "1.25rem", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Section: Infos générales */}
      <div style={sectionStyle}>
        {sectionHeaderStyle("info", "Informations générales")}
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Nom de la recette *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, height: "3rem" }} placeholder="Ex: Poulet rôti aux herbes" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Portions</label>
              <input type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} style={inputStyle} placeholder="4" />
            </div>
            <div>
              <label style={labelStyle}>URL source</label>
              <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", padding: "0.625rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "0.625rem", minHeight: "3rem", alignItems: "center" }}>
              {selectedTags.map((tag) => (
                <span key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.2rem 0.625rem", background: "rgba(71,235,191,0.2)", color: "#0f766e", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600 }}>
                  {tag.name}
                  <button type="button" onClick={() => removeTag(tag.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0f766e", padding: 0, lineHeight: 1, display: "flex" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>close</span>
                  </button>
                </span>
              ))}
              <FieldAutocomplete
                value={tagInput}
                onChange={setTagInput}
                items={tags.filter((t) => !selectedTags.some((s) => s.id === t.id)).map((t) => ({ id: t.id, label: t.name }))}
                onSelect={handleSelectTag}
                onCreate={handleCreateTag}
                placeholder="Ajouter un tag…"
                style={{ flex: 1, minWidth: "8rem", padding: "0.2rem 0", border: "none", background: "transparent", fontSize: "0.875rem", outline: "none" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Ingrédients */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", color: "#47ebbf" }}>shopping_basket</span>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Ingrédients *</h2>
          </div>
          <button type="button" onClick={addIngredientLine} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "#47ebbf", fontWeight: 700, fontSize: "0.875rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>add_circle</span>
            Ajouter
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {ingredientLines.map((line, index) => (
            <div key={index} style={cardStyle}>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Nom de l'ingrédient…"
                    value={line.ingredientName}
                    onChange={(e) => handleIngredientInputChange(index, e.target.value)}
                    onFocus={() => handleIngredientInputFocus(index)}
                    onBlur={handleIngredientInputBlur}
                    style={{ ...inputStyle, borderColor: line.ingredientId ? "#47ebbf" : "#e2e8f0" }}
                  />
                  {activeLineIndex === index && (ingredientSuggestions.length > 0 || line.ingredientName.trim()) && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0 0 0.625rem 0.625rem", maxHeight: "200px", overflowY: "auto", zIndex: 10, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}>
                      {isSearching && <div style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>Recherche…</div>}
                      {!isSearching && ingredientSuggestions.map((suggestion) => (
                        <button key={suggestion.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelectSuggestion(index, suggestion)}
                          style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                        >{suggestion.name}</button>
                      ))}
                      {!isSearching && line.ingredientName.trim() && !ingredientSuggestions.some((s) => s.name.toLowerCase() === line.ingredientName.trim().toLowerCase()) && (
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleCreateIngredient(index, line.ingredientName)}
                          style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", textAlign: "left", background: "rgba(71,235,191,0.1)", border: "none", borderTop: "1px solid #e2e8f0", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#0f766e" }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(71,235,191,0.2)")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "rgba(71,235,191,0.1)")}
                        >Créer « {line.ingredientName.trim()} »</button>
                      )}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => removeIngredientLine(index)} disabled={ingredientLines.length <= 1}
                  style={{ background: "none", border: "none", cursor: ingredientLines.length <= 1 ? "not-allowed" : "pointer", color: ingredientLines.length <= 1 ? "#cbd5e1" : "#ef4444", display: "flex", alignItems: "center", padding: "0.25rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>delete</span>
                </button>
              </div>
              <div className="recipe-ing-subgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                <input type="number" min="0" step="any" placeholder="Qté" value={line.quantity} onChange={(e) => updateIngredientLine(index, "quantity", e.target.value)} style={inputStyle} />
                <FieldAutocomplete
                  value={line.unitLabel}
                  onChange={(v) => setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], unitLabel: v, unitId: "" }; return next; })}
                  items={units.map((u) => ({ id: u.id, label: u.abbr }))}
                  onSelect={(item) => handleSelectUnit(index, item)}
                  onCreate={(label) => handleCreateUnit(index, label)}
                  placeholder="Unité…"
                  style={inputStyle}
                />
                <div className="recipe-ing-rayon">
                  <FieldAutocomplete
                    value={line.aisleName}
                    onChange={(v) => setIngredientLines((prev) => { const next = [...prev]; next[index] = { ...next[index], aisleName: v, aisleId: "" }; return next; })}
                    items={aisles.map((a) => ({ id: a.id, label: a.name }))}
                    onSelect={(item) => handleSelectAisle(index, item)}
                    onCreate={(label) => handleCreateAisle(index, label)}
                    placeholder="Rayon…"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Instructions */}
      <div style={sectionStyle}>
        {sectionHeaderStyle("description", "Préparation")}
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={6}
          style={{ ...inputStyle, background: "#fff", borderRadius: "0.75rem", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", resize: "vertical", lineHeight: 1.6 }}
          placeholder="Décrivez les étapes de votre recette…"
        />
      </div>

      {/* Section: Notes */}
      <div style={sectionStyle}>
        {sectionHeaderStyle("sticky_note_2", "Notes")}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ ...inputStyle, background: "#fff", borderRadius: "0.75rem", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", resize: "vertical", lineHeight: 1.6 }}
          placeholder="Astuces, variantes, allergènes…"
        />
      </div>

      {/* Fixed bottom actions */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "1rem", background: "rgba(246,248,247,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(71,235,191,0.1)", display: "flex", flexDirection: "column", gap: "0.625rem", zIndex: 50 }}>
        <button type="submit" disabled={submitting}
          style={{ width: "100%", height: "3.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: submitting ? "#a7f3d0" : "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.95rem", border: "none", borderRadius: "0.75rem", cursor: submitting ? "wait" : "pointer", boxShadow: "4px 4px 0 rgba(71,235,191,0.2)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>save</span>
          {submitting ? "Enregistrement…" : "Enregistrer la recette"}
        </button>
        <button type="button" onClick={() => router.push(`/recipes/${initialData.id}`)}
          style={{ width: "100%", height: "3rem", background: "transparent", border: "none", color: "#94a3b8", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </form>
  );
}
