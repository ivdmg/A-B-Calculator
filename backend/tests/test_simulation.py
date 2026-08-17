"""Unit tests for simulation module."""
import numpy as np
from app.analytics.simulation import generate_synthetic_sample, run_aa_monte_carlo


def test_generate_synthetic_sample():
    # Test proportion
    sample_prop = generate_synthetic_sample(n=1000, metric_type="proportion", proportion_p=0.10)
    assert len(sample_prop) == 1000
    assert set(np.unique(sample_prop)).issubset({0.0, 1.0})
    assert 0.07 <= np.mean(sample_prop) <= 0.13

    # Test continuous with zero inflation
    sample_cont = generate_synthetic_sample(
        n=1000, metric_type="continuous", mean=100, std=30, zero_inflation_rate=0.25
    )
    assert len(sample_cont) == 1000
    zeros = np.sum(sample_cont == 0)
    assert 200 <= zeros <= 300


def test_run_aa_monte_carlo():
    res = run_aa_monte_carlo(
        n_per_group=500,
        iterations=300,
        metric_type="continuous",
        skewness=0.5,
        alpha=0.05,
        test_method="welch_ttest"
    )
    assert res["iterations"] == 300
    assert 0.01 <= res["empirical_fpr"] <= 0.10
    assert len(res["p_value_histogram"]) == 20
    assert "calibration_verdict" in res
