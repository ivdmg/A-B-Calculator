"""Synthetic data generator and Monte-Carlo A/A simulation engine."""
import math
from typing import Dict, Any, List, Optional
import numpy as np
from scipy import stats

from app.analytics.hypothesis_testing import run_welch_ttest, run_mann_whitney, run_proportions_ztest


def generate_synthetic_sample(
    n: int,
    metric_type: str = "continuous",
    mean: float = 100.0,
    std: float = 35.0,
    proportion_p: float = 0.05,
    skewness: float = 1.0,
    zero_inflation_rate: float = 0.0,
    outliers_rate: float = 0.0,
    effect_relative: float = 0.0,
    random_state: Optional[int] = None
) -> np.ndarray:
    """
    Generates a realistic synthetic sample for binary (CR) or continuous metrics (ARPU/AOV).
    """
    rng = np.random.default_rng(random_state)
    
    if metric_type == "proportion":
        p_eff = min(max(proportion_p * (1.0 + effect_relative), 1e-5), 1.0 - 1e-5)
        return rng.binomial(1, p_eff, size=n).astype(float)

    # Continuous metric with effect
    target_mean = mean * (1.0 + effect_relative)
    
    if skewness <= 0.05:
        sample = rng.normal(loc=target_mean, scale=std, size=n)
        sample = np.clip(sample, 0, None)
    else:
        sigma_log = min(max(skewness * 0.6, 0.1), 2.2)
        mu_log = math.log(max(target_mean, 1e-4)) - (sigma_log ** 2) / 2.0
        sample = rng.lognormal(mean=mu_log, sigma=sigma_log, size=n)

    if zero_inflation_rate > 0.0:
        zero_mask = rng.binomial(1, zero_inflation_rate, size=n).astype(bool)
        sample[zero_mask] = 0.0

    if outliers_rate > 0.0:
        outlier_mask = rng.binomial(1, outliers_rate, size=n).astype(bool)
        num_outliers = int(np.sum(outlier_mask))
        if num_outliers > 0:
            outlier_multipliers = rng.uniform(5.0, 15.0, size=num_outliers)
            sample[outlier_mask] = target_mean * outlier_multipliers

    return sample


def run_aa_monte_carlo(
    n_per_group: int,
    iterations: int = 1000,
    metric_type: str = "continuous",
    proportion_p: float = 0.05,
    mean: float = 100.0,
    std: float = 35.0,
    skewness: float = 1.0,
    zero_inflation_rate: float = 0.0,
    outliers_rate: float = 0.0,
    alpha: float = 0.05,
    test_method: str = "welch_ttest"
) -> Dict[str, Any]:
    """
    Runs K independent A/A experiments under H0 to evaluate empirical FPR and p-value uniformity.
    """
    p_values: List[float] = []
    rng = np.random.default_rng(42)

    for _ in range(iterations):
        seed_a = int(rng.integers(1, 10000000))
        seed_b = int(rng.integers(1, 10000000))

        sample_a1 = generate_synthetic_sample(
            n=n_per_group,
            metric_type=metric_type,
            mean=mean,
            std=std,
            proportion_p=proportion_p,
            skewness=skewness,
            zero_inflation_rate=zero_inflation_rate,
            outliers_rate=outliers_rate,
            effect_relative=0.0,
            random_state=seed_a
        )
        sample_a2 = generate_synthetic_sample(
            n=n_per_group,
            metric_type=metric_type,
            mean=mean,
            std=std,
            proportion_p=proportion_p,
            skewness=skewness,
            zero_inflation_rate=zero_inflation_rate,
            outliers_rate=outliers_rate,
            effect_relative=0.0,
            random_state=seed_b
        )

        if metric_type == "proportion" or test_method == "proportions_ztest":
            z_res = run_proportions_ztest(sample_a1, sample_a2, alpha=alpha)
            p_val = z_res["p_value"]
        elif test_method == "mann_whitney":
            mw_res = run_mann_whitney(sample_a1, sample_a2, alpha=alpha)
            p_val = mw_res["p_value"]
        else:
            # Default: Welch t-test
            welch_res = run_welch_ttest(sample_a1, sample_a2, alpha=alpha)
            p_val = welch_res["p_value"]

        p_values.append(float(p_val))

    p_arr = np.array(p_values)
    empirical_fpr = float(np.mean(p_arr <= alpha))
    
    se_fpr = math.sqrt(alpha * (1.0 - alpha) / iterations)
    ci_fpr_lower = max(0.0, empirical_fpr - 1.96 * se_fpr)
    ci_fpr_upper = min(1.0, empirical_fpr + 1.96 * se_fpr)

    expected_lower = alpha - 2.2 * se_fpr
    expected_upper = alpha + 2.2 * se_fpr
    is_calibrated = bool(expected_lower <= empirical_fpr <= expected_upper)

    if is_calibrated:
        verdict = (
            f"Критерий корректно откалиброван: эмпирический FPR = {empirical_fpr:.1%} "
            f"соответствует норме α = {alpha:.1%}. Ложные тревоги под контролем."
        )
    elif empirical_fpr > expected_upper:
        verdict = (
            f"Завышение ошибки I рода (FPR = {empirical_fpr:.1%} > {alpha:.1%}). "
            f"Высокий риск ложноположительных побед из-за скошенности или нулей."
        )
    else:
        verdict = (
            f"Критерий консервативен: эмпирический FPR ({empirical_fpr:.1%}) ниже нормы α = {alpha:.1%}. "
            f"Снижается чувствительность к реальным изменениям."
        )

    num_bins = 20
    counts, bin_edges = np.histogram(p_arr, bins=num_bins, range=(0.0, 1.0))
    hist_bins = []
    for j in range(num_bins):
        hist_bins.append({
            "bin_start": round(float(bin_edges[j]), 2),
            "bin_end": round(float(bin_edges[j + 1]), 2),
            "count": int(counts[j]),
            "density": round(float(counts[j] / (iterations / num_bins)), 3)
        })

    return {
        "iterations": iterations,
        "nominal_alpha": alpha,
        "empirical_fpr": round(empirical_fpr, 4),
        "standard_error_fpr": round(se_fpr, 4),
        "ci_fpr_lower": round(ci_fpr_lower, 4),
        "ci_fpr_upper": round(ci_fpr_upper, 4),
        "is_calibrated": is_calibrated,
        "calibration_verdict": verdict,
        "p_value_histogram": hist_bins
    }
