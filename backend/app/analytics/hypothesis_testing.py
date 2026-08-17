"""Hypothesis testing engine: Z-test for proportions, Welch's t-test, Mann-Whitney U."""
import math
from typing import Dict, Any, Optional
import numpy as np
from scipy import stats


def run_proportions_ztest(
    sample_a: np.ndarray,
    sample_b: np.ndarray,
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Computes two-sample Z-test for difference in proportions (CR/CTR).
    
    H0: p_B = p_A vs H1: p_B != p_A
    Uses pooled proportion for Z-score standard error and unpooled variance for CI.
    """
    n_a, n_b = len(sample_a), len(sample_b)
    success_a = int(np.sum(sample_a == 1))
    success_b = int(np.sum(sample_b == 1))

    p_a = success_a / n_a if n_a > 0 else 0.0
    p_b = success_b / n_b if n_b > 0 else 0.0
    diff = p_b - p_a

    # Pooled proportion under H0
    p_pool = (success_a + success_b) / (n_a + n_b) if (n_a + n_b) > 0 else 0.0
    se_pool = math.sqrt(p_pool * (1.0 - p_pool) * (1.0 / n_a + 1.0 / n_b)) if 0.0 < p_pool < 1.0 else 0.0

    if se_pool <= 1e-12:
        return {
            "statistic": 0.0,
            "p_value": 1.0,
            "is_significant": False,
            "ci_lower": float(diff),
            "ci_upper": float(diff),
            "p_a": round(float(p_a), 4),
            "p_b": round(float(p_b), 4),
            "diff": round(float(diff), 4)
        }

    z_stat = diff / se_pool
    p_val = float(2.0 * (1.0 - stats.norm.cdf(abs(z_stat))))

    # Unpooled standard error for confidence interval
    se_unpooled = math.sqrt((p_a * (1.0 - p_a) / n_a) + (p_b * (1.0 - p_b) / n_b))
    z_crit = float(stats.norm.ppf(1.0 - alpha / 2.0))
    ci_lower = diff - z_crit * se_unpooled
    ci_upper = diff + z_crit * se_unpooled

    return {
        "statistic": round(float(z_stat), 4),
        "p_value": float(p_val),
        "is_significant": bool(p_val < alpha),
        "ci_lower": round(float(ci_lower), 4),
        "ci_upper": round(float(ci_upper), 4),
        "p_a": round(float(p_a), 4),
        "p_b": round(float(p_b), 4),
        "diff": round(float(diff), 4)
    }


def run_welch_ttest(
    sample_a: np.ndarray,
    sample_b: np.ndarray,
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Computes Welch's Two-Sample t-Test with unequal variances and Satterthwaite degrees of freedom.
    """
    n_a, n_b = len(sample_a), len(sample_b)
    mean_a, mean_b = float(np.mean(sample_a)), float(np.mean(sample_b))
    var_a, var_b = float(np.var(sample_a, ddof=1)), float(np.var(sample_b, ddof=1))
    
    diff = mean_b - mean_a
    se_diff = math.sqrt(var_a / n_a + var_b / n_b)

    if se_diff <= 1e-12:
        return {
            "statistic": 0.0,
            "p_value": 1.0,
            "is_significant": False,
            "ci_lower": float(diff),
            "ci_upper": float(diff),
            "degrees_of_freedom": n_a + n_b - 2
        }

    # Satterthwaite degrees of freedom
    num_df = (var_a / n_a + var_b / n_b) ** 2
    den_df = ((var_a / n_a) ** 2) / (n_a - 1) + ((var_b / n_b) ** 2) / (n_b - 1)
    df = num_df / max(den_df, 1e-12)

    t_stat, p_val = stats.ttest_ind(sample_b, sample_a, equal_var=False)

    t_crit = float(stats.t.ppf(1.0 - alpha / 2.0, df))
    ci_lower = diff - t_crit * se_diff
    ci_upper = diff + t_crit * se_diff

    return {
        "statistic": round(float(t_stat), 4),
        "p_value": float(p_val),
        "is_significant": bool(p_val < alpha),
        "ci_lower": round(float(ci_lower), 4),
        "ci_upper": round(float(ci_upper), 4),
        "degrees_of_freedom": round(float(df), 2)
    }


def run_mann_whitney(
    sample_a: np.ndarray,
    sample_b: np.ndarray,
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Computes Mann-Whitney U-test for stochastic dominance / non-parametric comparison.
    """
    try:
        res = stats.mannwhitneyu(sample_b, sample_a, alternative="two-sided")
        stat = float(res.statistic)
        p_val = float(res.pvalue)
    except Exception:
        stat = 0.0
        p_val = 1.0

    return {
        "statistic": round(stat, 2),
        "p_value": float(p_val),
        "is_significant": bool(p_val < alpha),
        "ci_lower": None,
        "ci_upper": None
    }


def evaluate_business_verdict(
    main_test_res: Dict[str, Any],
    relative_lift: float,
    secondary_test_res: Optional[Dict[str, Any]] = None,
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Formulates a clear product-oriented decision verdict in Russian.
    """
    is_main_sig = main_test_res["is_significant"]
    is_sec_sig = secondary_test_res["is_significant"] if secondary_test_res is not None else None

    # If both tests exist and agree, or single test is significant
    if is_main_sig and (is_sec_sig is True or is_sec_sig is None):
        if relative_lift > 0:
            return {
                "status": "STATISTICALLY_SIGNIFICANT_POSITIVE",
                "badge_variant": "success",
                "title": "Различия статистически значимы: катим в прод!",
                "description": (
                    f"Тестовая группа B показала подтвержденный прирост метрики ({relative_lift:+.2%}) "
                    f"при уровне значимости α={alpha:.2f} (p-value = {main_test_res['p_value']:.4e} < {alpha}). "
                    f"95% доверительный интервал не пересекает ноль."
                )
            }
        else:
            return {
                "status": "STATISTICALLY_SIGNIFICANT_NEGATIVE",
                "badge_variant": "destructive",
                "title": "Обнаружена значимая деградация метрики: не выкатывать!",
                "description": (
                    f"Тестовая группа вызывает статистически значимое падение метрики ({relative_lift:+.2%}, "
                    f"p-value = {main_test_res['p_value']:.4e} < {alpha}). "
                    f"Рекомендация: отклонить гипотезу и откатить изменения."
                )
            }
    elif is_main_sig != is_sec_sig and is_sec_sig is not None:
        return {
            "status": "INCONCLUSIVE",
            "badge_variant": "warning",
            "title": "Пограничный результат / Расхождение критериев",
            "description": (
                f"Критерии дали разные выводы (основной тест p={main_test_res['p_value']:.4f}, "
                f"дополнительный тест p={secondary_test_res['p_value']:.4f}). "
                f"Это бывает из-за единичных выбросов или асимметрии данных. Рекомендуется продлить тест или очистить выбросы."
            )
        }
    else:
        return {
            "status": "INCONCLUSIVE",
            "badge_variant": "secondary",
            "title": "Статистически значимых различий не обнаружено",
            "description": (
                f"Недостаточно данных для отклонения нулевой гипотезы H₀ (наблюдаемый lift {relative_lift:+.2%}, "
                f"p-value = {main_test_res['p_value']:.4f} >= {alpha}). "
                f"Разница средних находится в пределах случайных колебаний."
            )
        }
