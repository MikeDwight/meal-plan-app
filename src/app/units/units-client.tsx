"use client";

import { useState } from "react";

interface UnitRow {
  id: string;
  name: string;
  abbr: string;
  usageCount: number;
}

export function UnitsClient({ initialUnits }: { initialUnits: UnitRow[] }) {
  const [units, setUnits] = useState<UnitRow[]>(initialUnits);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAbbr, setEditAbbr] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function startEdit(unit: UnitRow) {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditAbbr(unit.abbr);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSave(id: string) {
    if (!editName.trim() || !editAbbr.trim()) {
      setEditError("Le nom et l'abréviation sont requis.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), abbr: editAbbr.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? `Erreur ${res.status}`); return; }
      setUnits((prev) =>
        prev.map((u) => (u.id === id ? { ...u, name: data.name, abbr: data.abbr } : u))
          .sort((a, b) => a.abbr.localeCompare(b.abbr, "fr"))
      );
      setEditingId(null);
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      if (res.status === 204) {
        setUnits((prev) => prev.filter((u) => u.id !== id));
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

  const baseInputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem",
    border: "1px solid rgba(71,235,191,0.3)", borderRadius: "0.5rem",
    fontSize: "0.875rem", background: "#fff", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ paddingBottom: "2rem" }}>
      <div style={{ padding: "2rem 0 1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>Unités</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
          {units.length} unité{units.length !== 1 ? "s" : ""}
        </p>
      </div>

      {deleteError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#b91c1c" }}>
          {deleteError}
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: "0.75rem", overflow: "hidden", boxShadow: "0 4px 20px -2px rgba(71,235,191,0.1)", border: "1px solid rgba(71,235,191,0.08)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", padding: "0.75rem 1.5rem", background: "rgba(71,235,191,0.06)", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8" }}>
          <div>Nom</div>
          <div>Abréviation</div>
          <div>Utilisée</div>
          <div />
        </div>

        {units.length === 0 && (
          <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem", margin: 0 }}>Aucune unité.</p>
        )}

        {units.map((unit, idx) =>
          editingId === unit.id ? (
            <div key={unit.id} style={{ padding: "1rem 1.5rem", background: "rgba(71,235,191,0.07)", borderLeft: "4px solid #47ebbf", borderTop: idx > 0 ? "1px solid rgba(71,235,191,0.1)" : "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Nom</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={baseInputStyle} autoFocus />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "0.25rem", letterSpacing: "0.06em" }}>Abréviation</label>
                  <input type="text" value={editAbbr} onChange={(e) => setEditAbbr(e.target.value)} style={baseInputStyle} />
                </div>
              </div>
              {editError && <p style={{ color: "#b91c1c", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>{editError}</p>}
              <div style={{ display: "flex", gap: "0.625rem" }}>
                <button type="button" onClick={() => handleSave(unit.id)} disabled={saving}
                  style={{ flex: 1, height: "2.5rem", background: saving ? "#a7f3d0" : "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.875rem", border: "none", borderRadius: "0.5rem", cursor: saving ? "wait" : "pointer" }}>
                  {saving ? "…" : "Sauver"}
                </button>
                <button type="button" onClick={cancelEdit}
                  style={{ flex: 1, height: "2.5rem", background: "#f8fafc", color: "#64748b", fontWeight: 600, fontSize: "0.875rem", border: "1px solid #e2e8f0", borderRadius: "0.5rem", cursor: "pointer" }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div key={unit.id}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", padding: "1rem 1.5rem", alignItems: "center", borderTop: idx > 0 ? "1px solid rgba(71,235,191,0.07)" : "none" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "rgba(71,235,191,0.04)")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.9rem" }}>{unit.name}</div>
              <div style={{ fontSize: "0.875rem", color: "#475569", fontFamily: "monospace" }}>{unit.abbr}</div>
              <div style={{ fontSize: "0.8rem", color: unit.usageCount > 0 ? "#64748b" : "#cbd5e1" }}>
                {unit.usageCount > 0 ? `${unit.usageCount} usage${unit.usageCount > 1 ? "s" : ""}` : "—"}
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", justifyContent: "flex-end" }}>
                {deletingId === unit.id ? (
                  <>
                    <button type="button" onClick={() => handleDelete(unit.id)}
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
                    <button type="button" onClick={() => startEdit(unit)}
                      style={{ background: "none", border: "none", color: "#47ebbf", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", padding: 0 }}
                      onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >Modifier</button>
                    <button type="button" onClick={() => { setDeletingId(unit.id); setDeleteError(null); }}
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
        )}
      </div>
    </div>
  );
}
