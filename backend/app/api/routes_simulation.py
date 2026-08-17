"""Simulation API endpoints: A/A Calibration and A/B Playground."""
from fastapi import APIRouter, HTTPException
import numpy as np

from app.models.schemas import (
    APIResponse,
    AACalibrationRequest,
    ABSimulationRequest,
    ABSimulationResponseData,
    GroupSummary,
    EffectSummary,
    TestResult,
    BusinessVerdict
)
from app.analytics.simulation import generate_synthetic_sample, run_aa_monte_carlo
from app.analytics.hypothesis_testing import (
    run_proportions_ztest,
    run_welch_ttest,
    run_mann_whitney,
    evaluate_business_verdict
)

router = APIRouter(prefix="/simulate", tags=["Simulate"])


@router.post("/aa-test", response_model=APIResponse)
async def simulate_aa_test(req: AACalibrationRequest):
    """
    Runs Monte-Carlo A/A simulations under H0 to evaluate empirical False Positive Rate (FPR)
    and p-value distribution histogram.
    """
    try:
        results = run_aa_monte_carlo(
            n_per_group=req.sample_size_per_group,
            iterations=req.iterations,
            metric_type=req.metric_type,
            proportion_p=req.distribution_params.proportion_p,
            mean=req.distribution_params.continuous_mean,
            std=req.distribution_params.continuous_std,
            skewness=req.distribution_params.skewness,
            zero_inflation_rate=req.distribution_params.zero_inflation_rate,
            outliers_rate=req.distribution_params.outliers_rate,
            alpha=req.alpha,
            test_method=req.test_method
        )
        return APIResponse(success=True, data=results)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ab-test", response_model=APIResponse)
async def simulate_ab_test(req: ABSimulationRequest):
    """
    Generates synthetic A/B experiment data, runs appropriate statistical criteria
    (Z-test for proportions, Welch t-test + Mann-Whitney for continuous metrics),
    and returns rich comparison with business verdict.
    """
    try:
        # Generate Control (A) and Treatment (B)
        sample_a = generate_synthetic_sample(
            n=req.sample_size_per_group,
            metric_type=req.metric_type,
            mean=req.baseline_value,
            std=req.baseline_std,
            proportion_p=min(req.baseline_value, 0.99) if req.metric_type == "proportion" else 0.05,
            skewness=req.skewness,
            zero_inflation_rate=req.zero_inflation_rate,
            outliers_rate=req.outliers_rate,
            effect_relative=0.0
        )

        sample_b = generate_synthetic_sample(
            n=req.sample_size_per_group,
            metric_type=req.metric_type,
            mean=req.baseline_value,
            std=req.baseline_std,
            proportion_p=min(req.baseline_value, 0.99) if req.metric_type == "proportion" else 0.05,
            skewness=req.skewness,
            zero_inflation_rate=req.zero_inflation_rate,
            outliers_rate=req.outliers_rate,
            effect_relative=req.true_effect_relative
        )

        # Summaries
        mean_a, mean_b = float(np.mean(sample_a)), float(np.mean(sample_b))
        std_a = float(np.std(sample_a, ddof=1)) if len(sample_a) > 1 else 0.0
        std_b = float(np.std(sample_b, ddof=1)) if len(sample_b) > 1 else 0.0
        median_a, median_b = float(np.median(sample_a)), float(np.median(sample_b))
        zeros_a = int(np.sum(sample_a == 0))
        zeros_b = int(np.sum(sample_b == 0))

        group_a_summary = GroupSummary(
            sample_size=len(sample_a),
            mean=round(mean_a, 4),
            std=round(std_a, 4),
            median=round(median_a, 4),
            p25=round(float(np.percentile(sample_a, 25)), 4),
            p75=round(float(np.percentile(sample_a, 75)), 4),
            zeros_count=zeros_a,
            zeros_fraction=round(zeros_a / len(sample_a), 4)
        )

        group_b_summary = GroupSummary(
            sample_size=len(sample_b),
            mean=round(mean_b, 4),
            std=round(std_b, 4),
            median=round(median_b, 4),
            p25=round(float(np.percentile(sample_b, 25)), 4),
            p75=round(float(np.percentile(sample_b, 75)), 4),
            zeros_count=zeros_b,
            zeros_fraction=round(zeros_b / len(sample_b), 4)
        )

        diff = mean_b - mean_a
        rel_lift = diff / mean_a if abs(mean_a) > 1e-9 else 0.0
        effect_summary = EffectSummary(
            absolute_difference=round(diff, 4),
            relative_lift=round(rel_lift, 4),
            relative_lift_pct=f"{rel_lift:+.2%}"
        )

        # Statistical tests
        tests = {}
        if req.metric_type == "proportion":
            z_res = run_proportions_ztest(sample_a, sample_b, alpha=req.alpha)
            tests["proportions_ztest"] = TestResult(**z_res)
            verdict_data = evaluate_business_verdict(z_res, rel_lift, alpha=req.alpha)
        else:
            welch_res = run_welch_ttest(sample_a, sample_b, alpha=req.alpha)
            mw_res = run_mann_whitney(sample_a, sample_b, alpha=req.alpha)
            tests["welch_ttest"] = TestResult(**welch_res)
            tests["mann_whitney"] = TestResult(**mw_res)
            verdict_data = evaluate_business_verdict(welch_res, rel_lift, secondary_test_res=mw_res, alpha=req.alpha)

        verdict = BusinessVerdict(**verdict_data)

        # Subsamples for sample distribution comparison
        subsample_size = min(len(sample_a), 300)
        idx_a = np.random.choice(len(sample_a), size=subsample_size, replace=False)
        idx_b = np.random.choice(len(sample_b), size=subsample_size, replace=False)

        resp_data = ABSimulationResponseData(
            metric_type=req.metric_type,
            group_a_summary=group_a_summary,
            group_b_summary=group_b_summary,
            effect=effect_summary,
            tests=tests,
            business_verdict=verdict,
            distribution_samples={
                "sample_a": sample_a[idx_a].tolist(),
                "sample_b": sample_b[idx_b].tolist()
            }
        )

        return APIResponse(success=True, data=resp_data.model_dump())

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
