import type { GetWeekPlanResponse } from "@/lib/mealplan/types";
import { getCurrentMondayString } from "@/lib/mealplan/utils";
import { GenerateButton } from "./generate-button";
import { MealList } from "./meal-list";
import { PoolSection } from "./pool-section";
import { WeekNav } from "./week-nav";

const HOUSEHOLD_ID = "home-household";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const weekStart =
    (typeof params.weekStart === "string" ? params.weekStart : undefined) ??
    getCurrentMondayString();

  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/mealplan?householdId=${HOUSEHOLD_ID}&weekStart=${weekStart}`;
  const res = await fetch(url, { cache: "no-store" });

  const hasExistingPlan = res.ok;
  const data: GetWeekPlanResponse | null = hasExistingPlan
    ? await res.json()
    : null;

  return (
    <main>
      <WeekNav weekStart={data?.weekStart ?? weekStart} />

      <GenerateButton
        householdId={HOUSEHOLD_ID}
        weekStart={weekStart}
        variant={data?.items?.length ? "regenerate" : "generate"}
      />

      <MealList
        householdId={HOUSEHOLD_ID}
        weekStart={weekStart}
        initialItems={data?.items ?? []}
      />

      <PoolSection
        householdId={HOUSEHOLD_ID}
        weekStart={weekStart}
        currentMealCount={data?.items?.length ?? 0}
      />
    </main>
  );
}
