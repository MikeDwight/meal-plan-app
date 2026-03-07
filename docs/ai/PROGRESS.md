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
- **Health check** : `GET /health`
- **Multi-tenant** : tout est isolé par `householdId`
- **Docker** : images dev et prod, docker-compose
- **CI/CD** : GitHub Actions → déploiement VPS

## In Progress

- Aucun chantier actif

## Planned

- Authentification / gestion multi-utilisateurs par foyer
- Gestion des rayons (Aisle) depuis l'UI
- Gestion des unités depuis l'UI
- Ajout manuel d'articles à la liste de courses
- Vue calendrier pour le planning hebdomadaire
- Historique des semaines passées
