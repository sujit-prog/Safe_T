"""
SafeT ML Pipeline — Anomaly Detection
=======================================
Detects unusual spikes in crime activity using Isolation Forest.

Limitation (documented):
    The current seeded incident data does NOT have meaningful temporal
    variation — all incidents are created at seed time with similar
    timestamps. Therefore, time-series anomaly detection cannot produce
    meaningful results from the current data.

    This module is a STRUCTURAL PLACEHOLDER that:
    1. Demonstrates the correct Isolation Forest pipeline
    2. Works correctly when real temporal data is available
    3. Documents the limitation clearly

    When real geocoded crime data with actual dates becomes available,
    this module will detect spikes like:
        "Normal: 2-3 incidents/week in Patia area"
        "Current: 15 incidents/week → ANOMALY DETECTED"
"""

import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

from sklearn.ensemble import IsolationForest

sys.path.insert(0, str(Path(__file__).parent))

from config import (
    ISOLATION_FOREST_CONTAMINATION, ANOMALY_PATH, DATABASE_URL,
    NCRB_2022_ODISHA, RANDOM_STATE
)


def load_incidents_with_time():
    """Load incidents with timestamps from database."""
    try:
        from sqlalchemy import create_engine, text
        
        db_url = DATABASE_URL
        if "?" in db_url:
            db_url = db_url.split("?")[0] + "?sslmode=require"
        
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text(
                'SELECT latitude, longitude, type, severity, "createdAt" '
                'FROM "IncidentReport" ORDER BY "createdAt"'
            ))
            rows = result.fetchall()
        
        return [(r[0], r[1], r[2], r[3], r[4]) for r in rows]
    except Exception as e:
        print(f"  ⚠ DB connection failed: {e}")
        return []


def aggregate_by_district_week(incidents):
    """Aggregate incident counts by district and week.
    
    Returns a DataFrame with columns: district, week, incident_count, avg_severity
    """
    from config import NCRB_2022_ODISHA
    import math
    
    district_weekly = defaultdict(lambda: defaultdict(lambda: {"count": 0, "severity_sum": 0}))
    
    for lat, lng, crime_type, severity, created_at in incidents:
        # Find nearest district
        min_dist = float('inf')
        nearest = NCRB_2022_ODISHA[0]["district"]
        for d in NCRB_2022_ODISHA:
            dist = math.sqrt((lat - d["lat"])**2 + (lng - d["lng"])**2)
            if dist < min_dist:
                min_dist = dist
                nearest = d["district"]
        
        if created_at:
            week = created_at.isocalendar()[1] if hasattr(created_at, 'isocalendar') else 1
        else:
            week = 1
        
        district_weekly[nearest][week]["count"] += 1
        district_weekly[nearest][week]["severity_sum"] += severity
    
    rows = []
    for district, weeks in district_weekly.items():
        for week, stats in weeks.items():
            rows.append({
                "district": district,
                "week": week,
                "incident_count": stats["count"],
                "avg_severity": stats["severity_sum"] / max(1, stats["count"]),
            })
    
    return pd.DataFrame(rows)


