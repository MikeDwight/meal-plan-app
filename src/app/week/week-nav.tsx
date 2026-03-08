"use client";

import { useRouter } from "next/navigation";
import { addWeeks, getCurrentMondayString } from "@/lib/mealplan/utils";

const arrowBtn: React.CSSProperties = {
  width: "2.25rem",
  height: "2.25rem",
  borderRadius: "50%",
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontSize: "1rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "0.5rem 0 1.25rem" }}>
      <button type="button" style={arrowBtn} onClick={() => go(addWeeks(weekStart, -1))}>
        <span className="material-symbols-outlined" style={{ fontSize: "1.4rem" }}>chevron_left</span>
      </button>

      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
          Semaine du {weekStart}
        </h1>
      </div>

      <button type="button" style={arrowBtn} onClick={() => go(addWeeks(weekStart, 1))}>
        <span className="material-symbols-outlined" style={{ fontSize: "1.4rem" }}>chevron_right</span>
      </button>

      {showToday && !isCurrentWeek && (
        <button
          type="button"
          onClick={() => go(getCurrentMondayString())}
          style={{
            padding: "0.3rem 0.85rem",
            borderRadius: "999px",
            border: "1px solid #22c55e",
            background: "transparent",
            color: "#22c55e",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Aujourd&apos;hui
        </button>
      )}
    </div>
  );
}
