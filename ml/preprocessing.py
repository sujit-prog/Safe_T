"""
SafeT ML Pipeline — Preprocessing
===================================
Handles data cleaning, feature scaling, encoding, and train/test splitting.

Preprocessing decisions:
    - Missing values: Numeric features filled with median (robust to outliers)
    - Outliers: Capped at 99th percentile (not removed, as extreme values are meaningful for safety)
    - Scaling: StandardScaler for all numeric features (important for Logistic Regression)
    - Encoding: risk_level is label-encoded to integer (Low=0, Medium=1, High=2)
    - No data leakage: Scaler is fit ONLY on training data, then applied to val/test

The trained scaler and label encoder are saved alongside the model for inference.
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    FEATURE_NAMES, TRAINING_DATA_PATH, SCALER_PATH, LABEL_ENCODER_PATH,
    TRAIN_TEST_SPLIT, VALIDATION_SPLIT, RANDOM_STATE
)


def load_training_data() -> pd.DataFrame:
    """Load the training dataset from CSV."""
    if not TRAINING_DATA_PATH.exists():
        raise FileNotFoundError(
            f"Training data not found at {TRAINING_DATA_PATH}. "
            f"Run `python data/extract_features.py` first."
        )
    
    df = pd.read_csv(TRAINING_DATA_PATH)
    print(f"✓ Loaded {len(df)} samples from {TRAINING_DATA_PATH}")
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean the dataset: handle missing values, duplicates, outliers.
    
    Preprocessing decisions documented:
        1. Drop exact duplicates (same lat/lng/time)
        2. Fill missing numeric values with column median
        3. Cap outliers at 99th percentile
        4. Validate coordinate ranges
    """
    original_len = len(df)
    
    # 1. Remove exact duplicates
    df = df.drop_duplicates()
    dupes_removed = original_len - len(df)
    if dupes_removed > 0:
        print(f"  → Removed {dupes_removed} duplicate rows")
    
    # 2. Handle missing values
    missing_counts = df[FEATURE_NAMES].isnull().sum()
    cols_with_missing = missing_counts[missing_counts > 0]
    if len(cols_with_missing) > 0:
        print(f"  → Missing values found in: {dict(cols_with_missing)}")
        for col in cols_with_missing.index:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            print(f"    Filled '{col}' with median = {median_val:.3f}")
    else:
        print(f"  → No missing values found")
    
    # 3. Cap outliers at 99th percentile for density features
    cap_columns = [
        "crime_density_500m", "crime_density_2km",
        "dist_to_police_km", "dist_to_hospital_km"
    ]
    for col in cap_columns:
        if col in df.columns:
            p99 = df[col].quantile(0.99)
            n_capped = (df[col] > p99).sum()
            if n_capped > 0:
                df[col] = df[col].clip(upper=p99)
                print(f"  → Capped {n_capped} outliers in '{col}' at {p99:.2f}")
    
    # 4. Validate coordinates
    valid_mask = (
        (df["latitude"] >= 15.0) & (df["latitude"] <= 25.0) &
        (df["longitude"] >= 80.0) & (df["longitude"] <= 90.0)
    )
    invalid = (~valid_mask).sum()
    if invalid > 0:
        df = df[valid_mask]
        print(f"  → Removed {invalid} rows with invalid coordinates")
    
    print(f"  → Final dataset: {len(df)} samples")
    return df


def prepare_features_and_labels(df: pd.DataFrame):
    """Extract feature matrix X and label vector y.
    
    Returns:
        X: DataFrame with FEATURE_NAMES columns
        y_risk_score: continuous risk score (0-1) for probability prediction
        y_risk_level: categorical risk level (Low/Medium/High) for classification
    """
    X = df[FEATURE_NAMES].copy()
    y_risk_score = df["risk_score"].values
    y_risk_level = df["risk_level"].values
    
    print(f"  → Feature matrix shape: {X.shape}")
    print(f"  → Risk level distribution: {pd.Series(y_risk_level).value_counts().to_dict()}")
    
    return X, y_risk_score, y_risk_level


