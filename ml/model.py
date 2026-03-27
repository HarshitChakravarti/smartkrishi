"""Model loading, inference safety, and training-profile helpers."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

try:
    from .config import (
        ENCODER_PATH,
        FEATURE_COLUMNS,
        FEATURE_NAME_ALIASES,
        FEATURE_ORDER_PATH,
        LOW_CONFIDENCE_THRESHOLD,
        MODEL_PATH,
        SCALER_PATH,
        TRAINING_PROFILES_PATH,
    )
    from .feature_engineering import BASE_FEATURES, compute_feature_map
except ImportError:  # pragma: no cover
    from config import (  # type: ignore
        ENCODER_PATH,
        FEATURE_COLUMNS,
        FEATURE_NAME_ALIASES,
        FEATURE_ORDER_PATH,
        LOW_CONFIDENCE_THRESHOLD,
        MODEL_PATH,
        SCALER_PATH,
        TRAINING_PROFILES_PATH,
    )
    from feature_engineering import BASE_FEATURES, compute_feature_map  # type: ignore

logger = logging.getLogger(__name__)


def _safe_load_json(path: str) -> dict[str, Any]:
    file_path = Path(path)
    if not file_path.exists():
        return {}
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        logger.warning("Ignoring invalid JSON file at %s", file_path)
        return {}


@lru_cache(maxsize=1)
def load_model():
    """Load trained artifacts once per process."""
    required = [Path(MODEL_PATH), Path(SCALER_PATH), Path(ENCODER_PATH)]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(f"Missing model artifact(s): {', '.join(missing)}. Run ml/train_model.py first.")

    try:
        model = joblib.load(MODEL_PATH)
    except ModuleNotFoundError as exc:
        missing_module = str(exc).split("No module named ")[-1].strip("'\"")
        raise ModuleNotFoundError(
            "Model artifact requires an extra dependency that is not installed: "
            f"{missing_module}. Install backend deps with 'pip install -r ml/requirements.txt'."
        ) from exc

    scaler = joblib.load(SCALER_PATH)
    encoder = joblib.load(ENCODER_PATH)
    logger.info("Loaded model with %s crop classes", len(encoder.classes_))
    return model, scaler, encoder


@lru_cache(maxsize=1)
def get_feature_order() -> list[str]:
    saved = _safe_load_json(FEATURE_ORDER_PATH)
    feature_order = saved.get("feature_order") if saved else None
    if isinstance(feature_order, list) and feature_order:
        return [str(name) for name in feature_order]
    return list(FEATURE_COLUMNS)


@lru_cache(maxsize=1)
def get_base_feature_order() -> list[str]:
    saved = _safe_load_json(FEATURE_ORDER_PATH)
    base_features = saved.get("base_features") if saved else None
    if isinstance(base_features, list) and base_features:
        return [str(name) for name in base_features]
    return list(BASE_FEATURES)


@lru_cache(maxsize=1)
def load_training_profiles() -> dict[str, dict[str, dict[str, float]]]:
    raw = _safe_load_json(TRAINING_PROFILES_PATH)
    return {str(name).lower(): profile for name, profile in raw.items()} if raw else {}


def _lookup_feature_value(features: dict[str, Any], feature_name: str) -> float:
    aliases = FEATURE_NAME_ALIASES.get(feature_name, (feature_name,))
    for alias in aliases:
        if alias in features and features[alias] is not None:
            return float(features[alias])
    raise KeyError(f"Missing required feature '{feature_name}' (accepted aliases: {aliases})")


def build_feature_frame(features: dict[str, Any]) -> pd.DataFrame:
    """Build a single-row frame in the exact training column order."""
    _, scaler, _ = load_model()
    artifact_order = list(getattr(scaler, "feature_names_in_", get_feature_order()))

    base_features = {
        "N": _lookup_feature_value(features, "N"),
        "P": _lookup_feature_value(features, "P"),
        "K": _lookup_feature_value(features, "K"),
        "temperature": _lookup_feature_value(features, "temperature"),
        "humidity": _lookup_feature_value(features, "humidity"),
        "ph": _lookup_feature_value(features, "ph"),
        "rainfall": _lookup_feature_value(features, "rainfall"),
    }
    feature_map = compute_feature_map(base_features)
    feature_map["pH"] = feature_map["ph"]

    ordered: dict[str, float] = {}
    for column in artifact_order:
        if column in feature_map:
            ordered[column] = float(feature_map[column])
            continue
        try:
            ordered[column] = _lookup_feature_value(features, column)
        except KeyError as exc:
            raise KeyError(
                f"Feature artifact expects '{column}', but it could not be built "
                f"from the provided input keys {sorted(features.keys())}."
            ) from exc

    return pd.DataFrame([ordered], columns=artifact_order)


def predict_probability_distribution(features: dict[str, Any]) -> list[dict]:
    """Return the full crop probability distribution sorted descending."""
    model, scaler, encoder = load_model()
    frame = build_feature_frame(features)
    scaled = scaler.transform(frame)
    probabilities = model.predict_proba(scaled)[0]
    classes = encoder.inverse_transform(np.arange(len(probabilities)))

    rows = [
        {"crop": str(crop).lower(), "ml_confidence": float(probability)}
        for crop, probability in zip(classes, probabilities)
    ]
    rows.sort(key=lambda row: row["ml_confidence"], reverse=True)

    if rows and rows[0]["ml_confidence"] < LOW_CONFIDENCE_THRESHOLD:
        logger.warning("Low-confidence inference. Top probability=%.3f", rows[0]["ml_confidence"])

    return rows


def predict_top_crops(features: dict[str, Any], top_n: int = 5) -> list[dict]:
    return predict_probability_distribution(features)[:top_n]


def get_all_crop_names() -> list[str]:
    _, _, encoder = load_model()
    return [str(name).lower() for name in encoder.classes_]


def get_crop_probability(features: dict[str, Any], crop_name: str) -> float:
    crop_name = str(crop_name).strip().lower()
    distribution = predict_probability_distribution(features)
    for row in distribution:
        if row["crop"] == crop_name:
            return float(row["ml_confidence"])
    return 0.0


def _score_from_stats(value: float, stats: dict[str, float]) -> float:
    min_value = float(stats.get("min", value))
    max_value = float(stats.get("max", value))
    mean_value = float(stats.get("mean", value))
    std_value = max(float(stats.get("std", 0.0)), 1e-6)
    span = max(max_value - min_value, std_value, 1e-6)

    if min_value <= value <= max_value:
        z_distance = abs(value - mean_value) / std_value
        return max(0.45, 1.0 - 0.18 * z_distance)

    distance = min(abs(value - min_value), abs(value - max_value))
    return max(0.0, 0.45 - 0.45 * (distance / (span * 1.5)))


def get_training_profile_fit(crop_name: str, features: dict[str, Any]) -> dict[str, float]:
    """Score current features against training stats for a single crop."""
    crop_key = str(crop_name).strip().lower()
    profile = load_training_profiles().get(crop_key)
    if not profile:
        return {}

    values = {
        "N": _lookup_feature_value(features, "N"),
        "P": _lookup_feature_value(features, "P"),
        "K": _lookup_feature_value(features, "K"),
        "temperature": _lookup_feature_value(features, "temperature"),
        "humidity": _lookup_feature_value(features, "humidity"),
        "ph": _lookup_feature_value(features, "ph"),
        "rainfall": _lookup_feature_value(features, "rainfall"),
    }
    scores = {name: _score_from_stats(values[name], profile[name]) for name in values if name in profile}

    soil_weights = {"N": 0.28, "P": 0.24, "K": 0.24, "ph": 0.24}
    climate_weights = {"temperature": 0.30, "humidity": 0.25, "rainfall": 0.45}

    soil_fit = sum(scores[name] * soil_weights[name] for name in soil_weights if name in scores)
    climate_fit = sum(scores[name] * climate_weights[name] for name in climate_weights if name in scores)
    overall = 0.45 * soil_fit + 0.55 * climate_fit

    result = {
        "overall": round(float(overall), 6),
        "soil_fit": round(float(soil_fit), 6),
        "climate_fit": round(float(climate_fit), 6),
    }
    for name, score in scores.items():
        result[f"{name}_fit"] = round(float(score), 6)
    return result


def validate_inference_input(features: dict[str, Any], crop_name: str | None = None) -> dict[str, str]:
    """Return warnings when feature values are far outside known training ranges."""
    profiles = load_training_profiles()
    if not profiles:
        return {}

    if crop_name:
        profile = profiles.get(str(crop_name).strip().lower())
        if profile:
            warnings: dict[str, str] = {}
            for feature_name in get_base_feature_order():
                value = _lookup_feature_value(features, feature_name)
                stats = profile.get(feature_name)
                if not stats:
                    continue
                if value < float(stats["min"]) or value > float(stats["max"]):
                    warnings[feature_name] = (
                        f"{value:.2f} outside {crop_name} training range "
                        f"[{float(stats['min']):.2f}, {float(stats['max']):.2f}]"
                    )
            return warnings

    aggregated: dict[str, dict[str, float]] = {}
    for feature_name in get_base_feature_order():
        mins = [float(profile[feature_name]["min"]) for profile in profiles.values() if feature_name in profile]
        maxs = [float(profile[feature_name]["max"]) for profile in profiles.values() if feature_name in profile]
        if mins and maxs:
            aggregated[feature_name] = {"min": min(mins), "max": max(maxs)}

    warnings = {}
    for feature_name, stats in aggregated.items():
        value = _lookup_feature_value(features, feature_name)
        if value < stats["min"] or value > stats["max"]:
            warnings[feature_name] = (
                f"{value:.2f} outside overall training range "
                f"[{stats['min']:.2f}, {stats['max']:.2f}]"
            )
    return warnings
