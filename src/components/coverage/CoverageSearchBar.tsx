"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

interface Props {
  query: string;
  onChange: (q: string) => void;
}

export function CoverageSearchBar({ query, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={ref}
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { onChange(""); ref.current?.blur(); } }}
        placeholder="Search by code or keyword…"
        aria-label="Search standards"
        className="w-full h-8 pl-8 pr-8 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
      />
      {query && (
        <button
          onClick={() => { onChange(""); ref.current?.focus(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
