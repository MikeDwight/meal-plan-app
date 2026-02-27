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

export function TransitionListClient({
  items,
}: {
  items: TransitionItemProps[];
}) {
  const router = useRouter();
  const [showDone, setShowDone] = useState(false);
  const [applyMessage, setApplyMessage] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const [isAdding, startAddTransition] = useTransition();
  const [isApplying, startApplyTransition] = useTransition();

  const visibleItems = showDone
    ? items
    : items.filter((i) => i.status !== "DONE");

  const todoCount = items.filter((i) => i.status === "TODO").length;

  async function handleAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;

    const body: Record<string, unknown> = {
      householdId: HOUSEHOLD_ID,
      label: trimmed,
    };
    if (newQuantity.trim() !== "") {
      body.quantity = Number(newQuantity);
    }

    await fetch("/api/transitionitems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setNewLabel("");
    setNewQuantity("");

    startAddTransition(() => {
      router.refresh();
    });
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
      setApplyMessage(
        `Appliqué : ${data.created} créé(s), ${data.merged} fusionné(s)`
      );
    }

    startApplyTransition(() => {
      router.refresh();
    });
  }

  return (
    <section
      style={{
        border: "1px solid #ccc",
        borderRadius: "6px",
        padding: "1rem",
        marginBottom: "1.5rem",
        background: "#fafafa",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Transition (permanent)</h2>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Article…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          disabled={isAdding}
          style={{
            flex: "1 1 150px",
            padding: "0.4rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <input
          type="number"
          placeholder="Qté"
          value={newQuantity}
          onChange={(e) => setNewQuantity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          disabled={isAdding}
          style={{
            width: "70px",
            padding: "0.4rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={isAdding || newLabel.trim() === ""}
          style={{
            padding: "0.4rem 0.8rem",
            border: "1px solid #888",
            borderRadius: "4px",
            cursor: isAdding ? "wait" : "pointer",
            background: "#fff",
          }}
        >
          Ajouter
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.9rem",
          }}
        >
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
          />
          Afficher les éléments faits
        </label>

        {todoCount > 0 && (
          <button
            onClick={handleApply}
            disabled={isApplying}
            style={{
              padding: "0.4rem 0.8rem",
              border: "1px solid #4a7",
              borderRadius: "4px",
              background: "#e6f9ed",
              cursor: isApplying ? "wait" : "pointer",
              fontWeight: 600,
            }}
          >
            {isApplying
              ? "Application…"
              : `Appliquer (${todoCount})`}
          </button>
        )}
      </div>

      {applyMessage && (
        <p style={{ color: "#2a7", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
          {applyMessage}
        </p>
      )}

      {visibleItems.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>
          {items.length === 0
            ? "Aucun article de transition."
            : "Tous les articles sont faits."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {visibleItems.map((item) => (
            <TransitionRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TransitionRow({ item }: { item: TransitionItemProps }) {
  const router = useRouter();
  const [isToggling, startToggleTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isPending = isToggling || isDeleting;

  async function handleToggle() {
    await fetch(`/api/transitionitem/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
    });
    startToggleTransition(() => {
      router.refresh();
    });
  }

  async function handleDelete() {
    await fetch(`/api/transitionitem/${item.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
    });
    startDeleteTransition(() => {
      router.refresh();
    });
  }

  return (
    <li
      style={{
        padding: "0.4rem 0",
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <input
        type="checkbox"
        checked={item.status === "DONE"}
        disabled={isPending}
        onChange={handleToggle}
        style={{ cursor: isPending ? "wait" : "pointer" }}
      />
      <span
        style={{
          flex: 1,
          textDecoration: item.status === "DONE" ? "line-through" : "none",
          color: item.status === "DONE" ? "#999" : "inherit",
        }}
      >
        {item.label}
        {item.quantity != null && <>{" — "}{item.quantity}</>}
      </span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        style={{
          padding: "0.2rem 0.5rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
          background: "#fff",
          cursor: isPending ? "wait" : "pointer",
          fontSize: "0.8rem",
          color: "#c44",
        }}
      >
        Supprimer
      </button>
    </li>
  );
}
