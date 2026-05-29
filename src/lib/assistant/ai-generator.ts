import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { normalizeToMonday } from "@/lib/mealplan/utils";
import type { GenerateMealPlanResponse, MealPlanItem } from "@/lib/mealplan/types";

const LOOKBACK_WEEKS = 4;

async function fetchContext(householdId: string, monday: Date) {
  const historyStart = new Date(monday);
  historyStart.setDate(historyStart.getDate() - LOOKBACK_WEEKS * 7);
  const historyEnd = new Date(monday);
  historyEnd.setDate(historyEnd.getDate() - 7);

  return Promise.all([
    prisma.recipe.findMany({
      where: {
        householdId,
        tags: { some: { tag: { name: { equals: "Repas", mode: "insensitive" } } } },
      },
      select: {
        id: true,
        title: true,
        tags: { select: { tag: { select: { name: true } } } },
        ingredients: { select: { ingredient: { select: { name: true } } }, take: 6 },
      },
      orderBy: { title: "asc" },
    }),
    prisma.pantryItem.findMany({
      where: { householdId },
      include: { ingredient: { select: { name: true } } },
    }),
    prisma.weekPlan.findMany({
      where: {
        householdId,
        weekStart: { gte: historyStart, lte: historyEnd },
      },
      include: {
        recipes: {
          include: { recipe: { select: { title: true } } },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { weekStart: "desc" },
    }),
  ]);
}

function buildPrompt(
  recipes: { id: string; title: string; tags: { tag: { name: string } }[]; ingredients: { ingredient: { name: string } }[] }[],
  pantry: { ingredient: { name: string } }[],
  pastPlans: { weekStart: Date; recipes: { recipe: { title: string } }[] }[],
  weekStart: string,
  count: number,
  excludedIds: Set<string>
): string {
  const available = recipes.filter((r) => !excludedIds.has(r.id));

  const recipeLines = available
    .map((r) => {
      const tags = r.tags.map((rt) => rt.tag.name).join(", ");
      const ing = r.ingredients.map((ri) => ri.ingredient.name).join(", ");
      return `${r.id} | ${r.title} | ${tags} | ${ing}`;
    })
    .join("\n");

  const pantryLines =
    pantry.length > 0 ? pantry.map((p) => p.ingredient.name).join(", ") : "vide";

  const historyLines =
    pastPlans.length > 0
      ? pastPlans
          .map((plan) => {
            const d =
              plan.weekStart instanceof Date
                ? plan.weekStart.toISOString().split("T")[0]
                : String(plan.weekStart).split("T")[0];
            return `${d}: ${plan.recipes.map((r) => r.recipe.title).join(", ")}`;
          })
          .join("\n")
      : "aucun";

  return `Tu planifies ${count} repas pour la semaine du ${weekStart}.

RECETTES DISPONIBLES (format: ID | Titre | Tags | Ingrédients principaux):
${recipeLines}

GARDE-MANGER: ${pantryLines}

HISTORIQUE DES ${LOOKBACK_WEEKS} SEMAINES PRÉCÉDENTES:
${historyLines}

CONSIGNES:
- Sélectionne exactement ${count} recettes différentes parmi la liste ci-dessus
- Évite absolument les recettes présentes dans l'historique récent pour assurer la variété
- Varie les tags et les types de plats
- Favorise les recettes qui utilisent les ingrédients du garde-manger
- Utilise uniquement les IDs exacts fournis ci-dessus

Réponds UNIQUEMENT avec ce JSON (pas de texte autour):
{"recipeIds":["id1","id2",...]}

La liste doit contenir exactement ${count} IDs dans l'ordre de planification.`;
}

export async function generateMealPlanAI(
  householdId: string,
  weekStart: string,
  count: number = 14,
  preserveManualPositions: boolean = false
): Promise<GenerateMealPlanResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY non configurée");
  }

  const monday = normalizeToMonday(weekStart);
  const weekStartFormatted = monday.toISOString().split("T")[0];

  const [recipes, pantry, pastPlans] = await fetchContext(householdId, monday);

  if (recipes.length === 0) {
    throw new Error("Aucune recette disponible (tag 'Repas' requis)");
  }

  const weekPlan = await prisma.weekPlan.upsert({
    where: { householdId_weekStart: { householdId, weekStart: monday } },
    update: { updatedAt: new Date() },
    create: { householdId, weekStart: monday },
  });

  const manualItems: MealPlanItem[] = [];
  if (preserveManualPositions) {
    const existing = await prisma.weekPlanRecipe.findMany({
      where: { weekPlanId: weekPlan.id, isManual: true },
    });
    manualItems.push(...existing.map((i) => ({ position: i.position, recipeId: i.recipeId })));
  }

  const excludedIds = new Set(manualItems.map((i) => i.recipeId));
  const manualPositions = new Set(manualItems.map((i) => i.position));
  const freePositions = Array.from({ length: count }, (_, i) => i).filter(
    (p) => !manualPositions.has(p)
  );

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = buildPrompt(recipes, pantry, pastPlans, weekStartFormatted, freePositions.length, excludedIds);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.9,
  });

  const raw = JSON.parse(response.choices[0].message.content ?? "{}") as {
    recipeIds?: string[];
  };

  if (!Array.isArray(raw.recipeIds) || raw.recipeIds.length === 0) {
    throw new Error("Réponse IA invalide ou vide");
  }

  const validIds = new Set(recipes.map((r) => r.id));
  const aiItems: MealPlanItem[] = [];
  const usedIds = new Set<string>(excludedIds);

  for (const recipeId of raw.recipeIds) {
    if (aiItems.length >= freePositions.length) break;
    if (!validIds.has(recipeId) || usedIds.has(recipeId)) continue;
    aiItems.push({ position: freePositions[aiItems.length], recipeId });
    usedIds.add(recipeId);
  }

  // Fallback : si l'IA n'a pas rempli tous les slots (IDs invalides ou manquants),
  // on complète avec des recettes non encore utilisées dans un ordre aléatoire.
  if (aiItems.length < freePositions.length) {
    const fallback = recipes
      .filter((r) => !usedIds.has(r.id))
      .sort(() => Math.random() - 0.5);
    for (const recipe of fallback) {
      if (aiItems.length >= freePositions.length) break;
      aiItems.push({ position: freePositions[aiItems.length], recipeId: recipe.id });
      usedIds.add(recipe.id);
    }
  }

  if (preserveManualPositions) {
    await prisma.weekPlanRecipe.deleteMany({
      where: { weekPlanId: weekPlan.id, isManual: false },
    });
  } else {
    await prisma.weekPlanRecipe.deleteMany({ where: { weekPlanId: weekPlan.id } });
  }

  if (aiItems.length > 0) {
    await prisma.weekPlanRecipe.createMany({
      data: aiItems.map((item) => ({
        weekPlanId: weekPlan.id,
        recipeId: item.recipeId,
        position: item.position,
        isManual: false,
      })),
    });
  }

  const allItems = [...manualItems, ...aiItems].sort((a, b) => a.position - b.position);

  return {
    weekPlanId: weekPlan.id,
    weekStart: weekStartFormatted,
    items: allItems,
    meta: { totalPositions: count, filledPositions: allItems.length },
  };
}
