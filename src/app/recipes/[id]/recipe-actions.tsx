"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecipeActions({ id, householdId }: { id: string; householdId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Supprimer cette recette définitivement ?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${id}?householdId=${householdId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/recipes");
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Erreur lors de la suppression.");
        setDeleting(false);
      }
    } catch {
      alert("Erreur réseau.");
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        width: "100%",
        padding: "0.875rem",
        background: "#fff",
        color: deleting ? "#94a3b8" : "#ef4444",
        border: "1px solid #fee2e2",
        borderRadius: "0.75rem",
        fontWeight: 700,
        fontSize: "0.875rem",
        cursor: deleting ? "not-allowed" : "pointer",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
      {deleting ? "Suppression…" : "Supprimer la recette"}
    </button>
  );
}
