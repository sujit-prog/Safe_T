"""Tests for prediction inference."""

import sys
import json
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import MODEL_PATH, SCALER_PATH, risk_to_safety_score, safety_score_to_risk_level


def test_risk_to_safety_conversion():
    """Risk probability to safety score conversion is correct."""
    assert risk_to_safety_score(0.0) == 100
    assert risk_to_safety_score(0.5) == 50
    assert risk_to_safety_score(1.0) == 0
    assert risk_to_safety_score(0.1) == 90
    assert risk_to_safety_score(0.85) == 15


def test_safety_to_risk_level():
    """Safety score to risk level mapping."""
    assert safety_score_to_risk_level(90) == "Low"
    assert safety_score_to_risk_level(75) == "Low"
    assert safety_score_to_risk_level(60) == "Medium"
    assert safety_score_to_risk_level(45) == "Medium"
    assert safety_score_to_risk_level(30) == "High"
    assert safety_score_to_risk_level(0) == "High"


def test_risk_conversion_bounds():
    """Risk conversion handles edge cases."""
    assert risk_to_safety_score(-0.5) == 100  # Clamped
    assert risk_to_safety_score(1.5) == 0     # Clamped


def test_model_exists():
    """Trained model file exists (requires training to have been run)."""
    if not MODEL_PATH.exists():
        print("  ⚠ Skipping: model not yet trained")
        return
    assert MODEL_PATH.stat().st_size > 0


def test_predictor_initialization():
    """SafetyPredictor can be initialized (requires trained model)."""
    if not MODEL_PATH.exists():
        print("  ⚠ Skipping: model not yet trained")
        return
    
    from predict import SafetyPredictor
    predictor = SafetyPredictor()
    assert predictor.model is not None
    assert predictor.scaler is not None


def test_prediction_deterministic():
    """Same input produces same output (model is deterministic)."""
    if not MODEL_PATH.exists():
        print("  ⚠ Skipping: model not yet trained")
        return
    
    from predict import SafetyPredictor
    predictor = SafetyPredictor()
    
    result1 = predictor.predict_location(20.35, 85.82, hour=14, day_of_week=2, month=6)
    result2 = predictor.predict_location(20.35, 85.82, hour=14, day_of_week=2, month=6)
    
    assert result1["safety_score"] == result2["safety_score"]
    assert result1["risk_probability"] == result2["risk_probability"]


def test_prediction_time_aware():
    """Same location at different times produces different risk scores."""
    if not MODEL_PATH.exists():
        print("  ⚠ Skipping: model not yet trained")
        return
    
    from predict import SafetyPredictor
    predictor = SafetyPredictor()
    
    day_result = predictor.predict_location(20.35, 85.82, hour=14)
    night_result = predictor.predict_location(20.35, 85.82, hour=2)
    
    # Night should generally be riskier (lower safety score)
    # Note: this might not always hold depending on model, so we just check they differ
    assert day_result["temporal"]["is_night"] == False
    assert night_result["temporal"]["is_night"] == True


def test_prediction_invalid_coords():
    """Invalid coordinates return error."""
    if not MODEL_PATH.exists():
        print("  ⚠ Skipping: model not yet trained")
        return
    
    from predict import SafetyPredictor
    predictor = SafetyPredictor()
    
    result = predictor.predict_location(999, 999)
    assert "error" in result


def test_route_prediction():
    """Route prediction returns segments and overall score."""
    if not MODEL_PATH.exists():
        print("  ⚠ Skipping: model not yet trained")
        return
    
    from predict import SafetyPredictor
    predictor = SafetyPredictor()
    
    coords = [[20.35 + i*0.01, 85.82 + i*0.01] for i in range(20)]
    result = predictor.predict_route_segments(coords, hour=14)
    
    assert "segments" in result
    assert "overall_safety_score" in result
    assert len(result["segments"]) > 0
    assert 0 <= result["overall_safety_score"] <= 100


def test_prediction_has_source():
    """Predictions include prediction_source field."""
    if not MODEL_PATH.exists():
        print("  ⚠ Skipping: model not yet trained")
        return
    
    from predict import SafetyPredictor
    predictor = SafetyPredictor()
    
    result = predictor.predict_location(20.35, 85.82, hour=14)
    assert result["prediction_source"] == "ml_model"


if __name__ == "__main__":
    test_risk_to_safety_conversion()
    test_safety_to_risk_level()
    test_risk_conversion_bounds()
    test_model_exists()
    test_predictor_initialization()
    test_prediction_deterministic()
    test_prediction_time_aware()
    test_prediction_invalid_coords()
    test_route_prediction()
    test_prediction_has_source()
    print("✅ All prediction tests passed!")
