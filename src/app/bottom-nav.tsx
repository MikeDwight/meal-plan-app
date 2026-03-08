"use client";

import Link from "next/link";
import { useState } from "react";

export function BottomNav() {
  const [plusOpen, setPlusOpen] = useState(false);

  return (
    <>
      {plusOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setPlusOpen(false)} />
      )}

      {plusOpen && (
        <div className="fixed bottom-24 right-4 z-50 bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(71,235,191,0.15)" }}>
          <Link
            href="/pantry"
            onClick={() => setPlusOpen(false)}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-primary/5 transition-colors"
          >
            <span className="material-symbols-outlined text-xl" style={{ color: "#47ebbf" }}>inventory_2</span>
            <span className="text-sm font-medium text-slate-700">Garde-manger</span>
          </Link>
          <div className="border-t border-slate-100" />
          <Link
            href="/ingredients"
            onClick={() => setPlusOpen(false)}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-primary/5 transition-colors"
          >
            <span className="material-symbols-outlined text-xl" style={{ color: "#47ebbf" }}>grocery</span>
            <span className="text-sm font-medium text-slate-700">Articles</span>
          </Link>
        </div>
      )}

      <footer className="md:hidden sticky bottom-0 bg-white border-t border-primary/10 pb-6 pt-2 z-30">
        <div className="flex items-end justify-around max-w-lg mx-auto px-2">
          <Link href="/week" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors pb-1">
            <span className="material-symbols-outlined text-2xl">calendar_month</span>
            <span className="text-[10px] font-medium">Semaine</span>
          </Link>

          <Link href="/shopping" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors pb-1">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            <span className="text-[10px] font-medium">Courses</span>
          </Link>

          <Link href="/" className="flex flex-col items-center gap-1" style={{ marginTop: "-1.25rem" }}>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "#47ebbf", boxShadow: "0 4px 20px rgba(71,235,191,0.55)" }}
            >
              <span className="material-symbols-outlined text-3xl" style={{ color: "#0f172a" }}>home</span>
            </div>
            <span className="text-[10px] font-medium text-slate-400">Accueil</span>
          </Link>

          <Link href="/recipes" className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors pb-1">
            <span className="material-symbols-outlined text-2xl">menu_book</span>
            <span className="text-[10px] font-medium">Recettes</span>
          </Link>

          <button
            type="button"
            onClick={() => setPlusOpen(!plusOpen)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors bg-transparent border-none cursor-pointer pb-1"
          >
            <span className="material-symbols-outlined text-2xl">{plusOpen ? "close" : "more_horiz"}</span>
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        </div>
      </footer>
    </>
  );
}
