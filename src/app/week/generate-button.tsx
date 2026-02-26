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
  const [error, setError] = useState<string | null>(null);

  const busy = loading || isPending;
  const label =
    variant === "regenerate" ? "Recalculer les repas" : "Générer les repas";

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const genRes = await fetch("/api/mealplan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, weekStart, preserveManualSlots: true }),
      });

      if (!genRes.ok) {
        const body = await genRes.json().catch(() => null);
        const msg = body?.error ?? `Erreur ${genRes.status}`;
        setError(msg);
        setLoading(false);
        return;
      }

      const genData = await genRes.json();

      try {
        await fetch("/api/shoppinglist/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            householdId,
            weekPlanId: genData.weekPlanId,
          }),
        });
      } catch (e) {
        console.warn("Shopping list build failed (non-blocking):", e);
      }
    } catch (e) {
      setError("Erreur réseau — impossible de contacter le serveur.");
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
      <button
        onClick={handleClick}
        disabled={busy}
        style={{
          padding: "0.5rem 1.2rem",
          border: "1px solid #555",
          borderRadius: "4px",
          background: busy ? "#ddd" : "#fff",
          cursor: busy ? "wait" : "pointer",
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        {busy ? "Génération…" : label}
      </button>

      {variant === "regenerate" && (
        <p style={{ color: "#999", marginTop: "0.35rem", fontSize: "0.8rem" }}>
          Le résultat peut être identique si rien n'a changé.
        </p>
      )}

      {error && (
        <p style={{ color: "#c44", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
