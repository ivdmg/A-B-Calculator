import React, { useState, useEffect } from "react"
import { Header } from "../widgets/header"
import { Tabs, TabsContent } from "../shared/ui"
import { CalculatorPage } from "../pages/calculator"
import { AACalibrationPage } from "../pages/aa-calibration"
import { ABPlaygroundPage } from "../pages/ab-playground"
import { CustomDataPage } from "../pages/custom-data"

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-neutral-800 selection:text-neutral-100">
      <Tabs defaultValue="calculator" className="space-y-0">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
          <TabsContent value="calculator">
            <CalculatorPage />
          </TabsContent>

          <TabsContent value="aa_calibration">
            <AACalibrationPage />
          </TabsContent>

          <TabsContent value="ab_playground">
            <ABPlaygroundPage />
          </TabsContent>

          <TabsContent value="custom_data">
            <CustomDataPage />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  )
}

export default App