def split_data(X, y_risk_score, y_risk_level):
    """Perform train/validation/test split with stratification.
    
    Split: 70% train, 15% validation, 15% test
    Stratified by risk_level to preserve class proportions.
    """
    # First split: separate test set (15%)
    X_temp, X_test, y_score_temp, y_score_test, y_level_temp, y_level_test = train_test_split(
        X, y_risk_score, y_risk_level,
        test_size=TRAIN_TEST_SPLIT,
        random_state=RANDOM_STATE,
        stratify=y_risk_level
    )
    
    # Second split: separate validation set (15% of original ≈ 17.6% of remaining)
    val_ratio = VALIDATION_SPLIT / (1 - TRAIN_TEST_SPLIT)
    X_train, X_val, y_score_train, y_score_val, y_level_train, y_level_val = train_test_split(
        X_temp, y_score_temp, y_level_temp,
        test_size=val_ratio,
        random_state=RANDOM_STATE,
        stratify=y_level_temp
    )
    
    print(f"\n  Dataset splits:")
    print(f"    Train:      {len(X_train)} samples ({len(X_train)/len(X)*100:.1f}%)")
    print(f"    Validation: {len(X_val)} samples ({len(X_val)/len(X)*100:.1f}%)")
    print(f"    Test:       {len(X_test)} samples ({len(X_test)/len(X)*100:.1f}%)")
    
    return {
        "X_train": X_train, "X_val": X_val, "X_test": X_test,
        "y_score_train": y_score_train, "y_score_val": y_score_val, "y_score_test": y_score_test,
        "y_level_train": y_level_train, "y_level_val": y_level_val, "y_level_test": y_level_test,
    }


def fit_scaler(X_train: pd.DataFrame) -> StandardScaler:
    """Fit StandardScaler on training data only (prevents data leakage).
    
    The scaler is saved for use during inference.
    """
    scaler = StandardScaler()
    scaler.fit(X_train)
    joblib.dump(scaler, SCALER_PATH)
    print(f"  → Scaler saved to {SCALER_PATH}")
    return scaler


def fit_label_encoder(y_train) -> LabelEncoder:
    """Fit LabelEncoder for risk levels."""
    le = LabelEncoder()
    le.fit(["Low", "Medium", "High"])  # Fixed order
    joblib.dump(le, LABEL_ENCODER_PATH)
    print(f"  → Label encoder saved to {LABEL_ENCODER_PATH}")
    return le


def scale_features(X: pd.DataFrame, scaler: StandardScaler) -> np.ndarray:
    """Apply fitted scaler to feature matrix."""
    return scaler.transform(X)


def preprocess_pipeline():
    """Run the full preprocessing pipeline. Returns everything needed for training.
    
    Returns dict with:
        - Scaled X_train, X_val, X_test
        - y labels for risk_score and risk_level
        - Fitted scaler and label encoder
    """
    print("=" * 70)
    print("SafeT ML — Preprocessing Pipeline")
    print("=" * 70)
    
    # Load
    df = load_training_data()
    
    # Clean
    print("\n🧹 Cleaning data...")
    df = clean_data(df)
    
    # Extract features and labels
    print("\n📐 Preparing features and labels...")
    X, y_risk_score, y_risk_level = prepare_features_and_labels(df)
    
    # Split
    print("\n✂️  Splitting dataset...")
    splits = split_data(X, y_risk_score, y_risk_level)
    
    # Fit scaler and encoder on TRAINING data only
    print("\n⚖️  Fitting scaler and encoder...")
    scaler = fit_scaler(splits["X_train"])
    label_encoder = fit_label_encoder(splits["y_level_train"])
    
    # Scale all splits
    splits["X_train_scaled"] = scale_features(splits["X_train"], scaler)
    splits["X_val_scaled"] = scale_features(splits["X_val"], scaler)
    splits["X_test_scaled"] = scale_features(splits["X_test"], scaler)
    
    # Encode labels
    splits["y_level_train_encoded"] = label_encoder.transform(splits["y_level_train"])
    splits["y_level_val_encoded"] = label_encoder.transform(splits["y_level_val"])
    splits["y_level_test_encoded"] = label_encoder.transform(splits["y_level_test"])
    
    splits["scaler"] = scaler
    splits["label_encoder"] = label_encoder
    splits["feature_names"] = FEATURE_NAMES
    
    print("\n✅ Preprocessing complete!")
    return splits


if __name__ == "__main__":
    splits = preprocess_pipeline()
    print(f"\nReady for training with {len(splits['X_train'])} training samples.")
