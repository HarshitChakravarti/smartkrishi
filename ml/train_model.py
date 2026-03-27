"""Enhanced SmartKrishi model training focused on stronger confidence scores."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier

try:
    from .climate_alignment import load_alignment_stats
    from .config import (
        CLIMATE_ALIGNMENT_PATH,
        DATASET_PATH,
        ENCODER_PATH,
        FEATURE_ORDER_PATH,
        MODEL_METRICS_PATH,
        MODEL_PATH,
        SCALER_INFO_PATH,
        SCALER_PATH,
        TRAINING_PROFILES_PATH,
    )
    from .crop_knowledge import CropKnowledgeBase
    from .feature_engineering import BASE_FEATURES, DERIVED_FEATURES, EXTENDED_FEATURES, add_engineered_features, compute_feature_map
    from .feature_generator import generate_features_planning_mode
except ImportError:  # pragma: no cover
    from climate_alignment import load_alignment_stats  # type: ignore
    from config import (  # type: ignore
        CLIMATE_ALIGNMENT_PATH,
        DATASET_PATH,
        ENCODER_PATH,
        FEATURE_ORDER_PATH,
        MODEL_METRICS_PATH,
        MODEL_PATH,
        SCALER_INFO_PATH,
        SCALER_PATH,
        TRAINING_PROFILES_PATH,
    )
    from crop_knowledge import CropKnowledgeBase  # type: ignore
    from feature_engineering import BASE_FEATURES, DERIVED_FEATURES, EXTENDED_FEATURES, add_engineered_features, compute_feature_map  # type: ignore
    from feature_generator import generate_features_planning_mode  # type: ignore


LABEL_COLUMN = "label"
TARGET_COUNT = 200
SCENARIO_CROPS = ["muskmelon", "watermelon", "rice", "chickpea", "wheat", "mustard"]


def _print_header(title: str) -> None:
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def _save_json(path: str, payload: dict) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _load_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATASET_PATH)
    expected = set(BASE_FEATURES + [LABEL_COLUMN])
    missing = expected - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing required columns: {sorted(missing)}")
    df[LABEL_COLUMN] = df[LABEL_COLUMN].astype(str).str.strip().str.lower()
    return df


def _print_class_distribution(df: pd.DataFrame) -> None:
    _print_header("STEP 1: Data Analysis")
    counts = df[LABEL_COLUMN].value_counts().sort_index()
    print(f"Original dataset: {len(df)} samples, {len(counts)} crops")
    print("\nClass distribution:")
    for crop_name, count in counts.items():
        print(f"  {crop_name:15s}: {count:4d}")
    print(f"\nMin samples: {counts.min()}, Max samples: {counts.max()}")
    print(f"Imbalance ratio: {counts.max() / max(counts.min(), 1):.1f}x")


def _sample_range(
    rng: np.random.Generator,
    range_dict: dict,
    relative_noise: float = 0.08,
    wide_sample_probability: float = 0.35,
) -> float:
    optimal_min = float(range_dict.get("optimal_min", range_dict.get("optimal", range_dict["min"])))
    optimal_max = float(range_dict.get("optimal_max", range_dict.get("optimal", range_dict["max"])))
    absolute_min = float(range_dict["min"])
    absolute_max = float(range_dict["max"])
    center = (optimal_min + optimal_max) / 2.0
    spread = max((optimal_max - optimal_min) / 2.0, (absolute_max - absolute_min) * relative_noise, 0.05)
    if rng.random() < wide_sample_probability:
        sampled = float(rng.uniform(absolute_min, absolute_max))
    else:
        sampled = float(rng.normal(center, spread))
    return round(max(absolute_min, min(absolute_max, sampled)), 2)


def _build_training_profiles(df: pd.DataFrame) -> dict[str, dict[str, dict[str, float]]]:
    profiles: dict[str, dict[str, dict[str, float]]] = {}
    for crop_name, group in df.groupby(LABEL_COLUMN):
        profiles[str(crop_name)] = {
            feature_name: {
                "min": round(float(group[feature_name].min()), 4),
                "max": round(float(group[feature_name].max()), 4),
                "mean": round(float(group[feature_name].mean()), 4),
                "std": round(float(group[feature_name].std()), 4),
            }
            for feature_name in BASE_FEATURES
        }
    return profiles


def _generate_jittered_rows(crop_name: str, crop_frame: pd.DataFrame, count: int, rng: np.random.Generator) -> list[dict]:
    rows: list[dict] = []
    for _ in range(count):
        base_row = crop_frame.sample(1, random_state=int(rng.integers(0, 1_000_000))).iloc[0]
        synthetic = {}
        for feature_name in BASE_FEATURES:
            series = crop_frame[feature_name]
            noise = rng.normal(0.0, max(float(series.std()), 1.0) * 0.08)
            min_value = float(series.min()) * 0.9
            max_value = float(series.max()) * 1.1
            synthetic[feature_name] = round(max(min_value, min(max_value, float(base_row[feature_name]) + noise)), 2)
        synthetic[LABEL_COLUMN] = crop_name
        rows.append(synthetic)
    return rows


def _generate_kb_rows(crop_name: str, count: int, kb: CropKnowledgeBase, rng: np.random.Generator) -> list[dict]:
    crop_profile = kb.get_crop(crop_name)
    if not crop_profile:
        return []

    climate_requirements = crop_profile.data["climate_requirements"]
    soil_requirements = crop_profile.data["soil_requirements"]
    regional = crop_profile.data.get("regional_suitability", {})
    states = regional.get("best_states", []) + regional.get("moderate_states", [])
    if not states:
        states = ["India"]
    sowing_months = crop_profile.sowing_months or ["June"]

    rows: list[dict] = []
    for _ in range(count):
        state = str(rng.choice(states))
        month = str(rng.choice(sowing_months))
        payload = {
            "state": state,
            "farmingMonth": month,
            "N": _sample_range(rng, soil_requirements["N"]),
            "P": _sample_range(rng, soil_requirements["P"]),
            "K": _sample_range(rng, soil_requirements["K"]),
            "pH": _sample_range(rng, soil_requirements["pH"], relative_noise=0.05),
        }
        features, climate_meta = generate_features_planning_mode(payload, crop_name)
        feature_map = {
            "N": float(features["N"]),
            "P": float(features["P"]),
            "K": float(features["K"]),
            "ph": float(features["pH"]),
            "temperature": _sample_range(rng, climate_requirements["temperature"], relative_noise=0.05),
            "humidity": _sample_range(rng, climate_requirements["humidity"], relative_noise=0.08),
            "rainfall": _sample_range(rng, climate_requirements["rainfall"], relative_noise=0.10),
        }

        aligned = climate_meta.get("aligned_for_model", {})
        feature_map["temperature"] = round((feature_map["temperature"] + float(aligned.get("temperature", feature_map["temperature"]))) / 2.0, 2)
        feature_map["humidity"] = round((feature_map["humidity"] + float(aligned.get("humidity", feature_map["humidity"]))) / 2.0, 2)
        feature_map["rainfall"] = round((feature_map["rainfall"] + float(aligned.get("rainfall", feature_map["rainfall"]))) / 2.0, 2)
        feature_map[LABEL_COLUMN] = crop_name
        rows.append(feature_map)
    return rows


def _augment_dataset(df: pd.DataFrame) -> pd.DataFrame:
    _print_header("STEP 2: Data Augmentation")
    rng = np.random.default_rng(42)
    kb = CropKnowledgeBase()

    augmented_rows: list[dict] = []
    existing_crops = set(df[LABEL_COLUMN].unique())

    for crop_name in sorted(existing_crops):
        crop_frame = df[df[LABEL_COLUMN] == crop_name]
        needed = max(0, TARGET_COUNT - len(crop_frame))
        if needed == 0:
            print(f"  {crop_name:15s}: {len(crop_frame)} (sufficient)")
            continue

        kb_rows = _generate_kb_rows(crop_name, needed, kb, rng)
        if len(kb_rows) < needed:
            kb_rows.extend(_generate_jittered_rows(crop_name, crop_frame, needed - len(kb_rows), rng))
        augmented_rows.extend(kb_rows[:needed])
        print(f"  {crop_name:15s}: {len(crop_frame)} -> {len(crop_frame) + needed} (+{needed} synthetic)")

    for crop_name in ["wheat", "mustard"]:
        if crop_name in existing_crops:
            continue
        kb_rows = _generate_kb_rows(crop_name, TARGET_COUNT, kb, rng)
        if not kb_rows:
            continue
        augmented_rows.extend(kb_rows)
        print(f"  {crop_name:15s}: 0 -> {len(kb_rows)} (+{len(kb_rows)} synthetic)")

    if not augmented_rows:
        return df

    augmented_df = pd.DataFrame(augmented_rows)
    combined = pd.concat([df, augmented_df], ignore_index=True)
    combined = combined.sample(frac=1.0, random_state=42).reset_index(drop=True)
    print(f"\nAugmented dataset: {len(combined)} samples, {combined[LABEL_COLUMN].nunique()} crops")
    return combined


def _train_models(X_train_scaled, X_test_scaled, y_train, y_test, class_count: int) -> tuple[str, object, dict]:
    _print_header("STEP 3: Model Training & Comparison")
    models: dict[str, tuple[object, float]] = {}

    rf_params = {
        "n_estimators": 500,
        "max_depth": 30,
        "min_samples_split": 3,
        "min_samples_leaf": 1,
        "class_weight": "balanced",
        "random_state": 42,
        "n_jobs": -1,
        "oob_score": True,
    }
    rf_model = RandomForestClassifier(**rf_params)
    rf_model.fit(X_train_scaled, y_train)
    rf_accuracy = accuracy_score(y_test, rf_model.predict(X_test_scaled))
    models["RandomForest"] = (rf_model, rf_accuracy)
    print(f"  RandomForest accuracy:  {rf_accuracy * 100:.1f}%")

    calibrated_rf = CalibratedClassifierCV(
        estimator=RandomForestClassifier(**{**rf_params, "oob_score": False}),
        method="sigmoid",
        cv=5,
    )
    calibrated_rf.fit(X_train_scaled, y_train)
    calibrated_accuracy = accuracy_score(y_test, calibrated_rf.predict(X_test_scaled))
    models["CalibratedRF"] = (calibrated_rf, calibrated_accuracy)
    print(f"  Calibrated RF accuracy: {calibrated_accuracy * 100:.1f}%")

    xgb_model = XGBClassifier(
        objective="multi:softprob",
        num_class=class_count,
        n_estimators=300,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        eval_metric="mlogloss",
    )
    xgb_model.fit(X_train_scaled, y_train)
    xgb_accuracy = accuracy_score(y_test, xgb_model.predict(X_test_scaled))
    models["XGBoost"] = (xgb_model, xgb_accuracy)
    print(f"  XGBoost accuracy:       {xgb_accuracy * 100:.1f}%")

    _print_header("STEP 4: Confidence Distribution Comparison")
    selection_scores: dict[str, dict[str, float]] = {}
    best_name = "RandomForest"
    best_confidence = -1.0

    for model_name, (model, accuracy) in models.items():
        probabilities = model.predict_proba(X_test_scaled)
        predictions = model.predict(X_test_scaled)
        max_probabilities = probabilities.max(axis=1)
        correct_mask = predictions == y_test
        avg_correct_confidence = float(max_probabilities[correct_mask].mean()) if correct_mask.any() else 0.0
        selection_scores[model_name] = {
            "accuracy": float(accuracy),
            "avg_correct_confidence": avg_correct_confidence,
            "mean_top_confidence": float(max_probabilities.mean()),
            "median_top_confidence": float(np.median(max_probabilities)),
            "samples_gt_080": int((max_probabilities > 0.80).sum()),
            "samples_gt_060": int((max_probabilities > 0.60).sum()),
            "samples_lt_030": int((max_probabilities < 0.30).sum()),
        }
        print(f"\n  {model_name}:")
        print(f"    Accuracy: {accuracy * 100:.1f}%")
        print(f"    Mean max confidence: {max_probabilities.mean() * 100:.1f}%")
        print(f"    Median max confidence: {np.median(max_probabilities) * 100:.1f}%")
        print(f"    Samples >80%: {(max_probabilities > 0.80).sum()}/{len(max_probabilities)}")
        print(f"    Samples >60%: {(max_probabilities > 0.60).sum()}/{len(max_probabilities)}")
        print(f"    Samples <30%: {(max_probabilities < 0.30).sum()}/{len(max_probabilities)}")
        print(f"    Avg confidence on correct predictions: {avg_correct_confidence * 100:.1f}%")

        if avg_correct_confidence > best_confidence:
            best_name = model_name
            best_confidence = avg_correct_confidence

    print(f"\n  Selected model: {best_name} ({best_confidence * 100:.1f}% avg confidence on correct predictions)")
    return best_name, models[best_name][0], selection_scores


def _scenario_validation(best_model, scaler: StandardScaler, encoder: LabelEncoder) -> list[dict]:
    _print_header("STEP 5: Real Scenario Validation")
    scenarios = [
        {
            "name": "UP March (Zaid) - Muskmelon expected",
            "features": {"N": 50, "P": 50, "K": 50, "temperature": 30, "humidity": 42, "ph": 7.0, "rainfall": 14},
            "expected": "muskmelon",
        },
        {
            "name": "Punjab June (Kharif) - Rice expected",
            "features": {"N": 80, "P": 40, "K": 40, "temperature": 32, "humidity": 70, "ph": 6.5, "rainfall": 180},
            "expected": "rice",
        },
        {
            "name": "MH November (Rabi) - Chickpea expected",
            "features": {"N": 40, "P": 60, "K": 20, "temperature": 24, "humidity": 55, "ph": 7.0, "rainfall": 30},
            "expected": "chickpea",
        },
        {
            "name": "WB July (Kharif) - Rice expected",
            "features": {"N": 70, "P": 35, "K": 35, "temperature": 30, "humidity": 82, "ph": 6.0, "rainfall": 250},
            "expected": "rice",
        },
        {
            "name": "Rajasthan Dec (Rabi dry) - Wheat expected",
            "features": {"N": 60, "P": 50, "K": 45, "temperature": 18, "humidity": 35, "ph": 7.5, "rainfall": 8},
            "expected": "wheat",
        },
    ]

    outputs: list[dict] = []
    for scenario in scenarios:
        feature_frame = pd.DataFrame([compute_feature_map(scenario["features"])], columns=EXTENDED_FEATURES)
        scaled = scaler.transform(feature_frame)
        probabilities = best_model.predict_proba(scaled)[0]
        top_indices = probabilities.argsort()[-5:][::-1]
        expected_index = list(encoder.classes_).index(scenario["expected"])
        expected_confidence = float(probabilities[expected_index])

        print(f"\n  {scenario['name']}:")
        print(f"    Expected {scenario['expected']}: {expected_confidence * 100:.1f}%")
        for index in top_indices:
            crop_name = str(encoder.classes_[index])
            confidence = float(probabilities[index])
            marker = "OK" if crop_name == scenario["expected"] else "  "
            print(f"    {marker} {crop_name:15s}: {confidence * 100:.1f}%")

        outputs.append(
            {
                "name": scenario["name"],
                "expected": scenario["expected"],
                "expected_confidence": expected_confidence,
                "top_prediction": str(encoder.classes_[top_indices[0]]),
                "top_confidence": float(probabilities[top_indices[0]]),
            }
        )
    return outputs


def train_enhanced() -> dict:
    df = _load_dataset()
    _print_class_distribution(df)
    augmented_df = _augment_dataset(df)

    training_profiles = _build_training_profiles(augmented_df)

    _print_header("STEP 3: Feature Engineering")
    engineered_df = add_engineered_features(augmented_df[BASE_FEATURES])
    engineered_df[LABEL_COLUMN] = augmented_df[LABEL_COLUMN].values
    print(f"Base features:     {BASE_FEATURES}")
    print(f"Derived features:  {DERIVED_FEATURES}")
    print(f"Extended features: {len(EXTENDED_FEATURES)}")

    X = engineered_df[EXTENDED_FEATURES].copy()
    y = engineered_df[LABEL_COLUMN].copy()

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.2,
        random_state=42,
        stratify=y_encoded,
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    print(f"\nTrain: {len(X_train)}, Test: {len(X_test)}")

    best_name, best_model, selection_scores = _train_models(X_train_scaled, X_test_scaled, y_train, y_test, len(encoder.classes_))

    test_predictions = best_model.predict(X_test_scaled)
    test_accuracy = accuracy_score(y_test, test_predictions)
    print("\nClassification report:")
    print(classification_report(y_test, test_predictions, target_names=encoder.classes_, zero_division=0))

    scenario_outputs = _scenario_validation(best_model, scaler, encoder)

    joblib.dump(best_model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoder, ENCODER_PATH)

    alignment_stats = load_alignment_stats()
    _save_json(CLIMATE_ALIGNMENT_PATH, alignment_stats)
    _save_json(
        FEATURE_ORDER_PATH,
        {
            "feature_order": EXTENDED_FEATURES,
            "base_features": BASE_FEATURES,
            "derived_features": DERIVED_FEATURES,
            "model_type": best_name,
            "accuracy": round(float(test_accuracy), 6),
            "crop_classes": list(encoder.classes_),
        },
    )
    _save_json(
        SCALER_INFO_PATH,
        {
            "feature_order": EXTENDED_FEATURES,
            "means": {name: round(float(value), 6) for name, value in zip(EXTENDED_FEATURES, scaler.mean_)},
            "scales": {name: round(float(value), 6) for name, value in zip(EXTENDED_FEATURES, scaler.scale_)},
        },
    )
    _save_json(TRAINING_PROFILES_PATH, training_profiles)
    _save_json(
        MODEL_METRICS_PATH,
        {
            "model_type": best_name,
            "sample_count": int(len(engineered_df)),
            "class_count": int(engineered_df[LABEL_COLUMN].nunique()),
            "feature_order": EXTENDED_FEATURES,
            "base_features": BASE_FEATURES,
            "derived_features": DERIVED_FEATURES,
            "accuracy": round(float(test_accuracy), 6),
            "model_selection": selection_scores,
            "scenario_validation": scenario_outputs,
        },
    )

    _print_header("STEP 6: Saved Artifacts")
    print(f"Model:            {MODEL_PATH}")
    print(f"Scaler:           {SCALER_PATH}")
    print(f"Label encoder:    {ENCODER_PATH}")
    print(f"Feature order:    {FEATURE_ORDER_PATH}")
    print(f"Scaler info:      {SCALER_INFO_PATH}")
    print(f"Training profiles:{TRAINING_PROFILES_PATH}")
    print(f"Metrics:          {MODEL_METRICS_PATH}")
    print(f"Climate stats:    {CLIMATE_ALIGNMENT_PATH}")
    print(f"\nSelected model: {best_name}")
    print(f"Accuracy: {test_accuracy * 100:.1f}%")

    return {
        "model_type": best_name,
        "accuracy": float(test_accuracy),
        "classes": list(encoder.classes_),
        "feature_order": EXTENDED_FEATURES,
    }


def main() -> None:
    summary = train_enhanced()
    _print_header("TRAINING COMPLETE")
    print(f"Model:    {summary['model_type']}")
    print(f"Accuracy: {summary['accuracy'] * 100:.1f}%")
    print(f"Crops:    {len(summary['classes'])}")
    print(f"Features: {summary['feature_order']}")


if __name__ == "__main__":
    main()
