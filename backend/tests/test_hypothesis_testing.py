"""Unit tests for hypothesis testing module."""
import numpy as np
from app.analytics.hypothesis_testing import (
    run_proportions_ztest,
    run_welch_ttest,
    run_mann_whitney,
    evaluate_business_verdict
)


def test_proportions_ztest_significant():
    rng = np.random.default_rng(42)
    sample_a = rng.binomial(1, 0.05, size=5000).astype(float)
    sample_b = rng.binomial(1, 0.07, size=5000).astype(float)

    res = run_proportions_ztest(sample_a, sample_b, alpha=0.05)
    assert res["is_significant"] is True
    assert res["p_value"] < 0.01
    assert res["ci_lower"] > 0
    assert res["p_b"] > res["p_a"]


def test_proportions_ztest_insignificant():
    rng = np.random.default_rng(42)
    sample_a = rng.binomial(1, 0.05, size=2000).astype(float)
    sample_b = rng.binomial(1, 0.051, size=2000).astype(float)

    res = run_proportions_ztest(sample_a, sample_b, alpha=0.05)
    assert res["is_significant"] is False
    assert res["p_value"] > 0.05
    assert res["ci_lower"] < 0 < res["ci_upper"]


def test_welch_ttest_significant():
    rng = np.random.default_rng(42)
    sample_a = rng.normal(100, 15, size=2000)
    sample_b = rng.normal(105, 15, size=2000)

    res = run_welch_ttest(sample_a, sample_b, alpha=0.05)
    assert res["is_significant"] is True
    assert res["p_value"] < 0.001
    assert res["ci_lower"] > 0
    assert 4.0 <= res["ci_lower"] <= 6.0


def test_welch_ttest_insignificant():
    rng = np.random.default_rng(42)
    sample_a = rng.normal(100, 15, size=500)
    sample_b = rng.normal(100.1, 15, size=500)

    res = run_welch_ttest(sample_a, sample_b, alpha=0.05)
    assert res["is_significant"] is False
    assert res["p_value"] > 0.05
    assert res["ci_lower"] < 0 < res["ci_upper"]


def test_mann_whitney():
    rng = np.random.default_rng(42)
    sample_a = rng.exponential(scale=10.0, size=1000)
    sample_b = rng.exponential(scale=15.0, size=1000)

    res = run_mann_whitney(sample_a, sample_b, alpha=0.05)
    assert res["is_significant"] is True
    assert res["p_value"] < 0.001


def test_business_verdict():
    welch_sig = {"is_significant": True, "p_value": 0.001}
    mw_sig = {"is_significant": True, "p_value": 0.001}

    verdict_pos = evaluate_business_verdict(welch_sig, relative_lift=0.05, secondary_test_res=mw_sig)
    assert verdict_pos["status"] == "STATISTICALLY_SIGNIFICANT_POSITIVE"
    assert verdict_pos["badge_variant"] == "success"

    verdict_neg = evaluate_business_verdict(welch_sig, relative_lift=-0.05, secondary_test_res=mw_sig)
    assert verdict_neg["status"] == "STATISTICALLY_SIGNIFICANT_NEGATIVE"
    assert verdict_neg["badge_variant"] == "destructive"
