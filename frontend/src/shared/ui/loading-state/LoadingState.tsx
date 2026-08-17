import React from "react"
import { Loader2 } from "lucide-react"

export interface LoadingStateProps {
  title?: string
  description?: string
  skeletonType?: "cards_chart" | "table" | "simple"
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = "Выполняются статистические расчеты...",
  description = "Пожалуйста, подождите. Генерация выборок и векторизованный анализ выполняются на бэкенде.",
  skeletonType = "cards_chart"
}) => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Central Spinner & Status */}
      <div className="flex flex-col items-center justify-center p-8 bg-card rounded-xl border border-border text-center space-y-3">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-foreground opacity-80" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground max-w-md">{description}</p>
        </div>
      </div>

      {/* Skeletons */}
      {skeletonType === "cards_chart" && (
        <div className="space-y-6">
          {/* Skeleton KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-card rounded-xl border border-border space-y-2.5">
                <div className="h-3 w-16 bg-secondary rounded" />
                <div className="h-7 w-24 bg-secondary rounded" />
                <div className="h-2.5 w-28 bg-secondary rounded" />
              </div>
            ))}
          </div>

          {/* Skeleton Chart Card */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="h-4 w-48 bg-secondary rounded" />
                <div className="h-3 w-72 bg-secondary rounded" />
              </div>
              <div className="h-6 w-20 bg-secondary rounded-full" />
            </div>
            <div className="h-64 w-full bg-secondary/50 rounded-lg flex items-end justify-between p-4 gap-2">
              {[40, 65, 50, 80, 55, 70, 90, 60, 75, 45, 85, 60, 70, 50, 65, 80, 55, 75, 60, 70].map((h, idx) => (
                <div
                  key={idx}
                  className="bg-secondary flex-1 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {skeletonType === "table" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="h-3 w-24 bg-secondary rounded" />
              <div className="h-8 w-32 bg-secondary rounded" />
            </div>
            <div className="h-28 bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="h-3 w-24 bg-secondary rounded" />
              <div className="h-8 w-32 bg-secondary rounded" />
            </div>
          </div>
          <div className="h-48 bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="h-4 w-36 bg-secondary rounded" />
            <div className="h-8 w-full bg-secondary/60 rounded" />
            <div className="h-8 w-full bg-secondary/40 rounded" />
            <div className="h-8 w-full bg-secondary/20 rounded" />
          </div>
        </div>
      )}
    </div>
  )
}
