"""Custom dataset ingestion, statistical validation, and automated A/B test analysis."""
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd

from app.analytics.hypothesis_testing import (
    run_welch_ttest,
    run_mann_whitney,
    run_proportions_ztest,
    evaluate_business_verdict
)


def analyze_custom_dataframe(
    df: pd.DataFrame,
    group_col: str,
    metric_col: str,
    user_id_col: Optional[str] = None,
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Performs full automated statistical analysis on a user-uploaded A/B test dataset.
    Automatically detects whether data is binary (proportions / CR) or continuous (ARPU).
    """
    if group_col not in df.columns:
        raise ValueError(f"Колонка группы '{group_col}' не найдена в файле.")
    if metric_col not in df.columns:
        raise ValueError(f"Колонка метрики '{metric_col}' не найдена в файле.")

    cols_to_use = [group_col, metric_col]
    if user_id_col and user_id_col in df.columns:
        cols_to_use.append(user_id_col)

    clean_df = df[cols_to_use].dropna().copy()
    if len(clean_df) < 10:
        raise ValueError("В датасете менее 10 корректных строк с данными.")

    # Identify groups
    groups = clean_df[group_col].astype(str).str.strip().unique()
    if len(groups) != 2:
        raise ValueError(f"Колонка группы должна содержать ровно 2 варианта (A/B), найдено {len(groups)}: {list(groups)[:5]}")

    # Determine Control (A) and Treatment (B)
    g1, g2 = str(groups[0]), str(groups[1])
    g1_lower, g2_lower = g1.lower(), g2.lower()
    
    if any(k in g1_lower for k in ["treat", "test", "b", "variant", "1"]):
        treatment_label, control_label = g1, g2
    elif any(k in g2_lower for k in ["treat", "test", "b", "variant", "1"]):
        treatment_label, control_label = g2, g1
    elif any(k in g1_lower for k in ["ctrl", "control", "a", "0", "base"]):
        control_label, treatment_label = g1, g2
    else:
        control_label, treatment_label = g1, g2

    control_df = clean_df[clean_df[group_col].astype(str).str.strip() == control_label]
    treatment_df = clean_df[clean_df[group_col].astype(str).str.strip() == treatment_label]

    try:
        sample_a = control_df[metric_col].to_numpy(dtype=float)
        sample_b = treatment_df[metric_col].to_numpy(dtype=float)
    except Exception:
        raise ValueError(f"Значения в колонке метрики '{metric_col}' должны быть числовыми (0/1 или непрерывные числа).")

    if len(sample_a) < 3 or len(sample_b) < 3:
        raise ValueError(f"Слишком мало наблюдений в одной из групп (Контроль: {len(sample_a)}, Тест: {len(sample_b)})")

    # Detect metric type: binary or continuous
    unique_vals = np.unique(np.concatenate([sample_a, sample_b]))
    is_binary = set(unique_vals).issubset({0.0, 1.0})
    metric_type = "proportion" if is_binary else "continuous"

    # Summary Stats
    mean_a, mean_b = float(np.mean(sample_a)), float(np.mean(sample_b))
    std_a = float(np.std(sample_a, ddof=1)) if len(sample_a) > 1 else 0.0
    std_b = float(np.std(sample_b, ddof=1)) if len(sample_b) > 1 else 0.0
    median_a, median_b = float(np.median(sample_a)), float(np.median(sample_b))
    zeros_a = int(np.sum(sample_a == 0))
    zeros_b = int(np.sum(sample_b == 0))

    group_a_summary = {
        "label": str(control_label),
        "sample_size": len(sample_a),
        "mean": round(mean_a, 4),
        "std": round(std_a, 4),
        "median": round(median_a, 4),
        "p25": round(float(np.percentile(sample_a, 25)), 4),
        "p75": round(float(np.percentile(sample_a, 75)), 4),
        "zeros_count": zeros_a,
        "zeros_fraction": round(zeros_a / len(sample_a), 4)
    }

    group_b_summary = {
        "label": str(treatment_label),
        "sample_size": len(sample_b),
        "mean": round(mean_b, 4),
        "std": round(std_b, 4),
        "median": round(median_b, 4),
        "p25": round(float(np.percentile(sample_b, 25)), 4),
        "p75": round(float(np.percentile(sample_b, 75)), 4),
        "zeros_count": zeros_b,
        "zeros_fraction": round(zeros_b / len(sample_b), 4)
    }

    diff = mean_b - mean_a
    rel_lift = diff / mean_a if abs(mean_a) > 1e-9 else 0.0

    tests: Dict[str, Any] = {}
    if is_binary:
        z_res = run_proportions_ztest(sample_a, sample_b, alpha=alpha)
        tests["proportions_ztest"] = z_res
        verdict = evaluate_business_verdict(z_res, rel_lift, alpha=alpha)
    else:
        welch_res = run_welch_ttest(sample_a, sample_b, alpha=alpha)
        mw_res = run_mann_whitney(sample_a, sample_b, alpha=alpha)
        tests["welch_ttest"] = welch_res
        tests["mann_whitney"] = mw_res
        verdict = evaluate_business_verdict(welch_res, rel_lift, secondary_test_res=mw_res, alpha=alpha)

    # Subsample for UI scatter/distribution
    max_pts = 300
    idx_a = np.random.choice(len(sample_a), size=min(len(sample_a), max_pts), replace=False)
    idx_b = np.random.choice(len(sample_b), size=min(len(sample_b), max_pts), replace=False)

    return {
        "metric_type": metric_type,
        "control_label": str(control_label),
        "treatment_label": str(treatment_label),
        "group_a_summary": group_a_summary,
        "group_b_summary": group_b_summary,
        "effect": {
            "absolute_difference": round(diff, 4),
            "relative_lift": round(rel_lift, 4),
            "relative_lift_pct": f"{rel_lift:+.2%}"
        },
        "tests": tests,
        "business_verdict": verdict,
        "sample_a_subsample": sample_a[idx_a].tolist(),
        "sample_b_subsample": sample_b[idx_b].tolist()
    }
