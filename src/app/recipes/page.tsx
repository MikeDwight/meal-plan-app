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
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    ingredientCount: r._count.ingredients,
  }));

  return (
    <main>
      <h1>Recettes</h1>
      <RecipeList recipes={serialized} />
    </main>
  );
}
