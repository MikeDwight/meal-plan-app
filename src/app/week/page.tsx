import type { GetWeekPlanResponse } from "@/lib/mealplan/types";
import { GenerateButton } from "./generate-button";
import { WeekGrid } from "./week-grid";

const HOUSEHOLD_ID = "home-household";

function getCurrentMonday(): string {
  const now = new Date();
  const dow = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const weekStart =
    (typeof params.weekStart === "string" ? params.weekStart : undefined) ??
    getCurrentMonday();

  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/mealplan?householdId=${HOUSEHOLD_ID}&weekStart=${weekStart}`;
  const res = await fetch(url, { cache: "no-store" });

  const hasExistingPlan = res.ok;
  const data: GetWeekPlanResponse | null = hasExistingPlan
    ? await res.json()
    : null;

  return (
    <main>
      <h1>Semaine du {data?.weekStart ?? weekStart}</h1>

      <GenerateButton
        householdId={HOUSEHOLD_ID}
        weekStart={weekStart}
        variant={hasExistingPlan ? "regenerate" : "generate"}
      />

      <WeekGrid
        householdId={HOUSEHOLD_ID}
        weekStart={weekStart}
        initialSlots={data?.slots ?? []}
      />
    </main>
  );
}
