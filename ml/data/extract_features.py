"""
SafeT ML Pipeline — Feature Extraction & Training Data Generation
==================================================================
Connects to the Supabase PostgreSQL database, reads IncidentReport and
SafeAnchor tables, and generates a labeled training dataset.

Strategy:
    1. Create a grid of lat/lng sample points across Odisha
    2. For each grid point × multiple time slots:
       - Compute spatial features (crime density, severity, district stats)
       - Compute temporal features (hour, day, weekend, night, month)
       - Compute proximity features (distance to police, hospital)
       - Compute lighting proxy
    3. Compute a composite risk score from the features
    4. Label as Low / Medium / High risk
    5. Save as training_data.csv

Data Source:
    - IncidentReport table (seeded from NCRB 2022 Odisha data)
    - SafeAnchor table (police stations, hospitals)
    - NCRB_2022_ODISHA and MORTH_2022_ODISHA from config.py

This script is run OFFLINE before training. It is NOT called during inference.
"""

import sys
import math
import random
import numpy as np
import pandas as pd
from pathlib import Path

# Add parent to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    DATABASE_URL, NCRB_2022_ODISHA, MORTH_2022_ODISHA, SAFE_ANCHORS,
    MAX_IPC, MAX_ACCIDENTS, TRAINING_DATA_PATH,
    GRID_RESOLUTION, LAT_RANGE, LNG_RANGE,
    HIGH_RISK_THRESHOLD, MEDIUM_RISK_THRESHOLD, RANDOM_STATE
)

