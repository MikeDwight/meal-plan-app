# Meal Plan App

Application de planification de repas - Next.js + TypeScript + Prisma + PostgreSQL.

## Stack technique

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript
- **ORM** : Prisma
- **Base de données** : PostgreSQL
- **Conteneurisation** : Docker + docker-compose

## Développement local

### Prérequis

- Docker et Docker Compose
- Node.js 20+ (pour le développement sans Docker)

### Modes Docker disponibles

| Mode | Fichier | Usage |
|------|---------|-------|
| **Développement** | `docker-compose.dev.yml` | Hot reload, volumes montés |
| **Prod-like local** | `docker-compose.yml` | Build image prod, test local |
| **Production** | `docker-compose.prod.example.yml` | Template pour VPS |

### Développement avec Docker (recommandé)

```bash
# Démarrer en mode développement avec hot reload
docker compose -f docker-compose.dev.yml up

# L'application est accessible sur http://localhost:3000
# Les modifications du code sont appliquées automatiquement
```

### Test local "prod-like"

```bash
# Build et lancer l'image de production localement
docker compose up --build

# Utile pour tester le build avant déploiement
```

### Vérification du health check

```bash
curl http://localhost:3000/health
# Réponse attendue : ok
```

### Développement sans Docker

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env

# Démarrer PostgreSQL (via Docker ou installation locale)
docker compose -f docker-compose.dev.yml up postgres -d

# Démarrer en mode développement
npm run dev
```

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre le serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Démarre le serveur de production |
| `npm run lint` | Lint du code |
| `npm run prisma:migrate` | Crée une nouvelle migration (dev) |
| `npm run prisma:migrate:deploy` | Applique les migrations (prod) |
| `npm run prisma:studio` | Interface web Prisma |
| `npm run prisma:seed` | Exécute le seed |

## Variables d'environnement

Voir `.env.example` pour la liste des variables requises.

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | URL de connexion PostgreSQL | Oui |
| `PORT` | Port du serveur (défaut: 3000) | Non |

## Déploiement

### Production avec Docker Compose

```bash
# 1. Copier le template
cp docker-compose.prod.example.yml docker-compose.prod.yml

# 2. Créer le fichier d'environnement
cat > .env.prod << 'EOF'
DATABASE_URL=postgresql://mealplan_user:STRONG_PASSWORD@postgres:5432/mealplan?schema=public
POSTGRES_USER=mealplan_user
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=mealplan
EOF

# 3. Lancer en production
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 4. Appliquer les migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Déploiement automatisé (CI/CD)

L'application est déployée automatiquement via GitHub Actions :
1. Build de l'image Docker
2. Push vers GHCR (GitHub Container Registry)
3. Déploiement sur VPS via SSH

### Endpoint de santé

`GET /health` → `200 ok`

## API — Build Shopping List

`POST /api/shoppinglist/build` génère la liste de courses à partir d'un WeekPlan existant.

- Agrège les ingrédients de toutes les recettes du plan (proportionnel aux portions)
- Soustrait le stock du garde-manger (pantry) quand l'unité est identique
- **Merge intelligent** : les items marqués `DONE` sont conservés lors d'un rebuild
  - Items toujours requis → mis à jour (quantité, rayon…) sans toucher au `status`
  - Items qui ne sont plus requis → archivés (`archivedAt` = now) mais pas supprimés
  - Nouveaux items → créés avec `status: TODO`
- Résultat : seuls les items actifs (`archivedAt = null`) sont retournés
- Tri par rayon (`aisle.sortOrder`) puis par label

### Requête

```bash
# Par weekPlanId
curl -X POST http://localhost:3000/api/shoppinglist/build \
  -H "Content-Type: application/json" \
  -d '{"householdId": "home-household", "weekPlanId": "WEEK_PLAN_ID"}'

# Ou par weekStart (YYYY-MM-DD, normalisé au lundi)
curl -X POST http://localhost:3000/api/shoppinglist/build \
  -H "Content-Type: application/json" \
  -d '{"householdId": "home-household", "weekStart": "2026-02-23"}'
```

### Réponse (201)

```json
{
  "weekPlanId": "clx...",
  "weekStart": "2026-02-23",
  "items": [
    {
      "id": "clx...",
      "ingredientId": "clx...",
      "label": "Tomates",
      "quantity": "0.8",
      "unitId": "clx...",
      "unitAbbr": "kg",
      "aisleId": "clx...",
      "aisleName": "Fruits & légumes",
      "aisleSortOrder": 0,
      "status": "DONE",
      "source": "MEALPLAN"
    }
  ],
  "meta": {
    "totalActive": 12,
    "ingredientsAggregated": 15,
    "pantryDeductions": 3,
    "created": 2,
    "updated": 8,
    "archived": 1
  }
}
```

## API — Get Shopping List

`GET /api/shoppinglist` retourne les articles de courses d'une semaine, triés par rayon.

### Query params

| Param | Type | Requis | Défaut | Description |
|-------|------|--------|--------|-------------|
| `householdId` | string | oui | — | ID du foyer |
| `weekPlanId` | string | XOR | — | ID du plan de semaine |
| `weekStart` | string | XOR | — | Date ISO (YYYY-MM-DD), normalisée au lundi |
| `includeArchived` | "true"/"false" | non | "false" | Inclure les items archivés |
| `includeDone` | "true"/"false" | non | "true" | Inclure les items DONE |

### Requêtes

```bash
# Items actifs (par défaut : pas d'archivés, avec les DONE)
curl "http://localhost:3000/api/shoppinglist?householdId=home-household&weekStart=2026-02-23"

# Inclure les items archivés
curl "http://localhost:3000/api/shoppinglist?householdId=home-household&weekStart=2026-02-23&includeArchived=true"

# Uniquement les items TODO (exclure les DONE)
curl "http://localhost:3000/api/shoppinglist?householdId=home-household&weekStart=2026-02-23&includeDone=false"
```

### Réponse (200)

```json
{
  "weekPlanId": "clx...",
  "weekStart": "2026-02-23",
  "items": [
    {
      "id": "clx...",
      "ingredientId": "clx...",
      "label": "Tomates",
      "quantity": "0.8",
      "unitId": "clx...",
      "unitAbbr": "kg",
      "aisleId": "clx...",
      "aisleName": "Fruits & légumes",
      "aisleSortOrder": 0,
      "status": "TODO",
      "source": "MEALPLAN",
      "archivedAt": null
    }
  ],
  "meta": {
    "total": 12,
    "done": 3,
    "todo": 9,
    "archived": 1
  }
}
```

## API — Toggle ShoppingItem

`PATCH /api/shoppingitem/:id` bascule le status d'un article entre `TODO` et `DONE`.

- Si `status` est fourni dans le body → set explicite
- Sinon → toggle automatique (`TODO` ↔ `DONE`)
- Le `householdId` est vérifié (403 si mismatch)

### Requêtes

```bash
# Toggle automatique (TODO → DONE ou DONE → TODO)
curl -X PATCH http://localhost:3000/api/shoppingitem/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"householdId": "home-household"}'

# Set explicite
curl -X PATCH http://localhost:3000/api/shoppingitem/ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"householdId": "home-household", "status": "DONE"}'
```

### Réponse (200)

```json
{
  "id": "clx...",
  "ingredientId": "clx...",
  "label": "Tomates",
  "quantity": "0.8",
  "unitId": "clx...",
  "unitAbbr": "kg",
  "aisleId": "clx...",
  "aisleName": "Fruits & légumes",
  "aisleSortOrder": 0,
  "status": "DONE",
  "source": "MEALPLAN",
  "archivedAt": null
}
```
