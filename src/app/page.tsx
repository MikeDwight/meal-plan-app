import Link from "next/link";

const links = [
  { href: "/week", label: "Semaine", desc: "Planning de repas hebdomadaire" },
  { href: "/shopping", label: "Courses", desc: "Liste de courses de la semaine" },
  { href: "/recipes", label: "Recettes", desc: "Parcourir et gérer les recettes" },
  { href: "/pantry", label: "Garde-manger", desc: "Stock disponible à la maison" },
  { href: "/ingredients", label: "Ingrédients", desc: "Gérer les rayons et unités par défaut" },
];

export default function Home() {
  return (
    <main>
      <h1 style={{ marginBottom: "0.25rem" }}>Meal Plan App</h1>
      <p style={{ color: "#666", marginBottom: "2rem" }}>Que voulez-vous faire ?</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
        {links.map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "block",
              padding: "1.25rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s",
            }}
  
          >
            <div style={{ fontWeight: 600, fontSize: "1.05rem", marginBottom: "0.3rem" }}>{label}</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
