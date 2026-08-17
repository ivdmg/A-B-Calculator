import React, { useState } from "react"
import { HelpCircle } from "lucide-react"

interface TooltipProps {
  content: React.ReactNode
  children?: React.ReactNode
  title?: string
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, title }) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children ? (
        children
      ) : (
        <span className="text-muted-foreground hover:text-foreground transition-colors cursor-help p-0.5 inline-flex items-center">
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      )}

      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-2.5 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border border-border pointer-events-none animate-in fade-in-0 zoom-in-95">
          {title && <div className="font-semibold mb-1 text-foreground">{title}</div>}
          <div className="text-muted-foreground leading-relaxed">{content}</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
        </div>
      )}
    </div>
  )
}
