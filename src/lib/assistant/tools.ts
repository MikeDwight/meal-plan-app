import type OpenAI from "openai";

type Tool = OpenAI.ChatCompletionTool;

export const ASSISTANT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "get_week_plan",
      description: "Lire le plan de repas d'une semaine. Retourne les recettes planifiées avec leur position.",
      parameters: {
        type: "object",
        properties: {
          weekStart: {
            type: "string",
            description: "Lundi de la semaine au format YYYY-MM-DD. Si omis, utilise la semaine courante.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_meal_plan",
      description:
        "Générer automatiquement un plan de repas pour une semaine. Utilise l'historique et le garde-manger pour scorer les recettes. Appelle get_recipes avant si tu veux voir les recettes disponibles.",
      parameters: {
        type: "object",
        properties: {
          weekStart: {
            type: "string",
            description: "Lundi de la semaine au format YYYY-MM-DD.",
          },
          count: {
            type: "number",
            description: "Nombre de repas à planifier (défaut: 14).",
          },
        },
        required: ["weekStart"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recipes",
      description: "Lister toutes les recettes disponibles, avec ID, titre et tags.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Filtre optionnel sur le titre ou les tags.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pantry",
      description: "Lire le contenu du garde-manger (ingrédients disponibles en stock).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_shopping_list",
      description: "Lire la liste de courses active (articles non archivés).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "build_shopping_list",
      description: "Construire ou reconstruire la liste de courses à partir du plan de repas actuel. Les articles DONE sont conservés.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_shopping_item",
      description: "Cocher (DONE) ou décocher (TODO) un article de la liste de courses.",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "ID de l'article à modifier.",
          },
          status: {
            type: "string",
            enum: ["TODO", "DONE"],
            description: "Nouveau statut. Si omis, bascule le statut actuel.",
          },
        },
        required: ["itemId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_recipe_to_slot",
      description: "Assigner manuellement une recette à une position dans le plan hebdomadaire.",
      parameters: {
        type: "object",
        properties: {
          weekStart: {
            type: "string",
            description: "Lundi de la semaine au format YYYY-MM-DD.",
          },
          recipeId: {
            type: "string",
            description: "ID de la recette à assigner (obtenu via get_recipes).",
          },
          position: {
            type: "number",
            description: "Position dans le plan (0-13 pour 14 repas hebdomadaires).",
          },
        },
        required: ["weekStart", "recipeId", "position"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_week",
      description: "Vider complètement le plan de repas d'une semaine.",
      parameters: {
        type: "object",
        properties: {
          weekStart: {
            type: "string",
            description: "Lundi de la semaine au format YYYY-MM-DD.",
          },
        },
        required: ["weekStart"],
      },
    },
  },
];
