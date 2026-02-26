"use client";

interface SlotCardProps {
  mealLabel: string;
  recipe: { id: string; title: string; tags: string[] } | null;
  onClick: () => void;
  onClear?: () => void;
  isClearing?: boolean;
}

export function SlotCard({
  mealLabel,
  recipe,
  onClick,
  onClear,
  isClearing,
}: SlotCardProps) {
  return (
    <div
      style={{
        position: "relative",
        marginBottom: "0.5rem",
      }}
    >
      {recipe && onClear && (
        <button
          type="button"
          disabled={isClearing}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          style={{
            position: "absolute",
            top: "0.25rem",
            right: "0.25rem",
            zIndex: 1,
            width: "1.4rem",
            height: "1.4rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            borderRadius: "50%",
            background: isClearing ? "#eee" : "#e8e8e8",
            color: isClearing ? "#aaa" : "#666",
            fontSize: "0.75rem",
            lineHeight: 1,
            cursor: isClearing ? "wait" : "pointer",
            padding: 0,
          }}
          aria-label="Vider ce slot"
        >
          ✕
        </button>
      )}

      <button
        type="button"
        onClick={onClick}
        style={{
          display: "block",
          width: "100%",
          padding: "0.5rem",
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
    </div>
  );
}
