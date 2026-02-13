#!/usr/bin/env python3
"""Run personalized crop recommendations using trained model + advisory re-ranking.

Stage 1: ML model predicts base probabilities from soil/weather features.
Stage 2: Advisory layer adjusts scores using season, farm_size, and previous_crop.
"""

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
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models/crop_model.joblib"
DEFAULT_TOP_K = 5

# Approximate season suitability for Indian conditions.
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
    },
    "zaid": {
        "watermelon",
        "muskmelon",
        "papaya",
        "banana",
        "mango",
        "pomegranate",
    },
}

CROP_FAMILY = {
    "rice": "cereal",
    "maize": "cereal",
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
    "cotton",
    "jute",
    "banana",
    "coconut",
    "pigeonpeas",
}

NUMERIC_BOUNDS = {
    "N": (0, 300),
    "P": (0, 300),
    "K": (0, 300),
    "temperature": (-20, 60),
    "humidity": (0, 100),
    "ph": (0, 14),
    "rainfall": (0, 500),
    "farm_size": (0.1, 2000),
}


class RecommendationInputError(ValueError):
    """Raised when request payload is invalid."""


@lru_cache(maxsize=4)
def load_model_bundle(model_path: str) -> dict[str, Any]:
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")
    try:
        bundle = joblib.load(path)
    except ModuleNotFoundError as exc:
        # Common when a model was trained under a different NumPy/Sklearn build.
        raise RuntimeError(
            "Model artifact is incompatible with current Python ML runtime "
            f"({exc}). Rebuild model with: npm run train:model"
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
        help="Path to trained model bundle",
    )
    parser.add_argument(
        "--input-json",
        type=str,
        help=(
            "JSON input with keys: N,P,K,temperature,humidity,ph,rainfall,"
            "farm_size,previous_crop,season"
        ),
    )
    parser.add_argument(
        "--input-file",
        type=Path,
        help="Path to JSON file containing request payload",
    )
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K, help="Top K crops to return")
    return parser.parse_args()


def _to_float(payload: dict[str, Any], key: str) -> float:
    if key not in payload:
        raise RecommendationInputError(f"Missing required field: {key}")
    value = payload[key]
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:
        raise RecommendationInputError(f"Field '{key}' must be numeric") from exc

    min_v, max_v = NUMERIC_BOUNDS[key]
    if numeric < min_v or numeric > max_v:
        raise RecommendationInputError(
            f"Field '{key}' out of range [{min_v}, {max_v}]: {numeric}"
        )
    return numeric


def _normalize_season(raw: Any) -> str:
    season = str(raw if raw is not None else "kharif").lower().strip()
    return season if season in SEASON_MAP else "kharif"


def _normalize_previous_crop(raw: Any) -> str:
    prev = str(raw if raw is not None else "none").lower().strip()
    return prev if prev else "none"


def validate_and_prepare_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise RecommendationInputError("Payload must be a JSON object")

    prepared = {feature: _to_float(payload, feature) for feature in FEATURES}
    prepared["farm_size"] = float(payload.get("farm_size", 2.0))

    min_v, max_v = NUMERIC_BOUNDS["farm_size"]
    if prepared["farm_size"] < min_v or prepared["farm_size"] > max_v:
        raise RecommendationInputError(
            f"Field 'farm_size' out of range [{min_v}, {max_v}]: {prepared['farm_size']}"
        )

    prepared["previous_crop"] = _normalize_previous_crop(payload.get("previous_crop", "none"))
    prepared["season"] = _normalize_season(payload.get("season", "kharif"))
    return prepared


def farm_size_bucket(farm_size: float) -> str:
    if farm_size <= 2:
        return "small"
    if farm_size <= 6:
        return "medium"
    return "large"


def season_weight(crop: str, season: str) -> float:
    if season not in SEASON_MAP:
        return 1.0
    return 1.15 if crop in SEASON_MAP[season] else 0.85


def rotation_weight(crop: str, previous_crop: str) -> float:
    if not previous_crop or previous_crop == "none":
        return 1.0
    if crop == previous_crop:
        return 0.60

    crop_family = CROP_FAMILY.get(crop)
    prev_family = CROP_FAMILY.get(previous_crop)
    if crop_family and prev_family and crop_family == prev_family:
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
    base_probs: np.ndarray,
    farm_size: float,
    previous_crop: str,
    season: str,
) -> list[dict[str, Any]]:
    rows = []
    for idx, crop in enumerate(classes):
        base = float(base_probs[idx])
        w_season = season_weight(crop, season)
        w_rotation = rotation_weight(crop, previous_crop)
        w_farm = farm_size_weight(crop, farm_size)

        final_score = base * w_season * w_rotation * w_farm
        rows.append(
            {
                "crop": crop,
                "base_probability": base,
                "season_weight": w_season,
                "rotation_weight": w_rotation,
                "farm_size_weight": w_farm,
                "final_score": final_score,
            }
        )

    total = sum(r["final_score"] for r in rows)
    for r in rows:
        r["personalized_probability"] = r["final_score"] / total if total > 0 else 0.0

    rows.sort(key=lambda x: x["personalized_probability"], reverse=True)
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
    feature_columns = bundle["feature_columns"]
    classes = list(bundle["classes"])
    metadata = bundle.get("metadata", {})

    x = pd.DataFrame(
        [{col: float(prepared[col]) for col in feature_columns}],
        columns=feature_columns,
    )
    base_probs = model.predict_proba(x)[0]

    personalized_rows = personalize_scores(
        classes=classes,
        base_probs=base_probs,
        farm_size=prepared["farm_size"],
        previous_crop=prepared["previous_crop"],
        season=prepared["season"],
    )

    base_rows = [
        {
            "crop": crop,
            "base_probability": float(base_probs[idx]),
        }
        for idx, crop in enumerate(classes)
    ]
    base_rows.sort(key=lambda r: r["base_probability"], reverse=True)

    limit = min(top_k, len(personalized_rows))
    output = {
        "input": prepared,
        "best_crop": personalized_rows[0]["crop"],
        "best_base_crop": base_rows[0]["crop"],
        "top_recommendations": personalized_rows[:limit],
        "base_top_recommendations": base_rows[:limit],
        "model_metadata": {
            "dataset": metadata.get("dataset"),
            "created_at": metadata.get("created_at"),
            "feature_columns": metadata.get("feature_columns", feature_columns),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    return output


def _read_payload(args: argparse.Namespace) -> dict[str, Any]:
    if bool(args.input_json) == bool(args.input_file):
        raise RecommendationInputError("Provide exactly one of --input-json or --input-file")

    if args.input_json:
        try:
            payload = json.loads(args.input_json)
        except json.JSONDecodeError as exc:
            raise RecommendationInputError(f"Invalid JSON in --input-json: {exc}") from exc
    else:
        try:
            payload = json.loads(args.input_file.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise RecommendationInputError(f"Input file not found: {args.input_file}") from exc
        except json.JSONDecodeError as exc:
            raise RecommendationInputError(f"Invalid JSON in file {args.input_file}: {exc}") from exc

    return payload


def main() -> None:
    args = parse_args()
    payload = _read_payload(args)
    output = predict_recommendation(payload=payload, model_path=args.model, top_k=args.top_k)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
