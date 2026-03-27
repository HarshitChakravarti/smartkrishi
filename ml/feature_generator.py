"""Layer 1 feature generation for current and planning recommendation modes."""

from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

try:
    from .config import (
        CROP_DURATION_PATH,
        DEFAULT_CLIMATE,
        DEFAULT_CROP_DURATION,
        HUMIDITY_DATA_PATH,
        MONTH_NAME_TO_NUMBER,
        MONTH_NUMBER_TO_NAME,
        RAINFALL_DATA_PATH,
        TEMPERATURE_DATA_PATH,
    )
except ImportError:  # pragma: no cover
    from config import (  # type: ignore
        CROP_DURATION_PATH,
        DEFAULT_CLIMATE,
        DEFAULT_CROP_DURATION,
        HUMIDITY_DATA_PATH,
        MONTH_NAME_TO_NUMBER,
        MONTH_NUMBER_TO_NAME,
        RAINFALL_DATA_PATH,
        TEMPERATURE_DATA_PATH,
    )

logger = logging.getLogger(__name__)


def _normalize_state(state: str) -> str:
    return " ".join(str(state).strip().split()).title()


def _normalize_month(month: str) -> str:
    return str(month).strip().title()


def _payload_ph(payload: dict[str, Any]) -> float:
    if payload.get("pH") is not None:
        return float(payload["pH"])
    if payload.get("ph") is not None:
        return float(payload["ph"])
    raise KeyError("Missing pH/ph in payload")


def _load_json(path: str) -> dict[str, Any]:
    file_path = Path(path)
    if not file_path.exists():
        logger.warning("Missing data file: %s", path)
        return {}
    with file_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _normalize_state_month_table(raw: dict[str, Any]) -> dict[str, dict[str, float]]:
    normalized: dict[str, dict[str, float]] = {}
    for raw_state, month_map in raw.items():
        state = _normalize_state(raw_state)
        normalized[state] = {}
        if not isinstance(month_map, dict):
            continue
        for raw_month, value in month_map.items():
            month = _normalize_month(raw_month)
            try:
                normalized[state][month] = float(value)
            except (TypeError, ValueError):
                continue
    return normalized


@lru_cache(maxsize=1)
def load_climate_data() -> tuple[dict[str, dict[str, float]], dict[str, dict[str, float]], dict[str, dict[str, float]]]:
    """Load rainfall, temperature and humidity tables keyed by state and month."""
    rainfall = _normalize_state_month_table(_load_json(RAINFALL_DATA_PATH))
    temperature = _normalize_state_month_table(_load_json(TEMPERATURE_DATA_PATH))
    humidity = _normalize_state_month_table(_load_json(HUMIDITY_DATA_PATH))
    return rainfall, temperature, humidity


@lru_cache(maxsize=1)
def load_crop_durations() -> dict[str, int]:
    """Load crop duration table in months."""
    raw = _load_json(CROP_DURATION_PATH)
    durations: dict[str, int] = {}
    for crop, months in raw.items():
        try:
            durations[str(crop).strip().lower()] = int(months)
        except (TypeError, ValueError):
            continue
    return durations


def get_crop_duration(crop_name: str) -> int:
    durations = load_crop_durations()
    return durations.get(str(crop_name).strip().lower(), DEFAULT_CROP_DURATION)


def get_month_number(month_name: str) -> int:
    """Convert full month name or abbreviation to month number (1-12)."""
    if not month_name:
        raise ValueError("Month name cannot be empty")

    normalized = str(month_name).strip().title()
    if normalized in MONTH_NAME_TO_NUMBER:
        return MONTH_NAME_TO_NUMBER[normalized]

    abbreviation_map = {
        "Jan": 1,
        "Feb": 2,
        "Mar": 3,
        "Apr": 4,
        "May": 5,
        "Jun": 6,
        "Jul": 7,
        "Aug": 8,
        "Sep": 9,
        "Sept": 9,
        "Oct": 10,
        "Nov": 11,
        "Dec": 12,
    }
    if normalized in abbreviation_map:
        return abbreviation_map[normalized]

    lowered = normalized.lower()
    for name, month_number in MONTH_NAME_TO_NUMBER.items():
        if name.lower().startswith(lowered):
            return month_number

    raise ValueError(f"Invalid month name: {month_name}")


def get_month_name(month_number: int) -> str:
    """Convert month number to canonical month name with wrap-around support."""
    wrapped = ((int(month_number) - 1) % 12) + 1
    return MONTH_NUMBER_TO_NAME[wrapped]


