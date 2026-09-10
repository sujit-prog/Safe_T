"""
SafeT ML Pipeline — FastAPI Inference Server
==============================================
Serves ML predictions via HTTP for the Next.js backend to consume.

Endpoints:
    GET  /health            → Service health check
    POST /predict/location  → Single location risk prediction
    POST /predict/route     → Route segment risk prediction
    GET  /hotspots          → Pre-computed DBSCAN hotspot clusters
    GET  /anomalies         → Pre-computed anomaly detection results
    GET  /model/info        → Model version, features, metrics

The trained model is loaded ONCE at startup.
SHAP explanations are computed per-request.

Run: python serve.py
Default: http://localhost:5001
"""

import sys
import json
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    METADATA_PATH, HOTSPOT_PATH, ANOMALY_PATH,
    risk_to_safety_score, safety_score_to_risk_level,
    MODEL_VERSION, FEATURE_NAMES
)

# ─── FastAPI App ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SafeT ML Service",
    description="Machine Learning inference server for SafeT safety prediction",
    version=MODEL_VERSION,
)

# Allow CORS from Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request/Response Models ────────────────────────────────────────────────────

class LocationRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    hour: Optional[int] = Field(None, ge=0, le=23, description="Hour of day (0-23)")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="Day of week (0=Mon)")
    month: Optional[int] = Field(None, ge=1, le=12, description="Month (1-12)")
    evaluation_time: Optional[str] = Field(None, description="ISO datetime string")


class RouteRequest(BaseModel):
    coordinates: list = Field(..., description="List of [lat, lng] pairs")
    hour: Optional[int] = Field(None, ge=0, le=23)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    month: Optional[int] = Field(None, ge=1, le=12)
    evaluation_time: Optional[str] = None


# ─── Lazy-loaded singletons ─────────────────────────────────────────────────────
_predictor = None
_explainer = None


def get_predictor():
    global _predictor
    if _predictor is None:
        from predict import SafetyPredictor
        _predictor = SafetyPredictor()
    return _predictor


def get_explainer():
    global _explainer
    if _explainer is None:
        from explain import SafetyExplainer
        _explainer = SafetyExplainer()
        _explainer.initialize()
    return _explainer


# ─── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        predictor = get_predictor()
        return {
            "status": "healthy",
            "model_loaded": predictor.model is not None,
            "model_version": MODEL_VERSION,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.post("/predict/location")
async def predict_location(req: LocationRequest):
    """Predict safety risk for a single location.
    
    Returns risk probability, safety score, risk level, and top contributing factors.
    """
    try:
        predictor = get_predictor()
        explainer = get_explainer()
        
        result = predictor.predict_location(
            lat=req.lat,
            lng=req.lng,
            hour=req.hour,
            day_of_week=req.day_of_week,
            month=req.month,
            evaluation_time=req.evaluation_time,
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Get SHAP explanations
        try:
            features, _ = predictor._compute_features(
                req.lat, req.lng,
                result["temporal"]["hour"],
                result["temporal"]["day_of_week"],
                result["temporal"]["month"],
            )
            features_scaled = predictor.scaler.transform(features)
            top_factors = explainer.explain_prediction(
                features_scaled, result.get("feature_values"), top_n=5
            )
            result["top_factors"] = top_factors
        except Exception as e:
            result["top_factors"] = [{"factor": "Explanation unavailable", "importance": 0}]
            result["explanation_error"] = str(e)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/route")
async def predict_route(req: RouteRequest):
    """Predict risk for route segments.
    
    Divides the route into ~20 segments, predicts risk for each segment center,
    and aggregates into an overall route risk score.
    """
    try:
        predictor = get_predictor()
        
        if not req.coordinates or len(req.coordinates) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 coordinates")
        
        result = predictor.predict_route_segments(
            coordinates=req.coordinates,
            hour=req.hour,
            day_of_week=req.day_of_week,
            month=req.month,
            evaluation_time=req.evaluation_time,
        )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Route prediction failed: {str(e)}")


@app.get("/hotspots")
async def get_hotspots():
    """Return pre-computed DBSCAN crime hotspot clusters."""
    if not HOTSPOT_PATH.exists():
        return {
            "status": "not_computed",
            "message": "Run `python hotspot.py` to generate hotspot data.",
            "hotspots": [],
        }
    
    with open(HOTSPOT_PATH) as f:
        return json.load(f)


@app.get("/anomalies")
async def get_anomalies():
    """Return pre-computed anomaly detection results."""
    if not ANOMALY_PATH.exists():
        return {
            "status": "not_computed",
            "message": "Run `python anomaly.py` to generate anomaly data.",
            "anomalies": [],
        }
    
    with open(ANOMALY_PATH) as f:
        return json.load(f)


@app.get("/model/info")
async def model_info():
    """Return model metadata: version, features, training date, metrics."""
    if not METADATA_PATH.exists():
        return {"status": "no_model", "message": "No model trained yet."}
    
    with open(METADATA_PATH) as f:
        metadata = json.load(f)
    
    return metadata


# ─── Main ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 70)
    print("SafeT ML — Inference Server")
    print("=" * 70)
    print(f"\nStarting on http://localhost:5001")
    print(f"API docs: http://localhost:5001/docs\n")
    
    uvicorn.run(app, host="0.0.0.0", port=5001, log_level="info")
