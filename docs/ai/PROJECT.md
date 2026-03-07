# PROJECT.md — Meal Plan App

## Objectif

Application web de planification de repas pour un foyer. Permet de gérer des recettes,
générer automatiquement un planning de repas hebdomadaire, et produire une liste de courses
consolidée.

Le système privilégie une planification assistée : il propose un pool et un scoring intelligent
plutôt qu’une génération rigide, avec anti-répétition soft et prise en compte du garde-manger.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript |
| ORM | Prisma 6 |
| Base de données | PostgreSQL |
| Validation | Zod |
| Package manager | npm |
| Conteneurisation | Docker + docker-compose |
| CI/CD | GitHub Actions → VPS via SSH |

## Concepts principaux

- **Household** : entité racine multi-tenant. Tout est rattaché à un foyer.
- **Recipe** : recette avec ingrédients, tags, temps de prep/cuisson, instructions, notes.
- **WeekPlan** : plan de la semaine (commence le lundi). Contient des `WeekPlanRecipe` positionnés.
- **WeekRecipePool** : pool de recettes suggérées pour la semaine, non encore assignées aux slots.
- **ShoppingItem** : article de liste de courses. Source : `MEALPLAN`, `TRANSITION` ou `MANUAL`.
- **TransitionItem** : besoin ponctuel de la semaine hors plan de repas.
- **PantryItem** : stock du garde-manger, soustrait automatiquement de la liste de courses.

## Fonctionnement global

1. L'utilisateur crée des recettes avec leurs ingrédients.
2. Il génère un pool de recettes candidates pour la semaine (scoring automatique).
3. Il assigne manuellement les recettes du pool aux slots de la semaine, ou lance une
   génération automatique complète.
4. Une fois le plan validé, il génère la liste de courses (agrégation des ingrédients,
   déduction du garde-manger, merge intelligent si rebuild).
5. Il coche les articles au fil des courses.
