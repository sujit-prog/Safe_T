"""
SafeT ML Pipeline — Configuration
===================================
Central configuration for feature definitions, model hyperparameters,
file paths, and database connection settings.

All feature names, model parameters, and path constants are defined here
so that train.py, predict.py, serve.py, and evaluate.py stay in sync.
"""

import os
from pathlib import Path

# ─── Paths ──────────────────────────────────────────────────────────────────────
ML_DIR = Path(__file__).parent
MODELS_DIR = ML_DIR / "models"
DATA_DIR = ML_DIR / "data"
TESTS_DIR = ML_DIR / "tests"

MODEL_PATH = MODELS_DIR / "model.pkl"
SCALER_PATH = MODELS_DIR / "scaler.pkl"
LABEL_ENCODER_PATH = MODELS_DIR / "label_encoder.pkl"
METADATA_PATH = MODELS_DIR / "model_metadata.json"
EVALUATION_REPORT_PATH = MODELS_DIR / "evaluation_report.json"
HOTSPOT_PATH = MODELS_DIR / "hotspots.json"
ANOMALY_PATH = MODELS_DIR / "anomalies.json"
TRAINING_DATA_PATH = DATA_DIR / "training_data.csv"

# Ensure directories exist
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ─── Database ───────────────────────────────────────────────────────────────────
# Use the same Supabase connection as the Next.js app
# Requires DATABASE_URL to be set in the environment
DATABASE_URL = os.environ.get("DATABASE_URL")

# ─── Feature Configuration ──────────────────────────────────────────────────────
# These are the features the ML model is trained on.
# Order matters — must match training and inference.

FEATURE_NAMES = [
    "crime_density_500m",       # Count of incidents within 500m radius
    "crime_density_2km",        # Count of incidents within 2km radius
    "avg_severity_nearby",      # Average severity of incidents within 2km
    "severe_crime_ratio",       # Ratio of severity>=4 incidents within 2km
    "district_ipc_total",       # Total IPC crimes for nearest district (NCRB 2022)
    "district_ipc_normalized",  # district_ipc_total / max_ipc (0-1)
    "district_accidents",       # MoRTH accident count for nearest district
    "district_accident_norm",   # district_accidents / max_accidents (0-1)
    "crowdedness_score",        # 0-100 based on distance to district HQ
    "hour",                     # Hour of day (0-23)
    "day_of_week",              # Day of week (0=Mon, 6=Sun)
    "is_weekend",               # 1 if Saturday/Sunday, else 0
    "is_night",                 # 1 if 22:00-05:00, else 0
    "month",                    # Month (1-12)
    "dist_to_police_km",        # Distance to nearest police station (km)
    "dist_to_hospital_km",      # Distance to nearest hospital (km)
    "lighting_proxy",           # Inverse of "Poor Lighting" incident density nearby
]

# Features that need standard scaling
NUMERIC_FEATURES = FEATURE_NAMES  # All features are numeric after preprocessing

# ─── NCRB 2022 Odisha District Data ─────────────────────────────────────────────
# Reused from the existing Next.js codebase — single source of truth for the ML pipeline
NCRB_2022_ODISHA = [
    {"district": "Khordha",     "lat": 20.1843, "lng": 85.8314, "totalIPC": 14823, "murder": 89, "rape": 223, "robbery": 189, "burglary": 945, "theft": 4230},
    {"district": "Cuttack",     "lat": 20.4625, "lng": 85.8828, "totalIPC": 12541, "murder": 76, "rape": 189, "robbery": 163, "burglary": 812, "theft": 3670},
    {"district": "Ganjam",      "lat": 19.3769, "lng": 84.7767, "totalIPC": 11209, "murder": 68, "rape": 167, "robbery": 148, "burglary": 723, "theft": 3240},
    {"district": "Sundargarh",  "lat": 22.1167, "lng": 84.0333, "totalIPC": 9876,  "murder": 62, "rape": 139, "robbery": 131, "burglary": 635, "theft": 2860},
    {"district": "Sambalpur",   "lat": 21.4669, "lng": 83.9756, "totalIPC": 8932,  "murder": 54, "rape": 124, "robbery": 119, "burglary": 572, "theft": 2580},
    {"district": "Balasore",    "lat": 21.4942, "lng": 86.9288, "totalIPC": 8123,  "murder": 51, "rape": 116, "robbery": 108, "burglary": 521, "theft": 2320},
    {"district": "Jajpur",      "lat": 20.8463, "lng": 86.3387, "totalIPC": 7891,  "murder": 49, "rape": 112, "robbery": 105, "burglary": 507, "theft": 2240},
    {"district": "Puri",        "lat": 19.8135, "lng": 85.8312, "totalIPC": 7456,  "murder": 46, "rape": 107, "robbery": 99,  "burglary": 479, "theft": 2120},
    {"district": "Kendrapara",  "lat": 20.4981, "lng": 86.4214, "totalIPC": 6234,  "murder": 39, "rape": 89,  "robbery": 89,  "burglary": 401, "theft": 1780},
    {"district": "Kalahandi",   "lat": 19.9079, "lng": 83.1704, "totalIPC": 5678,  "murder": 35, "rape": 88,  "robbery": 75,  "burglary": 365, "theft": 1610},
    {"district": "Koraput",     "lat": 18.8135, "lng": 82.7132, "totalIPC": 5432,  "murder": 34, "rape": 84,  "robbery": 72,  "burglary": 349, "theft": 1540},
    {"district": "Mayurbhanj",  "lat": 21.9407, "lng": 86.7320, "totalIPC": 5234,  "murder": 33, "rape": 82,  "robbery": 70,  "burglary": 337, "theft": 1480},
    {"district": "Angul",       "lat": 20.8403, "lng": 85.1010, "totalIPC": 5123,  "murder": 32, "rape": 79,  "robbery": 68,  "burglary": 329, "theft": 1450},
    {"district": "Bolangir",    "lat": 20.7014, "lng": 83.4866, "totalIPC": 4987,  "murder": 31, "rape": 77,  "robbery": 66,  "burglary": 321, "theft": 1410},
]

