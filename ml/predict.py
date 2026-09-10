"""
SafeT ML Pipeline — Prediction (Inference)
============================================
Loads the trained model and provides prediction functions for:
    1. Single location risk prediction
    2. Route segment batch prediction
    3. Risk probability → safety score conversion

This module is used by both the FastAPI serve.py and can be imported
directly for testing.

The model is loaded ONCE at module initialization (not per-request).
"""

import sys
import json
import math
import numpy as np
from pathlib import Path
from typing import Optional

import joblib

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    MODEL_PATH, SCALER_PATH, LABEL_ENCODER_PATH, METADATA_PATH,
    FEATURE_NAMES, NCRB_2022_ODISHA, MORTH_2022_ODISHA, SAFE_ANCHORS,
    MAX_IPC, MAX_ACCIDENTS,
    risk_to_safety_score, safety_score_to_risk_level
)


class SafetyPredictor:
    """Stateful predictor that loads model once and serves predictions.
    
    Usage:
        predictor = SafetyPredictor()
        result = predictor.predict_location(lat=20.35, lng=85.82, hour=14)
    """
    
    def __init__(self):
        """Load model, scaler, and metadata."""
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.metadata = None
        self.incidents_cache = None
        self._load()
    
    def _load(self):
        """Load all model artifacts."""
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. Run `python train.py` first."
            )
        
        self.model = joblib.load(MODEL_PATH)
        self.scaler = joblib.load(SCALER_PATH)
        self.label_encoder = joblib.load(LABEL_ENCODER_PATH)
        
        if METADATA_PATH.exists():
            with open(METADATA_PATH) as f:
                self.metadata = json.load(f)
        
        # Load incidents from DB or use synthetic
        self._load_incidents()
        
        print(f"✓ SafetyPredictor initialized")
        print(f"  Model: {type(self.model).__name__}")
        print(f"  Version: {self.metadata.get('model_version', 'unknown') if self.metadata else 'unknown'}")
        print(f"  Features: {len(FEATURE_NAMES)}")
        print(f"  Incidents loaded: {len(self.incidents_cache)}")
    
    def _load_incidents(self):
        """Load incident data for feature computation during inference."""
        try:
            from data.extract_features import load_incidents_from_db
            self.incidents_cache = load_incidents_from_db()
        except Exception:
            try:
                from data.extract_features import generate_synthetic_incidents
                self.incidents_cache = generate_synthetic_incidents()
            except Exception:
                self.incidents_cache = []
                print("  ⚠ No incident data available for feature computation")
    
    @staticmethod
    def _haversine_km(lat1, lon1, lat2, lon2):
        R = 6371.0
        p1 = math.radians(lat1)
        p2 = math.radians(lat2)
        dp = math.radians(lat2 - lat1)
        dl = math.radians(lon2 - lon1)
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    def _compute_features(self, lat: float, lng: float, hour: int = 12,
                           day_of_week: int = 2, month: int = 6) -> np.ndarray:
        """Compute feature vector for a single point.
        
        Uses the same feature computation as training (from extract_features.py)
        to prevent train/serve skew.
        """
        # Crime density
        crimes_500m = 0
        crimes_2km = 0
        severity_sum = 0
        severe_count = 0
        lighting_incidents = 0
        
        for inc in self.incidents_cache:
            d = self._haversine_km(lat, lng, inc["latitude"], inc["longitude"])
            if d <= 0.5:
                crimes_500m += 1
            if d <= 2.0:
                crimes_2km += 1
                severity_sum += inc["severity"]
                if inc["severity"] >= 4:
                    severe_count += 1
                if inc.get("type") == "Poor Lighting":
                    lighting_incidents += 1
        
        avg_severity = severity_sum / max(1, crimes_2km)
        severe_ratio = severe_count / max(1, crimes_2km)
        
        # District match
        min_dist = float('inf')
        closest_district = NCRB_2022_ODISHA[0]
        for d in NCRB_2022_ODISHA:
            dist = self._haversine_km(lat, lng, d["lat"], d["lng"])
            if dist < min_dist:
                min_dist = dist
                closest_district = d
        
        morth = next(
            (m for m in MORTH_2022_ODISHA if m["district"] == closest_district["district"]),
            MORTH_2022_ODISHA[0]
        )
        
        # Crowdedness
        if min_dist < 5:
            crowdedness = 90.0
        elif min_dist < 15:
            crowdedness = 60.0
        elif min_dist < 30:
            crowdedness = 40.0
        else:
            crowdedness = 20.0
        
        # Emergency services proximity
        min_police = 50.0
        min_hospital = 50.0
        for a in SAFE_ANCHORS:
            d = self._haversine_km(lat, lng, a["lat"], a["lng"])
            if a["type"] == "Police Station" and d < min_police:
                min_police = d
            elif a["type"] == "Hospital" and d < min_hospital:
                min_hospital = d
        
        lighting_proxy = max(0.0, 100.0 - lighting_incidents * 20.0)
        
        features = [
            crimes_500m,
            crimes_2km,
            round(avg_severity, 2),
            round(severe_ratio, 3),
            closest_district["totalIPC"],
            min(closest_district["totalIPC"] / MAX_IPC, 1.0),
            morth["accidents"],
            min(morth["accidents"] / MAX_ACCIDENTS, 1.0),
            crowdedness,
            hour,
            day_of_week,
            1 if day_of_week >= 5 else 0,  # is_weekend
            1 if (hour >= 22 or hour < 5) else 0,  # is_night
            month,
            round(min(min_police, 50.0), 2),
            round(min(min_hospital, 50.0), 2),
            round(lighting_proxy, 1),
        ]
        
        return np.array(features).reshape(1, -1), closest_district["district"]
    
    def predict_location(self, lat: float, lng: float, hour: int = None,
                          day_of_week: int = None, month: int = None,
                          evaluation_time: str = None) -> dict:
        """Predict safety risk for a single location.
        
        Args:
            lat, lng: Coordinates
            hour, day_of_week, month: Temporal features (optional, defaults to current time)
            evaluation_time: ISO datetime string (overrides hour/dow/month)
        
        Returns:
            dict with risk_probability, safety_score, risk_level, top_factors, etc.
        """
        from datetime import datetime
        
        # Parse time
        if evaluation_time:
            try:
                dt = datetime.fromisoformat(evaluation_time.replace('Z', '+00:00'))
                hour = dt.hour
                day_of_week = dt.weekday()
                month = dt.month
            except Exception:
                pass
        
        now = datetime.now()
        if hour is None:
            hour = now.hour
        if day_of_week is None:
            day_of_week = now.weekday()
        if month is None:
            month = now.month
        
        # Validate coordinates
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return {
                "error": "Invalid coordinates",
                "prediction_source": "error",
            }
        
        # Compute features
        features, nearest_district = self._compute_features(lat, lng, hour, day_of_week, month)
        
        # Scale
        features_scaled = self.scaler.transform(features)
        
        # Predict
        risk_level_pred = self.model.predict(features_scaled)[0]
        risk_proba = self.model.predict_proba(features_scaled)[0]
        
        # Get probability for each class
        classes = list(self.model.classes_)
        proba_dict = {cls: round(float(p), 4) for cls, p in zip(classes, risk_proba)}
        
        # Overall risk probability (weighted by class severity)
        # High=1.0, Medium=0.5, Low=0.0
        severity_weights = {"High": 1.0, "Medium": 0.5, "Low": 0.0}
        risk_probability = sum(
            proba_dict.get(cls, 0) * severity_weights.get(cls, 0)
            for cls in classes
        )
        risk_probability = round(min(1.0, max(0.0, risk_probability)), 4)
        
        safety_score = risk_to_safety_score(risk_probability)
        risk_level = safety_score_to_risk_level(safety_score)
        
        # Feature values for explanation
        feature_values = {name: float(features[0][i]) for i, name in enumerate(FEATURE_NAMES)}
        
        return {
            "risk_probability": risk_probability,
            "safety_score": safety_score,
            "risk_level": risk_level,
            "risk_level_predicted": risk_level_pred,
            "class_probabilities": proba_dict,
            "nearest_district": nearest_district,
            "feature_values": feature_values,
            "temporal": {
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": day_of_week >= 5,
                "is_night": hour >= 22 or hour < 5,
                "month": month,
            },
            "prediction_source": "ml_model",
            "model_version": self.metadata.get("model_version", "unknown") if self.metadata else "unknown",
        }
    
    def predict_route_segments(self, coordinates: list, hour: int = None,
                                day_of_week: int = None, month: int = None,
                                evaluation_time: str = None) -> dict:
        """Predict risk for route segments.
        
        Args:
            coordinates: List of [lat, lng] pairs forming the route
            hour, day_of_week, month: Temporal features
        
        Returns:
            dict with segment scores and overall route risk
        """
        from datetime import datetime
        
        if evaluation_time:
            try:
                dt = datetime.fromisoformat(evaluation_time.replace('Z', '+00:00'))
                hour = dt.hour
                day_of_week = dt.weekday()
                month = dt.month
            except Exception:
                pass
        
        now = datetime.now()
        if hour is None:
            hour = now.hour
        if day_of_week is None:
            day_of_week = now.weekday()
        if month is None:
            month = now.month
        
        if not coordinates or len(coordinates) < 2:
            return {"error": "Need at least 2 coordinates"}
        
        # Divide into segments (~20 segments)
        seg_size = max(5, len(coordinates) // 20)
        segments = []
        
        for i in range(0, len(coordinates) - 1, seg_size):
            segment_coords = coordinates[i:i + seg_size + 1]
            mid_idx = len(segment_coords) // 2
            center_lat = segment_coords[mid_idx][0]
            center_lng = segment_coords[mid_idx][1]
            
            # Predict for segment center
            pred = self.predict_location(
                center_lat, center_lng, hour, day_of_week, month
            )
            
            segments.append({
                "startIndex": i,
                "endIndex": min(i + seg_size, len(coordinates) - 1),
                "center": {"lat": center_lat, "lng": center_lng},
                "risk_probability": pred["risk_probability"],
                "safety_score": pred["safety_score"],
                "risk_level": pred["risk_level"],
                "district": pred.get("nearest_district", "Unknown"),
            })
        
        # Aggregate: weighted average (longer segments count more)
        if segments:
            total_weight = sum(s["endIndex"] - s["startIndex"] for s in segments)
            overall_risk = sum(
                s["risk_probability"] * (s["endIndex"] - s["startIndex"])
                for s in segments
            ) / max(1, total_weight)
        else:
            overall_risk = 0.5
        
        overall_safety = risk_to_safety_score(overall_risk)
        
        return {
            "segments": segments,
            "overall_risk_probability": round(overall_risk, 4),
            "overall_safety_score": overall_safety,
            "overall_risk_level": safety_score_to_risk_level(overall_safety),
            "segment_count": len(segments),
            "prediction_source": "ml_model",
        }


# ─── Module-level singleton ─────────────────────────────────────────────────────
_predictor = None

def get_predictor() -> SafetyPredictor:
    """Get or create the singleton predictor instance."""
    global _predictor
    if _predictor is None:
        _predictor = SafetyPredictor()
    return _predictor


if __name__ == "__main__":
    # Quick test
    predictor = SafetyPredictor()
    
    print("\n" + "=" * 50)
    print("Test Predictions")
    print("=" * 50)
    
    # Test 1: KIIT area (should be moderate-low risk during day)
    result = predictor.predict_location(20.3540, 85.8200, hour=14)
    print(f"\nKIIT Area (2pm):")
    print(f"  Safety Score: {result['safety_score']}/100")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Risk Probability: {result['risk_probability']}")
    
    # Test 2: Same location at night (should be higher risk)
    result_night = predictor.predict_location(20.3540, 85.8200, hour=23)
    print(f"\nKIIT Area (11pm):")
    print(f"  Safety Score: {result_night['safety_score']}/100")
    print(f"  Risk Level: {result_night['risk_level']}")
    print(f"  Risk Probability: {result_night['risk_probability']}")
    
    # Test 3: High-crime area
    result_hc = predictor.predict_location(20.2319, 85.8349, hour=23)
    print(f"\nOld Town Bhubaneswar (11pm):")
    print(f"  Safety Score: {result_hc['safety_score']}/100")
    print(f"  Risk Level: {result_hc['risk_level']}")
    print(f"  Risk Probability: {result_hc['risk_probability']}")
