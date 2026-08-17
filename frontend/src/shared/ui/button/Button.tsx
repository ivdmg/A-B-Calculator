import React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "success"
  size?: "default" | "sm" | "lg" | "icon"
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98] cursor-pointer"

    const variants = {
      default: "bg-neutral-900 text-neutral-100 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-sm",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      outline: "border border-border bg-background shadow-sm hover:bg-secondary hover:text-foreground",
      ghost: "hover:bg-secondary hover:text-foreground",
      destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
      success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
    }

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-10 rounded-md px-6 text-base",
      icon: "h-9 w-9",
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Расчет...
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"
