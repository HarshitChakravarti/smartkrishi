from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


DATASET_PATH = Path("dataset/crop_recommendation.csv")
EXPECTED_COLUMNS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "label"]

ZONES = [
    {
        "name": "Zone 1 - Rajasthan dry",
        "count": 40,
        "ranges": {
            "N": (50, 80),
            "P": (35, 55),
            "K": (15, 30),
            "temperature": (13, 20),
            "humidity": (30, 48),
            "ph": (6.2, 7.5),
            "rainfall": (20, 45),
        },
        "means": {
            "N": 65,
            "P": 45,
            "K": 22,
            "temperature": 17,
            "humidity": 40,
            "ph": 6.8,
            "rainfall": 32,
        },
    },
    {
        "name": "Zone 2 - MP/UP irrigated",
        "count": 25,
        "ranges": {
            "N": (45, 75),
            "P": (35, 60),
            "K": (15, 35),
            "temperature": (15, 23),
            "humidity": (40, 58),
            "ph": (6.0, 7.2),
            "rainfall": (30, 60),
        },
        "means": {
            "N": 58,
            "P": 48,
            "K": 25,
            "temperature": 19,
            "humidity": 48,
            "ph": 6.5,
            "rainfall": 45,
        },
    },
    {
        "name": "Zone 3 - Haryana/Punjab",
        "count": 20,
        "ranges": {
            "N": (55, 85),
            "P": (40, 60),
            "K": (18, 32),
            "temperature": (12, 19),
            "humidity": (35, 52),
            "ph": (6.5, 7.8),
            "rainfall": (22, 48),
        },
        "means": {
            "N": 70,
            "P": 50,
            "K": 24,
            "temperature": 15,
            "humidity": 42,
            "ph": 7.0,
            "rainfall": 35,
        },
    },
    {
        "name": "Zone 4 - Eastern India",
        "count": 15,
        "ranges": {
            "N": (40, 65),
            "P": (30, 50),
            "K": (12, 28),
            "temperature": (16, 25),
            "humidity": (45, 65),
            "ph": (5.5, 6.8),
            "rainfall": (35, 70),
        },
        "means": {
            "N": 52,
            "P": 40,
            "K": 20,
            "temperature": 20,
            "humidity": 55,
            "ph": 6.2,
            "rainfall": 52,
        },
    },
]


def sample_normal_clipped(rng: np.random.Generator, mean: float, low: float, high: float) -> float:
    std = (high - low) / 4.0
    value = float(rng.normal(loc=mean, scale=std))
    return float(np.clip(value, low, high))


def generate_zone_rows(rng: np.random.Generator, zone: dict) -> list[dict]:
    rows: list[dict] = []
    ranges = zone["ranges"]
    means = zone["means"]

    for _ in range(int(zone["count"])):
        row = {}
        for feature in ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]:
            low, high = ranges[feature]
            row[feature] = sample_normal_clipped(rng, means[feature], low, high)

        row["N"] = int(round(row["N"]))
        row["P"] = int(round(row["P"]))
        row["K"] = int(round(row["K"]))
        row["temperature"] = round(float(row["temperature"]), 1)
        row["humidity"] = round(float(row["humidity"]), 1)
        row["ph"] = round(float(row["ph"]), 2)
        row["rainfall"] = round(float(row["rainfall"]), 1)
        row["label"] = "mustard"
        rows.append(row)

    return rows


def validate_mustard_rows(mustard_df: pd.DataFrame) -> list[tuple[str, bool, str]]:
    checks: list[tuple[str, bool, str]] = []

    checks.append(("CHECK 1", len(mustard_df) == 100, f"rows={len(mustard_df)}"))
    checks.append((
        "CHECK 2",
        mustard_df["label"].eq("mustard").all(),
        f"unique_labels={sorted(mustard_df['label'].unique().tolist())}",
    ))
    checks.append((
        "CHECK 3",
        list(mustard_df.columns) == EXPECTED_COLUMNS,
        f"columns={list(mustard_df.columns)}",
    ))

    min_n, max_n = mustard_df["N"].min(), mustard_df["N"].max()
    min_t, max_t = mustard_df["temperature"].min(), mustard_df["temperature"].max()
    min_h, max_h = mustard_df["humidity"].min(), mustard_df["humidity"].max()
    min_r, max_r = mustard_df["rainfall"].min(), mustard_df["rainfall"].max()
    min_ph, max_ph = mustard_df["ph"].min(), mustard_df["ph"].max()
    min_k, max_k = mustard_df["K"].min(), mustard_df["K"].max()

    checks.append(("CHECK 4", min_n >= 35 and max_n <= 90, f"N_range=[{min_n}, {max_n}]"))
    checks.append(("CHECK 5", min_t >= 10 and max_t <= 26, f"temperature_range=[{min_t}, {max_t}]"))
    checks.append(("CHECK 6", min_h >= 30 and max_h <= 65, f"humidity_range=[{min_h}, {max_h}]"))
    checks.append(("CHECK 7", min_r >= 20 and max_r <= 70, f"rainfall_range=[{min_r}, {max_r}]"))
    checks.append(("CHECK 8", min_ph >= 5.5 and max_ph <= 7.8, f"ph_range=[{min_ph}, {max_ph}]"))
    checks.append(("CHECK 9", min_k >= 10 and max_k <= 40, f"K_range=[{min_k}, {max_k}]"))

    mean_n = float(mustard_df["N"].mean())
    mean_t = float(mustard_df["temperature"].mean())
    mean_h = float(mustard_df["humidity"].mean())

    checks.append(("CHECK 10", 55 <= mean_n <= 68, f"mean_N={mean_n:.3f}"))
    checks.append(("CHECK 11", 16 <= mean_t <= 20, f"mean_temperature={mean_t:.3f}"))
    checks.append(("CHECK 12", 38 <= mean_h <= 50, f"mean_humidity={mean_h:.3f}"))

    warm_humid_violations = int(((mustard_df["temperature"] > 24) & (mustard_df["humidity"] > 60)).sum())
    checks.append(("CHECK 13", warm_humid_violations == 0, f"violations={warm_humid_violations}"))

    high_n_count = int((mustard_df["N"] > 45).sum())
    low_humidity_count = int((mustard_df["humidity"] < 55).sum())
    checks.append(("CHECK 14", high_n_count >= 70, f"rows_N_gt_45={high_n_count}"))
    checks.append(("CHECK 15", low_humidity_count >= 60, f"rows_humidity_lt_55={low_humidity_count}"))

    return checks


