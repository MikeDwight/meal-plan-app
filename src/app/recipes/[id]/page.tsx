import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const HOUSEHOLD_ID = "home-household";

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      tags: { select: { tag: { select: { name: true } } } },
      ingredients: {
        include: {
          ingredient: { select: { name: true } },
          unit: { select: { abbr: true, name: true } },
        },
      },
    },
  });

  if (!recipe || recipe.householdId !== HOUSEHOLD_ID) {
    notFound();
  }

  const tags = recipe.tags.map((rt) => rt.tag.name);
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0) || null;

  const sortedIngredients = [...recipe.ingredients].sort((a, b) =>
    a.ingredient.name.localeCompare(b.ingredient.name, "fr")
  );

  return (
    <main>
      <Link href="/recipes" style={{ fontSize: "0.9rem" }}>
        ← Retour aux recettes
      </Link>

      <h1 style={{ marginTop: "0.5rem" }}>{recipe.title}</h1>

      {tags.length > 0 && (
        <p style={{ color: "#666" }}>{tags.join(", ")}</p>
      )}

      {/* --- Infos --- */}
      <section style={{ margin: "1rem 0", fontSize: "0.95rem" }}>
        <h2>Infos</h2>
        <ul style={{ listStyle: "none", padding: 0, lineHeight: 1.8 }}>
          {recipe.servings != null && (
            <li>Portions : {recipe.servings}</li>
          )}
          {recipe.prepTime != null && (
            <li>Préparation : {formatTime(recipe.prepTime)}</li>
          )}
          {recipe.cookTime != null && (
            <li>Cuisson : {formatTime(recipe.cookTime)}</li>
          )}
          {totalTime && (
            <li>
              <strong>Total : {formatTime(totalTime)}</strong>
            </li>
          )}
          {recipe.sourceUrl && (
            <li>
              Source :{" "}
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {recipe.sourceUrl}
              </a>
            </li>
          )}
        </ul>
      </section>

      {/* --- Ingrédients --- */}
      <section style={{ margin: "1rem 0" }}>
        <h2>Ingrédients</h2>
        {sortedIngredients.length === 0 ? (
          <p style={{ color: "#888" }}>Aucun ingrédient renseigné.</p>
        ) : (
          <ul style={{ padding: "0 0 0 1.2rem", lineHeight: 1.8 }}>
            {sortedIngredients.map((ri) => {
              const qty = ri.quantity != null ? String(ri.quantity) : null;
              const unit = ri.unit?.abbr ?? ri.unit?.name ?? null;

              return (
                <li key={ri.id}>
                  {qty && <>{qty} </>}
                  {unit && <>{unit} </>}
                  {ri.ingredient.name}
                  {ri.notes && (
                    <span style={{ color: "#888" }}> ({ri.notes})</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* --- Placeholders --- */}
      <section style={{ margin: "1rem 0" }}>
        <h2>Instructions</h2>
        <p style={{ color: "#888", fontStyle: "italic" }}>
          Non disponible dans ce MVP.
        </p>
      </section>

      <section style={{ margin: "1rem 0" }}>
        <h2>Notes</h2>
        <p style={{ color: "#888", fontStyle: "italic" }}>
          Non disponible dans ce MVP.
        </p>
      </section>
    </main>
  );
}
