"use client";

import { useState, useRef } from "react";

interface Item { id: string; label: string; }

interface FieldAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  items: Item[];
  onSelect: (item: Item) => void;
  onCreate: (label: string) => Promise<void>;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function FieldAutocomplete({
  value,
  onChange,
  items,
  onSelect,
  onCreate,
  placeholder,
  style,
}: FieldAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const blurRef = useRef<NodeJS.Timeout | null>(null);

  const filtered = value.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(value.toLowerCase()))
    : items;

  const exactMatch = items.some(
    (i) => i.label.toLowerCase() === value.trim().toLowerCase()
  );
  const showCreate = value.trim() && !exactMatch;

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreate(value.trim());
    } finally {
      setCreating(false);
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (blurRef.current) clearTimeout(blurRef.current); setOpen(true); }}
        onBlur={() => { blurRef.current = setTimeout(() => setOpen(false), 150); }}
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
              onClick={() => { onSelect(item); setOpen(false); }}
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
