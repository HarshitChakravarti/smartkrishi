"""Train SmartKrishi crop model and emit diagnostics/artifacts."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    from .config import (
        DATASET_PATH,
        ENCODER_PATH,
        FEATURE_COLUMNS,
        FEATURE_ORDER_PATH,
        MODEL_METRICS_PATH,
        MODEL_PATH,
        SCALER_INFO_PATH,
        SCALER_PATH,
        TRAINING_PROFILES_PATH,
    )
except ImportError:  # pragma: no cover
    from config import (  # type: ignore
        DATASET_PATH,
        ENCODER_PATH,
        FEATURE_COLUMNS,
        FEATURE_ORDER_PATH,
        MODEL_METRICS_PATH,
        MODEL_PATH,
        SCALER_INFO_PATH,
        SCALER_PATH,
        TRAINING_PROFILES_PATH,
    )


LABEL_COLUMN = "label"
KNOWN_INPUT_CROPS = ["rice", "wheat", "maize", "chickpea", "cotton", "lentil"]


def _print_header(title: str) -> None:
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def _ensure_parent(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)


def _load_dataset() -> pd.DataFrame:
    df = pd.read_csv(DATASET_PATH)
    expected = set(FEATURE_COLUMNS + [LABEL_COLUMN])
    missing = expected - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing required columns: {sorted(missing)}")
    df[LABEL_COLUMN] = df[LABEL_COLUMN].astype(str).str.strip().str.lower()
    return df


def _build_training_profiles(df: pd.DataFrame) -> dict[str, dict[str, dict[str, float]]]:
    profiles: dict[str, dict[str, dict[str, float]]] = {}
    for crop_name, group in df.groupby(LABEL_COLUMN):
        crop_profile: dict[str, dict[str, float]] = {}
        for column in FEATURE_COLUMNS:
            series = group[column]
            crop_profile[column] = {
                "min": round(float(series.min()), 4),
                "max": round(float(series.max()), 4),
                "mean": round(float(series.mean()), 4),
                "std": round(float(series.std()), 4),
            }
        profiles[str(crop_name)] = crop_profile
    return profiles


def _print_dataset_overview(df: pd.DataFrame) -> None:
    _print_header("STEP 1: Dataset Overview")
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"Crop classes: {df[LABEL_COLUMN].nunique()}")
    print("Null values:")
    print(df.isnull().sum().to_string())
    print("\nClass distribution:")
    print(df[LABEL_COLUMN].value_counts().sort_index().to_string())
    print("\nFeature statistics:")
    for column in FEATURE_COLUMNS:
        series = df[column]
        print(
            f"  {column:12s} min={series.min():8.2f} max={series.max():8.2f} "
            f"mean={series.mean():8.2f} std={series.std():8.2f}"
        )


def _print_crop_profiles(profiles: dict[str, dict[str, dict[str, float]]]) -> None:
    _print_header("STEP 2: Per-Crop Profiles")
    for crop_name in sorted(profiles):
        print(f"\n{crop_name.upper()}:")
        for column in FEATURE_COLUMNS:
            stats = profiles[crop_name][column]
            print(
                f"  {column:12s} {stats['min']:8.2f} - {stats['max']:8.2f} "
                f"(avg={stats['mean']:8.2f}, std={stats['std']:8.2f})"
            )


def _print_scaler_diagnostics(scaler: StandardScaler) -> None:
    _print_header("STEP 3: Scaler Diagnostics")
    for name, mean_value, scale_value in zip(FEATURE_COLUMNS, scaler.mean_, scaler.scale_):
        print(f"  {name:12s} mean={mean_value:8.3f} scale={scale_value:8.3f}")


def _print_metrics(
    model: RandomForestClassifier,
    encoder: LabelEncoder,
    X_train_scaled,
    X_test_scaled,
    y_train,
    y_test,
) -> dict:
    _print_header("STEP 4: Model Evaluation")

    train_predictions = model.predict(X_train_scaled)
    test_predictions = model.predict(X_test_scaled)

    train_accuracy = accuracy_score(y_train, train_predictions)
    test_accuracy = accuracy_score(y_test, test_predictions)
    print(f"Training accuracy: {train_accuracy:.4f} ({train_accuracy * 100:.1f}%)")
    print(f"Test accuracy:     {test_accuracy:.4f} ({test_accuracy * 100:.1f}%)")
    if hasattr(model, "oob_score_"):
        print(f"OOB score:         {model.oob_score_:.4f} ({model.oob_score_ * 100:.1f}%)")

    print("\nFeature importance:")
    ranked_importance = sorted(
        zip(FEATURE_COLUMNS, model.feature_importances_),
        key=lambda row: row[1],
        reverse=True,
    )
    for column, importance in ranked_importance:
        print(f"  {column:12s} {importance:.4f}")

    report = classification_report(
        y_test,
        test_predictions,
        target_names=encoder.classes_,
        output_dict=True,
        zero_division=0,
    )
    print("\nClassification report:")
    print(
        classification_report(
            y_test,
            test_predictions,
            target_names=encoder.classes_,
            zero_division=0,
        )
    )

    probabilities = model.predict_proba(X_test_scaled)
    max_probabilities = probabilities.max(axis=1)
    print("Confidence distribution:")
    print(f"  Mean top confidence: {max_probabilities.mean():.3f}")
    print(f"  Min top confidence:  {max_probabilities.min():.3f}")
    print(f"  Max top confidence:  {max_probabilities.max():.3f}")
    print(f"  >0.70 samples:       {int((max_probabilities > 0.70).sum())}/{len(max_probabilities)}")
    print(f"  >0.50 samples:       {int((max_probabilities > 0.50).sum())}/{len(max_probabilities)}")
    print(f"  <0.30 samples:       {int((max_probabilities < 0.30).sum())}/{len(max_probabilities)}")

    return {
        "train_accuracy": round(float(train_accuracy), 6),
        "test_accuracy": round(float(test_accuracy), 6),
        "oob_score": round(float(getattr(model, "oob_score_", 0.0)), 6),
        "feature_importance": {name: round(float(value), 6) for name, value in ranked_importance},
        "classification_report": report,
        "confidence_distribution": {
            "mean_top_confidence": round(float(max_probabilities.mean()), 6),
            "min_top_confidence": round(float(max_probabilities.min()), 6),
            "max_top_confidence": round(float(max_probabilities.max()), 6),
            "samples_gt_070": int((max_probabilities > 0.70).sum()),
            "samples_gt_050": int((max_probabilities > 0.50).sum()),
            "samples_lt_030": int((max_probabilities < 0.30).sum()),
        },
    }


def _print_known_input_validation(
    df: pd.DataFrame,
    model: RandomForestClassifier,
    scaler: StandardScaler,
    encoder: LabelEncoder,
) -> None:
    _print_header("STEP 5: Known-Input Validation")
    for crop_name in KNOWN_INPUT_CROPS:
        crop_frame = df[df[LABEL_COLUMN] == crop_name]
        if crop_frame.empty:
            print(f"  {crop_name.upper():12s} skipped (not present in training dataset)")
            continue

        feature_row = crop_frame[FEATURE_COLUMNS].mean().to_frame().T
        scaled = scaler.transform(feature_row)
        probabilities = model.predict_proba(scaled)[0]
        top_indices = probabilities.argsort()[-3:][::-1]

        print(f"\n  {crop_name.upper()}:")
        for index in top_indices:
            predicted_crop = str(encoder.classes_[index])
            confidence = float(probabilities[index])
            marker = "OK" if predicted_crop == crop_name else "MISS"
            print(f"    {marker:4s} {predicted_crop:12s} {confidence:.3f} ({confidence * 100:.1f}%)")


def _save_json(path: str, payload: dict) -> None:
    _ensure_parent(path)
    Path(path).write_text(json.dumps(payload, indent=2), encoding="utf-8")


def train() -> dict:
    df = _load_dataset()
    _print_dataset_overview(df)

    training_profiles = _build_training_profiles(df)
    _print_crop_profiles(training_profiles)

    X = df[FEATURE_COLUMNS].copy()
    y = df[LABEL_COLUMN].copy()

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
    _print_scaler_diagnostics(scaler)

    _print_header("STEP 4: Training RandomForest")
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=25,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
        oob_score=True,
    )
    model.fit(X_train_scaled, y_train)

    metrics = _print_metrics(model, encoder, X_train_scaled, X_test_scaled, y_train, y_test)
    _print_known_input_validation(df, model, scaler, encoder)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoder, ENCODER_PATH)

    _save_json(FEATURE_ORDER_PATH, {"feature_order": FEATURE_COLUMNS})
    _save_json(
        SCALER_INFO_PATH,
        {
            "feature_order": FEATURE_COLUMNS,
            "means": {name: round(float(value), 6) for name, value in zip(FEATURE_COLUMNS, scaler.mean_)},
            "scales": {name: round(float(value), 6) for name, value in zip(FEATURE_COLUMNS, scaler.scale_)},
        },
    )
    _save_json(TRAINING_PROFILES_PATH, training_profiles)
    _save_json(
        MODEL_METRICS_PATH,
        {
            "feature_order": FEATURE_COLUMNS,
            "crop_classes": list(encoder.classes_),
            "sample_count": int(len(df)),
            "class_count": int(df[LABEL_COLUMN].nunique()),
            **metrics,
        },
    )

    _print_header("STEP 6: Artifacts Saved")
    print(f"Model:           {MODEL_PATH}")
    print(f"Scaler:          {SCALER_PATH}")
    print(f"Label encoder:   {ENCODER_PATH}")
    print(f"Feature order:   {FEATURE_ORDER_PATH}")
    print(f"Scaler info:     {SCALER_INFO_PATH}")
    print(f"Training profile:{TRAINING_PROFILES_PATH}")
    print(f"Metrics:         {MODEL_METRICS_PATH}")

    return {
        "accuracy": metrics["test_accuracy"],
        "classes": list(encoder.classes_),
        "feature_order": FEATURE_COLUMNS,
    }


def main() -> None:
    summary = train()
    _print_header("TRAINING COMPLETE")
    print(f"Accuracy: {summary['accuracy'] * 100:.1f}%")
    print(f"Crops:    {len(summary['classes'])}")
    print(f"Features: {summary['feature_order']}")


if __name__ == "__main__":
    main()
