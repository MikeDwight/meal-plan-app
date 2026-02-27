import type { GetShoppingListResponse, ShoppingItemRow } from "@/lib/shoppinglist/types";
import { ShoppingListClient } from "./shopping-list-client";
import type { AisleGroup } from "./shopping-list-client";
import { TransitionListClient } from "./transition-list-client";
import type { TransitionItemProps } from "./transition-list-client";

const HOUSEHOLD_ID = "home-household";
const NO_AISLE = "Sans rayon";

function groupByAisle(items: ShoppingItemRow[]) {
  const groups = new Map<string, ShoppingItemRow[]>();

  for (const item of items) {
    const aisle = item.aisleName?.trim() || NO_AISLE;
    const list = groups.get(aisle) ?? [];
    list.push(item);
    groups.set(aisle, list);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === NO_AISLE) return 1;
    if (b === NO_AISLE) return -1;
    return a.localeCompare(b, "fr");
  });

  return sortedKeys.map((aisle) => {
    const aisleItems = groups.get(aisle)!;
    aisleItems.sort((a, b) => {
      if (a.status !== b.status) return a.status === "TODO" ? -1 : 1;
      return a.label.localeCompare(b.label, "fr");
    });
    return { aisle, items: aisleItems };
  });
}

export default async function ShoppingPage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const [res, transitionRes] = await Promise.all([
    fetch(
      `${baseUrl}/api/shoppinglist?householdId=${HOUSEHOLD_ID}`,
      { cache: "no-store" }
    ),
    fetch(
      `${baseUrl}/api/transitionitems?householdId=${HOUSEHOLD_ID}&includeDone=true`,
      { cache: "no-store" }
    ),
  ]);

  const transitionItems: TransitionItemProps[] = transitionRes.ok
    ? (await transitionRes.json()).map(
        (ti: { id: string; label: string; quantity: string | number | null; status: string }) => ({
          id: ti.id,
          label: ti.label,
          quantity: ti.quantity != null ? String(ti.quantity) : null,
          status: ti.status as "TODO" | "DONE",
        })
      )
    : [];

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return (
      <main>
        <h1>Liste de courses</h1>
        <TransitionListClient items={transitionItems} />
        <p>
          Aucune liste trouvée.{" "}
          {body?.error && <em>({body.error})</em>}
        </p>
      </main>
    );
  }

  const data: GetShoppingListResponse = await res.json();
  const aisleGroups = groupByAisle(data.items);

  const groups: AisleGroup[] = aisleGroups.map(({ aisle, items }) => ({
    aisle,
    items: items.map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity != null ? String(item.quantity) : null,
      unitAbbr: item.unitAbbr,
      status: item.status,
    })),
  }));

  return (
    <main>
      <h1>Liste de courses</h1>

      <TransitionListClient items={transitionItems} />

      <p>
        {data.meta.done} / {data.meta.done + data.meta.todo} articles cochés
      </p>

      {data.items.length === 0 ? (
        <p style={{ color: "#888" }}>La liste est vide.</p>
      ) : (
        <ShoppingListClient groups={groups} doneCount={data.meta.done} />
      )}
    </main>
  );
}
