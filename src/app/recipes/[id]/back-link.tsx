"use client";

import { useRouter } from "next/navigation";

export function BackLink({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
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
    </a>
  );
}
