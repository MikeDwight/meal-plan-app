"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ToggleItemButton } from "./toggle-button";
import { TransitionListClient } from "./transition-list-client";
import type { TransitionItemProps } from "./transition-list-client";

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
  totalCount,
  transitionItems,
}: {
  groups: AisleGroup[];
  doneCount: number;
  totalCount: number;
  transitionItems: TransitionItemProps[];
}) {
  const router = useRouter();
  const [isBuilding, startBuildTransition] = useTransition();
  const [buildError, setBuildError] = useState<string | null>(null);
  const [isArchiving, startArchiveTransition] = useTransition();
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isPurging, startPurgeTransition] = useTransition();
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const [hideDone, setHideDone] = useState(false);
  const busy = isBuilding || isArchiving || purging || isPurging;

  async function handleBuild() {
    setBuildError(null);
    try {
      const res = await fetch("/api/shoppinglist/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setBuildError(body?.error ?? `Erreur ${res.status}`);
        return;
      }
    } catch {
      setBuildError("Erreur réseau");
      return;
    }
    startBuildTransition(() => router.refresh());
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
    startArchiveTransition(() => router.refresh());
  }

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
    startPurgeTransition(() => router.refresh());
  }

  return (
    <>
      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.625rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <button
          onClick={handleBuild}
          disabled={busy}
          style={{
            flex: 1,
            minWidth: "140px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            background: busy ? "#a7f3d0" : "#47ebbf",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: "0.875rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            border: "none",
            cursor: busy ? "wait" : "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>auto_fix</span>
          {isBuilding ? "Construction…" : "Construire"}
        </button>

        <button
          onClick={handleArchiveDone}
          disabled={busy || doneCount === 0}
          style={{
            flex: 1,
            minWidth: "140px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            background: "#fff",
            color: "#334155",
            fontWeight: 700,
            fontSize: "0.875rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            cursor: busy || doneCount === 0 ? "not-allowed" : "pointer",
            opacity: doneCount === 0 ? 0.5 : 1,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>archive</span>
          {isArchiving ? "Suppression…" : `Supprimer cochés${doneCount > 0 ? ` (${doneCount})` : ""}`}
        </button>

        <button
          onClick={handlePurge}
          disabled={busy || totalCount === 0}
          style={{
            width: "3rem",
            height: "3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "0.75rem",
            cursor: busy || totalCount === 0 ? "not-allowed" : "pointer",
            color: "#ef4444",
            opacity: totalCount === 0 ? 0.4 : 1,
            flexShrink: 0,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>delete_sweep</span>
        </button>
      </div>

      {(buildError || archiveError || purgeError) && (
        <p style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {buildError || archiveError || purgeError}
        </p>
      )}

      {/* Transition items */}
      <TransitionListClient items={transitionItems} />

      {/* Toggle masquer cochés */}
      {groups.length > 0 && (
        <button
          type="button"
          onClick={() => setHideDone((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: "1.25rem", userSelect: "none" }}
        >
          <div style={{ width: "2.25rem", height: "1.25rem", borderRadius: "999px", background: hideDone ? "#47ebbf" : "#e2e8f0", transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: "0.125rem", left: hideDone ? "1.0625rem" : "0.125rem", width: "1rem", height: "1rem", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
          </div>
          <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>Masquer les articles cochés</span>
        </button>
      )}

      {/* Shopping list */}
      {groups.length === 0 ? (
        <div style={{
          padding: "2.5rem 1rem",
          textAlign: "center",
          background: "#fff",
          borderRadius: "0.75rem",
          border: "2px dashed #e2e8f0",
          color: "#94a3b8",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🛒</div>
          <p style={{ fontWeight: 600, color: "#475569", margin: "0 0 0.25rem" }}>Liste vide</p>
          <p style={{ fontSize: "0.875rem", margin: 0 }}>Cliquez sur « Construire » pour générer la liste depuis votre planning.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {(hideDone
            ? groups.map((g) => ({ ...g, items: g.items.filter((i) => i.status !== "DONE") })).filter((g) => g.items.length > 0)
            : groups
          ).map(({ aisle, items }) => (
            <section key={aisle}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
                <div style={{
                  background: "rgba(71,235,191,0.1)",
                  border: "1px solid rgba(71,235,191,0.2)",
                  borderRadius: "999px",
                  padding: "0.2rem 0.75rem",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {aisle}
                  </span>
                </div>
                <div style={{ flex: 1, height: "1px", background: "rgba(71,235,191,0.15)" }} />
              </div>

              {/* Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {items.map((item) => {
                  const isDone = item.status === "DONE";
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem",
                        background: isDone ? "rgba(255,255,255,0.5)" : "#fff",
                        borderRadius: "0.75rem",
                        border: isDone ? "1px solid transparent" : "1px solid #f1f5f9",
                        boxShadow: isDone ? "none" : "0 4px 20px -2px rgba(71,235,191,0.08)",
                        opacity: isDone ? 0.6 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <ToggleItemButton itemId={item.id} householdId={HOUSEHOLD_ID} currentStatus={item.status} />

                      <div style={{ flex: 1, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
                        <span style={{
                          fontWeight: 600,
                          fontSize: "0.925rem",
                          color: isDone ? "#94a3b8" : "#0f172a",
                          textDecoration: isDone ? "line-through" : "none",
                        }}>
                          {item.label}
                        </span>

                        {item.quantity != null && (
                          <span style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: isDone ? "#94a3b8" : "#47ebbf",
                            background: isDone ? "transparent" : "rgba(71,235,191,0.1)",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.375rem",
                            whiteSpace: "nowrap",
                          }}>
                            {item.quantity}{item.unitAbbr ? ` ${item.unitAbbr}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
