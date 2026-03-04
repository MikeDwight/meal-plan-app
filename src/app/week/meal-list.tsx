"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { WeekPlanItem } from "@/lib/mealplan/types";
import { MealCard } from "./meal-card";
import { RecipePicker } from "./recipe-picker";

interface RecipeData {
  id: string;
  title: string;
  tags: string[];
}

export function MealList({
  householdId,
  weekStart,
  initialItems,
}: {
  householdId: string;
  weekStart: string;
  initialItems: WeekPlanItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<WeekPlanItem[]>(initialItems);
  const [pickerPosition, setPickerPosition] = useState<number | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<number | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleSelect = useCallback(
    (position: number, recipe: RecipeData) => {
      setItems((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex((i) => i.position === position);
        if (existingIndex >= 0) {
          next[existingIndex] = { position, recipe };
        } else {
          next.push({ position, recipe });
          next.sort((a, b) => a.position - b.position);
        }
        return next;
      });
      setPickerPosition(null);
      router.refresh();
    },
    [router]
  );

  const handleDelete = useCallback(
    async (position: number) => {
      setDeletingPosition(position);

      try {
        const res = await fetch("/api/mealplan/slot", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId, weekStart, position }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as { error?: string } | null)?.error ?? `Erreur ${res.status}`
          );
        }

        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Impossible de supprimer");
      } finally {
        setDeletingPosition(null);
      }
    },
    [householdId, weekStart, router]
  );

  if (items.length === 0) {
    return (
      <div
        style={{
          marginTop: "2rem",
          padding: "2rem",
          textAlign: "center",
          background: "#fafafa",
          borderRadius: "8px",
          border: "1px dashed #ccc",
        }}
      >
        <p style={{ color: "#666", fontSize: "1rem", margin: 0 }}>
          Aucun repas planifié pour cette semaine.
        </p>
        <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          Utilisez le bouton « Générer les repas » ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          marginTop: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {items.map((item) => (
          <MealCard
            key={item.position}
            position={item.position}
            recipe={item.recipe}
            onReplace={() => setPickerPosition(item.position)}
            onDelete={() => handleDelete(item.position)}
            isDeleting={deletingPosition === item.position}
          />
        ))}
      </div>

      {pickerPosition !== null && (
        <RecipePicker
          householdId={householdId}
          weekStart={weekStart}
          position={pickerPosition}
          onSelect={(recipe) => handleSelect(pickerPosition, recipe)}
          onClose={() => setPickerPosition(null)}
        />
      )}
    </>
  );
}
