"use client";

import Link from "next/link";

interface MealCardProps {
  position: number;
  recipe: { id: string; title: string; tags: string[] };
  onReplace: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function MealCard({
  position,
  recipe,
  onReplace,
  onDelete,
  isDeleting,
}: MealCardProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1rem",
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "3rem",
          height: "3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f0f0",
          borderRadius: "50%",
          fontWeight: 700,
          fontSize: "1rem",
          color: "#555",
        }}
      >
        {position + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Link
            href={`/recipes/${recipe.id}`}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {recipe.title}
          </Link>
        </div>
        {recipe.tags.length > 0 && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#888",
              marginTop: "0.2rem",
            }}
          >
            {recipe.tags.join(", ")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onReplace}
          disabled={isDeleting}
          style={{
            padding: "0.4rem 0.75rem",
            fontSize: "0.8rem",
            border: "1px solid #0070f3",
            borderRadius: "4px",
            background: "#fff",
            color: "#0070f3",
            cursor: isDeleting ? "wait" : "pointer",
          }}
        >
          Remplacer
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          style={{
            padding: "0.4rem 0.75rem",
            fontSize: "0.8rem",
            border: "1px solid #dc3545",
            borderRadius: "4px",
            background: isDeleting ? "#f5f5f5" : "#fff",
            color: "#dc3545",
            cursor: isDeleting ? "wait" : "pointer",
          }}
        >
          {isDeleting ? "..." : "Supprimer"}
        </button>
      </div>
    </div>
  );
}
