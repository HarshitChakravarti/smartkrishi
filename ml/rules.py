"""Layer 3 rule-based post processing for explainable crop recommendations."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

try:
    from .config import (
        CROP_FAMILIES_PATH,
        HIGH_RAIN_WATERLOG_PENALTY,
        HIGH_RAIN_WATER_BOOST,
        HIGH_RAINFALL_THRESHOLD,
        LARGE_FARM_STAPLE_BOOST,
        LARGE_FARM_THRESHOLD,
        LOW_RAIN_DROUGHT_BOOST,
        LOW_RAIN_WATER_PENALTY,
        LOW_RAINFALL_THRESHOLD,
        MODERATE_RAIN_BOOST,
        PERENNIAL_BOOST,
        RECENT_ROTATION_PENALTY,
        REGIONAL_BOOST,
        ROTATION_BONUS,
        SAME_CROP_PENALTY,
        SAME_FAMILY_PENALTY,
        SEASONS,
        SEASONAL_CROPS_PATH,
        SEASON_BOOST,
        SMALL_FARM_HIGHVALUE_BOOST,
        SMALL_FARM_THRESHOLD,
        WRONG_SEASON_PENALTY,
    )
except ImportError:  # pragma: no cover
    from config import (  # type: ignore
        CROP_FAMILIES_PATH,
        HIGH_RAIN_WATERLOG_PENALTY,
        HIGH_RAIN_WATER_BOOST,
        HIGH_RAINFALL_THRESHOLD,
        LARGE_FARM_STAPLE_BOOST,
        LARGE_FARM_THRESHOLD,
        LOW_RAIN_DROUGHT_BOOST,
        LOW_RAIN_WATER_PENALTY,
        LOW_RAINFALL_THRESHOLD,
        MODERATE_RAIN_BOOST,
        PERENNIAL_BOOST,
        RECENT_ROTATION_PENALTY,
        REGIONAL_BOOST,
        ROTATION_BONUS,
        SAME_CROP_PENALTY,
        SAME_FAMILY_PENALTY,
        SEASONS,
        SEASONAL_CROPS_PATH,
        SEASON_BOOST,
        SMALL_FARM_HIGHVALUE_BOOST,
        SMALL_FARM_THRESHOLD,
        WRONG_SEASON_PENALTY,
    )

WATER_INTENSIVE = {"rice", "jute", "sugarcane"}
DROUGHT_TOLERANT = {"millet", "millets", "chickpea", "mothbeans"}
WATERLOG_SENSITIVE = {"chickpea", "lentil"}
MODERATE_RAIN_CROPS = {"maize", "cotton"}
HIGH_VALUE_SMALL_FARM = {
    "banana",
    "mango",
    "grapes",
    "pomegranate",
    "papaya",
    "orange",
    "coffee",
    "watermelon",
    "muskmelon",
    "chilli",
}
STAPLE_LARGE_FARM = {"wheat", "rice", "maize"}
COMMERCIAL_LARGE_FARM = {"cotton", "jute"}

LEGUMES = {"lentil", "chickpea", "mungbean", "mothbeans", "blackgram", "pigeonpeas", "kidneybeans"}
CEREALS = {"rice", "wheat", "maize", "millet", "millets"}

REGIONAL_BOOSTS = {
    "Punjab": ["wheat", "rice", "maize"],
    "Haryana": ["wheat", "rice", "mustard"],
    "Maharashtra": ["cotton", "sugarcane", "soybean", "pomegranate"],
    "Karnataka": ["coffee", "rice", "coconut", "mango"],
    "Kerala": ["coconut", "coffee", "rice", "banana", "rubber"],
    "Tamil Nadu": ["rice", "banana", "coconut", "groundnut"],
    "West Bengal": ["rice", "jute", "potato"],
    "Rajasthan": ["millet", "chickpea", "mustard", "mothbeans"],
    "Uttar Pradesh": ["wheat", "rice", "sugarcane", "potato"],
    "Madhya Pradesh": ["wheat", "soybean", "chickpea", "lentil"],
    "Gujarat": ["cotton", "groundnut", "castor", "mango"],
    "Andhra Pradesh": ["rice", "cotton", "chilli", "mango"],
    "Telangana": ["rice", "cotton", "maize"],
    "Bihar": ["rice", "wheat", "maize", "lentil"],
    "Odisha": ["rice", "groundnut", "jute"],
}


@lru_cache(maxsize=1)
def _load_json(path: str) -> dict:
    file_path = Path(path)
    if not file_path.exists():
        return {}
    with file_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def _seasonal_crop_map() -> dict[str, set[str]]:
    raw = _load_json(SEASONAL_CROPS_PATH)
    return {key: {str(crop).lower() for crop in values} for key, values in raw.items() if isinstance(values, list)}


@lru_cache(maxsize=1)
def _crop_family_map() -> dict[str, str]:
    raw = _load_json(CROP_FAMILIES_PATH)
    mapping: dict[str, str] = {}
    for family, crops in raw.items():
        if not isinstance(crops, list):
            continue
        for crop in crops:
            mapping[str(crop).lower()] = str(family).lower()
    return mapping


def detect_season(month_name: str) -> str:
    month_lookup = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }
    month_number = month_lookup.get(str(month_name).strip().lower())
    if month_number is None:
        raise ValueError(f"Invalid month for season detection: {month_name}")

    for season_name, months in SEASONS.items():
        if month_number in months:
            return season_name
    return "Kharif"


def compute_rotation_gap_months(previous_crop_month: str, planting_month: str) -> int:
    lookup = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }
    prev = lookup.get(str(previous_crop_month).strip().lower())
    plant = lookup.get(str(planting_month).strip().lower())
    if prev is None or plant is None:
        raise ValueError("Invalid month supplied for rotation gap calculation")
    return (plant - prev) % 12


def get_crop_family(crop_name: str) -> str | None:
    return _crop_family_map().get(str(crop_name).strip().lower())


def _adjust(candidate: dict, delta: float, reason: str) -> None:
    candidate["score"] += delta
    candidate["adjustments"] += delta
    candidate["reasons"].append(reason)


def apply_crop_rotation(candidates: list[dict], previous_crop: str | None, previous_crop_month: str | None, farming_month: str) -> list[dict]:
    previous = str(previous_crop or "none").strip().lower()
    if previous in {"none", "null", ""}:
        return candidates

    gap = None
    if previous_crop_month and farming_month:
        gap = compute_rotation_gap_months(previous_crop_month, farming_month)

    previous_family = get_crop_family(previous)

    for candidate in candidates:
        crop = candidate["crop"]
        crop_family = get_crop_family(crop)

        if crop == previous:
            _adjust(candidate, SAME_CROP_PENALTY, "Same crop as previous crop (avoid monocropping)")
        elif previous_family and crop_family and previous_family == crop_family:
            _adjust(candidate, SAME_FAMILY_PENALTY, "Same crop family as previous crop")

        if gap is not None and gap < 3:
            _adjust(candidate, RECENT_ROTATION_PENALTY, "Short crop rotation gap (<3 months)")

        if crop in LEGUMES and previous in CEREALS:
            _adjust(candidate, ROTATION_BONUS, "Good rotation: legume after cereal")

    return candidates


def apply_seasonal_logic(candidates: list[dict], farming_month: str) -> list[dict]:
    detected_season = detect_season(farming_month)
    seasonal = _seasonal_crop_map()

    season_crops = seasonal.get(detected_season, set())
    perennial = seasonal.get("Perennial", set())
    other_season_crops = set().union(*[values for key, values in seasonal.items() if key not in {detected_season, "Perennial"}])

    for candidate in candidates:
        crop = candidate["crop"]
        if crop in season_crops:
            _adjust(candidate, SEASON_BOOST, f"Aligned with {detected_season} season")
        elif crop in perennial:
            _adjust(candidate, PERENNIAL_BOOST, "Perennial crop suited for year-round planning")
        elif crop in other_season_crops:
            _adjust(candidate, WRONG_SEASON_PENALTY, f"Typically not ideal in {detected_season} season")

    return candidates


def apply_rainfall_suitability(candidates: list[dict], avg_rainfall: float) -> list[dict]:
    rainfall = float(avg_rainfall)
    for candidate in candidates:
        crop = candidate["crop"]
        if rainfall < LOW_RAINFALL_THRESHOLD:
            if crop in WATER_INTENSIVE:
                _adjust(candidate, LOW_RAIN_WATER_PENALTY, "Insufficient rainfall for water-intensive crop")
            if crop in DROUGHT_TOLERANT:
                _adjust(candidate, LOW_RAIN_DROUGHT_BOOST, "Drought-tolerant crop suits low rainfall")
        elif rainfall > HIGH_RAINFALL_THRESHOLD:
            if crop in {"rice", "jute"}:
                _adjust(candidate, HIGH_RAIN_WATER_BOOST, "High rainfall supports this crop")
            if crop in WATERLOG_SENSITIVE:
                _adjust(candidate, HIGH_RAIN_WATERLOG_PENALTY, "Waterlogging risk in high-rainfall window")
        else:
            if crop in MODERATE_RAIN_CROPS:
                _adjust(candidate, MODERATE_RAIN_BOOST, "Moderate rainfall profile is suitable")

    return candidates


def apply_farm_size_logic(candidates: list[dict], land_area: float) -> list[dict]:
    area = float(land_area)
    for candidate in candidates:
        crop = candidate["crop"]
        if area < SMALL_FARM_THRESHOLD:
            if crop in HIGH_VALUE_SMALL_FARM:
                _adjust(candidate, SMALL_FARM_HIGHVALUE_BOOST, "High-value crop can improve small-farm returns")
            if crop in {"wheat", "rice"}:
                _adjust(candidate, -0.03, "Staple crop may offer lower margins on very small farms")
        elif area > LARGE_FARM_THRESHOLD:
            if crop in STAPLE_LARGE_FARM:
                _adjust(candidate, LARGE_FARM_STAPLE_BOOST, "Staple crop aligns with large-scale operations")
            if crop in COMMERCIAL_LARGE_FARM:
                _adjust(candidate, 0.03, "Commercial crop viable at larger scale")

    return candidates


def apply_regional_suitability(candidates: list[dict], state: str) -> list[dict]:
    state_name = str(state).strip().title()
    preferred = {crop.lower() for crop in REGIONAL_BOOSTS.get(state_name, [])}
    if not preferred:
        return candidates

    for candidate in candidates:
        if candidate["crop"] in preferred:
            _adjust(candidate, REGIONAL_BOOST, f"{state_name} has strong cultivation history for this crop")

    return candidates


def apply_all_rules(candidates: list[dict], context: dict) -> list[dict]:
    """Apply all rules and return sorted candidates with explainability fields."""
    enriched = [
        {
            "crop": str(candidate["crop"]).lower(),
            "ml_confidence": float(candidate["ml_confidence"]),
            "score": float(candidate["ml_confidence"]),
            "adjustments": 0.0,
            "reasons": [],
        }
        for candidate in candidates
    ]

    farming_month = context.get("farming_month")
    if farming_month:
        apply_seasonal_logic(enriched, farming_month)

    if str(context.get("mode", "")).lower() == "planning":
        apply_crop_rotation(
            enriched,
            context.get("previous_crop"),
            context.get("previous_crop_month"),
            farming_month,
        )

    apply_rainfall_suitability(enriched, float(context.get("avg_rainfall", 0.0)))
    apply_farm_size_logic(enriched, float(context.get("land_area", 0.0)))
    apply_regional_suitability(enriched, str(context.get("state", "")))

    for candidate in enriched:
        candidate["final_confidence"] = max(0.01, min(0.99, candidate["score"]))
        candidate["rule_adjustment"] = f"{candidate['adjustments']:+.2f}"
        if candidate["reasons"]:
            candidate["reason"] = " + ".join(candidate["reasons"])
        else:
            candidate["reason"] = "General soil and climate match"

    enriched.sort(key=lambda row: row["final_confidence"], reverse=True)
    return enriched
