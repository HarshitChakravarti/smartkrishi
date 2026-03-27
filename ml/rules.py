"""Layer 3 rule-based post processing for explainable crop recommendations."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

try:
    from .crop_knowledge import CropKnowledgeBase
    from .config import SEASONS
except ImportError:  # pragma: no cover
    from crop_knowledge import CropKnowledgeBase  # type: ignore
    from config import SEASONS  # type: ignore

kb = CropKnowledgeBase()


def detect_season(month_name: str) -> str:
    month_lookup = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
    }
    month_number = month_lookup.get(str(month_name).strip().lower())
    if month_number is None:
        raise ValueError(f"Invalid month for season detection: {month_name}")

    for season_name, months in SEASONS.items():
        if month_number in months:
            return season_name
    return "Kharif"


def get_generic_advisories() -> dict:
    return {
        "irrigation": "Use moisture-based irrigation scheduling.",
        "fertilizer": "Use soil-test guided NPK application.",
        "pest_watch": "Scout fields weekly and act early.",
        "weather_note": "Monitor weather continuously."
    }


def apply_all_rules(candidates: list[dict], context: dict) -> list[dict]:
    """
    Enhanced rule application using CropKnowledgeBase.
    
    For each candidate crop:
    1. Get its CropProfile from knowledge base
    2. Compute fit scores using crop-specific ranges
    3. Build human-readable reason from specific crop data
    4. Generate crop-specific advisories
    """
    enhanced_candidates = []
    
    for candidate in candidates:
        crop_name = candidate["crop"]
        crop_profile = kb.get_crop(crop_name)
        
        # Backward compatibility format wrapper
        result = {
            "crop": crop_name,
            "ml_confidence": candidate["ml_confidence"],
            "score": candidate["ml_confidence"], # Legacy compat
        }
        
        if not crop_profile:
            # Unknown crop — keep ML score, no rule adjustments
            result["final_confidence"] = candidate["ml_confidence"]
            result["reason"] = "General soil and climate match (Not in KB)"
            result["rule_adjustment"] = "+0.00"
            result["advisories"] = get_generic_advisories()
            result["season"] = "Unknown"
            result["growing_duration"] = "Unknown"
            enhanced_candidates.append(result)
            continue
            
        ml_score = candidate["ml_confidence"]
        adjustments = 0.0
        reasons = []
        
        # ═══ RULE 1: Season + Sowing Month Fit ═══
        farming_month = context.get("farming_month", "")
        detected_season = detect_season(farming_month)
        season_score = crop_profile.get_season_fit_score(farming_month, detected_season)
        
        if season_score >= 0.8:
            adjustments += 0.12
            reasons.append(f"✅ Ideal sowing month for {crop_profile.display_name}")
        elif season_score >= 0.3:
            adjustments += 0.05
            reasons.append(f"✅ {detected_season} season crop")
        elif season_score <= -0.5:
            adjustments -= 0.35  # HEAVY penalty — wrong season
            reasons.append(f"❌ Not suitable for {detected_season} season (typically {crop_profile.primary_season})")
            
        # ═══ RULE 2: Climate Fit ═══
        climate_score = crop_profile.get_climate_fit_score(
            temperature=context.get("temperature", 25),
            humidity=context.get("humidity", 60),
            rainfall=context.get("avg_rainfall", 100)
        )
        
        if climate_score >= 0.8:
            adjustments += 0.08
            reasons.append("✅ Excellent climate match")
        elif climate_score >= 0.5:
            adjustments += 0.03
            reasons.append("✅ Acceptable climate conditions")
        elif climate_score < 0.3:
            adjustments -= 0.15
            reasons.append("⚠️ Climate conditions not ideal for this crop")
            
        # ═══ RULE 3: Soil Fit ═══
        soil_score = crop_profile.get_soil_fit_score(
            N=context.get("N", 50),
            P=context.get("P", 50),
            K=context.get("K", 50),
            pH=context.get("pH", 6.5)
        )
        
        if soil_score >= 0.8:
            adjustments += 0.06
            reasons.append("✅ Soil nutrients well-suited")
        elif soil_score < 0.4:
            adjustments -= 0.10
            reasons.append("⚠️ Soil nutrients may need adjustment")
            
        # ═══ RULE 4: Crop Rotation ═══
        if str(context.get("mode", "")).lower() == "planning":
            previous_crop = context.get("previous_crop", "")
            rotation_score = crop_profile.get_rotation_score(previous_crop)
            rotation_reason = crop_profile.get_rotation_reason(previous_crop)
            
            adjustments += rotation_score
            if rotation_reason:
                reasons.append(rotation_reason)
                
        # ═══ RULE 5: Regional Suitability ═══
        state = context.get("state", "")
        regional_score = crop_profile.get_regional_score(state)
        
        if regional_score > 0:
            adjustments += regional_score
            reasons.append(f"✅ {state} is known for {crop_profile.display_name} cultivation")
        elif regional_score < 0:
            adjustments += regional_score
            reasons.append(f"⚠️ {crop_profile.display_name} is not commonly grown in {state}")
            
        # ═══ RULE 6: Farm Size ═══
        farm_size = context.get("land_area", 3)
        size_fit = crop_profile.get_farm_size_fit(farm_size)
        
        if size_fit >= 0.8:
            adjustments += 0.03
        elif size_fit < 0.4:
            adjustments -= 0.05
            reasons.append(f"⚠️ Farm size ({farm_size} acres) may be limiting")
            
        # ═══ RULE 7: Water Suitability ═══
        water_score = crop_profile.get_water_suitability(context.get("avg_rainfall", 100))
        
        if water_score < 0.3:
            adjustments -= 0.12
            water_cat = crop_profile.water_need_category
            reasons.append(f"❌ {water_cat} water needs but insufficient rainfall")
            
        # ═══ COMPUTE FINAL SCORE ═══
        final_confidence = max(0.01, min(0.99, ml_score + adjustments))
        
        if not reasons:
            reasons.append("General agronomic suitability")
        reason_string = " + ".join([r.lstrip("✅❌⚠️ ") for r in reasons if "✅" in r])
        if not reason_string:
            reason_string = reasons[0] if reasons else "General match"
            
        advisories = crop_profile.get_advisories(context)
        
        result.update({
            "display_name": crop_profile.display_name,
            "hindi_name": crop_profile.hindi_name,
            "final_confidence": final_confidence,
            "rule_adjustment": f"{adjustments:+.2f}",
            "season": detected_season,
            "growing_duration": f"{crop_profile.growing_months} months",
            "sowing_months": crop_profile.sowing_months,
            "reason": reason_string,
            "detailed_reasons": reasons,
            "advisories": advisories,
            "farming_plan": crop_profile.get_farming_plan(),
            "full_fertilizer_plan": crop_profile.get_full_fertilizer_plan(),
            "full_irrigation_plan": crop_profile.get_full_irrigation_plan(),
            "tags": crop_profile.tags,
            "category": crop_profile.category,
            "water_needs": crop_profile.water_need_category
        })
        enhanced_candidates.append(result)

    enhanced_candidates.sort(key=lambda x: x["final_confidence"], reverse=True)
    return enhanced_candidates
