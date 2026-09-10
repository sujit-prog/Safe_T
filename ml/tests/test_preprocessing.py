"""Tests for preprocessing pipeline."""

import sys
import numpy as np
import pandas as pd
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import FEATURE_NAMES


def test_feature_names_complete():
    """All expected features are defined."""
    assert len(FEATURE_NAMES) == 17
    assert "crime_density_500m" in FEATURE_NAMES
    assert "is_night" in FEATURE_NAMES
    assert "dist_to_police_km" in FEATURE_NAMES


def test_clean_data_handles_missing():
    """Clean data fills missing values with median."""
    from preprocessing import clean_data
    
    data = {feat: [1.0, 2.0, None, 4.0, 5.0] for feat in FEATURE_NAMES}
    data["latitude"] = [20.0, 20.1, 20.2, 20.3, 20.4]
    data["longitude"] = [85.0, 85.1, 85.2, 85.3, 85.4]
    data["risk_score"] = [0.1, 0.5, 0.3, 0.7, 0.2]
    data["risk_level"] = ["Low", "Medium", "Low", "High", "Low"]
    data["nearest_district"] = ["Khordha"] * 5
    
    df = pd.DataFrame(data)
    cleaned = clean_data(df)
    
    # No missing values after cleaning
    assert cleaned[FEATURE_NAMES].isnull().sum().sum() == 0


def test_clean_data_removes_invalid_coords():
    """Clean data removes rows with invalid coordinates."""
    from preprocessing import clean_data
    
    data = {feat: [1.0, 2.0, 3.0] for feat in FEATURE_NAMES}
    data["latitude"] = [20.0, 99.0, 20.2]   # 99.0 is invalid
    data["longitude"] = [85.0, 85.1, 85.2]
    data["risk_score"] = [0.1, 0.5, 0.3]
    data["risk_level"] = ["Low", "Medium", "Low"]
    data["nearest_district"] = ["Khordha"] * 3
    
    df = pd.DataFrame(data)
    cleaned = clean_data(df)
    
    assert len(cleaned) == 2  # Invalid row removed


def test_feature_extraction_output_shape():
    """Feature extraction produces correct number of features."""
    from data.extract_features import compute_features_for_point
    
    features = compute_features_for_point(
        lat=20.35, lng=85.82, hour=14, day_of_week=2, month=6,
        incidents=[], safe_anchors=[]
    )
    
    # Should have all feature names plus lat, lng, nearest_district
    for feat in FEATURE_NAMES:
        assert feat in features, f"Missing feature: {feat}"


def test_feature_extraction_temporal():
    """Night/weekend features are correctly computed."""
    from data.extract_features import compute_features_for_point
    
    # Daytime weekday
    feat_day = compute_features_for_point(
        lat=20.35, lng=85.82, hour=14, day_of_week=2, month=6,
        incidents=[], safe_anchors=[]
    )
    assert feat_day["is_night"] == 0
    assert feat_day["is_weekend"] == 0
    
    # Nighttime weekend
    feat_night = compute_features_for_point(
        lat=20.35, lng=85.82, hour=23, day_of_week=5, month=6,
        incidents=[], safe_anchors=[]
    )
    assert feat_night["is_night"] == 1
    assert feat_night["is_weekend"] == 1


def test_risk_label_computation():
    """Risk labeling produces values between 0 and 1."""
    from data.extract_features import compute_risk_label
    
    features = {
        "crime_density_500m": 5,
        "crime_density_2km": 20,
        "avg_severity_nearby": 4.0,
        "severe_crime_ratio": 0.3,
        "district_ipc_normalized": 0.8,
        "district_accident_norm": 0.6,
        "is_night": 1,
        "is_weekend": 1,
        "hour": 23,
        "crowdedness_score": 30,
        "dist_to_police_km": 15.0,
        "dist_to_hospital_km": 20.0,
        "lighting_proxy": 20.0,
    }
    
    risk = compute_risk_label(features)
    assert 0.0 <= risk <= 1.0


if __name__ == "__main__":
    test_feature_names_complete()
    test_clean_data_handles_missing()
    test_clean_data_removes_invalid_coords()
    test_feature_extraction_output_shape()
    test_feature_extraction_temporal()
    test_risk_label_computation()
    print("✅ All preprocessing tests passed!")
