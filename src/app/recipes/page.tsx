import Link from "next/link";
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
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Recettes</h1>
        <Link
          href="/recipes/new"
          style={{
            padding: "0.5rem 1rem",
            background: "#2563eb",
            color: "#fff",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "0.95rem",
            fontWeight: 500,
          }}
        >
          + Nouvelle recette
        </Link>
      </div>
      <RecipeList recipes={serialized} />
    </main>
  );
}
