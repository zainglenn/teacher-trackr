"use client";

export type ViewMode = "unit" | "strand";

interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center border border-border rounded-md overflow-hidden shrink-0">
      {(["unit", "strand"] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === m
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {m === "unit" ? "By Unit" : "By Strand"}
        </button>
      ))}
    </div>
  );
}
