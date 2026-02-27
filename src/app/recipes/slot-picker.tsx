"use client";

import { Fragment, useEffect } from "react";
import type { MealSlot } from "@/lib/mealplan/types";

const DAY_LABELS = [
  "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim",
];

const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: "lunch", label: "Déjeuner" },
  { key: "dinner", label: "Dîner" },
];

function formatWeekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface SlotPickerProps {
  recipeTitle: string;
  weekStart: string;
  saving: boolean;
  onPick: (dayIndex: number, mealSlot: MealSlot) => void;
  onClose: () => void;
}

export function SlotPicker({
  recipeTitle,
  weekStart,
  saving,
  onPick,
  onClose,
}: SlotPickerProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "8px",
          padding: "1.25rem",
          width: "min(34rem, 95vw)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.25rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1rem" }}>
            Ajouter « {recipeTitle} »
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.85rem",
            color: "#666",
          }}
        >
          Semaine du {formatWeekLabel(weekStart)}
        </p>

        {/* Slot grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "5rem repeat(7, 1fr)",
            gap: "0.35rem",
          }}
        >
          {/* Day headers */}
          <div />
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                fontWeight: 600,
                fontSize: "0.85rem",
                padding: "0.25rem 0",
              }}
            >
              {label}
            </div>
          ))}

          {/* Meal rows */}
          {MEAL_SLOTS.map((meal) => (
            <Fragment key={meal.key}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "0.8rem",
                  color: "#555",
                  fontWeight: 500,
                }}
              >
                {meal.label}
              </div>
              {DAY_LABELS.map((_, dayIndex) => (
                <button
                  key={`${dayIndex}-${meal.key}`}
                  type="button"
                  disabled={saving}
                  onClick={() => onPick(dayIndex, meal.key)}
                  style={{
                    padding: "0.6rem 0.25rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    background: saving ? "#f5f5f5" : "#fafafa",
                    cursor: saving ? "wait" : "pointer",
                    fontSize: "1rem",
                    lineHeight: 1,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!saving)
                      (e.target as HTMLElement).style.background = "#e8f4ff";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = saving
                      ? "#f5f5f5"
                      : "#fafafa";
                  }}
                >
                  +
                </button>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
