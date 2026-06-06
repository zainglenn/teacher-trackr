"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PipelineEntry } from "@/hooks/useStandardPipeline";
import { StandardRow } from "./StandardRow";

const STRAND_ORDER = ["RL", "RI", "W", "SL", "L"];
const TERM_ACCENT: Record<number, string> = {
  1: "var(--term-1-accent)",
  2: "var(--term-2-accent)",
  3: "var(--term-3-accent)",
};

function termFromStartWeek(startWeek: number | null): number | null {
  if (!startWeek) return null;
  if (startWeek <= 12) return 1;
  if (startWeek <= 24) return 2;
  return 3;
}

function sortByStrand(entries: PipelineEntry[]): PipelineEntry[] {
  return [...entries].sort((a, b) => {
    const strandA = STRAND_ORDER.indexOf(a.standard.strand?.toUpperCase() ?? a.standard.code.split(".")[0]);
    const strandB = STRAND_ORDER.indexOf(b.standard.strand?.toUpperCase() ?? b.standard.code.split(".")[0]);
    if (strandA !== strandB) return strandA - strandB;
    return a.standard.code.localeCompare(b.standard.code);
  });
}

interface Props {
  unitId: string;
  unitNumber: number;
  unitTitle: string;
  entries: PipelineEntry[];
  onSelect: (entry: PipelineEntry) => void;
  query?: string;
  defaultExpanded?: boolean;
}

export function UnitCoverageGroup({ unitNumber, unitTitle, entries, onSelect, query = "", defaultExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const sorted = sortByStrand(entries);
  const term = termFromStartWeek(entries[0]?.startWeek ?? null);
  const taught = entries.filter((e) => e.status === "taught").length;
  const accentColor = term ? TERM_ACCENT[term] : "var(--border)";

  // Filter by query
  const filtered = query
    ? sorted.filter((e) =>
        e.standard.code.toLowerCase().includes(query.toLowerCase()) ||
        e.standard.description.toLowerCase().includes(query.toLowerCase())
      )
    : sorted;

  const showEmpty = query && filtered.length === 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden" style={{ borderLeftColor: accentColor, borderLeftWidth: "3px" }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-semibold text-foreground flex-1 truncate">
          Unit {unitNumber}: {unitTitle}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {query && filtered.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
              {filtered.length} match{filtered.length !== 1 ? "es" : ""}
            </span>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {taught}/{entries.length} taught
          </span>
          {term && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
              style={{ color: accentColor, borderColor: accentColor, background: `color-mix(in srgb, ${accentColor} 10%, transparent)` }}>
              T{term}
            </span>
          )}
        </div>
      </button>

      {/* Rows */}
      {expanded && (
        <div className="divide-y divide-border/50">
          {showEmpty ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No matches in this unit.</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground italic">No standards mapped to this unit yet.</p>
          ) : (
            filtered.map((e) => (
              <StandardRow key={e.standard.id} entry={e} onSelect={onSelect} query={query} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
