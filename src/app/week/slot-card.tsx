"use client";

interface SlotCardProps {
  mealLabel: string;
  recipe: { id: string; title: string; tags: string[] } | null;
  onClick: () => void;
}

export function SlotCard({ mealLabel, recipe, onClick }: SlotCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "0.5rem",
        marginBottom: "0.5rem",
        border: "1px solid #ccc",
        borderRadius: "6px",
        background: recipe ? "#fff" : "#fafafa",
        cursor: "pointer",
        textAlign: "left",
        minHeight: "4.5rem",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "#888",
          textTransform: "uppercase",
          marginBottom: "0.25rem",
        }}
      >
        {mealLabel}
      </span>
      {recipe ? (
        <>
          <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 500 }}>
            {recipe.title}
          </span>
          {recipe.tags.length > 0 && (
            <span
              style={{
                display: "block",
                fontSize: "0.7rem",
                color: "#666",
                marginTop: "0.15rem",
              }}
            >
              {recipe.tags.join(", ")}
            </span>
          )}
        </>
      ) : (
        <span style={{ fontSize: "1.2rem", color: "#bbb" }}>+</span>
      )}
    </button>
  );
}
