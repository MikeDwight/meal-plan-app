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
