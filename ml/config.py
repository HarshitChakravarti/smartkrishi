"""Central configuration for SmartKrishi AI crop recommendation backend."""

from __future__ import annotations

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(BASE_DIR, "data")
DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset")
MODELS_DIR = os.path.join(BASE_DIR, "models")
CLIMATE_DIR = os.path.join(DATA_DIR, "climate")

MODEL_PATH = os.path.join(MODELS_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODELS_DIR, "label_encoder.pkl")
FEATURE_ORDER_PATH = os.path.join(MODELS_DIR, "feature_order.json")
SCALER_INFO_PATH = os.path.join(MODELS_DIR, "scaler_info.json")
MODEL_METRICS_PATH = os.path.join(MODELS_DIR, "model_metrics.json")
CLIMATE_ALIGNMENT_PATH = os.path.join(MODELS_DIR, "climate_alignment.json")

DATASET_PATH = os.path.join(DATASET_DIR, "crop_recommendation.csv")
TRAINING_PROFILES_PATH = os.path.join(DATA_DIR, "training_crop_profiles.json")

RAINFALL_DATA_PATH = os.path.join(CLIMATE_DIR, "rainfall_by_state_month.json")
TEMPERATURE_DATA_PATH = os.path.join(CLIMATE_DIR, "temperature_by_state_month.json")
HUMIDITY_DATA_PATH = os.path.join(CLIMATE_DIR, "humidity_by_state_month.json")
CROP_DURATION_PATH = os.path.join(DATA_DIR, "crop_duration.json")
CROP_FAMILIES_PATH = os.path.join(DATA_DIR, "crop_families.json")
SEASONAL_CROPS_PATH = os.path.join(DATA_DIR, "seasonal_crops.json")
CROP_KB_PATH = os.path.join(DATA_DIR, "crop_knowledge_base.json")

# This order must match the raw training CSV columns exactly.
FEATURE_COLUMNS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

FEATURE_NAME_ALIASES = {
    "N": ("N",),
    "P": ("P",),
    "K": ("K",),
    "temperature": ("temperature",),
    "humidity": ("humidity",),
    "ph": ("ph", "pH"),
    "rainfall": ("rainfall",),
}

SEASONS = {
    "Kharif": [6, 7, 8, 9],
    "Rabi": [10, 11, 12, 1],
    "Zaid": [2, 3, 4, 5],
}

MONTH_NAME_TO_NUMBER = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}
MONTH_NUMBER_TO_NAME = {value: key for key, value in MONTH_NAME_TO_NUMBER.items()}

SAME_CROP_PENALTY = -0.30
SAME_FAMILY_PENALTY = -0.15
RECENT_ROTATION_PENALTY = -0.10
ROTATION_BONUS = 0.05
SEASON_BOOST = 0.10
PERENNIAL_BOOST = 0.03
WRONG_SEASON_PENALTY = -0.20
REGIONAL_BOOST = 0.08
SMALL_FARM_HIGHVALUE_BOOST = 0.08
LARGE_FARM_STAPLE_BOOST = 0.05
LOW_RAIN_DROUGHT_BOOST = 0.08
HIGH_RAIN_WATER_BOOST = 0.10
LOW_RAIN_WATER_PENALTY = -0.20
HIGH_RAIN_WATERLOG_PENALTY = -0.10
MODERATE_RAIN_BOOST = 0.05

LOW_RAINFALL_THRESHOLD = 50
HIGH_RAINFALL_THRESHOLD = 200

SMALL_FARM_THRESHOLD = 2.0
LARGE_FARM_THRESHOLD = 5.0

DEFAULT_CROP_DURATION = 4
DEFAULT_SOIL = {"N": 50.0, "P": 50.0, "K": 50.0, "pH": 6.5}
DEFAULT_CLIMATE = {"temperature": 25.0, "humidity": 60.0, "rainfall": 100.0}

LOW_CONFIDENCE_THRESHOLD = 0.30

IDEAL_SOWING_MONTH_BOOST = 0.08
CORRECT_SEASON_BOOST = 0.05
WRONG_SEASON_PENALTY = -0.40
PERENNIAL_NEUTRAL = 0.02

EXCELLENT_CLIMATE_BOOST = 0.06
ACCEPTABLE_CLIMATE_BOOST = 0.02
POOR_CLIMATE_PENALTY = -0.10

EXCELLENT_SOIL_BOOST = 0.04
POOR_SOIL_PENALTY = -0.08

IDEAL_ROTATION_BOOST = 0.08
BAD_PREDECESSOR_PENALTY = -0.10
SAME_CROP_ROTATION_PENALTY = -0.20

BEST_STATE_BOOST = 0.06
MODERATE_STATE_BOOST = 0.03
UNSUITABLE_STATE_PENALTY = -0.06

FARM_SIZE_BOOST = 0.02
FARM_SIZE_PENALTY = -0.03
WATER_SHORTAGE_PENALTY = -0.08

MAX_POSITIVE_ADJUSTMENT = 0.25
MAX_NEGATIVE_ADJUSTMENT = -0.45

API_HOST = "0.0.0.0"
API_PORT = 8000
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "*"]
