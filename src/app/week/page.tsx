import type { GetWeekPlanResponse } from "@/lib/mealplan/types";

const HOUSEHOLD_ID = "home-household";

const DAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

const MEAL_LABELS: Record<string, string> = {
  lunch: "Déjeuner",
  dinner: "Dîner",
};

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

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return (
      <main>
        <h1>Semaine du {weekStart}</h1>
        <p>
          Aucun plan trouvé.{" "}
          {body?.error && <em>({body.error})</em>}
        </p>
      </main>
    );
  }

  const data: GetWeekPlanResponse = await res.json();

  const slotsByDay = new Map<number, typeof data.slots>();
  for (const slot of data.slots) {
    const existing = slotsByDay.get(slot.dayIndex) ?? [];
    existing.push(slot);
    slotsByDay.set(slot.dayIndex, existing);
  }

  return (
    <main>
      <h1>Semaine du {data.weekStart}</h1>

      {DAY_LABELS.map((label, dayIndex) => {
        const daySlots = slotsByDay.get(dayIndex);
        return (
          <section key={dayIndex} style={{ marginBottom: "1.5rem" }}>
            <h2>{label}</h2>
            {!daySlots || daySlots.length === 0 ? (
              <p style={{ color: "#888" }}>— aucun repas planifié —</p>
            ) : (
              <ul>
                {daySlots.map((slot) => (
                  <li key={`${slot.dayIndex}-${slot.mealSlot}-${slot.sortOrder}`}>
                    <strong>{MEAL_LABELS[slot.mealSlot] ?? slot.mealSlot}</strong>
                    {" : "}
                    {slot.recipe.title}
                    {slot.recipe.tags.length > 0 && (
                      <span style={{ color: "#666", marginLeft: "0.5rem" }}>
                        [{slot.recipe.tags.join(", ")}]
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </main>
  );
}
