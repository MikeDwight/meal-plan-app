"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ToggleItemButton({
  itemId,
  householdId,
  currentStatus,
}: {
  itemId: string;
  householdId: string;
  currentStatus: "TODO" | "DONE";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isDone = currentStatus === "DONE";

  async function handleToggle() {
    await fetch(`/api/shoppingitem/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      style={{
        flexShrink: 0,
        width: "1.5rem",
        height: "1.5rem",
        borderRadius: "50%",
        border: isDone ? "2px solid #47ebbf" : "2px solid #cbd5e1",
        background: isDone ? "#47ebbf" : "transparent",
        cursor: isPending ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color 0.15s, background 0.15s",
        padding: 0,
      }}
    >
      {isDone && (
        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#0f172a", fontVariationSettings: "'wght' 700" }}>
          check
        </span>
      )}
    </button>
  );
}
