import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ASSISTANT_TOOLS } from "@/lib/assistant/tools";
import { executeTool } from "@/lib/assistant/executor";
import { getCurrentMondayString } from "@/lib/mealplan/utils";

const SYSTEM_PROMPT = `Tu es l'assistant de l'application familiale de planification de repas.
Tu peux lire et modifier le plan de repas, la liste de courses, le garde-manger et les recettes.
Réponds en français, de façon concise et pratique.
Après avoir exécuté une action, confirme ce que tu as fait sans détailler chaque étape intermédiaire.
Si tu dois choisir des recettes variées, préfère celles qui n'ont pas été planifiées récemment.`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY non configurée" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages doit être un tableau" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const currentWeekStart = getCurrentMondayString();

    const systemPrompt = `${SYSTEM_PROMPT}
Date du jour : ${today}
Semaine courante (lundi) : ${currentWeekStart}`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...apiMessages],
      tools: ASSISTANT_TOOLS,
      tool_choice: "auto",
    });

    const executedActions: string[] = [];
    const allMessages: OpenAI.ChatCompletionMessageParam[] = [...apiMessages];

    while (response.choices[0].finish_reason === "tool_calls") {
      const assistantMsg = response.choices[0].message;
      allMessages.push(assistantMsg);

      const toolResults: OpenAI.ChatCompletionMessageParam[] = [];

      for (const toolCall of assistantMsg.tool_calls ?? []) {
        if (toolCall.type !== "function") continue;
        let result: unknown;
        try {
          const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          result = await executeTool(toolCall.function.name, args);
          executedActions.push(toolCall.function.name);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Erreur inconnue" };
        }

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      allMessages.push(...toolResults);

      response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...allMessages],
        tools: ASSISTANT_TOOLS,
        tool_choice: "auto",
      });
    }

    return NextResponse.json({
      message: response.choices[0].message.content ?? "",
      actions: executedActions,
    });
  } catch (error) {
    console.error("Unexpected error in /api/assistant:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
