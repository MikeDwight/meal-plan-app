"use client";

import { useState } from "react";

export function CommentField({
  comment,
  isDone,
  onSave,
}: {
  comment: string | null;
  isDone: boolean;
  onSave: (comment: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function start() {
    setDraft(comment ?? "");
    setEditing(true);
  }

  async function save() {
    setEditing(false);
    const next = draft.trim() || null;
    if (next === (comment ?? null)) return;
    await onSave(next);
  }

  if (editing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        maxLength={200}
        placeholder="Ex. Danette, Activia…"
        autoFocus
        style={{ width: "100%", marginTop: "0.25rem", padding: "0.2rem 0.4rem", fontSize: "0.8rem", border: "1px solid #47ebbf", borderRadius: "0.375rem", outline: "none" }}
      />
    );
  }

  if (!comment) {
    return (
      <button
        type="button"
        onClick={start}
        title="Ajouter un commentaire"
        style={{ display: "flex", alignItems: "center", gap: "0.2rem", marginTop: "0.15rem", padding: 0, background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: "0.7rem" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>add_comment</span>
        Commentaire
      </button>
    );
  }

  return (
    <span
      onClick={start}
      title="Modifier le commentaire"
      style={{ display: "block", marginTop: "0.15rem", fontSize: "0.8rem", fontStyle: "italic", color: isDone ? "#cbd5e1" : "#64748b", cursor: "pointer", wordBreak: "break-word" }}
    >
      {comment}
    </span>
  );
}
