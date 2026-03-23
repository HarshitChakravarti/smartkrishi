#!/usr/bin/env python3
"""Predict crops using a trained classifier plus contextual personalization."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_FEATURES = ["N", "P", "K", "humidity", "rainfall"]
OPTIONAL_NUMERIC_FIELDS = {
    "temperature": (-20.0, 60.0),
    "ph": (0.0, 14.0),
}
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models/crop_model.joblib"
DEFAULT_TOP_K = 5

SEASON_MAP = {
    "kharif": {
        "rice",
        "maize",
        "cotton",
        "jute",
        "pigeonpeas",
        "mothbeans",
        "mungbean",
        "blackgram",
        "banana",
        "papaya",
        "coconut",
    },
    "rabi": {
        "chickpea",
        "kidneybeans",
        "lentil",
        "orange",
        "apple",
        "grapes",
        "coffee",
        "pomegranate",
        "wheat",
    },
    "zaid": {
        "watermelon",
        "muskmelon",
        "papaya",
        "banana",
        "mango",
        "pomegranate",
        "maize",
    },
}

CROP_FAMILY = {
    "rice": "cereal",
    "maize": "cereal",
    "wheat": "cereal",
    "chickpea": "legume",
    "kidneybeans": "legume",
    "pigeonpeas": "legume",
    "mothbeans": "legume",
    "mungbean": "legume",
    "blackgram": "legume",
    "lentil": "legume",
    "cotton": "fiber",
    "jute": "fiber",
    "banana": "fruit",
    "mango": "fruit",
    "grapes": "fruit",
    "watermelon": "fruit",
    "muskmelon": "fruit",
    "apple": "fruit",
    "orange": "fruit",
    "papaya": "fruit",
    "pomegranate": "fruit",
    "coconut": "fruit",
    "coffee": "beverage",
    "sugarcane": "cash",
}

SMALL_FARM_FRIENDLY = {
    "grapes",
    "apple",
    "orange",
    "pomegranate",
    "papaya",
    "watermelon",
    "muskmelon",
    "coffee",
    "mungbean",
    "blackgram",
}

LARGE_FARM_FRIENDLY = {
    "rice",
    "maize",
    "wheat",
    "cotton",
    "jute",
    "banana",
    "coconut",
    "pigeonpeas",
}

NUMERIC_BOUNDS = {
    "N": (0.0, 300.0),
    "P": (0.0, 300.0),
    "K": (0.0, 300.0),
    "humidity": (0.0, 100.0),
    "rainfall": (0.0, 500.0),
    "farm_size": (0.1, 2000.0),
}


class RecommendationInputError(ValueError):
    """Raised when the request payload is invalid."""


@lru_cache(maxsize=4)
def load_model_bundle(model_path: str) -> dict[str, Any]:
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")

    try:
        bundle = joblib.load(path)
    except Exception as exc:  # pragma: no cover
        raise RuntimeError(
            "Model artifact could not be loaded in the current Python ML runtime. "
            "Rebuild it with: npm run train:model"
        ) from exc

    required_bundle_keys = {"model", "feature_columns", "classes", "metadata"}
    missing = required_bundle_keys - set(bundle.keys())
    if missing:
        raise RuntimeError(f"Invalid model bundle. Missing keys: {sorted(missing)}")

    return bundle


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Predict personalized crop recommendations")
    parser.add_argument(
        "--model",
        type=Path,
        default=DEFAULT_MODEL_PATH,
        help="Path to the trained model bundle",
    )
    parser.add_argument(
        "--input-json",
        type=str,
        help=(
            "JSON input with keys: N,P,K,humidity,rainfall,"
            "farm_size,previous_crop,season"
        ),
    )
    parser.add_argument(
        "--input-file",
        type=Path,
        help="Path to a JSON file containing the request payload",
    )
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K, help="Number of crops to return")
    return parser.parse_args()


def _to_float(payload: dict[str, Any], key: str) -> float:
    if key not in payload:
        raise RecommendationInputError(f"Missing required field: {key}")

    value = payload[key]
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:
        raise RecommendationInputError(f"Field '{key}' must be numeric") from exc

    min_value, max_value = NUMERIC_BOUNDS[key]
    if numeric < min_value or numeric > max_value:
        raise RecommendationInputError(
            f"Field '{key}' out of range [{min_value}, {max_value}]: {numeric}"
        )

    return numeric


def _to_optional_float(payload: dict[str, Any], key: str) -> float | None:
    if key not in payload or payload[key] in ("", None):
        return None

    value = payload[key]
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:
        raise RecommendationInputError(f"Field '{key}' must be numeric") from exc

    min_value, max_value = OPTIONAL_NUMERIC_FIELDS[key]
    if numeric < min_value or numeric > max_value:
        raise RecommendationInputError(
            f"Field '{key}' out of range [{min_value}, {max_value}]: {numeric}"
        )

    return numeric


def _normalize_season(raw: Any) -> str:
    season = str(raw if raw is not None else "kharif").lower().strip()
    return season if season in SEASON_MAP else "kharif"


def _normalize_previous_crop(raw: Any) -> str:
    previous_crop = str(raw if raw is not None else "none").lower().strip()
    return previous_crop or "none"


def validate_and_prepare_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise RecommendationInputError("Payload must be a JSON object")

    prepared = {feature: _to_float(payload, feature) for feature in MODEL_FEATURES}

    try:
        farm_size = float(payload.get("farm_size", 2.0))
    except (TypeError, ValueError) as exc:
        raise RecommendationInputError("Field 'farm_size' must be numeric") from exc

    min_value, max_value = NUMERIC_BOUNDS["farm_size"]
    if farm_size < min_value or farm_size > max_value:
        raise RecommendationInputError(
            f"Field 'farm_size' out of range [{min_value}, {max_value}]: {farm_size}"
        )

    prepared["farm_size"] = farm_size
    prepared["season"] = _normalize_season(payload.get("season", "kharif"))
    prepared["previous_crop"] = _normalize_previous_crop(payload.get("previous_crop", "none"))

    for key in OPTIONAL_NUMERIC_FIELDS:
        value = _to_optional_float(payload, key)
        if value is not None:
            prepared[key] = value

    return prepared


def farm_size_bucket(farm_size: float) -> str:
    if farm_size <= 2:
        return "small"
    if farm_size <= 6:
        return "medium"
    return "large"


def season_weight(crop: str, season: str) -> float:
    return 1.15 if crop in SEASON_MAP.get(season, set()) else 0.85


def rotation_weight(crop: str, previous_crop: str) -> float:
    if previous_crop == "none":
        return 1.0
    if crop == previous_crop:
        return 0.60

    crop_family = CROP_FAMILY.get(crop)
    previous_family = CROP_FAMILY.get(previous_crop)
    if crop_family and previous_family and crop_family == previous_family:
        return 0.85
    return 1.05


def farm_size_weight(crop: str, farm_size: float) -> float:
    bucket = farm_size_bucket(farm_size)
    if bucket == "small":
        return 1.08 if crop in SMALL_FARM_FRIENDLY else 0.95
    if bucket == "large":
        return 1.08 if crop in LARGE_FARM_FRIENDLY else 0.94
    return 1.0


def personalize_scores(
    classes: list[str],
    base_probabilities: np.ndarray,
    farm_size: float,
    previous_crop: str,
    season: str,
) -> list[dict[str, Any]]:
    rows = []
    for index, crop in enumerate(classes):
        base_probability = float(base_probabilities[index])
        current_season_weight = season_weight(crop, season)
        current_rotation_weight = rotation_weight(crop, previous_crop)
        current_farm_size_weight = farm_size_weight(crop, farm_size)

        final_score = (
            base_probability
            * current_season_weight
            * current_rotation_weight
            * current_farm_size_weight
        )
        rows.append(
            {
                "crop": crop,
                "base_probability": base_probability,
                "season_weight": current_season_weight,
                "rotation_weight": current_rotation_weight,
                "farm_size_weight": current_farm_size_weight,
                "final_score": final_score,
            }
        )

    total_score = sum(row["final_score"] for row in rows)
    for row in rows:
        row["personalized_probability"] = row["final_score"] / total_score if total_score > 0 else 0.0

    rows.sort(key=lambda row: row["personalized_probability"], reverse=True)
    return rows


def predict_recommendation(
    payload: dict[str, Any],
    model_path: str | Path = DEFAULT_MODEL_PATH,
    top_k: int = DEFAULT_TOP_K,
) -> dict[str, Any]:
    prepared = validate_and_prepare_payload(payload)

    if top_k < 1:
        raise RecommendationInputError("top_k must be >= 1")

    bundle = load_model_bundle(str(model_path))
    model = bundle["model"]
    feature_columns = list(bundle["feature_columns"])
    classes = list(bundle["classes"])
    metadata = bundle.get("metadata", {})

    frame = pd.DataFrame(
        [{column: float(prepared[column]) for column in feature_columns}],
        columns=feature_columns,
    )
    base_probabilities = model.predict_proba(frame)[0]

    personalized_rows = personalize_scores(
        classes=classes,
        base_probabilities=base_probabilities,
        farm_size=prepared["farm_size"],
        previous_crop=prepared["previous_crop"],
        season=prepared["season"],
    )

    base_rows = [
        {
            "crop": crop,
            "base_probability": float(base_probabilities[index]),
        }
        for index, crop in enumerate(classes)
    ]
    base_rows.sort(key=lambda row: row["base_probability"], reverse=True)

    limit = min(top_k, len(personalized_rows))
    return {
        "input": prepared,
        "best_crop": personalized_rows[0]["crop"],
        "best_base_crop": base_rows[0]["crop"],
        "top_recommendations": personalized_rows[:limit],
        "base_top_recommendations": base_rows[:limit],
        "model_metadata": {
            "dataset": metadata.get("dataset"),
            "created_at": metadata.get("created_at"),
            "feature_columns": metadata.get("model_features", feature_columns),
            "personalization_features": metadata.get(
                "personalization_features",
                ["farm_size", "season", "previous_crop"],
            ),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _read_payload(args: argparse.Namespace) -> dict[str, Any]:
    if bool(args.input_json) == bool(args.input_file):
        raise RecommendationInputError("Provide exactly one of --input-json or --input-file")

    if args.input_json:
        try:
            return json.loads(args.input_json)
        except json.JSONDecodeError as exc:
            raise RecommendationInputError(f"Invalid JSON in --input-json: {exc}") from exc

    try:
        return json.loads(args.input_file.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RecommendationInputError(f"Input file not found: {args.input_file}") from exc
    except json.JSONDecodeError as exc:
        raise RecommendationInputError(f"Invalid JSON in file {args.input_file}: {exc}") from exc


def main() -> None:
    args = parse_args()
    payload = _read_payload(args)
    output = predict_recommendation(payload=payload, model_path=args.model, top_k=args.top_k)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
