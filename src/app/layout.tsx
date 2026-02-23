import Link from "next/link";

export const metadata = {
  title: "Meal Plan App",
  description: "Application de planification de repas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <nav style={{ padding: "1rem", borderBottom: "1px solid #ddd", display: "flex", gap: "1.5rem" }}>
          <Link href="/">Accueil</Link>
          <Link href="/week">Semaine</Link>
          <Link href="/shopping">Courses</Link>
          <Link href="/recipes">Recettes</Link>
        </nav>
        <div style={{ padding: "1rem" }}>{children}</div>
      </body>
    </html>
  );
}
