"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface TransitionItemProps {
  id: string;
  label: string;
  quantity: string | null;
  status: "TODO" | "DONE";
}

interface ArticleSuggestion {
  id: string;
  name: string;
  defaultUnitId: string | null;
  defaultAisleId: string | null;
}

interface Aisle {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  abbr: string;
}

interface AutocompleteItem { id: string; label: string; }

function PanelAutocomplete({ value, onChange, items, onSelect, onCreate, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  items: AutocompleteItem[];
  onSelect: (item: AutocompleteItem) => void;
  onCreate: (label: string) => Promise<void>;
  placeholder?: string;
}) {
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

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (blurRef.current) clearTimeout(blurRef.current); setOpen(true); }}
        onBlur={() => { blurRef.current = setTimeout(() => setOpen(false), 150); }}
        style={{ ...panelInputStyle }}
      />
      {open && (filtered.length > 0 || showCreate) && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0 0 0.5rem 0.5rem", maxHeight: "160px", overflowY: "auto", zIndex: 60, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          {filtered.map((item) => (
            <button key={item.id} type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(item); setOpen(false); }}
              style={{ display: "block", width: "100%", padding: "0.4rem 0.6rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf9"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >{item.label}</button>
          ))}
          {showCreate && (
            <button type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={creating}
              style={{ display: "block", width: "100%", padding: "0.4rem 0.6rem", textAlign: "left", background: "rgba(71,235,191,0.1)", border: "none", borderTop: filtered.length ? "1px solid #e2e8f0" : "none", cursor: creating ? "wait" : "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#0f766e" }}
              onMouseOver={(e) => { if (!creating) (e.currentTarget as HTMLButtonElement).style.background = "rgba(71,235,191,0.2)"; }}
              onMouseOut={(e) => { if (!creating) (e.currentTarget as HTMLButtonElement).style.background = "rgba(71,235,191,0.1)"; }}
            >{creating ? "Création…" : `Créer « ${value.trim()} »`}</button>
          )}
        </div>
      )}
    </div>
  );
}

const HOUSEHOLD_ID = "home-household";

