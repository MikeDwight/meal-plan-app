import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HOUSEHOLD_ID = "home-household";

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({
    where: { householdId: HOUSEHOLD_ID },
    include: {
      tags: { select: { tag: { select: { name: true } } } },
      _count: { select: { ingredients: true } },
    },
    orderBy: { title: "asc" },
  });

  return (
    <main>
      <h1>Recettes</h1>

      {recipes.length === 0 ? (
        <p style={{ color: "#888" }}>Aucune recette disponible.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {recipes.map((recipe) => {
            const tags = recipe.tags.map((rt) => rt.tag.name);
            const totalTime =
              (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0) || null;

            return (
              <li
                key={recipe.id}
                style={{
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <Link
                  href={`/recipes/${recipe.id}`}
                  style={{ fontWeight: 600, fontSize: "1.05rem" }}
                >
                  {recipe.title}
                </Link>

                <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                  {tags.length > 0 && <span>{tags.join(", ")}</span>}
                  {tags.length > 0 && totalTime && <span> · </span>}
                  {totalTime && <span>{formatTime(totalTime)}</span>}
                  {(tags.length > 0 || totalTime) && <span> · </span>}
                  <span>
                    {recipe._count.ingredients} ingrédient{recipe._count.ingredients !== 1 ? "s" : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
