# CLAUDE.md — Règles de travail

## Contexte du projet

Voir les fichiers de mémoire projet :

- `docs/ai/PROJECT.md` — objectif, stack, concepts
- `docs/ai/ARCHITECTURE.md` — structure, modèles, routes API, modules
- `docs/ai/PROGRESS.md` — fonctionnalités terminées / en cours / planifiées

Consulter ces fichiers si le contexte de la tâche n'est pas clair.

## Règles de modification

- Toujours préférer des modifications minimales.
- Éviter les refactors massifs sauf demande explicite.
- Modifier le plus petit nombre de fichiers possible.
- Toujours annoncer les fichiers qui seront modifiés avant de les modifier.
- Ne pas ajouter de commentaires, docstrings ou types aux parties du code non modifiées.
- Ne pas introduire de couches d'abstraction pour un usage unique.

## Workflow

1. Comprendre la demande (demander si ambigu).
2. Proposer un plan court (fichiers concernés + approche).
3. Modifier uniquement les fichiers nécessaires.
4. Fournir un résumé des modifications.
5. Fournir les commandes pour tester.

## Mise à jour de la mémoire projet

Quand une fonctionnalité est terminée et validée par l'utilisateur, mettre à jour :

`docs/ai/PROGRESS.md`

Déplacer l'item de **In Progress** ou **Planned** vers **Completed**.

## Sécurité

- Ne jamais exposer de secrets ou credentials dans le code.
- Si une décision technique est ambiguë ou risquée : arrêter et demander confirmation.
- Valider les entrées utilisateur aux frontières du système (API routes).

## Stack de référence

- Next.js 16 App Router — les routes API sont des Route Handlers dans `src/app/api/`
- Prisma 6 — le client est un singleton dans `src/lib/prisma.ts`
- Zod — validation des inputs dans les routes API
- TypeScript strict
- npm (ne pas utiliser yarn ou bun)

## Source de vérité

Le repository est la source de vérité.

Ne jamais considérer une conversation comme mémoire fiable du projet.
Toute information durable doit exister dans :

- `docs/ai/PROJECT.md`
- `docs/ai/ARCHITECTURE.md`
- `docs/ai/PROGRESS.md`

## Règle anti-invention

Si une information n’est pas clairement présente dans le repository :
- ne pas l’inventer
- l’indiquer explicitement
- demander confirmation si cette information est nécessaire à la tâche
