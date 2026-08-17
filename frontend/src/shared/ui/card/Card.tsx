import React from "react"
import { cn } from "../../lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm transition-all duration-200 hover:border-border",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight text-foreground text-base md:text-lg flex items-center gap-2", className)}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-xs md:text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

export const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-2", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-5 pt-0 border-t border-border/50 mt-4", className)}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"
