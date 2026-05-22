import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns school years in "YYYY-YY" format, starting from the previous calendar year
// e.g. called in 2026 → ["2025-26", "2026-27", "2027-28", "2028-29"]
export function schoolYears(count = 4): string[] {
  const y = new Date().getFullYear()
  return Array.from({ length: count }, (_, i) => {
    const start = y - 1 + i
    return `${start}-${String(start + 1).slice(-2)}`
  })
}
