import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `Tu es un assistant qui extrait des informations de recettes de cuisine depuis des images.
Retourne UNIQUEMENT un objet JSON valide, sans markdown, sans explication.

Structure attendue :
{
  "title": "Nom de la recette",
  "servings": 4,
  "instructions": "Étapes de préparation...",
  "ingredients": [
    { "name": "tomates cerises", "quantity": 200, "unit": "g" },
    { "name": "huile d'olive", "quantity": 2, "unit": "c. à soupe" }
  ]
}

Règles :
- "servings" est un entier ou null si non trouvé
- "quantity" est un nombre (pas une chaîne), ou null si non trouvé
- "unit" est une chaîne courte (g, kg, ml, L, c. à soupe, c. à café, pincée, etc.) ou null
- "instructions" est le texte brut des étapes. Si elles ne sont pas lisibles sur la photo, rédige des instructions de préparation cohérentes en français en te basant sur le titre de la recette et la liste des ingrédients. Ne laisse jamais "instructions" à null.
- Les noms d'ingrédients sont en minuscules, sans quantité ni unité
- Si l'image n'est pas une recette, retourne { "error": "Pas une recette" }`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY non configurée" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body as { imageBase64?: string; mimeType?: string };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "imageBase64 et mimeType sont requis" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" },
            },
            { type: "text", text: "Extrais les informations de cette recette." },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Réponse non parseable", raw: content }, { status: 422 });
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in POST /api/recipes/import-photo:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
