"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface TransitionItemProps {
  id: string;
  label: string;
  quantity: string | null;
  status: "TODO" | "DONE";
}

interface IngredientSuggestion {
  id: string;
  name: string;
  defaultUnitId: string | null;
  defaultAisleId: string | null;
}

interface Aisle {
  id: string;
  name: string;
}

const HOUSEHOLD_ID = "home-household";

export function TransitionListClient({ items }: { items: TransitionItemProps[] }) {
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();
  const [isApplying, startApplyTransition] = useTransition();

  // Add form state
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientId, setIngredientId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  // Create ingredient panel
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [aisleForCreate, setAisleForCreate] = useState("");
  const [creating, setCreating] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const blurTimeout = useRef<NodeJS.Timeout | null>(null);

  const visibleItems = showDone ? items : items.filter((i) => i.status !== "DONE");
  const todoCount = items.filter((i) => i.status === "TODO").length;

  const searchIngredients = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/ingredients?householdId=${HOUSEHOLD_ID}&q=${encodeURIComponent(q.trim())}&limit=8`);
      if (res.ok) setSuggestions(await res.json());
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  }, []);

  const handleIngredientChange = useCallback((value: string) => {
    setIngredientName(value);
    setIngredientId(null);
    setSelectedUnitId(null);
    setSelectedAisleId(null);
    setShowSuggestions(true);
    setShowCreatePanel(false);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchIngredients(value), 300);
  }, [searchIngredients]);

  const handleSelectSuggestion = useCallback((s: IngredientSuggestion) => {
    setIngredientName(s.name);
    setIngredientId(s.id);
    setSelectedUnitId(s.defaultUnitId);
    setSelectedAisleId(s.defaultAisleId);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleOpenCreatePanel = useCallback(async () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setShowSuggestions(false);
    setSuggestions([]);
    setAisleForCreate("");
    setShowCreatePanel(true);
    if (aisles.length === 0) {
      try {
        const res = await fetch(`/api/aisles?householdId=${HOUSEHOLD_ID}`);
        if (res.ok) setAisles(await res.json());
      } catch { /* ignore */ }
    }
  }, [aisles.length]);

  const handleCreateIngredient = useCallback(async () => {
    const trimmed = ingredientName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId: HOUSEHOLD_ID,
          name: trimmed,
          defaultAisleId: aisleForCreate || null,
        }),
      });
      if (res.ok) {
        const created: IngredientSuggestion = await res.json();
        setIngredientId(created.id);
        setSelectedUnitId(created.defaultUnitId);
        setSelectedAisleId(aisleForCreate || created.defaultAisleId);
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
      setShowCreatePanel(false);
    }
  }, [ingredientName, aisleForCreate]);

  function resetForm() {
    setIngredientName("");
    setIngredientId(null);
    setSelectedUnitId(null);
    setSelectedAisleId(null);
    setNewQuantity("");
    setSuggestions([]);
    setShowSuggestions(false);
    setShowCreatePanel(false);
    setAisleForCreate("");
  }

  async function handleAdd() {
    const trimmed = ingredientName.trim();
    if (!trimmed) return;

    const body: Record<string, unknown> = { householdId: HOUSEHOLD_ID, label: trimmed };
    if (newQuantity.trim() !== "") body.quantity = Number(newQuantity);
    if (ingredientId) {
      body.ingredientId = ingredientId;
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
            value={ingredientName}
            onChange={(e) => handleIngredientChange(e.target.value)}
            onFocus={() => { if (ingredientName.trim() && !showCreatePanel) setShowSuggestions(true); }}
            onBlur={() => { blurTimeout.current = setTimeout(() => setShowSuggestions(false), 150); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !showCreatePanel) handleAdd(); }}
            disabled={isAdding}
            style={inputStyle}
          />
          {showSuggestions && ingredientName.trim() && (
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
                + Créer &ldquo;{ingredientName.trim()}&rdquo; comme ingrédient
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
        <AddButton onClick={handleAdd} disabled={isAdding || ingredientName.trim() === "" || showCreatePanel} />
      </div>

      {showCreatePanel && (
        <div style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          padding: "0.625rem 0.75rem",
          background: "#f0fdf9",
          border: "1px solid rgba(71,235,191,0.3)",
          borderRadius: "0.625rem",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.8rem", color: "#334155", fontWeight: 600, whiteSpace: "nowrap" }}>
            Rayon pour &ldquo;{ingredientName.trim()}&rdquo; :
          </span>
          <select
            value={aisleForCreate}
            onChange={(e) => setAisleForCreate(e.target.value)}
            style={{
              flex: 1,
              minWidth: "8rem",
              padding: "0.375rem 0.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              background: "#fff",
              outline: "none",
            }}
          >
            <option value="">— Sans rayon —</option>
            {aisles.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateIngredient}
            disabled={creating}
            style={{
              padding: "0.375rem 0.75rem",
              background: "#47ebbf",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: "0.8rem",
              border: "none",
              borderRadius: "0.5rem",
              cursor: creating ? "wait" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {creating ? "…" : "Créer"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreatePanel(false)}
            style={{
              padding: "0.375rem 0.5rem",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "0.8rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {ingredientId && (
        <div style={{ fontSize: "0.75rem", color: "#47ebbf", fontWeight: 600, paddingLeft: "0.25rem" }}>
          ✓ Ingrédient lié — rayon et unité seront appliqués
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
