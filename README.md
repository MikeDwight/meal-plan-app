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

### Démarrage avec Docker

```bash
# Démarrer l'application et la base de données
docker compose up --build

# L'application est accessible sur http://localhost:3000
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

## Variables d'environnement

Voir `.env.example` pour la liste des variables requises.

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABASE_URL` | URL de connexion PostgreSQL | Oui |
| `PORT` | Port du serveur (défaut: 3000) | Non |

## Déploiement

L'application est déployée automatiquement via GitHub Actions :
1. Build de l'image Docker
2. Push vers GHCR (GitHub Container Registry)
3. Déploiement sur VPS via SSH

### Endpoint de santé

`GET /health` → `200 ok`
