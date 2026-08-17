import React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "destructive" | "warning" | "neutral"
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  const variants = {
    default: "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-transparent",
    secondary: "bg-secondary text-secondary-foreground border-border",
    neutral: "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-border",
    outline: "border-border text-foreground bg-transparent",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    destructive: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
