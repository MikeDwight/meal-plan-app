"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function GenerateButton({
  householdId,
  weekStart,
  variant = "generate",
}: {
  householdId: string;
  weekStart: string;
  variant?: "generate" | "regenerate";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | "">("");

  const busy = loading || isPending || clearing;
  const label =
    variant === "regenerate" ? "Regenerer les repas" : "Generer les repas";
  const isCountValid = typeof count === "number" && count > 0;

  async function handleClearWeek() {
    if (!window.confirm("Vider tous les repas de cette semaine ?")) return;
    setClearing(true);
    setError(null);

    try {
      const res = await fetch("/api/mealplan/clear-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, weekStart }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Erreur ${res.status}`);
        setClearing(false);
        return;
      }
    } catch {
      setError("Erreur reseau - impossible de contacter le serveur.");
      setClearing(false);
      return;
    }

    setClearing(false);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleClick() {
    if (!isCountValid) return;

    setLoading(true);
    setError(null);

    try {
      const genRes = await fetch("/api/mealplan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          weekStart,
          count,
          preserveManualPositions: true,
        }),
      });

      if (!genRes.ok) {
        const body = await genRes.json().catch(() => null);
        const msg = body?.error ?? `Erreur ${genRes.status}`;
        setError(msg);
        setLoading(false);
        return;
      }

    } catch {
      setError("Erreur reseau - impossible de contacter le serveur.");
      setLoading(false);
      return;
    }

    setLoading(false);
    startTransition(() => {
      router.refresh();
    });
  }

  const cardBtn: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "0.75rem",
    boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
    fontWeight: 600,
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "box-shadow 0.15s",
    color: "#0f172a",
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Count input */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>
          Nombre de repas :
        </label>
        <input
          type="number"
          min={1}
          max={50}
          placeholder="ex: 5"
          value={count}
          onChange={(e) =>
            setCount(e.target.value === "" ? "" : Math.max(1, Math.min(50, Number(e.target.value))))
          }
          disabled={busy}
          style={{
            width: "4.5rem",
            padding: "0.35rem 0.625rem",
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={handleClick}
          disabled={busy || !isCountValid}
          style={{
            ...cardBtn,
            opacity: busy || !isCountValid ? 0.5 : 1,
            cursor: busy || !isCountValid ? "not-allowed" : "pointer",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#47ebbf" }}>refresh</span>
          {loading || isPending ? "Génération…" : label}
        </button>

        {variant === "regenerate" && (
          <button
            onClick={handleClearWeek}
            disabled={busy}
            style={{ ...cardBtn, cursor: busy ? "wait" : "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#f87171" }}>delete_sweep</span>
            {clearing ? "Suppression…" : "Vider la semaine"}
          </button>
        )}
      </div>

      {error && (
        <p style={{ color: "#ef4444", marginTop: "0.5rem", fontSize: "0.85rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
