"""Main orchestration pipeline for SmartKrishi recommendations."""

from __future__ import annotations

import datetime as dt
import json
import logging
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    from .config import CROP_FAMILIES_PATH, SEASONAL_CROPS_PATH
    from .crop_knowledge import CropKnowledgeBase
    from .feature_generator import generate_features, get_crop_duration
    from .model import (
        get_all_crop_names,
        get_crop_probability,
        get_training_profile_fit,
        predict_probability_distribution,
        validate_inference_input,
    )
    from .rules import apply_all_rules, detect_season
    from .schemas import PredictionRequest
except ImportError:  # pragma: no cover
    from config import CROP_FAMILIES_PATH, SEASONAL_CROPS_PATH  # type: ignore
    from crop_knowledge import CropKnowledgeBase  # type: ignore
    from feature_generator import generate_features, get_crop_duration  # type: ignore
    from model import (  # type: ignore
        get_all_crop_names,
        get_crop_probability,
        get_training_profile_fit,
        predict_probability_distribution,
        validate_inference_input,
    )
    from rules import apply_all_rules, detect_season  # type: ignore
    from schemas import PredictionRequest  # type: ignore

logger = logging.getLogger(__name__)
kb = CropKnowledgeBase()

DEFAULT_SEASONAL_CROPS = {
    "Kharif": ["rice", "maize", "cotton", "jute", "mungbean", "mothbeans", "pigeonpeas"],
    "Rabi": ["wheat", "chickpea", "lentil", "blackgram", "mustard"],
    "Zaid": ["watermelon", "muskmelon", "mungbean"],
    "Perennial": ["banana", "coconut", "papaya", "coffee", "orange", "mango", "apple", "grapes", "pomegranate"],
}


def _current_month_name() -> str:
    return dt.datetime.now().strftime("%B")


@lru_cache(maxsize=1)
def _load_seasonal_catalog() -> dict[str, list[str]]:
    path = Path(SEASONAL_CROPS_PATH)
    if not path.exists():
        return DEFAULT_SEASONAL_CROPS
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        logger.warning("Invalid seasonal crop file at %s. Using defaults.", path)
        return DEFAULT_SEASONAL_CROPS

    catalog: dict[str, list[str]] = {}
    for season_name, crops in raw.items():
        catalog[str(season_name)] = [str(crop).strip().lower() for crop in crops]
    for season_name, crops in DEFAULT_SEASONAL_CROPS.items():
        catalog.setdefault(season_name, crops)
    return catalog


@lru_cache(maxsize=1)
def _load_crop_categories() -> dict[str, str]:
    path = Path(CROP_FAMILIES_PATH)
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    categories: dict[str, str] = {}
    for family_name, members in raw.items():
        for crop_name in members:
            categories[str(crop_name).strip().lower()] = str(family_name).strip().lower()
    return categories


@lru_cache(maxsize=1)
def _model_crop_set() -> set[str]:
    return set(get_all_crop_names())


def _is_supported_crop(crop_name: str) -> bool:
    crop_name = crop_name.lower().strip()
    return crop_name in _model_crop_set() or kb.has_crop(crop_name)


def _get_candidate_crops(season: str, mode: str) -> list[str]:
    catalog = _load_seasonal_catalog()
    season_crops = [crop for crop in catalog.get(season, []) if _is_supported_crop(crop)]
    perennial_crops = [crop for crop in catalog.get("Perennial", []) if _is_supported_crop(crop)]

    if mode == "planning":
        candidates = season_crops
    else:
        candidates = season_crops + perennial_crops

    deduped = list(dict.fromkeys(candidates))
    if deduped:
        return deduped

    fallback = [crop for crop in sorted(_model_crop_set()) if _is_supported_crop(crop)]
    return fallback


def generate_advisories(crop: str, climate: dict) -> dict:
    """Fallback advisories for crops without knowledge-base detail."""
    crop_lower = str(crop).lower()
    rainfall = float(climate["rainfall"])

    if crop_lower in {"rice", "banana", "coconut"}:
        irrigation = "Maintain consistent soil moisture and avoid long dry spells."
    elif rainfall < 40:
        irrigation = "Plan irrigation support because ambient rainfall is low for this crop window."
    else:
        irrigation = "Use soil-moisture based irrigation scheduling and avoid waterlogging."

    if crop_lower in {"chickpea", "lentil", "mungbean", "blackgram", "mothbeans"}:
        fertilizer = "Prioritize phosphorus and potassium and avoid excess nitrogen in legumes."
    else:
        fertilizer = "Use balanced NPK guided by a recent soil test and local agronomy advice."

    if crop_lower in {"cotton", "pigeonpeas", "coffee"}:
        pest_watch = "Watch for sucking pests and borers and respond early with integrated pest management."
    else:
        pest_watch = "Scout the field weekly and follow local extension advisories for pest pressure."

    weather_note = (
        f"Climate window uses {climate['source']} data with average temperature "
        f"{climate['temperature']} C, humidity {climate['humidity']}%, rainfall {climate['rainfall']} mm."
    )

    return {
        "irrigation": irrigation,
        "fertilizer": fertilizer,
        "pest_watch": pest_watch,
        "weather_note": weather_note,
    }


