import React, { useState, useEffect, useCallback } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from "recharts"
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Slider,
  Badge,
  Tooltip,
  Alert,
  AlertTitle,
  AlertDescription,
  LoadingState
} from "../../../shared/ui"
import { ApiService, type ABSimulationResponseData } from "../../../shared/api"
import { formatNumber, formatPercent, formatPValue } from "../../../shared/lib"

export const ABPlaygroundPage: React.FC = () => {
  // Config
  const [sampleSize, setSampleSize] = useState<number>(4000)
  const [metricType, setMetricType] = useState<"proportion" | "continuous">("continuous")
  const [baselineValue, setBaselineValue] = useState<number>(100.0)
  const [baselineStd, setBaselineStd] = useState<number>(35.0)
  const [trueLift, setTrueLift] = useState<number>(0.05) // +5%
  const [skewness, setSkewness] = useState<number>(1.2)
  const [zeroInflation, setZeroInflation] = useState<number>(0.10)
  const [outliersRate, setOutliersRate] = useState<number>(0.01)
  const [alpha] = useState<number>(0.05)

  // State
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ABSimulationResponseData | null>(null)

  const executeSimulation = useCallback(
    async (
      type: "proportion" | "continuous",
      baseVal: number,
      baseStd: number,
      n: number,
      lift: number,
      skew: number,
      zeros: number,
      outliers: number
    ) => {
      setLoading(true)
      setError(null)
      try {
        const data = await ApiService.simulateABTest({
          sample_size_per_group: n,
          metric_type: type,
          baseline_value: baseVal,
          baseline_std: baseStd,
          true_effect_relative: lift,
          skewness: skew,
          zero_inflation_rate: zeros,
          outliers_rate: outliers,
          alpha: alpha,
        })
        setResult(data)
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || err?.message || "Ошибка симуляции A/B теста")
      } finally {
        setLoading(false)
      }
    },
    [alpha]
  )

  const runExperiment = () => {
    executeSimulation(
      metricType,
      baselineValue,
      baselineStd,
      sampleSize,
      trueLift,
      skewness,
      zeroInflation,
      outliersRate
    )
  }

  useEffect(() => {
    executeSimulation(
      "continuous",
      100.0,
      35.0,
      sampleSize,
      trueLift,
      skewness,
      zeroInflation,
      outliersRate
    )
  }, [])

  const handleMetricTypeChange = (type: "proportion" | "continuous") => {
    setMetricType(type)
    const newBaseVal = type === "proportion" ? 0.05 : 100.0
    const newBaseStd = 35.0
    setBaselineValue(newBaseVal)
    if (type === "continuous") {
      setBaselineStd(newBaseStd)
    }
    // Automatically re-simulate with the new parameters
    executeSimulation(
      type,
      newBaseVal,
      newBaseStd,
      sampleSize,
      trueLift,
      type === "proportion" ? 0.0 : skewness,
      type === "proportion" ? 0.0 : zeroInflation,
      type === "proportion" ? 0.0 : outliersRate
    )
  }

  // Chart data for comparing group averages
  const getComparisonChartData = () => {
    if (!result) return []
    const isProp = result.metric_type === "proportion"
    return [
      {
        name: "Группа A (Контроль)",
        value: result.group_a_summary.mean,
        formattedValue: isProp
          ? `${(result.group_a_summary.mean * 100).toFixed(2)}%`
          : result.group_a_summary.mean.toFixed(2),
        fill: "hsl(var(--muted-foreground))"
      },
      {
        name: "Группа B (Тест)",
        value: result.group_b_summary.mean,
        formattedValue: isProp
          ? `${(result.group_b_summary.mean * 100).toFixed(2)}%`
          : result.group_b_summary.mean.toFixed(2),
        fill: result.effect.relative_lift >= 0 ? "hsl(142.1 70.6% 45.3%)" : "hsl(var(--destructive))"
      }
    ]
  }

  const isResultProportion = result?.metric_type === "proportion"

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold">A/B Симулятор экспериментов</h2>
            <p className="text-xs text-muted-foreground">
              Генерация контрольной и тестовой групп, расчет статистической значимости и автоматическая оценка эффекта.
            </p>
          </div>
        </div>

        <Button
          onClick={runExperiment}
          isLoading={loading}
          className="gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Симулировать A/B тест
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Ошибка симуляции</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Генератор эксперимента</CardTitle>
              <CardDescription>Управляйте истинным приростом (Ground Truth) и параметрами групп.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metric Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Тип метрики</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMetricTypeChange("continuous")}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                      metricType === "continuous"
                        ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-neutral-700 font-semibold"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Средний чек (ARPU)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMetricTypeChange("proportion")}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                      metricType === "proportion"
                        ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-neutral-700 font-semibold"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Конверсия (CR)
                  </button>
                </div>
              </div>

              {/* True Effect Size (Lift) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Истинный прирост в группе B (Lift %)</span>
                    <Tooltip
                      title="Истинный эффект"
                      content="Реальное изменение поведения пользователей в группе B. Симулятор проверит, сможет ли выбранный тест его статистически подтвердить."
                    />
                  </div>
                </div>
                <Slider
                  value={trueLift}
                  min={-0.20}
                  max={0.30}
                  step={0.01}
                  valueDisplay={`${trueLift >= 0 ? "+" : ""}${(trueLift * 100).toFixed(0)}%`}
                  onChange={(val) => setTrueLift(val)}
                />
              </div>

              {/* Sample Size per Group */}
              <Slider
                label="Размер выборки на группу (N)"
                value={sampleSize}
                min={500}
                max={20000}
                step={500}
                valueDisplay={formatNumber(sampleSize)}
                onChange={(val) => setSampleSize(val)}
              />

              {/* Baseline Value */}
              {metricType === "proportion" ? (
                <Slider
                  label="Базовый CR контрольной группы"
                  value={baselineValue}
                  min={0.01}
                  max={0.30}
                  step={0.01}
                  valueDisplay={`${(baselineValue * 100).toFixed(1)}%`}
                  onChange={(val) => setBaselineValue(val)}
                />
              ) : (
                <div className="space-y-3.5 p-3 rounded-lg bg-secondary/50 border border-border">
                  <Slider
                    label="Скошенность распределения"
                    value={skewness}
                    min={0.0}
                    max={2.5}
                    step={0.1}
                    valueDisplay={skewness.toFixed(1)}
                    onChange={(val) => setSkewness(val)}
                  />
                  <Slider
                    label="Доля пользователей без покупок (нулей)"
                    value={zeroInflation}
                    min={0.0}
                    max={0.50}
                    step={0.05}
                    valueDisplay={formatPercent(zeroInflation, 0)}
                    onChange={(val) => setZeroInflation(val)}
                  />
                  <Slider
                    label="Доля аномальных выбросов"
                    value={outliersRate}
                    min={0.0}
                    max={0.03}
                    step={0.005}
                    valueDisplay={formatPercent(outliersRate, 1)}
                    onChange={(val) => setOutliersRate(val)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Output */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <LoadingState
              title="Генерация выборок и расчет статистических тестов..."
              description="Вычисляются разница средних, p-value и доверительные интервалы."
              skeletonType="table"
            />
          ) : result ? (
            <>
              {/* Business Decision Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                  result.business_verdict.badge_variant === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
                    : result.business_verdict.badge_variant === "destructive"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                }`}
              >
                {result.business_verdict.badge_variant === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-current shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{result.business_verdict.title}</span>
                    <Badge variant={result.business_verdict.badge_variant as any}>
                      Прирост: {result.effect.relative_lift_pct}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-90">{result.business_verdict.description}</p>
                </div>
              </div>

              {/* Group Comparison Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Control Group A */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Группа A (Контроль)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-foreground">
                        {isResultProportion
                          ? `${(result.group_a_summary.mean * 100).toFixed(2)}%`
                          : result.group_a_summary.mean.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">N = {formatNumber(result.group_a_summary.sample_size)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                      <div>
                        <span className="block text-[10px]">Стд. откл (σ)</span>
                        <span className="font-medium text-foreground">{result.group_a_summary.std.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px]">Медиана</span>
                        <span className="font-medium text-foreground">{result.group_a_summary.median.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px]">Доля нулей</span>
                        <span className="font-medium text-foreground">{formatPercent(result.group_a_summary.zeros_fraction, 1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Treatment Group B */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex justify-between items-center">
                      <span>Группа B (Тест)</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        Δ = {result.effect.relative_lift_pct}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-foreground">
                        {isResultProportion
                          ? `${(result.group_b_summary.mean * 100).toFixed(2)}%`
                          : result.group_b_summary.mean.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">N = {formatNumber(result.group_b_summary.sample_size)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                      <div>
                        <span className="block text-[10px]">Стд. откл (σ)</span>
                        <span className="font-medium text-foreground">{result.group_b_summary.std.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px]">Медиана</span>
                        <span className="font-medium text-foreground">{result.group_b_summary.median.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px]">Доля нулей</span>
                        <span className="font-medium text-foreground">{formatPercent(result.group_b_summary.zeros_fraction, 1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Statistical Tests Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm md:text-base flex items-center justify-between">
                    <span>Результаты проверки гипотез</span>
                    <Badge variant="outline">Уровень значимости α = 5%</Badge>
                  </CardTitle>
                  <CardDescription>
                    {isResultProportion
                      ? "Z-тест для двух независимых пропорций с расчетом 95% доверительного интервала."
                      : "Двухвыборочный t-критерий Уэлча для сравнения средних и непараметрический критерий Манна-Уитни."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-secondary/60 border-y border-border text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Статистический критерий</th>
                          <th className="px-4 py-3 font-semibold">Статистика</th>
                          <th className="px-4 py-3 font-semibold">P-Value</th>
                          <th className="px-4 py-3 font-semibold">Результат</th>
                          <th className="px-4 py-3 font-semibold">95% Доверительный интервал</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {/* Z-test for proportions */}
                        {result.tests.proportions_ztest && (
                          <tr className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">
                              Z-тест для пропорций
                              <span className="block text-[10px] text-muted-foreground">Бинарные исходы (конверсии CR / CTR)</span>
                            </td>
                            <td className="px-4 py-3 font-mono">Z = {result.tests.proportions_ztest.statistic.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">
                              {formatPValue(result.tests.proportions_ztest.p_value)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={result.tests.proportions_ztest.is_significant ? "success" : "secondary"}>
                                {result.tests.proportions_ztest.is_significant ? "Значимо (p < α)" : "Не значимо"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              [{((result.tests.proportions_ztest.ci_lower || 0) * 100).toFixed(2)}%, {((result.tests.proportions_ztest.ci_upper || 0) * 100).toFixed(2)}%]
                            </td>
                          </tr>
                        )}

                        {/* Welch t-test */}
                        {result.tests.welch_ttest && (
                          <tr className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">
                              Двухвыборочный t-критерий Уэлча
                              <span className="block text-[10px] text-muted-foreground">Не требует равенства дисперсий групп</span>
                            </td>
                            <td className="px-4 py-3 font-mono">t = {result.tests.welch_ttest.statistic.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">
                              {formatPValue(result.tests.welch_ttest.p_value)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={result.tests.welch_ttest.is_significant ? "success" : "secondary"}>
                                {result.tests.welch_ttest.is_significant ? "Значимо (p < α)" : "Не значимо"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              [{result.tests.welch_ttest.ci_lower?.toFixed(2)}, {result.tests.welch_ttest.ci_upper?.toFixed(2)}]
                            </td>
                          </tr>
                        )}

                        {/* Mann-Whitney U */}
                        {result.tests.mann_whitney && (
                          <tr className="hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">
                              U-критерий Манна-Уитни
                              <span className="block text-[10px] text-muted-foreground">Непараметрический ранговый тест</span>
                            </td>
                            <td className="px-4 py-3 font-mono">U = {formatNumber(result.tests.mann_whitney.statistic, 0)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">
                              {formatPValue(result.tests.mann_whitney.p_value)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={result.tests.mann_whitney.is_significant ? "success" : "secondary"}>
                                {result.tests.mann_whitney.is_significant ? "Значимо (p < α)" : "Не значимо"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">Ранговый критерий</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Group Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm md:text-base flex items-center justify-between">
                    <span>Сравнение средних значений (Группа A vs Группа B)</span>
                    <Badge variant="secondary">Визуализация эффекта</Badge>
                  </CardTitle>
                  <CardDescription>
                    Абсолютная разница: {result.effect.absolute_difference > 0 ? "+" : ""}{result.effect.absolute_difference} ({result.effect.relative_lift_pct}).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getComparisonChartData()}
                        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const pt = payload[0].payload
                              return (
                                <div className="bg-popover border border-border p-2 rounded shadow-md text-xs">
                                  <p className="font-semibold">{pt.name}</p>
                                  <p className="text-foreground">Среднее значение: {pt.formattedValue}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                          {getComparisonChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
