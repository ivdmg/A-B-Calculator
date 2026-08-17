import React from "react"
import { cn } from "../../lib/utils"

interface TabsContextType {
  activeTab: string
  setActiveTab: (val: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

export interface TabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className
}) => {
  const [currentTab, setCurrentTab] = React.useState(defaultValue)

  const activeTab = value !== undefined ? value : currentTab
  const setActiveTab = (val: string) => {
    setCurrentTab(val)
    onValueChange?.(val)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-secondary/80 p-0.5 text-muted-foreground border border-border/70 backdrop-blur-sm overflow-hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  icon?: React.ReactNode
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  icon,
  className,
  children,
  ...props
}) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")

  const isActive = context.activeTab === value

  return (
    <button
      type="button"
      data-tab-value={value}
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer h-7",
        isActive
          ? "bg-card text-foreground shadow-sm font-semibold border border-border/60"
          : "hover:bg-background/40 hover:text-foreground",
        className
      )}
      {...props}
    >
      {icon && <span className="w-3.5 h-3.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className,
  children,
  ...props
}) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")

  if (context.activeTab !== value) return null

  return (
    <div
      className={cn(
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 animate-in fade-in-50 duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