def _build_candidate(
    crop_name: str,
    features: dict[str, float],
    climate_meta: dict[str, Any],
    mode: str,
) -> dict[str, Any]:
    model_supported = crop_name in _model_crop_set()
    ml_confidence = get_crop_probability(features, crop_name) if model_supported else 0.0
    profile_fit = get_training_profile_fit(crop_name, features) if model_supported else {}
    warnings = validate_inference_input(features, crop_name if model_supported else None)
    if warnings:
        logger.warning("Input range warnings for %s: %s", crop_name, warnings)

    categories = _load_crop_categories()
    return {
        "crop": crop_name,
        "ml_confidence": round(float(ml_confidence), 6),
        "model_supported": model_supported,
        "profile_fit": round(float(profile_fit.get("overall", 0.0)), 6) if profile_fit else 0.0,
        "training_soil_fit": round(float(profile_fit.get("soil_fit", 0.0)), 6) if profile_fit else 0.0,
        "training_climate_fit": round(float(profile_fit.get("climate_fit", 0.0)), 6) if profile_fit else 0.0,
        "season_allowed": True,
        "category": categories.get(crop_name, ""),
        "tags": [mode, climate_meta.get("source", "")],
        "temperature": float(climate_meta.get("temperature", features.get("temperature", 0.0))),
        "humidity": float(climate_meta.get("humidity", features.get("humidity", 0.0))),
        "rainfall": float(climate_meta.get("rainfall", features.get("rainfall", 0.0))),
        "growing_duration": f"{get_crop_duration(crop_name)} months",
    }


def _process_current_mode(request: PredictionRequest, candidate_crops: list[str]) -> tuple[list[dict], dict[str, Any]]:
    payload = request.model_dump(mode="json")
    features, climate_meta = generate_features(payload)
    distribution = predict_probability_distribution(features)
    probability_map = {row["crop"]: float(row["ml_confidence"]) for row in distribution}

    candidates = []
    for crop_name in candidate_crops:
        model_supported = crop_name in _model_crop_set()
        profile_fit = get_training_profile_fit(crop_name, features) if model_supported else {}
        candidates.append(
            {
                "crop": crop_name,
                "ml_confidence": round(float(probability_map.get(crop_name, 0.0)), 6),
                "model_supported": model_supported,
                "profile_fit": round(float(profile_fit.get("overall", 0.0)), 6) if profile_fit else 0.0,
                "training_soil_fit": round(float(profile_fit.get("soil_fit", 0.0)), 6) if profile_fit else 0.0,
                "training_climate_fit": round(float(profile_fit.get("climate_fit", 0.0)), 6) if profile_fit else 0.0,
                "season_allowed": True,
                "category": _load_crop_categories().get(crop_name, ""),
                "tags": ["current", climate_meta.get("source", "")],
                "temperature": float(climate_meta.get("temperature", features.get("temperature", 0.0))),
                "humidity": float(climate_meta.get("humidity", features.get("humidity", 0.0))),
                "rainfall": float(climate_meta.get("rainfall", features.get("rainfall", 0.0))),
                "growing_duration": f"{get_crop_duration(crop_name)} months",
            }
        )

    warnings = validate_inference_input(features)
    if warnings:
        logger.warning("Current-mode input range warnings: %s", warnings)

    return candidates, climate_meta


def _process_planning_mode(
    request: PredictionRequest,
    candidate_crops: list[str],
) -> tuple[list[dict], dict[str, dict[str, Any]]]:
    payload = request.model_dump(mode="json")
    candidates = []
    climate_by_crop: dict[str, dict[str, Any]] = {}

    for crop_name in candidate_crops:
        features, climate_meta = generate_features(payload, crop_name=crop_name)
        candidates.append(_build_candidate(crop_name, features, climate_meta, mode="planning"))
        climate_by_crop[crop_name] = climate_meta

    return candidates, climate_by_crop


def _select_climate_meta(mode: str, adjusted: list[dict], planning_climate_map, current_climate_meta):
    if mode == "current":
        return current_climate_meta
    if not adjusted:
        return {"temperature": None, "humidity": None, "rainfall": None, "source": "historical_average", "months_covered": None}
    top_crop = adjusted[0]["crop"]
    return planning_climate_map.get(top_crop, {})


