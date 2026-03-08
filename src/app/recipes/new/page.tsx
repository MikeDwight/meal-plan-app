import Link from "next/link";
import { RecipeForm } from "./recipe-form";

export default function NewRecipePage() {
  return (
    <main style={{ maxWidth: "42rem", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <Link
          href="/recipes"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.25rem",
            height: "2.25rem",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            textDecoration: "none",
            color: "#475569",
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.2rem" }}>arrow_back</span>
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Nouvelle recette</h1>
      </div>
      <RecipeForm />
    </main>
  );
}
