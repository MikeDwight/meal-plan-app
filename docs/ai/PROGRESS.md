# PROGRESS.md — Meal Plan App

## Completed

- **Gestion des recettes** : CRUD complet (titre, ingrédients, tags, temps, instructions, notes) — création, modification, suppression avec inline ingredient create
- **Plan de repas hebdomadaire** : génération automatique avec scoring (pantry coverage + anti-repeat + quotas tags)
- **Positionnement par index** : les recettes sont assignées à des positions (0-N), sans notion de jour/slot fixe
- **Pool de recettes** : génération d'un pool de suggestions pour la semaine, assignation manuelle vers les slots
- **Préservation des positions manuelles** : option pour ne pas écraser les placements manuels lors d'une régénération
- **Navigation semaine** : navigation semaine par semaine (`/week`)
- **Liste de courses** : construction depuis un WeekPlan, agrégation des ingrédients, déduction pantry
- **Merge intelligent shopping list** : les items DONE sont conservés lors d'un rebuild
- **Toggle/archive articles** : marquer les articles DONE/TODO, archiver les articles terminés
- **TransitionItems** : items de courses ponctuels hors plan de repas
- **Application transition → shopping** : transfert des items de transition vers la liste de courses
- **Clear week / Purge shopping** : boutons de remise à zéro depuis l'UI
- **Gestion du garde-manger** : page `/pantry` avec liste, ajout (inline ingredient create), modification, suppression
- **Gestion des ingrédients** : page `/ingredients` — modification nom, rayon et unité par défaut
- **Champs unité et rayon en autocomplete** : dans les formulaires recette (création et modification), remplacement du select unité par autocomplete + ajout champ rayon, avec création inline si inexistant
- **Health check** : `GET /health`
- **Multi-tenant** : tout est isolé par `householdId`
- **Docker** : images dev et prod, docker-compose
- **CI/CD** : GitHub Actions → déploiement VPS
- **Scripts d'import données** : `prisma/import-recipes.ts`, `prisma/import-ingredients.ts`, `prisma/infer-default-units.ts` — import depuis exports Notion
- **Migrations auto au démarrage** : Dockerfile lance `prisma migrate deploy` avant `node server.js`
- **Recettes cliquables depuis /week** : les titres de recettes dans le plan hebdomadaire linkent vers `/recipes/[id]`
- **Suppression notes ingrédients** : champ "note" retiré des lignes d'ingrédients (création et édition)
- **Recherche dynamique recettes** : filtrage client-side par titre ou tag sur la page `/recipes`
- **Pré-remplissage rayon en édition** : le champ rayon des ingrédients est pré-rempli depuis `ingredient.defaultAisleId` à l'ouverture du formulaire d'édition
- **Navigation mobile redesignée** : bottom nav 5 boutons — Semaine | Courses | FAB Accueil (bouton mint surélevé) | Recettes | Plus (popover Garde-manger + Ingrédients) — composant `src/app/bottom-nav.tsx`
- **Responsive audit et corrections** : table ingrédients mobile collapse (Rayon/Unité masqués en lecture), formulaire ingrédients restructuré en layout vertical (pantry pattern) pour mobile, grille ingrédients recette responsive (Rayon passe pleine largeur sur mobile)

## In Progress

- Aucun chantier actif

## Planned

- Authentification / gestion multi-utilisateurs par foyer
- Ajout manuel d'articles à la liste de courses
- Vue calendrier pour le planning hebdomadaire
- Historique des semaines passées
