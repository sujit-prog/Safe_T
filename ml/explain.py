"""
SafeT ML Pipeline — Explainable AI (SHAP)
===========================================
Provides human-readable explanations for safety predictions.

For tree-based models (Random Forest), uses SHAP TreeExplainer for
efficient and accurate feature attribution.

Each prediction includes the top contributing factors with:
    - Feature name (human-readable)
    - Direction (increases/decreases risk)
    - SHAP value magnitude

Example output:
    "High risk because:
     - Recent crime density is high (+0.23)
     - Evaluated time is late night (+0.18)
     - Low proximity to police station (+0.12)"
"""

import sys
import numpy as np
from pathlib import Path
from typing import Optional

import joblib

sys.path.insert(0, str(Path(__file__).parent))

from config import MODEL_PATH, SCALER_PATH, FEATURE_NAMES

# Human-readable feature name mapping
FEATURE_DISPLAY_NAMES = {
    "crime_density_500m": "Nearby crime density (500m)",
    "crime_density_2km": "Area crime density (2km)",
    "avg_severity_nearby": "Average crime severity",
    "severe_crime_ratio": "Severe crime ratio",
    "district_ipc_total": "District total crimes (NCRB)",
    "district_ipc_normalized": "District crime level",
    "district_accidents": "District road accidents",
    "district_accident_norm": "Road accident level",
    "crowdedness_score": "Area activity/crowdedness",
    "hour": "Time of day",
    "day_of_week": "Day of week",
    "is_weekend": "Weekend indicator",
    "is_night": "Nighttime indicator",
    "month": "Month/season",
    "dist_to_police_km": "Distance to police station",
    "dist_to_hospital_km": "Distance to hospital",
    "lighting_proxy": "Street lighting quality",
}

# Descriptions for when a feature increases risk
RISK_INCREASE_DESCRIPTIONS = {
    "crime_density_500m": "High recent crime density in immediate area",
    "crime_density_2km": "High crime activity in surrounding area",
    "avg_severity_nearby": "Severe incidents reported nearby",
    "severe_crime_ratio": "High proportion of violent crimes",
    "district_ipc_total": "Located in high-crime district",
    "district_ipc_normalized": "District has elevated crime rate",
    "district_accidents": "High road accident frequency in district",
    "district_accident_norm": "Elevated road accident risk",
    "crowdedness_score": "Area is isolated/low activity",
    "hour": "Evaluated during high-risk hours",
    "day_of_week": "Higher risk day pattern",
    "is_weekend": "Weekend late-night risk",
    "is_night": "Nighttime evaluation (reduced visibility & activity)",
    "month": "Seasonal crime pattern",
    "dist_to_police_km": "Far from nearest police station",
    "dist_to_hospital_km": "Far from nearest hospital",
    "lighting_proxy": "Poor street lighting in area",
}

RISK_DECREASE_DESCRIPTIONS = {
    "crime_density_500m": "Low crime density in immediate area",
    "crime_density_2km": "Low crime activity in surrounding area",
    "avg_severity_nearby": "Minor/no incidents reported nearby",
    "severe_crime_ratio": "Low proportion of violent crimes",
    "district_ipc_total": "Located in low-crime district",
    "district_ipc_normalized": "District has low crime rate",
    "district_accidents": "Low road accident frequency in district",
    "district_accident_norm": "Low road accident risk",
    "crowdedness_score": "Active/populated area (natural surveillance)",
    "hour": "Evaluated during low-risk hours",
    "day_of_week": "Lower risk day pattern",
    "is_weekend": "Weekday (typically lower risk)",
    "is_night": "Daytime evaluation (good visibility & activity)",
    "month": "Low-risk seasonal period",
    "dist_to_police_km": "Near police station",
    "dist_to_hospital_km": "Near hospital/emergency services",
    "lighting_proxy": "Good street lighting in area",
}


