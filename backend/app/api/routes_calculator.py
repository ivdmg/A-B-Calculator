"""Calculator API endpoints: Sample Size & MDE computation."""
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    APIResponse,
    SampleSizeRequest,
    SampleSizeResponseData,
    MDERequest,
    MDEResponseData,
    PowerCurvePoint,
    MDECurvePoint
)
from app.analytics.sample_size import (
    calculate_sample_size_proportion,
    calculate_sample_size_continuous,
    calculate_mde_proportion,
    calculate_mde_continuous,
    generate_power_curve,
    generate_mde_curve
)

router = APIRouter(prefix="/calculator", tags=["Calculator"])


@router.post("/sample-size", response_model=APIResponse)
async def calculate_sample_size(req: SampleSizeRequest):
    """
    Computes required sample size per variant, total sample size, estimated duration,
    and returns curve coordinates for power and MDE charts.
    """
    try:
        if req.metric_type == "proportion":
            n_per_group, delta, target_val = calculate_sample_size_proportion(
                p1=req.baseline_value,
                mde_relative=req.mde_relative,
                alpha=req.alpha,
                power=req.power,
                alternative=req.alternative
            )
        else:
            n_per_group, delta, target_val = calculate_sample_size_continuous(
                mean=req.baseline_value,
                std=req.baseline_std,  # validated non-null by Pydantic
                mde_relative=req.mde_relative,
                alpha=req.alpha,
                power=req.power,
                alternative=req.alternative
            )

        total_sample = n_per_group * 2
        estimated_days = None
        if req.daily_traffic_per_group and req.daily_traffic_per_group > 0:
            estimated_days = round(n_per_group / req.daily_traffic_per_group, 2)

        power_curve_raw = generate_power_curve(
            metric_type=req.metric_type,
            baseline_value=req.baseline_value,
            baseline_std=req.baseline_std,
            mde_relative=req.mde_relative,
            req_n=n_per_group,
            alpha=req.alpha,
            alternative=req.alternative
        )

        mde_curve_raw = generate_mde_curve(
            metric_type=req.metric_type,
            baseline_value=req.baseline_value,
            baseline_std=req.baseline_std,
            current_mde_relative=req.mde_relative,
            alpha=req.alpha,
            power=req.power,
            alternative=req.alternative
        )

        resp_data = SampleSizeResponseData(
            sample_size_per_group=n_per_group,
            total_sample_size=total_sample,
            baseline_value=req.baseline_value,
            target_value=round(target_val, 6),
            absolute_mde=round(delta, 6),
            relative_mde=req.mde_relative,
            alpha=req.alpha,
            power=req.power,
            estimated_days=estimated_days,
            power_curve=[PowerCurvePoint(**pt) for pt in power_curve_raw],
            mde_curve=[MDECurvePoint(**pt) for pt in mde_curve_raw]
        )

        return APIResponse(success=True, data=resp_data.model_dump())

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mde", response_model=APIResponse)
async def calculate_mde(req: MDERequest):
    """
    Computes minimum detectable effect (MDE) for a fixed sample size.
    """
    try:
        if req.metric_type == "proportion":
            delta, rel_mde, target_val = calculate_mde_proportion(
                p1=req.baseline_value,
                n_per_group=req.sample_size_per_group,
                alpha=req.alpha,
                power=req.power,
                alternative=req.alternative
            )
        else:
            delta, rel_mde, target_val = calculate_mde_continuous(
                mean=req.baseline_value,
                std=req.baseline_std,
                n_per_group=req.sample_size_per_group,
                alpha=req.alpha,
                power=req.power,
                alternative=req.alternative
            )

        resp_data = MDEResponseData(
            sample_size_per_group=req.sample_size_per_group,
            absolute_mde=round(delta, 6),
            relative_mde=round(rel_mde, 6),
            baseline_value=req.baseline_value,
            target_detectable_value=round(target_val, 6)
        )

        return APIResponse(success=True, data=resp_data.model_dump())

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
