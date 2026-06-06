"use client";

import { BenchmarkSnapshot } from "@/types";
import { AttainmentStats } from "@/hooks/useAttainmentGrid";

const STRANDS = ["RL", "RI", "W", "SL", "L"];
const STRAND_LABELS: Record<string, string> = {
  RL: "Reading Lit.", RI: "Reading Info.", W: "Writing", SL: "Speaking", L: "Language",
};
const STRAND_ACCENT: Record<string, string> = {
  RL: "var(--strand-rl-accent)", RI: "var(--strand-ri-accent)",
  W: "var(--strand-w-accent)", SL: "var(--strand-sl-accent)", L: "var(--strand-l-accent)",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function delta(after: number, before: number) {
  const diff = Math.round(after - before);
  if (diff === 0) return <span className="text-muted-foreground text-xs">—</span>;
  const pos = diff > 0;
  return (
    <span className={`text-xs font-semibold ${pos ? "text-[var(--status-taught-text)]" : "text-[var(--status-overdue-text)]"}`}>
      {pos ? "+" : ""}{diff} pp
    </span>
  );
}

interface Props {
  snapshots: BenchmarkSnapshot[];
  currentGrid: Map<string, Map<string, AttainmentStats>>;
}

export function BenchmarkComparisonPanel({ snapshots, currentGrid }: Props) {
  if (snapshots.length < 2) return null;

  const baseline = snapshots[0];
  const latest = snapshots[snapshots.length - 1];

  // Compute current averages from grid for comparison
  function currentAvg(strand: string): number {
    let total = 0, sum = 0;
    for (const strandMap of currentGrid.values()) {
      const s = strandMap.get(strand);
      if (s && s.total > 0) { sum += s.pct; total++; }
    }
    return total > 0 ? Math.round(sum / total) : 0;
  }

  return (
    <div className="mt-6 border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Benchmark Comparison</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-2 rounded-sm opacity-40 bg-foreground" />
            Baseline ({formatDate(baseline.snapshot_date)})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-2 rounded-sm bg-foreground" />
            Current
          </span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {STRANDS.map((strand) => {
          const baseVal = baseline.strand_averages[strand] ?? 0;
          const currVal = currentAvg(strand);
          return (
            <div key={strand} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{STRAND_LABELS[strand]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{Math.round(baseVal)}% → {currVal}%</span>
                  {delta(currVal, baseVal)}
                </div>
              </div>
              <div className="relative h-5 rounded bg-muted overflow-hidden">
                {/* baseline bar (faded) */}
                <div
                  className="absolute top-1 bottom-1 left-0 rounded-sm opacity-30"
                  style={{ width: `${Math.min(baseVal, 100)}%`, background: STRAND_ACCENT[strand] }}
                />
                {/* current bar */}
                <div
                  className="absolute top-1 bottom-1 left-0 rounded-sm transition-all duration-500"
                  style={{ width: `${Math.min(currVal, 100)}%`, background: STRAND_ACCENT[strand] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {snapshots.length > 2 && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          {snapshots.length} snapshots total — showing baseline vs. current.
        </p>
      )}
    </div>
  );
}
