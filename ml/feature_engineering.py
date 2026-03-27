"""Shared feature engineering for training and inference."""

from __future__ import annotations

from typing import Any

import pandas as pd

BASE_FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
DERIVED_FEATURES = [
    "temp_humidity_ratio",
    "npk_total",
    "n_ratio",
    "p_ratio",
    "k_ratio",
    "rain_temp_product",
    "ph_category",
    "moisture_index",
]
EXTENDED_FEATURES = BASE_FEATURES + DERIVED_FEATURES


def normalize_base_feature_dict(features: dict[str, Any]) -> dict[str, float]:
    """Normalize input dict to the canonical base-feature names."""
    ph_value = features.get("ph", features.get("pH"))
    if ph_value is None:
        raise KeyError("Missing ph/pH in feature payload")

    return {
        "N": float(features["N"]),
        "P": float(features["P"]),
        "K": float(features["K"]),
        "temperature": float(features["temperature"]),
        "humidity": float(features["humidity"]),
        "ph": float(ph_value),
        "rainfall": float(features["rainfall"]),
    }


def compute_feature_map(base_features: dict[str, Any]) -> dict[str, float]:
    """Compute base and derived features in a single mapping."""
    normalized = normalize_base_feature_dict(base_features)

    n_value = normalized["N"]
    p_value = normalized["P"]
    k_value = normalized["K"]
    temperature = normalized["temperature"]
    humidity = normalized["humidity"]
    ph_value = normalized["ph"]
    rainfall = normalized["rainfall"]

    npk_total = n_value + p_value + k_value
    if ph_value < 5.5:
        ph_category = 0.0
    elif ph_value < 6.5:
        ph_category = 1.0
    elif ph_value < 7.5:
        ph_category = 2.0
    else:
        ph_category = 3.0

    return {
        **normalized,
        "temp_humidity_ratio": temperature / (humidity + 1.0),
        "npk_total": npk_total,
        "n_ratio": n_value / (npk_total + 1.0),
        "p_ratio": p_value / (npk_total + 1.0),
        "k_ratio": k_value / (npk_total + 1.0),
        "rain_temp_product": rainfall * temperature / 100.0,
        "ph_category": ph_category,
        "moisture_index": (rainfall / 300.0 + humidity / 100.0) / 2.0,
    }


def add_engineered_features(frame: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of the frame with derived feature columns added."""
    engineered = frame.copy()
    npk_total = engineered["N"] + engineered["P"] + engineered["K"]
    engineered["temp_humidity_ratio"] = engineered["temperature"] / (engineered["humidity"] + 1.0)
    engineered["npk_total"] = npk_total
    engineered["n_ratio"] = engineered["N"] / (npk_total + 1.0)
    engineered["p_ratio"] = engineered["P"] / (npk_total + 1.0)
    engineered["k_ratio"] = engineered["K"] / (npk_total + 1.0)
    engineered["rain_temp_product"] = engineered["rainfall"] * engineered["temperature"] / 100.0
    engineered["ph_category"] = pd.cut(
        engineered["ph"],
        bins=[0.0, 5.5, 6.5, 7.5, 14.0],
        labels=[0.0, 1.0, 2.0, 3.0],
        include_lowest=True,
    ).astype(float)
    engineered["moisture_index"] = (engineered["rainfall"] / 300.0 + engineered["humidity"] / 100.0) / 2.0
    return engineered