def print_summary_stats(mustard_df: pd.DataFrame) -> None:
    print("\nSummary statistics for generated mustard rows:")
    stats = mustard_df[["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]].agg(["min", "mean", "max", "std"]).T
    print(stats.to_string(float_format=lambda x: f"{x:.3f}"))


def print_separation_check(full_df: pd.DataFrame) -> None:
    labels = full_df["label"].astype(str).str.lower()
    df = full_df.copy()
    df["label"] = labels

    mustard = df[df["label"] == "mustard"]
    chickpea = df[df["label"] == "chickpea"]
    lentil = df[df["label"] == "lentil"]
    watermelon = df[df["label"] == "watermelon"]

    print("\nSeparation comparison (means):")
    print("N mean: mustard={:.3f}, chickpea={:.3f}, lentil={:.3f}".format(
        mustard["N"].mean(), chickpea["N"].mean(), lentil["N"].mean()
    ))
    print("Humidity mean: mustard={:.3f}, chickpea={:.3f}, lentil={:.3f}".format(
        mustard["humidity"].mean(), chickpea["humidity"].mean(), lentil["humidity"].mean()
    ))
    print("Temperature mean: mustard={:.3f}, watermelon={:.3f}".format(
        mustard["temperature"].mean(), watermelon["temperature"].mean()
    ))
    print("Rainfall mean: mustard={:.3f}, watermelon={:.3f}".format(
        mustard["rainfall"].mean(), watermelon["rainfall"].mean()
    ))


def main() -> None:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATASET_PATH}")

    original_df = pd.read_csv(DATASET_PATH)
    if list(original_df.columns) != EXPECTED_COLUMNS:
        raise ValueError(f"Unexpected columns: {list(original_df.columns)}")

    current_rows = len(original_df)
    mustard_count = int((original_df["label"].astype(str).str.lower() == "mustard").sum())

    print(f"Current row count: {current_rows}")
    print(f"Current mustard count: {mustard_count}")

    if current_rows != 2500:
        raise ValueError(f"Expected 2500 rows before append, found {current_rows}")
    if mustard_count != 0:
        raise ValueError(f"Expected mustard absent before append, found mustard count={mustard_count}")

    rng = np.random.default_rng(20260329)
    generated_rows: list[dict] = []
    for zone in ZONES:
        generated_rows.extend(generate_zone_rows(rng, zone))

    mustard_df = pd.DataFrame(generated_rows, columns=EXPECTED_COLUMNS)
    checks = validate_mustard_rows(mustard_df)

    print("\nValidation checks:")
    all_passed = True
    for name, passed, detail in checks:
        status = "PASS" if passed else "FAIL"
        print(f"{name}: {status} ({detail})")
        all_passed = all_passed and passed

    if not all_passed:
        raise ValueError("Validation failed. CSV was not modified.")

    updated_df = pd.concat([original_df, mustard_df], ignore_index=True)
    updated_df = updated_df[EXPECTED_COLUMNS]
    updated_df.to_csv(DATASET_PATH, index=False)

    reloaded = pd.read_csv(DATASET_PATH)
    final_rows = len(reloaded)
    final_counts = reloaded["label"].astype(str).str.lower().value_counts().sort_index()

    if final_rows != 2600:
        raise ValueError(f"Final row count check failed. Expected 2600, found {final_rows}")
    if int(final_counts.get("mustard", 0)) != 100:
        raise ValueError("Final mustard count is not 100 after save")

    print_summary_stats(mustard_df)
    print_separation_check(reloaded)

    print("\nFinal row count:", final_rows)
    print("\nFinal label distribution:")
    print(final_counts.to_string())
    print(f"\nSaved successfully to {DATASET_PATH}")


if __name__ == "__main__":
    main()
