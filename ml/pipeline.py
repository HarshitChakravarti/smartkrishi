"""Main orchestration pipeline for SmartKrishi recommendation engine."""

from __future__ import annotations

import datetime as dt
import time
from typing import Any

try:
    from .feature_generator import generate_features, get_crop_duration
    from .model import get_all_crop_names, predict_probability_distribution, predict_top_crops
    from .rules import apply_all_rules, detect_season
    from .schemas import PredictionRequest
except ImportError:  # pragma: no cover
    from feature_generator import generate_features, get_crop_duration  # type: ignore
    from model import get_all_crop_names, predict_probability_distribution, predict_top_crops  # type: ignore
    from rules import apply_all_rules, detect_season  # type: ignore
    from schemas import PredictionRequest  # type: ignore


def _current_month_name() -> str:
    return dt.datetime.now(dt.UTC).strftime("%B")


def generate_advisories(crop: str, context: dict, climate: dict) -> dict:
    crop_lower = str(crop).lower()
    rainfall = float(climate["rainfall"])
    ph_warning = "Keep pH between 6.0 and 7.5 for best nutrient availability."

    if crop_lower in {"rice", "sugarcane", "banana"}:
        irrigation = "Maintain consistent soil moisture; schedule light but frequent irrigation cycles."
    elif rainfall < 60:
        irrigation = "Adopt drip or furrow irrigation to conserve water during low rainfall months."
    else:
        irrigation = "Use moisture-based irrigation scheduling and avoid overwatering."

    if crop_lower in {"chickpea", "lentil", "mungbean", "mothbeans"}:
        fertilizer = "Prioritize phosphorus and potassium; avoid excessive nitrogen for legumes."
    elif crop_lower in {"rice", "maize", "wheat"}:
        fertilizer = "Split nitrogen doses across growth stages and complement with balanced NPK."
    else:
        fertilizer = "Use soil-test guided NPK application with micronutrient correction where needed."

    if crop_lower in {"cotton", "chilli", "pigeonpeas"}:
        pest_watch = "Monitor for sucking pests and borers; use integrated pest management traps."
    else:
        pest_watch = "Scout fields weekly and act early using local extension advisories."

    weather_note = (
        f"Expected climate window uses {climate['source']} with avg temperature {climate['temperature']} C, "
        f"humidity {climate['humidity']}%, rainfall {climate['rainfall']} mm. {ph_warning}"
    )

    return {
        "irrigation": irrigation,
        "fertilizer": fertilizer,
        "pest_watch": pest_watch,
        "weather_note": weather_note,
    }


def _process_current_mode(request: PredictionRequest) -> tuple[list[dict], dict]:
    features, climate_meta = generate_features(request.model_dump(mode="json"), crop_name=None)
    return predict_top_crops(features, top_n=5), climate_meta


def _process_planning_mode(request: PredictionRequest) -> tuple[list[dict], dict]:
    all_crops = get_all_crop_names()
    all_candidates: list[dict] = []
    sample_climate: dict[str, Any] | None = None

    for crop in all_crops:
        features, climate_meta = generate_features(request.model_dump(mode="json"), crop_name=crop)
        distribution = predict_probability_distribution(features)
        crop_prob = next((row["ml_confidence"] for row in distribution if row["crop"] == crop), 0.0)
        all_candidates.append({"crop": crop, "ml_confidence": crop_prob})
        if sample_climate is None:
            sample_climate = climate_meta

    all_candidates.sort(key=lambda row: row["ml_confidence"], reverse=True)
    return all_candidates[:5], sample_climate or {}


def get_recommendations(raw_payload: dict) -> dict:
    """Pipeline entrypoint from API layer."""
    start_time = time.time()
    request = PredictionRequest(**raw_payload)
    mode = request.activeTab.value

    if mode == "current":
        candidates, climate_meta = _process_current_mode(request)
    else:
        candidates, climate_meta = _process_planning_mode(request)

    farming_month = request.farmingMonth or _current_month_name()
    context = {
        "state": request.state,
        "farming_month": farming_month,
        "previous_crop": request.previousCrop,
        "previous_crop_month": request.previousCropMonth,
        "land_area": request.farm_size_float,
        "avg_rainfall": climate_meta["rainfall"],
        "mode": mode,
    }

    adjusted = apply_all_rules(candidates, context)
    top_2 = adjusted[:2]

    warnings: list[str] = []
    if request.N == 0 and request.P == 0 and request.K == 0:
        warnings.append("All soil nutrient values are zero; recommendation confidence may be lower.")
    if request.pH <= 0:
        warnings.append("pH value is unusual; please verify soil reading.")
    if top_2 and max(row["final_confidence"] for row in top_2) < 0.30:
        warnings.append("Low-confidence recommendation. Cross-check with local agronomy expert.")

    for recommendation in top_2:
        recommendation["advisories"] = generate_advisories(recommendation["crop"], context=context, climate=climate_meta)
        recommendation["growing_duration"] = f"{get_crop_duration(recommendation['crop'])} months"
        recommendation["season"] = detect_season(farming_month)

    processing_time = int((time.time() - start_time) * 1000)

    return {
        "success": True,
        "mode": mode,
        "input_summary": {
            "state": request.state,
            "district": request.district,
            "farming_month": farming_month,
            "season": detect_season(farming_month),
            "farm_size_acres": request.farm_size_float,
            "previous_crop": request.previousCrop or "None",
            "soil_profile": f"N:{request.N} P:{request.P} K:{request.K} pH:{request.pH}",
        },
        "climate_used": {
            "temperature": climate_meta["temperature"],
            "humidity": climate_meta["humidity"],
            "rainfall": climate_meta["rainfall"],
            "source": climate_meta["source"],
            "months_covered": climate_meta.get("months_covered"),
        },
        "recommendations": [
            {
                "rank": index + 1,
                "crop": row["crop"],
                "confidence": round(row["final_confidence"], 2),
                "ml_score": round(row["ml_confidence"], 2),
                "rule_adjustment": row["rule_adjustment"],
                "season": row["season"],
                "growing_duration": row["growing_duration"],
                "reason": row["reason"],
                "advisories": row["advisories"],
            }
            for index, row in enumerate(top_2)
        ],
        "metadata": {
            "total_crops_evaluated": len(adjusted),
            "rules_applied": ["seasonal", "crop_rotation", "rainfall", "farm_size", "regional"],
            "processing_time_ms": processing_time,
            "model_version": "v1.0",
            "warnings": warnings,
            "disclaimer": "AI-based advisory. Consult local agricultural experts.",
        },
    }
