import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RecipeActions } from "./recipe-actions";

export const dynamic = "force-dynamic";

const HOUSEHOLD_ID = "home-household";

const TAG_PALETTE = [
  { bg: "rgba(71,235,191,0.2)", text: "#0f766e", border: "rgba(71,235,191,0.3)" },
  { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
  { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
  { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
];

function getTagColor(tag: string) {
  const idx = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_PALETTE.length;
  return TAG_PALETTE[idx];
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <h3 style={{
        margin: 0,
        fontSize: "1.15rem",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}>
        <span style={{ width: "0.25rem", height: "1.5rem", background: "#47ebbf", borderRadius: "999px", display: "inline-block", flexShrink: 0 }} />
        {children}
      </h3>
      {count != null && (
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {count} article{count !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      tags: { select: { tag: { select: { name: true } } } },
      ingredients: {
        include: {
          ingredient: { select: { name: true } },
          unit: { select: { abbr: true, name: true } },
        },
      },
    },
  });

  if (!recipe || recipe.householdId !== HOUSEHOLD_ID) {
    notFound();
  }

  const tags = recipe.tags.map((rt) => rt.tag.name);
  const sortedIngredients = [...recipe.ingredients].sort((a, b) =>
    a.ingredient.name.localeCompare(b.ingredient.name, "fr")
  );

  return (
    <main>
      {/* Back link */}
      <Link
        href="/recipes"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#94a3b8",
          textDecoration: "none",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "1.5rem",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>arrow_back</span>
        Retour
      </Link>

      {/* Title */}
      <h1 style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2, margin: "0 0 1rem", color: "#0f172a" }}>
        {recipe.title}
      </h1>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {tags.map((tag) => {
            const { bg, text, border } = getTagColor(tag);
            return (
              <span
                key={tag}
                style={{
                  padding: "0.25rem 0.75rem",
                  background: bg,
                  color: text,
                  border: `1px solid ${border}`,
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      )}

      {/* Info cards */}
      {(recipe.servings != null || recipe.sourceUrl) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
          {recipe.servings != null && (
            <div style={{
              background: "#fff",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(71,235,191,0.15)",
              boxShadow: "4px 4px 0 rgba(71,235,191,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}>
              <div style={{ background: "rgba(71,235,191,0.2)", padding: "0.5rem", borderRadius: "0.5rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "#47ebbf" }}>group</span>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Portions</p>
                <p style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>{recipe.servings}</p>
              </div>
            </div>
          )}
          {recipe.sourceUrl && (
            <div style={{
              background: "#fff",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(71,235,191,0.15)",
              boxShadow: "4px 4px 0 rgba(71,235,191,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}>
              <div style={{ background: "rgba(71,235,191,0.2)", padding: "0.5rem", borderRadius: "0.5rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "#47ebbf" }}>link</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Source</p>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.8rem", fontWeight: 600, color: "#47ebbf", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}
                >
                  Voir la source
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingredients */}
      <section style={{ marginBottom: "2rem" }}>
        <SectionTitle count={sortedIngredients.length}>Ingrédients</SectionTitle>
        {sortedIngredients.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Aucun ingrédient renseigné.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {sortedIngredients.map((ri) => {
              const qty = ri.quantity != null ? String(ri.quantity) : null;
              const unit = ri.unit?.abbr ?? ri.unit?.name ?? null;
              return (
                <div
                  key={ri.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.875rem 1rem",
                    background: "#fff",
                    borderRadius: "0.75rem",
                    border: "1px solid #f1f5f9",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: "rgba(71,235,191,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#47ebbf" }}>restaurant</span>
                    </div>
                    <span style={{ fontWeight: 500, color: "#334155", fontSize: "0.9rem" }}>
                      {ri.ingredient.name}
                    </span>
                  </div>
                  {(qty || unit) && (
                    <span style={{ fontWeight: 700, color: "#47ebbf", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                      {qty}{unit ? ` ${unit}` : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Instructions */}
      <section style={{ marginBottom: "2rem" }}>
        <SectionTitle>Instructions</SectionTitle>
        {recipe.instructions ? (
          <div style={{
            background: "#fff",
            borderRadius: "0.75rem",
            border: "1px solid #f1f5f9",
            padding: "1.25rem",
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            fontSize: "0.9rem",
            color: "#475569",
          }}>
            {recipe.instructions}
          </div>
        ) : (
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", fontStyle: "italic" }}>Aucune instruction renseignée.</p>
        )}
      </section>

      {/* Notes */}
      {recipe.notes && (
        <section style={{ marginBottom: "2rem" }}>
          <SectionTitle>Notes</SectionTitle>
          <div style={{
            background: "rgba(71,235,191,0.06)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(71,235,191,0.2)",
            padding: "1.25rem",
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            fontSize: "0.9rem",
            color: "#475569",
          }}>
            {recipe.notes}
          </div>
        </section>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingBottom: "2rem" }}>
        <Link
          href={`/recipes/${id}/edit`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            background: "#47ebbf",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: "0.95rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            textDecoration: "none",
            boxShadow: "4px 4px 0 rgba(71,235,191,0.2)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>edit</span>
          Modifier la recette
        </Link>

        <RecipeActions id={id} householdId={HOUSEHOLD_ID} />
      </div>
    </main>
  );
}
