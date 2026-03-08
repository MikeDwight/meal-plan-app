"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const TAG_PALETTE = [
  { bg: "#fef9c3", text: "#854d0e" }, // jaune
  { bg: "#f3e8ff", text: "#6b21a8" }, // violet
  { bg: "#d1fae5", text: "#065f46" }, // menthe
];

function getTagColor(tag: string) {
  const idx = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_PALETTE.length;
  return TAG_PALETTE[idx];
}

interface MealCardProps {
  position: number;
  recipe: { id: string; title: string; tags: string[] };
  onReplace: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function MealCard({ position, recipe, onReplace, onDelete, isDeleting }: MealCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "1rem",
        background: "#fff",
        borderRadius: "0.75rem",
        border: "1px solid #f1f5f9",
        boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
        position: "relative",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "2.5rem",
          height: "2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#d1fae5",
          borderRadius: "50%",
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "#1e293b",
        }}
      >
        {position + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "#0f172a",
            marginBottom: "0.35rem",
          }}
        >
          <Link href={`/recipes/${recipe.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            {recipe.title}
          </Link>
        </div>

        {recipe.tags.length > 0 && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {recipe.tags.map((tag) => {
              const { bg, text } = getTagColor(tag);
              return (
                <span
                  key={tag}
                  style={{
                    padding: "0.125rem 0.5rem",
                    borderRadius: "0.375rem",
                    background: bg,
                    color: text,
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          disabled={isDeleting}
          style={{
            padding: "0.375rem",
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            cursor: isDeleting ? "wait" : "pointer",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>
            {isDeleting ? "hourglass_empty" : "more_vert"}
          </span>
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "2.25rem",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              zIndex: 10,
              minWidth: "10rem",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onReplace(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.625rem 1rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "#334155",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#47ebbf" }}>swap_horiz</span>
              Remplacer
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.625rem 1rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "#ef4444",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>delete</span>
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
