import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "../../lib/utils"

export interface SelectOption {
  value: string | number
  label: string
}

export interface SelectProps {
  label?: string
  value?: string | number
  onChange?: (e: { target: { value: string } }) => void
  onValueChange?: (value: string) => void
  options: SelectOption[]
  helperText?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  onValueChange,
  options,
  helperText,
  placeholder = "Выберите значение...",
  disabled = false,
  className,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => String(opt.value) === String(value))

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (optValue: string | number) => {
    const strVal = String(optValue)
    if (onChange) {
      onChange({ target: { value: strVal } } as any)
    }
    if (onValueChange) {
      onValueChange(strVal)
    }
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={cn("space-y-1.5 w-full relative", className)} id={id}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground block select-none">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm transition-all hover:bg-secondary/70 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer select-none text-left",
          isOpen && "ring-1 ring-ring border-neutral-400 dark:border-neutral-500 bg-secondary/40"
        )}
      >
        <span className={cn("truncate font-medium", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-2",
            isOpen && "transform rotate-180 text-foreground"
          )}
        />
      </button>

      {/* Custom Popup Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-xs text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in-0 zoom-in-95">
          {options.length === 0 ? (
            <div className="py-2 px-3 text-center text-muted-foreground">
              Нет доступных вариантов
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <div
                  key={String(opt.value)}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors hover:bg-secondary hover:text-foreground",
                    isSelected && "bg-secondary font-semibold text-foreground"
                  )}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-muted-foreground select-none">{helperText}</p>
      )}
    </div>
  )
}
