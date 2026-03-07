"use client";

import { useState, useRef, useCallback } from "react";

const HOUSEHOLD_ID = "home-household";

interface Unit { id: string; abbr: string; }
interface Aisle { id: string; name: string; }
interface IngredientRow {
  id: string;
  name: string;
  defaultUnitId: string | null;
  defaultUnitAbbr: string | null;
  defaultAisleId: string | null;
  defaultAisleName: string | null;
}

// ─── Autocomplete ────────────────────────────────────────────────────────────

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  items: { id: string; label: string }[];
  onSelect: (item: { id: string; label: string }) => void;
  onCreate: (label: string) => Promise<void>;
  placeholder?: string;
  createLabel?: (label: string) => string;
}

function Autocomplete({
  value,
  onChange,
  items,
  onSelect,
  onCreate,
  placeholder,
  createLabel,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const blurRef = useRef<NodeJS.Timeout | null>(null);

  const filtered = value.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(value.toLowerCase()))
    : items;

  const exactMatch = items.some(
    (i) => i.label.toLowerCase() === value.trim().toLowerCase()
  );

  const showCreate = value.trim() && !exactMatch;

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreate(value.trim());
    } finally {
      setCreating(false);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (blurRef.current) clearTimeout(blurRef.current); setOpen(true); }}
        onBlur={() => { blurRef.current = setTimeout(() => setOpen(false), 150); }}
        style={{
          padding: "0.4rem 0.5rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
          fontSize: "0.9rem",
          width: "100%",
        }}
      />
      {open && (filtered.length > 0 || showCreate) && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, background: "#fff",
          border: "1px solid #ccc", borderTop: "none", borderRadius: "0 0 4px 4px",
          maxHeight: "180px", overflowY: "auto", zIndex: 20,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}>
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(item); setOpen(false); }}
              style={{ display: "block", width: "100%", padding: "0.45rem 0.6rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >
              {item.label}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={creating}
              style={{ display: "block", width: "100%", padding: "0.45rem 0.6rem", textAlign: "left", background: "#dbeafe", border: "none", borderTop: filtered.length ? "1px solid #e5e7eb" : "none", cursor: creating ? "wait" : "pointer", fontSize: "0.9rem", fontWeight: 500, color: "#1d4ed8" }}
              onMouseOver={(e) => { if (!creating) e.currentTarget.style.background = "#bfdbfe"; }}
              onMouseOut={(e) => { if (!creating) e.currentTarget.style.background = "#dbeafe"; }}
            >
              {creating ? "Création..." : (createLabel ? createLabel(value.trim()) : `Créer « ${value.trim()} »`)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IngredientsClient({
  initialIngredients,
  units: initialUnits,
  aisles: initialAisles,
}: {
  initialIngredients: IngredientRow[];
  units: Unit[];
  aisles: Aisle[];
}) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>(initialIngredients);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [aisles, setAisles] = useState<Aisle[]>(initialAisles);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [editUnitLabel, setEditUnitLabel] = useState("");
  const [editAisleId, setEditAisleId] = useState<string | null>(null);
  const [editAisleLabel, setEditAisleLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  function startEdit(item: IngredientRow) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditUnitId(item.defaultUnitId);
    setEditUnitLabel(item.defaultUnitAbbr ?? "");
    setEditAisleId(item.defaultAisleId);
    setEditAisleLabel(item.defaultAisleName ?? "");
    setError(null);
  }

  function cancelEdit() { setEditingId(null); setError(null); }

  const handleSelectUnit = useCallback((item: { id: string; label: string }) => {
    setEditUnitId(item.id);
    setEditUnitLabel(item.label);
  }, []);

  const handleCreateUnit = useCallback(async (label: string) => {
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID, abbr: label, name: label }),
    });
    if (res.ok) {
      const created: Unit = await res.json();
      setUnits((prev) => [...prev, created].sort((a, b) => a.abbr.localeCompare(b.abbr)));
      setEditUnitId(created.id);
      setEditUnitLabel(created.abbr);
    }
  }, []);

  const handleSelectAisle = useCallback((item: { id: string; label: string }) => {
    setEditAisleId(item.id);
    setEditAisleLabel(item.label);
  }, []);

  const handleCreateAisle = useCallback(async (label: string) => {
    const res = await fetch("/api/aisles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID, name: label }),
    });
    if (res.ok) {
      const created: Aisle = await res.json();
      setAisles((prev) => [...prev, created]);
      setEditAisleId(created.id);
      setEditAisleLabel(created.name);
    }
  }, []);

  async function handleSave(id: string) {
    if (!editName.trim()) { setError("Le nom ne peut pas être vide."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingredients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          defaultUnitId: editUnitId ?? null,
          defaultAisleId: editAisleId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `Erreur ${res.status}`); return; }
      setIngredients((prev) =>
        prev.map((i) => (i.id === id ? data : i)).sort((a, b) => a.name.localeCompare(b.name, "fr"))
      );
      setEditingId(null);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  const unitItems = units.map((u) => ({ id: u.id, label: u.abbr }));
  const aisleItems = aisles.map((a) => ({ id: a.id, label: a.name }));

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Rechercher un ingrédient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "0.4rem 0.5rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.9rem", width: "280px" }}
        />
        <span style={{ marginLeft: "0.75rem", color: "#888", fontSize: "0.85rem" }}>
          {filtered.length} ingrédient{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left", fontSize: "0.85rem", color: "#666" }}>
            <th style={{ padding: "0.5rem 0.75rem" }}>Nom</th>
            <th style={{ padding: "0.5rem 0.75rem" }}>Rayon par défaut</th>
            <th style={{ padding: "0.5rem 0.75rem" }}>Unité par défaut</th>
            <th style={{ padding: "0.5rem 0.75rem" }}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              {editingId === item.id ? (
                <>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ padding: "0.4rem 0.5rem", border: "1px solid #ccc", borderRadius: "4px", fontSize: "0.9rem", width: "100%" }}
                    />
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <Autocomplete
                      value={editAisleLabel}
                      onChange={(v) => { setEditAisleLabel(v); setEditAisleId(null); }}
                      items={aisleItems}
                      onSelect={handleSelectAisle}
                      onCreate={handleCreateAisle}
                      placeholder="Rayon..."
                    />
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <Autocomplete
                      value={editUnitLabel}
                      onChange={(v) => { setEditUnitLabel(v); setEditUnitId(null); }}
                      items={unitItems}
                      onSelect={handleSelectUnit}
                      onCreate={handleCreateUnit}
                      placeholder="Unité..."
                    />
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => handleSave(item.id)} disabled={saving}
                        style={{ padding: "0.35rem 0.7rem", background: saving ? "#9ca3af" : "#16a34a", color: "#fff", border: "none", borderRadius: "4px", cursor: saving ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: 500 }}>
                        {saving ? "..." : "Sauver"}
                      </button>
                      <button onClick={cancelEdit}
                        style={{ padding: "0.35rem 0.7rem", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}>
                        Annuler
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: "0.6rem 0.75rem", fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: item.defaultAisleName ? "#374151" : "#9ca3af" }}>
                    {item.defaultAisleName ?? "—"}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: item.defaultUnitAbbr ? "#374151" : "#9ca3af" }}>
                    {item.defaultUnitAbbr ?? "—"}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <button onClick={() => startEdit(item)}
                      style={{ padding: "0.35rem 0.7rem", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>
                      Modifier
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p style={{ color: "#888", marginTop: "1rem" }}>Aucun ingrédient trouvé.</p>
      )}
    </div>
  );
}
