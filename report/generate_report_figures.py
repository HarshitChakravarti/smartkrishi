#!/usr/bin/env python3
"""Generate model report figures for SmartKrishi.

Usage:
  python report/generate_report_figures.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import joblib
import matplotlib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, roc_curve, auc
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import label_binarize

from ml.feature_engineering import EXTENDED_FEATURES, add_engineered_features

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402  (requires Agg backend first)


REPORT_DIR = ROOT / "report"
DATASET_PATH = ROOT / "dataset" / "crop_recommendation.csv"
ARTIFACT_DIR = ROOT / "ml" / "models"
MODEL_PATH = ARTIFACT_DIR / "model.pkl"
SCALER_PATH = ARTIFACT_DIR / "scaler.pkl"
ENCODER_PATH = ARTIFACT_DIR / "label_encoder.pkl"
METRICS_PATH = ARTIFACT_DIR / "model_metrics.json"


def _configure_plot_style() -> None:
    try:
        plt.style.use("seaborn-v0_8-whitegrid")
    except Exception:
        plt.style.use("default")


def _load_artifacts() -> tuple[Any, Any, Any, dict[str, Any]]:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    encoder = joblib.load(ENCODER_PATH)
    metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else {}
    return model, scaler, encoder, metrics


def _prepare_data(scaler: Any, encoder: Any) -> tuple[pd.DataFrame, np.ndarray, np.ndarray, np.ndarray, list[str]]:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)
    if "label" not in df.columns:
        raise ValueError("Expected 'label' column in dataset")

    df["label"] = df["label"].astype(str).str.strip().str.lower()
    known_labels = set(map(str, encoder.classes_))
    mask = df["label"].isin(known_labels)
    dropped = int((~mask).sum())
    if dropped:
        print(f"[WARN] Dropping {dropped} rows with labels not present in label encoder")
    df = df.loc[mask].copy()

    df_features = add_engineered_features(df)
    feature_order = list(getattr(scaler, "feature_names_in_", EXTENDED_FEATURES))
    x_df = df_features[feature_order].copy()

    y_labels = df_features["label"].to_numpy()
    y_encoded = encoder.transform(y_labels)
    x_scaled = scaler.transform(x_df)

    class_names = list(map(str, encoder.classes_))
    return x_df, x_scaled, y_labels, y_encoded, class_names


def _save_figure(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    plt.tight_layout()
    plt.savefig(path, dpi=220, bbox_inches="tight")
    plt.close()
    print(f"[OK] Saved {path.relative_to(ROOT)}")


def plot_correlation_heatmap(x_df: pd.DataFrame) -> Path:
    corr = x_df.corr(numeric_only=True)

    plt.figure(figsize=(16, 13))
    ax = plt.gca()
    im = ax.imshow(corr.values, cmap="coolwarm", vmin=-1, vmax=1, aspect="auto")

    ax.set_title("Feature Correlation Heatmap", fontsize=16, fontweight="bold", pad=12)
    ax.set_xticks(np.arange(len(corr.columns)))
    ax.set_xticklabels(corr.columns, rotation=90, fontsize=8)
    ax.set_yticks(np.arange(len(corr.index)))
    ax.set_yticklabels(corr.index, fontsize=8)
    plt.colorbar(im, ax=ax, fraction=0.03, pad=0.02, label="Correlation")

    out_path = REPORT_DIR / "correlation_heatmap.png"
    _save_figure(out_path)
    return out_path


def plot_class_distribution(y_labels: np.ndarray) -> Path:
    counts = pd.Series(y_labels).value_counts().sort_values(ascending=False)

    plt.figure(figsize=(15, 6))
    ax = plt.gca()
    ax.bar(counts.index, counts.values, color="#2d5016", alpha=0.85)
    ax.set_title("Class Distribution", fontsize=16, fontweight="bold", pad=10)
    ax.set_xlabel("Crop Label")
    ax.set_ylabel("Sample Count")
    ax.tick_params(axis="x", rotation=65)

    out_path = REPORT_DIR / "class_distribution.png"
    _save_figure(out_path)
    return out_path


def _plot_matrix(matrix: np.ndarray, class_names: list[str], title: str, cmap: str, out_path: Path) -> Path:
    plt.figure(figsize=(17, 14))
    ax = plt.gca()
    im = ax.imshow(matrix, cmap=cmap, aspect="auto")
    ax.set_title(title, fontsize=15, fontweight="bold", pad=12)
    ax.set_xlabel("Predicted Label")
    ax.set_ylabel("True Label")
    ax.set_xticks(np.arange(len(class_names)))
    ax.set_xticklabels(class_names, rotation=90, fontsize=7)
    ax.set_yticks(np.arange(len(class_names)))
    ax.set_yticklabels(class_names, fontsize=7)
    plt.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    _save_figure(out_path)
    return out_path


def plot_confusion_matrices(y_true: np.ndarray, y_pred: np.ndarray, class_names: list[str]) -> list[Path]:
    labels = np.arange(len(class_names))
    cm_counts = confusion_matrix(y_true, y_pred, labels=labels)
    cm_normalized = confusion_matrix(y_true, y_pred, labels=labels, normalize="true")

    paths = []
    paths.append(
        _plot_matrix(
            cm_counts,
            class_names,
            "Confusion Matrix (Counts)",
            "Blues",
            REPORT_DIR / "confusion_matrix_counts.png",
        )
    )
    paths.append(
        _plot_matrix(
            cm_normalized,
            class_names,
            "Confusion Matrix (Row-Normalized)",
            "YlGnBu",
            REPORT_DIR / "confusion_matrix_normalized.png",
        )
    )
    return paths


def plot_multiclass_roc(y_true: np.ndarray, y_proba: np.ndarray, class_names: list[str]) -> Path:
    n_classes = len(class_names)
    classes = np.arange(n_classes)
    y_bin = label_binarize(y_true, classes=classes)

    fpr: dict[Any, np.ndarray] = {}
    tpr: dict[Any, np.ndarray] = {}
    roc_auc: dict[Any, float] = {}

    for i in classes:
        fpr[i], tpr[i], _ = roc_curve(y_bin[:, i], y_proba[:, i])
        roc_auc[i] = auc(fpr[i], tpr[i])

    fpr["micro"], tpr["micro"], _ = roc_curve(y_bin.ravel(), y_proba.ravel())
    roc_auc["micro"] = auc(fpr["micro"], tpr["micro"])

    all_fpr = np.unique(np.concatenate([fpr[i] for i in classes]))
    mean_tpr = np.zeros_like(all_fpr)
    for i in classes:
        mean_tpr += np.interp(all_fpr, fpr[i], tpr[i])
    mean_tpr /= n_classes

    fpr["macro"] = all_fpr
    tpr["macro"] = mean_tpr
    roc_auc["macro"] = auc(fpr["macro"], tpr["macro"])

    supports = np.bincount(y_true, minlength=n_classes)
    top_idx = np.argsort(supports)[-6:][::-1]

    plt.figure(figsize=(12, 9))
    ax = plt.gca()
    ax.plot(fpr["micro"], tpr["micro"], color="#14532d", lw=2.5, label=f"Micro-average (AUC={roc_auc['micro']:.3f})")
    ax.plot(fpr["macro"], tpr["macro"], color="#b45309", lw=2.5, linestyle="--", label=f"Macro-average (AUC={roc_auc['macro']:.3f})")

    for i in top_idx:
        ax.plot(
            fpr[i],
            tpr[i],
            lw=1.5,
            alpha=0.75,
            label=f"{class_names[i]} (AUC={roc_auc[i]:.3f})",
        )

    ax.plot([0, 1], [0, 1], color="gray", linestyle=":", lw=1)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("Multiclass ROC Curve (One-vs-Rest)", fontsize=16, fontweight="bold", pad=10)
    ax.legend(loc="lower right", fontsize=8, frameon=True)

    out_path = REPORT_DIR / "roc_curve_multiclass.png"
    _save_figure(out_path)
    return out_path


def plot_feature_importance(model: Any, feature_names: list[str]) -> Path | None:
    if not hasattr(model, "feature_importances_"):
        print("[SKIP] feature_importance_top15.png (model has no feature_importances_)")
        return None

    importances = np.asarray(model.feature_importances_)
    if importances.ndim != 1 or len(importances) != len(feature_names):
        print("[SKIP] feature_importance_top15.png (unexpected feature importance shape)")
        return None

    idx = np.argsort(importances)[-15:]
    top_features = [feature_names[i] for i in idx]
    top_values = importances[idx]

    plt.figure(figsize=(11, 7))
    ax = plt.gca()
    ax.barh(top_features, top_values, color="#2f6a4f", alpha=0.9)
    ax.set_title("Top 15 Feature Importances", fontsize=16, fontweight="bold", pad=10)
    ax.set_xlabel("Importance")

    out_path = REPORT_DIR / "feature_importance_top15.png"
    _save_figure(out_path)
    return out_path


def plot_per_crop_accuracy(model_metrics: dict[str, Any]) -> Path | None:
    per_crop = model_metrics.get("per_crop_metrics", [])
    if not per_crop:
        print("[SKIP] per_crop_accuracy.png (no per_crop_metrics in model_metrics.json)")
        return None

    perf = pd.DataFrame(per_crop)
    required = {"crop", "accuracy"}
    if not required.issubset(perf.columns):
        print("[SKIP] per_crop_accuracy.png (missing required columns)")
        return None

    perf = perf.sort_values("accuracy", ascending=True)

    plt.figure(figsize=(12, 9))
    ax = plt.gca()
    bars = ax.barh(perf["crop"], perf["accuracy"], color="#7c9a3d", alpha=0.9)
    ax.set_xlim(0, 1.02)
    ax.set_title("Per-Crop Accuracy", fontsize=16, fontweight="bold", pad=10)
    ax.set_xlabel("Accuracy")

    for bar, value in zip(bars, perf["accuracy"], strict=False):
        ax.text(min(value + 0.01, 1.0), bar.get_y() + bar.get_height() / 2, f"{value:.2f}", va="center", fontsize=8)

    out_path = REPORT_DIR / "per_crop_accuracy.png"
    _save_figure(out_path)
    return out_path


def plot_model_comparison(x_scaled: np.ndarray, y_true: np.ndarray, model: Any, model_metrics: dict[str, Any]) -> tuple[Path, dict[str, float]]:
    x_train, x_test, y_train, y_test = train_test_split(
        x_scaled,
        y_true,
        test_size=0.2,
        stratify=y_true,
        random_state=42,
    )

    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(x_train, y_train)

    dummy_pred = dummy.predict(x_test)
    model_pred = model.predict(x_test)

    dummy_metrics = {
        "accuracy": float(accuracy_score(y_test, dummy_pred)),
        "macro_f1": float(f1_score(y_test, dummy_pred, average="macro")),
        "weighted_f1": float(f1_score(y_test, dummy_pred, average="weighted")),
    }
    trained_metrics = {
        "accuracy": float(accuracy_score(y_test, model_pred)),
        "macro_f1": float(f1_score(y_test, model_pred, average="macro")),
        "weighted_f1": float(f1_score(y_test, model_pred, average="weighted")),
    }

    plt.figure(figsize=(14, 6))

    ax1 = plt.subplot(1, 2, 1)
    metric_names = ["Accuracy", "Macro F1", "Weighted F1"]
    x = np.arange(len(metric_names))
    width = 0.35

    dummy_vals = [dummy_metrics["accuracy"], dummy_metrics["macro_f1"], dummy_metrics["weighted_f1"]]
    trained_vals = [trained_metrics["accuracy"], trained_metrics["macro_f1"], trained_metrics["weighted_f1"]]

    ax1.bar(x - width / 2, dummy_vals, width=width, label="Dummy Baseline", color="#94a3b8")
    ax1.bar(x + width / 2, trained_vals, width=width, label="Saved Model", color="#14532d")
    ax1.set_xticks(x)
    ax1.set_xticklabels(metric_names)
    ax1.set_ylim(0, 1.02)
    ax1.set_title("Baseline vs Saved Model")
    ax1.legend(fontsize=8)

    ax2 = plt.subplot(1, 2, 2)
    selection = model_metrics.get("model_selection", {})
    cv_labels = [
        "Default CV Macro F1",
        "Tuned CV Macro F1",
        "Reported Holdout Macro F1",
    ]
    cv_vals = [
        selection.get("default_cv_macro_f1", np.nan),
        selection.get("best_cv_macro_f1", np.nan),
        model_metrics.get("macro_f1", np.nan),
    ]

    cv_vals = [float(v) if v is not None and not pd.isna(v) else 0.0 for v in cv_vals]
    ax2.bar(cv_labels, cv_vals, color=["#64748b", "#b45309", "#166534"])
    ax2.set_ylim(0, 1.02)
    ax2.set_title("Training-Time Model Comparison")
    ax2.tick_params(axis="x", rotation=18)

    out_path = REPORT_DIR / "model_comparison.png"
    _save_figure(out_path)

    merged_metrics = {
        "dummy_accuracy": dummy_metrics["accuracy"],
        "dummy_macro_f1": dummy_metrics["macro_f1"],
        "saved_model_accuracy_on_holdout": trained_metrics["accuracy"],
        "saved_model_macro_f1_on_holdout": trained_metrics["macro_f1"],
    }
    return out_path, merged_metrics


def plot_confidence_calibration(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray) -> Path:
    max_conf = y_proba.max(axis=1)
    correct = (y_true == y_pred).astype(int)

    plt.figure(figsize=(13, 5))

    ax1 = plt.subplot(1, 2, 1)
    ax1.hist(max_conf, bins=20, color="#2d5016", alpha=0.9)
    ax1.set_title("Prediction Confidence Distribution")
    ax1.set_xlabel("Max Class Probability")
    ax1.set_ylabel("Sample Count")

    ax2 = plt.subplot(1, 2, 2)
    bins = np.linspace(0, 1, 11)
    bin_ids = np.digitize(max_conf, bins) - 1

    bin_conf = []
    bin_acc = []
    for i in range(len(bins) - 1):
        mask = bin_ids == i
        if np.any(mask):
            bin_conf.append(float(np.mean(max_conf[mask])))
            bin_acc.append(float(np.mean(correct[mask])))

    ax2.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfect calibration")
    ax2.plot(bin_conf, bin_acc, marker="o", color="#b45309", label="Model")
    ax2.set_xlim(0, 1)
    ax2.set_ylim(0, 1)
    ax2.set_title("Confidence vs Accuracy")
    ax2.set_xlabel("Mean Confidence (per bin)")
    ax2.set_ylabel("Empirical Accuracy")
    ax2.legend(fontsize=8)

    out_path = REPORT_DIR / "confidence_calibration.png"
    _save_figure(out_path)
    return out_path


def save_summary_json(generated: list[Path], model_metrics: dict[str, Any], additional: dict[str, float]) -> Path:
    payload = {
        "generated_files": [str(path.relative_to(ROOT)) for path in generated],
        "model_type": model_metrics.get("model_type"),
        "accuracy": model_metrics.get("accuracy"),
        "macro_f1": model_metrics.get("macro_f1"),
        "weighted_f1": model_metrics.get("weighted_f1"),
        "extra_comparison_metrics": additional,
    }
    out_path = REPORT_DIR / "report_summary.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"[OK] Saved {out_path.relative_to(ROOT)}")
    return out_path


def main() -> None:
    _configure_plot_style()
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    model, scaler, encoder, model_metrics = _load_artifacts()
    x_df, x_scaled, y_labels, y_encoded, class_names = _prepare_data(scaler, encoder)

    y_pred = model.predict(x_scaled)
    y_proba = model.predict_proba(x_scaled)

    generated: list[Path] = []

    generated.append(plot_correlation_heatmap(x_df))
    generated.append(plot_class_distribution(y_labels))
    generated.extend(plot_confusion_matrices(y_encoded, y_pred, class_names))
    generated.append(plot_multiclass_roc(y_encoded, y_proba, class_names))

    feature_imp_path = plot_feature_importance(model, list(x_df.columns))
    if feature_imp_path:
        generated.append(feature_imp_path)

    per_crop_path = plot_per_crop_accuracy(model_metrics)
    if per_crop_path:
        generated.append(per_crop_path)

    model_comp_path, comparison_metrics = plot_model_comparison(x_scaled, y_encoded, model, model_metrics)
    generated.append(model_comp_path)

    generated.append(plot_confidence_calibration(y_encoded, y_pred, y_proba))

    generated.append(save_summary_json(generated, model_metrics, comparison_metrics))

    print("\nDone. Report figures created in:")
    for path in generated:
        print(f" - {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
