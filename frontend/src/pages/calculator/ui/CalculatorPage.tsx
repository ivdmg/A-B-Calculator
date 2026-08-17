import React, { useState, useEffect, useCallback } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from "recharts"
import {
  Calculator,
  Users,
  Clock,
  TrendingUp,
  Percent,
  Sparkles,
  Info
} from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Slider,
  Input,
  Badge,
  Tooltip,
  LoadingState
} from "../../../shared/ui"
import { ApiService, type SampleSizeResponseData, type MDEResponseData } from "../../../shared/api"
import { formatNumber, formatPercent } from "../../../shared/lib"

export const CalculatorPage: React.FC = () => {
  // Mode: "sample_size" or "mde"
  const [calcMode, setCalcMode] = useState<"sample_size" | "mde">("sample_size")

  // Form State
  const [metricType, setMetricType] = useState<"proportion" | "continuous">("proportion")
  const [baselineValue, setBaselineValue] = useState<number>(0.05) // 5% CR
  const [baselineStd, setBaselineStd] = useState<number>(30.0)
  const [mdeRelative, setMdeRelative] = useState<number>(0.10) // +10% lift
  const [alpha, setAlpha] = useState<number>(0.05)
  const [power, setPower] = useState<number>(0.80)
  const [dailyTraffic, setDailyTraffic] = useState<number>(5000)

  // MDE Mode inputs
  const [fixedSampleSize, setFixedSampleSize] = useState<number>(10000)

  // API State
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sampleSizeResult, setSampleSizeResult] = useState<SampleSizeResponseData | null>(null)
  const [mdeResult, setMdeResult] = useState<MDEResponseData | null>(null)

  const computeSampleSize = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await ApiService.calculateSampleSize({
        metric_type: metricType,
        baseline_value: baselineValue,
        baseline_std: metricType === "continuous" ? baselineStd : undefined,
        mde_relative: mdeRelative,
        alpha: alpha,
        power: power,
        daily_traffic_per_group: dailyTraffic > 0 ? dailyTraffic : undefined,
      })
      setSampleSizeResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Ошибка расчета выборки")
    } finally {
      setLoading(false)
    }
  }, [metricType, baselineValue, baselineStd, mdeRelative, alpha, power, dailyTraffic])

  const computeMDE = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await ApiService.calculateMDE({
        metric_type: metricType,
        sample_size_per_group: fixedSampleSize,
        baseline_value: baselineValue,
        baseline_std: metricType === "continuous" ? baselineStd : undefined,
        alpha: alpha,
        power: power,
      })
      setMdeResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Ошибка расчета MDE")
    } finally {
      setLoading(false)
    }
  }, [metricType, fixedSampleSize, baselineValue, baselineStd, alpha, power])

  useEffect(() => {
    if (calcMode === "sample_size") {
      computeSampleSize()
    } else {
      computeMDE()
    }
  }, [calcMode, computeSampleSize, computeMDE])

  const handleMetricTypeChange = (type: "proportion" | "continuous") => {
    setMetricType(type)
    if (type === "proportion") {
      setBaselineValue(0.05)
    } else {
      setBaselineValue(100.0)
      setBaselineStd(35.0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold">Калькулятор размера выборки и MDE</h2>
            <p className="text-xs text-muted-foreground">
              Планирование экспериментов: расчет требуемого объема выборки, срока теста и чувствительности к эффекту.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-secondary p-1 rounded-lg border border-border">
          <button
            onClick={() => setCalcMode("sample_size")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              calcMode === "sample_size"
                ? "bg-card text-foreground font-semibold shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Расчет выборки (N)
          </button>
          <button
            onClick={() => setCalcMode("mde")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              calcMode === "mde"
                ? "bg-card text-foreground font-semibold shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Расчет MDE от N
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm">
          <strong>Ошибка валидации:</strong> {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs Panel */}
        <div className="lg:col-span-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Параметры эксперимента</CardTitle>
              <CardDescription>Задайте базовые показатели и статистические границы надежности.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metric Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Тип метрики</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMetricTypeChange("proportion")}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                      metricType === "proportion"
                        ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-neutral-700 font-semibold"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Конверсия (CR / CTR)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMetricTypeChange("continuous")}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                      metricType === "continuous"
                        ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-neutral-700 font-semibold"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Средний чек / ARPU
                  </button>
                </div>
              </div>

              {/* Baseline Value */}
              {metricType === "proportion" ? (
                <Slider
                  label="Текущая конверсия (CR baseline)"
                  value={baselineValue}
                  min={0.005}
                  max={0.50}
                  step={0.005}
                  valueDisplay={`${(baselineValue * 100).toFixed(1)}%`}
                  onChange={(val) => setBaselineValue(val)}
                />
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Среднее значение метрики (Mean ARPU)"
                    type="number"
                    value={baselineValue}
                    onChange={(e) => setBaselineValue(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    label="Стандартное отклонение (σ)"
                    type="number"
                    value={baselineStd}
                    onChange={(e) => setBaselineStd(parseFloat(e.target.value) || 1)}
                  />
                </div>
              )}

              {/* Mode Specific Controls */}
              {calcMode === "sample_size" ? (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Ожидаемый прирост (MDE %)</span>
                        <Tooltip
                          title="MDE (Minimum Detectable Effect)"
                          content="Минимальный относительный прирост метрики, который мы хотим гарантированно заметить тестом. Чем меньше эффект, тем больше выборки нужно."
                        />
                      </div>
                    </div>
                    <Slider
                      value={mdeRelative}
                      min={0.01}
                      max={0.50}
                      step={0.01}
                      valueDisplay={`+${(mdeRelative * 100).toFixed(0)}%`}
                      onChange={(val) => setMdeRelative(val)}
                    />
                  </div>

                  <Input
                    label="Дневной трафик на группу (Опционально)"
                    type="number"
                    placeholder="напр. 5000"
                    value={dailyTraffic || ""}
                    onChange={(e) => setDailyTraffic(parseInt(e.target.value) || 0)}
                    helperText="Позволяет автоматически рассчитать необходимый срок проведения теста в днях."
                  />
                </>
              ) : (
                <Slider
                  label="Размер выборки на группу (N)"
                  value={fixedSampleSize}
                  min={500}
                  max={100000}
                  step={500}
                  valueDisplay={formatNumber(fixedSampleSize)}
                  onChange={(val) => setFixedSampleSize(val)}
                />
              )}

              {/* Significance Level Alpha */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Уровень значимости (α / Ложная тревога)</span>
                    <Tooltip
                      title="Ошибка I рода (α)"
                      content="Вероятность ошибочно отклонить нулевую гипотезу и посчитать случайный шум победой (ложная тревога). Стандарт индустрии: 5% (α = 0.05)."
                    />
                  </div>
                  <span className="font-semibold text-foreground">{(alpha * 100).toFixed(0)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0.01, 0.05, 0.10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAlpha(val)}
                      className={`py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                        alpha === val
                          ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-neutral-700 font-semibold"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {(val * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Statistical Power */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Статистическая мощность (1 - β)</span>
                    <Tooltip
                      title="Мощность теста (1 - β)"
                      content="Вероятность обнаружить реальное изменение, если оно действительно есть. Чем выше мощность, тем ниже риск упустить полезную фичу (ошибка II рода). Стандарт: 80%."
                    />
                  </div>
                  <span className="font-semibold text-foreground">{(power * 100).toFixed(0)}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[0.80, 0.90, 0.95].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPower(val)}
                      className={`py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                        power === val
                          ? "bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900 border-neutral-700 font-semibold"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {(val * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Output & Visualizations */}
        <div className="lg:col-span-8 space-y-6">
          {loading && !sampleSizeResult && !mdeResult ? (
            <LoadingState
              title="Выполняется расчет размера выборки и графиков..."
              description="Вычисление Z-критерия и координат кривых мощности и MDE."
              skeletonType="cards_chart"
            />
          ) : (
            <>
              {/* KPI Cards */}
              {calcMode === "sample_size" && sampleSizeResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">N на группу</span>
                        <Users className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {formatNumber(sampleSizeResult.sample_size_per_group)}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Всего (A+B): {formatNumber(sampleSizeResult.total_sample_size)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Целевой Lift (MDE)</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        +{formatPercent(sampleSizeResult.relative_mde, 1)}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Цель: {metricType === "proportion" ? `${(sampleSizeResult.target_value * 100).toFixed(2)}%` : sampleSizeResult.target_value.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Абсолютный MDE</span>
                        <Percent className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {metricType === "proportion"
                          ? `+${(sampleSizeResult.absolute_mde * 100).toFixed(3)}%`
                          : `+${sampleSizeResult.absolute_mde.toFixed(3)}`}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Минимальная Δ эффекта</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Срок теста</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {sampleSizeResult.estimated_days ? `${sampleSizeResult.estimated_days} дн.` : "—"}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {dailyTraffic > 0 ? `@ ${formatNumber(dailyTraffic)} юзеров/день` : "Укажите дневной трафик"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {calcMode === "mde" && mdeResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Фиксированное N</span>
                        <Users className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {formatNumber(mdeResult.sample_size_per_group)}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Всего юзеров: {formatNumber(mdeResult.sample_size_per_group * 2)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Детектируемый Lift</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        +{formatPercent(mdeResult.relative_mde, 2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Минимальный относительный эффект</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Абсолютный MDE</span>
                        <Percent className="w-4 h-4 text-foreground" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {metricType === "proportion"
                          ? `+${(mdeResult.absolute_mde * 100).toFixed(3)}%`
                          : `+${mdeResult.absolute_mde.toFixed(3)}`}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Абсолютная разница средних</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/40 border-border">
                    <CardContent className="p-4 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="text-xs font-medium">Целевое значение</span>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {metricType === "proportion"
                          ? `${(mdeResult.target_detectable_value * 100).toFixed(2)}%`
                          : mdeResult.target_detectable_value.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Ожидаемое значение в группе B</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Charts Section */}
              {calcMode === "sample_size" && sampleSizeResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* MDE Curve Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm md:text-base flex items-center justify-between">
                        <span>Зависимость размера выборки от MDE</span>
                        <Badge variant="secondary">N(MDE)</Badge>
                      </CardTitle>
                      <CardDescription>
                        Объем выборки растет квадратично (∝ 1/Δ²) при уменьшении целевого эффекта.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={sampleSizeResult.mde_curve}
                            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="mde_relative"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickFormatter={(val) => `+${(val * 100).toFixed(0)}%`}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickFormatter={(val) => formatNumber(val, 0)}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload
                                  return (
                                    <div className="bg-popover border border-border p-2 rounded shadow-md text-xs">
                                      <p className="font-semibold">MDE (Прирост): +{(data.mde_relative * 100).toFixed(1)}%</p>
                                      <p className="text-foreground font-medium">Требуемое N: {formatNumber(data.sample_size)}</p>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <ReferenceDot x={mdeRelative} y={sampleSizeResult.sample_size_per_group} r={4} fill="hsl(142.1 70.6% 45.3%)" stroke="hsl(var(--background))" />
                            <Line
                              type="monotone"
                              dataKey="sample_size"
                              stroke="hsl(142.1 70.6% 45.3%)"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Power Curve Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm md:text-base flex items-center justify-between">
                        <span>Кривая статистической мощности</span>
                        <Badge variant="secondary">Power(N)</Badge>
                      </CardTitle>
                      <CardDescription>
                        Рост мощности (1 - β) при увеличении размера группы для MDE = +{formatPercent(mdeRelative, 1)}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={sampleSizeResult.power_curve}
                            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="sample_size"
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              tickFormatter={(val) => formatNumber(val, 0)}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={11}
                              domain={[0, 1.0]}
                              tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload
                                  return (
                                    <div className="bg-popover border border-border p-2 rounded shadow-md text-xs">
                                      <p className="font-semibold">N на группу: {formatNumber(data.sample_size)}</p>
                                      <p className="text-foreground font-medium">Мощность: {(data.power * 100).toFixed(1)}%</p>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <ReferenceLine y={power} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: `Цель ${(power*100).toFixed(0)}%`, fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "insideTopLeft" }} />
                            <ReferenceDot x={sampleSizeResult.sample_size_per_group} y={power} r={4} fill="currentColor" stroke="hsl(var(--background))" />
                            <Line
                              type="monotone"
                              dataKey="power"
                              stroke="currentColor"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Explanatory Note */}
              <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground flex items-start gap-3">
                <Info className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">Памятка аналитика:</span>
                  <p>
                    Для бинарных метрик (конверсий) расчет размера выборки опирается на Z-критерий для пропорций,
                    а для непрерывных метрик (выручки, среднего чека) — на двухвыборочный t-критерий Уэлча.
                    Уровень значимости α={(alpha * 100).toFixed(0)}% гарантирует надежный контроль ошибки I рода.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
