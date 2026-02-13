#!/usr/bin/env python3
"""Train a crop recommendation classifier on Kaggle crop dataset.

This trains only on measured agro-climatic features that exist in the dataset:
N, P, K, temperature, humidity, ph, rainfall.

Personalization inputs (farm_size, previous_crop, season) are applied later in the
advisory re-ranking layer via `ml/recommend_crop.py`.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train crop recommendation model")
    parser.add_argument(
        "--data",
        type=Path,
        default=PROJECT_ROOT / "dataset/Crop_recommendation 2.csv",
        help="Path to CSV dataset",
    )
    parser.add_argument(
        "--model-out",
        type=Path,
        default=PROJECT_ROOT / "models/crop_model.joblib",
        help="Output path for trained model bundle",
    )
    parser.add_argument(
        "--metrics-out",
        type=Path,
        default=PROJECT_ROOT / "models/crop_model_metrics.json",
        help="Output path for evaluation metrics",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Fraction of data for test set",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed",
    )
    return parser.parse_args()


def validate_columns(df: pd.DataFrame) -> None:
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")


def main() -> None:
    args = parse_args()
    df = pd.read_csv(args.data)
    validate_columns(df)

    X = df[FEATURES]
    y = df[TARGET].astype(str).str.lower().str.strip()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=400,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=args.random_state,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "macro_f1": float(f1_score(y_test, y_pred, average="macro")),
        "weighted_f1": float(f1_score(y_test, y_pred, average="weighted")),
        "n_samples": int(df.shape[0]),
        "n_classes": int(y.nunique()),
        "features": FEATURES,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    metrics["classification_report"] = report

    args.model_out.parent.mkdir(parents=True, exist_ok=True)
    args.metrics_out.parent.mkdir(parents=True, exist_ok=True)

    bundle = {
        "model": model,
        "feature_columns": FEATURES,
        "classes": list(model.classes_),
        "metadata": {
            "dataset": str(args.data),
            "random_state": args.random_state,
            "test_size": args.test_size,
            "created_at": metrics["created_at"],
            "feature_columns": FEATURES,
        },
    }

    joblib.dump(bundle, args.model_out)
    args.metrics_out.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("Training complete")
    print(f"Model saved: {args.model_out}")
    print(f"Metrics saved: {args.metrics_out}")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print(f"Macro F1: {metrics['macro_f1']:.4f}")


if __name__ == "__main__":
    np.set_printoptions(suppress=True)
    main()