MORTH_2022_ODISHA = [
    {"district": "Khordha",    "accidents": 1245},
    {"district": "Cuttack",    "accidents": 950},
    {"district": "Ganjam",     "accidents": 890},
    {"district": "Sundargarh", "accidents": 810},
    {"district": "Sambalpur",  "accidents": 620},
    {"district": "Balasore",   "accidents": 580},
    {"district": "Jajpur",     "accidents": 540},
    {"district": "Puri",       "accidents": 510},
    {"district": "Kendrapara", "accidents": 420},
    {"district": "Kalahandi",  "accidents": 380},
    {"district": "Koraput",    "accidents": 310},
    {"district": "Mayurbhanj", "accidents": 290},
    {"district": "Angul",      "accidents": 450},
    {"district": "Bolangir",   "accidents": 260},
]

MAX_IPC = 15000   # For normalization
MAX_ACCIDENTS = 1500

# ─── Safe Anchors (Emergency Services) ──────────────────────────────────────────
SAFE_ANCHORS = [
    {"name": "KIIT Police Station",             "type": "Police Station", "lat": 20.3524, "lng": 85.8189},
    {"name": "Pradyumna Bal Memorial Hospital",  "type": "Hospital",      "lat": 20.3552, "lng": 85.8174},
    {"name": "VSSUT Police Outpost",            "type": "Police Station", "lat": 21.4984, "lng": 83.8992},
    {"name": "VIMSAR Hospital Burla",           "type": "Hospital",      "lat": 21.4965, "lng": 83.8931},
]

# ─── Model Hyperparameters ──────────────────────────────────────────────────────
RANDOM_FOREST_PARAMS = {
    "n_estimators": 200,
    "max_depth": 12,
    "min_samples_split": 10,
    "min_samples_leaf": 5,
    "class_weight": "balanced",  # Handle class imbalance
    "random_state": 42,
    "n_jobs": -1,
}

LOGISTIC_REGRESSION_PARAMS = {
    "max_iter": 1000,
    "class_weight": "balanced",
    "random_state": 42,
    "solver": "lbfgs",
}

XGBOOST_PARAMS = {
    "n_estimators": 200,
    "max_depth": 8,
    "learning_rate": 0.1,
    "random_state": 42,
    "eval_metric": "logloss",
}

# ─── Training Configuration ─────────────────────────────────────────────────────
TRAIN_TEST_SPLIT = 0.15   # 15% test
VALIDATION_SPLIT = 0.15   # 15% validation (from remaining 85%)
RANDOM_STATE = 42

# Grid sampling for training data generation
GRID_RESOLUTION = 0.02    # ~2.2km spacing between grid points
LAT_RANGE = (18.5, 22.5)  # Odisha latitude range
LNG_RANGE = (82.0, 87.5)  # Odisha longitude range

# Risk labeling thresholds (for training data)
HIGH_RISK_THRESHOLD = 0.65    # risk_score >= 0.65 → High
MEDIUM_RISK_THRESHOLD = 0.35  # risk_score >= 0.35 → Medium, else Low

# ─── DBSCAN Hotspot Parameters ──────────────────────────────────────────────────
DBSCAN_EPS = 0.005         # ~500m in degrees
DBSCAN_MIN_SAMPLES = 5

# ─── Anomaly Detection Parameters ───────────────────────────────────────────────
ISOLATION_FOREST_CONTAMINATION = 0.1

# ─── Risk → Safety Score Conversion ─────────────────────────────────────────────
def risk_to_safety_score(risk_probability: float) -> int:
    """Convert ML risk probability (0-1) to safety score (0-100).
    
    Formula: safety_score = round((1 - risk_probability) * 100)
    
    Examples:
        risk = 0.10 → safety = 90
        risk = 0.50 → safety = 50
        risk = 0.85 → safety = 15
    """
    return max(0, min(100, round((1 - risk_probability) * 100)))


def safety_score_to_risk_level(safety_score: int) -> str:
    """Convert safety score to human-readable risk level.
    
    Thresholds match the existing frontend display logic.
    """
    if safety_score >= 75:
        return "Low"
    elif safety_score >= 45:
        return "Medium"
    else:
        return "High"


# ─── Route Ranking Defaults ─────────────────────────────────────────────────────
DEFAULT_ROUTE_WEIGHTS = {
    "safety": 0.60,
    "time": 0.25,
    "distance": 0.15,
}

# ─── Model Version ──────────────────────────────────────────────────────────────
MODEL_VERSION = "1.0.0"
