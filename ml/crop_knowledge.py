"""Crop Knowledge Base Accessor.

Loads crop_knowledge_base.json and provides typed access to crop
properties for use in rules.py and advisory generation.

Usage:
    kb = CropKnowledgeBase()
    rice = kb.get_crop("rice")
    rice.get_climate_fit_score(temp=28, humidity=75, rainfall=180)
    rice.get_rotation_score(previous_crop="wheat")
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

try:
    from .config import CROP_KB_PATH
except ImportError:  # pragma: no cover
    from config import CROP_KB_PATH  # type: ignore

logger = logging.getLogger(__name__)


class CropProfile:
    """Individual crop profile with scoring methods."""

    def __init__(self, name: str, data: dict):
        self.name = name
        self.data = data

    # ── Properties ──

    @property
    def display_name(self) -> str:
        return self.data.get("display_name", self.name.title())

    @property
    def hindi_name(self) -> str:
        return self.data.get("hindi_name", "")

    @property
    def category(self) -> str:
        return self.data.get("category", "unknown")

    @property
    def primary_season(self) -> str:
        return self.data["seasons"]["primary"]

    @property
    def growing_months(self) -> int:
        return self.data["seasons"]["growing_duration_months"]

    @property
    def sowing_months(self) -> list:
        return self.data["seasons"]["sowing_months"]

    @property
    def is_perennial(self) -> bool:
        return self.data["seasons"]["primary"] == "Perennial"

    @property
    def is_nitrogen_fixing(self) -> bool:
        return self.data["rotation"]["nitrogen_fixing"]

    @property
    def water_need_category(self) -> str:
        return self.data["water_needs"]["category"]

    @property
    def tags(self) -> list:
        return self.data.get("tags", [])

    # ── Scoring Methods ──

    def is_suitable_for_season(self, season: str) -> bool:
        if self.is_perennial:
            return True
        primary = self.data["seasons"]["primary"]
        secondary = self.data["seasons"].get("secondary")
        return season == primary or season == secondary

    def is_valid_sowing_month(self, month: str) -> bool:
        if self.is_perennial:
            return True
        return month in self.data["seasons"]["sowing_months"]

    def get_season_fit_score(self, planting_month: str, detected_season: str) -> float:
        """Score from -1.0 to +1.0 for season/month fitness."""
        if self.is_perennial:
            return 0.1
        if self.is_valid_sowing_month(planting_month):
            return 1.0
        if self.is_suitable_for_season(detected_season):
            return 0.5
        secondary = self.data["seasons"].get("secondary")
        if secondary and secondary == detected_season:
            return 0.3
        return -1.0

    def get_climate_fit_score(self, temperature: float, humidity: float, rainfall: float) -> float:
        """0.0–1.0 climate match using crop-specific optimal ranges."""
        t = self._range_score(temperature, self.data["climate_requirements"]["temperature"])
        h = self._range_score(humidity, self.data["climate_requirements"]["humidity"])
        r = self._range_score(rainfall, self.data["climate_requirements"]["rainfall"])
        return t * 0.25 + h * 0.25 + r * 0.50

    def get_soil_fit_score(self, N: float, P: float, K: float, pH: float) -> float:
        """0.0–1.0 soil fitness using crop-specific nutrient ranges."""
        n = self._range_score(N, self.data["soil_requirements"]["N"])
        p = self._range_score(P, self.data["soil_requirements"]["P"])
        k = self._range_score(K, self.data["soil_requirements"]["K"])
        ph = self._range_score(pH, self.data["soil_requirements"]["pH"])
        return n * 0.30 + p * 0.25 + k * 0.25 + ph * 0.20

    def get_rotation_score(self, previous_crop: str) -> float:
        """Rotation fitness: +0.15 good, 0 neutral, -0.15 bad family, -0.30 same crop."""
        if not previous_crop or previous_crop.lower() in {"none", "null", ""}:
            return 0.0
        prev = previous_crop.lower()
        rotation = self.data["rotation"]
        if prev == self.name:
            return -0.30
        if prev in [c.lower() for c in rotation.get("bad_predecessors", [])]:
            return -0.15
        if prev in [c.lower() for c in rotation.get("good_predecessors", [])]:
            return 0.15
        return 0.0

    def get_rotation_reason(self, previous_crop: str) -> str:
        if not previous_crop or previous_crop.lower() in {"none", "null", ""}:
            return ""
        score = self.get_rotation_score(previous_crop)
        rotation = self.data["rotation"]
        if score <= -0.30:
            return f"❌ Avoid growing {self.display_name} after {previous_crop} (monocropping depletes soil)"
        elif score <= -0.15:
            return f"⚠️ {previous_crop} is not an ideal predecessor for {self.display_name}"
        elif score >= 0.15:
            reason = rotation.get("why_good_rotation", "Good rotation choice")
            return f"✅ Excellent rotation: {self.display_name} after {previous_crop}. {reason}"
        return f"Neutral rotation with {previous_crop}"

    def is_suitable_for_state(self, state: str) -> bool:
        regional = self.data["regional_suitability"]
        return state in regional["best_states"] or state in regional.get("moderate_states", [])

    def get_regional_score(self, state: str) -> float:
        regional = self.data["regional_suitability"]
        if state in regional["best_states"]:
            return 0.10
        if state in regional.get("moderate_states", []):
            return 0.05
        if state in regional.get("unsuitable_states", []):
            return -0.10
        return 0.0

    def get_farm_size_fit(self, acres: float) -> float:
        econ = self.data["economics"]
        min_viable = econ["minimum_viable_farm_size_acres"]
        ideal_min, ideal_max = econ["ideal_farm_size_acres"]
        if acres < min_viable:
            return 0.2
        if ideal_min <= acres <= ideal_max:
            return 1.0
        if acres < ideal_min:
            return 0.6
        return 0.8

    def get_water_suitability(self, rainfall: float) -> float:
        cat = self.data["water_needs"]["category"]
        if cat == "very_high" and rainfall < 100:
            return 0.1
        if cat == "high" and rainfall < 80:
            return 0.2
        if cat == "low" and rainfall > 250:
            return 0.5
        if cat == "very_low" and rainfall > 200:
            return 0.3
        return self._range_score(rainfall, self.data["climate_requirements"]["rainfall"])

    def get_advisories(self, context: dict) -> dict:
        """Generate crop-specific advisory text from knowledge base."""
        irr = self.data.get("irrigation_advisory", {})
        fert = self.data.get("fertilizer_advisory", {})
        pest = self.data.get("pest_disease_risk", {})
        return {
            "irrigation": f"{irr.get('method', '')}. {irr.get('water_saving', '')}".strip(". "),
            "fertilizer": f"{fert.get('N_schedule', '')}. {fert.get('organic_alternatives', '')}".strip(". "),
            "pest_watch": (
                f"Watch for: {', '.join(pest.get('major_pests', [])[:3])}. "
                f"{pest.get('risk_conditions', '')}"
            ),
            "weather_note": irr.get("critical_periods", "Monitor weather conditions during critical growth stages"),
        }

    def get_farming_plan(self) -> dict:
        """Return sowing/harvesting plan details."""
        seasons = self.data["seasons"]
        return {
            "primary_season": seasons["primary"],
            "secondary_season": seasons.get("secondary"),
            "sowing_months": seasons["sowing_months"],
            "harvesting_months": seasons["harvesting_months"],
            "growing_duration_days": seasons["growing_duration_days"],
            "growing_duration_months": seasons["growing_duration_months"],
        }

    def get_full_fertilizer_plan(self) -> dict:
        return dict(self.data.get("fertilizer_advisory", {}))

    def get_full_irrigation_plan(self) -> dict:
        return dict(self.data.get("irrigation_advisory", {}))

    # ── Helper ──

    @staticmethod
    def _range_score(value: float, range_dict: dict) -> float:
        optimal_min = range_dict.get("optimal_min", range_dict.get("optimal", range_dict["min"]))
        optimal_max = range_dict.get("optimal_max", range_dict.get("optimal", range_dict["max"]))
        abs_min = range_dict["min"]
        abs_max = range_dict["max"]
        if optimal_min <= value <= optimal_max:
            return 1.0
        if abs_min <= value <= abs_max:
            if value < optimal_min:
                denom = optimal_min - abs_min
                return 0.5 + 0.5 * (value - abs_min) / denom if denom > 0 else 0.5
            denom = abs_max - optimal_max
            return 0.5 + 0.5 * (abs_max - value) / denom if denom > 0 else 0.5
        distance = min(abs(value - abs_min), abs(value - abs_max))
        range_size = abs_max - abs_min
        if range_size == 0:
            return 0.0
        return max(0.0, 0.3 - (distance / range_size) * 0.3)


class CropKnowledgeBase:
    """Singleton knowledge base loaded from JSON."""

    _instance: CropKnowledgeBase | None = None

    def __new__(cls) -> CropKnowledgeBase:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self._load()

    def _load(self) -> None:
        kb_path = Path(CROP_KB_PATH)
        if not kb_path.exists():
            logger.warning("Crop knowledge base not found at %s", kb_path)
            self._data: dict = {}
            self._crops: dict[str, CropProfile] = {}
        else:
            with kb_path.open("r", encoding="utf-8") as f:
                self._data = json.load(f)
            self._crops = {
                name: CropProfile(name, data)
                for name, data in self._data.items()
            }
            logger.info("Crop KB loaded: %d crops", len(self._crops))
        self._loaded = True

    def get_crop(self, crop_name: str) -> CropProfile | None:
        self._ensure_loaded()
        return self._crops.get(crop_name.lower().strip())

    def get_all_crops(self) -> list[str]:
        self._ensure_loaded()
        return list(self._crops.keys())

    def get_crops_for_season(self, season: str) -> list[str]:
        self._ensure_loaded()
        return [n for n, c in self._crops.items() if c.is_suitable_for_season(season)]

    def get_crops_for_state(self, state: str) -> list[str]:
        self._ensure_loaded()
        return [n for n, c in self._crops.items() if c.is_suitable_for_state(state)]

    def get_good_rotation_partners(self, previous_crop: str) -> list[str]:
        self._ensure_loaded()
        crop = self.get_crop(previous_crop)
        if not crop:
            return self.get_all_crops()
        return [c.lower() for c in crop.data["rotation"]["good_successors"]]
