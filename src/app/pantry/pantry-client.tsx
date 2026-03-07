"use client";

import { useState, useCallback, useRef } from "react";

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
  padding: "0.45rem 0.6rem",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "0.9rem",
};

const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
  padding: "0.45rem 0.8rem",
  background: disabled ? "#e5e7eb" : color,
  color: disabled ? "#9ca3af" : "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.85rem",
  fontWeight: 500,
});

export function PantryClient({ householdId, initialItems, units }: PantryClientProps) {
  const [items, setItems] = useState<PantryItemRow[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add form state
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
        body: JSON.stringify({
          householdId,
          ingredientId,
          quantity: qty,
          unitId: addUnitId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? `Erreur ${res.status}`); return; }
      setItems((prev) => [...prev, data].sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)));
      setIngredientName("");
      setIngredientId("");
      setAddQuantity("");
      setAddUnitId("");
    } catch {
      setAddError("Erreur réseau.");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: PantryItemRow) => {
    setEditingId(item.id);
    setEditQuantity(String(item.quantity));
    setEditUnitId(item.unitId ?? "");
    setError(null);
  };

  const cancelEdit = () => { setEditingId(null); setError(null); };

  const handleSave = async (id: string) => {
    const qty = Number(editQuantity);
    if (!editQuantity || isNaN(qty) || qty <= 0) { setError("Quantité invalide."); return; }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pantry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty, unitId: editUnitId || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `Erreur ${res.status}`); return; }
      setItems((prev) => prev.map((it) => (it.id === id ? data : it)));
      setEditingId(null);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
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

  return (
    <div>
      {/* Add form */}
      <section
        style={{
          marginBottom: "2rem",
          padding: "1rem",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          background: "#fafafa",
        }}
      >
        <h2 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Ajouter un item</h2>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Ingredient search */}
          <div style={{ position: "relative", flex: "2 1 180px" }}>
            <input
              type="text"
              placeholder="Ingrédient..."
              value={ingredientName}
              onChange={(e) => handleIngredientChange(e.target.value)}
              onFocus={() => { if (blurTimeout.current) clearTimeout(blurTimeout.current); setShowSuggestions(true); }}
              onBlur={() => { blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150); }}
              style={{ ...inputStyle, width: "100%", borderColor: ingredientId ? "#22c55e" : "#ccc" }}
            />
            {showSuggestions && ingredientName.trim() && (
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
                {searching && (
                  <div style={{ padding: "0.5rem", color: "#888", fontSize: "0.85rem" }}>Recherche...</div>
                )}
                {!searching && suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(s)}
                    style={{ display: "block", width: "100%", padding: "0.5rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {s.name}
                  </button>
                ))}
                {!searching && ingredientName.trim() && !suggestions.some((s) => s.name.toLowerCase() === ingredientName.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleCreateIngredient(ingredientName)}
                    style={{ display: "block", width: "100%", padding: "0.5rem", textAlign: "left", background: "#dbeafe", border: "none", borderTop: "1px solid #ccc", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500, color: "#1d4ed8" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#bfdbfe")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#dbeafe")}
                  >
                    Créer « {ingredientName.trim()} »
                  </button>
                )}
              </div>
            )}
          </div>

          <input
            type="number"
            min="0"
            step="any"
            placeholder="Quantité"
            value={addQuantity}
            onChange={(e) => setAddQuantity(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 80px" }}
          />

          <select
            value={addUnitId}
            onChange={(e) => setAddUnitId(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 80px", background: "#fff" }}
          >
            <option value="">-- Unité --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.abbr}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            style={btnStyle("#2563eb", adding)}
          >
            {adding ? "Ajout..." : "Ajouter"}
          </button>
        </div>

        {addError && (
          <p style={{ color: "#b91c1c", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>{addError}</p>
        )}
      </section>

      {/* Error */}
      {error && (
        <p style={{ color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>
      )}

      {/* List */}
      {items.length === 0 ? (
        <p style={{ color: "#888" }}>Le garde-manger est vide.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left", fontSize: "0.85rem", color: "#666" }}>
              <th style={{ padding: "0.5rem 0.75rem" }}>Ingrédient</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Quantité</th>
              <th style={{ padding: "0.5rem 0.75rem" }}>Unité</th>
              <th style={{ padding: "0.5rem 0.75rem" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>
                  {item.ingredientName}
                </td>

                {editingId === item.id ? (
                  <>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(e.target.value)}
                        style={{ ...inputStyle, width: "80px" }}
                      />
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem" }}>
                      <select
                        value={editUnitId}
                        onChange={(e) => setEditUnitId(e.target.value)}
                        style={{ ...inputStyle, background: "#fff" }}
                      >
                        <option value="">--</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.abbr}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.4rem 0.75rem", display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() => handleSave(item.id)}
                        disabled={saving}
                        style={btnStyle("#16a34a", saving)}
                      >
                        {saving ? "..." : "Sauver"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={{ ...btnStyle("#6b7280"), background: "#f3f4f6", color: "#374151" }}
                      >
                        Annuler
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#374151" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", color: "#6b7280" }}>
                      {item.unitAbbr ?? "—"}
                    </td>
                    <td style={{ padding: "0.6rem 0.75rem", display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        style={{ ...btnStyle("#2563eb"), background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        style={btnStyle("#dc2626", deleting === item.id)}
                      >
                        {deleting === item.id ? "..." : "Supprimer"}
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
