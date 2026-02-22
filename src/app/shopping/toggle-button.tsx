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

  async function handleToggle() {
    await fetch(`/api/shoppingitem/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId }),
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <input
      type="checkbox"
      checked={currentStatus === "DONE"}
      disabled={isPending}
      onChange={handleToggle}
      style={{ cursor: isPending ? "wait" : "pointer" }}
    />
  );
}
