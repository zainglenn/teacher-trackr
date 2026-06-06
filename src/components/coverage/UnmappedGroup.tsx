"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { PipelineEntry } from "@/hooks/useStandardPipeline";
import { StandardRow } from "./StandardRow";

interface Props {
  entries: PipelineEntry[];
  onSelect: (entry: PipelineEntry) => void;
  query?: string;
}

export function UnmappedGroup({ entries, onSelect, query = "" }: Props) {
  // Always start collapsed — gaps are contextual, not the first thing a teacher sees
  const [expanded, setExpanded] = useState(false);

  const filtered = query
    ? entries.filter((e) =>
        e.standard.code.toLowerCase().includes(query.toLowerCase()) ||
        e.standard.description.toLowerCase().includes(query.toLowerCase())
      )
    : entries;

  // If searching and no unmapped match query — hide entirely
  if (query && filtered.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-semibold text-foreground flex-1">Not mapped</span>
        {entries.length > 0 ? (
          <span
            className="text-[11px] font-semibold px-1.5 py-0.5 rounded border tabular-nums"
            style={{
              background: "var(--status-overdue-bg)",
              color: "var(--status-overdue-text)",
              borderColor: "var(--status-overdue-border)",
            }}
          >
            {entries.length}
          </span>
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--status-taught-text)" }} />
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-border/50">
          {entries.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--status-taught-text)" }} />
              <p className="text-sm" style={{ color: "var(--status-taught-text)" }}>All standards are mapped.</p>
            </div>
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
