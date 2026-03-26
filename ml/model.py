"""Layer 2 model loading and prediction helpers."""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

try:
    from .config import ENCODER_PATH, FEATURE_COLUMNS, LOW_CONFIDENCE_THRESHOLD, MODEL_PATH, SCALER_PATH
except ImportError:  # pragma: no cover
    from config import ENCODER_PATH, FEATURE_COLUMNS, LOW_CONFIDENCE_THRESHOLD, MODEL_PATH, SCALER_PATH  # type: ignore

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def load_model():
    """Load model, scaler and label encoder once per process."""
    model_file = Path(MODEL_PATH)
    scaler_file = Path(SCALER_PATH)
    encoder_file = Path(ENCODER_PATH)

    missing = [path for path in [model_file, scaler_file, encoder_file] if not path.exists()]
    if missing:
        missing_display = ", ".join(str(path) for path in missing)
        raise FileNotFoundError(f"Missing model artifact(s): {missing_display}. Run train_model.py first.")

    model = joblib.load(model_file)
    scaler = joblib.load(scaler_file)
    encoder = joblib.load(encoder_file)
    logger.info("Model loaded: %s crop classes", len(encoder.classes_))
    return model, scaler, encoder


def _to_feature_array(features: dict) -> np.ndarray:
    return np.array([[float(features[column]) for column in FEATURE_COLUMNS]], dtype=float)


def predict_probability_distribution(features: dict) -> list[dict]:
    """Return full crop probability distribution sorted descending."""
    model, scaler, encoder = load_model()
    array = _to_feature_array(features)
    frame = pd.DataFrame(array, columns=FEATURE_COLUMNS)
    scaled = scaler.transform(frame)
    probabilities = model.predict_proba(scaled)[0]
    classes = encoder.inverse_transform(np.arange(len(probabilities)))

    rows = [
        {"crop": str(crop).lower(), "ml_confidence": float(prob)}
        for crop, prob in zip(classes, probabilities)
    ]
    rows.sort(key=lambda row: row["ml_confidence"], reverse=True)

    if rows and rows[0]["ml_confidence"] < LOW_CONFIDENCE_THRESHOLD:
        logger.warning("Low confidence prediction scenario. Top confidence=%.3f", rows[0]["ml_confidence"])

    return rows


def predict_top_crops(features: dict, top_n: int = 5) -> list[dict]:
    """Return top-N crop candidates with ML confidence."""
    distribution = predict_probability_distribution(features)
    return distribution[:top_n]


def get_all_crop_names() -> list[str]:
    """Expose all crop classes known to the trained model."""
    _, _, encoder = load_model()
    return [str(crop).lower() for crop in encoder.classes_]
