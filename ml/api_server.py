"""FastAPI server for SmartKrishi AI crop recommendation pipeline."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    from .config import API_HOST, API_PORT, CORS_ORIGINS
    from .model import load_model
    from .pipeline import get_recommendations
    from .schemas import PredictionRequest, PredictionResponse
except ImportError:  # pragma: no cover
    from config import API_HOST, API_PORT, CORS_ORIGINS  # type: ignore
    from model import load_model  # type: ignore
    from pipeline import get_recommendations  # type: ignore
    from schemas import PredictionRequest, PredictionResponse  # type: ignore

app = FastAPI(
    title="SmartKrishi AI API",
    description="Crop recommendation engine for Indian farmers",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """Accept exact InputForm.jsx payload and return top crop recommendations."""
    try:
        return get_recommendations(request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logging.exception("Prediction failed")
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": str(exc),
                "code": "PREDICTION_ERROR",
            },
        ) from exc


@app.get("/api/health")
async def health():
    """Simple health check that verifies model artifacts can be loaded."""
    try:
        _, _, encoder = load_model()
        return {
            "status": "healthy",
            "model_loaded": True,
            "crop_classes": len(encoder.classes_),
            "version": "1.0.0",
        }
    except Exception as exc:  # pragma: no cover
        return {
            "status": "degraded",
            "model_loaded": False,
            "error": str(exc),
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_server:app", host=API_HOST, port=API_PORT, reload=True)

