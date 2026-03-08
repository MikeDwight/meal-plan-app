import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Plan App",
  description: "Application de planification de repas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg-light text-slate-900 min-h-screen flex flex-col">
        <header className="hidden md:block sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-1.5 flex items-center justify-center">
                <span className="material-symbols-outlined text-bg-dark text-2xl">restaurant_menu</span>
              </div>
              <span className="text-xl font-bold tracking-tight">Meal Plan App</span>
            </div>
          </div>
          <nav className="max-w-4xl mx-auto px-4 overflow-x-auto">
            <div className="flex gap-6 border-t border-primary/5">
              <Link href="/" className="text-sm font-medium text-slate-500 hover:text-primary pb-2 pt-1 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-primary/40">Accueil</Link>
              <Link href="/week" className="text-sm font-medium text-slate-500 hover:text-primary pb-2 pt-1 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-primary/40">Semaine</Link>
              <Link href="/shopping" className="text-sm font-medium text-slate-500 hover:text-primary pb-2 pt-1 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-primary/40">Courses</Link>
              <Link href="/recipes" className="text-sm font-medium text-slate-500 hover:text-primary pb-2 pt-1 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-primary/40">Recettes</Link>
              <Link href="/pantry" className="text-sm font-medium text-slate-500 hover:text-primary pb-2 pt-1 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-primary/40">Garde-manger</Link>
              <Link href="/ingredients" className="text-sm font-medium text-slate-500 hover:text-primary pb-2 pt-1 whitespace-nowrap transition-colors border-b-2 border-transparent hover:border-primary/40">Ingrédients</Link>
            </div>
          </nav>
        </header>

        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {children}
        </div>

        <footer className="md:hidden sticky bottom-0 bg-white border-t border-primary/10 px-4 pb-6 pt-2">
          <div className="flex items-center justify-around max-w-lg mx-auto">
            <Link href="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">home</span>
              <span className="text-[10px] font-medium">Accueil</span>
            </Link>
            <Link href="/week" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">calendar_month</span>
              <span className="text-[10px] font-medium">Semaine</span>
            </Link>
            <Link href="/shopping" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
              <span className="text-[10px] font-medium">Courses</span>
            </Link>
            <Link href="/recipes" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">menu_book</span>
              <span className="text-[10px] font-medium">Recettes</span>
            </Link>
            <Link href="/pantry" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">more_horiz</span>
              <span className="text-[10px] font-medium">Plus</span>
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
