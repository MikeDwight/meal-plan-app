import Link from "next/link";

const cards = [
  {
    href: "/week",
    label: "Semaine",
    desc: "Organisez votre planning de repas hebdomadaire et gérez vos menus.",
    cta: "Planifier maintenant",
    icon: "calendar_month",
    bgIcon: "event_note",
    iconBg: "#e0fdf5",
    iconColor: "text-primary",
  },
  {
    href: "/shopping",
    label: "Courses",
    desc: "Consultez votre liste de courses intelligente basée sur votre planning.",
    cta: "Voir la liste",
    icon: "shopping_cart",
    bgIcon: "receipt_long",
    iconBg: "#fff9e6",
    iconColor: "text-yellow-500",
  },
  {
    href: "/recipes",
    label: "Recettes",
    desc: "Parcourez votre collection de recettes et ajoutez-en de nouvelles.",
    cta: "Parcourir",
    icon: "menu_book",
    bgIcon: "skillet",
    iconBg: "#f0e7ff",
    iconColor: "text-purple-500",
  },
  {
    href: "/pantry",
    label: "Garde-manger",
    desc: "Gérez votre stock actuel pour ne jamais manquer d'essentiels.",
    cta: "Vérifier le stock",
    icon: "inventory_2",
    bgIcon: "kitchen",
    iconBg: "#ffede6",
    iconColor: "text-orange-500",
  },
];

export default function Home() {
  return (
    <main>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Bonjour !</h2>
        <p className="text-slate-500 mt-1 text-lg">Que voulez-vous faire aujourd&apos;hui ?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(({ href, label, desc, cta, icon, bgIcon, iconBg, iconColor }) => (
          <Link
            key={href}
            href={href}
            className="group relative flex flex-col bg-white rounded-xl p-6 border border-primary/5 hover:border-primary/40 transition-all duration-300"
            style={{ boxShadow: "0 4px 20px -2px rgba(71, 235, 191, 0.1)" }}
          >
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
              style={{ background: iconBg }}
            >
              <span className={`material-symbols-outlined ${iconColor} text-3xl`}>{icon}</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{label}</h3>
            <p className="text-slate-500 text-sm mb-4">{desc}</p>
            <div className="mt-auto flex items-center text-primary font-semibold text-sm">
              {cta}
              <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">arrow_forward</span>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none overflow-hidden rounded-xl">
              <span className="material-symbols-outlined text-[120px]">{bgIcon}</span>
            </div>
          </Link>
        ))}

        {/* Ingrédients — large card */}
        <Link
          href="/ingredients"
          className="group relative flex flex-col bg-white rounded-xl p-6 border border-primary/5 hover:border-primary/40 transition-all duration-300 lg:col-span-2"
          style={{ boxShadow: "0 4px 20px -2px rgba(71, 235, 191, 0.1)" }}
        >
          <div className="flex items-start md:items-center flex-col md:flex-row gap-6">
            <div className="w-14 h-14 shrink-0 rounded-lg bg-[#e6f4ff] flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-blue-500 text-3xl">database</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Ingrédients</h3>
              <p className="text-slate-500 text-sm mb-4">Gérez la base de données des ingrédients, les rayons et les unités par défaut.</p>
              <div className="flex items-center text-primary font-semibold text-sm">
                Gérer les paramètres
                <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">arrow_forward</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none overflow-hidden rounded-xl">
            <span className="material-symbols-outlined text-[120px]">settings</span>
          </div>
        </Link>
      </div>
    </main>
  );
}