random.seed(RANDOM_STATE)
np.random.seed(RANDOM_STATE)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute Haversine distance between two coordinates in kilometers."""
    R = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearest_district(lat: float, lng: float):
    """Find the nearest NCRB district and MoRTH data for given coordinates."""
    min_dist = float('inf')
    closest = NCRB_2022_ODISHA[0]
    for d in NCRB_2022_ODISHA:
        dist = haversine_km(lat, lng, d["lat"], d["lng"])
        if dist < min_dist:
            min_dist = dist
            closest = d
    
    morth = next((m for m in MORTH_2022_ODISHA if m["district"] == closest["district"]), MORTH_2022_ODISHA[0])
    return closest, morth, min_dist


def compute_crowdedness(dist_to_hq_km: float) -> float:
    """Estimate crowdedness score based on distance to district HQ.
    Closer to HQ = denser area = higher crowdedness score.
    """
    if dist_to_hq_km < 5:
        return 90.0
    elif dist_to_hq_km < 15:
        return 60.0
    elif dist_to_hq_km < 30:
        return 40.0
    else:
        return 20.0


def load_incidents_from_db():
    """Load IncidentReport records from the database."""
    try:
        from sqlalchemy import create_engine, text
        
        # Fix the connection URL for SQLAlchemy
        db_url = DATABASE_URL
        if "?" in db_url:
            # Remove pgbouncer param which causes issues with SQLAlchemy
            db_url = db_url.split("?")[0] + "?sslmode=require"
        
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            result = conn.execute(text(
                'SELECT type, severity, latitude, longitude, "createdAt" FROM "IncidentReport"'
            ))
            rows = result.fetchall()
        
        incidents = []
        for row in rows:
            incidents.append({
                "type": row[0],
                "severity": row[1],
                "latitude": row[2],
                "longitude": row[3],
                "created_at": row[4],
            })
        
        print(f"  ✓ Loaded {len(incidents)} incidents from database")
        return incidents
    
    except Exception as e:
        print(f"  ⚠ Database connection failed: {e}")
        print("  → Falling back to synthetic incident generation from NCRB data")
        return generate_synthetic_incidents()


def generate_synthetic_incidents():
    """Generate synthetic incidents proportionally from NCRB data.
    Used as fallback when DB is not accessible.
    """
    incidents = []
    crime_types = ["Theft", "Mugging", "Assault", "Robbery", "Poor Lighting", "Accident"]
    
    for d in NCRB_2022_ODISHA:
        n = max(10, d["totalIPC"] // 150)
        severe_ratio = (d.get("murder", 50) + d.get("rape", 100)) / d["totalIPC"]
        base_severity = 5 if severe_ratio > 0.025 else 4 if severe_ratio > 0.018 else 3
        
        for _ in range(n):
            scatter = 0.045  # ~5km
            lat = d["lat"] + np.random.normal(0, scatter)
            lng = d["lng"] + np.random.normal(0, scatter)
            sev_var = 0 if random.random() < 0.7 else (1 if random.random() < 0.5 else -1)
            severity = max(1, min(10, base_severity + sev_var))
            
            incidents.append({
                "type": random.choice(crime_types),
                "severity": severity,
                "latitude": lat,
                "longitude": lng,
                "created_at": None,
            })
    
    print(f"  ✓ Generated {len(incidents)} synthetic incidents from NCRB data")
    return incidents


def compute_features_for_point(lat: float, lng: float, hour: int, day_of_week: int,
                                month: int, incidents: list, safe_anchors: list) -> dict:
    """Compute all features for a single geographic point at a given time.
    
    This is the core feature engineering function used for BOTH training data
    generation AND inference. Keeping it in one place prevents train/serve skew.
    """
    # ─── Spatial: Crime density features ────────────────────────────────────
    crimes_500m = 0
    crimes_2km = 0
    severity_sum_2km = 0
    severe_count_2km = 0
    lighting_incidents_2km = 0
    
    for inc in incidents:
        dist = haversine_km(lat, lng, inc["latitude"], inc["longitude"])
        if dist <= 0.5:
            crimes_500m += 1
        if dist <= 2.0:
            crimes_2km += 1
            severity_sum_2km += inc["severity"]
            if inc["severity"] >= 4:
                severe_count_2km += 1
            if inc["type"] == "Poor Lighting":
                lighting_incidents_2km += 1
    
    avg_severity = severity_sum_2km / max(1, crimes_2km)
    severe_ratio = severe_count_2km / max(1, crimes_2km)
    
    # ─── District-level features ────────────────────────────────────────────
    district, morth, dist_to_hq = find_nearest_district(lat, lng)
    district_ipc = district["totalIPC"]
    district_ipc_norm = min(district_ipc / MAX_IPC, 1.0)
    district_accidents = morth["accidents"]
    district_accident_norm = min(district_accidents / MAX_ACCIDENTS, 1.0)
    
    # ─── Crowdedness ────────────────────────────────────────────────────────
    crowdedness = compute_crowdedness(dist_to_hq)
    
    # ─── Temporal features ──────────────────────────────────────────────────
    is_weekend = 1 if day_of_week >= 5 else 0
    is_night = 1 if (hour >= 22 or hour < 5) else 0
    
    # ─── Proximity to emergency services ────────────────────────────────────
    min_police_dist = 999.0
    min_hospital_dist = 999.0
    
    for anchor in safe_anchors:
        d = haversine_km(lat, lng, anchor["lat"], anchor["lng"])
        if anchor["type"] == "Police Station" and d < min_police_dist:
            min_police_dist = d
        elif anchor["type"] == "Hospital" and d < min_hospital_dist:
            min_hospital_dist = d
    
    # Cap distances at reasonable maximum
    min_police_dist = min(min_police_dist, 50.0)
    min_hospital_dist = min(min_hospital_dist, 50.0)
    
    # ─── Lighting proxy ─────────────────────────────────────────────────────
    # Higher lighting_proxy = better lit area (fewer "Poor Lighting" incidents)
    # Inverted so 0 = dark, 100 = well-lit
    lighting_proxy = max(0.0, 100.0 - lighting_incidents_2km * 20.0)
    
    return {
        "latitude": lat,
        "longitude": lng,
        "crime_density_500m": crimes_500m,
        "crime_density_2km": crimes_2km,
        "avg_severity_nearby": round(avg_severity, 2),
        "severe_crime_ratio": round(severe_ratio, 3),
        "district_ipc_total": district_ipc,
        "district_ipc_normalized": round(district_ipc_norm, 4),
        "district_accidents": district_accidents,
        "district_accident_norm": round(district_accident_norm, 4),
        "crowdedness_score": crowdedness,
        "hour": hour,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "is_night": is_night,
        "month": month,
        "dist_to_police_km": round(min_police_dist, 2),
        "dist_to_hospital_km": round(min_hospital_dist, 2),
        "lighting_proxy": round(lighting_proxy, 1),
        "nearest_district": district["district"],
    }


def compute_risk_label(features: dict) -> float:
    """Compute a composite risk score (0-1) from features for labeling.
    
    This is used ONLY for generating training labels, NOT for inference.
    The ML model will learn its own relationship from the features.
    
    The labeling formula intentionally differs from the old manual 4-pillar
    formula to create a more nuanced dataset that the ML model can learn from.
    """
    # Crime component (0-1, higher = riskier)
    crime_risk = min(1.0, (
        features["crime_density_500m"] * 0.04 +
        features["crime_density_2km"] * 0.005 +
        features["avg_severity_nearby"] / 10.0 * 0.3 +
        features["severe_crime_ratio"] * 0.2
    ))
    
    # District component (0-1, higher = riskier)
    district_risk = (
        features["district_ipc_normalized"] * 0.6 +
        features["district_accident_norm"] * 0.4
    )
    
    # Temporal component (0-1, higher = riskier)
    time_risk = 0.0
    if features["is_night"]:
        time_risk += 0.5
    # Late night (midnight-4am) is riskier than just-after-dark
    if features["hour"] >= 0 and features["hour"] < 4:
        time_risk += 0.2
    if features["is_weekend"] and features["is_night"]:
        time_risk += 0.1
    time_risk = min(1.0, time_risk)
    
    # Isolation component (0-1, higher = riskier)
    isolation_risk = min(1.0, (
        (100 - features["crowdedness_score"]) / 100.0 * 0.3 +
        min(features["dist_to_police_km"] / 20.0, 1.0) * 0.3 +
        min(features["dist_to_hospital_km"] / 20.0, 1.0) * 0.2 +
        (100 - features["lighting_proxy"]) / 100.0 * 0.2
    ))
    
    # Composite risk score with non-linear interactions
    risk = (
        crime_risk * 0.35 +
        district_risk * 0.25 +
        time_risk * 0.20 +
        isolation_risk * 0.20
    )
    
    # Add non-linear penalty: high crime + night = extra risky
    if crime_risk > 0.5 and features["is_night"]:
        risk = min(1.0, risk + 0.1)
    
    # Add non-linear bonus: near police + low crime = extra safe
    if crime_risk < 0.2 and features["dist_to_police_km"] < 2.0:
        risk = max(0.0, risk - 0.05)
    
    return round(min(1.0, max(0.0, risk)), 3)


def generate_training_data():
    """Main function: generate the training dataset."""
    print("=" * 70)
    print("SafeT ML — Training Data Generation")
    print("=" * 70)
    
    # Load incidents
    print("\n📊 Loading incident data...")
    incidents = load_incidents_from_db()
    
    # Use config safe anchors + any from DB
    safe_anchors = list(SAFE_ANCHORS)
    
    # Generate grid points
    print("\n🗺️  Generating sample grid across Odisha...")
    lat_points = np.arange(LAT_RANGE[0], LAT_RANGE[1], GRID_RESOLUTION)
    lng_points = np.arange(LNG_RANGE[0], LNG_RANGE[1], GRID_RESOLUTION)
    
    # Also add points near district HQs (higher density sampling)
    hq_points = []
    for d in NCRB_2022_ODISHA:
        for dlat in np.arange(-0.05, 0.06, 0.01):
            for dlng in np.arange(-0.05, 0.06, 0.01):
                hq_points.append((d["lat"] + dlat, d["lng"] + dlng))
    
    print(f"  Grid points: {len(lat_points)}×{len(lng_points)} = {len(lat_points) * len(lng_points)}")
    print(f"  HQ-dense points: {len(hq_points)}")
    
    # Time variations: sample different hours and days
    time_slots = [
        (8,  1, 3),   # Monday 8am, March
        (14, 3, 6),   # Wednesday 2pm, June
        (20, 5, 9),   # Friday 8pm, September
        (23, 6, 12),  # Saturday 11pm, December
        (2,  0, 1),   # Monday 2am, January
        (18, 4, 7),   # Thursday 6pm, July
        (11, 2, 5),   # Wednesday 11am, May
        (1,  5, 10),  # Saturday 1am, October
    ]
    
    all_rows = []
    
    # Process grid points (sampled to keep dataset manageable)
    print("\n⚙️  Computing features for grid points...")
    grid_coords = [(lat, lng) for lat in lat_points for lng in lng_points]
    
    # Sample grid to ~2000 points if too large
    if len(grid_coords) > 2000:
        grid_coords = random.sample(grid_coords, 2000)
    
    total_points = len(grid_coords) + len(hq_points)
    processed = 0
    
    for lat, lng in grid_coords:
        for hour, dow, month in time_slots:
            features = compute_features_for_point(
                lat, lng, hour, dow, month, incidents, safe_anchors
            )
            risk_score = compute_risk_label(features)
            features["risk_score"] = risk_score
            
            if risk_score >= HIGH_RISK_THRESHOLD:
                features["risk_level"] = "High"
            elif risk_score >= MEDIUM_RISK_THRESHOLD:
                features["risk_level"] = "Medium"
            else:
                features["risk_level"] = "Low"
            
            all_rows.append(features)
        
        processed += 1
        if processed % 500 == 0:
            print(f"  ... processed {processed}/{total_points} locations")
    
    # Process HQ-dense points
    for lat, lng in hq_points:
        for hour, dow, month in time_slots:
            features = compute_features_for_point(
                lat, lng, hour, dow, month, incidents, safe_anchors
            )
            risk_score = compute_risk_label(features)
            features["risk_score"] = risk_score
            
            if risk_score >= HIGH_RISK_THRESHOLD:
                features["risk_level"] = "High"
            elif risk_score >= MEDIUM_RISK_THRESHOLD:
                features["risk_level"] = "Medium"
            else:
                features["risk_level"] = "Low"
            
            all_rows.append(features)
        
        processed += 1
        if processed % 500 == 0:
            print(f"  ... processed {processed}/{total_points} locations")
    
    # Create DataFrame and save
    df = pd.DataFrame(all_rows)
    
    print(f"\n📁 Dataset Summary:")
    print(f"  Total samples: {len(df)}")
    print(f"  Features: {len(df.columns) - 3} (excluding lat, lng, risk_level)")
    print(f"\n  Class distribution:")
    print(f"  {df['risk_level'].value_counts().to_string()}")
    print(f"\n  Risk score statistics:")
    print(f"  {df['risk_score'].describe().to_string()}")
    
    # Save
    df.to_csv(TRAINING_DATA_PATH, index=False)
    print(f"\n✅ Training data saved to: {TRAINING_DATA_PATH}")
    print(f"   {len(df)} rows × {len(df.columns)} columns")
    
    return df


if __name__ == "__main__":
    generate_training_data()
