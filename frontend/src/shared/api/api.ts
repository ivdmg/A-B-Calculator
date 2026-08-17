import axios from "axios";

const API_BASE_URL = "/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// Type Definitions
// ============================================================================

export interface PowerCurvePoint {
  sample_size: number;
  power: number;
}

export interface MDECurvePoint {
  mde_relative: number;
  sample_size: number;
}

export interface SampleSizeRequest {
  metric_type: "proportion" | "continuous";
  baseline_value: number;
  baseline_std?: number;
  mde_relative: number;
  alpha: number;
  power: number;
  alternative?: "two-sided" | "larger" | "smaller";
  daily_traffic_per_group?: number;
}

export interface SampleSizeResponseData {
  sample_size_per_group: number;
  total_sample_size: number;
  baseline_value: number;
  target_value: number;
  absolute_mde: number;
  relative_mde: number;
  alpha: number;
  power: number;
  estimated_days?: number;
  power_curve: PowerCurvePoint[];
  mde_curve: MDECurvePoint[];
}

export interface MDERequest {
  metric_type: "proportion" | "continuous";
  sample_size_per_group: number;
  baseline_value: number;
  baseline_std?: number;
  alpha: number;
  power: number;
  alternative?: "two-sided" | "larger" | "smaller";
}

export interface MDEResponseData {
  sample_size_per_group: number;
  absolute_mde: number;
  relative_mde: number;
  baseline_value: number;
  target_detectable_value: number;
}

export interface DistributionParams {
  proportion_p: number;
  continuous_mean: number;
  continuous_std: number;
  skewness: number;
  zero_inflation_rate: number;
  outliers_rate: number;
}

export interface AACalibrationRequest {
  sample_size_per_group: number;
  iterations: number;
  metric_type: "proportion" | "continuous";
  distribution_params: DistributionParams;
  alpha: number;
  test_method: "welch_ttest" | "mann_whitney" | "proportions_ztest";
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
  density: number;
}

export interface AACalibrationResponseData {
  iterations: number;
  nominal_alpha: number;
  empirical_fpr: number;
  standard_error_fpr: number;
  ci_fpr_lower: number;
  ci_fpr_upper: number;
  is_calibrated: boolean;
  calibration_verdict: string;
  p_value_histogram: HistogramBin[];
}

export interface ABSimulationRequest {
  sample_size_per_group: number;
  metric_type: "proportion" | "continuous";
  baseline_value: number;
  baseline_std: number;
  true_effect_relative: number;
  skewness: number;
  zero_inflation_rate: number;
  outliers_rate: number;
  alpha: number;
}

export interface GroupSummary {
  sample_size: number;
  mean: number;
  std: number;
  median: number;
  p25: number;
  p75: number;
  zeros_count: number;
  zeros_fraction: number;
}

export interface EffectSummary {
  absolute_difference: number;
  relative_lift: number;
  relative_lift_pct: string;
}

export interface TestResult {
  statistic: number;
  p_value: number;
  is_significant: boolean;
  ci_lower?: number;
  ci_upper?: number;
  p_a?: number;
  p_b?: number;
  diff?: number;
  degrees_of_freedom?: number;
}

export interface BusinessVerdict {
  status: "STATISTICALLY_SIGNIFICANT_POSITIVE" | "STATISTICALLY_SIGNIFICANT_NEGATIVE" | "INCONCLUSIVE" | "UNDERPOWERED";
  badge_variant: "success" | "destructive" | "warning" | "secondary";
  title: string;
  description: string;
}

export interface ABSimulationResponseData {
  metric_type: "proportion" | "continuous";
  group_a_summary: GroupSummary;
  group_b_summary: GroupSummary;
  effect: EffectSummary;
  tests: {
    proportions_ztest?: TestResult;
    welch_ttest?: TestResult;
    mann_whitney?: TestResult;
    [key: string]: TestResult | undefined;
  };
  business_verdict: BusinessVerdict;
  distribution_samples: {
    sample_a: number[];
    sample_b: number[];
  };
}

export interface CustomDataAnalysisResponseData {
  metric_type: "proportion" | "continuous";
  control_label: string;
  treatment_label: string;
  group_a_summary: GroupSummary & { label: string };
  group_b_summary: GroupSummary & { label: string };
  effect: EffectSummary;
  tests: {
    proportions_ztest?: TestResult;
    welch_ttest?: TestResult;
    mann_whitney?: TestResult;
    [key: string]: TestResult | undefined;
  };
  business_verdict: BusinessVerdict;
  sample_a_subsample: number[];
  sample_b_subsample: number[];
}

// ============================================================================
// API Calls
// ============================================================================

export const ApiService = {
  async calculateSampleSize(payload: SampleSizeRequest): Promise<SampleSizeResponseData> {
    const res = await apiClient.post<{ success: boolean; data: SampleSizeResponseData }>("/calculator/sample-size", payload);
    return res.data.data;
  },

  async calculateMDE(payload: MDERequest): Promise<MDEResponseData> {
    const res = await apiClient.post<{ success: boolean; data: MDEResponseData }>("/calculator/mde", payload);
    return res.data.data;
  },

  async simulateAACalibration(payload: AACalibrationRequest): Promise<AACalibrationResponseData> {
    const res = await apiClient.post<{ success: boolean; data: AACalibrationResponseData }>("/simulate/aa-test", payload);
    return res.data.data;
  },

  async simulateABTest(payload: ABSimulationRequest): Promise<ABSimulationResponseData> {
    const res = await apiClient.post<{ success: boolean; data: ABSimulationResponseData }>("/simulate/ab-test", payload);
    return res.data.data;
  },

  async analyzeCustomData(formData: FormData): Promise<CustomDataAnalysisResponseData> {
    const res = await apiClient.post<{ success: boolean; data: CustomDataAnalysisResponseData }>("/analyze/custom-data", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data.data;
  },

  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await axios.get<{ status: string; service: string }>("/health");
    return res.data;
  }
};
