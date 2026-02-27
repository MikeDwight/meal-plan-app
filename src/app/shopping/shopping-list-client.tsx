"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ToggleItemButton } from "./toggle-button";

export interface ShoppingItemProps {
  id: string;
  label: string;
  quantity: string | null;
  unitAbbr: string | null;
  status: "TODO" | "DONE";
}

export interface AisleGroup {
  aisle: string;
  items: ShoppingItemProps[];
}

const HOUSEHOLD_ID = "home-household";

export function ShoppingListClient({
  groups,
  doneCount,
}: {
  groups: AisleGroup[];
  doneCount: number;
}) {
  const router = useRouter();
  const [hideDone, setHideDone] = useState(false);
  const [isArchiving, startArchiveTransition] = useTransition();
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isPurging, startPurgeTransition] = useTransition();
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const purgebusy = purging || isPurging;

  async function handlePurge() {
    if (!window.confirm("Vider toute la liste de courses ?")) return;
    setPurging(true);
    setPurgeError(null);

    try {
      const res = await fetch("/api/shoppinglist/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPurgeError(body?.error ?? `Erreur ${res.status}`);
        setPurging(false);
        return;
      }
    } catch {
      setPurgeError("Erreur réseau");
      setPurging(false);
      return;
    }

    setPurging(false);
    startPurgeTransition(() => {
      router.refresh();
    });
  }

  async function handleArchiveDone() {
    setArchiveError(null);
    try {
      const res = await fetch("/api/shoppinglist/archive-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setArchiveError(body?.error ?? `Erreur ${res.status}`);
        return;
      }
    } catch {
      setArchiveError("Erreur réseau");
      return;
    }
    startArchiveTransition(() => {
      router.refresh();
    });
  }

  const visibleGroups = hideDone
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => item.status !== "DONE"),
        }))
        .filter((g) => g.items.length > 0)
    : groups;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", margin: "0.5rem 0 1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
          />
          Masquer les articles cochés
        </label>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {doneCount > 0 && (
            <button
              onClick={handleArchiveDone}
              disabled={isArchiving || purgebusy}
              style={{
                padding: "0.4rem 0.8rem",
                border: "1px solid #c44",
                borderRadius: "4px",
                background: "#fff0f0",
                cursor: isArchiving || purgebusy ? "wait" : "pointer",
                fontSize: "0.85rem",
                color: "#c44",
                fontWeight: 600,
              }}
            >
              {isArchiving ? "Suppression…" : `Supprimer les cochés (${doneCount})`}
            </button>
          )}

          <button
            onClick={handlePurge}
            disabled={purgebusy || isArchiving}
            style={{
              padding: "0.4rem 0.8rem",
              border: "1px solid #c44",
              borderRadius: "4px",
              background: purgebusy ? "#ddd" : "#fff0f0",
              cursor: purgebusy || isArchiving ? "wait" : "pointer",
              fontSize: "0.85rem",
              color: "#c44",
              fontWeight: 600,
            }}
          >
            {purgebusy ? "Suppression…" : "Vider la liste"}
          </button>
        </div>
      </div>

      {archiveError && (
        <p style={{ color: "#c44", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
          {archiveError}
        </p>
      )}

      {purgeError && (
        <p style={{ color: "#c44", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
          {purgeError}
        </p>
      )}

      {visibleGroups.length === 0 ? (
        <p style={{ color: "#888" }}>Tous les articles sont cochés.</p>
      ) : (
        visibleGroups.map(({ aisle, items }) => (
          <section key={aisle} style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "0.3rem" }}>
              {aisle}
            </h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {items.map((item) => (
                <li
                  key={item.id}
                  style={{
                    padding: "0.4rem 0",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textDecoration: item.status === "DONE" ? "line-through" : "none",
                    color: item.status === "DONE" ? "#999" : "inherit",
                  }}
                >
                  <ToggleItemButton
                    itemId={item.id}
                    householdId={HOUSEHOLD_ID}
                    currentStatus={item.status}
                  />
                  <span>
                    {item.label}
                    {item.quantity != null && (
                      <>
                        {" — "}
                        {item.quantity}
                        {item.unitAbbr && ` ${item.unitAbbr}`}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