def compute_growing_window(planting_month: str, duration_months: int) -> list[str]:
    """Build rolling month window across year boundaries."""
    if duration_months <= 0:
        raise ValueError("Duration must be positive")
    start = get_month_number(planting_month)
    return [get_month_name(start + offset) for offset in range(duration_months)]


def _nearest_available_month(month_values: dict[str, float], target_month: str) -> float | None:
    if target_month in month_values:
        return month_values[target_month]

    try:
        target_number = get_month_number(target_month)
    except ValueError:
        return None

    best_distance = 99
    best_value: float | None = None
    for candidate_month, value in month_values.items():
        try:
            candidate_number = get_month_number(candidate_month)
        except ValueError:
            continue
        forward = (candidate_number - target_number) % 12
        backward = (target_number - candidate_number) % 12
        distance = min(forward, backward)
        if distance < best_distance:
            best_distance = distance
            best_value = value
    return best_value


def _lookup_with_fallback(dataset: dict[str, dict[str, float]], state: str, month: str, metric_name: str) -> float:
    normalized_state = _normalize_state(state)
    month_name = _normalize_month(month)

    state_values = dataset.get(normalized_state)
    if state_values:
        exact = state_values.get(month_name)
        if exact is not None:
            return exact
        nearest = _nearest_available_month(state_values, month_name)
        if nearest is not None:
            return nearest

    india_values = dataset.get("India")
    if india_values:
        india_exact = india_values.get(month_name)
        if india_exact is not None:
            return india_exact
        india_nearest = _nearest_available_month(india_values, month_name)
        if india_nearest is not None:
            return india_nearest

    logger.warning("Climate fallback default used for %s %s %s", normalized_state, month_name, metric_name)
    return DEFAULT_CLIMATE[metric_name]


def compute_climate_for_window(state: str, month_window: list[str]) -> dict[str, Any]:
    """Average climate across a month window for a state with fallback chaining."""
    rainfall_data, temperature_data, humidity_data = load_climate_data()

    rainfall_values = [_lookup_with_fallback(rainfall_data, state, month, "rainfall") for month in month_window]
    temperature_values = [_lookup_with_fallback(temperature_data, state, month, "temperature") for month in month_window]
    humidity_values = [_lookup_with_fallback(humidity_data, state, month, "humidity") for month in month_window]

    return {
        "temperature": round(sum(temperature_values) / len(temperature_values), 2),
        "humidity": round(sum(humidity_values) / len(humidity_values), 2),
        "rainfall": round(sum(rainfall_values) / len(rainfall_values), 2),
        "source": "historical_average",
        "months_covered": month_window,
    }


def generate_features_current_mode(payload: dict[str, Any]) -> tuple[dict[str, float], dict[str, Any]]:
    """Use incoming live weather directly for current conditions mode."""
    feature_vector = {
        "N": float(payload["N"]),
        "P": float(payload["P"]),
        "K": float(payload["K"]),
        "pH": _payload_ph(payload),
        "temperature": float(payload["temperature"]),
        "humidity": float(payload["humidity"]),
        "rainfall": float(payload["rainfall"]),
    }
    climate_meta = {
        "temperature": feature_vector["temperature"],
        "humidity": feature_vector["humidity"],
        "rainfall": feature_vector["rainfall"],
        "source": "live_weather",
        "months_covered": None,
    }
    return feature_vector, climate_meta


def generate_features_planning_mode(payload: dict[str, Any], crop_name: str) -> tuple[dict[str, float], dict[str, Any]]:
    """Derive crop-specific climate using state historical windows in planning mode."""
    duration = get_crop_duration(crop_name)
    month_window = compute_growing_window(str(payload["farmingMonth"]), duration)
    climate = compute_climate_for_window(str(payload["state"]), month_window)

    feature_vector = {
        "N": float(payload["N"]),
        "P": float(payload["P"]),
        "K": float(payload["K"]),
        "pH": _payload_ph(payload),
        "temperature": float(climate["temperature"]),
        "humidity": float(climate["humidity"]),
        "rainfall": float(climate["rainfall"]),
    }
    return feature_vector, climate


def generate_features(payload: dict[str, Any], crop_name: str | None = None) -> tuple[dict[str, float], dict[str, Any]]:
    """Route feature generation by mode."""
    mode = str(payload.get("activeTab", "")).lower()
    if mode == "current":
        return generate_features_current_mode(payload)
    if mode == "planning":
        if not crop_name:
            raise ValueError("crop_name is required for planning mode feature generation")
        return generate_features_planning_mode(payload, crop_name)
    raise ValueError(f"Unsupported activeTab mode: {payload.get('activeTab')}")