class SafetyExplainer:
    """Provides SHAP-based explanations for safety predictions."""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.explainer = None
        self._initialized = False
    
    def initialize(self):
        """Load model and create SHAP explainer."""
        if self._initialized:
            return
        
        try:
            self.model = joblib.load(MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            
            import shap
            self.explainer = shap.TreeExplainer(self.model)
            self._initialized = True
            print("✓ SHAP TreeExplainer initialized")
        except ImportError:
            print("⚠ SHAP not installed. Using feature importance fallback.")
            self._initialized = True  # Mark as init'd to avoid retrying
        except Exception as e:
            print(f"⚠ SHAP initialization failed: {e}. Using feature importance fallback.")
            self._initialized = True
    
    def explain_prediction(self, features_scaled: np.ndarray, 
                            feature_values: dict = None,
                            top_n: int = 5) -> list:
        """Generate top contributing factors for a prediction.
        
        Args:
            features_scaled: Scaled feature vector (1, n_features)
            feature_values: Original (unscaled) feature values dict
            top_n: Number of top factors to return
        
        Returns:
            List of dicts: [{"factor": "...", "direction": "increases/decreases", "importance": 0.XX}]
        """
        self.initialize()
        
        if self.explainer is not None:
            return self._shap_explain(features_scaled, feature_values, top_n)
        else:
            return self._importance_explain(features_scaled, feature_values, top_n)
    
    def _shap_explain(self, features_scaled, feature_values, top_n):
        """SHAP-based explanation."""
        try:
            shap_values = self.explainer.shap_values(features_scaled)
            
            # For multi-class, shap_values is a list of arrays (one per class)
            # We focus on the "High" risk class
            if isinstance(shap_values, list):
                classes = list(self.model.classes_)
                high_idx = classes.index("High") if "High" in classes else -1
                sv = shap_values[high_idx][0] if high_idx >= 0 else shap_values[-1][0]
            else:
                sv = shap_values[0]
            
            # Sort by absolute SHAP value
            indices = np.argsort(np.abs(sv))[::-1][:top_n]
            
            factors = []
            for idx in indices:
                feat_name = FEATURE_NAMES[idx]
                shap_val = sv[idx]
                direction = "increases_risk" if shap_val > 0 else "decreases_risk"
                
                if direction == "increases_risk":
                    description = RISK_INCREASE_DESCRIPTIONS.get(feat_name, f"High {feat_name}")
                else:
                    description = RISK_DECREASE_DESCRIPTIONS.get(feat_name, f"Low {feat_name}")
                
                factors.append({
                    "factor": description,
                    "feature": feat_name,
                    "display_name": FEATURE_DISPLAY_NAMES.get(feat_name, feat_name),
                    "direction": direction,
                    "importance": round(abs(float(shap_val)), 4),
                    "shap_value": round(float(shap_val), 4),
                    "feature_value": feature_values.get(feat_name) if feature_values else None,
                })
            
            return factors
            
        except Exception as e:
            print(f"  ⚠ SHAP explanation failed: {e}")
            return self._importance_explain(features_scaled, feature_values, top_n)
    
    def _importance_explain(self, features_scaled, feature_values, top_n):
        """Fallback: use model feature importance + feature values."""
        if not hasattr(self.model, "feature_importances_"):
            return [{"factor": "ML model prediction (details unavailable)", 
                     "direction": "neutral", "importance": 1.0}]
        
        importances = self.model.feature_importances_
        indices = np.argsort(importances)[::-1][:top_n]
        
        factors = []
        for idx in indices:
            feat_name = FEATURE_NAMES[idx]
            feat_val = feature_values.get(feat_name, 0) if feature_values else 0
            
            # Heuristic: determine direction based on feature value
            is_risky = self._is_feature_risky(feat_name, feat_val)
            direction = "increases_risk" if is_risky else "decreases_risk"
            
            if direction == "increases_risk":
                description = RISK_INCREASE_DESCRIPTIONS.get(feat_name, f"High {feat_name}")
            else:
                description = RISK_DECREASE_DESCRIPTIONS.get(feat_name, f"Low {feat_name}")
            
            factors.append({
                "factor": description,
                "feature": feat_name,
                "display_name": FEATURE_DISPLAY_NAMES.get(feat_name, feat_name),
                "direction": direction,
                "importance": round(float(importances[idx]), 4),
                "feature_value": feat_val,
            })
        
        return factors
    
    @staticmethod
    def _is_feature_risky(feat_name: str, value) -> bool:
        """Heuristic: is this feature value contributing to risk?"""
        # Features where higher value = more risk
        if feat_name in ["crime_density_500m", "crime_density_2km", "avg_severity_nearby",
                         "severe_crime_ratio", "district_ipc_total", "district_ipc_normalized",
                         "district_accidents", "district_accident_norm",
                         "is_night", "is_weekend",
                         "dist_to_police_km", "dist_to_hospital_km"]:
            return value > 0.5 if isinstance(value, float) and value <= 1 else value > 3
        
        # Features where higher value = less risk
        if feat_name in ["crowdedness_score", "lighting_proxy"]:
            return value < 50
        
        # Hour: night hours are risky
        if feat_name == "hour":
            return value >= 22 or value < 5
        
        return False


# Module-level singleton
_explainer = None

def get_explainer() -> SafetyExplainer:
    global _explainer
    if _explainer is None:
        _explainer = SafetyExplainer()
    return _explainer