def run_anomaly_detection():
    """Run Isolation Forest anomaly detection.
    
    Returns list of detected anomalies (may be empty if data lacks temporal variation).
    """
    print("=" * 70)
    print("SafeT ML — Anomaly Detection (Isolation Forest)")
    print("=" * 70)
    
    print("\n📊 Loading incident data with timestamps...")
    incidents = load_incidents_with_time()
    
    if len(incidents) < 10:
        print("  ⚠ Insufficient data for anomaly detection")
        result = {
            "status": "insufficient_data",
            "message": "Not enough incident records for anomaly detection.",
            "anomalies": [],
            "limitation": "Current dataset lacks temporal variation for meaningful anomaly detection.",
        }
        with open(ANOMALY_PATH, "w") as f:
            json.dump(result, f, indent=2)
        return result
    
    # Check temporal variation
    timestamps = [inc[4] for inc in incidents if inc[4] is not None]
    has_temporal_variation = False
    
    if timestamps and len(timestamps) > 1:
        if hasattr(timestamps[0], 'timestamp'):
            unique_dates = len(set(t.date() for t in timestamps if hasattr(t, 'date')))
            has_temporal_variation = unique_dates > 7
    
    if not has_temporal_variation:
        print("\n  ⚠ LIMITATION: Current incident data lacks temporal variation.")
        print("    All incidents were seeded at similar timestamps.")
        print("    Anomaly detection requires real time-series data to be meaningful.")
        print("    This module is included as a structural placeholder.")
        
        result = {
            "status": "no_temporal_variation",
            "generated_at": datetime.now().isoformat(),
            "algorithm": "IsolationForest",
            "message": (
                "Current seeded data lacks temporal variation. All incidents have "
                "similar timestamps from the database seeding process. Real anomaly "
                "detection requires actual crime data with meaningful date ranges."
            ),
            "limitation": (
                "To enable this feature, the system needs geocoded crime records "
                "with actual incident dates spanning weeks/months. This would allow "
                "detecting unusual spikes like '15 incidents in one week vs. normal 2-3'."
            ),
            "anomalies": [],
            "example_output_when_real_data_available": {
                "district": "Khordha",
                "week": 42,
                "normal_activity": "3-5 incidents/week",
                "current_activity": "18 incidents",
                "status": "ANOMALY",
                "description": "Unusual spike in crime activity detected",
            },
        }
        
        with open(ANOMALY_PATH, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\n✅ Anomaly report saved to {ANOMALY_PATH}")
        return result
    
    # If we have temporal data, run actual anomaly detection
    print("\n  ✓ Temporal variation detected, running Isolation Forest...")
    
    df = aggregate_by_district_week(incidents)
    
    if len(df) < 5:
        print("  ⚠ Not enough weekly aggregates for meaningful detection")
        result = {"status": "insufficient_aggregates", "anomalies": []}
        with open(ANOMALY_PATH, "w") as f:
            json.dump(result, f, indent=2)
        return result
    
    # Fit Isolation Forest on incident_count and avg_severity
    X = df[["incident_count", "avg_severity"]].values
    
    iso = IsolationForest(
        contamination=ISOLATION_FOREST_CONTAMINATION,
        random_state=RANDOM_STATE,
    )
    df["anomaly_label"] = iso.fit_predict(X)
    df["anomaly_score"] = iso.decision_function(X)
    
    anomalies = df[df["anomaly_label"] == -1].copy()
    normal = df[df["anomaly_label"] == 1]
    
    print(f"  ✓ {len(anomalies)} anomalies detected out of {len(df)} district-weeks")
    
    anomaly_list = []
    for _, row in anomalies.iterrows():
        district_normal = normal[normal["district"] == row["district"]]
        normal_avg = district_normal["incident_count"].mean() if len(district_normal) > 0 else 0
        
        anomaly_list.append({
            "district": row["district"],
            "week": int(row["week"]),
            "incident_count": int(row["incident_count"]),
            "avg_severity": round(float(row["avg_severity"]), 2),
            "anomaly_score": round(float(row["anomaly_score"]), 4),
            "normal_weekly_average": round(float(normal_avg), 1),
            "spike_factor": round(float(row["incident_count"] / max(1, normal_avg)), 1),
        })
    
    anomaly_list.sort(key=lambda x: x["anomaly_score"])
    
    result = {
        "status": "completed",
        "generated_at": datetime.now().isoformat(),
        "algorithm": "IsolationForest",
        "parameters": {"contamination": ISOLATION_FOREST_CONTAMINATION},
        "total_district_weeks_analyzed": len(df),
        "anomalies_detected": len(anomaly_list),
        "anomalies": anomaly_list,
    }
    
    with open(ANOMALY_PATH, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\n✅ Anomaly report saved to {ANOMALY_PATH}")
    
    return result


if __name__ == "__main__":
    run_anomaly_detection()
