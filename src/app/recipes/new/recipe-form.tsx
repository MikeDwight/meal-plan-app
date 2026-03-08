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
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newIngredientIds = useRef<Set<string>>(new Set());

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
          newIngredientIds.current.add(created.id);
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

  const handleImportPhoto = useCallback(async (file: File) => {
    setImportError(null);
    setImporting(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/recipes/import-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      const data = await res.json() as {
        error?: string;
        title?: string;
        servings?: number | null;
        instructions?: string | null;
        ingredients?: { name: string; quantity: number | null; unit: string | null }[];
      };

      if (!res.ok || data.error) {
        setImportError(data.error ?? "Échec de l'extraction");
        return;
      }

      if (data.title) setTitle(data.title);
      if (data.servings) setServings(String(data.servings));
      if (data.instructions) setInstructions(data.instructions);

      if (data.ingredients && data.ingredients.length > 0) {
        const lines: IngredientLine[] = data.ingredients.map((ing) => {
          const matched = ingredients.find(
            (i) => i.name.toLowerCase() === ing.name.toLowerCase()
          );
          const unit = matched?.defaultUnitId
            ? units.find((u) => u.id === matched.defaultUnitId)
            : ing.unit
            ? units.find((u) => u.abbr.toLowerCase() === ing.unit!.toLowerCase())
            : undefined;
          const aisle = matched?.defaultAisleId
            ? aisles.find((a) => a.id === matched.defaultAisleId)
            : undefined;

          return {
            ingredientId: matched?.id ?? "",
            ingredientName: matched?.name ?? ing.name,
            quantity: ing.quantity != null ? String(ing.quantity) : "",
            unitId: unit?.id ?? "",
            unitLabel: unit?.abbr ?? ing.unit ?? "",
            aisleId: aisle?.id ?? "",
            aisleName: aisle?.name ?? "",
          };
        });
        setIngredientLines(lines.length > 0 ? lines : [emptyLine()]);
      }
    } catch (e) {
      console.error("Import photo error:", e);
      setImportError("Erreur inattendue lors de l'import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [ingredients, units, aisles]);

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

      // Persist unit/aisle defaults for ingredients created inline during this session
      await Promise.all(
        validIngredients
          .filter((line) => newIngredientIds.current.has(line.ingredientId) && (line.unitId || line.aisleId))
          .map((line) =>
            fetch(`/api/ingredients/${line.ingredientId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...(line.unitId && { defaultUnitId: line.unitId }),
                ...(line.aisleId && { defaultAisleId: line.aisleId }),
              }),
            })
          )
      );

      router.push(`/recipes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Chargement…</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ paddingBottom: "8rem" }}>
      {/* Import depuis photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportPhoto(file);
        }}
      />
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing || loadingMeta}
          style={{
            width: "100%",
            height: "3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            background: importing ? "#f1f5f9" : "rgba(71,235,191,0.12)",
            border: "1.5px dashed #47ebbf",
            borderRadius: "0.75rem",
            cursor: importing ? "wait" : "pointer",
            color: "#0f766e",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>
            {importing ? "hourglass_empty" : "add_a_photo"}
          </span>
          {importing ? "Analyse en cours…" : "Importer depuis une photo"}
        </button>
        {importError && (
          <p style={{ marginTop: "0.5rem", color: "#b91c1c", fontSize: "0.8rem", paddingLeft: "0.25rem" }}>
            {importError}
          </p>
        )}
        {importing && (
          <p style={{ marginTop: "0.5rem", color: "#64748b", fontSize: "0.8rem", paddingLeft: "0.25rem" }}>
            Analyse la photo, ça prend quelques secondes…
          </p>
        )}
      </div>

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
          rows={Math.max(6, (instructions.match(/\n/g) ?? []).length + 2)}
          style={{ ...inputStyle, background: "#fff", borderRadius: "0.75rem", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", resize: "vertical", lineHeight: 1.8, whiteSpace: "pre-wrap" }}
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
          {submitting ? "Création…" : "Enregistrer la recette"}
        </button>
        <button type="button" onClick={() => window.history.back()}
          style={{ width: "100%", height: "3rem", background: "transparent", border: "none", color: "#94a3b8", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </form>
  );
}
