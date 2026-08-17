import React, { useState, useEffect, useCallback } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from "recharts"
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers
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
  Select,
  Tooltip,
  Alert,
  AlertTitle,
  AlertDescription,
  LoadingState
} from "../../../shared/ui"
import { ApiService, type AACalibrationResponseData } from "../../../shared/api"
import { formatNumber, formatPercent } from "../../../shared/lib"

export const AACalibrationPage: React.FC = () => {
  // Parameters
  const [sampleSize, setSampleSize] = useState<number>(1000)
  const [iterations, setIterations] = useState<number>(1000)
  const [metricType, setMetricType] = useState<"proportion" | "continuous">("continuous")
  const [skewness, setSkewness] = useState<number>(1.2)
  const [zeroInflation, setZeroInflation] = useState<number>(0.15)
  const [outliersRate, setOutliersRate] = useState<number>(0.01)
  const [alpha, setAlpha] = useState<number>(0.05)
  const [testMethod, setTestMethod] = useState<"welch_ttest" | "mann_whitney" | "proportions_ztest">("welch_ttest")

  // State
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AACalibrationResponseData | null>(null)

  const runSimulation = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await ApiService.simulateAACalibration({
        sample_size_per_group: sampleSize,
        iterations: iterations,
        metric_type: metricType,
        distribution_params: {
          proportion_p: 0.05,
          continuous_mean: 100.0,
          continuous_std: 35.0,
          skewness: skewness,
          zero_inflation_rate: zeroInflation,
          outliers_rate: outliersRate,
        },
        alpha: alpha,
        test_method: metricType === "proportion" ? "proportions_ztest" : testMethod,
      })
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Ошибка симуляции")
    } finally {
      setLoading(false)
    }
  }, [sampleSize, iterations, metricType, skewness, zeroInflation, outliersRate, alpha, testMethod])

  useEffect(() => {
    runSimulation()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold">A/A Калибровка критериев</h2>
            <p className="text-xs text-muted-foreground">
              Проверка надежности теста: контролируется ли доля ложных срабатываний (FPR ≈ 5%) при отсутствии реальных изменений (H₀).
            </p>
          </div>
        </div>

        <Button
          onClick={runSimulation}
          isLoading={loading}
          variant="default"
          className="gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Запустить {iterations} симуляций
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
        {/* Left Controls */}
        <div className="lg:col-span-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Параметры симуляции</CardTitle>
              <CardDescription>Задайте форму распределения и проверьте корректность критерия.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metric Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Тип метрики</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMetricType("continuous")
                      setTestMethod("welch_ttest")
                    }}
                    className={`py-1.5 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                      metricType === "continuous"
                        ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-neutral-700 font-semibold"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Непрерывная (ARPU)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMetricType("proportion")
                      setTestMethod("proportions_ztest")
                    }}
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

              {/* Method Selection (Continuous only) */}
              {metricType === "continuous" && (
                <Select
                  label="Статистический критерий"
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value as any)}
                  options={[
                    { value: "welch_ttest", label: "Двухвыборочный t-критерий Уэлча" },
                    { value: "mann_whitney", label: "U-критерий Манна-Уитни (Ранговый)" },
                  ]}
                  helperText="t-критерий Уэлча оценивает разницу средних; Манн-Уитни устойчив к аномальным выбросам."
                />
              )}

              {/* Sample Size per Variant */}
              <Slider
                label="Размер группы (N)"
                value={sampleSize}
                min={100}
                max={10000}
                step={100}
                valueDisplay={formatNumber(sampleSize)}
                onChange={(val) => setSampleSize(val)}
              />

              {/* Iterations */}
              <Slider
                label="Количество симуляций (K)"
                value={iterations}
                min={200}
                max={2000}
                step={100}
                valueDisplay={formatNumber(iterations)}
                onChange={(val) => setIterations(val)}
              />

              {/* Distribution Nuances (When Continuous) */}
              {metricType === "continuous" && (
                <div className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-3.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Особенности данных
                  </span>

                  <Slider
                    label="Скошенность распределения (хвост)"
                    value={skewness}
                    min={0.0}
                    max={3.0}
                    step={0.1}
                    valueDisplay={skewness.toFixed(1)}
                    onChange={(val) => setSkewness(val)}
                  />

                  <Slider
                    label="Доля пользователей без покупок (нулей)"
                    value={zeroInflation}
                    min={0.0}
                    max={0.70}
                    step={0.05}
                    valueDisplay={formatPercent(zeroInflation, 0)}
                    onChange={(val) => setZeroInflation(val)}
                  />

                  <Slider
                    label="Доля аномальных выбросов (Outliers)"
                    value={outliersRate}
                    min={0.0}
                    max={0.05}
                    step={0.005}
                    valueDisplay={formatPercent(outliersRate, 1)}
                    onChange={(val) => setOutliersRate(val)}
                  />
                </div>
              )}

              {/* Significance Level */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Уровень значимости (α)</span>
                    <Tooltip
                      title="Уровень значимости (α)"
                      content="Допустимая доля ложноположительных срабатываний. В A/A тестах ожидается, что около 5% запусков покажут p <= 0.05."
                    />
                  </div>
                  <span className="text-xs font-semibold">{formatPercent(alpha, 0)}</span>
                </div>
                <Slider
                  value={alpha}
                  min={0.01}
                  max={0.15}
                  step={0.01}
                  valueDisplay={formatPercent(alpha, 0)}
                  onChange={(val) => setAlpha(val)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Outputs & Histogram */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <LoadingState
              title={`Выполняется симуляция ${formatNumber(iterations)} независимых A/A тестов...`}
              description={`Генерация синтетических пар выборок (N=${formatNumber(sampleSize)}) и сбор p-value для проверки калибровки.`}
              skeletonType="cards_chart"
            />
          ) : result ? (
            <>
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                  result.is_calibrated
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                }`}
              >
                {result.is_calibrated ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {result.is_calibrated ? "Критерий корректно откалиброван" : "Обнаружено искажение доли ложных тревог"}
                    </span>
                    <Badge variant={result.is_calibrated ? "success" : "destructive"}>
                      Эмпирический FPR: {formatPercent(result.empirical_fpr, 1)}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-90">{result.calibration_verdict}</p>
                </div>
              </div>

              {/* Calibration Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Заданный α (Целевой FPR)</span>
                    <div className="text-xl font-bold text-foreground">{formatPercent(result.nominal_alpha, 1)}</div>
                    <p className="text-[11px] text-muted-foreground">Ожидаемая норма</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Эмпирический FPR</span>
                    <div className={`text-xl font-bold ${result.is_calibrated ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {formatPercent(result.empirical_fpr, 2)}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Доля тестов с p ≤ α</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">95% ДИ для FPR</span>
                    <div className="text-xl font-bold text-foreground">
                      [{formatPercent(result.ci_fpr_lower, 1)}, {formatPercent(result.ci_fpr_upper, 1)}]
                    </div>
                    <p className="text-[11px] text-muted-foreground">Границы погрешности</p>
                  </CardContent>
                </Card>
              </div>

              {/* P-Value Histogram */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm md:text-base flex items-center justify-between">
                    <span>Гистограмма распределения P-Value</span>
                    <Badge variant="secondary">Проверка равномерности</Badge>
                  </CardTitle>
                  <CardDescription>
                    В корректном A/A тесте значения p-value распределены строго равномерно от 0 до 1.
                    Красный столбец слева — зона ложных срабатываний (p ≤ {formatPercent(alpha, 0)}), ее высота должна быть около 5%.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={result.p_value_histogram}
                        margin={{ top: 15, right: 15, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="bin_end"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickFormatter={(val) => val.toFixed(2)}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const bin = payload[0].payload
                              return (
                                <div className="bg-popover border border-border p-2 rounded shadow-md text-xs">
                                  <p className="font-semibold">Интервал: [{bin.bin_start.toFixed(2)} - {bin.bin_end.toFixed(2)}]</p>
                                  <p className="text-foreground">Количество симуляций: {bin.count}</p>
                                  <p className="text-muted-foreground font-medium">
                                    {bin.bin_end <= alpha ? "Зона ошибки I рода (p ≤ α)" : "Зона отсутствия различий (H₀)"}
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <ReferenceLine
                          y={iterations / 20}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{ value: "Теоретическая норма (равномерно)", fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "top" }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {result.p_value_histogram.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.bin_end <= alpha ? "hsl(var(--destructive))" : "hsl(var(--foreground))"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {/* Explanation Note */}
          <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-foreground">Зачем аналитику калибровка A/A:</span>
              <p>
                A/A тест сравнивает две группы пользователей без изменений продукта. Если критерий работает правильно, он находит «значимые различия»
                не чаще чем в 5% случаев ($\alpha = 0.05$). Если из-за скошенности или нулей FPR растет до 10–15%, тест будет систематически объявлять шумные фичи «победителями».
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
