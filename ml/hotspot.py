"""
SafeT ML Pipeline — Crime Hotspot Detection (DBSCAN)
=====================================================
Unsupervised clustering of crime incidents to identify geographical hotspots.

Why DBSCAN:
    - Geographical clusters are often non-circular (DBSCAN handles arbitrary shapes)
    - The number of clusters is unknown beforehand
    - Can identify noise points (isolated incidents that don't form clusters)
    - eps parameter maps directly to geographical distance

Pipeline:
    1. Load incident coordinates from database
    2. Apply DBSCAN clustering
    3. Compute cluster statistics (centroid, size, intensity)
    4. Save hotspot data for frontend visualization
"""

import sys
import json
import math
import numpy as np
from pathlib import Path
from collections import Counter

from sklearn.cluster import DBSCAN

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    DBSCAN_EPS, DBSCAN_MIN_SAMPLES, HOTSPOT_PATH, DATABASE_URL
)


def load_incident_coordinates():
    """Load lat/lng coordinates from IncidentReport table."""
    try:
        from sqlalchemy import create_engine, text
        
        db_url = DATABASE_URL
        if "?" in db_url:
            db_url = db_url.split("?")[0] + "?sslmode=require"
        
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text(
                'SELECT latitude, longitude, type, severity FROM "IncidentReport"'
            ))
            rows = result.fetchall()
        
        data = [(r[0], r[1], r[2], r[3]) for r in rows]
        print(f"  ✓ Loaded {len(data)} incidents from database")
        return data
    
    except Exception as e:
        print(f"  ⚠ Database connection failed: {e}")
        return generate_fallback_coordinates()


def generate_fallback_coordinates():
    """Generate coordinates from NCRB config data as fallback."""
    from config import NCRB_2022_ODISHA
    
    coords = []
    np.random.seed(42)
    crime_types = ["Theft", "Mugging", "Assault", "Robbery", "Poor Lighting", "Accident"]
    
    for d in NCRB_2022_ODISHA:
        n = max(10, d["totalIPC"] // 150)
        for _ in range(n):
            lat = d["lat"] + np.random.normal(0, 0.045)
            lng = d["lng"] + np.random.normal(0, 0.045)
            severity = np.random.randint(1, 6)
            coords.append((lat, lng, np.random.choice(crime_types), severity))
    
    print(f"  ✓ Generated {len(coords)} fallback coordinates")
    return coords


def run_dbscan(coordinates, eps=DBSCAN_EPS, min_samples=DBSCAN_MIN_SAMPLES):
    """Run DBSCAN clustering on incident coordinates.
    
    Args:
        coordinates: List of (lat, lng, type, severity) tuples
        eps: Maximum distance between samples (in degrees, ~500m = 0.005)
        min_samples: Minimum cluster size
    
    Returns:
        List of hotspot cluster dicts
    """
    if len(coordinates) < min_samples:
        print("  ⚠ Not enough data points for DBSCAN")
        return []
    
    # Extract lat/lng matrix
    X = np.array([[c[0], c[1]] for c in coordinates])
    types = [c[2] for c in coordinates]
    severities = [c[3] for c in coordinates]
    
    print(f"\n  Running DBSCAN (eps={eps}, min_samples={min_samples})...")
    
    db = DBSCAN(eps=eps, min_samples=min_samples, metric='haversine', algorithm='ball_tree')
    # Convert to radians for haversine metric
    X_rad = np.radians(X)
    labels = db.fit_predict(X_rad)
    
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = list(labels).count(-1)
    
    print(f"  ✓ Found {n_clusters} hotspot clusters")
    print(f"  ✓ {n_noise} noise points (isolated incidents)")
    
    # Build cluster info
    hotspots = []
    for cluster_id in range(n_clusters):
        mask = labels == cluster_id
        cluster_coords = X[mask]
        cluster_types = [types[i] for i in range(len(types)) if mask[i]]
        cluster_sevs = [severities[i] for i in range(len(severities)) if mask[i]]
        
        centroid_lat = float(np.mean(cluster_coords[:, 0]))
        centroid_lng = float(np.mean(cluster_coords[:, 1]))
        
        # Bounding box
        min_lat = float(np.min(cluster_coords[:, 0]))
        max_lat = float(np.max(cluster_coords[:, 0]))
        min_lng = float(np.min(cluster_coords[:, 1]))
        max_lng = float(np.max(cluster_coords[:, 1]))
        
        # Radius (max distance from centroid to any point)
        max_dist = 0
        for c in cluster_coords:
            d = math.sqrt((c[0] - centroid_lat)**2 + (c[1] - centroid_lng)**2)
            max_dist = max(max_dist, d)
        radius_deg = float(max_dist)
        radius_km = radius_deg * 111  # Approximate degrees to km
        
        # Intensity score (0-100)
        avg_severity = np.mean(cluster_sevs)
        incident_count = len(cluster_coords)
        # Intensity combines count and severity
        intensity = min(100, int(incident_count * avg_severity / 2))
        
        # Dominant crime type
        type_counts = Counter(cluster_types)
        dominant_type = type_counts.most_common(1)[0][0] if type_counts else "Unknown"
        
        hotspot = {
            "cluster_id": cluster_id,
            "centroid": {"lat": round(centroid_lat, 6), "lng": round(centroid_lng, 6)},
            "bounds": {
                "min_lat": round(min_lat, 6), "max_lat": round(max_lat, 6),
                "min_lng": round(min_lng, 6), "max_lng": round(max_lng, 6),
            },
            "radius_km": round(radius_km, 2),
            "incident_count": incident_count,
            "avg_severity": round(float(avg_severity), 2),
            "intensity": intensity,
            "dominant_crime_type": dominant_type,
            "crime_type_distribution": dict(type_counts),
            "risk_level": "High" if intensity >= 60 else "Medium" if intensity >= 30 else "Low",
        }
        hotspots.append(hotspot)
    
    # Sort by intensity (most dangerous first)
    hotspots.sort(key=lambda h: h["intensity"], reverse=True)
    
    return hotspots


def save_hotspots(hotspots: list):
    """Save hotspot data to JSON for frontend consumption."""
    output = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "algorithm": "DBSCAN",
        "parameters": {
            "eps": DBSCAN_EPS,
            "min_samples": DBSCAN_MIN_SAMPLES,
            "eps_description": f"~{DBSCAN_EPS * 111:.0f}m radius",
        },
        "total_hotspots": len(hotspots),
        "hotspots": hotspots,
    }
    
    with open(HOTSPOT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✅ Hotspot data saved to {HOTSPOT_PATH}")


def run_hotspot_detection():
    """Main hotspot detection pipeline."""
    print("=" * 70)
    print("SafeT ML — Crime Hotspot Detection (DBSCAN)")
    print("=" * 70)
    
    print("\n📊 Loading incident data...")
    coords = load_incident_coordinates()
    
    hotspots = run_dbscan(coords)
    
    if hotspots:
        print(f"\n📍 Top 5 Hotspots:")
        for h in hotspots[:5]:
            print(f"  #{h['cluster_id']}: {h['centroid']['lat']:.4f}, {h['centroid']['lng']:.4f} "
                  f"| Intensity: {h['intensity']} | {h['incident_count']} incidents "
                  f"| Dominant: {h['dominant_crime_type']} | {h['risk_level']}")
    
    save_hotspots(hotspots)
    return hotspots


if __name__ == "__main__":
    run_hotspot_detection()
