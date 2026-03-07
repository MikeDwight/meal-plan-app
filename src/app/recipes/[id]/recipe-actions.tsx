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
      const res = await fetch(`/api/recipes/${id}?householdId=${householdId}`, {
        method: "DELETE",
      });
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
        padding: "0.45rem 0.9rem",
        background: deleting ? "#e5e7eb" : "#fee2e2",
        color: deleting ? "#9ca3af" : "#b91c1c",
        border: "1px solid #fca5a5",
        borderRadius: "4px",
        cursor: deleting ? "not-allowed" : "pointer",
        fontSize: "0.9rem",
        fontWeight: 500,
      }}
    >
      {deleting ? "Suppression..." : "Supprimer"}
    </button>
  );
}
