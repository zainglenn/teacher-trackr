"use client";

import { GradeLevel } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GradeFilterProps {
  grades: GradeLevel[];
  activeGradeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function GradeFilter({ grades, activeGradeId, onChange, className }: GradeFilterProps) {
  if (grades.length === 0) return null;

  return (
    <>
      {/* Desktop: tab row */}
      <div
        role="tablist"
        aria-label="Filter by grade level"
        className={`hidden sm:flex items-center gap-0.5 ${className ?? ""}`}
      >
        {grades.map((g) => {
          const isActive = g.id === activeGradeId;
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(g.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50
                ${isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {/* Mobile: select dropdown */}
      <div className="sm:hidden">
        <Select value={activeGradeId} onValueChange={(v) => v && onChange(v)}>
          <SelectTrigger className="h-8 text-sm w-40" aria-label="Filter by grade level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
