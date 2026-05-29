"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

const ACTION_LABELS: Record<string, string> = {
  get_week_plan: "Plan consulté",
  generate_meal_plan: "Plan généré",
  get_recipes: "Recettes consultées",
  get_pantry: "Garde-manger consulté",
  get_shopping_list: "Courses consultées",
  build_shopping_list: "Liste reconstruite",
  toggle_shopping_item: "Article mis à jour",
  assign_recipe_to_slot: "Recette assignée",
  clear_week: "Semaine vidée",
};

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, messages]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json() as { message?: string; actions?: string[]; error?: string };

      if (!res.ok) throw new Error(data.error ?? "Erreur");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message ?? "", actions: data.actions },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Une erreur est survenue, réessaie." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[5.5rem] right-4 md:bottom-6 md:right-6 w-12 h-12 rounded-full flex items-center justify-center z-40 shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: "#47ebbf" }}
        aria-label="Ouvrir l'assistant"
      >
        <span className="material-symbols-outlined text-xl" style={{ color: "#0f172a" }}>
          auto_awesome
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#47ebbf" }}
            >
              <span className="material-symbols-outlined text-base" style={{ color: "#0f172a" }}>
                auto_awesome
              </span>
            </div>
            <span className="font-semibold text-slate-800">Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                Effacer
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 text-sm mt-10 px-4">
              <span
                className="material-symbols-outlined text-4xl mb-3 block"
                style={{ color: "#47ebbf" }}
              >
                auto_awesome
              </span>
              <p className="font-medium text-slate-600">Que puis-je faire pour vous ?</p>
              <p className="mt-2 text-xs leading-relaxed">
                Générer le plan de la semaine, gérer la liste de courses, suggérer des recettes selon le garde-manger...
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Génère le plan de la semaine prochaine",
                  "Qu'est-ce qu'on peut faire avec le garde-manger ?",
                  "Montre-moi la liste de courses",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="block w-full text-left text-xs px-3 py-2 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-colors text-slate-600"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "rounded-tr-sm text-slate-900"
                    : "bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm"
                }`}
                style={msg.role === "user" ? { background: "#47ebbf" } : {}}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[...new Set(msg.actions)].map((action) => (
                      <span
                        key={action}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(71,235,191,0.15)", color: "#0a9a6e" }}
                      >
                        ✓ {ACTION_LABELS[action] ?? action}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "#47ebbf", animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-100 p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Écrire un message..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-shadow"
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:opacity-80 active:scale-95"
              style={{ background: "#47ebbf" }}
            >
              <span className="material-symbols-outlined text-xl" style={{ color: "#0f172a" }}>
                send
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
