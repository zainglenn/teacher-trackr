"use client";

import { PipelineSummary } from "@/hooks/useStandardPipeline";
import { PipelineEntry } from "@/hooks/useStandardPipeline";
import { Skeleton } from "@/components/ui/skeleton";

const STRAND_ORDER = ["RL", "RI", "W", "SL", "L"];
const STRAND_FULL: Record<string, string> = {
  RL: "Rdg Lit", RI: "Rdg Info", W: "Writing", SL: "Speaking", L: "Language",
};
const STRAND_ACCENT: Record<string, string> = {
  RL: "var(--strand-rl-accent)",
  RI: "var(--strand-ri-accent)",
  W:  "var(--strand-w-accent)",
  SL: "var(--strand-sl-accent)",
  L:  "var(--strand-l-accent)",
};

interface Props {
  summary: PipelineSummary;
  entries: PipelineEntry[];
  loading: boolean;
}

function pluralise(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? "s" : ""}`;
}

export function CoverageSummaryBar({ summary, entries, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-6 flex-wrap">
          {STRAND_ORDER.map((s) => <Skeleton key={s} className="h-4 w-28" />)}
        </div>
      </div>
    );
  }

  const { unmapped, planned, scheduled, taught, total } = summary;
  const segments = [
    { status: "unmapped",  count: unmapped,  bg: "var(--status-overdue-bg)",  label: "Not mapped" },
    { status: "planned",   count: planned,   bg: "var(--status-pending-bg)",  label: "In a unit" },
    { status: "scheduled", count: scheduled, bg: "var(--status-behind-bg)",   label: "Scheduled" },
    { status: "taught",    count: taught,    bg: "var(--status-taught-bg)",   label: "Taught" },
  ];

  // Per-strand taught counts
  const strandStats = STRAND_ORDER.map((strand) => {
    const strandEntries = entries.filter((e) => {
      const code = e.standard.strand?.toUpperCase() ?? e.standard.code.split(".")[0].toUpperCase();
      return code === strand;
    });
    const taughtCount = strandEntries.filter((e) => e.status === "taught").length;
    return { strand, taught: taughtCount, total: strandEntries.length };
  }).filter((s) => s.total > 0);

  const summaryParts: string[] = [];
  if (taught > 0) summaryParts.push(`${taught} taught`);
  if (scheduled > 0) summaryParts.push(`${scheduled} scheduled`);
  if (planned > 0) summaryParts.push(`${planned} in a unit`);
  if (unmapped > 0) summaryParts.push(`${unmapped} not mapped`);

  return (
    <div className="space-y-3">
      {/* Pipeline bar */}
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
        {segments.map(({ status, count, bg }) =>
          count > 0 ? (
            <div
              key={status}
              className="h-full transition-all duration-500"
              style={{ width: `${(count / total) * 100}%`, background: bg }}
              title={`${count} ${status}`}
            />
          ) : null
        )}
      </div>

      {/* Plain-language summary */}
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{taught} of {total}</span> standards taught
        {summaryParts.length > 1 && (
          <span className="text-muted-foreground"> · {unmapped > 0 ? <span style={{ color: "var(--status-overdue-text)" }}>{pluralise(unmapped, "standard")} not mapped</span> : null}</span>
        )}
      </p>

      {/* Per-strand mini bars */}
      {strandStats.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          {strandStats.map(({ strand, taught: t, total: tot }) => {
            const pct = tot > 0 ? Math.round((t / tot) * 100) : 0;
            return (
              <div key={strand} className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-semibold text-muted-foreground w-6 shrink-0">{strand}</span>
                <div className="relative h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: STRAND_ACCENT[strand] }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">{t}/{tot}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
