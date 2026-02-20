"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const HOUSEHOLD_ID = "home-household";

export function ToggleItemButton({
  itemId,
  currentStatus,
  weekStart,
}: {
  itemId: string;
  currentStatus: "TODO" | "DONE";
  weekStart: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleToggle() {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    await fetch(`${baseUrl}/api/shoppingitem/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ householdId: HOUSEHOLD_ID }),
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
