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

  return (
    <div style={{ margin: "1rem 0" }}>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <span style={{ fontSize: "0.9rem" }}>Nombre de repas :</span>
          <input
            type="number"
            min={1}
            max={50}
            placeholder="ex: 14"
            value={count}
            onChange={(e) =>
              setCount(e.target.value === "" ? "" : Math.max(1, Math.min(50, Number(e.target.value))))
            }
            disabled={busy}
            style={{
              width: "5rem",
              padding: "0.4rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          />
        </label>

        <button
          onClick={handleClick}
          disabled={busy || !isCountValid}
          style={{
            padding: "0.5rem 1.2rem",
            border: "1px solid #555",
            borderRadius: "4px",
            background: busy || !isCountValid ? "#ddd" : "#fff",
            cursor: busy || !isCountValid ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
            opacity: isCountValid ? 1 : 0.6,
          }}
        >
          {loading || isPending ? "Generation..." : label}
        </button>

        {variant === "regenerate" && (
          <button
            onClick={handleClearWeek}
            disabled={busy}
            style={{
              padding: "0.5rem 1.2rem",
              border: "1px solid #c44",
              borderRadius: "4px",
              background: clearing ? "#ddd" : "#fff0f0",
              cursor: busy ? "wait" : "pointer",
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "#c44",
            }}
          >
            {clearing ? "Suppression..." : "Vider la semaine"}
          </button>
        )}
      </div>

      {error && (
        <p style={{ color: "#c44", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
