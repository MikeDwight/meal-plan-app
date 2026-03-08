"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface TransitionItemProps {
  id: string;
  label: string;
  quantity: string | null;
  status: "TODO" | "DONE";
}

const HOUSEHOLD_ID = "home-household";

export function TransitionListClient({ items }: { items: TransitionItemProps[] }) {
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [isAdding, startAddTransition] = useTransition();
  const [isApplying, startApplyTransition] = useTransition();

  const visibleItems = showDone ? items : items.filter((i) => i.status !== "DONE");
  const todoCount = items.filter((i) => i.status === "TODO").length;

  async function handleAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const body: Record<string, unknown> = { householdId: HOUSEHOLD_ID, label: trimmed };
    if (newQuantity.trim() !== "") body.quantity = Number(newQuantity);
    await fetch("/api/transitionitems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setNewLabel("");
    setNewQuantity("");
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

  if (items.length === 0 && !isAdding) {
    return (
      <div style={{ marginBottom: "2rem" }}>
        <SectionHeader label="Articles ponctuels" />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Ajouter un article…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            style={inputStyle}
          />
          <input type="number" placeholder="Qté" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} style={{ ...inputStyle, width: "5rem" }} />
          <AddButton onClick={handleAdd} disabled={newLabel.trim() === ""} />
        </div>
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

      {/* Add form */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          type="text"
          placeholder="Ajouter un article…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          disabled={isAdding}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Qté"
          value={newQuantity}
          onChange={(e) => setNewQuantity(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          disabled={isAdding}
          style={{ ...inputStyle, width: "5rem" }}
        />
        <AddButton onClick={handleAdd} disabled={isAdding || newLabel.trim() === ""} />
      </div>

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
  flex: 1,
  padding: "0.55rem 0.75rem",
  border: "1px solid #e2e8f0",
  borderRadius: "0.625rem",
  fontSize: "0.875rem",
  background: "#fff",
  outline: "none",
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
