import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RecipeEditForm } from "./recipe-edit-form";

export const dynamic = "force-dynamic";

const HOUSEHOLD_ID = "home-household";

export default async function RecipeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [recipe, tags, units, aisles] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        tags: { select: { tag: { select: { id: true, name: true } } } },
        ingredients: {
          include: {
            ingredient: { select: { id: true, name: true, defaultAisleId: true, defaultAisle: { select: { name: true } } } },
            unit: { select: { id: true, abbr: true } },
          },
        },
      },
    }),
    prisma.tag.findMany({ where: { householdId: HOUSEHOLD_ID }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { householdId: HOUSEHOLD_ID }, orderBy: { abbr: "asc" } }),
    prisma.aisle.findMany({ where: { householdId: HOUSEHOLD_ID }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!recipe || recipe.householdId !== HOUSEHOLD_ID) {
    notFound();
  }

  const initialData = {
    id: recipe.id,
    title: recipe.title,
    sourceUrl: recipe.sourceUrl ?? "",
    servings: recipe.servings,
    instructions: recipe.instructions ?? "",
    notes: recipe.notes ?? "",
    tagIds: recipe.tags.map((rt) => rt.tag.id),
    ingredients: recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredient.id,
      ingredientName: ri.ingredient.name,
      quantity: ri.quantity.toString(),
      unitId: ri.unit?.id ?? "",
      aisleId: ri.ingredient.defaultAisleId ?? "",
      aisleName: ri.ingredient.defaultAisle?.name ?? "",
      notes: ri.notes ?? "",
    })),
  };

  return (
    <main style={{ maxWidth: "42rem", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <Link
          href={`/recipes/${id}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.25rem",
            height: "2.25rem",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            textDecoration: "none",
            color: "#475569",
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>arrow_back</span>
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Modifier la recette</h1>
      </div>
      <RecipeEditForm
        householdId={HOUSEHOLD_ID}
        initialData={initialData}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
        units={units.map((u) => ({ id: u.id, abbr: u.abbr }))}
        aisles={aisles.map((a) => ({ id: a.id, name: a.name }))}
      />
    </main>
  );
}
