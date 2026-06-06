"use client";

import { PipelineEntry } from "@/hooks/useStandardPipeline";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { StatusBadge } from "./StatusBadge";

interface Props {
  entry: PipelineEntry;
  onSelect: (entry: PipelineEntry) => void;
  query?: string;
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/15 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function StandardRow({ entry, onSelect, query = "" }: Props) {
  const { standard, status } = entry;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(entry); } }}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset group"
    >
      {/* Strand badge */}
      <div className="shrink-0">
        <StrandBadge code={standard.code} />
      </div>

      {/* Description */}
      <p className="flex-1 text-sm text-foreground leading-snug line-clamp-1 min-w-0">
        {highlight(standard.description, query)}
      </p>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge status={status} />
      </div>

      {/* Chevron hint */}
      <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}
