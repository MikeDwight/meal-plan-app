"use client";

import { useState } from "react";

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

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  border: "1px solid #ccc",
  borderRadius: "4px",
  fontSize: "0.9rem",
  background: "#fff",
};

const btnStyle = (color: string, bg: string, border: string): React.CSSProperties => ({
  padding: "0.35rem 0.7rem",
  background: bg,
  color: color,
  border: `1px solid ${border}`,
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: 500,
});

export function IngredientsClient({
  initialIngredients,
  units,
  aisles,
}: {
  initialIngredients: IngredientRow[];
  units: Unit[];
  aisles: Aisle[];
}) {
  const [ingredients, setIngredients] = useState<IngredientRow[]>(initialIngredients);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnitId, setEditUnitId] = useState("");
  const [editAisleId, setEditAisleId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  function startEdit(item: IngredientRow) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditUnitId(item.defaultUnitId ?? "");
    setEditAisleId(item.defaultAisleId ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

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
          defaultUnitId: editUnitId || null,
          defaultAisleId: editAisleId || null,
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

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Rechercher un ingrédient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: "280px" }}
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
                      style={{ ...inputStyle, width: "100%" }}
                    />
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <select value={editAisleId} onChange={(e) => setEditAisleId(e.target.value)} style={inputStyle}>
                      <option value="">— Aucun —</option>
                      {aisles.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem" }}>
                    <select value={editUnitId} onChange={(e) => setEditUnitId(e.target.value)} style={inputStyle}>
                      <option value="">— Aucune —</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.abbr}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "0.4rem 0.75rem", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => handleSave(item.id)} disabled={saving} style={btnStyle("#fff", saving ? "#9ca3af" : "#16a34a", saving ? "#9ca3af" : "#16a34a")}>
                        {saving ? "..." : "Sauver"}
                      </button>
                      <button onClick={cancelEdit} style={btnStyle("#374151", "#f3f4f6", "#d1d5db")}>
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
                    <button onClick={() => startEdit(item)} style={btnStyle("#1d4ed8", "#eff6ff", "#bfdbfe")}>
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
