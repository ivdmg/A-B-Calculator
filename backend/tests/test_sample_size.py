"""Unit tests for sample size and MDE analytics module."""
import pytest
from app.analytics.sample_size import (
    calculate_sample_size_proportion,
    calculate_sample_size_continuous,
    calculate_mde_proportion,
    calculate_mde_continuous,
    calculate_power_for_n,
    generate_power_curve,
    generate_mde_curve
)


def test_calculate_sample_size_proportion():
    # Benchmark: Baseline 5% CR, 10% relative MDE (+0.5% abs), alpha=0.05, power=0.80
    n, delta, p2 = calculate_sample_size_proportion(p1=0.05, mde_relative=0.10, alpha=0.05, power=0.80)
    assert 29000 <= n <= 33000
    assert abs(delta - 0.005) < 1e-6
    assert abs(p2 - 0.055) < 1e-6


def test_calculate_sample_size_continuous():
    # Mean 100, Std 30, relative MDE 5% (delta=5), alpha=0.05, power=0.80
    n, delta, target = calculate_sample_size_continuous(mean=100.0, std=30.0, mde_relative=0.05, alpha=0.05, power=0.80)
    assert 500 <= n <= 650
    assert abs(delta - 5.0) < 1e-6
    assert abs(target - 105.0) < 1e-6


def test_mde_inversion():
    # Continuous MDE inversion
    n_group = 1000
    delta, rel_mde, target = calculate_mde_continuous(mean=100.0, std=30.0, n_per_group=n_group, alpha=0.05, power=0.80)
    # Check sample size recalculated with this MDE produces ~ 1000
    recalculated_n, _, _ = calculate_sample_size_continuous(mean=100.0, std=30.0, mde_relative=rel_mde, alpha=0.05, power=0.80)
    assert abs(recalculated_n - n_group) <= 5


def test_power_calculation():
    # For exactly required N, power should be close to 80%
    n, delta, _ = calculate_sample_size_continuous(mean=100.0, std=30.0, mde_relative=0.05, alpha=0.05, power=0.80)
    pwr = calculate_power_for_n(delta=delta, std_pooled=30.0, n_per_group=n, alpha=0.05)
    assert abs(pwr - 0.80) < 0.03


def test_power_and_mde_curves():
    p_curve = generate_power_curve("proportion", baseline_value=0.05, baseline_std=None, mde_relative=0.10, req_n=30000)
    assert len(p_curve) > 10
    assert all("sample_size" in pt and "power" in pt for pt in p_curve)

    mde_curve = generate_mde_curve("proportion", baseline_value=0.05, baseline_std=None, current_mde_relative=0.10)
    assert len(mde_curve) > 5
    assert all("mde_relative" in pt and "sample_size" in pt for pt in mde_curve)
