import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, digits: number = 2): string {
  if (num === null || num === undefined || isNaN(num)) return "N/A"
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  }).format(num)
}

export function formatPercent(val: number, digits: number = 2): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A"
  return `${(val * 100).toFixed(digits)}%`
}

export function formatPValue(pval: number): string {
  if (pval === null || pval === undefined || isNaN(pval)) return "N/A"
  if (pval < 0.0001) {
    return "< 0.0001"
  }
  return pval.toFixed(4)
}
