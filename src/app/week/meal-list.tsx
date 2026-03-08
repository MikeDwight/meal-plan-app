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
          marginTop: "1rem",
          padding: "2.5rem 1rem",
          textAlign: "center",
          background: "#fff",
          borderRadius: "12px",
          border: "2px dashed #d1d5db",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🍽️</div>
        <p style={{ color: "#374151", fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
          Aucun repas planifié
        </p>
        <p style={{ color: "#9ca3af", fontSize: "0.82rem", marginTop: "0.4rem" }}>
          Utilisez « Générer les repas » ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          marginTop: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
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
