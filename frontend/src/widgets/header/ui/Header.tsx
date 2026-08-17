import React from "react"
import {
  Calculator,
  ShieldCheck,
  FlaskConical,
  FileSpreadsheet,
  Moon,
  Sun
} from "lucide-react"
import { TabsList, TabsTrigger } from "../../../shared/ui"

interface HeaderProps {
  darkMode: boolean
  setDarkMode: (val: boolean) => void
}

export const Header: React.FC<HeaderProps> = ({ darkMode, setDarkMode }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-1.5 md:p-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 shadow-sm">
            <Calculator className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="font-bold text-base md:text-lg tracking-tight text-foreground whitespace-nowrap">
            A/B calculator
          </span>
        </div>

        {/* Center Tabs Navigation */}
        <div className="flex items-center justify-center overflow-hidden">
          <TabsList className="h-9 bg-secondary/70 border-border/80 p-0.5">
            <TabsTrigger value="calculator" icon={<Calculator className="w-3.5 h-3.5" />}>
              <span className="hidden sm:inline">Размер выборки & MDE</span>
              <span className="sm:hidden">Выборка</span>
            </TabsTrigger>
            <TabsTrigger value="aa_calibration" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              <span className="hidden sm:inline">A/A Калибровка</span>
              <span className="sm:hidden">A/A</span>
            </TabsTrigger>
            <TabsTrigger value="ab_playground" icon={<FlaskConical className="w-3.5 h-3.5" />}>
              <span className="hidden sm:inline">A/B Симулятор</span>
              <span className="sm:hidden">A/B</span>
            </TabsTrigger>
            <TabsTrigger value="custom_data" icon={<FileSpreadsheet className="w-3.5 h-3.5" />}>
              <span className="hidden sm:inline">Анализ CSV</span>
              <span className="sm:hidden">CSV</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Right Controls */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Переключить тему"
          >
            {darkMode ? <Sun className="w-4 h-4 text-neutral-300" /> : <Moon className="w-4 h-4 text-neutral-700" />}
          </button>
        </div>
      </div>
    </header>
  )
}
