"use client";

import { useRouter } from "next/navigation";
import { addWeeks, getCurrentMondayString } from "@/lib/mealplan/utils";

export function WeekNav({
  weekStart,
  basePath = "/week",
  showToday = true,
}: {
  weekStart: string;
  basePath?: string;
  showToday?: boolean;
}) {
  const router = useRouter();
  const isCurrentWeek = weekStart === getCurrentMondayString();

  function go(dateStr: string) {
    router.push(`${basePath}?weekStart=${dateStr}`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <button type="button" onClick={() => go(addWeeks(weekStart, -1))}>
        ←
      </button>

      <h1 style={{ margin: 0, fontSize: "1.25rem" }}>
        Semaine du {weekStart}
      </h1>

      <button type="button" onClick={() => go(addWeeks(weekStart, 1))}>
        →
      </button>

      {showToday && (
        <button
          type="button"
          disabled={isCurrentWeek}
          onClick={() => go(getCurrentMondayString())}
        >
          Aujourd&apos;hui
        </button>
      )}
    </div>
  );
}
