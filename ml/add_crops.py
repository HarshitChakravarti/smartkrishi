"""Add missing crops to the SmartKrishi training dataset and support files.

Run from the project root:
    python3 ml/add_crops.py
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

np.random.seed(42)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = SCRIPT_DIR / "data"
PRIMARY_DATASET_PATH = PROJECT_ROOT / "dataset" / "crop_recommendation.csv"

DATASET_CANDIDATES = [
    PRIMARY_DATASET_PATH,
    DATA_DIR / "crop_recommendation.csv",
    PROJECT_ROOT / "data" / "crop_recommendation.csv",
]

CROP_DURATION_PATH = DATA_DIR / "crop_duration.json"
CROP_FAMILIES_PATH = DATA_DIR / "crop_families.json"
SEASONAL_CROPS_PATH = DATA_DIR / "seasonal_crops.json"
CROP_KB_PATH = DATA_DIR / "crop_knowledge_base.json"
STATE_PROFILES_PATH = DATA_DIR / "state_agricultural_profiles.json"

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
GLOBAL_LIMITS = {
    "N": {"min": 0.0, "max": 140.0},
    "P": {"min": 5.0, "max": 145.0},
    "K": {"min": 5.0, "max": 205.0},
    "temperature": {"min": 8.83, "max": 43.68},
    "humidity": {"min": 14.26, "max": 99.98},
    "ph": {"min": 3.50, "max": 9.94},
    "rainfall": {"min": 20.21, "max": 298.56},
}

CROP_DEFINITIONS = {
    "wheat": {
        "N": {"min": 40, "max": 120, "mean": 80, "std": 15},
        "P": {"min": 40, "max": 80, "mean": 55, "std": 10},
        "K": {"min": 40, "max": 80, "mean": 55, "std": 10},
        "temperature": {"min": 12, "max": 25, "mean": 18, "std": 3},
        "humidity": {"min": 40, "max": 75, "mean": 55, "std": 8},
        "ph": {"min": 6.0, "max": 7.5, "mean": 6.8, "std": 0.3},
        "rainfall": {"min": 35, "max": 70, "mean": 50, "std": 8},
        "description": "Cool-season cereal, India's #1 Rabi crop",
    },
    "soybean": {
        "N": {"min": 15, "max": 60, "mean": 35, "std": 10},
        "P": {"min": 40, "max": 80, "mean": 60, "std": 10},
        "K": {"min": 30, "max": 70, "mean": 50, "std": 10},
        "temperature": {"min": 22, "max": 32, "mean": 27, "std": 2.5},
        "humidity": {"min": 55, "max": 85, "mean": 70, "std": 8},
        "ph": {"min": 5.5, "max": 7.5, "mean": 6.5, "std": 0.4},
        "rainfall": {"min": 60, "max": 200, "mean": 120, "std": 30},
        "description": "Nitrogen-fixing oilseed, India's soybean capital is MP",
    },
    "millet": {
        "N": {"min": 15, "max": 50, "mean": 30, "std": 8},
        "P": {"min": 15, "max": 50, "mean": 30, "std": 8},
        "K": {"min": 15, "max": 50, "mean": 30, "std": 8},
        "temperature": {"min": 25, "max": 40, "mean": 32, "std": 3},
        "humidity": {"min": 30, "max": 70, "mean": 50, "std": 10},
        "ph": {"min": 5.5, "max": 8.5, "mean": 7.0, "std": 0.5},
        "rainfall": {"min": 25, "max": 100, "mean": 55, "std": 15},
        "description": "Drought-tolerant grain, Rajasthan's primary Kharif crop",
    },
}

CROP_KB_ADDITIONS = {
    "soybean": {
        "display_name": "Soybean",
        "hindi_name": "\u0938\u094b\u092f\u093e\u092c\u0940\u0928",
        "category": "oilseed",
        "family": "Fabaceae",
        "seasons": {
            "primary": "Kharif",
            "secondary": None,
            "sowing_months": ["June", "July"],
            "harvesting_months": ["September", "October"],
            "growing_duration_days": [90, 120],
            "growing_duration_months": 4,
        },
        "climate_requirements": {
            "temperature": {"min": 20, "max": 35, "optimal_min": 24, "optimal_max": 30},
            "rainfall": {
                "min": 60,
                "max": 200,
                "optimal_min": 80,
                "optimal_max": 150,
                "total_season_need_mm": 500,
            },
            "humidity": {"min": 50, "max": 90, "optimal_min": 60, "optimal_max": 80},
        },
        "soil_requirements": {
            "N": {"min": 10, "max": 70, "optimal": 35},
            "P": {"min": 35, "max": 85, "optimal": 60},
            "K": {"min": 25, "max": 75, "optimal": 50},
            "pH": {"min": 5.5, "max": 7.5, "optimal": 6.5},
            "preferred_soil_types": ["black_cotton_soil", "clay_loam", "well_drained_loam"],
            "waterlogging_tolerance": "low",
        },
        "water_needs": {
            "category": "moderate",
            "irrigation_type": ["rainfed", "supplemental_irrigation"],
            "drought_tolerance": "low",
            "waterlogging_tolerance": "low",
            "critical_water_stages": ["flowering", "pod_filling"],
        },
        "rotation": {
            "good_predecessors": ["wheat", "chickpea", "maize"],
            "bad_predecessors": ["soybean", "groundnut"],
            "good_successors": ["wheat", "chickpea", "lentil", "garlic"],
            "bad_successors": ["soybean"],
            "rotation_gap_minimum_months": 4,
            "nitrogen_fixing": True,
            "soil_effect": "enriching",
            "recommended_rotation_cycle": ["soybean", "wheat"],
            "why_good_rotation": (
                "Soybean fixes nitrogen, enriching soil for following wheat. "
                "Soybean-wheat is MP's #1 rotation."
            ),
        },
        "regional_suitability": {
            "best_states": ["Madhya Pradesh", "Maharashtra", "Rajasthan"],
            "moderate_states": ["Karnataka", "Telangana", "Chhattisgarh"],
            "unsuitable_states": ["Punjab", "Kerala", "West Bengal", "Haryana"],
            "why": (
                "Needs well-drained black soil, warm temperatures 24-30C, and moderate "
                "monsoon rainfall. MP's Malwa plateau is the soybean heartland of India."
            ),
        },
        "economics": {
            "investment_level": "medium",
            "labor_intensity": "medium",
            "mechanization_potential": "high",
            "minimum_viable_farm_size_acres": 1,
            "ideal_farm_size_acres": [2, 50],
            "market_demand": "very_high",
            "msp_available": True,
            "value_category": "commercial",
        },
        "pest_disease_risk": {
            "major_pests": ["stem_fly", "girdle_beetle", "defoliators", "pod_borer"],
            "major_diseases": ["rust", "yellow_mosaic_virus", "anthracnose", "collar_rot"],
            "risk_months": ["August", "September"],
            "risk_conditions": "Continuous rain during pod formation causes major losses",
        },
        "fertilizer_advisory": {
            "N_schedule": (
                "Low N needed (20-25 kg/ha) - soybean fixes its own nitrogen. "
                "Seed treatment with Rhizobium culture essential."
            ),
            "P_schedule": "60-80 kg P2O5/ha as basal. Soybean responds strongly to phosphorus.",
            "K_schedule": "30-40 kg K2O/ha as basal for potassium-deficient soils.",
            "organic_alternatives": (
                "Rhizobium + PSB seed treatment. FYM 5t/ha. Reduces chemical fertilizer need by 25%."
            ),
            "micronutrients": "Sulphur 20 kg/ha essential for oil content. Zinc in deficient soils.",
        },
        "irrigation_advisory": {
            "method": (
                "Primarily rainfed. Supplemental irrigation at flowering and pod filling if monsoon breaks."
            ),
            "frequency": "1-2 irrigations only during dry spells in critical stages.",
            "water_saving": "Ridge and furrow planting conserves moisture. Mulching helps in dry spells.",
            "critical_periods": (
                "Do not allow water stress during flowering (35-45 days) and pod filling (50-70 days)."
            ),
        },
        "tags": ["nitrogen_fixing", "kharif", "oilseed", "msp_crop", "rainfed", "mp_specialty"],
    },
    "millet": {
        "display_name": "Millet (Bajra/Pearl Millet)",
        "hindi_name": "\u092c\u093e\u091c\u0930\u093e / \u092e\u094b\u091f\u093e \u0905\u0928\u093e\u091c",
        "category": "cereal",
        "family": "Poaceae",
        "seasons": {
            "primary": "Kharif",
            "secondary": None,
            "sowing_months": ["June", "July"],
            "harvesting_months": ["September", "October"],
            "growing_duration_days": [75, 100],
            "growing_duration_months": 3,
        },
        "climate_requirements": {
            "temperature": {"min": 20, "max": 45, "optimal_min": 28, "optimal_max": 35},
            "rainfall": {
                "min": 25,
                "max": 100,
                "optimal_min": 40,
                "optimal_max": 75,
                "total_season_need_mm": 250,
            },
            "humidity": {"min": 20, "max": 75, "optimal_min": 35, "optimal_max": 60},
        },
        "soil_requirements": {
            "N": {"min": 10, "max": 55, "optimal": 30},
            "P": {"min": 10, "max": 55, "optimal": 30},
            "K": {"min": 10, "max": 55, "optimal": 30},
            "pH": {"min": 5.5, "max": 8.5, "optimal": 7.0},
            "preferred_soil_types": ["sandy", "sandy_loam", "light_soils", "poor_soils"],
            "waterlogging_tolerance": "very_low",
        },
        "water_needs": {
            "category": "very_low",
            "irrigation_type": ["rainfed"],
            "drought_tolerance": "very_high",
            "waterlogging_tolerance": "very_low",
            "critical_water_stages": ["germination", "flowering"],
        },
        "rotation": {
            "good_predecessors": ["mustard", "chickpea", "wheat", "mungbean"],
            "bad_predecessors": ["millet"],
            "good_successors": ["mustard", "chickpea", "wheat"],
            "bad_successors": ["millet"],
            "rotation_gap_minimum_months": 3,
            "nitrogen_fixing": False,
            "soil_effect": "neutral",
            "recommended_rotation_cycle": ["millet", "mustard"],
            "why_good_rotation": (
                "Millet-mustard is Rajasthan's traditional rotation. Both are drought-tolerant. "
                "Mustard's deep roots break soil hardpan."
            ),
        },
        "regional_suitability": {
            "best_states": ["Rajasthan", "Haryana", "Gujarat", "Uttar Pradesh", "Maharashtra"],
            "moderate_states": ["Madhya Pradesh", "Karnataka", "Tamil Nadu"],
            "unsuitable_states": ["Kerala", "West Bengal", "Assam", "Punjab"],
            "why": (
                "Thrives in hot, dry conditions with poor sandy soils. Rajasthan grows 40% of "
                "India's bajra. Cannot tolerate waterlogging or high humidity."
            ),
        },
        "economics": {
            "investment_level": "very_low",
            "labor_intensity": "low",
            "mechanization_potential": "medium",
            "minimum_viable_farm_size_acres": 0.5,
            "ideal_farm_size_acres": [1, 100],
            "market_demand": "high",
            "msp_available": True,
            "value_category": "staple",
        },
        "pest_disease_risk": {
            "major_pests": ["shoot_fly", "stem_borer", "earhead_bug"],
            "major_diseases": ["downy_mildew", "ergot", "smut", "rust"],
            "risk_months": ["August", "September"],
            "risk_conditions": "High humidity periods during flowering increase downy mildew risk",
        },
        "fertilizer_advisory": {
            "N_schedule": (
                "40-60 kg N/ha in two splits - half at sowing, half at 30 days. Less is more for millet."
            ),
            "P_schedule": "20-30 kg P2O5/ha as basal. Not a heavy phosphorus feeder.",
            "K_schedule": "Generally not required unless soil is potassium-deficient.",
            "organic_alternatives": "FYM 5t/ha before sowing. Millet responds well to organic farming.",
            "micronutrients": "Zinc sulphate 25 kg/ha in zinc-deficient soils of Rajasthan.",
        },
        "irrigation_advisory": {
            "method": "Primarily rainfed. One life-saving irrigation at flowering if rains fail.",
            "frequency": "At most 1-2 irrigations in the entire season. Excess water kills millet.",
            "water_saving": "Millet IS the water-saving crop. It needs 250mm total vs rice's 1200mm.",
            "critical_periods": (
                "Germination needs moisture. After that, millet tolerates drought remarkably well."
            ),
        },
        "tags": [
            "drought_tolerant",
            "kharif",
            "cereal",
            "msp_crop",
            "rainfed",
            "low_input",
            "rajasthan_specialty",
            "nutri_cereal",
        ],
    },
}

STATE_PROFILE_UPDATES = {
    "Madhya Pradesh": {
        "Kharif": {
            "primary_crop": "soybean",
            "major_crops": ["soybean", "rice", "maize", "cotton", "pigeonpeas", "mungbean"],
        }
    },
    "Rajasthan": {
        "Kharif": {
            "primary_crop": "millet",
            "major_crops": ["millet", "mungbean", "mothbeans", "maize", "cotton"],
        }
    },
    "Maharashtra": {
        "Kharif": {
            "major_crops": ["soybean", "rice", "cotton", "maize", "pigeonpeas"],
        }
    },
    "Haryana": {
        "Kharif": {
            "major_crops": ["millet", "rice", "maize", "cotton"],
        },
        "notes": ["Millet is especially relevant for southern Haryana districts."],
    },
    "Uttar Pradesh": {
        "Kharif": {
            "moderate_crops": ["millet"],
        }
    },
}

UNCHANGED_STATES = ["Punjab", "West Bengal", "Kerala"]


def _display_path(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def _resolve_dataset_path() -> Path | None:
    for path in DATASET_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


def _load_json(path: Path, *, warn_if_missing: bool = False) -> dict:
    if not os.path.exists(path):
        if warn_if_missing:
            print(f"  [WARN] {path.name} not found at {_display_path(path)} - creating new file")
        return {}
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def _prepend_unique(existing_items: list[str], preferred_items: list[str]) -> list[str]:
    combined = [*preferred_items, *existing_items]
    ordered: list[str] = []
    seen: set[str] = set()
    for item in combined:
        normalized = str(item).strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(normalized)
    return ordered


def _sample_value(feature_name: str, params: dict) -> float:
    value = float(np.random.normal(params["mean"], params["std"]))
    value = max(float(params["min"]), min(float(params["max"]), value))
    global_limits = GLOBAL_LIMITS[feature_name]
    value = max(float(global_limits["min"]), min(float(global_limits["max"]), value))
    return round(value, 2)


def generate_samples(crop_name: str, definition: dict, n_samples: int = 100) -> list[dict]:
    samples: list[dict] = []
    for _ in range(n_samples):
        row = {feature: _sample_value(feature, definition[feature]) for feature in FEATURES}
        row["label"] = crop_name
        samples.append(row)
    return samples


def _update_scalar_json(path: Path, additions: dict[str, int], name: str) -> None:
    data = _load_json(path, warn_if_missing=True)
    added: list[str] = []
    for key, value in additions.items():
        if key not in data:
            data[key] = value
            added.append(key)
    _save_json(path, data)
    if added:
        print(f"  [OK] {name}: added {', '.join(added)}")
    else:
        print(f"  [OK] {name}: no changes needed")


def _update_json_lists(path: Path, additions: dict[str, list[str]], name: str) -> None:
    data = _load_json(path, warn_if_missing=True)
    changes: list[str] = []
    for key, new_items in additions.items():
        existing_items = [str(item).strip().lower() for item in data.get(key, [])]
        updated_items = existing_items[:]
        for item in new_items:
            normalized = str(item).strip().lower()
            if normalized not in updated_items:
                updated_items.append(normalized)
                changes.append(f"added {normalized} to {key}")
        data[key] = updated_items
    _save_json(path, data)
    if changes:
        for change in changes:
            print(f"  [OK] {name}: {change}")
    else:
        print(f"  [OK] {name}: no changes needed")


def _update_crop_families(path: Path) -> None:
    data = _load_json(path, warn_if_missing=True)
    if not data:
        data = {}

    cereals = [str(item).strip().lower() for item in data.get("cereals", [])]
    if "millet" not in cereals:
        cereals.append("millet")
    data["cereals"] = cereals

    oilseed_key = "oilseed" if "oilseed" in data or "oilseeds" not in data else "oilseeds"
    oilseeds = [str(item).strip().lower() for item in data.get(oilseed_key, [])]
    if "soybean" not in oilseeds:
        oilseeds.append("soybean")
    data[oilseed_key] = oilseeds

    _save_json(path, data)
    print(f"  [OK] crop_families.json: ensured millet in cereals and soybean in {oilseed_key}")


def _update_crop_knowledge_base(path: Path) -> None:
    data = _load_json(path, warn_if_missing=True)
    added: list[str] = []
    for crop_name, crop_data in CROP_KB_ADDITIONS.items():
        if crop_name not in data:
            data[crop_name] = crop_data
            added.append(crop_name)
    _save_json(path, data)
    if added:
        print(f"  [OK] crop_knowledge_base.json: added {', '.join(added)}")
    else:
        print("[OK] crop_knowledge_base.json: no changes needed")


def _update_state_profiles(path: Path) -> None:
    data = _load_json(path, warn_if_missing=True)
    changes: list[str] = []

    for state_name, state_update in STATE_PROFILE_UPDATES.items():
        state_data = data.get(state_name, {})
        if not isinstance(state_data, dict):
            state_data = {}

        crop_calendar = state_data.get("crop_calendar", {})
        if not isinstance(crop_calendar, dict):
            crop_calendar = {}

        for season_name, season_update in state_update.items():
            if season_name == "notes":
                continue

            season_data = crop_calendar.get(season_name, {})
            if not isinstance(season_data, dict):
                season_data = {}

            if "primary_crop" in season_update:
                primary_crop = str(season_update["primary_crop"]).strip().lower()
                if season_data.get("primary_crop") != primary_crop:
                    season_data["primary_crop"] = primary_crop
                    changes.append(f"{state_name}: set {season_name} primary_crop={primary_crop}")

            if "major_crops" in season_update:
                existing_major = [str(item).strip().lower() for item in season_data.get("major_crops", [])]
                updated_major = _prepend_unique(existing_major, [str(item).strip().lower() for item in season_update["major_crops"]])
                if updated_major != existing_major:
                    season_data["major_crops"] = updated_major
                    changes.append(f"{state_name}: updated {season_name} major_crops")

            if "moderate_crops" in season_update:
                existing_moderate = [str(item).strip().lower() for item in season_data.get("moderate_crops", [])]
                updated_moderate = _prepend_unique(
                    existing_moderate,
                    [str(item).strip().lower() for item in season_update["moderate_crops"]],
                )
                if updated_moderate != existing_moderate:
                    season_data["moderate_crops"] = updated_moderate
                    changes.append(f"{state_name}: updated {season_name} moderate_crops")

            crop_calendar[season_name] = season_data

        if "notes" in state_update:
            existing_notes = [str(item).strip() for item in state_data.get("notes", [])]
            updated_notes = _prepend_unique(existing_notes, state_update["notes"])
            if updated_notes != existing_notes:
                state_data["notes"] = updated_notes
                changes.append(f"{state_name}: updated notes")

        state_data["crop_calendar"] = crop_calendar
        data[state_name] = state_data

    _save_json(path, data)

    if changes:
        for change in changes:
            print(f"  [OK] state_agricultural_profiles.json: {change}")
    else:
        print("[OK] state_agricultural_profiles.json: no changes needed")

    if UNCHANGED_STATES:
        print(f"  [INFO] Left unchanged: {', '.join(UNCHANGED_STATES)}")


def update_json_files() -> None:
    print("\n" + "=" * 60)
    print("UPDATING SUPPORTING DATA FILES")
    print("=" * 60)

    _update_scalar_json(
        CROP_DURATION_PATH,
        {"wheat": 5, "soybean": 4, "millet": 3},
        "crop_duration.json",
    )
    _update_crop_families(CROP_FAMILIES_PATH)
    _update_json_lists(
        SEASONAL_CROPS_PATH,
        {"Kharif": ["soybean", "millet"], "Rabi": ["wheat"]},
        "seasonal_crops.json",
    )
    _update_crop_knowledge_base(CROP_KB_PATH)
    _update_state_profiles(STATE_PROFILES_PATH)


def main() -> None:
    print("=" * 60)
    print("SMARTKRISHI - ADD MISSING CROPS TO DATASET")
    print("=" * 60)

    dataset_path = _resolve_dataset_path()
    if dataset_path is None:
        print("[ERROR] Could not find crop_recommendation.csv in any expected location:")
        for candidate in DATASET_CANDIDATES:
            print(f"  - {_display_path(candidate)}")
        print("Run this script from the project root directory.")
        return

    if dataset_path != PRIMARY_DATASET_PATH:
        print(
            "[WARN] Canonical dataset path "
            f"{_display_path(PRIMARY_DATASET_PATH)} not found. "
            f"Using legacy dataset {_display_path(dataset_path)} instead."
        )

    print(f"Dataset path: {_display_path(dataset_path)}")

    df = pd.read_csv(dataset_path)
    expected_columns = set(FEATURES + ["label"])
    missing_columns = expected_columns - set(df.columns)
    if missing_columns:
        print(f"[ERROR] Dataset missing required columns: {sorted(missing_columns)}")
        return

    original_unique_labels = df["label"].nunique()
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    normalized_unique_labels = df["label"].nunique()
    if normalized_unique_labels != original_unique_labels:
        print(
            f"[INFO] Normalized label casing/spacing: {original_unique_labels} -> "
            f"{normalized_unique_labels} unique labels"
        )

    existing_crops = set(df["label"].unique())
    print(f"\nExisting dataset: {len(df)} samples, {len(existing_crops)} crops")
    print(f"Existing crops: {sorted(existing_crops)}")

    new_samples: list[dict] = []
    added_crops: list[str] = []

    for crop_name, definition in CROP_DEFINITIONS.items():
        count = int((df["label"] == crop_name).sum())
        if count > 0:
            print(f"\n  [OK] {crop_name}: already exists ({count} samples)")
            if count < 80:
                needed = 100 - count
                print(f"     [WARN] Only {count} samples - generating {needed} more")
                samples = generate_samples(crop_name, definition, needed)
                new_samples.extend(samples)
                added_crops.append(f"{crop_name} (+{needed} top-up)")
        else:
            print(f"\n  [MISSING] {crop_name}: generating 100 samples")
            print(f"     {definition['description']}")
            samples = generate_samples(crop_name, definition, 100)
            new_samples.extend(samples)
            added_crops.append(f"{crop_name} (+100 new)")

            sample_df = pd.DataFrame(samples)
            for feature in FEATURES:
                values = sample_df[feature]
                print(
                    f"     {feature:12s}: {values.min():6.2f} - {values.max():6.2f} "
                    f"(mean={values.mean():6.2f})"
                )

    if new_samples:
        new_df = pd.DataFrame(new_samples)
        combined = pd.concat([df, new_df], ignore_index=True)
        combined["label"] = combined["label"].astype(str).str.strip().str.lower()
        combined = combined.sample(frac=1.0, random_state=42).reset_index(drop=True)
        combined.to_csv(dataset_path, index=False)

        print("\n" + "=" * 60)
        print("DATASET UPDATED")
        print("=" * 60)
        print(f"Previous:  {len(df)} samples, {len(existing_crops)} crops")
        print(f"Added:     {len(new_samples)} new samples")
        print(f"Changes:   {', '.join(added_crops)}")
        print(f"New total: {len(combined)} samples, {combined['label'].nunique()} crops")
        print("\nCrop distribution:")
        print(combined["label"].value_counts().sort_index().to_string())
    else:
        print("\n[OK] All target crops already present. Dataset unchanged.")

    update_json_files()

    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print("1. Retrain model:")
    print("   cd ml && python3 train_model.py")
    print("2. Run diagnostic:")
    print("   cd .. && python3 diagnose_pipeline.py")
    print("3. Verify encoder:")
    print(
        "   python3 -c \"import joblib; e=joblib.load('ml/models/label_encoder.pkl'); "
        "print(sorted(e.classes_))\""
    )


if __name__ == "__main__":
    main()
