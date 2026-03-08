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
    fetch(`${baseUrl}/api/shoppinglist?householdId=${HOUSEHOLD_ID}`, { cache: "no-store" }),
    fetch(`${baseUrl}/api/transitionitems?householdId=${HOUSEHOLD_ID}&includeDone=true`, { cache: "no-store" }),
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
      <main style={{ maxWidth: "42rem", margin: "0 auto" }}>
        <div style={{ padding: "2rem 0 1.25rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>Liste de courses</h1>
        </div>
        <ShoppingListClient groups={[]} doneCount={0} totalCount={0} transitionItems={transitionItems} />
        {body?.error && <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>{body.error}</p>}
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
    <main style={{ maxWidth: "42rem", margin: "0 auto" }}>
      <div style={{ padding: "2rem 0 1.25rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.25rem", color: "#0f172a" }}>Liste de courses</h1>
        <p style={{ color: "#94a3b8", fontWeight: 500, margin: 0, fontSize: "0.8rem" }}>
          {data.meta.done} / {data.meta.done + data.meta.todo} articles cochés
        </p>
      </div>

      <ShoppingListClient
        groups={groups}
        doneCount={data.meta.done}
        totalCount={data.meta.done + data.meta.todo}
        transitionItems={transitionItems}
      />
    </main>
  );
}
