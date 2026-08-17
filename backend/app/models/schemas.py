"""Pydantic schemas and validation models for StatPulse API."""
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, model_validator


# ============================================================================
# Generic Response Model
# ============================================================================
class APIResponse(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None


# ============================================================================
# Calculator Schemas
# ============================================================================
class PowerCurvePoint(BaseModel):
    sample_size: int
    power: float


class MDECurvePoint(BaseModel):
    mde_relative: float
    sample_size: int


class SampleSizeRequest(BaseModel):
    metric_type: Literal["proportion", "continuous"] = Field(
        default="proportion",
        description="Тип метрики: proportion (CR) или continuous (ARPU)"
    )
    baseline_value: float = Field(
        ...,
        gt=0,
        description="Базовое значение (например, 0.05 для 5% CR или 100 для ARPU)"
    )
    baseline_std: Optional[float] = Field(
        default=None,
        gt=0,
        description="Стандартное отклонение (обязательно для непрерывных метрик)"
    )
    mde_relative: float = Field(
        ...,
        gt=0,
        le=5.0,
        description="Относительный минимальный детектируемый эффект (например, 0.10 для +10%)"
    )
    alpha: float = Field(
        default=0.05,
        gt=0.0001,
        lt=0.5,
        description="Уровень значимости (ошибка I рода)"
    )
    power: float = Field(
        default=0.80,
        gt=0.50,
        lt=0.9999,
        description="Статистическая мощность (1 - Beta)"
    )
    alternative: Literal["two-sided", "larger", "smaller"] = Field(
        default="two-sided",
        description="Направление гипотезы"
    )
    daily_traffic_per_group: Optional[int] = Field(
        default=None,
        gt=0,
        description="Дневной трафик на группу для оценки срока теста"
    )

    @model_validator(mode="after")
    def validate_params(self):
        if self.metric_type == "proportion":
            if self.baseline_value >= 1.0:
                raise ValueError("Базовая конверсия (baseline_value) должна быть строго меньше 1.0 (например, 0.05 для 5%)")
            target = self.baseline_value * (1.0 + self.mde_relative)
            if target >= 1.0:
                raise ValueError(f"Целевая конверсия ({target:.4f}) превышает 1.0. Уменьшите базовое значение или MDE.")
        elif self.metric_type == "continuous":
            if self.baseline_std is None or self.baseline_std <= 0:
                raise ValueError("Стандартное отклонение (baseline_std) обязательно для непрерывных метрик и должно быть > 0.")
        return self


class SampleSizeResponseData(BaseModel):
    sample_size_per_group: int
    total_sample_size: int
    baseline_value: float
    target_value: float
    absolute_mde: float
    relative_mde: float
    alpha: float
    power: float
    estimated_days: Optional[float] = None
    power_curve: List[PowerCurvePoint]
    mde_curve: List[MDECurvePoint]


class MDERequest(BaseModel):
    metric_type: Literal["proportion", "continuous"] = Field(default="proportion")
    sample_size_per_group: int = Field(..., gt=10, description="Размер выборки на группу")
    baseline_value: float = Field(..., gt=0)
    baseline_std: Optional[float] = Field(default=None, gt=0)
    alpha: float = Field(default=0.05, gt=0.0001, lt=0.5)
    power: float = Field(default=0.80, gt=0.50, lt=0.9999)
    alternative: Literal["two-sided", "larger", "smaller"] = Field(default="two-sided")

    @model_validator(mode="after")
    def validate_params(self):
        if self.metric_type == "proportion" and self.baseline_value >= 1.0:
            raise ValueError("Базовая конверсия должна быть строго меньше 1.0")
        if self.metric_type == "continuous" and (self.baseline_std is None or self.baseline_std <= 0):
            raise ValueError("Стандартное отклонение обязательно для непрерывных метрик")
        return self


class MDEResponseData(BaseModel):
    sample_size_per_group: int
    absolute_mde: float
    relative_mde: float
    baseline_value: float
    target_detectable_value: float


# ============================================================================
# A/A Calibration Simulation Schemas
# ============================================================================
class DistributionParams(BaseModel):
    proportion_p: float = Field(default=0.05, gt=0.0, lt=1.0)
    continuous_mean: float = Field(default=100.0, gt=0.0)
    continuous_std: float = Field(default=35.0, gt=0.0)
    skewness: float = Field(default=1.0, ge=0.0, le=4.0, description="Коэффициент скошенности")
    zero_inflation_rate: float = Field(default=0.0, ge=0.0, le=0.95, description="Доля пользователей без покупок (нулей)")
    outliers_rate: float = Field(default=0.0, ge=0.0, le=0.10, description="Доля аномальных выбросов")


class AACalibrationRequest(BaseModel):
    sample_size_per_group: int = Field(default=1000, ge=50, le=50000)
    iterations: int = Field(default=1000, ge=100, le=3000)
    metric_type: Literal["proportion", "continuous"] = Field(default="continuous")
    distribution_params: DistributionParams = Field(default_factory=DistributionParams)
    alpha: float = Field(default=0.05, gt=0.001, lt=0.3)
    test_method: Literal["welch_ttest", "mann_whitney", "proportions_ztest"] = Field(default="welch_ttest")


class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    count: int
    density: float


class AACalibrationResponseData(BaseModel):
    iterations: int
    nominal_alpha: float
    empirical_fpr: float
    standard_error_fpr: float
    ci_fpr_lower: float
    ci_fpr_upper: float
    is_calibrated: bool
    calibration_verdict: str
    p_value_histogram: List[HistogramBin]


# ============================================================================
# A/B Experiment Simulation Schemas
# ============================================================================
class ABSimulationRequest(BaseModel):
    sample_size_per_group: int = Field(default=3000, ge=50, le=100000)
    metric_type: Literal["proportion", "continuous"] = Field(default="continuous")
    baseline_value: float = Field(default=100.0, gt=0.0)
    baseline_std: float = Field(default=35.0, gt=0.0)
    true_effect_relative: float = Field(default=0.05, ge=-0.80, le=2.0)
    skewness: float = Field(default=1.0, ge=0.0, le=4.0)
    zero_inflation_rate: float = Field(default=0.10, ge=0.0, le=0.90)
    outliers_rate: float = Field(default=0.01, ge=0.0, le=0.10)
    alpha: float = Field(default=0.05, gt=0.001, lt=0.3)


class GroupSummary(BaseModel):
    sample_size: int
    mean: float
    std: float
    median: float
    p25: float
    p75: float
    zeros_count: int
    zeros_fraction: float


class EffectSummary(BaseModel):
    absolute_difference: float
    relative_lift: float
    relative_lift_pct: str


class TestResult(BaseModel):
    statistic: float
    p_value: float
    is_significant: bool
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None


class BusinessVerdict(BaseModel):
    status: Literal[
        "STATISTICALLY_SIGNIFICANT_POSITIVE",
        "STATISTICALLY_SIGNIFICANT_NEGATIVE",
        "INCONCLUSIVE",
        "UNDERPOWERED"
    ]
    badge_variant: Literal["success", "destructive", "warning", "secondary"]
    title: str
    description: str


class ABSimulationResponseData(BaseModel):
    metric_type: str
    group_a_summary: GroupSummary
    group_b_summary: GroupSummary
    effect: EffectSummary
    tests: Dict[str, TestResult]
    business_verdict: BusinessVerdict
    distribution_samples: Dict[str, Any]