export function TransitionListClient({ items }: { items: TransitionItemProps[] }) {
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();
  const [isApplying, startApplyTransition] = useTransition();
  const [isPurging, startPurgeTransition] = useTransition();

  // Add form state
  const [articleName, setArticleName] = useState("");
  const [articleId, setArticleId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  // Create panel
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [aisleLabel, setAisleLabel] = useState("");
  const [aisleIdCreate, setAisleIdCreate] = useState<string | null>(null);
  const [unitLabel, setUnitLabel] = useState("");
  const [unitIdCreate, setUnitIdCreate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  const visibleItems = showDone ? items : items.filter((i) => i.status !== "DONE");
  const todoCount = items.filter((i) => i.status === "TODO").length;
  const doneCount = items.filter((i) => i.status === "DONE").length;

  const searchArticles = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/ingredients?householdId=${HOUSEHOLD_ID}&q=${encodeURIComponent(q.trim())}&limit=8`);
      if (res.ok) setSuggestions(await res.json());
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, []);

  const handleArticleNameChange = useCallback((value: string) => {
    setArticleName(value);
    setArticleId(null);
    setSelectedUnitId(null);
    setSelectedAisleId(null);
    setShowSuggestions(true);
    setShowCreatePanel(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchArticles(value), 300);
  }, [searchArticles]);

  const handleSelectSuggestion = useCallback((s: ArticleSuggestion) => {
    setArticleName(s.name);
    setArticleId(s.id);
    setSelectedUnitId(s.defaultUnitId);
    setSelectedAisleId(s.defaultAisleId);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleOpenCreatePanel = useCallback(async () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setShowSuggestions(false);
    setSuggestions([]);
    setAisleLabel("");
    setAisleIdCreate(null);
    setUnitLabel("");
    setUnitIdCreate(null);
    setShowCreatePanel(true);
    try {
      const [aislesRes, unitsRes] = await Promise.all([
        aisles.length === 0 ? fetch(`/api/aisles?householdId=${HOUSEHOLD_ID}`) : Promise.resolve(null),
        units.length === 0 ? fetch(`/api/units?householdId=${HOUSEHOLD_ID}`) : Promise.resolve(null),
      ]);
      if (aislesRes?.ok) setAisles(await aislesRes.json());
      if (unitsRes?.ok) setUnits(await unitsRes.json());
    } catch { /* ignore */ }
  }, [aisles.length, units.length]);

  const handleSelectAisle = useCallback((item: AutocompleteItem) => {
    setAisleIdCreate(item.id);
    setAisleLabel(item.label);
  }, []);

  const handleCreateAisle = useCallback(async (label: string) => {
    const res = await fetch("/api/aisles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID, name: label }) });
    if (res.ok) {
      const created: Aisle = await res.json();
      setAisles((prev) => [...prev, created]);
      setAisleIdCreate(created.id);
      setAisleLabel(created.name);
    }
  }, []);

  const handleSelectUnit = useCallback((item: AutocompleteItem) => {
    setUnitIdCreate(item.id);
    setUnitLabel(item.label);
  }, []);

  const handleCreateUnit = useCallback(async (label: string) => {
    const res = await fetch("/api/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ householdId: HOUSEHOLD_ID, abbr: label, name: label }) });
    if (res.ok) {
      const created: Unit = await res.json();
      setUnits((prev) => [...prev, created]);
      setUnitIdCreate(created.id);
      setUnitLabel(created.abbr);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = articleName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: HOUSEHOLD_ID,
          name: trimmed,
          defaultAisleId: aisleIdCreate || null,
          defaultUnitId: unitIdCreate || null,
        }),
      });
      if (res.ok) {
        const created: ArticleSuggestion = await res.json();
        const resolvedUnitId = unitIdCreate || created.defaultUnitId;
        const resolvedAisleId = aisleIdCreate || created.defaultAisleId;

        // Auto-add to transition list immediately
        const body: Record<string, unknown> = {
          householdId: HOUSEHOLD_ID,
          label: trimmed,
          ingredientId: created.id,
        };
        if (newQuantity.trim() !== "") body.quantity = Number(newQuantity);
        if (resolvedUnitId) body.unitId = resolvedUnitId;
        if (resolvedAisleId) body.aisleId = resolvedAisleId;

        await fetch("/api/transitionitems", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        resetForm();
        startAddTransition(() => router.refresh());
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
      setShowCreatePanel(false);
    }
  }, [articleName, aisleIdCreate, unitIdCreate, newQuantity]);

  function resetForm() {
    setArticleName("");
    setArticleId(null);
    setSelectedUnitId(null);
    setSelectedAisleId(null);
    setNewQuantity("");
    setSuggestions([]);
    setShowSuggestions(false);
    setShowCreatePanel(false);
    setAisleLabel("");
    setAisleIdCreate(null);
    setUnitLabel("");
    setUnitIdCreate(null);
  }

  async function handleAdd() {
    const trimmed = articleName.trim();
    if (!trimmed) return;

    const body: Record<string, unknown> = { householdId: HOUSEHOLD_ID, label: trimmed };
    if (newQuantity.trim() !== "") body.quantity = Number(newQuantity);
    if (articleId) {
      body.ingredientId = articleId;
      if (selectedUnitId) body.unitId = selectedUnitId;
      if (selectedAisleId) body.aisleId = selectedAisleId;
    }

    await fetch("/api/transitionitems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    resetForm();
    startAddTransition(() => router.refresh());
  }

  async function handlePurge() {
    await fetch(`/api/transitionitems?householdId=${HOUSEHOLD_ID}`, { method: "DELETE" });
    startPurgeTransition(() => router.refresh());
  }

  async function handleApply() {
    setApplyMessage(null);
    const res = await fetch("/api/transition/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
    });
    if (res.ok) {
      const data = await res.json();
      setApplyMessage(`Appliqué : ${data.created} créé(s), ${data.merged} fusionné(s)`);
    }
    startApplyTransition(() => router.refresh());
  }

  const addForm = (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            placeholder="Ajouter un article…"
            value={articleName}
            onChange={(e) => handleArticleNameChange(e.target.value)}
            onFocus={() => { if (articleName.trim() && !showCreatePanel) setShowSuggestions(true); }}
            onBlur={() => { blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !showCreatePanel) handleAdd(); }}
            disabled={isAdding}
            style={inputStyle}
          />
          {showSuggestions && articleName.trim() && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "0.625rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              zIndex: 50,
              overflow: "hidden",
            }}>
              {searching && (
                <div style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "#94a3b8" }}>…</div>
              )}
              {!searching && suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => { if (blurTimeout.current) clearTimeout(blurTimeout.current); handleSelectSuggestion(s); }}
                  style={suggestionBtnStyle}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf9"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  {s.name}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={handleOpenCreatePanel}
                style={{ ...suggestionBtnStyle, color: "#47ebbf", fontWeight: 600 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                + Ajouter &ldquo;{articleName.trim()}&rdquo;
              </button>
            </div>
          )}
        </div>
        <input
          type="number"
          placeholder="Qté"
          value={newQuantity}
          onChange={(e) => setNewQuantity(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !showCreatePanel) handleAdd(); }}
          disabled={isAdding}
          style={{ ...inputStyle, width: "5rem", flex: "none" }}
        />
        <AddButton onClick={handleAdd} disabled={isAdding || articleName.trim() === "" || showCreatePanel} />
      </div>

      {showCreatePanel && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "0.75rem",
          background: "#f0fdf9",
          border: "1px solid rgba(71,235,191,0.3)",
          borderRadius: "0.625rem",
        }}>
          <span style={{ fontSize: "0.8rem", color: "#334155", fontWeight: 600 }}>
            Détails pour &ldquo;{articleName.trim()}&rdquo;
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Rayon</label>
              <PanelAutocomplete
                value={aisleLabel}
                onChange={(v) => { setAisleLabel(v); setAisleIdCreate(null); }}
                items={aisles.map((a) => ({ id: a.id, label: a.name }))}
                onSelect={handleSelectAisle}
                onCreate={handleCreateAisle}
                placeholder="Rayon…"
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Unité</label>
              <PanelAutocomplete
                value={unitLabel}
                onChange={(v) => { setUnitLabel(v); setUnitIdCreate(null); }}
                items={units.map((u) => ({ id: u.id, label: u.abbr }))}
                onSelect={handleSelectUnit}
                onCreate={handleCreateUnit}
                placeholder="Unité…"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              style={{
                flex: 1,
                padding: "0.4rem 0.75rem",
                background: "#47ebbf",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "0.8rem",
                border: "none",
                borderRadius: "0.5rem",
                cursor: creating ? "wait" : "pointer",
              }}
            >
              {creating ? "…" : "Confirmer"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreatePanel(false)}
              style={{
                padding: "0.4rem 0.75rem",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "0.8rem",
                border: "1px solid #e2e8f0",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {articleId && !showCreatePanel && (
        <div style={{ fontSize: "0.75rem", color: "#47ebbf", fontWeight: 600, paddingLeft: "0.25rem" }}>
          ✓ Article connu
        </div>
      )}
    </div>
  );

  if (items.length === 0 && !isAdding) {
    return (
      <div style={{ marginBottom: "2rem" }}>
        <SectionHeader label="Articles ponctuels" />
        <div style={{ marginTop: "0.75rem" }}>{addForm}</div>
      </div>
    );
  }

  return (
    <section style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <SectionHeader label="Articles ponctuels" />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {todoCount > 0 && (
            <button
              onClick={handleApply}
              disabled={isApplying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.4rem 0.875rem",
                background: "#47ebbf",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: "0.8rem",
                border: "none",
                borderRadius: "999px",
                cursor: isApplying ? "wait" : "pointer",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>add_shopping_cart</span>
              {isApplying ? "…" : `Appliquer (${todoCount})`}
            </button>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "#64748b", cursor: "pointer" }}>
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Voir faits
          </label>
          {doneCount > 0 && (
            <button
              onClick={handlePurge}
              disabled={isPurging}
              style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#94a3b8", cursor: isPurging ? "wait" : "pointer", padding: 0, textDecoration: "underline" }}
            >
              {isPurging ? "…" : `Purger (${doneCount})`}
            </button>
          )}

        </div>
      </div>

      {applyMessage && (
        <p style={{ color: "#16a34a", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{applyMessage}</p>
      )}

      <div style={{ marginBottom: "0.75rem" }}>{addForm}</div>

      {visibleItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {visibleItems.map((item) => (
            <TransitionRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{
        background: "rgba(71,235,191,0.1)",
        border: "1px solid rgba(71,235,191,0.2)",
        borderRadius: "999px",
        padding: "0.2rem 0.75rem",
      }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div style={{ flex: 1, height: "1px", background: "rgba(71,235,191,0.15)" }} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.625rem",
  fontSize: "0.875rem",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const panelInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.6rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.5rem",
  fontSize: "0.8rem",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const suggestionBtnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  background: "transparent",
  border: "none",
  fontSize: "0.875rem",
  cursor: "pointer",
  color: "#0f172a",
};

function AddButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.55rem 1rem",
        background: disabled ? "#d1d5db" : "#47ebbf",
        color: "#0f172a",
        fontWeight: 700,
        fontSize: "0.875rem",
        border: "none",
        borderRadius: "0.625rem",
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      +
    </button>
  );
}

function TransitionRow({ item }: { item: TransitionItemProps }) {
  const router = useRouter();
  const [isToggling, startToggleTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const isPending = isToggling || isDeleting;
  const isDone = item.status === "DONE";

  async function handleToggle() {
    await fetch(`/api/transitionitem/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
    });
    startToggleTransition(() => router.refresh());
  }

  async function handleDelete() {
    await fetch(`/api/transitionitem/${item.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
    });
    startDeleteTransition(() => router.refresh());
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.875rem",
      padding: "0.75rem 1rem",
      background: isDone ? "rgba(255,255,255,0.5)" : "#fff",
      borderRadius: "0.75rem",
      border: isDone ? "1px solid transparent" : "1px solid #f1f5f9",
      boxShadow: isDone ? "none" : "0 2px 8px -1px rgba(0,0,0,0.04)",
      opacity: isDone ? 0.6 : 1,
    }}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        style={{
          flexShrink: 0,
          width: "1.5rem",
          height: "1.5rem",
          borderRadius: "50%",
          border: isDone ? "2px solid #47ebbf" : "2px solid #cbd5e1",
          background: isDone ? "#47ebbf" : "transparent",
          cursor: isPending ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        {isDone && (
          <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#0f172a", fontVariationSettings: "'wght' 700" }}>
            check
          </span>
        )}
      </button>

      <span style={{
        flex: 1,
        fontWeight: 600,
        fontSize: "0.9rem",
        color: isDone ? "#94a3b8" : "#0f172a",
        textDecoration: isDone ? "line-through" : "none",
      }}>
        {item.label}
        {item.quantity != null && (
          <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: "0.375rem" }}>× {item.quantity}</span>
        )}
      </span>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        style={{
          padding: "0.25rem",
          background: "transparent",
          border: "none",
          cursor: isPending ? "wait" : "pointer",
          color: "#cbd5e1",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
      </button>
    </div>
  );
}
