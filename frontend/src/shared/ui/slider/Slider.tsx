import React from "react"
import { cn } from "../../lib/utils"

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  valueDisplay?: string | number
  unit?: string
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  valueDisplay,
  unit,
  className,
  disabled
}) => {
  const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100)

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {(label || valueDisplay !== undefined) && (
        <div className="flex items-center justify-between text-xs font-medium">
          {label && <span className="text-muted-foreground">{label}</span>}
          <span className="font-semibold text-foreground bg-secondary px-2 py-0.5 rounded border border-border">
            {valueDisplay !== undefined ? valueDisplay : value}
            {unit && <span className="text-muted-foreground ml-0.5 font-normal">{unit}</span>}
          </span>
        </div>
      )}
      <div className="relative flex items-center select-none touch-none w-full">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={cn(
            "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-neutral-800 dark:accent-neutral-200 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          style={{
            background: `linear-gradient(to right, currentColor 0%, currentColor ${percentage}%, hsl(var(--secondary)) ${percentage}%, hsl(var(--secondary)) 100%)`
          }}
        />
      </div>
    </div>
  )
}
