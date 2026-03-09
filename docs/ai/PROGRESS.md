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
- **Scripts d'import données** : utilisés pour migration initiale depuis Notion (supprimés après import)
- **Migrations auto au démarrage** : Dockerfile lance `prisma migrate deploy` avant `node server.js`
- **Recettes cliquables depuis /week** : les titres de recettes dans le plan hebdomadaire linkent vers `/recipes/[id]`
- **Suppression notes ingrédients** : champ "note" retiré des lignes d'ingrédients (création et édition)
- **Recherche dynamique recettes** : filtrage client-side par titre ou tag sur la page `/recipes`
- **Pré-remplissage rayon en édition** : le champ rayon des ingrédients est pré-rempli depuis `ingredient.defaultAisleId` à l'ouverture du formulaire d'édition
- **Navigation mobile redesignée** : bottom nav 5 boutons — Semaine | Courses | FAB Accueil (bouton mint surélevé) | Recettes | Plus (popover Garde-manger + Articles) — composant `src/app/bottom-nav.tsx`
- **Responsive audit et corrections** : table articles mobile collapse (Rayon/Unité masqués en lecture), formulaire articles restructuré en layout vertical (pantry pattern) pour mobile, grille ingrédients recette responsive (Rayon passe pleine largeur sur mobile)
- **Articles ponctuels améliorés** : autocomplete sur catalogue d'articles, création inline avec rayon + unité (autocomplete + création si inexistant), auto-ajout à la liste après création, purge des items cochés
- **Page catalogue renommée** : "Ingrédients" → "Articles" dans la nav (desktop + mobile), titres et libellés
- **Suppression d'articles** : bouton supprimer avec confirmation 2 étapes, protection si article utilisé en recette/garde-manger/courses
- **Nettoyage repo** : suppression maquettes HTML et scripts d'import one-shot (données déjà en prod)
- **Import recette depuis photo** : bouton "Importer depuis une photo" sur `/recipes/new` — upload image ou prise de vue mobile, envoi à GPT-4o vision (`POST /api/recipes/import-photo`), extraction titre/portions/ingrédients/instructions, pré-remplissage du formulaire avec matching automatique sur le catalogue existant. Instructions générées si non lisibles. Clé `OPENAI_API_KEY` injectée via GitHub Secret → `.env` sur VPS.
- **Persistance rayon/unité à la création inline** : quand un ingrédient est créé inline depuis le formulaire recette, ses `defaultUnitId` et `defaultAisleId` sont PATCHés au submit avec les valeurs saisies dans la ligne.
- **Exposition publique via domaine** : `meal.mikealvs.fr` exposé via Nginx reverse proxy (HTTPS Let's Encrypt + Basic Auth). Configuration serveur : `/etc/nginx/sites-available/meal.mikealvs.fr`, `/etc/nginx/.htpasswd`. Port 3000 bloqué depuis internet via règle iptables `DOCKER-USER` (persistante via `iptables-persistent`).

## In Progress

- Aucun chantier actif

## Planned

- Authentification / gestion multi-utilisateurs par foyer
- Ajout manuel d'articles à la liste de courses
- Vue calendrier pour le planning hebdomadaire
- Historique des semaines passées
