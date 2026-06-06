"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PipelineEntry } from "@/hooks/useStandardPipeline";
import { Standard } from "@/types";
import { StrandBadge } from "@/components/ltp/StrandBadge";
import { StatusBadge } from "./StatusBadge";

const STRAND_FULL: Record<string, string> = {
  RL: "Reading Literature",
  RI: "Reading Informational Text",
  W:  "Writing",
  SL: "Speaking & Listening",
  L:  "Language",
};

function getStrandCode(standard: Standard): string {
  return standard.strand?.toUpperCase() ?? standard.code.split(".")[0].toUpperCase();
}

function statusExplanation(entry: PipelineEntry): string {
  if (entry.status === "taught") {
    return entry.unitTitle
      ? `Taught in ${entry.unitTitle}${entry.taughtWeekNumber ? ` · Week ${entry.taughtWeekNumber}` : ""}`
      : "Marked as taught";
  }
  if (entry.status === "scheduled") {
    return entry.unitTitle
      ? `In ${entry.unitTitle} · Scheduled from Week ${entry.startWeek}`
      : `Scheduled from Week ${entry.startWeek}`;
  }
  if (entry.status === "planned") {
    return entry.unitTitle ? `In ${entry.unitTitle} · Not yet scheduled` : "In a unit, not yet scheduled";
  }
  return "Not mapped to any unit";
}

function buildGradeProgression(standard: Standard, allStandards: Standard[]) {
  // Parse grade from code: RL.6.1 → grade 6, code prefix RL, suffix 1
  const code = standard.code;
  const match = code.match(/^([A-Z.]+)\.(\d+)\.(.+)$/);
  if (!match) return null;

  const [, prefix, gradeStr, suffix] = match;
  const grade = parseInt(gradeStr, 10);

  const prevCode = `${prefix}.${grade - 1}.${suffix}`;
  const nextCode = `${prefix}.${grade + 1}.${suffix}`;

  const prev = allStandards.find((s) => s.code === prevCode);
  const next = allStandards.find((s) => s.code === nextCode);

  return { prevCode, nextCode, prev, next, currentCode: code, grade };
}

interface Props {
  entry: PipelineEntry | null;
  allStandards: Standard[];
  open: boolean;
  onClose: () => void;
}

export function StandardDetailSheet({ entry, allStandards, open, onClose }: Props) {
  if (!entry) return null;
  const { standard, status } = entry;
  const strandCode = getStrandCode(standard);
  const progression = buildGradeProgression(standard, allStandards);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[440px] overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div>
              <SheetTitle className="text-2xl font-semibold tracking-tight leading-none mb-1.5">
                {standard.code}
              </SheetTitle>
              <div className="flex items-center gap-2">
                <StrandBadge code={standard.code} />
                <span className="text-xs text-muted-foreground">{STRAND_FULL[strandCode] ?? strandCode}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
          {/* Full description */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Standard</p>
            <p className="text-sm text-foreground leading-relaxed">{standard.description}</p>
          </section>

          {/* Status */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Status</p>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} size="md" />
              <span className="text-sm text-muted-foreground">{statusExplanation(entry)}</span>
            </div>
          </section>

          {/* Grade progression */}
          {progression && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Grade progression</p>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {/* Grade N-1 */}
                <div className="flex items-start gap-3 px-4 py-3 bg-background">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground shrink-0 mt-0.5 w-16">
                    {progression.prevCode}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1 min-w-0">
                    {progression.prev
                      ? progression.prev.description
                      : <span className="italic opacity-60">Grade {progression.grade - 1} standard</span>
                    }
                  </p>
                </div>

                {/* Current grade — highlighted */}
                <div className="flex items-start gap-3 px-4 py-3 border-l-2 bg-muted/30" style={{ borderLeftColor: "var(--primary)" }}>
                  <span className="text-[11px] font-mono font-semibold shrink-0 mt-0.5 w-16" style={{ color: "var(--primary)" }}>
                    {progression.currentCode}
                  </span>
                  <p className="text-xs text-foreground leading-relaxed font-medium flex-1 min-w-0">
                    {standard.description}
                  </p>
                </div>

                {/* Grade N+1 */}
                <div className="flex items-start gap-3 px-4 py-3 bg-background">
                  <span className="text-[11px] font-mono font-semibold text-muted-foreground shrink-0 mt-0.5 w-16">
                    {progression.nextCode}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1 min-w-0">
                    {progression.next
                      ? progression.next.description
                      : <span className="italic opacity-60">Grade {progression.grade + 1} standard</span>
                    }
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
