"use client";

import { useState, useEffect } from "react";
import { getCurrentMondayString, addWeeks } from "@/lib/mealplan/utils";

const HOUSEHOLD_ID = "home-household";

export function AddToWeekButton({ recipeId }: { recipeId: string }) {
  const weekS = getCurrentMondayString();
  const weekS1 = addWeeks(weekS, 1);

  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState<"S" | "S+1" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyInS, setAlreadyInS] = useState(false);

  useEffect(() => {
    fetch(`/api/mealplan?householdId=${HOUSEHOLD_ID}&weekStart=${weekS}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items?.some((item: { recipe: { id: string } }) => item.recipe.id === recipeId)) {
          setAlreadyInS(true);
        }
      })
      .catch(() => {});
  }, [recipeId, weekS]);

  async function handleAdd(weekStart: string, label: "S" | "S+1") {
    setAdding(true);
    setError(null);
    setPicking(false);
    try {
      const planRes = await fetch(`/api/mealplan?householdId=${HOUSEHOLD_ID}&weekStart=${weekStart}`);
      let position = 0;
      if (planRes.ok) {
        const planData = await planRes.json();
        position = planData.items?.length ?? 0;
      }
      const res = await fetch("/api/mealplan/slot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: HOUSEHOLD_ID, weekStart, position, recipeId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string } | null)?.error ?? `Erreur ${res.status}`);
      }
      if (label === "S") setAlreadyInS(true);
      setJustAdded(label);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setAdding(false);
    }
  }

  if (justAdded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem", background: "rgba(71,235,191,0.1)", border: "1px solid rgba(71,235,191,0.25)", borderRadius: "0.75rem", color: "#0f766e", fontWeight: 700, fontSize: "0.875rem" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>check_circle</span>
        Ajoutée à la {justAdded === "S" ? "semaine en cours" : "semaine prochaine"} !
      </div>
    );
  }

  if (picking) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={() => handleAdd(weekS, "S")}
          disabled={alreadyInS}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "0.875rem", background: alreadyInS ? "#f1f5f9" : "#47ebbf", color: alreadyInS ? "#94a3b8" : "#0f172a", fontWeight: 700, fontSize: "0.9rem", border: "none", borderRadius: "0.75rem", cursor: alreadyInS ? "not-allowed" : "pointer" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>today</span>
          {alreadyInS ? "Déjà dans la semaine en cours" : "Semaine en cours"}
        </button>
        <button
          type="button"
          onClick={() => handleAdd(weekS1, "S+1")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "0.875rem", background: "#fff", color: "#0f172a", fontWeight: 700, fontSize: "0.9rem", border: "1px solid #e2e8f0", borderRadius: "0.75rem", cursor: "pointer" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>event</span>
          Semaine prochaine
        </button>
        <button
          type="button"
          onClick={() => setPicking(false)}
          style={{ width: "100%", padding: "0.625rem", background: "none", color: "#94a3b8", fontWeight: 600, fontSize: "0.85rem", border: "none", borderRadius: "0.75rem", cursor: "pointer" }}
        >
          Annuler
        </button>
        {error && <p style={{ color: "#b91c1c", fontSize: "0.8rem", textAlign: "center", margin: 0 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setPicking(true)}
        disabled={adding}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "1rem", background: adding ? "#a7f3d0" : "#47ebbf", color: "#0f172a", fontWeight: 700, fontSize: "0.95rem", border: "none", borderRadius: "0.75rem", cursor: adding ? "wait" : "pointer", boxShadow: "4px 4px 0 rgba(71,235,191,0.2)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>calendar_month</span>
        {adding ? "Ajout…" : "Ajouter à la semaine"}
      </button>
      {error && <p style={{ color: "#b91c1c", fontSize: "0.8rem", marginTop: "0.5rem", textAlign: "center" }}>{error}</p>}
    </div>
  );
}
