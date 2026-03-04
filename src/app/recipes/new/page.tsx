import Link from "next/link";
import { RecipeForm } from "./recipe-form";

export default function NewRecipePage() {
  return (
    <main>
      <Link href="/recipes" style={{ fontSize: "0.9rem" }}>
        ← Retour aux recettes
      </Link>
      <h1 style={{ marginTop: "0.5rem" }}>Nouvelle recette</h1>
      <RecipeForm />
    </main>
  );
}
