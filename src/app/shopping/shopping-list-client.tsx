"use client";

import { useState } from "react";
import { ToggleItemButton } from "./toggle-button";

export interface ShoppingItemProps {
  id: string;
  label: string;
  quantity: string | null;
  unitAbbr: string | null;
  status: "TODO" | "DONE";
}

export interface AisleGroup {
  aisle: string;
  items: ShoppingItemProps[];
}

export function ShoppingListClient({
  groups,
  weekStart,
}: {
  groups: AisleGroup[];
  weekStart: string;
}) {
  const [hideDone, setHideDone] = useState(false);

  const visibleGroups = hideDone
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter((item) => item.status !== "DONE"),
        }))
        .filter((g) => g.items.length > 0)
    : groups;

  return (
    <>
      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", margin: "0.5rem 0 1rem" }}>
        <input
          type="checkbox"
          checked={hideDone}
          onChange={(e) => setHideDone(e.target.checked)}
        />
        Masquer les articles cochés
      </label>

      {visibleGroups.length === 0 ? (
        <p style={{ color: "#888" }}>Tous les articles sont cochés.</p>
      ) : (
        visibleGroups.map(({ aisle, items }) => (
          <section key={aisle} style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "0.3rem" }}>
              {aisle}
            </h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {items.map((item) => (
                <li
                  key={item.id}
                  style={{
                    padding: "0.4rem 0",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textDecoration: item.status === "DONE" ? "line-through" : "none",
                    color: item.status === "DONE" ? "#999" : "inherit",
                  }}
                >
                  <ToggleItemButton
                    itemId={item.id}
                    currentStatus={item.status}
                    weekStart={weekStart}
                  />
                  <span>
                    {item.label}
                    {item.quantity != null && (
                      <>
                        {" — "}
                        {item.quantity}
                        {item.unitAbbr && ` ${item.unitAbbr}`}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
