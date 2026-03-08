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

// ─── Autocomplete ─────────────────────────────────────────────────────────────

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  items: { id: string; label: string }[];
  onSelect: (item: { id: string; label: string }) => void;
  onCreate: (label: string) => Promise<void>;
  placeholder?: string;
}

function Autocomplete({ value, onChange, items, onSelect, onCreate, placeholder }: AutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const blurRef = useRef<NodeJS.Timeout | null>(null);

  const filtered = value.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(value.toLowerCase()))
    : items;
  const exactMatch = items.some((i) => i.label.toLowerCase() === value.trim().toLowerCase());
  const showCreate = value.trim() && !exactMatch;

  async function handleCreate() {
    setCreating(true);
    try { await onCreate(value.trim()); }
    finally { setCreating(false); setOpen(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "1px solid rgba(71,235,191,0.3)",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (blurRef.current) clearTimeout(blurRef.current); setOpen(true); }}
        onBlur={() => { blurRef.current = setTimeout(() => setOpen(false), 150); }}
        style={inputStyle}
      />
      {open && (filtered.length > 0 || showCreate) && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0 0 0.5rem 0.5rem", maxHeight: "180px", overflowY: "auto", zIndex: 20, boxShadow: "0 8px 16px rgba(0,0,0,0.08)" }}>
          {filtered.map((item) => (
            <button key={item.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSelect(item); setOpen(false); }}
              style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >{item.label}</button>
          ))}
          {showCreate && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleCreate} disabled={creating}
              style={{ display: "block", width: "100%", padding: "0.5rem 0.75rem", textAlign: "left", background: "rgba(71,235,191,0.1)", border: "none", borderTop: filtered.length ? "1px solid #e2e8f0" : "none", cursor: creating ? "wait" : "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#0f766e" }}
              onMouseOver={(e) => { if (!creating) e.currentTarget.style.background = "rgba(71,235,191,0.2)"; }}
              onMouseOut={(e) => { if (!creating) e.currentTarget.style.background = "rgba(71,235,191,0.1)"; }}
            >{creating ? "Création…" : `Créer « ${value.trim()} »`}</button>
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

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [editUnitLabel, setEditUnitLabel] = useState("");
  const [editAisleId, setEditAisleId] = useState<string | null>(null);
  const [editAisleLabel, setEditAisleLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // New ingredient form
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnitId, setNewUnitId] = useState<string | null>(null);
  const [newUnitLabel, setNewUnitLabel] = useState("");
  const [newAisleId, setNewAisleId] = useState<string | null>(null);
  const [newAisleLabel, setNewAisleLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    setEditUnitId(item.id); setEditUnitLabel(item.label);
  }, []);

  const handleCreateUnit = useCallback(async (label: string) => {
    const res = await fetch("/api/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID, abbr: label, name: label }) });
    if (res.ok) {
      const created: Unit = await res.json();
      setUnits((prev) => [...prev, created].sort((a, b) => a.abbr.localeCompare(b.abbr)));
      setEditUnitId(created.id); setEditUnitLabel(created.abbr);
    }
  }, []);

  const handleSelectAisle = useCallback((item: { id: string; label: string }) => {
    setEditAisleId(item.id); setEditAisleLabel(item.label);
  }, []);

  const handleCreateAisle = useCallback(async (label: string) => {
    const res = await fetch("/api/aisles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID, name: label }) });
    if (res.ok) {
      const created: Aisle = await res.json();
      setAisles((prev) => [...prev, created]);
      setEditAisleId(created.id); setEditAisleLabel(created.name);
    }
  }, []);

  // New ingredient callbacks
  const handleSelectNewUnit = useCallback((item: { id: string; label: string }) => {
    setNewUnitId(item.id); setNewUnitLabel(item.label);
  }, []);

  const handleCreateNewUnit = useCallback(async (label: string) => {
    const res = await fetch("/api/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID, abbr: label, name: label }) });
    if (res.ok) {
      const created: Unit = await res.json();
      setUnits((prev) => [...prev, created].sort((a, b) => a.abbr.localeCompare(b.abbr)));
      setNewUnitId(created.id); setNewUnitLabel(created.abbr);
    }
  }, []);

  const handleSelectNewAisle = useCallback((item: { id: string; label: string }) => {
    setNewAisleId(item.id); setNewAisleLabel(item.label);
  }, []);

  const handleCreateNewAisle = useCallback(async (label: string) => {
    const res = await fetch("/api/aisles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID, name: label }) });
    if (res.ok) {
      const created: Aisle = await res.json();
      setAisles((prev) => [...prev, created]);
      setNewAisleId(created.id); setNewAisleLabel(created.name);
    }
  }, []);

  async function handleCreate() {
    if (!newName.trim()) { setCreateError("Le nom ne peut pas être vide."); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: HOUSEHOLD_ID, name: newName.trim(), defaultUnitId: newUnitId ?? null, defaultAisleId: newAisleId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? `Erreur ${res.status}`); return; }
      setIngredients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setNewName(""); setNewUnitId(null); setNewUnitLabel(""); setNewAisleId(null); setNewAisleLabel("");
      setShowNew(false);
    } catch {
      setCreateError("Erreur réseau.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        setIngredients((prev) => prev.filter((i) => i.id !== id));
        setDeletingId(null);
      } else {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error ?? `Erreur ${res.status}`);
        setDeletingId(null);
      }
    } catch {
      setDeleteError("Erreur réseau.");
      setDeletingId(null);
    }
  }

  async function handleSave(id: string) {
    if (!editName.trim()) { setError("Le nom ne peut pas être vide."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingredients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), defaultUnitId: editUnitId ?? null, defaultAisleId: editAisleId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? `Erreur ${res.status}`); return; }
      setIngredients((prev) => prev.map((i) => (i.id === id ? data : i)).sort((a, b) => a.name.localeCompare(b.name, "fr")));
      setEditingId(null);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  const unitItems = units.map((u) => ({ id: u.id, label: u.abbr }));
  const aisleItems = aisles.map((a) => ({ id: a.id, label: a.name }));

  const baseInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "1px solid rgba(71,235,191,0.3)",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "2rem 0 1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>Catalogue</h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
            {ingredients.length} article{ingredients.length !== 1 ? "s" : ""} enregistré{ingredients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowNew((v) => !v); setCreateError(null); }}
          style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.875rem", border: "none", borderRadius: "0.625rem", padding: "0.625rem 1rem", cursor: "pointer", boxShadow: "0 4px 20px -2px rgba(71,235,191,0.25)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>add</span>
          Nouveau
        </button>
      </div>

      {/* Search bar */}
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <span className="material-symbols-outlined" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "1.1rem", pointerEvents: "none" }}>search</span>
        <input
          type="text"
          placeholder="Rechercher un article…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 2.75rem", border: "none", borderRadius: "0.75rem", fontSize: "0.9rem", background: "#fff", boxShadow: "0 4px 20px -2px rgba(71,235,191,0.1)", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* New ingredient form */}
      {showNew && (
        <div style={{ background: "rgba(71,235,191,0.07)", borderRadius: "0.75rem", borderLeft: "4px solid #47ebbf", padding: "1.25rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Nom de l'article</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Farine T55" style={baseInputStyle} autoFocus />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Rayon</label>
                <Autocomplete value={newAisleLabel} onChange={(v) => { setNewAisleLabel(v); setNewAisleId(null); }} items={aisleItems} onSelect={handleSelectNewAisle} onCreate={handleCreateNewAisle} placeholder="Rayon…" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Unité</label>
                <Autocomplete value={newUnitLabel} onChange={(v) => { setNewUnitLabel(v); setNewUnitId(null); }} items={unitItems} onSelect={handleSelectNewUnit} onCreate={handleCreateNewUnit} placeholder="Unité…" />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button type="button" onClick={handleCreate} disabled={creating}
                style={{ flex: 1, height: "2.75rem", background: creating ? "#a7f3d0" : "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.875rem", border: "none", borderRadius: "0.625rem", cursor: creating ? "wait" : "pointer" }}>
                {creating ? "…" : "Sauver"}
              </button>
              <button type="button" onClick={() => { setShowNew(false); setCreateError(null); }}
                style={{ flex: 1, height: "2.75rem", background: "#f8fafc", color: "#64748b", fontWeight: 600, fontSize: "0.875rem", border: "1px solid #e2e8f0", borderRadius: "0.625rem", cursor: "pointer" }}>
                Annuler
              </button>
            </div>
          </div>
          {createError && <p style={{ color: "#b91c1c", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>{createError}</p>}
        </div>
      )}

      {/* Errors */}
      {error && <p style={{ color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>}
      {deleteError && <p style={{ color: "#b91c1c", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{deleteError}</p>}

      {/* Table card */}
      <div style={{ background: "#fff", borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 4px 20px -2px rgba(71,235,191,0.1)", border: "1px solid rgba(71,235,191,0.08)" }}>
        {/* Header row */}
        <div className="ing-read-grid" style={{ display: "grid", gridTemplateColumns: "5fr 3fr 2fr 2fr", gap: "1rem", padding: "0.75rem 1.5rem", background: "rgba(71,235,191,0.06)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
          <div>Nom</div>
          <div className="ing-col-rayon">Rayon</div>
          <div className="ing-col-unite">Unité</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {/* Rows */}
        <div>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem", margin: 0 }}>Aucun article trouvé.</p>
          )}
          {filtered.map((item, idx) => (
            editingId === item.id ? (
              /* Edit row */
              <div key={item.id} style={{ padding: "1rem 1.5rem", background: "rgba(71,235,191,0.07)", borderLeft: "4px solid #47ebbf", borderTop: idx > 0 ? "1px solid rgba(71,235,191,0.1)" : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Nom de l'article</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={baseInputStyle} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Rayon</label>
                      <Autocomplete value={editAisleLabel} onChange={(v) => { setEditAisleLabel(v); setEditAisleId(null); }} items={aisleItems} onSelect={handleSelectAisle} onCreate={handleCreateAisle} placeholder="Rayon…" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Unité</label>
                      <Autocomplete value={editUnitLabel} onChange={(v) => { setEditUnitLabel(v); setEditUnitId(null); }} items={unitItems} onSelect={handleSelectUnit} onCreate={handleCreateUnit} placeholder="Unité…" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.625rem" }}>
                    <button type="button" onClick={() => handleSave(item.id)} disabled={saving}
                      style={{ flex: 1, height: "2.75rem", background: saving ? "#a7f3d0" : "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.875rem", border: "none", borderRadius: "0.625rem", cursor: saving ? "wait" : "pointer" }}>
                      {saving ? "…" : "Sauver"}
                    </button>
                    <button type="button" onClick={cancelEdit}
                      style={{ flex: 1, height: "2.75rem", background: "#f8fafc", color: "#64748b", fontWeight: 600, fontSize: "0.875rem", border: "1px solid #e2e8f0", borderRadius: "0.625rem", cursor: "pointer" }}>
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Read row */
              <div key={item.id}
                className="ing-read-grid"
                style={{ display: "grid", gridTemplateColumns: "5fr 3fr 2fr 2fr", gap: "1rem", padding: "1rem 1.5rem", alignItems: "center", borderTop: idx > 0 ? "1px solid rgba(71,235,191,0.07)" : "none", transition: "background 0.15s" }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(71,235,191,0.04)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>{item.name}</div>
                <div className="ing-col-rayon" style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem", color: item.defaultAisleName ? "#475569" : "#cbd5e1" }}>
                  {item.defaultAisleName && (
                    <span className="material-symbols-outlined" style={{ fontSize: "0.875rem", color: "#94a3b8" }}>store</span>
                  )}
                  {item.defaultAisleName ?? "—"}
                </div>
                <div className="ing-col-unite" style={{ fontSize: "0.875rem", color: item.defaultUnitAbbr ? "#475569" : "#cbd5e1" }}>{item.defaultUnitAbbr ?? "—"}</div>
                <div style={{ textAlign: "right", display: "flex", gap: "0.75rem", justifyContent: "flex-end", alignItems: "center" }}>
                  {deletingId === item.id ? (
                    <>
                      <button type="button" onClick={() => handleDelete(item.id)}
                        style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", padding: 0 }}>
                        Confirmer
                      </button>
                      <button type="button" onClick={() => setDeletingId(null)}
                        style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.875rem", cursor: "pointer", padding: 0 }}>
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(item)}
                        style={{ background: "none", border: "none", color: "#47ebbf", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", padding: 0 }}
                        onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                        onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                      >Modifier</button>
                      <button type="button" onClick={() => { setDeletingId(item.id); setDeleteError(null); }}
                        style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: "0.875rem", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                        onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                        onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
