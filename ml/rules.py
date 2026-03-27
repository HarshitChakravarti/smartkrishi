"""Rule-based scoring and explanation layer for SmartKrishi recommendations."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

try:
    from .config import (
        ACCEPTABLE_CLIMATE_BOOST,
        BAD_PREDECESSOR_PENALTY,
        BEST_STATE_BOOST,
        CORRECT_SEASON_BOOST,
        CROP_FAMILIES_PATH,
        EXCELLENT_CLIMATE_BOOST,
        EXCELLENT_SOIL_BOOST,
        FARM_SIZE_BOOST,
        FARM_SIZE_PENALTY,
        IDEAL_ROTATION_BOOST,
        IDEAL_SOWING_MONTH_BOOST,
        MAX_NEGATIVE_ADJUSTMENT,
        MAX_POSITIVE_ADJUSTMENT,
        MODERATE_STATE_BOOST,
        PERENNIAL_NEUTRAL,
        POOR_CLIMATE_PENALTY,
        POOR_SOIL_PENALTY,
        SAME_CROP_ROTATION_PENALTY,
        SEASONS,
        UNSUITABLE_STATE_PENALTY,
        WATER_SHORTAGE_PENALTY,
        WRONG_SEASON_PENALTY,
    )
    from .crop_knowledge import CropKnowledgeBase
except ImportError:  # pragma: no cover
    from config import (  # type: ignore
        ACCEPTABLE_CLIMATE_BOOST,
        BAD_PREDECESSOR_PENALTY,
        BEST_STATE_BOOST,
        CORRECT_SEASON_BOOST,
        CROP_FAMILIES_PATH,
        EXCELLENT_CLIMATE_BOOST,
        EXCELLENT_SOIL_BOOST,
        FARM_SIZE_BOOST,
        FARM_SIZE_PENALTY,
        IDEAL_ROTATION_BOOST,
        IDEAL_SOWING_MONTH_BOOST,
        MAX_NEGATIVE_ADJUSTMENT,
        MAX_POSITIVE_ADJUSTMENT,
        MODERATE_STATE_BOOST,
        PERENNIAL_NEUTRAL,
        POOR_CLIMATE_PENALTY,
        POOR_SOIL_PENALTY,
        SAME_CROP_ROTATION_PENALTY,
        SEASONS,
        UNSUITABLE_STATE_PENALTY,
        WATER_SHORTAGE_PENALTY,
        WRONG_SEASON_PENALTY,
    )
    from crop_knowledge import CropKnowledgeBase  # type: ignore

kb = CropKnowledgeBase()


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, float(value)))


def detect_season(month_name: str) -> str:
    month_lookup = {
        "january": 1,
        "jan": 1,
        "february": 2,
        "feb": 2,
        "march": 3,
        "mar": 3,
        "april": 4,
        "apr": 4,
        "may": 5,
        "june": 6,
        "jun": 6,
        "july": 7,
        "jul": 7,
        "august": 8,
        "aug": 8,
        "september": 9,
        "sep": 9,
        "sept": 9,
        "october": 10,
        "oct": 10,
        "november": 11,
        "nov": 11,
        "december": 12,
        "dec": 12,
    }
    month_number = month_lookup.get(str(month_name).strip().lower())
    if month_number is None:
        raise ValueError(f"Invalid month for season detection: {month_name}")

    for season_name, months in SEASONS.items():
        if month_number in months:
            return season_name
    return "Kharif"


def compute_rotation_gap_months(previous_crop_month: str, farming_month: str) -> int:
    month_lookup = {
        "january": 1,
        "jan": 1,
        "february": 2,
        "feb": 2,
        "march": 3,
        "mar": 3,
        "april": 4,
        "apr": 4,
        "may": 5,
        "june": 6,
        "jun": 6,
        "july": 7,
        "jul": 7,
        "august": 8,
        "aug": 8,
        "september": 9,
        "sep": 9,
        "sept": 9,
        "october": 10,
        "oct": 10,
        "november": 11,
        "nov": 11,
        "december": 12,
        "dec": 12,
    }
    previous = month_lookup.get(str(previous_crop_month).strip().lower())
    current = month_lookup.get(str(farming_month).strip().lower())
    if previous is None or current is None:
        return 0
    return (current - previous) % 12


@lru_cache(maxsize=1)
def load_crop_families() -> dict[str, str]:
    path = Path(CROP_FAMILIES_PATH)
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    flattened: dict[str, str] = {}
    for family_name, members in raw.items():
        for crop_name in members:
            flattened[str(crop_name).strip().lower()] = str(family_name).strip().lower()
    return flattened


def get_generic_advisories() -> dict:
    return {
        "irrigation": "Use moisture-based irrigation scheduling suited to the local season.",
        "fertilizer": "Use soil-test guided NPK application and correct micronutrient deficiencies early.",
        "pest_watch": "Scout fields weekly and follow local extension advisories for pest pressure.",
        "weather_note": "Monitor local rainfall and temperature shifts during critical crop stages.",
    }


def _generic_rotation_score(crop_name: str, previous_crop: str) -> tuple[float, str]:
    current_crop = str(crop_name).strip().lower()
    previous = str(previous_crop or "").strip().lower()
    if not previous or previous in {"none", "null"}:
        return 0.60, ""
    if previous == current_crop:
        return 0.05, f"Avoid repeating {crop_name} immediately after {previous_crop}"

    families = load_crop_families()
    current_family = families.get(current_crop)
    previous_family = families.get(previous)

    if current_family and previous_family and current_family == previous_family:
        return 0.30, f"{previous_crop} and {crop_name} belong to the same crop family"
    if previous_family == "cereals" and current_family == "legumes":
        return 0.90, f"{crop_name} benefits from following a cereal crop like {previous_crop}"
    if previous_family == "legumes" and current_family == "cereals":
        return 0.80, f"{crop_name} can benefit from residual nitrogen after {previous_crop}"
    return 0.60, ""


def _season_component(candidate: dict, crop_profile, farming_month: str, detected_season: str) -> tuple[float, str]:
    if crop_profile:
        season_score = crop_profile.get_season_fit_score(farming_month, detected_season)
        if season_score >= 0.9:
            return 1.0, f"Ideal sowing window for {crop_profile.display_name}"
        if season_score >= 0.5:
            return 0.80, f"Well aligned with the {detected_season} season"
        if season_score > 0:
            return 0.65, f"Acceptable for the {detected_season} season"
        return 0.05, f"Poor seasonal fit for {detected_season}"

    if candidate.get("season_allowed", True):
        return 0.85, f"Included in the {detected_season} seasonal crop set"
    return 0.25, f"Weak seasonal fit for {detected_season}"


def _climate_component(candidate: dict, crop_profile, context: dict) -> tuple[float, str]:
    temperature = float(candidate.get("temperature", context.get("temperature", 25)))
    humidity = float(candidate.get("humidity", context.get("humidity", 60)))
    rainfall = float(candidate.get("rainfall", context.get("avg_rainfall", 100)))
    if crop_profile:
        score = crop_profile.get_climate_fit_score(
            temperature=temperature,
            humidity=humidity,
            rainfall=rainfall,
        )
        if score >= 0.8:
            return score, "Excellent climate match"
        if score >= 0.6:
            return score, "Good climate fit"
        if score >= 0.4:
            return score, "Moderate climate fit"
        return score, "Climate fit is weaker than ideal"

    score = float(candidate.get("training_climate_fit", candidate.get("profile_fit", 0.55)))
    if score >= 0.75:
        return score, "Close to the crop's training climate profile"
    if score >= 0.50:
        return score, "Partially aligned with the crop's training climate profile"
    return score, "Climate differs from the crop's training profile"


def _soil_component(candidate: dict, crop_profile, context: dict) -> tuple[float, str]:
    if crop_profile:
        score = crop_profile.get_soil_fit_score(
            N=context.get("N", 50),
            P=context.get("P", 50),
            K=context.get("K", 50),
            pH=context.get("pH", 6.5),
        )
        if score >= 0.8:
            return score, "Soil nutrients are well aligned"
        if score >= 0.6:
            return score, "Soil fit is acceptable"
        if score >= 0.4:
            return score, "Soil fit is moderate"
        return score, "Soil nutrients may need correction"

    score = float(candidate.get("training_soil_fit", candidate.get("profile_fit", 0.55)))
    if score >= 0.75:
        return score, "Soil values are close to the crop's training profile"
    if score >= 0.50:
        return score, "Soil values are moderately aligned with training data"
    return score, "Soil values are weakly aligned with training data"


def _regional_component(crop_profile, state: str) -> tuple[float, str]:
    if not crop_profile:
        return 0.55, ""
    regional_score = crop_profile.get_regional_score(state)
    if regional_score > 0.09:
        return 1.0, f"{state} is a strong state for {crop_profile.display_name}"
    if regional_score > 0:
        return 0.75, f"{crop_profile.display_name} has moderate regional support in {state}"
    if regional_score < 0:
        return 0.25, f"{crop_profile.display_name} is less common in {state}"
    return 0.55, ""


def _farm_size_component(crop_profile, farm_size: float) -> tuple[float, str]:
    if not crop_profile:
        return 0.70, ""
    score = crop_profile.get_farm_size_fit(farm_size)
    if score >= 0.8:
        return score, ""
    return score, f"Farm size ({farm_size} acres) is not ideal for this crop"


def _water_component(candidate: dict, crop_profile, rainfall: float) -> tuple[float, str]:
    rainfall = float(candidate.get("rainfall", rainfall))
    if crop_profile:
        score = crop_profile.get_water_suitability(rainfall)
        if score >= 0.75:
            return score, "Water availability is suitable"
        if score >= 0.50:
            return score, "Water availability is workable"
        return score, "Water availability is a constraint"
    score = float(candidate.get("training_climate_fit", candidate.get("profile_fit", 0.55)))
    return score, ""


def _compute_agronomic_score(
    mode: str,
    season_score: float,
    climate_score: float,
    soil_score: float,
    rotation_score: float,
    regional_score: float,
    farm_size_score: float,
    water_score: float,
) -> float:
    if mode == "planning":
        return _clamp01(
            season_score * 0.26
            + climate_score * 0.14
            + soil_score * 0.18
            + rotation_score * 0.16
            + regional_score * 0.09
            + farm_size_score * 0.07
            + water_score * 0.10
        )

    return _clamp01(
        season_score * 0.16
        + climate_score * 0.24
        + soil_score * 0.18
        + regional_score * 0.12
        + farm_size_score * 0.08
        + water_score * 0.12
        + rotation_score * 0.10
    )


def _fit_adjustment(score: float, excellent_boost: float, acceptable_boost: float, poor_penalty: float) -> float:
    if score >= 0.82:
        return excellent_boost
    if score >= 0.62:
        return acceptable_boost
    if score < 0.40:
        return poor_penalty
    return 0.0


def apply_all_rules(candidates: list[dict], context: dict) -> list[dict]:
    """Apply capped agronomic adjustments on top of ML confidence."""
    enhanced_candidates = []
    mode = str(context.get("mode", "")).lower()
    farming_month = str(context.get("farming_month", ""))
    detected_season = detect_season(farming_month)
    rainfall = float(context.get("avg_rainfall", 100))
    previous_crop = str(context.get("previous_crop", ""))
    farm_size = float(context.get("land_area", 3))
    state = str(context.get("state", ""))

    for candidate in candidates:
        crop_name = str(candidate["crop"]).strip().lower()
        crop_profile = kb.get_crop(crop_name)
        ml_score = float(candidate.get("ml_confidence", 0.0))

        season_score, season_reason = _season_component(candidate, crop_profile, farming_month, detected_season)
        climate_score, climate_reason = _climate_component(candidate, crop_profile, context)
        soil_score, soil_reason = _soil_component(candidate, crop_profile, context)

        if mode == "planning":
            if crop_profile:
                raw_rotation = crop_profile.get_rotation_score(previous_crop)
                if raw_rotation >= 0.15:
                    rotation_score = 0.95
                elif raw_rotation > 0:
                    rotation_score = 0.80
                elif raw_rotation == 0:
                    rotation_score = 0.60
                elif raw_rotation <= -0.30:
                    rotation_score = 0.05
                else:
                    rotation_score = 0.30
                rotation_reason = crop_profile.get_rotation_reason(previous_crop)
            else:
                rotation_score, rotation_reason = _generic_rotation_score(crop_name, previous_crop)
        else:
            rotation_score, rotation_reason = 0.60, ""

        regional_score, regional_reason = _regional_component(crop_profile, state)
        farm_size_score, farm_size_reason = _farm_size_component(crop_profile, farm_size)
        water_score, water_reason = _water_component(candidate, crop_profile, rainfall)

        agronomic_score = _compute_agronomic_score(
            mode=mode,
            season_score=season_score,
            climate_score=climate_score,
            soil_score=soil_score,
            rotation_score=rotation_score,
            regional_score=regional_score,
            farm_size_score=farm_size_score,
            water_score=water_score,
        )

        adjustments: list[tuple[float, str]] = []

        if crop_profile and crop_profile.is_perennial:
            adjustments.append((PERENNIAL_NEUTRAL, "Perennial crops stay eligible across seasons"))
        elif season_score >= 0.95:
            adjustments.append((IDEAL_SOWING_MONTH_BOOST, season_reason))
        elif season_score >= 0.50:
            adjustments.append((CORRECT_SEASON_BOOST, season_reason))
        elif season_score <= 0.0:
            adjustments.append((WRONG_SEASON_PENALTY, season_reason))

        climate_adjustment = _fit_adjustment(
            climate_score,
            EXCELLENT_CLIMATE_BOOST,
            ACCEPTABLE_CLIMATE_BOOST,
            POOR_CLIMATE_PENALTY,
        )
        if climate_adjustment:
            adjustments.append((climate_adjustment, climate_reason))

        soil_adjustment = _fit_adjustment(
            soil_score,
            EXCELLENT_SOIL_BOOST,
            0.0,
            POOR_SOIL_PENALTY,
        )
        if soil_adjustment:
            adjustments.append((soil_adjustment, soil_reason))

        if mode == "planning":
            if rotation_score >= 0.90:
                adjustments.append((IDEAL_ROTATION_BOOST, rotation_reason))
            elif rotation_score <= 0.10:
                adjustments.append((SAME_CROP_ROTATION_PENALTY, rotation_reason))
            elif rotation_score < 0.45:
                adjustments.append((BAD_PREDECESSOR_PENALTY, rotation_reason))

        if regional_score >= 1.0:
            adjustments.append((BEST_STATE_BOOST, regional_reason))
        elif regional_score >= 0.75:
            adjustments.append((MODERATE_STATE_BOOST, regional_reason))
        elif regional_score <= 0.25:
            adjustments.append((UNSUITABLE_STATE_PENALTY, regional_reason))

        if farm_size_score >= 0.95:
            adjustments.append((FARM_SIZE_BOOST, "Farm size is well aligned"))
        elif farm_size_score < 0.50:
            adjustments.append((FARM_SIZE_PENALTY, farm_size_reason or "Farm size is below the ideal range"))

        if water_score < 0.45:
            adjustments.append((WATER_SHORTAGE_PENALTY, water_reason or "Water availability is a constraint"))

        total_adjustment = _clamp(
            sum(adjustment for adjustment, _ in adjustments),
            MAX_NEGATIVE_ADJUSTMENT,
            MAX_POSITIVE_ADJUSTMENT,
        )

        if candidate.get("model_supported", False):
            if total_adjustment > 0:
                total_adjustment *= max(0.20, 1.0 - ml_score)
            final_confidence = _clamp01(ml_score + total_adjustment)
        else:
            final_confidence = agronomic_score
            total_adjustment = final_confidence - ml_score

        reasons = [
            reason
            for reason in [
                season_reason,
                climate_reason,
                soil_reason,
                rotation_reason,
                regional_reason,
                farm_size_reason,
                water_reason,
            ]
            if reason
        ]
        positive_reasons = [reason for adjustment, reason in adjustments if adjustment > 0 and reason]
        reason_string = " + ".join(positive_reasons[:3]) if positive_reasons else (reasons[0] if reasons else "General agronomic fit")

        if crop_profile:
            advisories = crop_profile.get_advisories(context)
            display_name = crop_profile.display_name
            hindi_name = crop_profile.hindi_name
            sowing_months = crop_profile.sowing_months
            growing_duration = f"{crop_profile.growing_months} months"
            category = crop_profile.category
            tags = crop_profile.tags
            farming_plan = crop_profile.get_farming_plan()
            fertilizer_plan = crop_profile.get_full_fertilizer_plan()
            irrigation_plan = crop_profile.get_full_irrigation_plan()
        else:
            advisories = get_generic_advisories()
            display_name = crop_name.replace("_", " ").title()
            hindi_name = ""
            sowing_months = []
            growing_duration = candidate.get("growing_duration", "Unknown")
            category = candidate.get("category", "")
            tags = candidate.get("tags", [])
            farming_plan = {}
            fertilizer_plan = {}
            irrigation_plan = {}

        enhanced_candidates.append(
            {
                "crop": crop_name,
                "display_name": display_name,
                "hindi_name": hindi_name,
                "ml_confidence": round(ml_score, 6),
                "agronomic_score": round(agronomic_score, 6),
                "final_confidence": round(final_confidence, 6),
                "rule_adjustment": f"{total_adjustment:+.2f}",
                "reason": reason_string,
                "detailed_reasons": reasons,
                "season": detected_season,
                "growing_duration": growing_duration,
                "sowing_months": sowing_months,
                "advisories": advisories,
                "farming_plan": farming_plan,
                "full_fertilizer_plan": fertilizer_plan,
                "full_irrigation_plan": irrigation_plan,
                "tags": tags,
                "category": category,
                "water_needs": crop_profile.water_need_category if crop_profile else "",
            }
        )

    enhanced_candidates.sort(key=lambda row: row["final_confidence"], reverse=True)
    return enhanced_candidates
