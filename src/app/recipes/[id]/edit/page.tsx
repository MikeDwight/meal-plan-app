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

  const [recipe, tags, units] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        tags: { select: { tag: { select: { id: true, name: true } } } },
        ingredients: {
          include: {
            ingredient: { select: { id: true, name: true } },
            unit: { select: { id: true, abbr: true } },
          },
        },
      },
    }),
    prisma.tag.findMany({ where: { householdId: HOUSEHOLD_ID }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { householdId: HOUSEHOLD_ID }, orderBy: { abbr: "asc" } }),
  ]);

  if (!recipe || recipe.householdId !== HOUSEHOLD_ID) {
    notFound();
  }

  const initialData = {
    id: recipe.id,
    title: recipe.title,
    servings: recipe.servings,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    instructions: recipe.instructions ?? "",
    notes: recipe.notes ?? "",
    tagIds: recipe.tags.map((rt) => rt.tag.id),
    ingredients: recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredient.id,
      ingredientName: ri.ingredient.name,
      quantity: ri.quantity.toString(),
      unitId: ri.unit?.id ?? "",
      notes: ri.notes ?? "",
    })),
  };

  return (
    <main>
      <h1 style={{ marginBottom: "1.5rem" }}>Modifier la recette</h1>
      <RecipeEditForm
        householdId={HOUSEHOLD_ID}
        initialData={initialData}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
        units={units.map((u) => ({ id: u.id, abbr: u.abbr }))}
      />
    </main>
  );
}
