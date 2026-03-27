"""End-to-end diagnostics for SmartKrishi crop recommendation pipeline."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

try:
    from .config import (
        DATASET_PATH,
        FEATURE_COLUMNS,
        FEATURE_ORDER_PATH,
        HUMIDITY_DATA_PATH,
        RAINFALL_DATA_PATH,
        SCALER_PATH,
        TEMPERATURE_DATA_PATH,
    )
    from .model import get_all_crop_names, predict_top_crops
    from .pipeline import get_recommendations
except ImportError:  # pragma: no cover
    from config import (  # type: ignore
        DATASET_PATH,
        FEATURE_COLUMNS,
        FEATURE_ORDER_PATH,
        HUMIDITY_DATA_PATH,
        RAINFALL_DATA_PATH,
        SCALER_PATH,
        TEMPERATURE_DATA_PATH,
    )
    from model import get_all_crop_names, predict_top_crops  # type: ignore
    from pipeline import get_recommendations  # type: ignore


def _header(title: str) -> None:
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def _load_json(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _dataset_diagnostic(df: pd.DataFrame) -> None:
    _header("DATASET DIAGNOSTIC")
    print(f"Samples: {len(df)}")
    print(f"Crop classes: {df['label'].nunique()}")
    print(f"Columns: {list(df.columns)}")
    print("\nClass distribution:")
    print(df["label"].value_counts().to_string())
    print("\nFeature statistics:")
    for column in ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]:
        series = df[column]
        print(
            f"  {column:12s} min={series.min():8.2f} max={series.max():8.2f} "
            f"mean={series.mean():8.2f} std={series.std():8.2f}"
        )


def _feature_contract_diagnostic() -> None:
    _header("FEATURE CONTRACT DIAGNOSTIC")
    print(f"Configured feature order: {FEATURE_COLUMNS}")
    if Path(FEATURE_ORDER_PATH).exists():
        feature_order = _load_json(FEATURE_ORDER_PATH).get("feature_order", [])
        print(f"Saved feature order:      {feature_order}")
    else:
        print("Saved feature order:      MISSING")

    scaler = joblib.load(SCALER_PATH)
    sample = pd.DataFrame([[80, 40, 40, 28, 72, 6.5, 145]], columns=FEATURE_COLUMNS)
    scaled = scaler.transform(sample)
    print("\nScaler means:", scaler.mean_)
    print("Scaler scales:", scaler.scale_)
    print("Sample raw:   ", sample.iloc[0].tolist())
    print("Sample scaled:", scaled[0].round(3).tolist())
    for name, value in zip(FEATURE_COLUMNS, scaled[0]):
        status = "OK" if -3 <= value <= 3 else "OUT_OF_RANGE"
        print(f"  {name:12s} {value:8.3f} {status}")


def _known_input_diagnostic(df: pd.DataFrame) -> None:
    _header("KNOWN INPUT DIAGNOSTIC")
    for crop_name in ["rice", "wheat", "maize", "chickpea", "cotton", "lentil"]:
        crop_frame = df[df["label"].str.lower() == crop_name]
        if crop_frame.empty:
            print(f"{crop_name:12s} not present in training dataset")
            continue
        avg = crop_frame[["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]].mean()
        features = {
            "N": float(avg["N"]),
            "P": float(avg["P"]),
            "K": float(avg["K"]),
            "temperature": float(avg["temperature"]),
            "humidity": float(avg["humidity"]),
            "pH": float(avg["ph"]),
            "rainfall": float(avg["rainfall"]),
        }
        predictions = predict_top_crops(features, top_n=3)
        print(f"\n{crop_name.upper()} avg input:")
        for row in predictions:
            print(f"  {row['crop']:12s} {row['ml_confidence']:.3f}")


def _climate_range_diagnostic(df: pd.DataFrame) -> None:
    _header("CLIMATE RANGE DIAGNOSTIC")
    rainfall_data = _load_json(RAINFALL_DATA_PATH)
    temperature_data = _load_json(TEMPERATURE_DATA_PATH)
    humidity_data = _load_json(HUMIDITY_DATA_PATH)

    rainfall_values = [float(value) for table in rainfall_data.values() for value in table.values()]
    temperature_values = [float(value) for table in temperature_data.values() for value in table.values()]
    humidity_values = [float(value) for table in humidity_data.values() for value in table.values()]

    print(
        "Rainfall: training "
        f"[{df['rainfall'].min():.2f}, {df['rainfall'].max():.2f}] vs climate "
        f"[{min(rainfall_values):.2f}, {max(rainfall_values):.2f}]"
    )
    print(
        "Temperature: training "
        f"[{df['temperature'].min():.2f}, {df['temperature'].max():.2f}] vs climate "
        f"[{min(temperature_values):.2f}, {max(temperature_values):.2f}]"
    )
    print(
        "Humidity: training "
        f"[{df['humidity'].min():.2f}, {df['humidity'].max():.2f}] vs climate "
        f"[{min(humidity_values):.2f}, {max(humidity_values):.2f}]"
    )


def _pipeline_case_diagnostic() -> int:
    _header("PIPELINE CASE DIAGNOSTIC")
    test_cases = [
        {
            "name": "Rabi Maharashtra November",
            "input": {
                "activeTab": "planning",
                "state": "Maharashtra",
                "district": "Pune",
                "landArea": "5",
                "farmingMonth": "November",
                "previousCrop": "rice",
                "previousCropMonth": "October",
                "temperature": 25,
                "humidity": 50,
                "rainfall": 20,
                "N": 80,
                "P": 40,
                "K": 40,
                "pH": 6.5,
            },
            "expected_any": {"wheat", "chickpea", "lentil", "mustard"},
            "forbidden": {"mothbeans", "rice", "cotton", "jute"},
            "season": "Rabi",
        },
        {
            "name": "Kharif Punjab June",
            "input": {
                "activeTab": "planning",
                "state": "Punjab",
                "district": "Ludhiana",
                "landArea": "8",
                "farmingMonth": "June",
                "previousCrop": "wheat",
                "previousCropMonth": "April",
                "temperature": 35,
                "humidity": 60,
                "rainfall": 50,
                "N": 60,
                "P": 50,
                "K": 45,
                "pH": 7.0,
            },
            "expected_any": {"rice", "maize", "cotton"},
            "forbidden": {"wheat", "chickpea", "lentil", "mustard"},
            "season": "Kharif",
        },
        {
            "name": "Kharif West Bengal July",
            "input": {
                "activeTab": "planning",
                "state": "West Bengal",
                "district": "Kolkata",
                "landArea": "3",
                "farmingMonth": "July",
                "previousCrop": "None",
                "previousCropMonth": "June",
                "temperature": 30,
                "humidity": 80,
                "rainfall": 200,
                "N": 70,
                "P": 35,
                "K": 35,
                "pH": 6.0,
            },
            "expected_any": {"rice", "jute", "maize"},
            "forbidden": {"wheat", "chickpea", "apple"},
            "season": "Kharif",
        },
        {
            "name": "Zaid Uttar Pradesh March",
            "input": {
                "activeTab": "planning",
                "state": "Uttar Pradesh",
                "district": "Lucknow",
                "landArea": "4",
                "farmingMonth": "March",
                "previousCrop": "wheat",
                "previousCropMonth": "February",
                "temperature": 28,
                "humidity": 45,
                "rainfall": 15,
                "N": 50,
                "P": 50,
                "K": 50,
                "pH": 7.0,
            },
            "expected_any": {"watermelon", "muskmelon", "mungbean"},
            "forbidden": {"wheat", "rice", "cotton"},
            "season": "Zaid",
        },
        {
            "name": "Rabi Rajasthan December",
            "input": {
                "activeTab": "planning",
                "state": "Rajasthan",
                "district": "Jaipur",
                "landArea": "10",
                "farmingMonth": "December",
                "previousCrop": "mungbean",
                "previousCropMonth": "September",
                "temperature": 18,
                "humidity": 35,
                "rainfall": 5,
                "N": 30,
                "P": 20,
                "K": 25,
                "pH": 8.0,
            },
            "expected_any": {"wheat", "chickpea", "mustard"},
            "forbidden": {"rice", "jute", "cotton"},
            "season": "Rabi",
        },
        {
            "name": "Current Kerala humid high rainfall",
            "input": {
                "activeTab": "current",
                "state": "Kerala",
                "district": "Kochi",
                "landArea": "1.5",
                "temperature": 29,
                "humidity": 88,
                "rainfall": 280,
                "N": 60,
                "P": 45,
                "K": 50,
                "pH": 5.8,
            },
            "expected_any": {"rice", "coconut", "banana", "coffee"},
            "forbidden": {"wheat", "mustard", "apple"},
            "season": None,
        },
    ]

    passed = 0
    for case in test_cases:
        result = get_recommendations(case["input"])
        crops = [row["crop"] for row in result["recommendations"]]
        top_confidence = result["recommendations"][0]["confidence"] if result["recommendations"] else 0.0
        has_expected = any(crop in case["expected_any"] for crop in crops)
        has_forbidden = any(crop in case["forbidden"] for crop in crops)
        season_ok = True
        if case["season"] is not None:
            season_ok = result["metadata"].get("season_detected") == case["season"]
        confidence_ok = top_confidence >= 0.40
        case_passed = has_expected and not has_forbidden and season_ok and confidence_ok
        status = "PASS" if case_passed else "FAIL"
        print(f"\n{status:4s} {case['name']}")
        print(f"  Season: {result['metadata'].get('season_detected')}")
        print(f"  Top confidence: {top_confidence:.2f}")
        for rec in result["recommendations"]:
            print(f"  - {rec['crop']:12s} conf={rec['confidence']:.2f} ml={rec['ml_score']:.2f}")
        if case_passed:
            passed += 1

    print(f"\nPipeline cases passed: {passed}/{len(test_cases)}")
    return passed


def run_full_diagnostic() -> None:
    df = pd.read_csv(DATASET_PATH)
    _dataset_diagnostic(df)
    _feature_contract_diagnostic()
    _known_input_diagnostic(df)
    _climate_range_diagnostic(df)
    _pipeline_case_diagnostic()


if __name__ == "__main__":
    run_full_diagnostic()
