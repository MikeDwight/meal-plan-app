"use client";

import { useState, useCallback, useRef } from "react";
import { SelectSheet } from "../components/select-sheet";

interface Unit {
  id: string;
  name: string;
  abbr: string;
}

interface PantryItemRow {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitId: string | null;
  unitAbbr: string | null;
}

interface IngredientSuggestion {
  id: string;
  name: string;
  defaultUnitId: string | null;
}

interface PantryClientProps {
  householdId: string;
  initialItems: PantryItemRow[];
  units: Unit[];
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

export function PantryClient({ householdId, initialItems, units }: PantryClientProps) {
  const [items, setItems] = useState<PantryItemRow[]>(initialItems);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stepping, setStepping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search / filter
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [addQuantity, setAddQuantity] = useState("");
  const [addUnitId, setAddUnitId] = useState("");
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  const searchIngredients = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/ingredients?householdId=${householdId}&q=${encodeURIComponent(q.trim())}&limit=10`);
      if (res.ok) setSuggestions(await res.json());
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, [householdId]);

  const handleIngredientChange = useCallback((value: string) => {
    setIngredientName(value);
    setIngredientId("");
    setShowSuggestions(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchIngredients(value), 300);
  }, [searchIngredients]);

  const handleSelectSuggestion = useCallback((s: IngredientSuggestion) => {
    setIngredientName(s.name);
    setIngredientId(s.id);
    if (s.defaultUnitId && !addUnitId) setAddUnitId(s.defaultUnitId);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [addUnitId]);

  const handleCreateIngredient = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, name: trimmed }),
      });
      if (res.ok) {
        const created: IngredientSuggestion = await res.json();
        setIngredientId(created.id);
        setIngredientName(created.name);
        if (created.defaultUnitId && !addUnitId) setAddUnitId(created.defaultUnitId);
      }
    } catch { /* ignore */ } finally {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [householdId, addUnitId]);

  const handleAdd = async () => {
    setAddError(null);
    if (!ingredientId) { setAddError("Sélectionne ou crée un ingrédient."); return; }
    const qty = Number(addQuantity);
    if (!addQuantity || isNaN(qty) || qty <= 0) { setAddError("Quantité invalide."); return; }

    setAdding(true);
    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, ingredientId, quantity: qty, unitId: addUnitId || null }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? `Erreur ${res.status}`); return; }
      setItems((prev) => [...prev, data].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName, "fr")));
      setIngredientName("");
      setIngredientId("");
      setAddQuantity("");
      setAddUnitId("");
      setShowAddForm(false);
    } catch {
      setAddError("Erreur réseau.");
    } finally {
      setAdding(false);
    }
  };

  const handleStep = async (item: PantryItemRow, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    setStepping(item.id);
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, quantity: newQty } : it));
    try {
      await fetch(`/api/pantry/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty, unitId: item.unitId }),
      });
    } catch {
      setError("Erreur réseau.");
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, quantity: item.quantity } : it));
    } finally {
      setStepping(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet item du garde-manger ?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/pantry/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      setError("Erreur lors de la suppression.");
    } finally {
      setDeleting(null);
    }
  };

  const filteredItems = searchQuery.trim()
    ? items.filter((it) => it.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()))
    : items;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2rem 0 1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>Garde-manger</h1>
        <button
          type="button"
          onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); }}
          style={{ background: "rgba(71,235,191,0.2)", border: "none", borderRadius: "999px", width: "2.5rem", height: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#47ebbf" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>search</span>
        </button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Rechercher un ingrédient…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{ ...inputStyle, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          />
        </div>
      )}

      {/* Add button */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          style={{ width: "100%", height: "3.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.95rem", border: "none", borderRadius: "0.75rem", cursor: "pointer", boxShadow: "4px 4px 0 rgba(71,235,191,0.2)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", fontVariationSettings: "'wght' 700" }}>add</span>
          Ajouter un ingrédient
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ background: "#fff", borderRadius: "0.75rem", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.07)", padding: "1.25rem", marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Ingredient autocomplete */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Nom de l'ingrédient…"
              value={ingredientName}
              onChange={(e) => handleIngredientChange(e.target.value)}
              onFocus={() => { if (blurTimeout.current) clearTimeout(blurTimeout.current); setShowSuggestions(true); }}
              onBlur={() => { blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150); }}
              style={{ ...inputStyle, borderColor: ingredientId ? "#47ebbf" : "#e2e8f0" }}
            />
            {showSuggestions && ingredientName.trim() && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0 0 0.625rem 0.625rem", maxHeight: "200px", overflowY: "auto", zIndex: 10, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}>
                {searching && <div style={{ padding: "0.5rem 0.75rem", color: "#94a3b8", fontSize: "0.85rem" }}>Recherche…</div>}
                {!searching && suggestions.map((s) => (
                  <button key={s.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelectSuggestion(s)}
                    style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                  >{s.name}</button>
                ))}
                {!searching && ingredientName.trim() && !suggestions.some((s) => s.name.toLowerCase() === ingredientName.trim().toLowerCase()) && (
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleCreateIngredient(ingredientName)}
                    style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", textAlign: "left", background: "rgba(71,235,191,0.1)", border: "none", borderTop: "1px solid #e2e8f0", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#0f766e" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "rgba(71,235,191,0.2)")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "rgba(71,235,191,0.1)")}
                  >Créer « {ingredientName.trim()} »</button>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Quantité"
              value={addQuantity}
              onChange={(e) => setAddQuantity(e.target.value)}
              style={inputStyle}
            />
            <SelectSheet
              value={units.find((u) => u.id === addUnitId)?.abbr ?? ""}
              onChange={() => {}}
              items={units.map((u) => ({ id: u.id, label: u.abbr }))}
              onSelect={(item) => setAddUnitId(item.id)}
              placeholder="— Unité —"
              style={{ ...inputStyle, background: "#fff" }}
            />
          </div>

          {addError && (
            <p style={{ color: "#b91c1c", fontSize: "0.8rem", margin: 0 }}>{addError}</p>
          )}

          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button type="button" onClick={handleAdd} disabled={adding}
              style={{ flex: 1, height: "2.75rem", background: adding ? "#a7f3d0" : "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.875rem", border: "none", borderRadius: "0.625rem", cursor: adding ? "wait" : "pointer" }}>
              {adding ? "Ajout…" : "Confirmer"}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setAddError(null); }}
              style={{ flex: 1, height: "2.75rem", background: "#f8fafc", color: "#64748b", fontWeight: 600, fontSize: "0.875rem", border: "1px solid #e2e8f0", borderRadius: "0.625rem", cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ color: "#b91c1c", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</p>
      )}

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", display: "block", marginBottom: "0.75rem" }}>inventory_2</span>
          <p style={{ margin: 0, fontWeight: 500 }}>{searchQuery ? "Aucun résultat" : "Le garde-manger est vide."}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              style={{ background: "#fff", borderRadius: "0.75rem", border: "1px solid #e2e8e7", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "4px 4px 0 rgba(71,235,191,0.2)" }}
            >
              {/* Left: name + qty */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
                <span style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>{item.ingredientName}</span>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  {item.quantity}{item.unitAbbr ? ` ${item.unitAbbr}` : ""}
                </span>
              </div>

              {/* Right: stepper + delete */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", background: "#f6f8f7", borderRadius: "0.5rem", padding: "0.25rem" }}>
                  <button
                    type="button"
                    onClick={() => handleStep(item, -1)}
                    disabled={stepping === item.id || item.quantity <= 0}
                    style={{ width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: item.quantity <= 0 ? "not-allowed" : "pointer", color: item.quantity <= 0 ? "#cbd5e1" : "#475569", borderRadius: "0.375rem" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>remove</span>
                  </button>
                  <span style={{ width: "2rem", textAlign: "center", fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStep(item, 1)}
                    disabled={stepping === item.id}
                    style={{ width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: "#475569", borderRadius: "0.375rem" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>add</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  style={{ background: "none", border: "none", cursor: deleting === item.id ? "not-allowed" : "pointer", color: "#cbd5e1", display: "flex", padding: "0.25rem" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
