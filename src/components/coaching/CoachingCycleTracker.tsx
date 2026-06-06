"use client";

import { CoachingCycle, CoachingStep } from "@/types";
import { Button } from "@/components/ui/button";
import { Check, Circle, RotateCcw } from "lucide-react";

const STEPS: { key: CoachingStep; label: string }[] = [
  { key: "observe",  label: "Observe"  },
  { key: "debrief",  label: "Debrief"  },
  { key: "model",    label: "Model"    },
  { key: "reflect",  label: "Reflect"  },
];

interface Props {
  cycle: CoachingCycle | null;
  onCompleteStep: (step: CoachingStep) => Promise<void>;
  onOpenCycle: () => Promise<void>;
}

export function CoachingCycleTracker({ cycle, onCompleteStep, onOpenCycle }: Props) {
  const completed = new Set(cycle?.steps_completed ?? []);
  const nextStep = STEPS.find((s) => !completed.has(s.key)) ?? null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Coaching Cycle</h3>

      {!cycle ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-sm text-muted-foreground">No active coaching cycle for this teacher.</p>
          <Button size="sm" className="gap-1.5" onClick={onOpenCycle}>
            <RotateCcw className="h-3.5 w-3.5" /> Open Cycle
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Step track */}
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => {
              const done = completed.has(step.key);
              const isNext = nextStep?.key === step.key;
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                        done
                          ? "border-[var(--status-taught-text)] bg-[var(--status-taught-bg)]"
                          : isNext
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background"
                      }`}
                    >
                      {done
                        ? <Check className="h-4 w-4" style={{ color: "var(--status-taught-text)" }} />
                        : <Circle className={`h-3.5 w-3.5 ${isNext ? "text-primary" : "text-muted-foreground"}`} />
                      }
                    </div>
                    <span className={`text-[11px] font-medium ${done ? "text-[var(--status-taught-text)]" : isNext ? "text-primary" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 mx-1 -mt-5 ${done ? "bg-[var(--status-taught-border)]" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Action */}
          {nextStep && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Step {completed.size + 1} of {STEPS.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => onCompleteStep(nextStep.key)}
              >
                Complete: {nextStep.label}
              </Button>
            </div>
          )}

          {completed.size === STEPS.length && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium" style={{ color: "var(--status-taught-text)" }}>
                Cycle complete
              </span>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={onOpenCycle}>
                <RotateCcw className="h-3 w-3" /> New Cycle
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
