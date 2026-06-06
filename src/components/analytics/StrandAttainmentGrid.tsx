"use client";

import { AttainmentStats } from "@/hooks/useAttainmentGrid";
import { Skeleton } from "@/components/ui/skeleton";

const STRANDS = ["RL", "RI", "W", "SL", "L"];
const STRAND_LABELS: Record<string, string> = {
  RL: "Rdg Lit",
  RI: "Rdg Info",
  W: "Writing",
  SL: "Speaking",
  L: "Language",
};

const STRAND_VARS: Record<string, { text: string; border: string }> = {
  RL: { text: "var(--strand-rl-text)", border: "var(--strand-rl-border)" },
  RI: { text: "var(--strand-ri-text)", border: "var(--strand-ri-border)" },
  W:  { text: "var(--strand-w-text)",  border: "var(--strand-w-border)"  },
  SL: { text: "var(--strand-sl-text)", border: "var(--strand-sl-border)" },
  L:  { text: "var(--strand-l-text)",  border: "var(--strand-l-border)"  },
};

function cellStyle(stats: AttainmentStats | undefined): React.CSSProperties {
  if (!stats || stats.total === 0) {
    return {
      background: "var(--status-pending-bg)",
      color: "var(--status-pending-text)",
    };
  }
  const { pct } = stats;
  if (pct >= 80) return { background: "var(--status-taught-bg)", color: "var(--status-taught-text)" };
  if (pct >= 40) return { background: "var(--status-behind-bg)", color: "var(--status-behind-text)" };
  return { background: "var(--status-overdue-bg)", color: "var(--status-overdue-text)" };
}

interface Props {
  grid: Map<string, Map<string, AttainmentStats>>;
  classNames: Map<string, string>;
  loading: boolean;
  onCellClick: (classId: string, strand: string) => void;
}

export function StrandAttainmentGrid({ grid, classNames, loading, onCellClick }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (grid.size === 0) {
    return (
      <div className="overflow-x-auto opacity-40 pointer-events-none select-none" aria-hidden="true">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2.5 pr-4 pl-1 text-xs font-medium text-muted-foreground w-40">Class</th>
              {STRANDS.map((strand) => (
                <th key={strand} className="py-2.5 px-2 text-center min-w-[100px]">
                  <span
                    className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-semibold border"
                    style={{
                      background: `var(--strand-${strand.toLowerCase()}-bg)`,
                      color: STRAND_VARS[strand].text,
                      borderColor: STRAND_VARS[strand].border,
                    }}
                  >
                    {STRAND_LABELS[strand]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["Class A", "Class B", "Class C"].map((name) => (
              <tr key={name} className="border-t border-border/50">
                <td className="py-2.5 pr-4 pl-1 font-medium text-foreground">{name}</td>
                {STRANDS.map((strand) => (
                  <td key={strand} className="py-2 px-2 text-center">
                    <div className="w-full rounded-md py-2 px-3 font-semibold text-sm bg-muted text-muted-foreground">—</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-center text-muted-foreground mt-3">
          Add student attainment in Student Progress — this grid will populate automatically.
        </p>
      </div>
    );
  }

  const classIds = [...classNames.keys()].sort((a, b) =>
    (classNames.get(a) ?? "").localeCompare(classNames.get(b) ?? "")
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2.5 pr-4 pl-1 text-xs font-medium text-muted-foreground w-40">Class</th>
            {STRANDS.map((strand) => (
              <th key={strand} className="py-2.5 px-2 text-center min-w-[100px]">
                <span
                  className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-semibold border"
                  style={{
                    background: `var(--strand-${strand.toLowerCase()}-bg)`,
                    color: STRAND_VARS[strand].text,
                    borderColor: STRAND_VARS[strand].border,
                  }}
                >
                  {STRAND_LABELS[strand]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {classIds.map((classId) => {
            const strandMap = grid.get(classId);
            return (
              <tr key={classId} className="border-t border-border/50 hover:bg-muted/20">
                <td className="py-2.5 pr-4 pl-1 font-medium text-foreground truncate max-w-[160px]">
                  {classNames.get(classId) ?? "—"}
                </td>
                {STRANDS.map((strand) => {
                  const stats = strandMap?.get(strand);
                  const style = cellStyle(stats);
                  const pct = stats?.total ? stats.pct : null;
                  return (
                    <td key={strand} className="py-2 px-2 text-center">
                      <button
                        onClick={() => onCellClick(classId, strand)}
                        className="w-full rounded-md py-2 px-3 font-semibold text-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        style={style}
                        title={stats ? `${stats.meeting + stats.exceeding} of ${stats.total} students meeting/exceeding` : "No data"}
                      >
                        {pct !== null ? `${pct}%` : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
