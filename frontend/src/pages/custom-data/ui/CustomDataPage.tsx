import React, { useState } from "react"
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
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles
} from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Select,
  Alert,
  AlertTitle,
  AlertDescription,
  LoadingState
} from "../../../shared/ui"
import { ApiService, type CustomDataAnalysisResponseData } from "../../../shared/api"
import { formatNumber, formatPercent, formatPValue } from "../../../shared/lib"

export const CustomDataPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])

  // Column Mapping
  const [groupCol, setGroupCol] = useState<string>("")
  const [metricCol, setMetricCol] = useState<string>("")
  const [userIdCol, setUserIdCol] = useState<string>("")
  const [alpha] = useState<number>(0.05)

  // API State
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CustomDataAnalysisResponseData | null>(null)

  // Handle CSV file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      loadCSV(selectedFile)
    }
  }

  const loadCSV = (selectedFile: File) => {
    setFile(selectedFile)
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length < 2) {
        setError("CSV файл должен содержать хотя бы строку заголовков и одну строку данных.")
        return
      }

      const firstLine = lines[0]
      let delimiter = ","
      if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";"
      if (firstLine.includes("\t") && !firstLine.includes(",")) delimiter = "\t"

      const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""))
      setColumns(headers)

      const autoGroup = headers.find((h) =>
        /^(group|variant|experiment_group|ab_group|treatment|test_group|вариант|группа)$/i.test(h)
      ) || headers.find((h) => h !== "user_id" && h !== "id") || headers[0]

      const autoMetric = headers.find((h) =>
        /^(value|revenue|arpu|orders|purchases|converted|target|y|clicks|выручка|конверсия)$/i.test(h)
      ) || headers.find((h) => h !== autoGroup && h !== "user_id" && h !== "id") || headers[1] || headers[0]

      const autoUser = headers.find((h) =>
        /^(user_id|id|client_id|uid|customer_id|пользователь)$/i.test(h)
      ) || ""

      setGroupCol(autoGroup)
      setMetricCol(autoMetric)
      setUserIdCol(autoUser)

      const preview = lines.slice(1, 6).map((line) => {
        const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""))
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx] || ""
        })
        return row
      })
      setPreviewRows(preview)
    }
    reader.readAsText(selectedFile)
  }

  const loadDemoCSV = () => {
    const rows = ["user_id,group,value"]
    const rng = Math.random
    // Control group (mean ~ 100, CR ~ 8%)
    for (let i = 1; i <= 1500; i++) {
      const isZero = rng() < 0.15
      const val = isZero ? "0" : (70 + rng() * 65).toFixed(2)
      rows.push(`user_${i},A,${val}`)
    }
    // Test group (mean ~ 106, +6% lift)
    for (let i = 1501; i <= 3000; i++) {
      const isZero = rng() < 0.12
      const val = isZero ? "0" : (74 + rng() * 68).toFixed(2)
      rows.push(`user_${i},B,${val}`)
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const demoFile = new File([blob], "demo_ab_dataset.csv", { type: "text/csv" })
    loadCSV(demoFile)
  }

  const runAnalysis = async () => {
    if (!file) {
      setError("Сначала выберите или перетащите CSV файл.")
      return
    }
    if (!groupCol || !metricCol) {
      setError("Пожалуйста, укажите колонки группы и целевой метрики.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("group_col", groupCol)
      formData.append("metric_col", metricCol)
      if (userIdCol && userIdCol.trim().length > 0) {
        formData.append("user_id_col", userIdCol.trim())
      }
      formData.append("alpha", alpha.toString())

      const data = await ApiService.analyzeCustomData(formData)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || "Ошибка при анализе файла")
    } finally {
      setLoading(false)
    }
  }

  // Chart data for comparing group averages
  const getComparisonChartData = () => {
    if (!result) return []
    const isProp = result.metric_type === "proportion"
    return [
      {
        name: `Контроль (${result.group_a_summary.label})`,
        value: result.group_a_summary.mean,
        formattedValue: isProp
          ? `${(result.group_a_summary.mean * 100).toFixed(2)}%`
          : result.group_a_summary.mean.toFixed(2),
        fill: "hsl(var(--muted-foreground))"
      },
      {
        name: `Тест (${result.group_b_summary.label})`,
        value: result.group_b_summary.mean,
        formattedValue: isProp
          ? `${(result.group_b_summary.mean * 100).toFixed(2)}%`
          : result.group_b_summary.mean.toFixed(2),
        fill: result.effect.relative_lift >= 0 ? "hsl(142.1 70.6% 45.3%)" : "hsl(var(--destructive))"
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-secondary text-foreground border border-border">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold">Анализ пользовательских CSV данных</h2>
            <p className="text-xs text-muted-foreground">
              Загрузите выгрузку эксперимента для автоматического выбора критерия (Z-тест или t-тест Уэлча) и расчета статзначимости.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadDemoCSV}
            className="gap-1.5 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Загрузить демо-датасет
          </Button>
          <Button
            type="button"
            disabled={!file}
            isLoading={loading}
            onClick={runAnalysis}
            className="gap-1.5 text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Запустить анализ
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Ошибка датасета</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Upload & Column Mapper */}
        <div className="lg:col-span-4 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Загрузка CSV</CardTitle>
              <CardDescription>Структура: user_id, group (A/B), value (число или 0/1).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-foreground hover:bg-secondary/40 transition-all text-center">
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-semibold text-foreground">
                  {file ? file.name : "Нажмите или перетащите CSV сюда"}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {file ? `${(file.size / 1024).toFixed(1)} КБ` : "Разделители: запятая, точка с запятой, табуляция"}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {/* Column Selectors */}
              {columns.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <span className="text-xs font-semibold text-foreground block">
                    Маппинг колонок
                  </span>

                  <Select
                    label="Колонка группы (Обязательно)"
                    value={groupCol}
                    onChange={(e) => setGroupCol(e.target.value)}
                    options={columns.map((c) => ({ value: c, label: c }))}
                    helperText="Должна содержать 2 группы (напр. A и B или control и treatment)."
                  />

                  <Select
                    label="Колонка метрики (Value / Метрика)"
                    value={metricCol}
                    onChange={(e) => setMetricCol(e.target.value)}
                    options={columns.map((c) => ({ value: c, label: c }))}
                    helperText="Значения 0 и 1 для конверсий или произвольные числа для чеков."
                  />

                  <Select
                    label="Колонка ID пользователя (Опционально)"
                    value={userIdCol}
                    onChange={(e) => setUserIdCol(e.target.value)}
                    options={[
                      { value: "", label: "-- Не выбрано --" },
                      ...columns.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* CSV Preview Card */}
          {previewRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold">Превью файла (Первые 5 строк)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-48 text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-secondary/60 border-y border-border text-muted-foreground">
                      <tr>
                        {columns.slice(0, 4).map((c) => (
                          <th key={c} className="p-2 font-medium">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y border-border">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-secondary/30">
                          {columns.slice(0, 4).map((c) => (
                            <td key={c} className="p-2 font-mono">{row[c]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Output */}
        <div className="lg:col-span-8 space-y-6">
          {loading ? (
            <LoadingState
              title="Обработка CSV файла и проверка критериев..."
              description="Определение типа данных, расчет базовых статистик, разницы средних и p-value."
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

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Контроль: {result.group_a_summary.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-foreground">
                        {result.metric_type === "proportion"
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

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex justify-between items-center">
                      <span>Тест: {result.group_b_summary.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        Δ = {result.effect.relative_lift_pct}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-foreground">
                        {result.metric_type === "proportion"
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
                    <Badge variant="outline">
                      {result.metric_type === "proportion" ? "Авто: Z-тест для долей" : "Авто: t-тест Уэлча & Манн-Уитни"}
                    </Badge>
                  </CardTitle>
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
                      <tbody className="divide-y border-border">
                        {result.tests.proportions_ztest && (
                          <tr className="hover:bg-secondary/30">
                            <td className="px-4 py-3 font-medium text-foreground">
                              Z-тест для пропорций
                              <span className="block text-[10px] text-muted-foreground">Бинарная конверсия (0 / 1)</span>
                            </td>
                            <td className="px-4 py-3 font-mono">Z = {result.tests.proportions_ztest.statistic.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">{formatPValue(result.tests.proportions_ztest.p_value)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={result.tests.proportions_ztest.is_significant ? "success" : "secondary"}>
                                {result.tests.proportions_ztest.is_significant ? "Значимо (p < 0.05)" : "Не значимо"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              [{((result.tests.proportions_ztest.ci_lower || 0) * 100).toFixed(2)}%, {((result.tests.proportions_ztest.ci_upper || 0) * 100).toFixed(2)}%]
                            </td>
                          </tr>
                        )}
                        {result.tests.welch_ttest && (
                          <tr className="hover:bg-secondary/30">
                            <td className="px-4 py-3 font-medium text-foreground">
                              Двухвыборочный t-критерий Уэлча
                              <span className="block text-[10px] text-muted-foreground">Сравнение средних значений</span>
                            </td>
                            <td className="px-4 py-3 font-mono">t = {result.tests.welch_ttest.statistic.toFixed(2)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">{formatPValue(result.tests.welch_ttest.p_value)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={result.tests.welch_ttest.is_significant ? "success" : "secondary"}>
                                {result.tests.welch_ttest.is_significant ? "Значимо (p < 0.05)" : "Не значимо"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono">
                              [{result.tests.welch_ttest.ci_lower?.toFixed(2)}, {result.tests.welch_ttest.ci_upper?.toFixed(2)}]
                            </td>
                          </tr>
                        )}
                        {result.tests.mann_whitney && (
                          <tr className="hover:bg-secondary/30">
                            <td className="px-4 py-3 font-medium text-foreground">
                              U-критерий Манна-Уитни
                              <span className="block text-[10px] text-muted-foreground">Ранговый непараметрический тест</span>
                            </td>
                            <td className="px-4 py-3 font-mono">U = {formatNumber(result.tests.mann_whitney.statistic, 0)}</td>
                            <td className="px-4 py-3 font-mono font-semibold">{formatPValue(result.tests.mann_whitney.p_value)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={result.tests.mann_whitney.is_significant ? "success" : "secondary"}>
                                {result.tests.mann_whitney.is_significant ? "Значимо (p < 0.05)" : "Не значимо"}
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
                    <span>Сравнение средних значений групп</span>
                    <Badge variant="secondary">Визуализация данных</Badge>
                  </CardTitle>
                  <CardDescription>
                    Разница средних: {result.effect.absolute_difference > 0 ? "+" : ""}{result.effect.absolute_difference} ({result.effect.relative_lift_pct}).
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
          ) : (
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
              <FileSpreadsheet className="w-12 h-12 stroke-[1.2]" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Датасет еще не проанализирован</h3>
                <p className="text-xs max-w-sm">
                  Загрузите свой CSV файл со структурой <code>user_id, group, value</code> или нажмите кнопку «Загрузить демо-датасет» выше.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
