"""Sample size and MDE analytical calculations for proportions and continuous metrics."""
import math
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from scipy import stats


def z_value(prob: float) -> float:
    """Standard normal quantile function."""
    return float(stats.norm.ppf(prob))


def calculate_sample_size_proportion(
    p1: float,
    mde_relative: float,
    alpha: float = 0.05,
    power: float = 0.80,
    alternative: str = "two-sided"
) -> Tuple[int, float, float]:
    """
    Calculates sample size per variant for a proportion metric (e.g. CR, CTR).
    
    Formula:
      N = (Z_{1-alpha/2} * sqrt(2 * p_bar * (1 - p_bar)) + Z_{1-beta} * sqrt(p1*(1-p1) + p2*(1-p2)))^2 / (p2 - p1)^2
    """
    p2 = p1 * (1.0 + mde_relative)
    p2 = min(max(p2, 1e-6), 1.0 - 1e-6)
    delta = abs(p2 - p1)
    if delta <= 1e-9:
        raise ValueError("MDE produces zero difference from baseline.")

    p_bar = (p1 + p2) / 2.0

    z_alpha = z_value(1.0 - alpha / 2.0) if alternative == "two-sided" else z_value(1.0 - alpha)
    z_beta = z_value(power)

    numerator = (
        z_alpha * math.sqrt(2.0 * p_bar * (1.0 - p_bar)) +
        z_beta * math.sqrt(p1 * (1.0 - p1) + p2 * (1.0 - p2))
    ) ** 2
    n = numerator / (delta ** 2)
    sample_size = int(math.ceil(n))
    return max(sample_size, 10), delta, p2


def calculate_sample_size_continuous(
    mean: float,
    std: float,
    mde_relative: float,
    alpha: float = 0.05,
    power: float = 0.80,
    alternative: str = "two-sided"
) -> Tuple[int, float, float]:
    """
    Calculates sample size per variant for a continuous metric (e.g. ARPU, AOV).
    
    Formula:
      N = 2 * (Z_{1-alpha/2} + Z_{1-beta})^2 * sigma^2 / (delta)^2
    """
    delta = abs(mean * mde_relative)
    if delta <= 1e-9:
        raise ValueError("MDE produces zero difference from baseline.")

    z_alpha = z_value(1.0 - alpha / 2.0) if alternative == "two-sided" else z_value(1.0 - alpha)
    z_beta = z_value(power)

    n = 2.0 * ((z_alpha + z_beta) ** 2) * (std ** 2) / (delta ** 2)
    sample_size = int(math.ceil(n))
    target_value = mean * (1.0 + mde_relative)
    return max(sample_size, 10), delta, target_value


def calculate_mde_proportion(
    p1: float,
    n_per_group: int,
    alpha: float = 0.05,
    power: float = 0.80,
    alternative: str = "two-sided"
) -> Tuple[float, float, float]:
    """
    Calculates minimum detectable absolute and relative effect for a fixed sample size.
    """
    z_alpha = z_value(1.0 - alpha / 2.0) if alternative == "two-sided" else z_value(1.0 - alpha)
    z_beta = z_value(power)

    # Initial approximation
    delta_approx = (z_alpha + z_beta) * math.sqrt(2.0 * p1 * (1.0 - p1) / n_per_group)
    
    # Newton/bisection refinement for exact variance match
    delta = delta_approx
    for _ in range(10):
        p2 = min(p1 + delta, 0.9999)
        p_bar = (p1 + p2) / 2.0
        denom = (
            z_alpha * math.sqrt(2.0 * p_bar * (1.0 - p_bar)) +
            z_beta * math.sqrt(p1 * (1.0 - p1) + p2 * (1.0 - p2))
        )
        new_delta = denom / math.sqrt(n_per_group)
        if abs(new_delta - delta) < 1e-7:
            break
        delta = new_delta

    target_p2 = p1 + delta
    relative_mde = delta / p1
    return delta, relative_mde, target_p2


def calculate_mde_continuous(
    mean: float,
    std: float,
    n_per_group: int,
    alpha: float = 0.05,
    power: float = 0.80,
    alternative: str = "two-sided"
) -> Tuple[float, float, float]:
    """
    Calculates continuous MDE given sample size per variant.
    """
    z_alpha = z_value(1.0 - alpha / 2.0) if alternative == "two-sided" else z_value(1.0 - alpha)
    z_beta = z_value(power)

    delta = (z_alpha + z_beta) * math.sqrt(2.0 * (std ** 2) / n_per_group)
    relative_mde = delta / mean
    target_value = mean + delta
    return delta, relative_mde, target_value


def calculate_power_for_n(
    delta: float,
    std_pooled: float,
    n_per_group: int,
    alpha: float = 0.05,
    alternative: str = "two-sided"
) -> float:
    """
    Calculates statistical power for an observed delta and sample size.
    """
    z_alpha = z_value(1.0 - alpha / 2.0) if alternative == "two-sided" else z_value(1.0 - alpha)
    se = std_pooled * math.sqrt(2.0 / n_per_group)
    if se <= 0:
        return 1.0
    z_score = abs(delta) / se - z_alpha
    return float(stats.norm.cdf(z_score))


def generate_power_curve(
    metric_type: str,
    baseline_value: float,
    baseline_std: Optional[float],
    mde_relative: float,
    req_n: int,
    alpha: float = 0.05,
    alternative: str = "two-sided"
) -> List[Dict[str, Any]]:
    """
    Generates data points for N vs Power curve.
    """
    min_n = max(50, int(req_n * 0.1))
    max_n = int(req_n * 2.2)
    sample_sizes = np.linspace(min_n, max_n, 25, dtype=int).tolist()
    
    if req_n not in sample_sizes:
        sample_sizes.append(req_n)
        sample_sizes.sort()

    points = []
    if metric_type == "proportion":
        p1 = baseline_value
        p2 = p1 * (1.0 + mde_relative)
        delta = abs(p2 - p1)
        std_pooled = math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / 2.0)
    else:
        delta = abs(baseline_value * mde_relative)
        std_pooled = baseline_std if baseline_std else baseline_value * 0.3

    for n in sample_sizes:
        pwr = calculate_power_for_n(delta, std_pooled, n, alpha, alternative)
        points.append({"sample_size": int(n), "power": round(float(pwr), 4)})

    return points


def generate_mde_curve(
    metric_type: str,
    baseline_value: float,
    baseline_std: Optional[float],
    current_mde_relative: float,
    alpha: float = 0.05,
    power: float = 0.80,
    alternative: str = "two-sided"
) -> List[Dict[str, Any]]:
    """
    Generates data points for MDE vs Sample Size curve.
    """
    mde_ratios = [0.02, 0.03, 0.05, 0.08, 0.10, 0.12, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]
    if current_mde_relative not in mde_ratios and 0.01 <= current_mde_relative <= 0.60:
        mde_ratios.append(current_mde_relative)
        mde_ratios.sort()

    points = []
    for mde in mde_ratios:
        try:
            if metric_type == "proportion":
                n, _, _ = calculate_sample_size_proportion(
                    baseline_value, mde, alpha, power, alternative
                )
            else:
                std = baseline_std if baseline_std else baseline_value * 0.3
                n, _, _ = calculate_sample_size_continuous(
                    baseline_value, std, mde, alpha, power, alternative
                )
            points.append({"mde_relative": round(mde, 4), "sample_size": n})
        except Exception:
            continue

    return points