def _format_recommendation(row: dict, rank: int, climate_meta: dict[str, Any]) -> dict[str, Any]:
    rec = {
        "rank": rank,
        "crop": row["crop"],
        "confidence": round(float(row["final_confidence"]), 2),
        "ml_score": round(float(row["ml_confidence"]), 2),
        "rule_adjustment": row["rule_adjustment"],
        "season": row["season"],
        "growing_duration": row["growing_duration"],
        "reason": row["reason"],
        "advisories": row["advisories"] if row.get("advisories") else generate_advisories(row["crop"], climate_meta),
    }
    if row.get("display_name"):
        rec["display_name"] = row.get("display_name")
        rec["hindi_name"] = row.get("hindi_name")
        rec["sowing_months"] = row.get("sowing_months", [])
        rec["tags"] = row.get("tags", [])
        rec["category"] = row.get("category", "")
        rec["farming_plan"] = row.get("farming_plan", {})
        rec["fertilizer_plan_detailed"] = row.get("full_fertilizer_plan", {})
        rec["irrigation_plan_detailed"] = row.get("full_irrigation_plan", {})
        rec["detailed_reasons"] = row.get("detailed_reasons", [])
    return rec


def get_recommendations(raw_payload: dict) -> dict:
    """Pipeline entrypoint from API layer."""
    start_time = time.time()
    request = PredictionRequest(**raw_payload)
    mode = request.activeTab.value
    farming_month = request.farmingMonth if mode == "planning" else _current_month_name()
    detected_season = detect_season(farming_month)
    candidate_crops = _get_candidate_crops(detected_season, mode)

    logger.info("Mode=%s season=%s candidates=%s", mode, detected_season, candidate_crops)

    if mode == "current":
        candidates, current_climate_meta = _process_current_mode(request, candidate_crops)
        planning_climate_map = None
    else:
        candidates, planning_climate_map = _process_planning_mode(request, candidate_crops)
        current_climate_meta = None

    context = {
        "state": request.state,
        "farming_month": farming_month,
        "previous_crop": request.previousCrop,
        "previous_crop_month": request.previousCropMonth,
        "land_area": request.farm_size_float,
        "avg_rainfall": (
            current_climate_meta["rainfall"]
            if current_climate_meta
            else sum(item["rainfall"] for item in planning_climate_map.values()) / max(len(planning_climate_map), 1)
        ),
        "temperature": (
            current_climate_meta["temperature"]
            if current_climate_meta
            else sum(item["temperature"] for item in planning_climate_map.values()) / max(len(planning_climate_map), 1)
        ),
        "humidity": (
            current_climate_meta["humidity"]
            if current_climate_meta
            else sum(item["humidity"] for item in planning_climate_map.values()) / max(len(planning_climate_map), 1)
        ),
        "N": request.N,
        "P": request.P,
        "K": request.K,
        "pH": request.pH,
        "mode": mode,
    }

    adjusted = apply_all_rules(candidates, context)
    top_rows = adjusted[:3]
    selected_climate = _select_climate_meta(mode, top_rows, planning_climate_map, current_climate_meta)

    warnings: list[str] = []
    if top_rows and float(top_rows[0]["final_confidence"]) < 0.40:
        warnings.append("Top recommendation confidence is still low. Cross-check with a local agronomy expert.")
    if mode == "planning":
        warnings.append("Planning mode uses seasonal filtering and crop-window climate estimates.")

    output_recommendations = [
        _format_recommendation(row, rank=index + 1, climate_meta=selected_climate)
        for index, row in enumerate(top_rows)
    ]

    processing_time = int((time.time() - start_time) * 1000)

    return {
        "success": True,
        "mode": mode,
        "input_summary": {
            "state": request.state,
            "district": request.district,
            "farming_month": farming_month,
            "season": detected_season,
            "farm_size_acres": request.farm_size_float,
            "previous_crop": request.previousCrop or "None",
            "soil_profile": f"N:{request.N} P:{request.P} K:{request.K} pH:{request.pH}",
        },
        "climate_used": {
            "temperature": selected_climate.get("temperature"),
            "humidity": selected_climate.get("humidity"),
            "rainfall": selected_climate.get("rainfall"),
            "source": selected_climate.get("source", "historical_average"),
            "months_covered": selected_climate.get("months_covered"),
        },
        "recommendations": output_recommendations,
        "metadata": {
            "total_crops_evaluated": len(candidates),
            "season_detected": detected_season,
            "farming_month": farming_month,
            "valid_crops_for_season": candidate_crops,
            "rules_applied": [
                "hard_season_filter",
                "model_probability",
                "training_profile_fit",
                "knowledge_base_fit",
                "rotation",
                "regional_fit",
                "farm_size",
                "water_suitability",
            ],
            "processing_time_ms": processing_time,
            "model_version": "v2.1-hybrid",
            "warnings": warnings,
            "disclaimer": "AI-based advisory. Consult local agricultural experts before final planting decisions.",
        },
    }
