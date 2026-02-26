"use client";

import { useState, useEffect, useCallback } from "react";
import type { MealSlot, WeekPlanSlot } from "@/lib/mealplan/types";
import { SlotCard } from "./slot-card";
import { RecipePicker } from "./recipe-picker";

const DAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const MEAL_SLOTS: MealSlot[] = ["lunch", "dinner"];

const MEAL_LABELS: Record<MealSlot, string> = {
  lunch: "Déjeuner",
  dinner: "Dîner",
};

function slotKey(dayIndex: number, mealSlot: MealSlot): string {
  return `${dayIndex}-${mealSlot}`;
}

interface SlotRecipe {
  id: string;
  title: string;
  tags: string[];
}

interface PickerTarget {
  dayIndex: number;
  mealSlot: MealSlot;
}

function buildSlotMap(slots: WeekPlanSlot[]): Map<string, SlotRecipe> {
  const map = new Map<string, SlotRecipe>();
  for (const s of slots) {
    map.set(slotKey(s.dayIndex, s.mealSlot), s.recipe);
  }
  return map;
}

export function WeekGrid({
  householdId,
  weekStart,
  initialSlots,
}: {
  householdId: string;
  weekStart: string;
  initialSlots: WeekPlanSlot[];
}) {
  const [slotMap, setSlotMap] = useState(() => buildSlotMap(initialSlots));
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [clearingKey, setClearingKey] = useState<string | null>(null);

  useEffect(() => {
    setSlotMap(buildSlotMap(initialSlots));
  }, [initialSlots]);

  const handleSelect = useCallback(
    (dayIndex: number, mealSlot: MealSlot, recipe: SlotRecipe) => {
      setSlotMap((prev) => {
        const next = new Map(prev);
        next.set(slotKey(dayIndex, mealSlot), recipe);
        return next;
      });
      setPickerTarget(null);
    },
    [],
  );

  const handleClear = useCallback(
    async (dayIndex: number, mealSlot: MealSlot) => {
      const key = slotKey(dayIndex, mealSlot);
      setClearingKey(key);

      try {
        const res = await fetch("/api/mealplan/slot", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId, weekStart, dayIndex, mealSlot }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as { error?: string } | null)?.error ??
              `Erreur ${res.status}`,
          );
        }

        setSlotMap((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } catch (e: unknown) {
        alert(
          e instanceof Error ? e.message : "Impossible de vider ce slot",
        );
      } finally {
        setClearingKey(null);
      }
    },
    [householdId, weekStart],
  );

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "0.75rem",
          marginTop: "1rem",
        }}
      >
        {DAY_LABELS.map((label, dayIndex) => (
          <div key={dayIndex}>
            <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>
              {label}
            </h3>
            {MEAL_SLOTS.map((meal) => {
              const recipe = slotMap.get(slotKey(dayIndex, meal)) ?? null;
              return (
                <SlotCard
                  key={meal}
                  mealLabel={MEAL_LABELS[meal]}
                  recipe={recipe}
                  onClick={() => setPickerTarget({ dayIndex, mealSlot: meal })}
                  onClear={() => handleClear(dayIndex, meal)}
                  isClearing={clearingKey === slotKey(dayIndex, meal)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {pickerTarget && (
        <RecipePicker
          householdId={householdId}
          weekStart={weekStart}
          dayIndex={pickerTarget.dayIndex}
          mealSlot={pickerTarget.mealSlot}
          dayLabel={DAY_LABELS[pickerTarget.dayIndex]}
          mealLabel={MEAL_LABELS[pickerTarget.mealSlot]}
          onSelect={(recipe) =>
            handleSelect(pickerTarget.dayIndex, pickerTarget.mealSlot, recipe)
          }
          onClose={() => setPickerTarget(null)}
        />
      )}
    </>
  );
}
