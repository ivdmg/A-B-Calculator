"""Analysis API endpoint for Custom CSV Dataset Ingestion."""
from typing import Optional
import io
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.models.schemas import APIResponse
from app.analytics.custom_data import analyze_custom_dataframe

router = APIRouter(prefix="/analyze", tags=["Analysis"])


@router.post("/custom-data", response_model=APIResponse)
async def analyze_custom_data(
    file: UploadFile = File(...),
    group_col: str = Form(...),
    metric_col: str = Form(...),
    user_id_col: Optional[str] = Form(None),
    alpha: float = Form(0.05)
):
    """
    Parses an uploaded CSV dataset, verifies group assignments, automatically determines
    metric type (CR proportions vs continuous ARPU/AOV), and runs appropriate statistical tests.
    """
    try:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except Exception:
            try:
                df = pd.read_csv(io.BytesIO(contents), sep=";")
            except Exception:
                df = pd.read_csv(io.BytesIO(contents), sep="\t")

        cleaned_user_id = user_id_col.strip() if user_id_col and user_id_col.strip() else None

        analysis_result = analyze_custom_dataframe(
            df=df,
            group_col=group_col.strip(),
            metric_col=metric_col.strip(),
            user_id_col=cleaned_user_id,
            alpha=alpha
        )

        return APIResponse(success=True, data=analysis_result)

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
