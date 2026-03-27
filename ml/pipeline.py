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
    from .crop_knowledge import CropKnowledgeBase
except ImportError:  # pragma: no cover
    from feature_generator import generate_features, get_crop_duration  # type: ignore
    from model import get_all_crop_names, predict_probability_distribution, predict_top_crops  # type: ignore
    from rules import apply_all_rules, detect_season  # type: ignore
    from schemas import PredictionRequest  # type: ignore
    from crop_knowledge import CropKnowledgeBase  # type: ignore

kb = CropKnowledgeBase()


def _current_month_name() -> str:
    return dt.datetime.now(dt.UTC).strftime("%B")


def _prefilter_crops_for_season(farming_month: str) -> list[str]:
    """
    BEFORE running ML predictions, eliminate crops that are
    completely wrong for the season. This prevents the ML model
    from recommending mothbeans in Rabi.
    
    Returns list of crop names that CAN be grown in this season.
    """
    season = detect_season(farming_month)
    
    # Get crops valid for this season from knowledge base
    valid_crops = kb.get_crops_for_season(season)
    
    # Always include perennials
    all_crops = kb.get_all_crops()
    perennials = [c for c in all_crops if kb.get_crop(c) and kb.get_crop(c).is_perennial]
    
    valid_set = set(valid_crops) | set(perennials)
    
    # If we somehow filter out everything, return all (safety)
    if not valid_set or len(valid_set) < 3:
        return all_crops
    
    return list(valid_set)


def generate_advisories(crop: str, context: dict, climate: dict) -> dict:
    """Fallback generic advisories if crop not in KB."""
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
    # Phase 1: Pre-filter by season
    valid_crops = _prefilter_crops_for_season(str(request.farmingMonth))
    
    all_candidates: list[dict] = []
    sample_climate: dict[str, Any] | None = None

    for crop in valid_crops:
        features, climate_meta = generate_features(request.model_dump(mode="json"), crop_name=crop)
        distribution = predict_probability_distribution(features)
        crop_prob = next((row["ml_confidence"] for row in distribution if row["crop"] == crop), 0.0)
        
        all_candidates.append({"crop": crop, "ml_confidence": crop_prob})
        if sample_climate is None:
            sample_climate = climate_meta

    all_candidates.sort(key=lambda row: row["ml_confidence"], reverse=True)
    return all_candidates[:8], sample_climate or {}


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
        "temperature": climate_meta["temperature"],
        "humidity": climate_meta["humidity"],
        "N": request.N,
        "P": request.P,
        "K": request.K,
        "pH": request.pH,
        "mode": mode,
    }

    # Pass to rules layer (which now uses CropKnowledgeBase)
    adjusted = apply_all_rules(candidates, context)
    
    # Return TOP 3 crops
    top_n = adjusted[:3]

    warnings: list[str] = []
    if request.N == 0 and request.P == 0 and request.K == 0:
        warnings.append("All soil nutrient values are zero; recommendation confidence may be lower.")
    if request.pH <= 0:
        warnings.append("pH value is unusual; please verify soil reading.")
    if top_n and max(row["final_confidence"] for row in top_n) < 0.30:
        warnings.append("Low-confidence recommendation. Cross-check with local agronomy expert.")

    output_recommendations = []
    for index, row in enumerate(top_n):
        # Format the final dictionary conforming to the standard + extra fields from KB
        crop_name = row["crop"]
        
        # Populate fallbacks if crop was completely unknown
        if "display_name" not in row:
            row["advisories"] = generate_advisories(crop_name, context=context, climate=climate_meta)
            row["growing_duration"] = f"{get_crop_duration(crop_name)} months"
            row["season"] = detect_season(farming_month)

        rec = {
            "rank": index + 1,
            "crop": crop_name,
            "confidence": round(row["final_confidence"], 2),
            "ml_score": round(row["ml_confidence"], 2),
            "rule_adjustment": row["rule_adjustment"],
            "season": row["season"],
            "growing_duration": row["growing_duration"],
            "reason": row["reason"],
            "advisories": row["advisories"],
        }
        
        # Merge extra fields requested by user (display name, tags, farming plan, etc)
        # We put them directly into the dict so that they are "extra fields"
        if "display_name" in row:
            rec["display_name"] = row.get("display_name")
            rec["hindi_name"] = row.get("hindi_name")
            rec["sowing_months"] = row.get("sowing_months", [])
            rec["tags"] = row.get("tags", [])
            rec["category"] = row.get("category", "")
            rec["farming_plan"] = row.get("farming_plan", {})
            rec["fertilizer_plan_detailed"] = row.get("full_fertilizer_plan", {})
            rec["irrigation_plan_detailed"] = row.get("full_irrigation_plan", {})
            rec["detailed_reasons"] = row.get("detailed_reasons", [])
            
        output_recommendations.append(rec)

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
        "recommendations": output_recommendations,
        "metadata": {
            "total_crops_evaluated": len(adjusted),
            "rules_applied": ["knowledge_base_season", "climate_fit", "soil_nutrition", "crop_rotation", "farm_size", "regional_suitability", "water_needs"],
            "processing_time_ms": processing_time,
            "model_version": "v2.0-KB",
            "warnings": warnings,
            "disclaimer": "AI-based advisory. Consult local agricultural experts.",
        },
    }
