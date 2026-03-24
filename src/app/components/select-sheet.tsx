"use client";

import { useState, useRef, useEffect } from "react";

interface Item { id: string; label: string; }

interface SelectSheetProps {
  value: string;
  onChange: (v: string) => void;
  items: Item[];
  onSelect: (item: Item) => void;
  onCreate?: (label: string) => Promise<void>;
  onClose?: () => void;
  placeholder?: string;
  style?: React.CSSProperties;
  /** Ouvre immédiatement la sheet sans afficher de trigger (pattern badge → sheet) */
  autoOpen?: boolean;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export function SelectSheet({
  value,
  onChange,
  items,
  onSelect,
  onCreate,
  onClose,
  placeholder,
  style,
  autoOpen = false,
}: SelectSheetProps) {
  const isMobile = useIsMobile();
  const useSheet = isMobile || autoOpen;

  const [open, setOpen] = useState(autoOpen);
  const [search, setSearch] = useState(autoOpen ? value : "");
  const [creating, setCreating] = useState(false);
  const blurRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open && useSheet) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open, useSheet]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const filterTerm = useSheet ? search : value;
  const filtered = filterTerm.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(filterTerm.toLowerCase()))
    : items;
  const exactMatch = items.some((i) => i.label.toLowerCase() === filterTerm.trim().toLowerCase());
  const showCreate = onCreate && filterTerm.trim() && !exactMatch;

  function handleOpen() {
    setSearch(value);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  function handleSelect(item: Item) {
    onSelect(item);
    setOpen(false);
    setSearch("");
    onClose?.();
  }

  async function handleCreate() {
    const label = filterTerm.trim();
    setCreating(true);
    try {
      await onCreate!(label);
    } finally {
      setCreating(false);
      setOpen(false);
      setSearch("");
      onClose?.();
    }
  }

  // ── Bottom sheet (mobile ou autoOpen) ──────────────────────────────────────
  if (useSheet) {
    return (
      <>
        {/* Trigger visible uniquement en mode normal (pas autoOpen) */}
        {!autoOpen && (
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleOpen}
            readOnly={isMobile}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputMode={isMobile ? "none" as any : undefined}
            style={style}
          />
        )}

        {open && (
          <>
            <div
              onClick={handleClose}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }}
            />
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              background: "#fff",
              borderRadius: "1.25rem 1.25rem 0 0",
              padding: "0.75rem 1rem 2rem",
              zIndex: 201,
              maxHeight: "75vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
            }}>
              {/* Handle */}
              <div style={{ width: "2.5rem", height: "0.25rem", background: "#e2e8f0", borderRadius: "999px", margin: "0 auto 0.875rem" }} />

              {/* Champ de recherche */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder ?? "Rechercher…"}
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  fontSize: "1rem",
                  border: "1.5px solid #47ebbf",
                  borderRadius: "0.75rem",
                  outline: "none",
                  marginBottom: "0.75rem",
                  boxSizing: "border-box",
                }}
              />

              {/* Liste */}
              <div style={{ overflowY: "auto", flex: 1 }}>
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    style={{
                      display: "block", width: "100%",
                      padding: "0.9rem 0.5rem",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: 500,
                      color: "#0f172a",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                {showCreate && (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    style={{
                      display: "block", width: "100%",
                      padding: "0.9rem 0.5rem",
                      textAlign: "left",
                      background: "rgba(71,235,191,0.1)",
                      border: "none",
                      cursor: creating ? "wait" : "pointer",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#0f766e",
                    }}
                  >
                    {creating ? "Création…" : `Créer « ${search.trim()} »`}
                  </button>
                )}
                {filtered.length === 0 && !showCreate && (
                  <p style={{ padding: "1.5rem 0.5rem", color: "#94a3b8", textAlign: "center", fontSize: "0.9rem" }}>
                    Aucun résultat
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Dropdown inline (desktop) ───────────────────────────────────────────────
  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (blurRef.current) clearTimeout(blurRef.current); setOpen(true); }}
        onBlur={() => { blurRef.current = setTimeout(() => { setOpen(false); onClose?.(); }, 150); }}
        style={style}
      />
      {open && (filtered.length > 0 || showCreate) && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", border: "1px solid #ccc", borderTop: "none",
          borderRadius: "0 0 4px 4px", maxHeight: "180px", overflowY: "auto",
          zIndex: 20, boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}>
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(item); setOpen(false); onClose?.(); }}
              style={{ display: "block", width: "100%", padding: "0.45rem 0.6rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >
              {item.label}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              disabled={creating}
              style={{ display: "block", width: "100%", padding: "0.45rem 0.6rem", textAlign: "left", background: "#dbeafe", border: "none", borderTop: filtered.length ? "1px solid #e5e7eb" : "none", cursor: creating ? "wait" : "pointer", fontSize: "0.9rem", fontWeight: 500, color: "#1d4ed8" }}
              onMouseOver={(e) => { if (!creating) e.currentTarget.style.background = "#bfdbfe"; }}
              onMouseOut={(e) => { if (!creating) e.currentTarget.style.background = "#dbeafe"; }}
            >
              {creating ? "Création..." : `Créer « ${value.trim()} »`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
