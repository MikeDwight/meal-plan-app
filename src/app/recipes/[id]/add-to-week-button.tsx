"use client";

import { useState, useEffect } from "react";
import { getCurrentMondayString } from "@/lib/mealplan/utils";

const HOUSEHOLD_ID = "home-household";

export function AddToWeekButton({ recipeId }: { recipeId: string }) {
  const weekStart = getCurrentMondayString();
  const [alreadyIn, setAlreadyIn] = useState(false);
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/mealplan?householdId=${HOUSEHOLD_ID}&weekStart=${weekStart}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items?.some((item: { recipe: { id: string } }) => item.recipe.id === recipeId)) {
          setAlreadyIn(true);
        }
      })
      .catch(() => {});
  }, [recipeId, weekStart]);

  async function handleAdd() {
    setAdding(true);
    setError(null);
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
      setAlreadyIn(true);
      setJustAdded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setAdding(false);
    }
  }

  if (alreadyIn) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem", background: "rgba(71,235,191,0.1)", border: "1px solid rgba(71,235,191,0.25)", borderRadius: "0.75rem", color: "#0f766e", fontWeight: 700, fontSize: "0.875rem" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>check_circle</span>
        {justAdded ? "Ajoutée à la semaine !" : "Déjà dans la semaine"}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAdd}
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
