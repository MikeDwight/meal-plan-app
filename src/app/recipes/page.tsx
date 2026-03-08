import { prisma } from "@/lib/prisma";
import { RecipeList } from "./recipe-list";

export const dynamic = "force-dynamic";

const HOUSEHOLD_ID = "home-household";

export default async function RecipesPage() {
  const recipes = await prisma.recipe.findMany({
    where: { householdId: HOUSEHOLD_ID },
    include: {
      tags: { select: { tag: { select: { name: true } } } },
      _count: { select: { ingredients: true } },
    },
    orderBy: { title: "asc" },
  });

  const serialized = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    tags: r.tags.map((rt) => rt.tag.name),
    ingredientCount: r._count.ingredients,
  }));

  return (
    <main style={{ maxWidth: "42rem", margin: "0 auto" }}>
      <div style={{ padding: "2rem 0 1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>Recettes</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
          {serialized.length} recette{serialized.length !== 1 ? "s" : ""} dans votre collection
        </p>
      </div>
      <RecipeList recipes={serialized} />
    </main>
  );
}
