"use client";

import { getSubjectSlotStyle, type SubjectSlot } from "@/lib/subjectSlot";

interface SubjectBadgeProps {
  name: string;
  slot: SubjectSlot;
  variant?: "default" | "dot";
  className?: string;
}

export function SubjectBadge({ name, slot, variant = "default", className }: SubjectBadgeProps) {
  const style = getSubjectSlotStyle(slot);

  if (variant === "dot") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${className ?? ""}`}
        style={{ color: style.color }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: style.accentColor }}
        />
        {name}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${className ?? ""}`}
      style={{
        backgroundColor: style.background,
        color: style.color,
        borderColor: style.borderColor,
      }}
    >
      {name}
    </span>
  );
}
