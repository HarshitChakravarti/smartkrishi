"""Train SmartKrishi crop model using 7 agronomic features."""

from __future__ import annotations

import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

try:
    from .config import DATASET_PATH, ENCODER_PATH, FEATURE_COLUMNS, MODEL_PATH, SCALER_PATH
except ImportError:  # pragma: no cover
    from config import DATASET_PATH, ENCODER_PATH, FEATURE_COLUMNS, MODEL_PATH, SCALER_PATH  # type: ignore


def _print_outlier_flags(df: pd.DataFrame, columns: list[str]) -> None:
    print("Outlier flags (>3 std dev from mean):")
    for column in columns:
        series = df[column]
        std = float(series.std())
        if std == 0:
            print(f"  - {column}: 0")
            continue
        z_scores = ((series - series.mean()) / std).abs()
        flagged = int((z_scores > 3).sum())
        print(f"  - {column}: {flagged}")


def main() -> None:
    df = pd.read_csv(DATASET_PATH)
    df = df.rename(columns={"ph": "pH"})

    expected = set(FEATURE_COLUMNS + ["label"])
    missing = expected - set(df.columns)
    if missing:
        raise ValueError(f"Dataset missing required columns: {sorted(missing)}")

    print(f"Dataset shape: {df.shape}")
    print("Class distribution:")
    print(df["label"].value_counts().sort_index())

    if df.isnull().any().any():
        medians = df[FEATURE_COLUMNS].median(numeric_only=True)
        df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(medians)
        df = df.dropna(subset=["label"])

    _print_outlier_flags(df, FEATURE_COLUMNS)

    X = df[FEATURE_COLUMNS].copy()
    y = df["label"].astype(str).str.strip().str.lower()

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

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    recall = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 score: {f1:.4f}")

    print("Classification report:")
    print(classification_report(y_test, y_pred, target_names=encoder.classes_, zero_division=0))

    importances = sorted(zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda row: row[1], reverse=True)
    print("Top feature importances:")
    for name, value in importances[:5]:
        print(f"  - {name}: {value:.4f}")

    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoder, ENCODER_PATH)

    print(
        f"Model trained: {len(df)} samples, {len(encoder.classes_)} crops, accuracy: {accuracy * 100:.2f}%"
    )


if __name__ == "__main__":
    main()
