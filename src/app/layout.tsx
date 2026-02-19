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
      <body>{children}</body>
    </html>
  );
}
