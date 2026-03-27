"""Diagnostics and helpers for aligning climate inputs to training scale."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from statistics import mean, pstdev

import pandas as pd

try:
    from .config import (
        CLIMATE_ALIGNMENT_PATH,
        DATASET_PATH,
        HUMIDITY_DATA_PATH,
        RAINFALL_DATA_PATH,
        TEMPERATURE_DATA_PATH,
    )
except ImportError:  # pragma: no cover
    from config import (  # type: ignore
        CLIMATE_ALIGNMENT_PATH,
        DATASET_PATH,
        HUMIDITY_DATA_PATH,
        RAINFALL_DATA_PATH,
        TEMPERATURE_DATA_PATH,
    )


CLIMATE_METRICS = ("temperature", "humidity", "rainfall")
CLIMATE_PATHS = {
    "temperature": TEMPERATURE_DATA_PATH,
    "humidity": HUMIDITY_DATA_PATH,
    "rainfall": RAINFALL_DATA_PATH,
}


def _load_json(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _metric_stats(values: list[float]) -> dict[str, float]:
    return {
        "min": float(min(values)),
        "max": float(max(values)),
        "mean": float(mean(values)),
        "std": float(pstdev(values) or 1.0),
    }


@lru_cache(maxsize=1)
def load_alignment_stats() -> dict[str, dict[str, dict[str, float]]]:
    df = pd.read_csv(DATASET_PATH)
    stats: dict[str, dict[str, dict[str, float]]] = {"training": {}, "climate": {}}

    for metric in CLIMATE_METRICS:
        training_values = [float(value) for value in df[metric].tolist()]
        climate_json = _load_json(CLIMATE_PATHS[metric])
        climate_values = [float(value) for state_map in climate_json.values() for value in state_map.values()]
        stats["training"][metric] = _metric_stats(training_values)
        stats["climate"][metric] = _metric_stats(climate_values)

    Path(CLIMATE_ALIGNMENT_PATH).write_text(json.dumps(stats, indent=2), encoding="utf-8")
    return stats


def align_metric_to_training(metric_name: str, value: float) -> float:
    stats = load_alignment_stats()
    training = stats["training"][metric_name]
    raw_value = float(value)
    if training["min"] <= raw_value <= training["max"]:
        return raw_value
    return max(training["min"], min(training["max"], raw_value))


def align_climate_record(climate: dict[str, float], source: str) -> dict[str, float]:
    """Return climate values mapped to training scale for model-facing features."""
    if source != "historical_average":
        return {
            "temperature": float(climate["temperature"]),
            "humidity": float(climate["humidity"]),
            "rainfall": float(climate["rainfall"]),
        }

    return {
        "temperature": round(align_metric_to_training("temperature", float(climate["temperature"])), 2),
        "humidity": round(align_metric_to_training("humidity", float(climate["humidity"])), 2),
        "rainfall": round(align_metric_to_training("rainfall", float(climate["rainfall"])), 2),
    }


def print_alignment_report() -> None:
    stats = load_alignment_stats()
    print("TRAINING DATA CLIMATE RANGES:")
    for metric in CLIMATE_METRICS:
        training = stats["training"][metric]
        print(
            f"  {metric:11s}: [{training['min']:.1f}, {training['max']:.1f}] "
            f"mean={training['mean']:.1f} std={training['std']:.1f}"
        )

    print("\nCLIMATE JSON RANGES:")
    for metric in CLIMATE_METRICS:
        climate = stats["climate"][metric]
        print(
            f"  {metric:11s}: [{climate['min']:.1f}, {climate['max']:.1f}] "
            f"mean={climate['mean']:.1f} std={climate['std']:.1f}"
        )

    print("\nALIGNMENT CHECK:")
    for metric in CLIMATE_METRICS:
        training = stats["training"][metric]
        climate = stats["climate"][metric]
        mean_delta = training["mean"] - climate["mean"]
        status = "OK" if abs(mean_delta) < max(training["std"], 10.0) else "MISMATCH"
        print(
            f"  {metric:11s}: {status:8s} "
            f"mean_delta={mean_delta:.1f} "
            f"scale_factor={(training['mean'] / climate['mean']) if climate['mean'] else 1.0:.2f}"
        )
