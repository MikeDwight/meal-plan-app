# ARCHITECTURE.md — Meal Plan App

## Structure des dossiers

```
meal-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # Routes API (Route Handlers)
│   │   ├── recipes/            # Pages recettes
│   │   ├── week/               # Pages planning semaine
│   │   ├── shopping/           # Pages liste de courses
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── prisma.ts           # Client Prisma singleton
│       ├── mealplan/           # Logique génération de plan
│       └── shoppinglist/       # Logique construction liste de courses
├── prisma/
│   ├── schema.prisma           # Schéma Prisma
│   ├── migrations/             # Migrations SQL
│   ├── seed.ts                 # Seed complet
│   └── seed-recipes-only.ts    # Seed recettes uniquement
├── docs/ai/                    # Mémoire projet IA
├── Dockerfile
├── docker-compose.yml          # Prod-like local
├── docker-compose.dev.yml      # Dev avec hot reload
└── .github/workflows/deploy.yml
```

## Modèles Prisma

| Modèle | Description |
|--------|-------------|
| `Household` | Foyer — racine de tout |
| `Recipe` | Recette avec métadonnées |
| `RecipeIngredient` | Ingrédient d'une recette (quantité, unité) |
| `RecipeTag` | Tag associé à une recette |
| `Ingredient` | Ingrédient (nom, unité/rayon par défaut) |
| `Unit` | Unité de mesure (nom + abréviation) |
| `Tag` | Tag de catégorisation des recettes |
| `Aisle` | Rayon de supermarché (avec ordre de tri) |
| `PantryItem` | Stock garde-manger |
| `WeekPlan` | Plan de la semaine (clé: householdId + weekStart lundi) |
| `WeekPlanRecipe` | Recette assignée à une position dans le plan |
| `WeekRecipePool` | Pool de suggestions pour une semaine |
| `WeekRecipePoolItem` | Item du pool (avec score) |
| `ShoppingItem` | Article de liste de courses |
| `TransitionItem` | Besoin ponctuel hors plan |

### Relations clés

- `Household` → everything (cascade delete)
- `WeekPlan` ←→ `WeekPlanRecipe` ←→ `Recipe`
- `WeekRecipePool` ←→ `WeekRecipePoolItem` ←→ `Recipe`
- `ShoppingItem` est rattaché à une semaine / un foyer et peut référencer un ingrédient, une unité et un rayon selon son origine et son mode de création.

## Conventions métier

- La semaine est identifiée par `weekStart` aligné sur le lundi.
- Toutes les données métier sont isolées par `householdId`.
- Les positions du plan (`WeekPlanRecipe.position`) remplacent une logique fixe jour/repas.

## Routes API

### Recettes
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/recipes` | Liste des recettes du foyer |
| POST | `/api/recipes` | Créer une recette |
| GET | `/api/recipes/[id]` | Détail d'une recette |
| PUT | `/api/recipes/[id]` | Modifier une recette |
| DELETE | `/api/recipes/[id]` | Supprimer une recette |

### Plan de repas
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/mealplan` | Plan de la semaine |
| POST | `/api/mealplan/generate` | Générer le plan automatiquement |
| PUT | `/api/mealplan/slot` | Assigner une recette à une position |
| DELETE | `/api/mealplan/slot` | Supprimer une recette d'une position |
| POST | `/api/mealplan/clear-week` | Vider le plan de la semaine |
| GET | `/api/mealplan/pool` | Pool de recettes suggérées |
| POST | `/api/mealplan/pool/generate` | Générer le pool |
| POST | `/api/mealplan/pool/clear` | Vider le pool |

### Liste de courses
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/shoppinglist` | Articles de la semaine |
| POST | `/api/shoppinglist/build` | Construire/rebuilder la liste |
| POST | `/api/shoppinglist/archive-done` | Archiver les articles DONE |
| POST | `/api/shoppinglist/purge` | Purger la liste |
| PATCH | `/api/shoppingitem/[id]` | Toggle/set status d'un article |
| DELETE | `/api/shoppingitem/[id]` | Supprimer un article |

### Garde-manger
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/pantry` | Liste des items du garde-manger |
| POST | `/api/pantry` | Ajouter un item |
| PATCH | `/api/pantry/[id]` | Modifier quantité/unité |
| DELETE | `/api/pantry/[id]` | Supprimer un item |

### Transition & Référentiels
| Méthode | Route | Description |
|---------|-------|-------------|
| GET/POST | `/api/transitionitems` | Items de transition |
| PATCH/DELETE | `/api/transitionitem/[id]` | Modifier/supprimer un item |
| POST | `/api/transition/apply` | Appliquer en liste de courses |
| GET | `/api/ingredients` | Liste des ingrédients |
| PATCH | `/api/ingredients/[id]` | Modifier nom/rayon/unité par défaut d'un ingrédient |
| GET | `/api/units` | Liste des unités |
| POST | `/api/units` | Créer une unité |
| GET | `/api/tags` | Liste des tags |
| GET | `/api/aisles` | Liste des rayons |
| POST | `/api/aisles` | Créer un rayon |
| GET | `/health` | Health check |

## Modules lib

### `src/lib/mealplan/`
- `generator.ts` — algorithme principal de génération (scoring, sélection greedy)
- `pool-generator.ts` — génération du pool de suggestions
- `scoring.ts` — calcul du taux de couverture garde-manger
- `antiRepeat.ts` — pénalité anti-répétition (lookback sur N semaines)
- `quotas.ts` — bonus de quota par tag (ex: équilibre viande/végé)
- `types.ts` — types TypeScript
- `utils.ts` — utilitaires (normalisation date → lundi)

### `src/lib/shoppinglist/`
- `builder.ts` — agrégation ingrédients + déduction pantry + merge intelligent
- `types.ts` — types TypeScript

## Pages

| Route | Composant principal | Description |
|-------|---------------------|-------------|
| `/` | `page.tsx` | Accueil |
| `/recipes` | `recipe-list.tsx` | Liste des recettes |
| `/recipes/new` | `recipe-form.tsx` | Formulaire création |
| `/recipes/[id]` | `page.tsx` | Détail recette |
| `/week` | `meal-list.tsx` | Planning semaine |
| `/shopping` | `shopping-list-client.tsx` | Liste de courses |
| `/pantry` | `pantry-client.tsx` | Gestion du garde-manger |
| `/ingredients` | `ingredients-client.tsx` | Gestion des ingrédients |
