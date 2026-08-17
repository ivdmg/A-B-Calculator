"""Main FastAPI application for StatPulse: Interactive A/B Testing & Experimentation Engine."""
import sys
from pathlib import Path
import logging

# Ensure backend directory is in sys.path so imports work regardless of CWD
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes_calculator import router as calculator_router
from app.api.routes_simulation import router as simulation_router
from app.api.routes_analysis import router as analysis_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("statpulse")

app = FastAPI(
    title="StatPulse Engine API",
    description="Interactive A/B Testing, Sample Size/MDE calculation, A/A Calibration, Hypothesis Testing & CSV Analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": {
                "code": "REQUEST_ERROR",
                "message": str(exc),
                "path": str(request.url)
            }
        }
    )


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "StatPulse Engine",
        "version": "1.0.0"
    }


# Include API routers under /api/v1
app.include_router(calculator_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=str(backend_dir))
